$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$branch = 'autoperf/F104-route-handler-operation-caches'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$receipt = Join-Path $run 'source-branch-publication.json'
if (Test-Path -LiteralPath $receipt) { throw 'F104 source publication already exists;verify rather than overwrite.' }
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$budget = Get-Content (Join-Path $run 'measurement-budget.json') -Raw | ConvertFrom-Json
if ($audit.disposition -cne 'no-gain' -or $audit.actualBenchmarkOutcomes -ne 60 -or
    $audit.actualRetainedResultSamples -ne 480 -or $audit.sourceComparisons -ne 3 -or
    -not $budget.closed -or $budget.completedSourceComparisons -ne 3 -or
    (git -C $repo branch --show-current).Trim() -cne $branch -or
    (git -C $repo rev-parse HEAD).Trim() -cne $baseline)
{
    throw 'The closed,audited F104 no-gain and independent baseline branch are required.'
}
$target = Join-Path $repo 'src\Framework\AspNetCoreAnalyzers\src\Analyzers\RouteHandlers\RouteHandlerAnalyzer.cs'
$original = Join-Path $run 'producer-source\src\Framework\AspNetCoreAnalyzers\src\Analyzers\RouteHandlers\RouteHandlerAnalyzer.cs'
$actualHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
if ($actualHash -cne (Get-FileHash -LiteralPath $original -Algorithm SHA256).Hash)
{
    throw 'Only the own one-line trial must be restored,including exact original raw source bytes.'
}
git -C $repo --no-pager diff --check
$check = $LASTEXITCODE
git -C $repo diff --quiet HEAD --
$diff = $LASTEXITCODE
if ($check -or $diff) { throw 'Unexpected tracked F104 source edits or whitespace.' }
node (Join-Path $PSScriptRoot 'F104-reproduce-analysis.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Portable audit must pass before publishing the F104 disposition.' }
$started = [DateTimeOffset]::UtcNow.ToString('o')
$pushArguments = @('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT = '0'
git -C $repo @pushArguments *> (Join-Path $run 'source-branch-push.log')
$push = $LASTEXITCODE
if ($push) { throw 'Actual F104 source branch push failed.' }
$verificationArguments = @('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
gh @verificationArguments > (Join-Path $run 'actual-source-branch-ref.json')
$verified = $LASTEXITCODE
if ($verified) { throw 'Actual F104 fork ref retrieval failed.' }
$remote = Get-Content (Join-Path $run 'actual-source-branch-ref.json') -Raw | ConvertFrom-Json
if ($remote.object.sha -cne $baseline -or $remote.ref -cne "refs/heads/$branch")
{
    throw 'Actual F104 independent fork source ref differs.'
}
[ordered]@{
    candidate='F104';disposition='no-gain';branch=$branch;commit=$baseline;baseline=$baseline
    sourceChanged=$false;independentOptimizationCommit=$false;ownExperimentalLineRestored=$true
    actualRestoredRawOwnerSourceSha256=$actualHash
    retainedComparedSourcePatches=@('source-candidate-1.patch','source-candidate-2.patch','source-candidate-3.patch')
    sourceDiffCheckExit=$check;sourceTrackedDiffExit=$diff;pushArguments=$pushArguments;pushExitCode=$push
    verificationArguments=$verificationArguments;verificationExitCode=$verified;actualRemoteRef=$remote
    startedAt=$started;verifiedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath $receipt -Encoding utf8
Write-Output 'F104 actual independent fork source branch remains unchanged37e809;own trial restored,all3 patches retained,no optimization commit or PR.'
