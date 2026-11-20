param([Parameter(Mandatory)][string]$Attempt)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$owner = Split-Path $root
$policy = Get-Content (Join-Path (Split-Path $owner) 'policy.json') -Raw | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -or !$policy.workersMayBuildOrTest)
{
    throw 'Do not begin source-heavy audit while held.'
}
$stdoutPath = Join-Path $owner "$Attempt.stdout.txt"
$stderrPath = Join-Path $owner "$Attempt.stderr.txt"
$receiptPath = Join-Path $owner "$Attempt.receipt.json"
if ((Test-Path $stdoutPath) -or (Test-Path $stderrPath) -or (Test-Path $receiptPath))
{
    throw 'Never overwrite an earlier audit attempt.'
}
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = (Get-Command node.exe).Source
$start.WorkingDirectory = 'C:\src\aspnetcore'
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
foreach ($argument in @('--permission', "--allow-fs-read=$root", "$root\Audit.cjs"))
{
    $start.ArgumentList.Add($argument)
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $start
$wrapper = Get-Process -Id $PID
$record = [ordered]@{
    attempt = $Attempt
    startedAtUtc = [DateTime]::UtcNow.ToString('o')
    executable = $start.FileName
    arguments = @($start.ArgumentList)
    workingDirectory = $start.WorkingDirectory
    wrapperPid = $PID
    wrapperCreationUtc = $wrapper.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
    sourceHeavyScope = 'Read-only built-in Node auditor; filesystem reads allowed only under capsule; no filesystem write or child-process permission. No native tests/builds/benchmarks.'
}
[void]$process.Start()
$record.processId = $process.Id
$record.creationUtc = $process.StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.ffffffZ')
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$outText = $stdout.GetAwaiter().GetResult()
$errText = $stderr.GetAwaiter().GetResult()
[IO.File]::WriteAllText($stdoutPath, $outText)
[IO.File]::WriteAllText($stderrPath, $errText)
$record.exitCode = $process.ExitCode
$record.nativeExited = $process.HasExited
$record.bothStreamsDrained = $true
$record.stdoutPath = $stdoutPath
$record.stdoutSha256 = (Get-FileHash $stdoutPath -Algorithm SHA256).Hash
$record.stderrPath = $stderrPath
$record.stderrSha256 = (Get-FileHash $stderrPath -Algorithm SHA256).Hash
$record.completedAtUtc = [DateTime]::UtcNow.ToString('o')
$record.manifestSha256 = (Get-FileHash "$root\MANIFEST.json" -Algorithm SHA256).Hash
$stage = "$receiptPath.$PID.stage"
[IO.File]::WriteAllText($stage, ($record | ConvertTo-Json -Depth 15), [Text.UTF8Encoding]::new($false))
[IO.File]::Move($stage, $receiptPath, $true)
Write-Output $outText
Write-Output $errText
$exitCode = $process.ExitCode
$process.Dispose()
exit $exitCode
