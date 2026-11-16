$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$root = Join-Path $PSScriptRoot 'autoperf-runs\F096'
. (Join-Path $repo 'activate.ps1')
$baseline = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$current = (Get-Content -LiteralPath (Join-Path $root 'current-default-head.txt') -Raw).Trim()
$head = git -C $repo rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $head -cne $baseline)
{
    throw 'F096 must still be on its independent untouched baseline.'
}
git -C $repo diff --quiet HEAD --
if ($LASTEXITCODE -ne 0)
{
    throw 'Tracked shipping changes are not part of this rejected performance investigation.'
}
$sources = @(
    'src\Components\JSInterop\src\JSObjectReferenceExtensions.cs',
    'src\Components\JSInterop\src\JSRuntime.cs',
    'src\Components\JSInterop\src\Implementation\JSObjectReference.cs',
    'src\Components\JSInterop\src\Infrastructure\JSObjectReferenceJsonConverter.cs',
    'src\Components\JSInterop\src\Infrastructure\DotNetDispatcher.cs',
    'src\Components\JSInterop\src\Infrastructure\JSInvocationInfo.cs',
    'src\Components\JSInterop\src\Infrastructure\PendingAsyncCall.cs',
    'src\Components\JSInterop\src\IJSObjectReference.cs',
    'src\Components\JSInterop\test\JSObjectReferenceTest.cs',
    'src\Components\JSInterop\test\JSRuntimeExtensionsTest.cs',
    'src\Components\JSInterop\test\JSRuntimeTest.cs',
    'src\Components\JSInterop\src\Microsoft.JSInterop.csproj',
    'src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj'
)
$copyRoot = Join-Path $root 'producer-source'
if (Test-Path -LiteralPath $copyRoot)
{
    throw 'Refusing to replace captured source evidence.'
}
$rows = foreach ($relative in $sources)
{
    $gitPath = $relative.Replace('\', '/')
    $source = Join-Path $repo $relative
    $copy = Join-Path $copyRoot $relative
    New-Item -ItemType Directory -Path (Split-Path $copy -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $copy
    $defaultBlob = git -C $repo rev-parse "${current}:$gitPath"
    if ($LASTEXITCODE -ne 0)
    {
        throw "Missing current-default source:$relative"
    }
    $baselineBlob = git -C $repo rev-parse "${baseline}:$gitPath"
    $workingBlob = git -C $repo hash-object "--path=$gitPath" $source
    if ($LASTEXITCODE -ne 0 -or $defaultBlob -cne $baselineBlob -or $workingBlob -cne $baselineBlob)
    {
        throw "Actual source is not the verified current-default and baseline blob:$relative"
    }
    @{
        path=$gitPath; source="producer-source/$gitPath"; currentDefault=$current; baseline=$baseline
        currentDefaultBlob=$defaultBlob; baselineBlob=$baselineBlob; workingCanonicalBlob=$workingBlob
        sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $copy).Hash
        note='Raw Windows bytes preserved. Git blob identity uses actual repository clean filters, not a claimed raw/CRLF byte equality.'
    }
}
$rows | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $root 'producer-source-copies.json')
New-Item -ItemType Directory -Path (Join-Path $root 'source-before') | Out-Null
Copy-Item -LiteralPath (Join-Path $repo $sources[0]) -Destination (Join-Path $root 'source-before\JSObjectReferenceExtensions.cs')
& (Join-Path $PSScriptRoot 'autoperf-benchmarks.ps1') -Action Snapshot -Id F096 -Variant before `
    -ProjectName AutoPerf.Benchmarks -TargetAssembly Microsoft.JSInterop -TargetSource $sources[0] `
    -AdditionalTargetSource $sources[1..7] -BuildOutput (Join-Path $root 'harness\bin\Release\net12.0')
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$binaries = Join-Path $root 'binaries\before'
$pdbCommands = foreach ($relative in $sources[0..7])
{
    $name = Split-Path $relative -Leaf
    $arguments = @($tool, 'pdb', (Join-Path $binaries 'Microsoft.JSInterop.pdb'), $name, (Join-Path $copyRoot $relative))
    & dotnet @arguments > (Join-Path $root "owner-$($name.Replace('.cs',''))-pdb-before.json")
    if ($LASTEXITCODE -ne 0)
    {
        throw "Actual owner/producer PDB document differs:$name"
    }
    @{arguments=$arguments; exitCode=$LASTEXITCODE}
}
$pdbCommands += foreach ($name in @('Program.cs','RuntimeBoundary.cs','TimeoutBenchmark.cs','TimeoutProbe.cs'))
{
    $arguments = @($tool, 'pdb', (Join-Path $binaries 'AutoPerf.Benchmarks.pdb'), $name, (Join-Path $root "harness\$name"))
    & dotnet @arguments > (Join-Path $root "harness-$($name.Replace('.cs',''))-pdb-before.json")
    if ($LASTEXITCODE -ne 0)
    {
        throw "Actual frozen harness PDB document differs:$name"
    }
    @{arguments=$arguments; exitCode=$LASTEXITCODE}
}
$pdbCommands | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $root 'pdb-before-commands.json')
node (Join-Path $PSScriptRoot 'F096-closure.mjs') $root
if ($LASTEXITCODE -ne 0)
{
    throw 'Original recursive file and declared runtime-asset closure failed.'
}
$destination = Join-Path $root 'verify-before'
if (Test-Path -LiteralPath $destination)
{
    throw 'Refusing to overwrite frozen original correctness/resource observations.'
}
$arguments = @((Join-Path $binaries 'AutoPerf.Benchmarks.dll'), '--require-deadlines', '--artifacts', $destination)
$started = [DateTimeOffset]::UtcNow.ToString('o')
& dotnet @arguments *> (Join-Path $root 'verify-before.log')
$code = $LASTEXITCODE
@{
    arguments=$arguments; actualExitCode=$code; expectedExitCode=1; startedUtc=$started
    completedUtc=[DateTimeOffset]::UtcNow.ToString('o')
    result='Expected original correctness-gate failure; not a corrected deadline or a benchmark optimization.'
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $root 'verify-before-command.json')
if ($code -ne 1)
{
    throw "Frozen original deadline characterization changed:$code"
}
$report = Get-Content -LiteralPath (Join-Path $destination 'states\original-contract-resource-probe.json') -Raw | ConvertFrom-Json
if ($report.MissingDeadlines -ne 9 -or $report.Deadlines.Count -ne 15 -or $report.InfiniteDefaultControls.Count -ne 5)
{
    throw 'Frozen original did not reach the fifteen finite and five default/infinity producer rows.'
}
$inventory = @{
    sdk=(dotnet --version); processor=@(Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed)
    computer=@(Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber)
    note='Read-only inventory of this shared machine. No power, priority, affinity or other-user process changes.'
}
$inventory | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $root 'read-only-environment.json')
"F096 original captured: thirteen actual current-default sources; twelve source/PDB documents; expected9/15 managed deadline failures and five live default/infinity controls."
