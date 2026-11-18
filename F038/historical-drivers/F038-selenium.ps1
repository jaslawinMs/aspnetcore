param(
    [Parameter(Mandatory)]
    [ValidateSet('producer', 'remaining')]
    [string]$Phase
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F038'
$directory = Join-Path $run "selenium-candidate-$Phase-001"
if (Test-Path -LiteralPath $directory)
{
    throw 'Do not overwrite an owning Selenium invocation.'
}
$build = Get-Content -Raw -LiteralPath (Join-Path $run 'selenium-build-candidate-001\command.json') | ConvertFrom-Json
if ($build.actualExitCode -ne 0 -or -not $build.actualDependencyAwareBuild)
{
    throw 'Rebuild the owning E2E project and dependent apps before running.'
}
$allNames = @('CanInsert', 'CanDelete', 'CanInsertUnkeyed', 'CanDeleteUnkeyed', 'CanReorder',
    'CanReorderInsertDeleteAndEdit_WithAndWithoutKeys', 'CanRetainFocusWhileMovingTextBox',
    'CanUpdateCheckboxStateWhileMovingIt')
if ($Phase -eq 'producer')
{
    $names = @('CanReorder')
}
else
{
    $producer = Get-Content -Raw -LiteralPath (Join-Path $run 'selenium-candidate-producer-001\verified-result.json') | ConvertFrom-Json
    if ($producer.actualPassed -ne 1 -or $producer.actualSkipped -ne 0)
    {
        throw 'First isolate and pass the actual owning browser producer.'
    }
    $names = @($allNames | Where-Object { $_ -cne 'CanReorder' })
}
$className = 'Microsoft.AspNetCore.Components.E2ETest.Tests.KeyTest'
$filter = ($names | ForEach-Object { "FullyQualifiedName=$className.$_" }) -join '|'
New-Item -ItemType Directory -Path $directory | Out-Null
Set-Location $root
. .\activate.ps1
$arguments = @('test', 'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj',
    '--configuration', 'Debug', '--no-build', '--no-restore', '-m:2', '-nr:false', '--verbosity', 'quiet',
    '-p:UseIisNativeAssets=false', '--filter', $filter, '--logger', "trx;LogFileName=F038-KeyTest-$Phase.trx",
    '--results-directory', $directory)
$startInfo = [Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = (Get-Command dotnet).Source
$startInfo.WorkingDirectory = $root
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
foreach ($argument in $arguments)
{
    $startInfo.ArgumentList.Add($argument)
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $startInfo
$stdout = [IO.File]::Open((Join-Path $directory 'stdout.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$stderr = [IO.File]::Open((Join-Path $directory 'stderr.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$owned = @{}
try
{
    if (-not $process.Start())
    {
        throw 'Owning Selenium command did not actually start.'
    }
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $receipt = [ordered]@{candidate='F038';phase=$Phase;executable=$startInfo.FileName;arguments=$arguments;
        actualProcessId=$process.Id;actualPidCapturedBeforeWait=$true;
        actualStartedUtc=$process.StartTime.ToUniversalTime().ToString('O');actualExitCode=$null;actualFinishedUtc=$null}
    $receipt | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'launch.json') -Encoding utf8NoBOM
    do
    {
        $processes = @(Get-CimInstance Win32_Process)
        $queue = [Collections.Generic.Queue[int]]::new()
        $queue.Enqueue($process.Id)
        foreach ($knownId in @($owned.Keys))
        {
            $known = $owned[$knownId]
            if (@($processes | Where-Object { $_.ProcessId -eq $knownId -and $_.CreationDate -eq $known.CreationDate }).Count -eq 1)
            {
                $queue.Enqueue([int]$knownId)
            }
        }
        $seen = [Collections.Generic.HashSet[int]]::new()
        while ($queue.Count -gt 0)
        {
            $currentId = $queue.Dequeue()
            if (-not $seen.Add($currentId))
            {
                continue
            }
            $current = @($processes | Where-Object { $_.ProcessId -eq $currentId })
            if ($current.Count -eq 1)
            {
                $owned[$currentId] = $current[0] | Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate
                foreach ($child in @($processes | Where-Object { $_.ParentProcessId -eq $currentId }))
                {
                    $queue.Enqueue([int]$child.ProcessId)
                }
            }
        }
        @($owned.Values) | ConvertTo-Json -Depth 7 |
            Set-Content -LiteralPath (Join-Path $directory 'captured-owned-processes.json') -Encoding utf8NoBOM
    } while (-not $process.WaitForExit(1000))
    [void]$outTask.GetAwaiter().GetResult()
    [void]$errTask.GetAwaiter().GetResult()
    $receipt.actualExitCode = $process.ExitCode
    $receipt.actualFinishedUtc = [DateTime]::UtcNow.ToString('O')
    $receipt | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $directory 'command.json') -Encoding utf8NoBOM
}
finally
{
    $stdout.Dispose()
    $stderr.Dispose()
    $process.Dispose()
}
Get-Content -LiteralPath (Join-Path $directory 'stdout.log') -Tail 35
Get-Content -LiteralPath (Join-Path $directory 'stderr.log') -Tail 20
$trxFile = Join-Path $directory "F038-KeyTest-$Phase.trx"
if (-not (Test-Path -LiteralPath $trxFile))
{
    throw 'Owning Selenium command did not produce fresh test results; no browser assertion is claimed.'
}
[xml]$trx = Get-Content -Raw -LiteralPath $trxFile
$definitions = @{}
foreach ($definition in $trx.TestRun.TestDefinitions.UnitTest)
{
    $definitions[$definition.id] = $definition.TestMethod
}
$rows = @($trx.TestRun.Results.UnitTestResult | ForEach-Object {
    $definition = $definitions[$_.testId]
    [ordered]@{testName=$_.testName;outcome=$_.outcome;executionId=$_.executionId;testId=$_.testId;
        className=$definition.className;methodName=$definition.name;error=$_.Output.ErrorInfo.Message}
})
$rows | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'all-trx-rows.json') -Encoding utf8NoBOM
$actualNames = @($rows.methodName | Sort-Object -CaseSensitive)
if ($receipt.actualExitCode -ne 0 -or @($rows | Where-Object { $_.outcome -cne 'Passed' -or $_.className -cne $className }).Count -ne 0 -or
    $rows.Count -ne $names.Count -or
    ($actualNames | ConvertTo-Json -Compress) -cne (@($names | Sort-Object -CaseSensitive) | ConvertTo-Json -Compress))
{
    throw 'Every selected existing KeyTest assertion must actually run and pass; prerequisites/skips are not passes.'
}
$remaining = @()
$deadline = [DateTime]::UtcNow.AddSeconds(15)
do
{
    $currentProcesses = @(Get-CimInstance Win32_Process)
    $remaining = @($owned.Values | Where-Object {
        $known = $_
        @($currentProcesses | Where-Object { $_.ProcessId -eq $known.ProcessId -and $_.CreationDate -eq $known.CreationDate }).Count -ne 0
    })
} while ($remaining.Count -gt 0 -and [DateTime]::UtcNow -lt $deadline)
if ($remaining.Count -ne 0)
{
    throw "Captured owned Selenium helpers remain:$($remaining.ProcessId -join ',')"
}
[ordered]@{candidate='F038';phase=$Phase;actualPassed=$rows.Count;actualSkipped=0;
    actualMethods=$actualNames;actualAllRowsIndependentlyParsed=$true;
    actualCapturedOwnedProcesses=$owned.Count;actualAllCapturedOwnedHelpersGone=$true;
    actualConfiguration='Debug';actualWebAssemblyCorrectnessNotPerformance=$true
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $directory 'verified-result.json') -Encoding utf8NoBOM
Write-Output "F038:existing owning KeyTest/${Phase}:$($rows.Count)fresh passed,0skipped;all captured owned helpers gone."
