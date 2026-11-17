param(
    [ValidateRange(1, 3)][int]$Comparison = 1,
    [ValidateSet('native-specialization-001', 'native-specialization-002')]
    [string]$CandidateVariant = 'native-specialization-001'
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F013'
$budgetPath = Join-Path $run 'measurement-budget.json'
$budget = Get-Content $budgetPath -Raw | ConvertFrom-Json
if ($budget.closed -or $budget.usedComparisons -ne ($Comparison - 1) -or
    $budget.usedComparisons -ge $budget.maximumComparisons -or $budget.originalOnlyDiagnosticProfiles -ne 0)
{
    throw 'F013 slot closed, spent or out of sequence; never rerun a used timing slot.'
}
$manifestNames = @{ original = 'comparison-original'; candidate = $CandidateVariant }
$manifests = @{}
foreach ($role in 'original', 'candidate')
{
    $manifestPath = Join-Path $run "manifest-$($manifestNames[$role]).json"
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.files.Count -ne 80 -or $manifest.sources.Count -ne 89 -or $manifest.actualFreshOwningRows -ne 28)
    {
        throw 'Exact comparison image/source and fresh owning coverage required.'
    }
    $audit = Get-Content (Join-Path $run "$($manifest.owningTestDirectory)\actual-test-audit.json") -Raw | ConvertFrom-Json
    if ($audit.actualTests -ne 28 -or $audit.passed -ne 28 -or $audit.failed -ne 0 -or
        $audit.skipped -ne 0 -or $audit.actualTheoryRows -ne 4 -or
        @($audit.binaryHashes | Where-Object name -CEQ 'Microsoft.AspNetCore.SignalR.Core.dll')[0].sha256 -cne $manifest.ownerDllSha256)
    {
        throw 'Both actually measured owner images must match their fresh28-row owning evidence.'
    }
    $manifests[$role] = $manifest
}
foreach ($name in 'harnessDllSha256', 'harnessPdbSha256', 'benchmarkDotNetSha256')
{
    if ($manifests.original.$name -cne $manifests.candidate.$name)
    {
        throw 'One exact compiled harness/PDB/BDN image required.'
    }
}
$deltas = @($manifests.original.files | Where-Object {
    $item = $_
    $item.sha256 -cne @($manifests.candidate.files | Where-Object path -CEQ $item.path)[0].sha256
} | Select-Object -ExpandProperty path | Sort-Object)
if (($deltas -join '|') -cne 'Microsoft.AspNetCore.SignalR.Core.dll|Microsoft.AspNetCore.SignalR.Core.pdb')
{
    throw 'Only actual owner DLL/PDB may differ across otherwise identical consumer images.'
}
foreach ($variant in 'original', 'captured-default-json', $CandidateVariant, "$CandidateVariant-current-json")
{
    $directory = Join-Path $run "characterization\$variant\states"
    $completion = @(Get-ChildItem $directory -Filter '*characterization-completed.json')
    if ($completion.Count -ne 1)
    {
        throw 'Both producer versions must actually characterize both owners.'
    }
    $data = Get-Content $completion[0].FullName -Raw | ConvertFrom-Json
    if (-not $data.passed -or $data.contractChecks -ne 18 -or $data.actualChecks -ne 32 -or
        $data.actualTimedSetupsPreflighted -ne 14 -or @(Get-ChildItem $directory -Filter '*producer.json').Count -ne 18)
    {
        throw 'Exact live-input/custom-derived-dispatch/real-Pipe/timed-wrapper controls required.'
    }
}
foreach ($label in 'core', 'owning-tests')
{
    $formatDirectory = if ($CandidateVariant -ceq 'native-specialization-001') { 'format-validation' } else { "format-validation-$CandidateVariant" }
    $records = @(Get-Content (Join-Path $run "$formatDirectory\execution.json") -Raw | ConvertFrom-Json)
    if (@($records | Where-Object { $_.label -ceq $label -and $_.actualExitCode -eq 0 }).Count -ne 1)
    {
        throw 'Changed-file formatting must pass before timing.'
    }
}
function VerifyFrozenInputs
{
    if ((git branch --show-current).Trim() -cne 'autoperf/F013-signalr-targeted-membership' -or
        (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5')
    {
        throw 'Independent candidate baseline branch changed.'
    }
    foreach ($role in 'original', 'candidate')
    {
        $manifest = $manifests[$role]
        foreach ($group in @(
            @{ root = $manifest.imageDirectory; files = $manifest.files },
            @{ root = $manifest.sourceDirectory; files = $manifest.sources }))
        {
            $root = Join-Path $run $group.root
            if (@(Get-ChildItem $root -Recurse -File).Count -ne $group.files.Count)
            {
                throw 'Frozen comparison inventory differs.'
            }
            foreach ($file in $group.files)
            {
                $actual = Get-Item (Join-Path $root $file.path)
                if ($actual.Length -ne $file.bytes -or (Get-FileHash $actual.FullName).Hash -cne $file.sha256)
                {
                    throw 'Frozen comparison image/source bytes changed.'
                }
            }
        }
    }
    if ((Get-FileHash 'src\SignalR\server\Core\src\DefaultHubLifetimeManager.cs').Hash -cne
        (Get-FileHash (Join-Path $run "sources\$CandidateVariant\owner\DefaultHubLifetimeManager.cs")).Hash -or
        (Get-FileHash 'src\SignalR\server\SignalR\test\Microsoft.AspNetCore.SignalR.Tests\DefaultHubLifetimeManagerTests.cs').Hash -cne
        (Get-FileHash (Join-Path $run "sources\$CandidateVariant\test\DefaultHubLifetimeManagerTests.cs")).Hash)
    {
        throw 'Actual candidate source changed after tested image freeze.'
    }
}
VerifyFrozenInputs
$destination = Join-Path $run "measurements\comparison-$Comparison"
if (Test-Path $destination)
{
    throw 'Preserve every attempted timing slot.'
}
New-Item $destination -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
Copy-Item $budgetPath (Join-Path $destination 'budget-before.json')
$order = if ($Comparison -eq 2) { @('candidate', 'original') } else { @('original', 'candidate') }
$attempt = [pscustomobject]@{
    comparison = $Comparison; state = 'running'; order = $order; startedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    candidateVariant = $CandidateVariant
    driverSha256 = (Get-FileHash $PSCommandPath).Hash; profiles = @(); completedUtc = $null; failed = $false
    manifestHashes = @{
        original = (Get-FileHash (Join-Path $run 'manifest-comparison-original.json')).Hash
        candidate = (Get-FileHash (Join-Path $run "manifest-$CandidateVariant.json")).Hash
    }
}
$prior = @($budget.PSObject.Properties['attempts'].Value | Where-Object { $null -ne $_ })
$budget | Add-Member -NotePropertyName attempts -NotePropertyValue @($prior + $attempt) -Force
$budget.usedComparisons = $Comparison
$budget.reason = 'Slot reserved before launch; every failed/partial timing consumes it. Same compiled harness and78 nonowner files; real producer controls/fresh28-row owner tests/format checks passed. Still repeated linear membership; gain not assumed.'
function SaveBudget
{
    $budget | ConvertTo-Json -Depth 14 | Set-Content $budgetPath
    $attempt | ConvertTo-Json -Depth 14 | Set-Content (Join-Path $destination 'comparison-execution.json')
}
SaveBudget
$succeeded = $false
try
{
    $powerBefore = & powercfg /GETACTIVESCHEME
    if ($LASTEXITCODE) { throw 'Read-only shared-host power observation failed.' }
    $powerBefore | Set-Content (Join-Path $destination 'power-before.txt')
    & dotnet --info *> (Join-Path $destination 'sdk-and-host-info.txt')
    if ($LASTEXITCODE) { throw 'Pinned SDK/host context capture failed.' }
    foreach ($role in $order)
    {
        VerifyFrozenInputs
        $manifest = $manifests[$role]
        $image = Join-Path $run $manifest.imageDirectory
        $sources = Join-Path $run $manifest.sourceDirectory
        $tests = Join-Path $run "$($manifest.owningTestDirectory)\test-image"
        $profileOutput = Join-Path $destination $role
        $arguments = @((Join-Path $image 'AutoPerf.Benchmarks.dll'), '--sources', $sources, '--context', "$role-comparison-$Comparison",
            '--test-assembly', (Join-Path $tests 'Microsoft.AspNetCore.SignalR.Tests.dll'),
            '--spec-assembly', (Join-Path $tests 'Microsoft.AspNetCore.SignalR.Specification.Tests.dll'),
            '--filter', '*', '--artifacts', $profileOutput)
        $profile = [pscustomobject]@{
            role = $role; entryPoint = 'dotnet'; arguments = $arguments; startedUtc = [DateTimeOffset]::UtcNow.ToString('o')
            actualExitCode = $null; completedUtc = $null; expectedReports = 14; actualReports = 0
        }
        $attempt.profiles = @($attempt.profiles + $profile)
        $counter = $role + 'Profiles'
        $budget.$counter++
        SaveBudget
        & dotnet @arguments *> (Join-Path $destination "$role.log")
        $profile.actualExitCode = $LASTEXITCODE
        $profile.completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
        SaveBudget
        Get-Content (Join-Path $destination "$role.log") -Tail 18
        if ($profile.actualExitCode -ne 0) { throw 'Actual timing failed; slot remains spent.' }
        $completion = @(Get-ChildItem (Join-Path $profileOutput 'states') -Filter '*-completed.json')
        if ($completion.Count -ne 1) { throw 'Unique actual profile completion required.' }
        $data = Get-Content $completion[0].FullName -Raw | ConvertFrom-Json
        if (-not $data.allSuccessful -or $data.actualReports -ne 14) { throw 'All14 actual role reports must succeed.' }
        $profile.actualReports = 14
        SaveBudget
        VerifyFrozenInputs
    }
    $powerAfter = & powercfg /GETACTIVESCHEME
    if ($LASTEXITCODE) { throw 'Final shared-host power observation failed.' }
    $powerAfter | Set-Content (Join-Path $destination 'power-after.txt')
    if (($powerBefore -join "`n") -cne ($powerAfter -join "`n")) { throw 'Ambient shared-host power plan changed; comparison not controlled.' }
    $succeeded = $true
}
finally
{
    $attempt.completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    $attempt.failed = -not $succeeded
    $attempt.state = if ($succeeded) { 'completed' } else { 'failed-or-partial' }
    if ($budget.usedComparisons -ge $budget.maximumComparisons)
    {
        $budget.closed = $true
        $budget.reason = 'All3 comparison slots consumed, including any failed/partial timings; no additional F013 timing authorized.'
    }
    SaveBudget
    Copy-Item $budgetPath (Join-Path $destination 'budget-after.json')
}
Write-Output "F013 comparison $Comparison completed: $($order -join ' then '),14 cases/role; raw timing/GC/settings and unchanged frozen inputs retained."
