param(
    [Parameter(Mandatory)]
    [ValidateSet('Original37', 'Default90')]
    [string] $Role
)

$ErrorActionPreference = 'Stop'
$session = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files'
$parallel = Join-Path $session 'autoperf-parallelism'
$output = Join-Path $parallel 'finding-F140-implementation-019'
$graph = if ($Role -eq 'Original37') { 'C:\src\ap-F140-o013' } else { 'C:\src\ap-F140-d013' }
$policy = Get-Content -LiteralPath (Join-Path $parallel 'policy.json') -Raw | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -or -not $policy.workersMayBuildOrTest -or (Test-Path -LiteralPath (Join-Path $parallel 'benchmark-exclusive.lease.json')))
{
    throw 'Build is not permitted during a benchmark lease or HOLD.'
}
$work = Join-Path $output "invocations\$Role-build-all-020"
if (Test-Path -LiteralPath $work)
{
    throw 'This native build invocation already exists; preserve it rather than replay.'
}
New-Item -ItemType Directory -Path $work | Out-Null
Set-Location -LiteralPath $graph
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
. .\activate.ps1
$arguments = @(
    'build',
    'src\SignalR\clients\csharp\Client.Core\src\Microsoft.AspNetCore.SignalR.Client.Core.csproj',
    '--no-restore', '-c', 'Release', '-m:1', '-nr:false', '-v:q',
    '-p:BuildNodeJS=false', '-p:BuildJava=false'
)
$info = [Diagnostics.ProcessStartInfo]::new((Join-Path $graph '.dotnet\dotnet.exe'))
$info.WorkingDirectory = $graph
$info.UseShellExecute = $false
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
$info.CreateNoWindow = $true
foreach ($argument in $arguments)
{
    $info.ArgumentList.Add($argument)
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $info
if (-not $process.Start())
{
    throw 'Owned native build did not start.'
}
$started = @{
    role = $Role
    mode = 'all-four-target-frameworks-build-no-restore'
    pid = $process.Id
    graph = $graph
    startedUtc = [DateTime]::UtcNow.ToString('o')
    file = $info.FileName
    arguments = $arguments
    actualActivatedExactRepositoryEnvironment = $true
    actualNoExcludedTargetFrameworksOrAnalyzers = $true
    actualTimingOrAllocationCounter = $false
}
$started | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $work 'started.json') -Encoding utf8
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExitAsync().GetAwaiter().GetResult()
$outText = $stdout.GetAwaiter().GetResult()
$errText = $stderr.GetAwaiter().GetResult()
[IO.File]::WriteAllText((Join-Path $work 'stdout.txt'), $outText)
[IO.File]::WriteAllText((Join-Path $work 'stderr.txt'), $errText)
$completed = $started.Clone()
$completed.completedUtc = [DateTime]::UtcNow.ToString('o')
$completed.exitCode = $process.ExitCode
$completed.actualRootAwaited = $true
$completed.actualStdoutAwaited = $true
$completed.actualStderrAwaited = $true
$completed | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $work 'completed.json') -Encoding utf8
$code = $process.ExitCode
$process.Dispose()
Write-Output $outText
Write-Output $errText
$completed | ConvertTo-Json -Depth 8
if ($code -ne 0)
{
    throw "All-target-frameworks build failed with exit $code; retain this attempt and restore only if the actual failure warrants it."
}
