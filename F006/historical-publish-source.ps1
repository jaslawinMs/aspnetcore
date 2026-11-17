$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F006'
$record=Join-Path $run 'source-branch-publication.json'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F006-for-variable-symbol-membership'
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$restored=Get-Content (Join-Path $run 'source-restoration.json') -Raw|ConvertFrom-Json
if((Test-Path $record) -or (git branch --show-current).Trim()-cne$branch -or
    (git rev-parse HEAD).Trim()-cne$baseline -or @(git diff --name-only).Count -or @(git diff --cached --name-only).Count -or
    -not$audit.actualLiveAuditPassed -or $audit.performancePrJustified -or $audit.sourceComparisons-ne3 -or
    -not$restored.sourceByteExact -or -not$restored.restoredOwnerDllAndPdbByteExact){throw 'Exact audited no-gain/restored independent original source required.'}
if((git remote get-url autoperf).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user-fork writes permitted.'}
$arguments=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',"HEAD:refs/heads/$branch")
$env:GIT_TERMINAL_PROMPT='0'
git @arguments *> (Join-Path $run 'source-push.log')
$code=$LASTEXITCODE
if($code){throw 'Actual unchanged-baseline independent fork branch push failed.'}
$reference=git ls-remote --heads autoperf "refs/heads/$branch"
if($LASTEXITCODE -or $reference-cnotmatch"^$baseline\s+refs/heads/$branch$"){throw 'Actual fork branch does not retain original baseline.'}
$file='src/Components/Analyzers/src/ForLoopIteratorInClosureAnalyzer.cs'
$response=gh api "repos/jaslawinMs/aspnetcore/contents/$($file)?ref=$branch"
if($LASTEXITCODE){throw 'Actual remote original source unavailable.'}
$data=$response|ConvertFrom-Json
$bytes=[Convert]::FromBase64String($data.content)
$source=Join-Path $run 'producer-source\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
if([Text.Encoding]::UTF8.GetString($bytes).Replace("`r`n","`n")-cne[IO.File]::ReadAllText($source).Replace("`r`n","`n")){throw 'Actual canonical remote original source differs.'}
[ordered]@{candidate='F006';branch=$branch;commit=$baseline;baseline=$baseline;sourceChanged=$false;newSourceCommitCreated=$false;
    trackedSourceFilesChanged=0;actualRemoteRefVerified=$true;actualRemoteCanonicalSourceVerified=$true;actualPushExitCode=$code;pushArguments=$arguments;
    measuredOriginalSourceSha256=(Get-FileHash $source).Hash;candidatePatchSha256=(Get-FileHash (Join-Path $run 'candidate.patch')).Hash;
    sourceComparisons=3;exactHarnessControlledComparisons=3;performancePrCreated=$false;performancePrJustified=$false;completedAt=[DateTimeOffset]::UtcNow.ToString('o');
    note='Independent fork branch retains original baseline after one five-statement candidate was actually built,tested,measured and restored. Patch,harness,all local wins and contrary results are archived separately;no speculative or empty PR.'}|
    ConvertTo-Json -Depth 8|Set-Content $record
Write-Output 'F006 independent unchanged-baseline fork ref and actual canonical source verified;candidate evidence retained,3/3 comparisons,no shipping change/source commit/PR.'
