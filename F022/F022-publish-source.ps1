$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F022'
$execution = Join-Path $run 'source-publication\attempt-002'
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$branch = 'autoperf/F022-indexer-metadata-cache'
$bindings = @(
    @{ path = 'src/Mvc/Mvc.ViewFeatures/src/ExpressionHelper.cs'; sha256 = '04A769BED0B513DFE135FB75E40168CF8BBA8B65BDA82642192BC234EF7DB8AC'; additions = 15 },
    @{ path = 'src/Mvc/Mvc.ViewFeatures/test/ExpressionHelperTest.cs'; sha256 = '2C2133E2A65AB22AD8723BBE4C8B82A8CDB1E3502778DDAB9C8C4A9707A685D3'; additions = 141 }
)
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual source publication.'
}
$budget = Get-Content -Raw -LiteralPath (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
$green = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\selected-callers\verified-result.json') | ConvertFrom-Json
$red = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\original-contract-adapter\verified-result.json') | ConvertFrom-Json
$audit = Get-Content -Raw -LiteralPath (Join-Path $run 'measurement-audit.json') | ConvertFrom-Json
$liveFiles = Get-Content -Raw -LiteralPath (Join-Path $run 'live-frozen-closure-audit.json') | ConvertFrom-Json
$fresh = Get-Content -Raw -LiteralPath (Join-Path $run 'reproduction-characterized\prepared.json') | ConvertFrom-Json
$defaultParity = Get-Content -Raw -LiteralPath (Join-Path $run 'current-default-recheck\verified-default-parity.json') | ConvertFrom-Json
if (!$budget.comparison_budget_closed -or $budget.actual_comparisons_started -ne 3 -or $budget.actual_comparisons_completed -ne 3 -or
    $green.actualPassed -ne 96 -or $green.actualExpectedRed -ne 0 -or $green.actualSkipped -ne 0 -or
    $red.actualPassed -ne 82 -or $red.actualExpectedRed -ne 1 -or $red.actualRunnerExitCode -ne 1 -or
    $audit.actualNativeWarmRows -ne 84 -or $audit.actualFirstObservedRows -ne 18 -or
    $liveFiles.actualLiveFrozenClosureRecordsRehashed -ne 716 -or !$liveFiles.allActualFileHashesMatched -or
    $fresh.mode -ne 'Characterize' -or $fresh.historicalThreeComparisonBudgetReopened -or $fresh.comparativeTimingRequested -or
    !$defaultParity.actualAllCoreGitBlobsEqual -or !$defaultParity.actualInterveningCoreHistoryEmpty -or $defaultParity.actualCoreFilePairs -ne 14)
{
    throw 'Require the actual closed three-comparison evaluation,red/green owning evidence and relocated no-timing characterization.'
}
$contracts = @(Get-ChildItem -LiteralPath (Join-Path $run 'reproduction-characterized\artifacts\states') -Filter '*characterization-completed.json' -File)
if ($contracts.Count -ne 1)
{
    throw 'The relocated actual producer characterization did not complete.'
}
$completed = Get-Content -Raw -LiteralPath $contracts[0].FullName | ConvertFrom-Json
if (!$completed.allSuccessful -or $completed.actualRecordedProfileContracts -ne 42)
{
    throw 'The relocated actual producer contracts did not pass.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$script:sequence = 0
function Invoke-Captured([string]$Label, [string]$Executable, [string[]]$Arguments)
{
    $script:sequence++
    $stem = Join-Path $execution ('{0:D3}-{1}' -f $script:sequence, $Label)
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & $Executable @Arguments 1> ($stem + '.stdout') 2> ($stem + '.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = $Executable; arguments = $Arguments; workingDirectory = $root
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
    } | ConvertTo-Json -Depth 10 | Set-Content ($stem + '.json') -Encoding utf8NoBOM
    if ($code -ne 0)
    {
        throw "Actual source command failed;inspect and preserve $stem"
    }

    return [IO.File]::ReadAllText($stem + '.stdout')
}
Push-Location $root
try
{
    if ((Invoke-Captured 'actual-branch' git @('branch','--show-current')).Trim() -ne $branch -or
        (Invoke-Captured 'actual-head' git @('rev-parse','HEAD')).Trim() -ne $baseline -or
        (Invoke-Captured 'actual-remote' git @('remote','get-url','autoperf')).Trim() -ne 'https://github.com/jaslawinMs/aspnetcore.git' -or
        (Invoke-Captured 'actual-staged-files' git @('diff','--cached','--name-only')).Trim())
    {
        throw 'Require the independent original branch,requested fork and empty staging area.'
    }
    $tracked = @((Invoke-Captured 'actual-tracked-files' git @('diff','--name-only')).Trim() -split "`r?`n" | Where-Object { $_ })
    if ($tracked.Count -ne 2 -or @($tracked | Where-Object { $_ -notin $bindings.path }).Count)
    {
        throw 'Only the two validated product/test files may be changed.'
    }
    foreach ($binding in $bindings)
    {
        $actualFile = Join-Path $root $binding.path.Replace('/','\')
        if ((Get-FileHash -LiteralPath $actualFile).Hash -ne $binding.sha256)
        {
            throw 'The actual validated source bytes changed.'
        }
    }
    $fork = Invoke-Captured 'actual-public-fork' gh @('api','repos/jaslawinMs/aspnetcore') | ConvertFrom-Json
    $main = Invoke-Captured 'actual-fork-base' gh @('api','repos/jaslawinMs/aspnetcore/git/ref/heads/main') | ConvertFrom-Json
    $default = Invoke-Captured 'actual-current-default' gh @('api','repos/dotnet/aspnetcore/branches/main') | ConvertFrom-Json
    if ($fork.private -or !$fork.fork -or $fork.parent.full_name -ne 'dotnet/aspnetcore' -or
        $main.object.sha -ne $baseline -or $default.commit.sha -ne $defaultParity.actualDefaultRevision)
    {
        throw 'Actual fork/base/default differs;inspect fresh source parity before continuing.'
    }
    $prior = (Invoke-Captured 'actual-prior-head-ref' git @('ls-remote','--heads','autoperf',"refs/heads/$branch")).Trim()
    if ($prior)
    {
        throw 'An unexpected existing remote proposal must not be overwritten.'
    }
    $null = Invoke-Captured 'capture-exact-patch' git @('--no-pager','diff','--binary',"--output=$(Join-Path $run 'source-proposal.patch')",'HEAD','--') 
    $null = Invoke-Captured 'inspect-final-source-diff' git @('--no-pager','diff','--',$bindings[0].path,$bindings[1].path)
    $null = Invoke-Captured 'stage-only-validated-sources' git @('add','--',$bindings[0].path,$bindings[1].path)
    $null = Invoke-Captured 'source-whitespace' git @('--no-pager','diff','--cached','--check')
    $numstat = @((Invoke-Captured 'exact-staged-numstat' git @('diff','--cached','--numstat')).Trim() -split "`r?`n")
    if ($numstat.Count -ne 2)
    {
        throw 'Exactly two staged insertion-only source changes are required.'
    }
    foreach ($line in $numstat)
    {
        $parts = $line -split "`t"
        $binding = @($bindings | Where-Object path -ceq $parts[2])
        if ($binding.Count -ne 1 -or [int]$parts[0] -ne $binding[0].additions -or [int]$parts[1] -ne 0)
        {
            throw 'An unrelated existing-line edit entered the proposal.'
        }
    }
    $message = "Cache successful MVC indexer metadata weakly outside Hot Reload`n`nPreserve live metadata discovery when updates are supported and for custom reflection types. Keep collectible method metadata weak and captured index values current.`n`nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
    $null = Invoke-Captured 'commit-validated-sources' git @('commit','--quiet','-m',$message)
    $commit = (Invoke-Captured 'actual-proposal-commit' git @('rev-parse','HEAD')).Trim()
    $null = Invoke-Captured 'push-fork-only-source' git @('-c','credential.helper=','-c','credential.helper=!gh auth git-credential',
        'push','autoperf',"HEAD:refs/heads/$branch")
    $remote = Invoke-Captured 'actual-pushed-source-ref' gh @('api',"repos/jaslawinMs/aspnetcore/git/ref/heads/$branch") | ConvertFrom-Json
    $comparison = Invoke-Captured 'actual-remote-source-comparison' gh @('api',"repos/jaslawinMs/aspnetcore/compare/$baseline...$commit") | ConvertFrom-Json
    if ($remote.object.sha -ne $commit -or $comparison.ahead_by -ne 1 -or $comparison.files.Count -ne 2)
    {
        throw 'Actual remote proposal ref or isolated diff differs.'
    }
    $canonical = foreach ($binding in $bindings)
    {
        $gitBlob = (Invoke-Captured ('actual-source-blob-' + $binding.additions) git @('rev-parse',"$($commit):$($binding.path)")).Trim()
        $actual = @($comparison.files | Where-Object filename -ceq $binding.path)
        if ($actual.Count -ne 1 -or $actual[0].sha -ne $gitBlob -or $actual[0].additions -ne $binding.additions -or $actual[0].deletions -ne 0)
        {
            throw 'An actual remote source blob differs from the committed validated proposal.'
        }
        [ordered]@{ path = $binding.path; actualValidatedRawSha256 = $binding.sha256; actualGitBlob = $gitBlob }
    }
    [ordered]@{
        candidate = 'F022'; branch = $branch; baseline = $baseline; commit = $commit
        measuredAsBaselinePlusCapturedPatchBeforeThisCommit = $true
        actualSourceHeadAtMeasurement = $baseline
        actualPublicForkVerified = $true; actualRemoteRefVerified = $true
        onlyIntendedTwoSourceFilesCommitted = $true; additions = 156; deletions = 0
        canonicalSourceBindings = @($canonical); publicApiChanges = 0
        newVisibilityGrants = 0; newCrossAssemblyPrivateAccess = 0
        actualComparisonBudgetClosed = $true; actualComparisons = 3
        actualRefreshedDefaultRevision = $defaultParity.actualDefaultRevision
        actualRefreshedCoreSourcePairsEqual = $defaultParity.actualCoreFilePairs
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'source-publication\verified-source-publication.json') -Encoding utf8NoBOM
    $commit | Set-Content (Join-Path $PSScriptRoot 'F022-source-commit.txt') -Encoding utf8NoBOM
    Write-Output "F022 source $commit pushed and actual fork ref/two blobs verified."
}
finally
{
    Pop-Location
}
