$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F113'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F113-distributed-cache-encode'
$record=Join-Path $run 'source-branch-publication.json'
$sources=@('src\Mvc\Mvc.TagHelpers\src\Cache\DistributedCacheTagHelperService.cs','src\Mvc\Mvc.TagHelpers\test\DistributedCacheTagHelperTest.cs')
if (Test-Path $record) {throw 'Preserve actual source publication receipt.'}
if ((git rev-parse HEAD).Trim() -cne $baseline -or (git branch --show-current).Trim() -cne $branch -or
    @(git diff --cached --name-only).Count) {throw 'Only independent unstaged F113 baseline-plus-measured seam may publish.'}
$fork=(git remote get-url autoperf).Trim()
if ($fork -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$') {throw 'Exact user fork required;no upstream write.'}
$changed=@(git diff --name-only)
if ($changed.Count -ne 2 -or (Compare-Object @($changed|Sort-Object) @($sources.Replace('\','/')|Sort-Object))) {throw 'Only exact source/test two-file diff allowed.'}
$manifest=Get-Content (Join-Path $run 'candidate1-manifest.json') -Raw|ConvertFrom-Json
foreach ($source in $manifest.sourceFiles) {if ((Get-FileHash $source.file).Hash -cne $source.sha256) {throw 'Current shipping source differs from measured selected source.'}}
if ((Get-FileHash $sources[1]).Hash -cne (Get-FileHash (Join-Path $run 'tests\candidate1-final\source\DistributedCacheTagHelperTest.cs')).Hash) {throw 'Only final19-row green test source allowed.'}
node (Join-Path $PSScriptRoot 'F113-reproduce-analysis.mjs') $run --verify
if ($LASTEXITCODE) {throw 'Closed-budget all-row evidence must pass first.'}
git add -- @sources
if ($LASTEXITCODE) {throw 'Precise staging failed.'}
$staged=@(git diff --cached --name-only)
if ($staged.Count -ne 2 -or (Compare-Object @($staged|Sort-Object) @($sources.Replace('\','/')|Sort-Object))) {throw 'Unexpected staged scope.'}
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE) {throw 'Actual staged whitespace check failed.'}
git --no-pager diff --cached --binary|Set-Content (Join-Path $run 'selected-source.diff') -Encoding utf8
git commit -q -m 'Allocate exact buffers for distributed cache tag-helper entries' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE) {throw 'Independent measured source commit failed.'}
$commit=(git rev-parse HEAD).Trim()
if ((git rev-parse 'HEAD^').Trim() -cne $baseline -or @(git status --porcelain --untracked-files=no).Count) {throw 'Independent two-file commit must leave tracked source clean.'}
$push=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT='0'
git @push *> (Join-Path $run 'source-push.log');$pushCode=$LASTEXITCODE
if ($pushCode) {throw 'Actual fork push failed;do not create draft.'}
$verify=@('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
$remoteText=gh @verify;$verifyCode=$LASTEXITCODE
if ($verifyCode) {throw 'Actual remote fork ref unavailable.'}
$remote=$remoteText|ConvertFrom-Json
if ($remote.object.sha -cne $commit) {throw 'Actual remote source ref differs.'}
$rows=@(foreach ($relative in $sources)
{
    $gitPath=$relative.Replace('\','/');$blob=(git rev-parse "${commit}:$gitPath").Trim()
    $remoteFile=gh api "repos/jaslawinMs/aspnetcore/contents/$($gitPath)?ref=$commit"
    if ($LASTEXITCODE) {throw 'Actual remote source content unavailable.'}
    $remoteFile=$remoteFile|ConvertFrom-Json
    $canonical=[Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($relative)).Replace("`r`n","`n"))
    if ($remoteFile.sha -cne $blob -or -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remoteFile.content))) {throw 'Actual remote canonical source bytes differ.'}
    [pscustomobject]@{source=$relative;rawSha256=(Get-FileHash $relative).Hash;canonicalGitBlob=$blob;actualRemoteGitBlob=$remoteFile.sha;actualRemoteCanonicalBytesVerified=$true}
})
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
[ordered]@{
    candidate='F113';branch=$branch;commit=$commit;parent=$baseline;sourceChanged=$true;trackedFilesChanged=2
    shippingSourceFilesChanged=1;existingTestClassFilesChanged=1;sources=$rows;actualForkRemote=$fork;actualRemoteRef=$remote;actualRemoteCanonicalBytesVerified=$true
    pushArguments=$push;pushExitCode=$pushCode;verificationArguments=$verify;verificationExitCode=$verifyCode
    measuredBuildBaselineRevision=$manifest.baseline;measuredFinalOwnerSha256=$manifest.ownerSha256;measuredHarnessSha256=$manifest.harnessSha256
    measuredBinaryNotRelabeledAsBuiltFromLaterCommit=$true;sourceComparisons=$audit.sourceComparisons;comparisonBudgetClosed=$true
    publicApiDefaultDependencyTargetFrameworkVisibilityChanged=$false;decodeWorkersKeysExpirationUnchanged=$true;priorFindingChangesInherited=$false
    note='Exact private Encode plus focused existing-class tests;all output bytes independently owned. Only Mvc.TagHelpers DLL/PDB differ between frozen measured images. Measured binaries predate later source commit. Component/cache-miss evidence only;shared-machine variance/all controls and aggregate-array-capacity exception-equivalence boundary retained.'
}|ConvertTo-Json -Depth 9|Set-Content $record -Encoding utf8
Write-Output "F113 source$commit/fork ref/all2 canonical blobs verified;no upstream write."
