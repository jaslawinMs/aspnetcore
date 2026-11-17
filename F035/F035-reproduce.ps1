$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F035'
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
$forced = Get-Content -Raw (Join-Path $run 'validation\forced-original-owner\verified-result.json') | ConvertFrom-Json
if (!$budget.sourceComparisonBudgetClosed -or !$forced.actualExactEarlierSourceDllPdbMatched -or
    !$forced.actualCoreUnchanged -or (Test-Path -LiteralPath (Join-Path $run 'actual-profile.lock')))
{
    throw 'Require closed timing and an exact independently rebuilt/restored original owner.'
}
$source = Join-Path $run 'preparation-original-003\prepared\sources\harness'
$relocated = Join-Path $run 'relocated-harness'
if (Test-Path -LiteralPath $relocated)
{
    throw 'Do not overwrite a relocation attempt.'
}
New-Item -ItemType Directory -Path $relocated | Out-Null
$files = @(Get-ChildItem -LiteralPath $source -File -Force)
if ($files.Count -ne 6)
{
    throw 'Require all six measured harness source/project files.'
}
$copies = @(foreach ($file in $files)
{
    $destination = Join-Path $relocated $file.Name
    Copy-Item -LiteralPath $file.FullName -Destination $destination
    $sha = (Get-FileHash -LiteralPath $destination).Hash
    if ($sha -cne (Get-FileHash -LiteralPath $file.FullName).Hash)
    {
        throw 'Relocated harness source/project copy differs.'
    }
    [ordered]@{name=$file.Name;actualOriginalSha256=$sha;actualRelocatedSha256=$sha}
})
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $run 'executed-reproduction-driver.ps1')
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $run 'reproduction-source-copy.json') -Encoding utf8NoBOM
& (Join-Path $PSScriptRoot 'F035-prepare.ps1') -Label preparation-reproduction-original -Variant original -HarnessDirectory $relocated
foreach ($file in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $relocated $file.name)).Hash -cne $file.actualOriginalSha256)
    {
        throw 'Relocated build/formatting changed a measured source/project byte.'
    }
}
& (Join-Path $PSScriptRoot 'F035-run-profile.ps1') -Mode characterize -Label characterize-reproduction-original -Preparation preparation-reproduction-original
$original = Join-Path $run 'profiles\characterize-original-002\states'
$reproduction = Join-Path $run 'profiles\characterize-reproduction-original\states'
$observations = @{}
$observedReproduction = 0
foreach ($file in Get-ChildItem -LiteralPath $original -Filter '*-contract.json' -File)
{
    $record = Get-Content -Raw $file.FullName | ConvertFrom-Json
    if ($observations.ContainsKey($record.key))
    {
        throw 'Original observation keys repeat.'
    }
    $observations.Add($record.key, ($record.observation | ConvertTo-Json -Depth 30 -Compress))
}
foreach ($file in Get-ChildItem -LiteralPath $reproduction -Filter '*-contract.json' -File)
{
    $record = Get-Content -Raw $file.FullName | ConvertFrom-Json
    if (!$observations.ContainsKey($record.key) -or
        ($record.observation | ConvertTo-Json -Depth 30 -Compress) -cne $observations[$record.key])
    {
        throw 'An exact concrete relocated cursor/query/binder/lifecycle observation differs.'
    }
    $observedReproduction++
}
if ($observations.Count -ne 61 -or $observedReproduction -ne 61)
{
    throw 'Require all 61 original and relocated observations,including20actual benchmark lifecycles.'
}
[ordered]@{
    candidate='F035';actualCopiedSourceProjectFiles=6;actualAllSixFilesByteExact=$true
    actualIndependentRelocatedBuildPassed=$true;actualOriginalOwnerForcedRebuildByteMatched=$true
    actualConcreteObservationCount=61;actualBenchmarkLifecyclesIncluded=20
    actualEveryConcreteObservationMatches=$true;actualComparativeRetiming=$false
    actualRebuiltHarnessPePdbByteIdentityClaim=$false
    limitation='Relocated path-dependent PE/PDB bytes may differ;source/project bytes are exact. No complete compiler provenance or new unit-test execution claim.'
} | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $run 'reproduction-verification.json') -Encoding utf8NoBOM
