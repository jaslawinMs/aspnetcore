$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
Set-Location 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F016'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch = 'autoperf/F016-managed-decryption-capacity'
$record = Join-Path $run 'source-branch-publication.json'
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$bootstrap = Get-Content (Join-Path $run 'bootstrap.json') -Raw | ConvertFrom-Json
$actualStatus = @(git status --porcelain)
if ((Test-Path $record) -or -not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or $audit.performancePrJustified -or
    $audit.proposalDisposition -cne 'no-gain-or-inconclusive' -or -not $audit.budgetClosed -or $audit.successfulReports -ne 126 -or
    (git rev-parse HEAD).Trim() -cne $baseline -or (git branch --show-current).Trim() -cne $branch -or
    @(git status --porcelain --untracked-files=no).Count -or ($actualStatus -join "`n") -cne ($bootstrap.statusAfter -join "`n") -or
    (git remote get-url autoperf).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'The actual no-gain audit and restored unchanged independent source branch are required.'
}
$patch = Join-Path $run 'candidate.patch'
git apply --check $patch
if ($LASTEXITCODE)
{
    throw 'The retained measured candidate patch no longer applies to the actual original source.'
}
$prior = @(git ls-remote --heads autoperf "refs/heads/$branch")
if ($LASTEXITCODE -or $prior.Count)
{
    throw 'Do not replace an already published branch.'
}
$env:GIT_TERMINAL_PROMPT = '0'
$push = @('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
git @push *> (Join-Path $run 'source-push.log')
if ($LASTEXITCODE)
{
    throw 'Actual fork-only original-source branch push failed.'
}
$remote = gh api "repos/jaslawinMs/aspnetcore/git/ref/heads/$branch" | ConvertFrom-Json
if ($LASTEXITCODE -or $remote.object.sha -cne $baseline)
{
    throw 'Actual remote no-gain source ref differs.'
}
$rows = @()
foreach ($source in @(
    'src\DataProtection\DataProtection\src\Managed\ManagedAuthenticatedEncryptor.cs',
    'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Managed\ManagedAuthenticatedEncryptorTests.cs'))
{
    $relative = $source.Replace('\','/')
    $blob = (git rev-parse "${baseline}:$relative").Trim()
    $actual = gh api "repos/jaslawinMs/aspnetcore/contents/${relative}?ref=$baseline" | ConvertFrom-Json
    if ($LASTEXITCODE)
    {
        throw 'Actual remote original source unavailable.'
    }
    $canonical = [Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($source)).Replace("`r`n","`n"))
    if ($actual.sha -cne $blob -or -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($actual.content)))
    {
        throw 'Actual remote original canonical source differs from the restored local source.'
    }
    $rows += [ordered]@{ path = $relative; canonicalGitBlob = $blob; rawSha256 = (Get-FileHash $source).Hash; actualRemoteCanonicalBytesVerified = $true }
}
[ordered]@{
    candidate = 'F016'; branch = $branch; commit = $baseline; parent = $baseline
    trackedFilesChanged = 0; newSourceCommitCreated = $false; sourceChanged = $false; sources = $rows
    actualRemoteRef = $remote; actualRemoteCanonicalBytesVerified = $true; pushArguments = $push; pushExitCode = 0
    proposalDisposition = $audit.proposalDisposition; performancePrJustified = $false; performancePrCreated = $false
    candidatePatch = 'candidate.patch'; candidatePatchSha256 = (Get-FileHash $patch).Hash
    retainedMeasuredPatchFiles = 2; retainedMeasuredPatchAdditions = 37; retainedMeasuredPatchDeletions = 1
    originalSourceRestoredOnlyOwnedEdits = $true; allFourUnrelatedUntrackedReportsPreserved = $true
    actualRestoredSourceStatus = $actualStatus
    actualProductTargets = @('net462','netstandard2.0','net12.0'); actualOwningTestTargets = @('net12.0','net472')
    pairedComparisons = 3; completedProfiles = 6; benchmarkReports = 126; comparisonBudgetClosed = $true
    note = 'Real partial-block allocation benefits are retained,but the combined allocation/aggregate-latency gate failed. No source fix or optimization PR is recommended. Both measured owner snapshots,new passing preservation tests and exact applicable patch remain in the runnable evidence capsule. The independent source branch stays at the unchanged baseline;no restored-artifact test execution is claimed.'
} | ConvertTo-Json -Depth 12 | Set-Content $record -Encoding utf8NoBOM
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $run 'executed-source-closure.ps1')
Write-Output 'F016 unchanged source branch pushed;both actual remote canonical source blobs verified;candidate patch preserved,no new source commit or PR.'
