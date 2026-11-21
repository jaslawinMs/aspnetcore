$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$scriptPath = Join-Path $scope 'capture-v002.mjs'
$stdoutPath = Join-Path $scope 'invoke-v004.stdout.raw'
$stderrPath = Join-Path $scope 'invoke-v004.stderr.raw'
$info = [Diagnostics.ProcessStartInfo]::new()
$info.FileName = 'node'
$info.ArgumentList.Add($scriptPath)
$info.WorkingDirectory = $scope
$info.UseShellExecute = $false
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
$info.CreateNoWindow = $true
$process = [Diagnostics.Process]::new()
$process.StartInfo = $info
$stdout = [IO.File]::Open($stdoutPath, 'CreateNew', 'Write', 'Read')
$stderr = [IO.File]::Open($stderrPath, 'CreateNew', 'Write', 'Read')
$startedUtc = [DateTime]::UtcNow.ToString('o')
$observations = [Collections.Generic.List[object]]::new()
$observerErrors = [Collections.Generic.List[string]]::new()
$process.Start() | Out-Null
$rootPid = $process.Id
$rootStartTimeUtc = $process.StartTime.ToUniversalTime().ToString('o')
$outTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
$errTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
do
{
    try
    {
        $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $rootPid" -ErrorAction Stop | Select-Object ProcessId, ParentProcessId, CreationDate, ExecutablePath, CommandLine)
        $observations.Add(@{ observedUtc = [DateTime]::UtcNow.ToString('o'); directChildren = $children })
    }
    catch
    {
        $observerErrors.Add($_.Exception.Message)
    }
} while (-not $process.WaitForExit(200))
$process.WaitForExit()
$null = $outTask.GetAwaiter().GetResult()
$null = $errTask.GetAwaiter().GetResult()
$exitCode = $process.ExitCode
$stdout.Dispose()
$stderr.Dispose()
$receipt = [ordered]@{
    script = $scriptPath; outerPowerShellPid = $PID; rootPid = $rootPid; rootStartTimeUtc = $rootStartTimeUtc
    startedUtc = $startedUtc; observedTerminalUtc = [DateTime]::UtcNow.ToString('o'); rootExitCode = $exitCode; rootHasExited = $process.HasExited
    stdoutCopyCompleted = $outTask.IsCompletedSuccessfully; stderrCopyCompleted = $errTask.IsCompletedSuccessfully
    stdout = @{ path = $stdoutPath; bytes = (Get-Item -LiteralPath $stdoutPath).Length; sha256 = (Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256).Hash }
    stderr = @{ path = $stderrPath; bytes = (Get-Item -LiteralPath $stderrPath).Length; sha256 = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash }
    directChildPointObservations = $observations; observerErrors = $observerErrors
    limitations = @('Awaited Node root/full redirected streams only. Point samples may miss short-lived/deeper descendants. Direct Git/gh terminal records are separate. No final outer tool exit or machine-idleness prediction.')
}
[IO.File]::WriteAllText((Join-Path $scope 'invoke-v004.receipt.json'), ($receipt | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
[IO.File]::ReadAllText($stdoutPath)
if ((Get-Item -LiteralPath $stderrPath).Length -gt 0)
{
    [Console]::Error.Write([IO.File]::ReadAllText($stderrPath))
}
$receipt | ConvertTo-Json -Depth 10
exit $exitCode
