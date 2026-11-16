$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F112'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F112-stored-value-buffer'
$record=Join-Path $run 'source-branch-publication.json'
$sources=@(
    'src\Components\Endpoints\src\Microsoft.AspNetCore.Components.Endpoints.csproj',
    'src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs',
    'src\Components\Endpoints\test\TempData\JsonStoredDataSerializerTest.cs'
)
if (Test-Path $record) { throw 'Preserve actual source publication receipt.' }
if ((git rev-parse HEAD).Trim() -cne $baseline -or (git branch --show-current).Trim() -cne $branch -or
    @(git diff --cached --name-only).Count) { throw 'Only the unstaged independent F112 baseline-plus-measured seam may be published.' }
$forkRemote=(git remote get-url autoperf).Trim()
if ($forkRemote -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$') { throw 'Exact user fork remote required;no upstream write.' }
$changed=@(git diff --name-only)
if ($changed.Count -ne 3 -or (Compare-Object @($changed|Sort-Object) @($sources.Replace('\','/')|Sort-Object))) { throw 'Only exact three source/project/test files allowed.' }
$manifest=Get-Content (Join-Path $run 'candidate1-manifest.json') -Raw|ConvertFrom-Json
foreach ($source in $manifest.sourceFiles)
{
    if ((Get-FileHash $source.file).Hash -cne $source.sha256) { throw 'Current shipping source differs from selected frozen source.' }
}
if ((Get-FileHash $sources[2]).Hash -cne (Get-FileHash (Join-Path $run 'tests\candidate1\source\JsonStoredDataSerializerTest.cs')).Hash) { throw 'Only exact18-row green test source allowed.' }
node (Join-Path $PSScriptRoot 'F112-reproduce-analysis.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Closed-budget all-row evidence must pass before source publication.' }
git add -- @sources
if ($LASTEXITCODE) { throw 'Precise staging failed.' }
$staged=@(git diff --cached --name-only)
if ($staged.Count -ne 3 -or (Compare-Object @($staged|Sort-Object) @($sources.Replace('\','/')|Sort-Object))) { throw 'Unexpected staged source.' }
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE) { throw 'Staged whitespace check failed.' }
git --no-pager diff --cached --binary|Set-Content (Join-Path $run 'selected-source.diff') -Encoding utf8
git commit -q -m 'Pool temporary buffers when serializing component session values' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE) { throw 'Independent measured source commit failed.' }
$commit=(git rev-parse HEAD).Trim()
if ((git rev-parse 'HEAD^').Trim() -cne $baseline -or @(git status --porcelain --untracked-files=no).Count) { throw 'Independent baseline-plus-three-file commit must leave tracked source clean.' }
$push=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT='0'
git @push *> (Join-Path $run 'source-push.log')
$pushCode=$LASTEXITCODE
if ($pushCode) { throw 'Fork source push failed;do not create a draft.' }
$verify=@('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
$remoteText=gh @verify
$verifyCode=$LASTEXITCODE
if ($verifyCode) { throw 'Remote fork source ref unavailable.' }
$remote=$remoteText|ConvertFrom-Json
if ($remote.object.sha -cne $commit) { throw 'Remote fork source differs.' }
$rows=@(foreach ($relative in $sources)
{
    $gitPath=$relative.Replace('\','/')
    $blob=(git rev-parse "${commit}:$gitPath").Trim()
    $remoteFile=gh api "repos/jaslawinMs/aspnetcore/contents/$($gitPath)?ref=$commit"
    if ($LASTEXITCODE) { throw 'Actual remote source content unavailable.' }
    $remoteFile=$remoteFile|ConvertFrom-Json
    $canonical=[Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($relative)).Replace("`r`n","`n"))
    if ($remoteFile.sha -cne $blob -or -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remoteFile.content))) { throw 'Remote canonical source bytes differ.' }
    [pscustomobject]@{source=$relative;rawSha256=(Get-FileHash $relative).Hash;canonicalGitBlob=$blob;actualRemoteGitBlob=$remoteFile.sha;actualRemoteCanonicalBytesVerified=$true}
})
[ordered]@{
    candidate='F112';branch=$branch;commit=$commit;parent=$baseline;sourceChanged=$true;trackedFilesChanged=3
    shippingSourceFilesChanged=1;projectSharedCompileIncludesAdded=1;existingTestClassFilesChanged=1;sources=$rows
    actualForkRemote=$forkRemote;actualRemoteRef=$remote;actualRemoteCanonicalBytesVerified=$true
    pushArguments=$push;pushExitCode=$pushCode;verificationArguments=$verify;verificationExitCode=$verifyCode
    measuredBuildBaselineRevision=$manifest.baseline;measuredFinalOwnerSha256=$manifest.ownerSha256;measuredHarnessSha256=$manifest.harnessSha256
    measuredBinaryNotRelabeledAsBuiltFromLaterCommit=$true;sourceComparisons=1;comparisonBudgetClosed=$true
    publicApiDefaultDependencyTargetFrameworkVisibilityChanged=$false;f111SerializeDataUnchanged=$true;temporarySampleChangesCommitted=$false
    note='Exact selected candidate1 source/project and18-row green tests committed after56-outcome audit. Frozen images were built from37e809e plus recorded source before this later commit. Fork-only conditional warmed-pool component draft;retained heap/cold-pool costs remain unmeasured,not merge-ready.'
}|ConvertTo-Json -Depth 9|Set-Content $record -Encoding utf8
Write-Output "F112 source$commit/fork ref/all3 canonical source blobs verified;no upstream write."
