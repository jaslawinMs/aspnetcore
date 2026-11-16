$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch = 'autoperf/F103-statehaschanged-component-caches'
$source = 'src\Components\Analyzers\src\StateHasChangedAnalyzer.cs'
$record = Join-Path $run 'source-branch-publication.json'
if (Test-Path $record) { throw 'F103 source publication exists;inspect the actual ref rather than republish.' }
if ((git rev-parse HEAD).Trim() -cne $baseline -or (git branch --show-current).Trim() -cne $branch -or
    @(git diff --cached --name-only).Count)
{
    throw 'Expected untouched baseline/independent branch/empty index before exact measured-source publication.'
}
$tracked = @(git status --porcelain --untracked-files=no)
if ($tracked.Count -ne 1 -or $tracked[0] -cne ' M src/Components/Analyzers/src/StateHasChangedAnalyzer.cs')
{
    throw 'Only the measured F103 source seam may be committed;preserve unrelated untracked reports.'
}
$manifest = Get-Content (Join-Path $run 'candidate-3-manifest.json') -Raw | ConvertFrom-Json
$snapshots = Get-Content (Join-Path $run 'source-copies-candidate-3.json') -Raw | ConvertFrom-Json
$snapshot = @($snapshots | Where-Object source -ceq $source)
if ($snapshot.Count -ne 1 -or (Get-FileHash $source).Hash -cne $snapshot[0].sha256)
{
    throw 'Current source is not the exact measured final source.'
}
node (Join-Path $PSScriptRoot 'F103-reproduce-analysis.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Actual acceptance/raw/source/control audit is not green.' }
git add -- $source
if ($LASTEXITCODE) { throw 'Exact measured source staging failed.' }
$staged = @(git diff --cached --name-only)
if ($staged.Count -ne 1 -or $staged[0] -cne 'src/Components/Analyzers/src/StateHasChangedAnalyzer.cs')
{
    throw 'Unexpected staged source scope.'
}
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE) { throw 'Final source whitespace check failed.' }
git commit -q -m 'Allocate StateHasChanged analyzer component maps on demand' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE) { throw 'Measured-source commit failed.' }
$commit = (git rev-parse HEAD).Trim()
if ((git rev-parse 'HEAD^').Trim() -cne $baseline -or @(git status --porcelain --untracked-files=no).Count)
{
    throw 'Exact independent baseline-plus-source commit required.'
}
$push = @('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT = '0'
git @push *> (Join-Path $run 'source-push.log')
$pushCode = $LASTEXITCODE
if ($pushCode) { Get-Content (Join-Path $run 'source-push.log') -Tail 12;throw 'Source push failed;no draft.' }
$verify = @('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
$remote = gh @verify
$verifyCode = $LASTEXITCODE
if ($verifyCode) { throw 'Actual remote source ref retrieval failed.' }
$remote = $remote | ConvertFrom-Json
if ($remote.object.sha -cne $commit) { throw 'Actual fork source ref differs from measured-source commit.' }
$nativePath = $source.Replace('\','/')
$blob = (git rev-parse "${commit}:$nativePath").Trim()
$remoteSource = gh api "repos/jaslawinMs/aspnetcore/contents/$($nativePath)?ref=$commit"
if ($LASTEXITCODE) { throw 'Actual remote source bytes unavailable.' }
$remoteSource = $remoteSource | ConvertFrom-Json
$canonical = [Text.Encoding]::UTF8.GetBytes(
    [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($source)).Replace("`r`n","`n"))
if ($remoteSource.sha -cne $blob -or
    -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remoteSource.content)))
{
    throw 'Actual remote canonical source bytes differ;do not create a draft.'
}
[ordered]@{
    candidate='F103';branch=$branch;commit=$commit;parent=$baseline;sourceChanged=$true;trackedFilesChanged=1
    sourceRawSha256=$snapshot[0].sha256;sourceCanonicalGitBlob=$blob;actualRemoteSourceBlob=$remoteSource.sha
    actualRemoteRef=$remote;actualRemoteCanonicalBytesVerified=$true;pushArguments=$push;pushExitCode=$pushCode
    verificationArguments=$verify;verificationExitCode=$verifyCode
    measuredBuildBaselineRevision=$manifest.baselineSourceRevision;measuredSourcePatchSha256=$manifest.sourcePatchSha256
    measuredFinalOwnerSha256=$manifest.ownerAssemblySha256;measuredHarnessSha256=$manifest.harnessSha256
    measuredBinaryNotRelabeledAsBuiltFromLaterCommit=$true;sourceComparisons=3;comparisonBudgetClosed=$true
    publicApiDiagnosticDefaultDependencyTargetFrameworkVisibilityChanged=$false
    note='Exact measured source committed after30 original+30 final controls and60-outcome real-driver audit. Frozen binaries were built from37e809e plus recorded patch before this commit,not from a later commit. Fork-only proposal.'
} | ConvertTo-Json -Depth 8 | Set-Content $record
Write-Output "F103 exact measured source$commit/fork ref and canonical blob verified;one tracked file,no upstream PR."
