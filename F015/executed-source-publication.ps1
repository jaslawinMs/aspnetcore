$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F015'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch = 'autoperf/F015-managed-encryption-capacity'
$record = Join-Path $run 'source-branch-publication.json'
$sources = @(
    'src\DataProtection\DataProtection\src\Managed\ManagedAuthenticatedEncryptor.cs',
    'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Managed\ManagedAuthenticatedEncryptorTests.cs'
)
if ((Test-Path $record) -or (git rev-parse HEAD).Trim() -cne $baseline -or
    (git branch --show-current).Trim() -cne $branch -or @(git diff --cached --name-only).Count -or
    (git remote get-url autoperf).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'Independent measured source and exact fork remote required.'
}
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$package = Get-Content (Join-Path $run 'package-payload-recheck.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or -not $audit.performancePrJustified -or
    -not $audit.budgetClosed -or $audit.successfulReports -ne 84 -or $audit.originalOwningTestRows -ne 62 -or
    $audit.candidateOwningTestRows -ne 62 -or -not $audit.actualEnabledPackageValidationPassed -or
    -not $package.actualAllThreePackedOwnersMatchFrozenProducts)
{
    throw 'Complete faithful source/native/raw-statistical/test/package audit required.'
}
$expected = @($sources | ForEach-Object { ' M ' + $_.Replace('\', '/') })
if ((@(git status --porcelain --untracked-files=no) -join "`n") -cne ($expected -join "`n"))
{
    throw 'Only the measured legacy capacity seam and focused preservation Theory may be committed.'
}
node (Join-Path $PSScriptRoot 'F015-audit.mjs') $run --verify
if ($LASTEXITCODE)
{
    throw 'Actual portable source/native/TRX/raw accounting verification failed.'
}
$rows = @()
for ($index = 0; $index -lt $sources.Count; $index++)
{
    $snapshot = if ($index -eq 0) { 'owner\ManagedAuthenticatedEncryptor.cs' } else { 'test\ManagedAuthenticatedEncryptorTests.cs' }
    $hash = (Get-FileHash $sources[$index]).Hash
    if ($hash -cne (Get-FileHash (Join-Path $run "framework-contexts\candidate\sources\$snapshot")).Hash)
    {
        throw 'Current source differs from the actually tested and measured candidate.'
    }
    $rows += @{ path = $sources[$index].Replace('\', '/'); rawSha256 = $hash }
}
$prior = @(git ls-remote --heads autoperf "refs/heads/$branch")
if ($LASTEXITCODE -or $prior.Count)
{
    throw 'Refuse to replace an already published source branch.'
}
git add -- @sources
if ($LASTEXITCODE)
{
    throw 'Exact measured source staging failed.'
}
$numstat = @(git diff --cached --numstat)
if ($numstat.Count -ne 2 -or $numstat[0] -notmatch '^3\s+1\s+' -or $numstat[1] -notmatch '^33\s+0\s+')
{
    throw 'Only3 capacity lines replacing1 and33 preservation-test lines are permitted.'
}
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if ($LASTEXITCODE)
{
    throw 'Exact staged source whitespace failed.'
}
git commit -q -m 'Pre-size the legacy managed encryption payload stream' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE)
{
    throw 'Actual measured source commit failed.'
}
$commit = (git rev-parse HEAD).Trim()
if ((git rev-parse 'HEAD^').Trim() -cne $baseline -or @(git status --porcelain --untracked-files=no).Count)
{
    throw 'Exact independent one-commit source branch required.'
}
$push = @('-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', 'autoperf', $branch)
$env:GIT_TERMINAL_PROMPT = '0'
git @push *> (Join-Path $run 'source-push.log')
$pushCode = $LASTEXITCODE
if ($pushCode)
{
    throw 'Fork source push failed; retain output before retrying.'
}
$remote = gh api "repos/jaslawinMs/aspnetcore/git/ref/heads/$branch" | ConvertFrom-Json
if ($LASTEXITCODE -or $remote.object.sha -cne $commit)
{
    throw 'Actual fork source ref differs.'
}
foreach ($row in $rows)
{
    $blob = (git rev-parse "${commit}:$($row.path)").Trim()
    $remoteSource = gh api "repos/jaslawinMs/aspnetcore/contents/$($row.path)?ref=$commit" | ConvertFrom-Json
    if ($LASTEXITCODE)
    {
        throw 'Actual remote source blob unavailable.'
    }
    $canonical = [Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString(
        [IO.File]::ReadAllBytes($row.path.Replace('/', '\'))).Replace("`r`n", "`n"))
    if ($remoteSource.sha -cne $blob -or -not [System.Linq.Enumerable]::SequenceEqual(
        [byte[]] $canonical, [Convert]::FromBase64String($remoteSource.content)))
    {
        throw 'Actual remote canonical source bytes differ.'
    }
    $row.canonicalGitBlob = $blob
    $row.actualRemoteCanonicalBytesVerified = $true
}
[ordered]@{
    candidate = 'F015'; branch = $branch; commit = $commit; parent = $baseline
    trackedFilesChanged = 2; additions = 36; deletions = 1; sources = $rows
    actualRemoteRef = $remote; actualRemoteCanonicalBytesVerified = $true; pushArguments = $push; pushExitCode = $pushCode
    actualProductTargets = @('net462', 'netstandard2.0', 'net12.0'); actualOwningTestTargets = @('net12.0', 'net472')
    actualMeasuredHostTarget = 'net472'; actualMeasuredProductTarget = 'net462'
    pairedComparisons = 3; completedProfiles = 6; benchmarkReports = 84; comparisonBudgetClosed = $true
    measuredBuildBaselineRevision = $baseline; measuredBinaryNotRelabeledAsBuiltFromLaterCommit = $true
    publicApiDefaultDependencyTargetFrameworkVisibilityChanged = $false
    proposalDisposition = $audit.proposalDisposition
    note = 'Legacy-only initial MemoryStream capacity; modern NET and F016 Decrypt untouched. All small/adverse timings retained. Frozen products were built from baseline plus exact source before this source commit. Only the fork receives this branch.'
} | ConvertTo-Json -Depth 12 | Set-Content $record -Encoding utf8NoBOM
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $run 'executed-source-publication.ps1')
Write-Output "F015 source $commit pushed and both canonical source blobs verified;2files,+36/-1."
