$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F116-boxed-port-cache'
$source='src\Shared\ConnectionEndpointTags.cs'
$record=Join-Path $run 'source-branch-publication.json'
if (Test-Path $record) {throw 'Never overwrite the actual source publication receipt.'}
if ((git rev-parse HEAD).Trim() -cne $baseline -or (git branch --show-current).Trim() -cne $branch -or
    @(git diff --cached --name-only).Count) {throw 'Independent unstaged baseline-plus-measured F116 seam required.'}
$fork=(git remote get-url autoperf).Trim()
if ($fork -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$') {throw 'Only user fork permitted.'}
$changed=@(git diff --name-only)
if ($changed.Count -ne 1 -or $changed[0] -cne $source.Replace('\','/')) {throw 'Only one measured shipping file may be staged.'}
$manifest=Get-Content (Join-Path $run 'manifest-candidate1.json') -Raw|ConvertFrom-Json
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$budget=Get-Content (Join-Path $run 'measurement-budget.json') -Raw|ConvertFrom-Json
if ((Get-FileHash $source).Hash -cne $manifest.sourceSha256 -or $audit.candidateSourceSha256 -cne $manifest.sourceSha256 -or
    -not $budget.closed -or $budget.completedSourceComparisons -ne 3 -or $audit.actualBenchmarkOutcomes -ne 144 -or
    $audit.actualOwningTestRows -ne 62 -or $audit.independentMaterializedFreshColdProcesses -ne 6 -or
    -not $audit.performancePrJustified -or $audit.disposition -cne 'draft-allocation') {throw 'Exact source and complete explicitly-qualified evidence required.'}
git add -- $source
if ($LASTEXITCODE) {throw 'Precise staging failed.'}
$staged=@(git diff --cached --name-only)
if ($staged.Count -ne 1 -or $staged[0] -cne $source.Replace('\','/')) {throw 'Unexpected staged scope.'}
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE) {throw 'Actual staged source whitespace failed.'}
git --no-pager diff --cached --binary|Set-Content (Join-Path $run 'selected-source.diff') -Encoding utf8
git commit -q -m 'Cache a second frequently used boxed endpoint port without cache replacement' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE) {throw 'Independent source commit failed.'}
$commit=(git rev-parse HEAD).Trim()
if ((git rev-parse 'HEAD^').Trim() -cne $baseline -or @(git status --porcelain --untracked-files=no).Count) {throw 'Measured one-file source commit must leave tracked source clean.'}
$push=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT='0'
git @push *> (Join-Path $run 'source-push.log');$pushCode=$LASTEXITCODE
if ($pushCode) {throw 'Actual user-fork push failed.'}
$verify=@('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
$remoteText=gh @verify;$verifyCode=$LASTEXITCODE
if ($verifyCode) {throw 'Actual fork source ref unavailable.'}
$remote=$remoteText|ConvertFrom-Json
if ($remote.object.sha -cne $commit) {throw 'Actual fork ref differs.'}
$gitPath=$source.Replace('\','/');$blob=(git rev-parse "${commit}:$gitPath").Trim()
$remoteFile=gh api "repos/jaslawinMs/aspnetcore/contents/$($gitPath)?ref=$commit"
if ($LASTEXITCODE) {throw 'Actual remote source content unavailable.'}
$remoteFile=$remoteFile|ConvertFrom-Json
$canonical=[Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($source)).Replace("`r`n","`n"))
if ($remoteFile.sha -cne $blob -or -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remoteFile.content))) {throw 'Actual remote canonical source bytes differ.'}
[ordered]@{
    candidate='F116';branch=$branch;commit=$commit;parent=$baseline;sourceChanged=$true;trackedFilesChanged=1;shippingSourceFilesChanged=1
    sources=@([ordered]@{source=$source;rawSha256=(Get-FileHash $source).Hash;canonicalGitBlob=$blob;actualRemoteGitBlob=$remoteFile.sha;actualRemoteCanonicalBytesVerified=$true})
    actualForkRemote=$fork;actualRemoteRef=$remote;actualRemoteRefVerified=$true;actualRemoteCanonicalBytesVerified=$true
    pushArguments=$push;pushExitCode=$pushCode;verificationArguments=$verify;verificationExitCode=$verifyCode
    measuredBuildBaselineRevision=$baseline;measuredSourceSha256=$manifest.sourceSha256;measuredExecutionIdentities=$manifest.executionIdentities
    measuredBinaryNotRelabeledAsBuiltFromLaterCommit=$true;sourceComparisons=3;comparisonBudgetClosed=$true
    publicApiDefaultDependencyTargetFrameworkVisibilityChanged=$false;priorFindingChangesInherited=$false
    qualification='Qualified allocation-only two-port follow-on to merged69558,not merge-ready. First-port queue/all-miss/control latency costs,extra retained slot/cold CAS and shared-machine uncertainty retained. Historical cold snapshot-label defect independently repaired by six cold-only probes against identical owner DLLs,no timing rerun. No whole-request/hub/application speedup claim.'
}|ConvertTo-Json -Depth 10|Set-Content $record -Encoding utf8
Write-Output "F116:$commit independent one-file source/fork ref/canonical bytes verified;only allocation-qualified draft justified."
