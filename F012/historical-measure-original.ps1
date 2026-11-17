$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F012'
$destination = Join-Path $run 'measurements\original-diagnostic-only'
$budgetPath = Join-Path $run 'measurement-budget.json'
$budget = Get-Content $budgetPath -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.usedComparisons -ne 0 -or $budget.originalProfiles -ne 0 -or
    $budget.candidateProfiles -ne 0 -or $budget.originalOnlyDiagnosticProfiles -ne 0 -or
    $budget.maximumOriginalOnlyDiagnosticProfiles -ne 1 -or (Test-Path $destination))
{
    throw 'Only one fresh original-only diagnostic profile is authorized.'
}
$decision = Get-Content (Join-Path $run 'candidate-selection.json') -Raw | ConvertFrom-Json
if ($decision.proposalDisposition -cne 'rejected/design-blocked' -or
    $decision.selectedShippingSourceCandidates -ne 0 -or $decision.performancePrJustified)
{
    throw 'Only a clearly labeled original-cost diagnostic follows this source decision.'
}
foreach ($role in 'original', 'captured-default-json')
{
    $states = Join-Path $run "characterization\$role\states"
    $completion = @(Get-ChildItem $states -Filter '*-characterization-completed.json')
    if ($completion.Count -ne 1)
    {
        throw 'Both actual successful producer characterizations are required.'
    }
    $ready = Get-Content $completion[0].FullName -Raw | ConvertFrom-Json
    if (-not $ready.passed -or $ready.contractChecks -ne 17 -or $ready.actualChecks -ne 29 -or
        $ready.actualTimedSetupsPreflighted -ne 12 -or
        @(Get-ChildItem $states -Filter '*-producer.json').Count -ne 17 -or
        @(Get-ChildItem $states -Filter '*-setup-preflight.json').Count -ne 12 -or
        @(Get-ChildItem $states -Filter '*-benchmark-validated.json').Count -ne 12)
    {
        throw 'Exact actual owner, producer, Pipe and timed-wrapper preflights are required.'
    }
}
$audit = Get-Content (Join-Path $run 'tests\original\actual-test-audit.json') -Raw | ConvertFrom-Json
if ($audit.passed -ne 27 -or $audit.failed -ne 0 -or $audit.skipped -ne 0 -or
    $audit.areaRows -ne 27 -or $audit.sentinelRows -ne 0)
{
    throw 'All 27 actual area rows must pass.'
}
$restored = @(Get-Content (Join-Path $run 'preparation-attempts\attempt-001\original-repository-json-outputs-unchanged.json') -Raw | ConvertFrom-Json)
if ($restored.Count -ne 2 -or @($restored | Where-Object { -not $_.equal }).Count)
{
    throw 'Original repository JSON producer outputs must remain unchanged.'
}
$reuse = Get-Content (Join-Path $run 'tests\original\borrowed-evidence-provenance.json') -Raw | ConvertFrom-Json
if ($reuse.actualNewOwningTestRuns -ne 0 -or $reuse.actualPriorOriginalRowsReused -ne 27 -or
    (Get-FileHash (Join-Path $run 'tests\original\owning-original.trx')).Hash -cne $reuse.originalTrxSha256)
{
    throw 'Only explicitly attributed identical prior owning-test evidence is allowed; do not claim a new suite run.'
}
$investigation = Get-Content (Join-Path $run 'current-source-investigation.json') -Raw | ConvertFrom-Json
$manifests = @{}
foreach ($role in 'original', 'captured-default-json')
{
    $manifests[$role] = Get-Content (Join-Path $run "manifest-$role.json") -Raw | ConvertFrom-Json
}
function AssertOriginal
{
    if ((git rev-parse HEAD).Trim() -cne $investigation.baseline -or
        (git branch --show-current).Trim() -cne $investigation.branch -or
        @(git diff --name-only).Count -or @(git diff --cached --name-only).Count)
    {
        throw 'Only the unchanged independent original source is allowed.'
    }
    foreach ($source in $investigation.sources)
    {
        if ((Get-FileHash $source.file).Hash -cne $source.workingSha256)
        {
            throw 'Selected working source changed.'
        }
    }
    foreach ($role in 'original', 'captured-default-json')
    {
        foreach ($group in @(
            @{ root = "images\$role"; rows = $manifests[$role].files },
            @{ root = "sources\$role"; rows = $manifests[$role].sources }))
        {
            foreach ($file in $group.rows)
            {
                $path = Join-Path $run "$($group.root)\$($file.path)"
                if ((Get-FileHash $path).Hash -cne $file.sha256 -or (Get-Item $path).Length -ne $file.bytes)
                {
                    throw 'Frozen image or source bytes changed.'
                }
            }
        }
    }
    foreach ($source in Get-ChildItem (Join-Path $run 'harness') -File | Where-Object { $_.Extension -in '.cs', '.csproj' })
    {
        if ((Get-FileHash $source.FullName).Hash -cne
            (Get-FileHash (Join-Path $run "sources\original\harness\$($source.Name)")).Hash)
        {
            throw 'The final preflighted harness changed.'
        }
    }
}
AssertOriginal
New-Item $destination -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
Copy-Item $budgetPath (Join-Path $destination 'budget-before.json')
& dotnet --info *> (Join-Path $destination 'dotnet-info.log')
if ($LASTEXITCODE)
{
    throw 'Pinned SDK and host context required before timing.'
}
$cpu = Get-CimInstance Win32_Processor | Select-Object Name, Manufacturer, NumberOfCores, NumberOfLogicalProcessors
$os = Get-CimInstance Win32_OperatingSystem |
    Select-Object Caption, Version, BuildNumber, OSArchitecture, TotalVisibleMemorySize
