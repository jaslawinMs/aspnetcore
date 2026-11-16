$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F109-token-base64-preflight'
$record=Join-Path $run 'source-branch-publication.json'
$source='src\Identity\Core\src\DataProtectorTokenProvider.cs'
$test='src\Identity\test\Identity.Test\DataProtectorTokenProviderTest.cs'
if (Test-Path $record) { throw 'Retain the actual independent source publication receipt.' }
if ((git rev-parse HEAD).Trim() -cne $baseline -or (git branch --show-current).Trim() -cne $branch -or
    @(git diff --cached --name-only).Count -or
    @(git status --porcelain --untracked-files=no).Count -ne 1 -or
    @(git status --porcelain --untracked-files=no)[0] -cne ' M src/Identity/Core/src/DataProtectorTokenProvider.cs')
{
    throw 'Only the measured independent baseline-plus-provider seam may be tracked before staging.'
}
$manifest=Get-Content (Join-Path $run 'candidate2-manifest.json') -Raw|ConvertFrom-Json
if ((Get-FileHash $source).Hash -cne $manifest.sourceSha256 -or
    (Get-FileHash $test).Hash -cne (Get-FileHash (Join-Path $run 'tests\candidate2-green\source\DataProtectorTokenProviderTest.cs')).Hash)
{
    throw 'Only exact measured selected source/ten-row green test bytes may be published.'
}
node (Join-Path $PSScriptRoot 'F109-reproduce-analysis.mjs') $run --verify
if ($LASTEXITCODE) { throw 'The exact source/input/producer/control/arithmetic audit must pass.' }
git add -- $source $test
if ($LASTEXITCODE) { throw 'Precise provider/test staging failed.' }
$staged=@(git diff --cached --name-only)
if ($staged.Count -ne 2 -or (Compare-Object @($staged|Sort-Object) @($source.Replace('\','/'),$test.Replace('\','/')|Sort-Object)))
{
    throw 'Only the one provider/eight inserted lines and its new focused test class may be staged.'
}
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE) { throw 'Exact source/test staged whitespace failed.' }
git commit -q -m 'Avoid decoder exceptions for malformed Identity tokens without whitespace' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE) { throw 'Exact measured provider/test source commit failed.' }
$commit=(git rev-parse HEAD).Trim()
if ((git rev-parse 'HEAD^').Trim() -cne $baseline -or @(git status --porcelain --untracked-files=no).Count)
{
    throw 'The independent baseline-plus-two-file commit must leave tracked source clean.'
}
$push=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT='0'
git @push *> (Join-Path $run 'source-push.log')
$pushCode=$LASTEXITCODE
if ($pushCode) { throw 'Actual fork-only source push failed;do not create a draft.' }
$verify=@('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
$remoteText=gh @verify
$verifyCode=$LASTEXITCODE
if ($verifyCode) { throw 'Actual fork source ref retrieval failed.' }
$remote=$remoteText|ConvertFrom-Json
if ($remote.object.sha -cne $commit) { throw 'Actual remote fork source ref differs.' }
$rows=@(foreach ($relative in $source,$test)
{
    $gitPath=$relative.Replace('\','/')
    $blob=(git rev-parse "${commit}:$gitPath").Trim()
    $remoteFile=gh api "repos/jaslawinMs/aspnetcore/contents/$($gitPath)?ref=$commit"
    if ($LASTEXITCODE) { throw 'Actual remote provider/test content unavailable.' }
    $remoteFile=$remoteFile|ConvertFrom-Json
    $canonical=[Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($relative)).Replace("`r`n","`n"))
    if ($remoteFile.sha -cne $blob -or
        -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remoteFile.content)))
    {
        throw 'Actual remote canonical provider/test bytes differ.'
    }
    [pscustomobject]@{source=$relative;rawSha256=(Get-FileHash $relative).Hash;canonicalGitBlob=$blob;actualRemoteGitBlob=$remoteFile.sha;actualRemoteCanonicalBytesVerified=$true}
})
[ordered]@{
    candidate='F109';branch=$branch;commit=$commit;parent=$baseline;sourceChanged=$true;trackedFilesChanged=2
    shippingSourceFilesChanged=1;newTestClassFiles=1;sources=$rows;actualRemoteRef=$remote
    actualRemoteCanonicalBytesVerified=$true;pushArguments=$push;pushExitCode=$pushCode
    verificationArguments=$verify;verificationExitCode=$verifyCode
    measuredBuildBaselineRevision=$manifest.baselineSourceRevision;measuredFinalOwnerSha256=$manifest.actualOwners[0].sha256
    measuredHarnessSha256=$manifest.harnessSha256;measuredBinaryNotRelabeledAsBuiltFromLaterCommit=$true
    sourceComparisons=3;comparisonBudgetClosed=$true;publicApiDefaultDependencyTargetFrameworkVisibilityChanged=$false
    note='Exact selected candidate2 source and10-row final owning tests committed after198-outcome real-pipeline audit. Frozen binaries were built from37e809e plus recorded source before this later commit. Fork-only conditional component proposal,not merge-ready or a universal/application gain.'
}|ConvertTo-Json -Depth 9|Set-Content $record -Encoding utf8
Write-Output "F109 actual measured source$commit/fork ref and both canonical source blobs verified;no upstream write."
