$ErrorActionPreference = 'Stop'
if (Test-Path (Join-Path $PSScriptRoot 'MANIFEST.json'))
{
    throw 'Frozen capsule; use the portable read-only auditor.'
}

function Read-Metadata010([string]$Dll, [string]$Pdb)
{
    $stream = [IO.File]::OpenRead($Dll)
    $pe = [Reflection.PortableExecutable.PEReader]::new($stream)
    $pdbStream = [IO.File]::OpenRead($Pdb)
    $provider = [Reflection.Metadata.MetadataReaderProvider]::FromPortablePdbStream($pdbStream)
    try
    {
        $reader = [Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($pe)
        $pdbReader = $provider.GetMetadataReader()
        $pdbId = [byte[]]@($pdbReader.DebugMetadataHeader.Id)
        $pdbGuid = [Guid]::new([byte[]]$pdbId[0..15]).ToString()
        $pdbStamp = [BitConverter]::ToUInt32($pdbId, 16)
        $codeView = foreach ($entry in $pe.ReadDebugDirectory())
        {
            if ($entry.Type -eq [Reflection.PortableExecutable.DebugDirectoryEntryType]::CodeView)
            {
                $data = $pe.ReadCodeViewDebugDirectoryData($entry)
                [ordered]@{
                    guid = $data.Guid.ToString()
                    stamp = $entry.Stamp
                    age = $data.Age
                    path = $data.Path
                    portable = $entry.IsPortableCodeView
                }
            }
        }
        $documents = foreach ($handle in $pdbReader.Documents)
        {
            $document = $pdbReader.GetDocument($handle)
            [ordered]@{
                path = $pdbReader.GetString($document.Name).Replace('/', '\')
                algorithm = $pdbReader.GetGuid($document.HashAlgorithm).ToString()
                checksum = [Convert]::ToHexString($pdbReader.GetBlobBytes($document.Hash))
            }
        }
        $sampleMethods = foreach ($handle in $reader.TypeDefinitions)
        {
            $type = $reader.GetTypeDefinition($handle)
            $name = $reader.GetString($type.Name)
            if ($name -eq 'Program' -or $name.Contains('handleUnidirectionalStream') -or $name.Contains('handleBidirectionalStream'))
            {
                foreach ($methodHandle in $type.GetMethods())
                {
                    $method = $reader.GetMethodDefinition($methodHandle)
                    [ordered]@{
                        type = $name
                        method = $reader.GetString($method.Name)
                        token = [Reflection.Metadata.Ecma335.MetadataTokens]::GetToken($methodHandle)
                        relativeVirtualAddress = $method.RelativeVirtualAddress
                    }
                }
            }
        }
        [ordered]@{
            mvid = $reader.GetGuid($reader.GetModuleDefinition().Mvid).ToString()
            peSha256 = (Get-FileHash $Dll).Hash
            pdbSha256 = (Get-FileHash $Pdb).Hash
            pdbIdGuid = $pdbGuid
            pdbIdStamp = $pdbStamp
            codeView = @($codeView)
            pePdbGuidAndStampMatch = @($codeView | Where-Object { $_.guid -eq $pdbGuid -and $_.stamp -eq $pdbStamp }).Count -eq 1
            documents = @($documents)
            sampleMethods = @($sampleMethods)
        }
    }
    finally
    {
        $provider.Dispose()
        $pdbStream.Dispose()
        $pe.Dispose()
        $stream.Dispose()
    }
}

$commonOutput = Join-Path $PSScriptRoot 'graphs\Original\artifacts\bin\InMemory.FunctionalTests\Release\net12.0'
$entries = @(
    @{id='OriginalSample'; role='Original'; directory=(Join-Path $PSScriptRoot 'graphs\Original\artifacts\bin\WebTransportInteractiveSampleApp\Release\net12.0'); name='WebTransportInteractiveSampleApp'; sources=@('src\Servers\Kestrel\samples\WebTransportInteractiveSampleApp\Program.cs')},
    @{id='CurrentDefaultSample'; role='CurrentDefault'; directory=(Join-Path $PSScriptRoot 'graphs\CurrentDefault\artifacts\bin\WebTransportInteractiveSampleApp\Release\net12.0'); name='WebTransportInteractiveSampleApp'; sources=@('src\Servers\Kestrel\samples\WebTransportInteractiveSampleApp\Program.cs')},
    @{id='CommonConsumer'; role='Original'; directory=$commonOutput; name='InMemory.FunctionalTests'; sources=@('src\Servers\Kestrel\shared\test\Http3\Http3InMemory.cs','src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportTestUtilities.cs','src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\Http3TestBase.cs','prepared\CompiledSampleProducerTests.cs')},
    @{id='CommonKestrelCore'; role='Original'; directory=$commonOutput; name='Microsoft.AspNetCore.Server.Kestrel.Core'; sources=@('src\Servers\Kestrel\Core\src\Internal\Http3\Http3Connection.cs','src\Servers\Kestrel\Core\src\Internal\Http3\Http3PendingStream.cs','src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportSession.cs','src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportStream.cs')},
    @{id='CommonInternalTesting'; role='Original'; directory=$commonOutput; name='Microsoft.AspNetCore.InternalTesting'; sources=@()}
)
$results = foreach ($entry in $entries)
{
    $dll = Join-Path $entry.directory "$($entry.name).dll"
    $pdb = Join-Path $entry.directory "$($entry.name).pdb"
    $metadata = Read-Metadata010 $dll $pdb
    if (-not $metadata.pePdbGuidAndStampMatch)
    {
        throw "PE/PDB GUID+stamp mismatch: $($entry.id)"
    }
    $destination = Join-Path $PSScriptRoot "evidence\selected-images\$($entry.id)"
    New-Item -ItemType Directory $destination -Force | Out-Null
    foreach ($extension in '.dll','.pdb','.deps.json','.runtimeconfig.json')
    {
        $file = Join-Path $entry.directory "$($entry.name)$extension"
        if (Test-Path $file)
        {
            Copy-Item $file $destination
        }
    }
    $sourceChecks = foreach ($relative in $entry.sources)
    {
        if ($relative.StartsWith('prepared\'))
        {
            $actual = Join-Path $PSScriptRoot $relative
            $snapshot = $relative
        }
        else
        {
            $actual = Join-Path $PSScriptRoot "graphs\$($entry.role)\$relative"
            $snapshot = "evidence\raw-source\$($entry.role)\$relative"
        }
        $matches = @($metadata.documents | Where-Object { $_.path.EndsWith($relative, [StringComparison]::OrdinalIgnoreCase) })
        if ($matches.Count -ne 1)
        {
            throw "Expected one PDB document: $($entry.id) $relative"
        }
        $hash = (Get-FileHash -LiteralPath $actual).Hash
        $copyHash = (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $snapshot)).Hash
        if ($matches[0].algorithm -ne '8829d00f-11b8-4213-878b-770e8597ac16' -or
            $matches[0].checksum -ne $hash -or $copyHash -ne $hash)
        {
            throw "Raw source/PDB checksum mismatch: $($entry.id) $relative"
        }
        [ordered]@{source=$relative; snapshot=$snapshot; sha256=$hash; pdbDocument=$matches[0]; rawBytesMatch=$true}
    }
    [ordered]@{
        id = $entry.id
        originalDllPath = $dll
        originalPdbPath = $pdb
        selectedDll = [IO.Path]::GetRelativePath($PSScriptRoot, (Join-Path $destination "$($entry.name).dll"))
        selectedPdb = [IO.Path]::GetRelativePath($PSScriptRoot, (Join-Path $destination "$($entry.name).pdb"))
        metadata = $metadata
        selectedRawSourceChecks = @($sourceChecks)
        fullCompilerInputAttestation = $false
    }
}
$results | ConvertTo-Json -Depth 15 | Set-Content (Join-Path $PSScriptRoot 'evidence\PDB-PE-SOURCE-RECEIPTS.json')
Write-Output "Inspected $($results.Count) real PE/PDB pairs; selected raw-source checks=$(@($results | ForEach-Object { $_.selectedRawSourceChecks }).Count)"
