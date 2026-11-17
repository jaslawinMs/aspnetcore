$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F007'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F007-root-operation-id-membership'
$source='src\Components\Server\src\Circuits\ServerComponentDeserializer.cs'
$record=Join-Path $run 'source-branch-publication.json'
if((Test-Path $record) -or (git rev-parse HEAD).Trim()-cne$baseline -or
    (git branch --show-current).Trim()-cne$branch -or @(git diff --cached --name-only).Count -or
    (git remote get-url autoperf).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Fresh independent baseline-plus-measured-source fork publication required.'}
$tracked=@(git status --porcelain --untracked-files=no)
if($tracked.Count-ne1 -or $tracked[0]-cne' M src/Components/Server/src/Circuits/ServerComponentDeserializer.cs'){throw 'Only the measured F007 owner may be committed.'}
$patch=Get-Content (Join-Path $run 'source-patch-metadata.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $run 'manifest-candidate-1.json') -Raw|ConvertFrom-Json
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if((Get-FileHash $source).Hash-cne$patch.candidateSourceSha256 -or $audit.disposition-cne'validated' -or
    -not$audit.actualLiveAuditPassed -or -not$audit.comparisonBudgetClosed -or -not$audit.performancePrJustified -or
    $audit.attemptedComparisonSlots-ne3 -or $audit.exactHarnessControlledComparisons-ne2 -or $audit.benchmarkOutcomes-ne88 -or
    ($audit.controlledComparisonIds -join ',')-cne'2,3' -or $audit.practicalDefaultAppBenefitEstablished){throw 'Exact source and explicitly qualified audited evidence required.'}
node (Join-Path $PSScriptRoot 'F007-reproduce-analysis.mjs') $run --verify
if($LASTEXITCODE){throw 'Portable source/input/contract/raw evidence audit failed.'}
git add -- $source
if($LASTEXITCODE){throw 'Exact measured source staging failed.'}
$staged=@(git diff --cached --name-only)
if($staged.Count-ne1 -or $staged[0]-cne'src/Components/Server/src/Circuits/ServerComponentDeserializer.cs' -or
    (git diff --cached --numstat)-notmatch'^9\s+12\s+'){throw 'Only the measured membership and directly obsolete buffer lifetime may change.'}
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if($LASTEXITCODE){throw 'Exact measured source whitespace check failed.'}
git commit -q -m 'Use integer-set membership for large root-operation batches' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Measured source commit failed.'}
$commit=(git rev-parse HEAD).Trim()
if((git rev-parse 'HEAD^').Trim()-cne$baseline -or @(git status --porcelain --untracked-files=no).Count){throw 'Exact single independent source commit required.'}
$push=@('-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','autoperf',$branch)
$env:GIT_TERMINAL_PROMPT='0'
git @push *> (Join-Path $run 'source-push.log')
$pushCode=$LASTEXITCODE
if($pushCode){throw 'Fork source push failed;inspect actual output before retrying.'}
$verify=@('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch")
$remote=gh @verify
if($LASTEXITCODE){throw 'Actual remote source ref unavailable.'}
$remote=$remote|ConvertFrom-Json
if($remote.object.sha-cne$commit){throw 'Actual fork source ref differs.'}
$nativePath=$source.Replace('\','/')
$blob=(git rev-parse "${commit}:$nativePath").Trim()
$remoteSource=gh api "repos/jaslawinMs/aspnetcore/contents/$($nativePath)?ref=$commit"
if($LASTEXITCODE){throw 'Actual remote source bytes unavailable.'}
$remoteSource=$remoteSource|ConvertFrom-Json
$canonical=[Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($source)).Replace("`r`n","`n"))
if($remoteSource.sha-cne$blob -or -not[System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remoteSource.content))){throw 'Actual remote canonical source bytes differ.'}
[ordered]@{
    candidate='F007';branch=$branch;commit=$commit;parent=$baseline;sourceChanged=$true;trackedFilesChanged=1;additions=9;deletions=12
    sourceRawSha256=$patch.candidateSourceSha256;sourceCanonicalGitBlob=$blob;actualRemoteSourceBlob=$remoteSource.sha
    actualRemoteRef=$remote;actualRemoteCanonicalBytesVerified=$true;pushArguments=$push;pushExitCode=$pushCode
    verificationArguments=$verify;verificationExitCode=0;measuredBuildBaselineRevision=$baseline
    measuredSourcePatchSha256=$patch.patchSha256;measuredFinalOwnerSha256=$manifest.ownerSha256
    measuredBinaryNotRelabeledAsBuiltFromLaterCommit=$true;attemptedComparisonSlots=3;failedNoSampleComparisonIds=@(1)
    exactHarnessControlledComparisons=2;controlledComparisonIds=@(2,3);completedProfiles=4;benchmarkReports=88;comparisonBudgetClosed=$true
    publicApiDefaultDependencyTargetFrameworkVisibilityChanged=$false;performancePrCreated=$false
    note='One private owner seam,33 actual existing Facts per role and151 final companion checks per role. Narrow large-array parser CPU/allocation trade-off only;default100-root/production frequency,small control reversals,early-failure allocation and high-CV empty control remain explicit. Failed slot1 spent with no samples;two final order-reversed pairs use identical harness/all144 nonowner files. Frozen owner built from baseline plus exact patch before this commit. Fork-only,not a rendering/default-app speedup or merge-ready proposal.'
}|ConvertTo-Json -Depth 10|Set-Content $record -Encoding utf8
Copy-Item $PSCommandPath (Join-Path $run 'executed-source-publication.ps1')
Write-Output "F007 measured source$commit/fork ref and canonical source bytes verified;one file,+9/-12,no upstream PR."
