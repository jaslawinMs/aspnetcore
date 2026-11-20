$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$rows = [Collections.Generic.List[object]]::new()
foreach ($variant in @('original', 'default'))
{
    $folder = Join-Path $PSScriptRoot "inputs\$variant"
    $payload = Get-Content -Raw -LiteralPath (Join-Path $folder 'payload.json') | ConvertFrom-Json
    $ownerPath = Join-Path $folder 'assemblies\Microsoft.AspNetCore.TestHost.dll'
    $peStream = [IO.File]::OpenRead($ownerPath)
    $pdbStream = [IO.File]::OpenRead($payload.ownerPdbPath)
    $pe = [System.Reflection.PortableExecutable.PEReader]::new($peStream)
    $provider = [System.Reflection.Metadata.MetadataReaderProvider]::FromPortablePdbStream($pdbStream)
    try
    {
        $debugEntry = @($pe.ReadDebugDirectory() | Where-Object { $_.Type.ToString() -eq 'CodeView' })
        if ($debugEntry.Count -ne 1)
        {
            throw 'Expected exactly one owner CodeView entry.'
        }
        $codeView = $pe.ReadCodeViewDebugDirectoryData($debugEntry[0])
        $metadata = $provider.GetMetadataReader()
        $pdbId = [byte[]]@($metadata.DebugMetadataHeader.Id)
        $pdbGuid = [Guid]::new([byte[]]$pdbId[0..15])
        $pdbStamp = [BitConverter]::ToUInt32($pdbId, 16)
        if ($codeView.Guid -ne $pdbGuid -or $debugEntry[0].Stamp -ne $pdbStamp)
        {
            throw "$variant owner PE/PDB identity mismatch."
        }
        $documents = @($metadata.Documents | ForEach-Object { $metadata.GetDocument($_) } | Where-Object {
            $metadata.GetString($_.Name).Replace('\', '/').EndsWith('/src/Hosting/TestHost/src/WebSocketClient.cs', [StringComparison]::OrdinalIgnoreCase)
        })
        if ($documents.Count -ne 1)
        {
            throw 'Expected one WebSocketClient source document.'
        }
        $document = $documents[0]
        if ($metadata.GetGuid($document.HashAlgorithm) -ne [Guid]'8829d00f-11b8-4213-878b-770e8597ac16')
        {
            throw 'Expected SHA256 source checksum.'
        }
        $expectedSourceHash = [Convert]::ToHexString($metadata.GetBlobBytes($document.Hash))
        $actualSourceHash = (Get-FileHash -LiteralPath $payload.ownerSourcePath -Algorithm SHA256).Hash
        $ownerHash = (Get-FileHash -LiteralPath $ownerPath -Algorithm SHA256).Hash
        $pdbHash = (Get-FileHash -LiteralPath $payload.ownerPdbPath -Algorithm SHA256).Hash
        if ($expectedSourceHash -ne $actualSourceHash -or $ownerHash -ne $payload.ownerPeSha256 -or $pdbHash -ne $payload.ownerPdbSha256)
        {
            throw "$variant copied owner/PDB/source checksum mismatch."
        }
        $sourceText = [IO.File]::ReadAllText($payload.ownerSourcePath).Replace("`r`n", "`n")
        $gitText = [IO.File]::ReadAllText($payload.sourceSnapshotPath).Replace("`r`n", "`n")
        if ($sourceText -cne $gitText)
        {
            throw "$variant copied owner source differs from pinned Git source beyond line endings."
        }
        $peMetadata = [System.Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($pe)
        $rows.Add([ordered]@{
            variant = $variant
            revision = $payload.sourceRevision
            ownerPath = $ownerPath
            ownerSha256 = $ownerHash
            ownerModuleVersionId = $peMetadata.GetGuid($peMetadata.GetModuleDefinition().Mvid)
            pdbPath = $payload.ownerPdbPath
            pdbSha256 = $pdbHash
            pePdbGuid = $pdbGuid
            pePdbGuidAndStampMatch = $true
            sourceDocument = $metadata.GetString($document.Name)
            sourceFile = $payload.ownerSourcePath
            sourceSha256 = $actualSourceHash
            pdbSourceChecksumMatches = $true
            pinnedGitSourceEqualIgnoringLineEndings = $true
        })
    }
    finally
    {
        $provider.Dispose()
        $pe.Dispose()
        $pdbStream.Dispose()
        $peStream.Dispose()
    }
}
[ordered]@{
    kind = 'fresh-copied-owner-static-identity-proof'
    recordedUtc = [DateTime]::UtcNow.ToString('O')
    rows = @($rows)
    startedBuildTestOrHost = $false
    boundary = 'Read-only PE/PDB/source metadata verification of fresh copied inputs. This does not claim that a new producer process loaded or executed these copies.'
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\copied-owner-static-proof.json') -Encoding utf8
Write-Output 'Both copied owner PE/PDB/source identities verified as metadata; no producer executed.'
