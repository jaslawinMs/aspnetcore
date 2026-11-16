$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F111-stored-data-buffer'
$record=Join-Path $run 'source-branch-publication.json'
$sources=@(
    'src\Components\Endpoints\src\Microsoft.AspNetCore.Components.Endpoints.csproj',
    'src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs',
    'src\Components\Endpoints\test\TempData\JsonStoredDataSerializerTest.cs'
)
if (Test-Path $record) { throw 'Retain the actual independent source publication receipt.' }
if ((git rev-parse HEAD).Trim() -cne $baseline -or (git branch --show-current).Trim() -cne $branch -or
    @(git diff --cached --name-only).Count)
{
    throw 'Only the independent unstaged F111 baseline-plus-measured seam may be published.'
}
$changed=@(git diff --name-only)
if ($changed.Count -ne 3 -or (Compare-Object @($changed|Sort-Object) @($sources.Replace('\','/')|Sort-Object)))
{
    throw 'Only the exact selected owner/project/existing-test three-file change is permitted.'
}
$manifest=Get-Content (Join-Path $run 'candidate2-manifest.json') -Raw|ConvertFrom-Json
foreach ($source in $manifest.sourceFiles)
{
    if ((Get-FileHash $source.file).Hash -cne $source.sha256) { throw 'A selected frozen shipping source differs.' }
}
if ((Get-FileHash $sources[2]).Hash -cne
    (Get-FileHash (Join-Path $run 'tests\candidate2\source\JsonStoredDataSerializerTest.cs')).Hash)
{
    throw 'Only the exact twelve-row green test source may be published.'
}
node (Join-Path $PSScriptRoot 'F111-reproduce-analysis.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Exact closed-budget all-row evidence audit must pass.' }
git add -- @sources
if ($LASTEXITCODE) { throw 'Precise owner/project/test staging failed.' }
$staged=@(git diff --cached --name-only)
if ($staged.Count -ne 3 -or (Compare-Object @($staged|Sort-Object) @($sources.Replace('\','/')|Sort-Object)))
{
    throw 'Only the three exact selected files may be staged.'
}
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE) { throw 'Selected source/test staged whitespace failed.' }
git --no-pager diff --cached --binary|Set-Content (Join-Path $run 'selected-source.diff') -Encoding utf8
git commit -q -m 'Pool temporary buffers when serializing stored component data' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE) { throw 'Measured independent F111 source commit failed.' }
$commit=(git rev-parse HEAD).Trim()
if ((git rev-parse 'HEAD^').Trim() -cne $baseline -or @(git status --porcelain --untracked-files=no).Count)
{
    throw 'The independent baseline-plus-three-file source commit must leave tracked source clean.'
}
$push=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT='0'
git @push *> (Join-Path $run 'source-push.log')
$pushCode=$LASTEXITCODE
if ($pushCode) { throw 'Actual fork-only source push failed;do not create a draft.' }
$verify=@('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
$remoteText=gh @verify
$verifyCode=$LASTEXITCODE
if ($verifyCode) { throw 'Actual remote fork source ref retrieval failed.' }
$remote=$remoteText|ConvertFrom-Json
if ($remote.object.sha -cne $commit) { throw 'Actual fork source ref differs.' }
$rows=@(foreach ($relative in $sources)
{
    $gitPath=$relative.Replace('\','/')
    $blob=(git rev-parse "${commit}:$gitPath").Trim()
    $remoteFile=gh api "repos/jaslawinMs/aspnetcore/contents/$($gitPath)?ref=$commit"
    if ($LASTEXITCODE) { throw 'Actual remote owner/project/test content unavailable.' }
    $remoteFile=$remoteFile|ConvertFrom-Json
    $canonical=[Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($relative)).Replace("`r`n","`n"))
    if ($remoteFile.sha -cne $blob -or
        -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remoteFile.content)))
    {
        throw 'Actual remote canonical owner/project/test bytes differ.'
    }
    [pscustomobject]@{
        source=$relative;rawSha256=(Get-FileHash $relative).Hash;canonicalGitBlob=$blob
        actualRemoteGitBlob=$remoteFile.sha;actualRemoteCanonicalBytesVerified=$true
    }
})
[ordered]@{
    candidate='F111';branch=$branch;commit=$commit;parent=$baseline;sourceChanged=$true;trackedFilesChanged=3
    shippingSourceFilesChanged=1;projectSharedCompileIncludesAdded=1;existingTestClassFilesChanged=1;sources=$rows
    actualRemoteRef=$remote;actualRemoteCanonicalBytesVerified=$true;pushArguments=$push;pushExitCode=$pushCode
    verificationArguments=$verify;verificationExitCode=$verifyCode
    measuredBuildBaselineRevision=$manifest.baseline;measuredFinalOwnerSha256=$manifest.ownerSha256
    measuredHarnessSha256=$manifest.harnessSha256;measuredBinaryNotRelabeledAsBuiltFromLaterCommit=$true
    sourceComparisons=3;comparisonBudgetClosed=$true;publicApiDefaultDependencyTargetFrameworkVisibilityChanged=$false
    f112SerializeValueUnchanged=$true;temporarySampleChangesCommitted=$false
    note='Exact selected candidate2 source/project and12-row green existing tests committed after168-outcome audit. Frozen images were built from37e809e plus recorded source before this later commit. Fork-only conditional warmed-pool component draft;retained heap/cold-pool costs remain unmeasured,not merge-ready.'
}|ConvertTo-Json -Depth 9|Set-Content $record -Encoding utf8
Write-Output "F111 source$commit/fork ref and all3 exact canonical source blobs verified;no upstream write."
