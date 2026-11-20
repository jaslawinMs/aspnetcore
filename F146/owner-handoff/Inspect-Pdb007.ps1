$ErrorActionPreference = 'Stop'
$a = $PSScriptRoot
if (Test-Path -LiteralPath (Join-Path $a 'MANIFEST.json'))
{
    throw 'F146-007 is frozen; use node Audit007.cjs verify-only without rewriting inspection evidence.'
}


function Read-PdbDocuments007
{
    param([string]$Path)

    $stream = [System.IO.File]::OpenRead($Path)
    $provider = [System.Reflection.Metadata.MetadataReaderProvider]::FromPortablePdbStream(
        $stream, [System.Reflection.Metadata.MetadataStreamOptions]::LeaveOpen, 0)
    try
    {
        $reader = $provider.GetMetadataReader(
            [System.Reflection.Metadata.MetadataReaderOptions]::Default, $null)
        foreach ($handle in $reader.Documents)
        {
            $document = $reader.GetDocument($handle)
            [ordered]@{
                path = $reader.GetString($document.Name).Replace('/', '\')
                hashAlgorithm = $reader.GetGuid($document.HashAlgorithm).ToString()
                checksum = [System.Convert]::ToHexString($reader.GetBlobBytes($document.Hash))
            }
        }
    }
    finally
    {
        $provider.Dispose()
        $stream.Dispose()
    }
}

function Read-Mvid007
{
    param([string]$Path)

    $stream = [System.IO.File]::OpenRead($Path)
    $pe = [System.Reflection.PortableExecutable.PEReader]::new(
        $stream, [System.Reflection.PortableExecutable.PEStreamOptions]::LeaveOpen, 0)
    try
    {
        $reader = [System.Reflection.Metadata.PEReaderExtensions]::GetMetadataReader(
            $pe, [System.Reflection.Metadata.MetadataReaderOptions]::Default, $null)
        $definition = $reader.GetModuleDefinition()

        return $reader.GetGuid($definition.Mvid).ToString()
    }
    finally
    {
        $pe.Dispose()
        $stream.Dispose()
    }
}

$producerPaths = @(
    'src\Servers\Kestrel\Core\src\Internal\Http3\Http3Connection.cs',
    'src\Servers\Kestrel\Core\src\Internal\Http3\Http3PendingStream.cs',
    'src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportSession.cs',
    'src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportStream.cs'
)
$roles = foreach ($role in 'Original', 'ObservedDefault')
{
    $graph = Join-Path $a "graphs\$role"
    $output = Join-Path $graph 'artifacts\bin\InMemory.FunctionalTests\Release\net12.0'
    $corePdb = Join-Path $output 'Microsoft.AspNetCore.Server.Kestrel.Core.pdb'
    $testPdb = Join-Path $output 'InMemory.FunctionalTests.pdb'
    $coreDocs = @(Read-PdbDocuments007 $corePdb)
    $testDocs = @(Read-PdbDocuments007 $testPdb)
    $checks = foreach ($relative in $producerPaths)
    {
        $matches = @($coreDocs | Where-Object { $_.path.EndsWith($relative, [System.StringComparison]::OrdinalIgnoreCase) })
        if ($matches.Count -ne 1)
        {
            throw "$role expected exactly one core PDB document for $relative; got $($matches.Count)."
        }

        $file = Join-Path $graph $relative
        $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
        if ($matches[0].hashAlgorithm -ne '8829d00f-11b8-4213-878b-770e8597ac16' -or
            $hash -ne $matches[0].checksum)
        {
            throw "$role source/PDB checksum mismatch for $relative"
        }

        [ordered]@{ source = $file; sha256 = $hash; pdbDocument = $matches[0]; match = $true }
    }
    $artifactChecks = foreach ($relative in 'F146ManagedProducerTests.cs', "$role\F146SampleHandler.cs")
    {
        $file = Join-Path $a "prepared\$relative"
        $matches = @($testDocs | Where-Object { $_.path -eq $file })
        if ($matches.Count -ne 1)
        {
            throw "$role expected exactly one test PDB document for $relative; got $($matches.Count)."
        }

        $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
        if ($matches[0].hashAlgorithm -ne '8829d00f-11b8-4213-878b-770e8597ac16' -or
            $hash -ne $matches[0].checksum)
        {
            throw "$role artifact/PDB checksum mismatch for $relative"
        }

        [ordered]@{ source = $file; sha256 = $hash; pdbDocument = $matches[0]; match = $true }
    }

    [ordered]@{
        role = $role
        inspectionOnly = $true
        assembliesLoadedForExecution = $false
        coreMvid = Read-Mvid007 (Join-Path $output 'Microsoft.AspNetCore.Server.Kestrel.Core.dll')
        testMvid = Read-Mvid007 (Join-Path $output 'InMemory.FunctionalTests.dll')
        corePdbSha256 = (Get-FileHash -LiteralPath $corePdb -Algorithm SHA256).Hash
        testPdbSha256 = (Get-FileHash -LiteralPath $testPdb -Algorithm SHA256).Hash
        managedProducerSourceDocumentChecks = @($checks)
        extractedBodyAndTestDocumentChecks = @($artifactChecks)
        fullCompiledSampleOwner = $false
    }
}
$roles | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $a 'PDB-SOURCE-OWNER-CHECKS.json')
Write-Output 'PDB source checks passed: 4 managed-producer documents + 2 artifact documents per role.'
