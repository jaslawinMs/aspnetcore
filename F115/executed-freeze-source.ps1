$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$destination=Join-Path $run 'binaries\original'
$source=Join-Path $run 'harness\bin\Release\net12.0'
$frozen=Join-Path $run 'frozen-source\original'
if ((Test-Path $destination) -or (Test-Path $frozen) -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F115-list-element-boxing' -or
    @(git status --porcelain --untracked-files=no).Count) {throw 'Exact new unchanged F115 baseline image required.'}
$audit=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
if ($audit.passed -ne 81 -or $audit.failed -or $audit.skipped -or -not $audit.everyDiscoveredDefinitionAndExpandedRowMatched) {throw 'All81 actual expanded rows required before freezing.'}
foreach ($name in 'Microsoft.AspNetCore.JsonPatch.SystemTextJson.dll','Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb')
{
    $tested=@($audit.capturedTestAndOwnerImage|Where-Object file -CEQ $name)
    if ($tested.Count -ne 1 -or (Get-FileHash (Join-Path $source $name)).Hash -cne $tested[0].sha256) {throw 'Frozen owner DLL/PDB must equal actual tested owner.'}
}
New-Item -ItemType Directory -Path $destination -Force|Out-Null
Get-ChildItem -LiteralPath $source -Force|Copy-Item -Destination $destination -Recurse
New-Item -ItemType Directory -Path (Join-Path $frozen 'harness') -Force|Out-Null
Get-ChildItem (Join-Path $run 'harness') -File|Copy-Item -Destination (Join-Path $frozen 'harness')
Get-ChildItem (Join-Path $run 'producer-source') -Force|Copy-Item -Destination $frozen -Recurse
Copy-Item $PSCommandPath (Join-Path $run 'executed-freeze-source.ps1')
[ordered]@{
    candidate='F115';variant='original';baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5';branch='autoperf/F115-list-element-boxing'
    sourceTrackedUnchanged=$true;priorF086ChangeInherited=$false
    harnessSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.dll')).Hash
    harnessPdbSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.pdb')).Hash
    runtimeConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.runtimeconfig.json')).Hash
    dependencyConfigurationSha256=(Get-FileHash (Join-Path $destination 'AutoPerf.Benchmarks.deps.json')).Hash
    ownerSha256=(Get-FileHash (Join-Path $destination 'Microsoft.AspNetCore.JsonPatch.SystemTextJson.dll')).Hash
    ownerPdbSha256=(Get-FileHash (Join-Path $destination 'Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb')).Hash
    actualTestedOwnerMatches=$true;semanticRows=81;createdAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'original-manifest.json') -Encoding utf8
node (Join-Path $PSScriptRoot 'F115-closure.mjs') $run
if ($LASTEXITCODE) {throw 'Actual frozen complete original closure failed.'}
