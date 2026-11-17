$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F008'
$record=Join-Path $run 'source-branch-publication.json'
if(Test-Path $record){throw 'Preserve actual verified source-branch publication.'}
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$investigation=Get-Content (Join-Path $run 'current-source-investigation.json') -Raw|ConvertFrom-Json
if(-not$audit.auditPassed -or -not$audit.actualLiveAuditPassed -or $audit.performancePrJustified -or
    $audit.pairedComparisons-ne0 -or -not$audit.budgetClosed -or $audit.proposalDisposition-cne'rejected/design-blocked' -or
    (git branch --show-current).Trim()-cne$investigation.branch -or (git rev-parse HEAD).Trim()-cne$investigation.baseline -or
    @(git diff --name-only).Count -or @(git diff --cached --name-only).Count){throw 'Actual rejected proposal/evidence and unchanged baseline branch required.'}
if((git remote get-url autoperf).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user-fork writes permitted.'}
$remoteBefore=@(git ls-remote --heads autoperf "refs/heads/$($investigation.branch)")
if($LASTEXITCODE -or $remoteBefore.Count){throw 'Expected fresh independent fork branch;do not overwrite existing work.'}
$pushArguments=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',
    "$($investigation.baseline):refs/heads/$($investigation.branch)")
$env:GIT_TERMINAL_PROMPT='0'
& git @pushArguments
if($LASTEXITCODE){throw 'Independent baseline source branch push failed.'}
$remote=gh api "repos/jaslawinMs/aspnetcore/git/ref/heads/$($investigation.branch)"
if($LASTEXITCODE){throw 'Actual source ref lookup failed.'}
$ref=$remote|ConvertFrom-Json
if($ref.object.sha-cne$investigation.baseline){throw 'Actual fork source branch differs from unmodified measured baseline.'}
$owner='src/Middleware/Localization/src/RequestLocalizationMiddleware.cs'
$blob=(git rev-parse "$($investigation.baseline):$owner").Trim()
if($LASTEXITCODE){throw 'Exact source tree blob required.'}
$encoded=[Uri]::EscapeDataString($investigation.branch)
$content=gh api "repos/jaslawinMs/aspnetcore/contents/$($owner)?ref=$encoded"
if($LASTEXITCODE){throw 'Actual source blob lookup failed.'}
$actual=$content|ConvertFrom-Json
$bytes=[Convert]::FromBase64String($actual.content)
$canonicalSha=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
$expected=Get-FileHash (Join-Path $run 'baseline-canonical\src\Middleware\Localization\src\RequestLocalizationMiddleware.cs')
if($actual.sha-cne$blob -or $canonicalSha-cne$expected.Hash){throw 'Actual remote original owner bytes differ from selected baseline capture.'}
[ordered]@{candidate='F008';branch=$investigation.branch;commit=$investigation.baseline;sourceChanged=$false;newSourceCommitCreated=$false;
    performancePrCreated=$false;branchPreviouslyAbsent=$true;actualRemoteRef=$ref;actualRemoteCanonicalBytesVerified=$true;
    actualRemoteSourceBlob=$actual.sha;sourceCanonicalSha256=$canonicalSha;
    url="https://github.com/jaslawinMs/aspnetcore/tree/$($investigation.branch)";
    qualification='Unchanged independent baseline branch,not a proposed performance fix. Actual startup-index proposal is design-blocked;original-only diagnostics,not comparative no-gain.';
    pushArguments=$pushArguments;actualPushExitCode=0;createdUtc=[DateTimeOffset]::UtcNow.ToString('o')}|
    ConvertTo-Json -Depth 9|Set-Content $record
Write-Output "F008 actual fork branch verified at unchanged$($investigation.baseline);original owner remote blob verified,no source commit or PR created."
