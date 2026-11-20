$ErrorActionPreference = 'Stop'
$root = Join-Path (Split-Path $PSCommandPath -Parent) 'autoperf-runs\F145'
$plan = Get-Content -LiteralPath (Join-Path $root 'plan.json') -Raw | ConvertFrom-Json
$rows = @()
foreach ($role in @('original', 'default'))
{
    foreach ($variant in @('baseline', 'candidate'))
    {
        $image = Join-Path $root "images\$role\$variant"
        $peFile = Join-Path $image 'InProcessWebSite.dll'
        $pdbFile = Join-Path $image 'InProcessWebSite.pdb'
        $source = if ($variant -eq 'baseline') { $plan.sourceRoles.$role.sourceCopy } else { Join-Path $plan.sourceRoles.$role.checkout $plan.sourceRoles.$role.sourcePath }
        $peStream = [IO.File]::OpenRead($peFile)
        $pdbStream = [IO.File]::OpenRead($pdbFile)
        $pe = [System.Reflection.PortableExecutable.PEReader]::new($peStream)
        $provider = [System.Reflection.Metadata.MetadataReaderProvider]::FromPortablePdbStream($pdbStream)
        try
        {
            $metadata = [System.Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($pe)
            $module = $metadata.GetModuleDefinition()
            $mvid = $metadata.GetGuid($module.Mvid)
            $entry = @($pe.ReadDebugDirectory() | Where-Object Type -eq CodeView)
            if ($entry.Count -ne 1)
            {
                throw 'Expected one source-owner CodeView entry.'
            }
            $codeView = $pe.ReadCodeViewDebugDirectoryData($entry[0])
            $pdb = $provider.GetMetadataReader()
            [byte[]]$id = $pdb.DebugMetadataHeader.Id
            $pdbGuid = [Guid]::new([byte[]]$id[0..15])
            $pdbStamp = [BitConverter]::ToUInt32($id, 16)
            if ($codeView.Guid -ne $pdbGuid -or $entry[0].Stamp -ne $pdbStamp)
            {
                throw 'Source-owner PE/PDB GUID or stamp differs.'
            }
            $documents = @()
            foreach ($handle in $pdb.Documents)
            {
                $document = $pdb.GetDocument($handle)
                $name = $pdb.GetString($document.Name)
                if ($name.Replace('/', '\').EndsWith('\Startup.cs', [StringComparison]::OrdinalIgnoreCase))
                {
                    $documents += [ordered]@{
                        document = $name
                        checksumAlgorithm = $pdb.GetGuid($document.HashAlgorithm).ToString()
                        checksum = [Convert]::ToHexString($pdb.GetBlobBytes($document.Hash))
                    }
                }
            }
            $expected = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
            if ($documents.Count -ne 1 -or $documents[0].checksum -ne $expected)
            {
                throw 'The exact selected Startup source checksum differs.'
            }
            $rows += [ordered]@{
                role = $role
                variant = $variant
                ownerSha256 = (Get-FileHash -LiteralPath $peFile -Algorithm SHA256).Hash
                pdbSha256 = (Get-FileHash -LiteralPath $pdbFile -Algorithm SHA256).Hash
                mvid = $mvid.ToString()
                codeViewGuid = $codeView.Guid.ToString()
                pdbGuid = $pdbGuid.ToString()
                actualGuidAndStampMatch = $true
                selectedSource = $source
                selectedSourceSha256 = $expected
                selectedPdbDocument = $documents[0]
                actualSelectedSourceChecksumMatches = $true
                sourceBoundary = if ($variant -eq 'baseline') { 'Exact original physical source snapshot captured before the temporary candidate patch; not current candidate source at the shared document path.' } else { 'Exact physical native project input currently patched for candidate compilation, equal to the real implementation-branch source bytes.' }
            }
        }
        finally
        {
            $provider.Dispose()
            $pe.Dispose()
            $pdbStream.Dispose()
            $peStream.Dispose()
        }
    }
}
$result = [ordered]@{ recordedAt = [DateTime]::UtcNow.ToString('O'); actualNoSourceAssemblyLoadedOrDotnetStarted = $true; selectedAssociations = $rows; fullCompilerInputAttestation = $false }
$destination = Join-Path $root 'inputs\owner-source-associations.json'
if (Test-Path -LiteralPath $destination)
{
    throw 'Refusing to overwrite owner association evidence.'
}
$result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $destination -Encoding utf8
$rows | Select-Object role,variant,ownerSha256,actualGuidAndStampMatch,actualSelectedSourceChecksumMatches | ConvertTo-Json
