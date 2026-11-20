param(
    [Parameter(Mandatory)][ValidateSet('F147', 'F149')][string]$Finding,
    [Parameter(Mandatory)][ValidateSet('Original', 'CurrentDefault')][string]$Role,
    [Parameter(Mandatory)][ValidateSet('baseline', 'candidate')][string]$Variant,
    [Parameter(Mandatory)][ValidateRange(0, 6)][int]$Pair,
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9-]+$')][string]$Label
)

$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$root = Join-Path $session "autoperf-runs\$Finding"
$accepted = Get-Content -LiteralPath (Join-Path $root 'accepted-images.json') -Raw | ConvertFrom-Json
$image = $accepted.images.$Role.$Variant
$common = $accepted.common
$leasePath = Join-Path $session 'autoperf-parallelism\benchmark-exclusive.lease.json'
if ($env:AUTOPERF_BENCHMARK_LEASE_PATH -cne $leasePath)
{
    throw 'Only the actual exclusive benchmark gateway may start a measured native process.'
}
$lease = Get-Content -LiteralPath $leasePath -Raw | ConvertFrom-Json
if ($lease.findingId -cne $Finding -or $lease.purpose -cne 'benchmark' -or
    $lease.token -cne $env:AUTOPERF_BENCHMARK_LEASE_TOKEN -or
    $lease.arguments[0] -cne (Join-Path $session 'F147-F149-compare-011.mjs'))
{
    throw 'The benchmark lease does not authorize this driver/finding.'
}
$execution = Join-Path $root "executions\$Label"
if (Test-Path -LiteralPath $execution)
{
    throw 'Refusing to overwrite a measured native execution.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
$record = [ordered]@{
    finding = $Finding; role = $Role; variant = $Variant; pair = $Pair; label = $Label
    recordedAt = [DateTimeOffset]::UtcNow.ToString('o')
    actualPerformanceMeasurement = $true; actualMachine = $env:COMPUTERNAME
    actualNativePid = $null; actualNativeExitCode = $null; actualNativeTerminal = $false
    actualStdoutCompletelyDrained = $false; actualStderrCompletelyDrained = $false
    actualObservedDescendants = @(); actualExhaustiveProcessCensusClaimed = $false
    actualWholeDefaultFrameworkClaimed = $false; outcome = 'pending'; failure = $null
}
$recordPath = Join-Path $execution 'result.json'
function Save-Record
{
    $record | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $recordPath
}
function Assert-Inventory([string]$Directory, $Entries)
{
    $actual = @(Get-ChildItem -LiteralPath $Directory -File -Recurse)
    if ($actual.Count -ne $Entries.Count)
    {
        throw "The selected file set changed: $Directory"
    }
    foreach ($entry in $Entries)
    {
        $file = Join-Path $Directory $entry.file
        if ((Get-Item -LiteralPath $file).Length -ne $entry.bytes -or
            (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -cne $entry.sha256)
        {
            throw "A selected file changed: $file"
        }
    }
}
Save-Record
try
{
    Assert-Inventory $image.actualImagePath $image.actualAllImageFiles
    Assert-Inventory $common.actualOutputDirectory $common.actualFiles
    Assert-Inventory $common.actualRuntimeDirectory $common.actualAllRuntimeFiles
    Set-Location -LiteralPath $common.graph
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    . .\activate.ps1
    $env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
    $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 'true'
    $env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
    $env:DOTNET_ROLL_FORWARD = 'Disable'
    $implementation = Join-Path $session 'autoperf-parallelism\finding-F147-F149-implementation-011'
    $env:DOTNET_CLI_HOME = Join-Path $implementation 'local-work\cli-home'
    $env:NUGET_HTTP_CACHE_PATH = Join-Path $implementation 'local-work\http-cache'
    $env:NUGET_SCRATCH = Join-Path $implementation 'local-work\nuget'
    $env:TEMP = Join-Path $implementation 'local-work\scratch'
    $env:TMP = $env:TEMP
    $env:PROBE010_SAMPLE_PATH = Join-Path $image.actualImagePath 'WebTransportInteractiveSampleApp.dll'
    $env:PROBE010_SAMPLE_SHA256 = $image.actualOwnerSha256
    $env:PROBE010_CORE_SHA256 = $accepted.commonCoreSha256
    $env:AUTOPERF_SAMPLE_MODE = 'measure'
    $env:AUTOPERF_SAMPLE_FINDING = $Finding
    $env:AUTOPERF_SAMPLE_PAIR = [string]$Pair
    $arguments = @(
        'test', 'src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj',
        '--no-build', '--no-restore', '-c', 'Release',
        '--filter', 'FullyQualifiedName=Microsoft.AspNetCore.Server.Kestrel.Core.Tests.CompiledSampleProducerTests.ActualSample_SteadyStateWorkload',
        '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false',
        '-p:RuntimeFrameworkVersion=12.0.0-alpha.1.26557.102',
        "-p:CustomAfterMicrosoftCommonTargets=$(Join-Path $implementation 'prepared\Probe010.targets')",
        '--logger', 'trx;LogFileName=workload.trx', '--results-directory', $execution, '-v:normal'
    )
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = Join-Path $common.graph '.dotnet\dotnet.exe'
    $info.WorkingDirectory = $common.graph
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($argument in $arguments)
    {
        $info.ArgumentList.Add($argument)
    }
    $record.actualExecutable = $info.FileName
    $record.actualArguments = $arguments
    $record.actualWorkingDirectory = $info.WorkingDirectory
    $process = [Diagnostics.Process]::Start($info)
    $record.actualNativePid = $process.Id
    $record.actualNativeStartedAt = $process.StartTime.ToUniversalTime().ToString('o')
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $known = @{}
    $known[$process.Id] = $record.actualNativeStartedAt
    while (-not $process.WaitForExit(1000))
    {
        foreach ($parentId in @($known.Keys))
        {
            foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $parentId"))
            {
                if (-not $known.ContainsKey([int]$child.ProcessId))
                {
                    $known[[int]$child.ProcessId] = $child.CreationDate.ToUniversalTime().ToString('o')
                }
            }
        }
    }
    $record.actualNativeExitCode = $process.ExitCode
    $record.actualNativeTerminal = $process.HasExited
    $stdout = $stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()
    $record.actualStdoutCompletelyDrained = $stdoutTask.IsCompletedSuccessfully
    $record.actualStderrCompletelyDrained = $stderrTask.IsCompletedSuccessfully
    [IO.File]::WriteAllText((Join-Path $execution 'native.stdout.txt'), $stdout)
    [IO.File]::WriteAllText((Join-Path $execution 'native.stderr.txt'), $stderr)
    foreach ($nativeId in $known.Keys)
    {
        $current = Get-Process -Id $nativeId -ErrorAction SilentlyContinue
        $same = $null -ne $current -and
            [Math]::Abs(($current.StartTime.ToUniversalTime() - [DateTimeOffset]::Parse($known[$nativeId]).UtcDateTime).TotalMilliseconds) -lt 1
        if ($same)
        {
            if (-not $current.WaitForExit(30000))
            {
                throw "An observed owned native process remains after its parent completed: $nativeId"
            }
        }
        $record.actualObservedDescendants += [ordered]@{
            pid = $nativeId; startedAt = $known[$nativeId]; actualTerminal = $true
            actualWaitAfterRootExitRequired = $same
        }
    }
    if ($process.ExitCode -ne 0)
    {
        throw "The measured native workload failed: $($process.ExitCode)"
    }
    [xml]$xml = Get-Content -LiteralPath (Join-Path $execution 'workload.trx') -Raw
    $ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
    $ns.AddNamespace('t', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
    $rows = @($xml.SelectNodes('//t:UnitTestResult', $ns))
    if ($rows.Count -ne 1 -or $rows[0].outcome -cne 'Passed' -or
        $rows[0].testName -cne 'Microsoft.AspNetCore.Server.Kestrel.Core.Tests.CompiledSampleProducerTests.ActualSample_SteadyStateWorkload')
    {
        throw 'Exactly the real steady-state native Fact must execute and pass.'
    }
    $definition = $xml.SelectSingleNode('//t:TestDefinitions/t:UnitTest', $ns)
    $counters = $xml.SelectSingleNode('//t:ResultSummary/t:Counters', $ns)
    if ($definition.id -cne $rows[0].testId -or $definition.Execution.id -cne $rows[0].executionId -or
        [int]$counters.total -ne 1 -or [int]$counters.passed -ne 1 -or [int]$counters.failed -ne 0)
    {
        throw 'Native result/definition/execution/counters did not reconcile.'
    }
    $matches = [regex]::Matches([string]$rows[0].Output.StdOut, 'AUTOPERF_SAMPLE_WORKLOAD_JSON ([^\r\n]+)')
    if ($matches.Count -ne 1)
    {
        throw 'Exactly one actual structured native measurement is required.'
    }
    $observed = $matches[0].Groups[1].Value | ConvertFrom-Json -Depth 20
    if ($observed.mode -cne 'measure' -or $observed.finding -cne $Finding -or $observed.pair -ne $Pair -or
        $observed.sampleSha256 -cne $image.actualOwnerSha256 -or $observed.commonCoreSha256 -cne $accepted.commonCoreSha256 -or
        $observed.observations.Count -ne 2)
    {
        throw 'Actual measurement identity does not match the authorized pair.'
    }
    foreach ($observation in $observed.observations)
    {
        if ($observation.ActualMeasurement -ne $true -or $observation.Operations -ne 128 -or
            $observation.PayloadBytes -ne 65536 -or $observation.AllocatedBytes -le 0 -or $observation.ElapsedMilliseconds -le 0)
        {
            throw 'The native result changed the frozen workload or did not actually measure.'
        }
    }
    Assert-Inventory $image.actualImagePath $image.actualAllImageFiles
    Assert-Inventory $common.actualOutputDirectory $common.actualFiles
    Assert-Inventory $common.actualRuntimeDirectory $common.actualAllRuntimeFiles
    $record.actualMeasurement = $observed
    $record.actualNativeXml = Join-Path $execution 'workload.trx'
    $record.actualNativeXmlSha256 = (Get-FileHash -LiteralPath $record.actualNativeXml -Algorithm SHA256).Hash
    $record.actualNativeTestName = [string]$rows[0].testName
    $record.actualTestId = [string]$rows[0].testId
    $record.actualExecutionId = [string]$rows[0].executionId
    $record.actualSourceRuntimeBoundary = 'Own source-role sample; common Original Kestrel/runtime57, not whole default framework.'
    $record.outcome = 'pass'
}
catch
{
    $record.outcome = 'failed'
    $record.failure = $_.Exception.ToString()
    throw
}
finally
{
    $record.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
    Save-Record
}
Write-Output "$Finding $Role $Variant pair=$Pair nativePid=$($record.actualNativePid) terminal=$($record.actualNativeTerminal)"
