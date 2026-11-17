$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F014'
$record = Join-Path $run 'source-branch-publication.json'
if (Test-Path $record)
{
    throw 'Preserve actual verified source-branch publication.'
}
$audit = Get-Content (Join-Path $run 'measurement-audit.json') -Raw | ConvertFrom-Json
$investigation = Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json
if (-not $audit.auditPassed -or -not $audit.actualLiveAuditPassed -or $audit.performancePrJustified -or
    $audit.pairedComparisons -ne 0 -or -not $audit.budgetClosed -or $audit.proposalDisposition -cne 'rejected/design-blocked' -or
    (git branch --show-current).Trim() -cne $investigation.branch -or (git rev-parse HEAD).Trim() -cne $investigation.baseline -or
    @(git diff --name-only).Count -or @(git diff --cached --name-only).Count)
{
    throw 'Audited rejected proposal and unchanged independent baseline branch required.'
}
if ((git remote get-url autoperf).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'Only user-fork writes permitted.'
}
$before = @(git ls-remote --heads autoperf "refs/heads/$($investigation.branch)")
if ($LASTEXITCODE -or $before.Count)
{
    throw 'Fresh independent fork branch required; do not overwrite existing work.'
}
$push = @('-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', 'autoperf',
    "$($investigation.baseline):refs/heads/$($investigation.branch)")
$env:GIT_TERMINAL_PROMPT = '0'
& git @push
if ($LASTEXITCODE)
{
    throw 'Independent source branch push failed.'
}
$ref = gh api "repos/jaslawinMs/aspnetcore/git/ref/heads/$($investigation.branch)"
if ($LASTEXITCODE)
{
    throw 'Actual fork source ref lookup failed.'
}
$actualRef = $ref | ConvertFrom-Json
if ($actualRef.object.sha -cne $investigation.baseline)
{
    throw 'Actual source ref differs from the measured baseline.'
}
$owner = 'src/SignalR/server/Core/src/DefaultHubLifetimeManager.cs'
$blob = (git rev-parse "$($investigation.baseline):$owner").Trim()
if ($LASTEXITCODE)
{
    throw 'Actual baseline owner blob required.'
}
$encoded = [Uri]::EscapeDataString($investigation.branch)
$content = gh api "repos/jaslawinMs/aspnetcore/contents/$($owner)?ref=$encoded"
if ($LASTEXITCODE)
{
    throw 'Actual fork owner bytes lookup failed.'
}
$actual = $content | ConvertFrom-Json
$bytes = [Convert]::FromBase64String($actual.content)
$hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
$expected = (Get-FileHash (Join-Path $run 'baseline-canonical\src\SignalR\server\Core\src\DefaultHubLifetimeManager.cs')).Hash
if ($actual.sha -cne $blob -or $hash -cne $expected)
{
    throw 'Actual remote owner bytes differ from the selected baseline capture.'
}
[ordered]@{
    candidate = 'F014'; branch = $investigation.branch; commit = $investigation.baseline
    sourceChanged = $false; newSourceCommitCreated = $false; performancePrCreated = $false
    branchPreviouslyAbsent = $true; actualRemoteRef = $actualRef; actualRemoteCanonicalBytesVerified = $true
    actualRemoteSourceBlob = $actual.sha; sourceCanonicalSha256 = $hash
    url = "https://github.com/jaslawinMs/aspnetcore/tree/$($investigation.branch)"
    qualification = 'Unchanged independent baseline branch, not a performance fix. Unvalidated user-ID snapshot is design-blocked; original-only diagnostics, not comparative no-gain.'
    pushArguments = $push; actualPushExitCode = 0; createdUtc = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 9 | Set-Content $record
Write-Output 'F014 actual fork source ref and owner bytes verified; unchanged independent baseline, no source commit or performance PR.'
