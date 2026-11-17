$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$record=Join-Path $run 'source-branch-publication.json'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F001-webtransport-session-disposal'
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if((Test-Path $record) -or (git branch --show-current).Trim() -cne $branch -or
    (git rev-parse HEAD).Trim() -cne $baseline -or @(git diff --name-only).Count -or @(git diff --cached --name-only).Count -or
    $audit.disposition -cne 'rejected' -or $audit.sourceComparisons -ne 0 -or $audit.performancePrJustified){throw 'Exact rejected,unchanged independent source and completed audit required.'}
if((git remote get-url autoperf).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user fork source refs permitted.'}
$arguments=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',"HEAD:refs/heads/$branch")
$env:GIT_TERMINAL_PROMPT='0'
$start=[DateTimeOffset]::UtcNow.ToString('o')
git @arguments *> (Join-Path $run 'source-push.log');$code=$LASTEXITCODE
if($code){throw 'Actual independent baseline branch push failed.'}
$reference=git ls-remote --heads autoperf "refs/heads/$branch"
if($LASTEXITCODE -or $reference -cnotmatch "^$baseline\s+refs/heads/$branch$"){throw 'Actual fork ref differs from unchanged baseline.'}
$file='src/Servers/Kestrel/Core/src/Internal/WebTransport/WebTransportSession.cs'
$response=gh api "repos/jaslawinMs/aspnetcore/contents/$($file)?ref=$branch"
if($LASTEXITCODE){throw 'Actual remote source content unavailable.'}
$actual=$response|ConvertFrom-Json
$remoteBytes=[Convert]::FromBase64String($actual.content)
$source=Join-Path $run 'producer-source\src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportSession.cs'
$remoteText=[Text.Encoding]::UTF8.GetString($remoteBytes).Replace("`r`n","`n")
$expectedText=[IO.File]::ReadAllText($source).Replace("`r`n","`n")
if($remoteText -cne $expectedText){throw 'Remote baseline source differs beyond CRLF canonicalization.'}
[ordered]@{
    candidate='F001';branch=$branch;commit=$baseline;baseline=$baseline;sourceChanged=$false;newSourceCommitCreated=$false
    trackedSourceFilesChanged=0;actualRemoteRefVerified=$true;actualRemoteCanonicalSourceVerified=$true
    measuredSessionSourceSha256=(Get-FileHash $source).Hash;pushArguments=$arguments;actualPushExitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    performancePrCreated=$false;performancePrJustified=$false;note='Separate fork branch deliberately points to unchanged campaign baseline. Rejected/unestablished proposal,no empty performance PR or fabricated optimization commit.'
}|ConvertTo-Json -Depth 9|Set-Content $record -Encoding utf8
Write-Output 'F001 independent unchanged-baseline fork ref and actual canonical source verified;no shipping change or PR.'
