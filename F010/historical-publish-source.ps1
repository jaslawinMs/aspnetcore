$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F010-claims-allowed-values-membership'
$sources=@('src\Security\Authorization\Core\src\ClaimsAuthorizationRequirement.cs','src\Security\Authorization\test\DefaultAuthorizationServiceTests.cs')
$record=Join-Path $run 'source-branch-publication.json'
if((Test-Path $record) -or (git rev-parse HEAD).Trim()-cne$baseline -or
    (git branch --show-current).Trim()-cne$branch -or @(git diff --cached --name-only).Count -or
    (git remote get-url autoperf).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Fresh independent measured-source fork publication required.'}
$expected=@(' M src/Security/Authorization/Core/src/ClaimsAuthorizationRequirement.cs',' M src/Security/Authorization/test/DefaultAuthorizationServiceTests.cs')
if((@(git status --porcelain --untracked-files=no)-join"`n")-cne($expected-join"`n")){throw 'Only the measured owner and3 focused permanent test methods may be committed.'}
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $run 'manifest-candidate.json') -Raw|ConvertFrom-Json
if(-not$audit.auditPassed -or -not$audit.actualLiveAuditPassed -or -not$audit.performancePrJustified -or -not$audit.budgetClosed -or
    $audit.proposalDisposition-cne'qualified-draft/existing-set-cpu-tradeoff' -or $audit.pairedComparisons-ne3 -or $audit.successfulReports-ne66 -or
    $audit.originalUnitProjectRows-ne214 -or $audit.candidateUnitProjectRows-ne219 -or $audit.allocationBenefitObserved){throw 'Actual qualified compatible CPU tradeoff audit required.'}
node (Join-Path $PSScriptRoot 'F010-reproduce-analysis.mjs') $run --verify
if($LASTEXITCODE){throw 'Actual frozen source/contract/TRX/raw math consistency failed.'}
$rows=@()
for($index=0;$index-lt$sources.Count;$index++)
{
    $snapshot=if($index-eq0){'owner\ClaimsAuthorizationRequirement.cs'}else{'test\DefaultAuthorizationServiceTests.cs'}
    $hash=(Get-FileHash $sources[$index]).Hash
    if($hash-cne(Get-FileHash (Join-Path $run "sources\candidate\$snapshot")).Hash){throw 'Source differs from actually measured/tested source.'}
    $rows+=@{path=$sources[$index].Replace('\','/');rawSha256=$hash}
}
git add -- @sources
if($LASTEXITCODE){throw 'Exact2 measured source/test files staging failed.'}
if((@(git diff --cached --name-only)-join"`n")-cne(($sources|ForEach-Object {$_.Replace('\','/')})-join"`n")){throw 'Only2 intended files may be staged.'}
$numstat=@(git diff --cached --numstat)
if($numstat.Count-ne2 -or $numstat[0]-notmatch'^15\s+1\s+' -or $numstat[1]-notmatch'^57\s+0\s+'){throw 'Exact private helper +15/-1 and57 focused test lines required.'}
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if($LASTEXITCODE){throw 'Exact staged source whitespace failed.'}
git commit -q -m 'Use existing ordinal sets for claim-value membership' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Measured source commit failed.'}
$commit=(git rev-parse HEAD).Trim()
if((git rev-parse 'HEAD^').Trim()-cne$baseline -or @(git status --porcelain --untracked-files=no).Count){throw 'Exact single independent source commit required.'}
$push=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT='0'
git @push *> (Join-Path $run 'source-push.log')
$pushCode=$LASTEXITCODE
if($pushCode){throw 'Actual fork source push failed;inspect output before retrying.'}
$verify=@('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
$remote=gh @verify
if($LASTEXITCODE){throw 'Actual remote source ref unavailable.'}
$remote=$remote|ConvertFrom-Json
if($remote.object.sha-cne$commit){throw 'Actual fork source ref differs.'}
foreach($row in $rows)
{
    $blob=(git rev-parse "${commit}:$($row.path)").Trim()
    $remoteSource=gh api "repos/jaslawinMs/aspnetcore/contents/$($row.path)?ref=$commit"
    if($LASTEXITCODE){throw 'Actual remote committed source bytes unavailable.'}
    $remoteSource=$remoteSource|ConvertFrom-Json
    $canonical=[Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($row.path.Replace('/','\'))).Replace("`r`n","`n"))
    if($remoteSource.sha-cne$blob -or -not[System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remoteSource.content))){throw 'Actual remote canonical source bytes differ.'}
    $row.canonicalGitBlob=$blob;$row.actualRemoteSourceBlob=$remoteSource.sha;$row.actualRemoteCanonicalBytesVerified=$true
}
[ordered]@{
    candidate='F010';branch=$branch;commit=$commit;parent=$baseline;sourceChanged=$true;trackedFilesChanged=2;additions=72;deletions=1
    sources=$rows;actualRemoteRef=$remote;actualRemoteCanonicalBytesVerified=$true;pushArguments=$push;pushExitCode=$pushCode
    verificationArguments=$verify;verificationExitCode=0;measuredBuildBaselineRevision=$baseline;measuredOwnerTargets=$manifest.ownerTargets
    measuredBinaryNotRelabeledAsBuiltFromLaterCommit=$true;pairedComparisons=3;completedProfiles=6;benchmarkReports=66;comparisonBudgetClosed=$true
    publicApiDefaultDependencyTargetFrameworkVisibilityChanged=$false;performancePrCreated=$false
    note='One private membership seam and3methods/5rows. Qualified existing-large-known-comparer-set CPU proposal,not merge-ready/default-app/allocation benefit. Small/default/no-value/early regressions and substantial noneligible fallback movement retained without causal attribution. Frozen owners built from baseline plus exact source before this commit;all three TFM checks and actual package-validation task pass. Fork-only.'
}|ConvertTo-Json -Depth 12|Set-Content $record -Encoding utf8
Copy-Item $PSCommandPath (Join-Path $run 'executed-source-publication.ps1')
Write-Output "F010 measured source$commit/fork ref and both canonical source bytes verified;2files,+72/-1,no upstream PR."
