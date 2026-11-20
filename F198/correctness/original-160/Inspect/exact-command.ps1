param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Native', 'AdapterNoRestore', 'AdapterRestore', 'AdapterBuild', 'Inspect')]
    [string]$Phase
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\ap-F198-o158'
$base = Join-Path $PSScriptRoot 'autoperf-parallelism\finding-F198-158'
$record = Join-Path $base ('untimed-160\' + $Phase)
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'autoperf-parallelism\benchmark-exclusive.lease.json'))
{
    throw 'A benchmark lease blocks preparation.'
}
if (Test-Path -LiteralPath $record) { throw 'Preserve the existing actual phase record.' }
$null = New-Item -ItemType Directory -Path $record
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $record 'exact-command.ps1')
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
Set-Location $root
. .\activate.ps1
$project = Join-Path $base 'consumer-160\ExistingBenchmark.csproj'
$fixture = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks\Release\net12.0'
$native = Join-Path $root 'artifacts\bin\InMemory.FunctionalTests\Release\net12.0\InMemory.FunctionalTests.dll'
$settings = @('-c', 'Release', '-p:UseSharedCompilation=false', '-nr:false', '-v:q')
$arguments = switch ($Phase)
{
    'Native' { @('vstest', $native, '--TestCaseFilter:FullyQualifiedName~KestrelMetricsTests.Http1Connection_ServerShutdown_',
        '--Logger:trx;LogFileName=F198-native.trx', "--ResultsDirectory:$record") }
    'AdapterNoRestore' { @('build', $project, '--no-restore') + $settings }
    'AdapterRestore' { @('restore', $project, '--disable-parallel', '-nr:false', '-v:q') }
    'AdapterBuild' { @('build', $project, '--no-restore') + $settings }
    'Inspect'
    {
        foreach ($extension in @('dll', 'pdb'))
        {
            $destination = Join-Path $fixture "AutoPerf.F198.Probe.$extension"
            if (Test-Path -LiteralPath $destination) { throw 'Preserve the existing private probe image.' }
            Copy-Item -LiteralPath (Join-Path $base "consumer-160\bin\Release\net12.0\AutoPerf.F198.Probe.$extension") -Destination $destination
        }
        @('exec', '--fx-version', '12.0.0-alpha.1.26562.105',
            '--runtimeconfig', (Join-Path $fixture 'Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks.runtimeconfig.json'),
            '--depsfile', (Join-Path $fixture 'Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks.deps.json'),
            (Join-Path $fixture 'AutoPerf.F198.Probe.dll'), (Join-Path $record 'functional.json'))
    }
}
$start = [Diagnostics.ProcessStartInfo]::new((Join-Path $root '.dotnet\dotnet.exe'))
$start.WorkingDirectory = $root
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
foreach ($argument in $arguments) { $start.ArgumentList.Add($argument) }
[ordered]@{ executable = $start.FileName; arguments = $arguments; workingDirectory = $root
    activation = '. .\activate.ps1'; actualNoBenchmarkAuthorization = $true } |
    ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $record 'invocation.json') -Encoding utf8NoBOM
$process = [Diagnostics.Process]::Start($start)
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$creation = $process.StartTime.ToUniversalTime()
$pidObserved = $process.Id
$process.WaitForExit()
[IO.File]::WriteAllText((Join-Path $record 'stdout.txt'), $stdout.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $record 'stderr.txt'), $stderr.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
$exit = $process.ExitCode
[ordered]@{ actualOwnedChildPid = $pidObserved; actualChildCreationUtc = $creation.ToString('o')
    actualDirectChildAwaitedToExit = $true; actualBothStreamsDrained = $true; actualExitCode = $exit
    actualNoUniversalDescendantCensusClaim = $true; completedAtUtc = [DateTime]::UtcNow.ToString('o') } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $record 'lifecycle.json') -Encoding utf8NoBOM
$process.Dispose()
Get-Content -LiteralPath (Join-Path $record 'stdout.txt') -Tail 18
Get-Content -LiteralPath (Join-Path $record 'stderr.txt') -Tail 10
Write-Output "F198_UNTIMED_RECORD=$record"
if ($exit -ne 0) { throw "Actual $Phase failed with exit $exit; both streams are retained." }
if ($Phase -eq 'Native')
{
    [xml]$trx = Get-Content -LiteralPath (Join-Path $record 'F198-native.trx') -Raw
    $rows = @($trx.SelectNodes('//*[local-name()="UnitTestResult"]'))
    $methods = @($trx.SelectNodes('//*[local-name()="TestDefinitions"]/*[local-name()="UnitTest"]/*[local-name()="TestMethod"]') | ForEach-Object { $_.name })
    $expected = @('Http1Connection_ServerShutdown_Abort', 'Http1Connection_ServerShutdown_Graceful')
    if ($rows.Count -ne 2 -or @($rows | Where-Object outcome -cne 'Passed').Count -ne 0 -or
        @(Compare-Object $expected $methods).Count -ne 0)
    {
        throw 'Actual native result rows differ from the two required successful owning tests.'
    }
    [ordered]@{ actualRows = $rows.Count; actualEveryRowPassed = $true; actualTestMethods = $methods
        actualNativeTesthostClrOrMvidSampled = $false; actualNoCounters = $true } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $record 'accepted-rows.json') -Encoding utf8NoBOM
}
