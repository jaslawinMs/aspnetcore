param([Parameter(Mandatory)][string]$Root)

$ErrorActionPreference = 'Stop'
$Root = [IO.Path]::GetFullPath($Root)
$accepted = Get-Content -LiteralPath (Join-Path $Root 'accepted-images.json') -Raw | ConvertFrom-Json
$budget = Get-Content -LiteralPath (Join-Path $Root 'diagnostic-budget.json') -Raw | ConvertFrom-Json
$owners = @()
foreach ($role in @('original', 'default'))
{
    foreach ($variant in @('baseline', 'candidate'))
    {
        $image = Join-Path $Root "selected-images\$role\$variant"
        $source = if ($variant -eq 'baseline') { Join-Path $Root "source\$role\Startup.baseline.cs" } else { Join-Path $Root 'inputs\Startup.candidate.cs' }
        $peStream = [IO.File]::OpenRead((Join-Path $image 'InProcessWebSite.dll'))
        $pdbStream = [IO.File]::OpenRead((Join-Path $image 'InProcessWebSite.pdb'))
        $pe = [System.Reflection.PortableExecutable.PEReader]::new($peStream)
        $provider = [System.Reflection.Metadata.MetadataReaderProvider]::FromPortablePdbStream($pdbStream)
        try
        {
            $metadata = [System.Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($pe)
            $module = $metadata.GetModuleDefinition()
            $mvid = $metadata.GetGuid($module.Mvid).ToString()
            $entries = @($pe.ReadDebugDirectory() | Where-Object Type -eq CodeView)
            if ($entries.Count -ne 1)
            {
                throw 'Expected one source-owner CodeView entry.'
            }
            $codeView = $pe.ReadCodeViewDebugDirectoryData($entries[0])
            $pdb = $provider.GetMetadataReader()
            [byte[]]$id = $pdb.DebugMetadataHeader.Id
            if ($codeView.Guid -ne [Guid]::new([byte[]]$id[0..15]) -or $entries[0].Stamp -ne [BitConverter]::ToUInt32($id, 16))
            {
                throw 'Actual selected owner PE/PDB identity mismatch.'
            }
            $documents = @()
            foreach ($handle in $pdb.Documents)
            {
                $document = $pdb.GetDocument($handle)
                $name = $pdb.GetString($document.Name)
                if ($name.Replace('/', '\').EndsWith('\Startup.cs', [StringComparison]::OrdinalIgnoreCase))
                {
                    $documents += [pscustomobject]@{
                        document = $name
                        algorithm = $pdb.GetGuid($document.HashAlgorithm).ToString()
                        checksum = [Convert]::ToHexString($pdb.GetBlobBytes($document.Hash))
                    }
                }
            }
            $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
            if ($documents.Count -ne 1 -or $documents[0].algorithm -ne '8829d00f-11b8-4213-878b-770e8597ac16' -or
                $documents[0].checksum -ne $sourceHash -or $mvid -ne $accepted.images.$role.$variant.sourceAssociation.mvid)
            {
                throw 'Raw selected source/PDB checksum or actual owner MVID differs.'
            }
            $owners += [pscustomobject]@{
                role = $role; variant = $variant; mvid = $mvid; sourceSha256 = $sourceHash
                actualGuidStampAndRawSourceChecksumVerified = $true
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
$numbers = @()
foreach ($authorization in $budget.authorizations)
{
    $role = $authorization.sourceRole
    $primaryLogSum = 0.0
    $controlLogSum = 0.0
    $favoring = 0
    $pairs = @()
    foreach ($pair in 0..6)
    {
        $values = @{}
        foreach ($variant in @('baseline', 'candidate'))
        {
            $window = @($authorization.windows | Where-Object { $_.pair -eq $pair -and $_.variant -eq $variant -and -not $_.warmup })
            if ($window.Count -ne 1)
            {
                throw 'Missing or duplicate actual measured pair window.'
            }
            $execution = Join-Path $Root "executions\$($window[0].label)"
            $primary = Get-Content -LiteralPath (Join-Path $execution 'primary.stdout.txt') -Raw | ConvertFrom-Json
            $control = Get-Content -LiteralPath (Join-Path $execution 'control.stdout.txt') -Raw | ConvertFrom-Json
            if ($primary.bodyLength -ne 200000000 -or $control.bodyLength -ne 65000 -or
                $primary.elapsedTicks -le 0 -or $control.elapsedTicks -le 0 -or
                $primary.ticksPerSecond -le 0 -or $control.ticksPerSecond -le 0)
            {
                throw 'Raw compiled-client output does not establish the fixed workload/timing.'
            }
            $values[$variant] = @{
                primary = [double]$primary.elapsedTicks / [double]$primary.ticksPerSecond
                control = [double]$control.elapsedTicks / [double]$control.ticksPerSecond
            }
        }
        $primaryRatio = $values.candidate.primary / $values.baseline.primary
        $controlRatio = $values.candidate.control / $values.baseline.control
        $primaryLogSum += [Math]::Log($primaryRatio)
        $controlLogSum += [Math]::Log($controlRatio)
        if ($primaryRatio -lt 1)
        {
            $favoring++
        }
        $pairs += [pscustomobject]@{ pair = $pair; primaryRatio = $primaryRatio; controlRatio = $controlRatio }
    }
    $primaryMean = [Math]::Exp($primaryLogSum / 7.0)
    $controlMean = [Math]::Exp($controlLogSum / 7.0)
    if ($primaryMean -gt 0.90 -or $favoring -lt 6 -or $controlMean -lt 0.95 -or $controlMean -gt 1.05)
    {
        throw 'Independent raw-output reduction fails the sealed primary/control criteria.'
    }
    $numbers += [pscustomobject]@{
        role = $role; actualPairs = 7; actualPrimaryRatio = $primaryMean; actualLessTimePercent = (1 - $primaryMean) * 100
        actualFavoringPairs = $favoring; actualControlRatio = $controlMean; actualAllGatesPassed = $true; pairs = $pairs
    }
}
[ordered]@{
    actualNoDotnetSourceAssemblyOrProducerStarted = $true
    actualSelectedPePdbAndRawSourceAssociations = $owners
    actualIndependentRawClientOutputReductions = $numbers
    actualFullCompilerAttestation = $false
    actualAdditionalTiming = 0
} | ConvertTo-Json -Depth 12
