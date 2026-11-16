$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$record=Join-Path $run 'source-branch-publication.json'
$branch='autoperf/F115-list-element-boxing'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
if ((Test-Path $record) -or @(git status --porcelain --untracked-files=no).Count -or
    (git branch --show-current).Trim() -cne $branch -or (git rev-parse HEAD).Trim() -cne $baseline -or
    (git remote get-url autoperf).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$') {throw 'Only exact unchanged independent source branch in user fork permitted.'}
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if ($audit.sourceChanged -or $audit.sourceComparisons -ne 0 -or $audit.performancePrJustified -or
    $audit.actualBenchmarkOutcomes -ne 28 -or $audit.actualTestRowExecutions -ne 81) {throw 'Exact rejected/no-source-change evaluation required.'}
$env:GIT_TERMINAL_PROMPT='0'
$pushArguments=@('push','autoperf',"$($baseline):refs/heads/$branch")
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' @pushArguments
if ($LASTEXITCODE) {throw 'Actual unchanged branch push failed.'}
$verificationArguments=@('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
$raw=gh @verificationArguments
if ($LASTEXITCODE) {throw 'Actual remote source ref unavailable.'}
$actual=$raw|ConvertFrom-Json
if ($actual.object.sha -cne $baseline -or $actual.ref -cne "refs/heads/$branch") {throw 'Actual unchanged remote branch differs.'}
[ordered]@{
    candidate='F115';branch=$branch;commit=$baseline;baseline=$baseline;trackedFilesChanged=0
    sourceChanged=$false;newSourceCommitCreated=$false;unchangedBaselineBranchPushed=$true
    actualRemoteRefVerified=$true;actualRemoteRef=$actual;pushArguments=$pushArguments;verificationArguments=$verificationArguments
    performancePrCreated=$false
    note='An independent named fork branch points to the exact measured unchanged baseline. No fabricated source edit/commit/performance PR for rejected local boxing removal;reproducible harness and pressure/disposition evidence live on autoperf-results.'
}|ConvertTo-Json -Depth 9|Set-Content $record -Encoding utf8
Write-Output 'F115:actual independent fork branch verified at unchanged measured baseline;no speculative source commit or performance PR.'
