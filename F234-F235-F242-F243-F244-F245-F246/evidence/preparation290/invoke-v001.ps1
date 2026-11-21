$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$scriptPath = Join-Path $scope 'capture-v001.mjs'
$stdoutPath = Join-Path $scope 'invoke-v001.stdout.raw'
$stderrPath = Join-Path $scope 'invoke-v001.stderr.raw'
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
$previousSignature = $null
do
{
    try
    {
        $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $rootPid" -ErrorAction Stop | Select-Object ProcessId, ParentProcessId, CreationDate, ExecutablePath, CommandLine)
        $signature = ($children | ForEach-Object { "$($_.ProcessId):$($_.CreationDate)" }) -join ';'
        if ($signature -cne $previousSignature)
        {
            $observations.Add(@{ observedUtc = [DateTime]::UtcNow.ToString('o'); directChildren = $children })
            $previousSignature = $signature
        }
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
    directChildPointObservationsOnIdentitySetChange = $observations; observerErrors = $observerErrors
    limitations = @('Awaited Node root and full redirected streams only. Samples record identity-set changes and may miss short-lived/deeper descendants. No assertion of machine idleness or final outer tool exit.')
}
[IO.File]::WriteAllText((Join-Path $scope 'invoke-v001.receipt.json'), ($receipt | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
[IO.File]::ReadAllText($stdoutPath)
if ((Get-Item -LiteralPath $stderrPath).Length -gt 0)
{
    [Console]::Error.Write([IO.File]::ReadAllText($stderrPath))
}
[ordered]@{ nodeRootPid = $rootPid; observedNodeExitCode = $exitCode; stdoutComplete = $outTask.IsCompletedSuccessfully; stderrComplete = $errTask.IsCompletedSuccessfully; observedDirectIdentitySetChanges = $observations.Count; observerErrors = $observerErrors.Count; receipt = 'invoke-v001.receipt.json'; finalOuterToolExitCode = $null } | ConvertTo-Json
exit $exitCode