[ordered]@{
    candidate = 'F012'; capturedUtc = [DateTimeOffset]::UtcNow.ToString('o'); cpu = $cpu; os = $os
    sharedMachine = $true; machineIsolationClaimed = $false; noDeliberatePowerPriorityAffinityChanges = $true
    maximumBuildNodes = 2; onlyOriginalProfile = $true
} | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $destination 'host-context.json')
$budget.originalOnlyDiagnosticProfiles = 1
$budget.originalProfiles = 1
$budget.reason = 'One original-only attempt spent before launch; no indexed source candidate or paired comparison. All 12 actual timed wrappers were preflighted with both original and captured-default JSON producers.'
$budget | ConvertTo-Json -Depth 6 | Set-Content $budgetPath
$arguments = @(
    (Join-Path $run 'images\original\AutoPerf.Benchmarks.dll'), '--sources', (Join-Path $run 'sources\original'),
    '--context', 'original-diagnostic-only', '--filter', '*', '--artifacts', $destination)
$start = [DateTimeOffset]::UtcNow.ToString('o')
& dotnet @arguments *> (Join-Path $destination 'console.log')
$code = $LASTEXITCODE
$command = [ordered]@{
    candidate = 'F012'; variant = 'original'; entryPoint = 'dotnet'; arguments = $arguments; actualExitCode = $code
    startedUtc = $start; completedUtc = [DateTimeOffset]::UtcNow.ToString('o'); activation = '. .\activate.ps1'
    manifestSha256 = (Get-FileHash (Join-Path $run 'manifest-original.json')).Hash
    preImageHashesVerified = $manifests.original.files.Count; preSourceHashesVerified = $manifests.original.sources.Count
    originalOnlyDiagnosticProfile = $true; pairedComparisons = 0; candidateProfiles = 0
}
$command | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $destination 'execution.json')
if ($code)
{
    Get-Content (Join-Path $destination 'console.log') -Tail 65
    throw 'Original diagnostic failed; the attempt remains spent and must not silently be rerun.'
}
AssertOriginal
$command.postImageHashesVerified = $manifests.original.files.Count
$command.postSourceHashesVerified = $manifests.original.sources.Count
$command | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $destination 'execution.json')
$budget.closed = $true
$budget.reason = 'The single original-only 12-shape profile completed; no shipping candidate, paired comparison or improvement percentage. No more F012 timing is authorized.'
$budget | ConvertTo-Json -Depth 6 | Set-Content $budgetPath
Copy-Item $budgetPath (Join-Path $destination 'budget-after.json')
Get-Content (Join-Path $destination 'console.log') -Tail 35
Write-Output 'F012 original-only diagnostic completed; both frozen producer images/sources verified before and after; zero candidate profiles or paired comparisons.'
