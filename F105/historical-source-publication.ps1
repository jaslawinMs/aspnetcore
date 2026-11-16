$ErrorActionPreference='Stop'
$repo='C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F105'
$branch='autoperf/F105-validation-state-enumeration'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
if (Test-Path (Join-Path $run 'source-branch-publication.json')) { throw 'F105 source publication exists;retain it.' }
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if ($audit.disposition -cne 'rejected' -or $audit.actualBenchmarkOutcomes -ne 24 -or
    $audit.actualRetainedResultSamples -ne 192 -or $audit.actualRetainedOverheadSamples -ne 399 -or
    $audit.sourceComparisons -ne 0 -or -not $audit.comparisonBudgetClosed -or
    (git -C $repo branch --show-current).Trim() -cne $branch -or
    (git -C $repo rev-parse HEAD).Trim() -cne $baseline)
{
    throw 'Closed,audited original-only F105 rejection and independent baseline branch are required.'
}
git -C $repo --no-pager diff --check
$check=$LASTEXITCODE
git -C $repo diff --quiet HEAD --
$diff=$LASTEXITCODE
if ($check -or $diff) { throw 'Unexpected tracked source edit/whitespace;do not publish.' }
$sources=Get-Content (Join-Path $run 'producer-source-copies.json') -Raw|ConvertFrom-Json
foreach ($source in $sources)
{
    if ((Get-FileHash (Join-Path $repo $source.path)).Hash -cne $source.rawSha256)
    {
        throw 'Actual original raw source changed after its measured image.'
    }
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'F105-final-api-assessment.md') -Destination (Join-Path $run 'final-api-assessment.md')
node (Join-Path $PSScriptRoot 'F105-reproduce-analysis.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Actual portable F105 audit must pass before source publication.' }
$started=[DateTimeOffset]::UtcNow.ToString('o')
$pushArguments=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT='0'
git -C $repo @pushArguments *> (Join-Path $run 'source-branch-push.log')
$push=$LASTEXITCODE
if ($push) { throw 'Actual independent F105 source branch push failed.' }
$verificationArguments=@('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
gh @verificationArguments > (Join-Path $run 'actual-source-branch-ref.json')
$verified=$LASTEXITCODE
if ($verified) { throw 'Actual independent F105 fork ref retrieval failed.' }
$remote=Get-Content (Join-Path $run 'actual-source-branch-ref.json') -Raw|ConvertFrom-Json
if ($remote.object.sha -cne $baseline -or $remote.ref -cne "refs/heads/$branch")
{
    throw 'Actual F105 unchanged fork source ref differs.'
}
[ordered]@{
    candidate='F105';disposition='rejected';branch=$branch;commit=$baseline;baseline=$baseline
    sourceChanged=$false;independentOptimizationCommit=$false;sourceComparisons=0
    sourceDiffCheckExit=$check;sourceTrackedDiffExit=$diff;rawScopedOriginalSourcesUnchanged=20
    pushArguments=$pushArguments;pushExitCode=$push
    verificationArguments=$verificationArguments;verificationExitCode=$verified;actualRemoteRef=$remote
    performancePrCreated=$false;browserOpenRequested=$false;noOwnShippingOrBuildOutputRestorationNecessary=$true
    startedAt=$started;verifiedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 9|Set-Content (Join-Path $run 'source-branch-publication.json') -Encoding utf8
Write-Output 'F105 actual independent fork source branch unchanged37e809;incompatible API proposal rejected,no optimization commit/PR.'
