$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F102'
$branch = 'autoperf/F102-js-runtime-property-write-timeouts'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
if ((git -C $repo branch --show-current).Trim() -cne $branch -or (git -C $repo rev-parse HEAD).Trim() -cne $baseline)
{
    throw 'Actual F102 independent unchanged branch required.'
}
git -C $repo --no-pager diff --check
$check = $LASTEXITCODE
git -C $repo diff --quiet HEAD --
$diff = $LASTEXITCODE
if ($check -or $diff) { throw 'Unexpected tracked F102 source changes/whitespace.' }
$started = [DateTimeOffset]::UtcNow.ToString('o')
$pushArguments = @('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT='0'
git -C $repo @pushArguments *> (Join-Path $run 'source-branch-push.log')
$push = $LASTEXITCODE
if ($push) { throw 'Actual F102 source branch push failed.' }
$verificationArguments = @('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
gh @verificationArguments > (Join-Path $run 'actual-source-branch-ref.json')
$verified = $LASTEXITCODE
if ($verified) { throw 'Actual F102 fork ref retrieval failed.' }
$remote = Get-Content (Join-Path $run 'actual-source-branch-ref.json') -Raw | ConvertFrom-Json
if ($remote.object.sha -cne $baseline) { throw 'Actual F102 fork source ref differs.' }
[ordered]@{candidate='F102';branch=$branch;commit=$baseline;baseline=$baseline;sourceChanged=$false;
    independentOptimizationCommit=$false;sourceDiffCheckExit=$check;sourceTrackedDiffExit=$diff;
    pushArguments=$pushArguments;pushExitCode=$push;verificationArguments=$verificationArguments;
    verificationExitCode=$verified;actualRemoteRef=$remote;startedAt=$started;verifiedAt=[DateTimeOffset]::UtcNow.ToString('o')} |
    ConvertTo-Json -Depth 9 | Set-Content (Join-Path $run 'source-branch-publication.json')
Write-Output 'F102 independent fork source branch unchanged37e809/actual remote ref verified;no optimization commit or PR.'
