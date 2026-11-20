$ErrorActionPreference = 'Stop'
$a = $PSScriptRoot
if ((Test-Path (Join-Path $a 'MANIFEST.json')) -or (Test-Path (Join-Path $a 'capsule\MANIFEST.json')))
{
    throw 'Selected capsule already frozen; do not rewrite historical evidence.'
}
$receipts = @(Get-ChildItem (Join-Path $a 'logs') -Filter '*.receipt.json' |
    ForEach-Object { Get-Content $_.FullName -Raw | ConvertFrom-Json })
$known = @{}
foreach ($receipt in $receipts)
{
    foreach ($observation in $receipt.ownedProcessObservations)
    {
        $identity = $observation.identity
        $known["$($identity.pid)|$($identity.startTimeUtc)"] = $identity
    }
}
$observations = foreach ($identity in $known.Values)
{
    $current = Get-Process -Id $identity.pid -ErrorAction SilentlyContinue
    $same = $null -ne $current -and
        $current.StartTime.ToUniversalTime().ToString('O') -eq $identity.startTimeUtc
    [ordered]@{
        identity = $identity
        originalProcessStillRunning = $same
        pidSlotOccupied = $null -ne $current
        currentStartTimeUtc = $(if ($null -ne $current) { $current.StartTime.ToUniversalTime().ToString('O') } else { $null })
    }
}
if (@($observations | Where-Object originalProcessStillRunning).Count -ne 0)
{
    throw 'An observed original owned native process remains running.'
}
[ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('O')
    observations = @($observations)
    allObservedOriginalNativeProcessesTerminal = $true
    exhaustiveInstantaneousDescendantDiscoveryClaimed = $false
    heavyIoActive = $false
    nativeBuildOrTestActive = $false
    unrelatedProcessesTerminated = $false
    note = 'Process identities sampled by the per-command runner. Tool-terminal receipts also cover archive/materialization and metadata shells; very short unsampled children are not exhaustively attested.'
} | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $a 'evidence\FINAL-OWNED-PROCESSES.json')

$hostFiles = @(
    'C:\src\aspnetcore\.dotnet\dotnet.exe',
    'C:\src\aspnetcore\.dotnet\host\fxr\12.0.0-alpha.1.26565.104\hostfxr.dll',
    'C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26557.102\hostpolicy.dll',
    'C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26557.102\coreclr.dll',
    'C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102\dotnet.dll',
    'C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102\Roslyn\bincore\csc.dll'
)
$hosts = foreach ($file in $hostFiles)
{
    $item = Get-Item -LiteralPath $file
    [ordered]@{path=$file; bytes=$item.Length; sha256=(Get-FileHash -LiteralPath $file).Hash; fileVersion=$item.VersionInfo.FileVersion}
}
[ordered]@{
    sdk = '12.0.100-alpha.1.26557.102'
    coreRuntimeAssertedInsideEverySampleRow = '12.0.0-alpha.1.26557.102'
    actualHostFxrRecordedInsideEverySampleRow = '12.0.0-alpha.1.26565.104'
    rollForward = 'Disable'
    privateRuntime68Used = $false
    machineInstallsOrSettingsChanges = $false
    hostAndCompilerFiles = @($hosts)
    sourceBuiltProducerRoleForBothTestRuns = 'Original'
    currentDefaultOwnerIsOnlyTheActualSampleAssembly = $true
} | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $a 'evidence\HOST-SDK-RUNTIME-IDENTITY.json')

[ordered]@{
    stages = @(
        @{shellId='2675'; operation='Initial live query and workspace creation'; terminal=$true; exitCode=0},
        @{shellId='2677'; operation='Fetch live-main object without refs or FETCH_HEAD writes'; terminal=$true; exitCode=0},
        @{shellId='2678'; operation='Fresh git archives and tar source materialization'; terminal=$true; exitCode=0},
        @{shellId='F147Original'; operation='Original sample graph'; terminal=$true; exitCode=0},
        @{shellId='F147Default'; operation='Current-default sample graph'; terminal=$true; exitCode=0},
        @{shellId='F147Fixture'; operation='Common consumer initial compile'; terminal=$true; exitCode=1},
        @{shellId='F147Fixture2'; operation='Common consumer second compile'; terminal=$true; exitCode=1},
        @{shellId='F147Fixture3'; operation='Common consumer successful compile'; terminal=$true; exitCode=0},
        @{shellId='F147TestsOriginal'; operation='Discovery and 13 actual Original rows'; terminal=$true; exitCode=0},
        @{shellId='F147TestsDefault'; operation='13 actual current-default-owner rows'; terminal=$true; exitCode=0},
        @{shellId='F147Metadata'; operation='Initial metadata inspection'; terminal=$true; exitCode=1},
        @{shellId='F147Inventory'; operation='Metadata inspection success then initial inventory ordering failure'; terminal=$true; exitCode=1},
        @{shellId='F147ImageAudit2'; operation='Keyed all-file inventory correction'; terminal=$true; exitCode=0}
    )
    commands = @($receipts)
    setupLookupLimits = @(
        'Initial live-main git object lookup failed before explicit fetch; tool output retained the error, not a separate raw command log.',
        'Root AGENTS.md and one guessed Http3InMemory.cs path were absent; actual fixture was read from shared\test\Http3.',
        'One LSP lookup used an incorrect line and returned no definition; the exact shared integer-helper source was then read.'
    )
} | ConvertTo-Json -Depth 18 | Set-Content (Join-Path $a 'evidence\EXACT-COMMANDS-AND-TERMINALS.json')
Write-Output "Observed original native identities terminal: $($observations.Count). No native build/test or heavy image IO active."
