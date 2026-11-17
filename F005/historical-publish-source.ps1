$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F005'
$baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch='autoperf/F005-potential-iterator-symbol-membership'
$source='src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
$record=Join-Path $run 'source-branch-publication.json'
if((Test-Path $record) -or (git rev-parse HEAD).Trim()-cne$baseline -or
    (git branch --show-current).Trim()-cne$branch -or @(git diff --cached --name-only).Count -or
    (git remote get-url autoperf).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Fresh independent baseline-plus-measured-source fork publication required.'}
$tracked=@(git status --porcelain --untracked-files=no)
if($tracked.Count-ne1 -or $tracked[0]-cne' M src/Components/Analyzers/src/ForLoopIteratorInClosureAnalyzer.cs'){throw 'Only the four-line measured F005 seam may be committed.'}
$patch=Get-Content (Join-Path $run 'source-patch-metadata.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $run 'manifest-candidate-1-small-controls.json') -Raw|ConvertFrom-Json
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if((Get-FileHash $source).Hash-cne$patch.candidateSourceSha256 -or $patch.changedExistingLines-ne4 -or
    $audit.disposition-cne'validated' -or -not $audit.actualLiveAuditPassed -or -not $audit.comparisonBudgetClosed -or
    $audit.exactHarnessControlledComparisons-ne2 -or $audit.controlledBenchmarkOutcomes-ne72 -or
    $audit.exploratoryBenchmarkOutcomes-ne28 -or $audit.benchmarkOutcomes-ne100 -or
    -not $audit.performancePrJustified){throw 'Exact source and explicitly qualified audited evidence required.'}
node (Join-Path $PSScriptRoot 'F005-reproduce-analysis.mjs') $run --verify
if($LASTEXITCODE){throw 'Source/input/contract/raw evidence audit failed.'}
git add -- $source
if($LASTEXITCODE){throw 'Exact measured source staging failed.'}
$staged=@(git diff --cached --name-only)
if($staged.Count-ne1 -or $staged[0]-cne'src/Components/Analyzers/src/ForLoopIteratorInClosureAnalyzer.cs' -or
    (git diff --cached --numstat)-notmatch'^4\s+4\s+'){throw 'Only four changed existing lines in the owner are permitted.'}
git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check
if($LASTEXITCODE){throw 'Exact measured source whitespace check failed.'}
git commit -q -m 'Use lazy symbol-set membership for potential loop iterators' `
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
$verifyCode=$LASTEXITCODE
if($verifyCode){throw 'Actual remote source ref unavailable.'}
$remote=$remote|ConvertFrom-Json
if($remote.object.sha-cne$commit){throw 'Actual fork source ref differs.'}
$nativePath=$source.Replace('\','/')
$blob=(git rev-parse "${commit}:$nativePath").Trim()
$remoteSource=gh api "repos/jaslawinMs/aspnetcore/contents/$($nativePath)?ref=$commit"
if($LASTEXITCODE){throw 'Actual remote source bytes unavailable.'}
$remoteSource=$remoteSource|ConvertFrom-Json
$canonical=[Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($source)).Replace("`r`n","`n"))
if($remoteSource.sha-cne$blob -or -not [System.Linq.Enumerable]::SequenceEqual([byte[]]$canonical,[Convert]::FromBase64String($remoteSource.content))){throw 'Actual remote canonical source bytes differ.'}
[ordered]@{
    candidate='F005';branch=$branch;commit=$commit;parent=$baseline;sourceChanged=$true;trackedFilesChanged=1;changedExistingLines=4
    sourceRawSha256=$patch.candidateSourceSha256;sourceCanonicalGitBlob=$blob;actualRemoteSourceBlob=$remoteSource.sha
    actualRemoteRef=$remote;actualRemoteCanonicalBytesVerified=$true;pushArguments=$push;pushExitCode=$pushCode
    verificationArguments=$verify;verificationExitCode=$verifyCode;measuredBuildBaselineRevision=$baseline
    measuredSourcePatchSha256=$patch.patchSha256;measuredFinalOwnerSha256=$manifest.ownerSha256
    measuredBinaryNotRelabeledAsBuiltFromLaterCommit=$true;sourceComparisons=3;comparisonBudgetClosed=$true
    exactHarnessControlledComparisons=2;controlledComparisonIds=@(2,3);exploratoryDifferentHarnessComparisonIds=@(1)
    publicApiDiagnosticDefaultDependencyTargetFrameworkVisibilityChanged=$false;performancePrCreated=$false
    note='Exact four-line candidate committed after40 existing controls,560 compiler checks and100 recorded reports;only72 reports from comparisons2/3 are exact-harness owner comparisons. Qualified allocation/scaling proposal,small-target heap reversals and all timing costs retained. Frozen binaries were built from baseline plus patch before this source commit. Fork-only;no global speedup claim.'
}|ConvertTo-Json -Depth 10|Set-Content $record -Encoding utf8
Copy-Item $PSCommandPath (Join-Path $run 'executed-source-publication.ps1')
Write-Output "F005 exact measured source$commit/fork ref and canonical source bytes verified;one file/four lines,no upstream PR."
