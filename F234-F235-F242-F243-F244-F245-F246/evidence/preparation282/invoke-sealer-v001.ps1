$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$node = (Get-Command node -CommandType Application -ErrorAction Stop).Source
$process = [System.Diagnostics.Process]::new()
$process.StartInfo = [System.Diagnostics.ProcessStartInfo]::new()
$process.StartInfo.FileName = $node
[void]$process.StartInfo.ArgumentList.Add((Join-Path $PSScriptRoot 'seal-inventory-v001.mjs'))
$process.StartInfo.WorkingDirectory = $PSScriptRoot
$process.StartInfo.UseShellExecute = $false
$process.StartInfo.CreateNoWindow = $true
$process.StartInfo.RedirectStandardInput = $true
$process.StartInfo.RedirectStandardOutput = $true
$process.StartInfo.RedirectStandardError = $true
$stdout = [System.IO.MemoryStream]::new()
$stderr = [System.IO.MemoryStream]::new()
$creationUtc = [DateTime]::UtcNow
$clock = [System.Diagnostics.Stopwatch]::StartNew()
$started = $false
$rootExited = $false
$stdoutComplete = $false
$stderrComplete = $false
$deadlineExpired = $false
$caught = $null
$exitCode = $null
$actualProcessStartUtc = $null
try
{
    $started = $process.Start()
    $actualProcessStartUtc = $process.StartTime.ToUniversalTime().ToString('o')
    $process.StandardInput.Close()
    $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdout)
    $stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderr)
    $rootExited = $process.WaitForExit([Math]::Max(1, 150000 - [int]$clock.ElapsedMilliseconds))
    if ($rootExited)
    {
        $exitCode = $process.ExitCode
        $stdoutComplete = $stdoutTask.Wait([Math]::Max(1, 150000 - [int]$clock.ElapsedMilliseconds))
        $stderrComplete = $stderrTask.Wait([Math]::Max(1, 150000 - [int]$clock.ElapsedMilliseconds))
    }
    if (-not ($rootExited -and $stdoutComplete -and $stderrComplete))
    {
        $deadlineExpired = $true
        if (-not $process.HasExited)
        {
            $process.Kill()
        }
    }
}
catch
{
    $caught = $_.Exception.ToString()
}
$stdoutBytes = $stdout.ToArray()
$stderrBytes = $stderr.ToArray()
$stdout.Dispose()
$stderr.Dispose()
$decoded = [System.Text.Encoding]::UTF8.GetString($stdoutBytes)
$sealerResult = $null
if ($rootExited -and $exitCode -eq 0 -and $stdoutComplete)
{
    $sealerResult = $decoded | ConvertFrom-Json -Depth 20
}
$receipt = @{
    helperPid = if ($started) { $process.Id } else { $null }
    creationUtc = $creationUtc.ToString('o')
    actualProcessStartUtc = $actualProcessStartUtc
    observedAfterWaitUtc = [DateTime]::UtcNow.ToString('o')
    actualSealerExitCode = $exitCode
    rootExited = $rootExited
    stdoutComplete = $stdoutComplete
    stderrComplete = $stderrComplete
    creationBoundMilliseconds = 150000
    creationBoundExpired = $deadlineExpired
    exception = $caught
    stdoutBytes = $stdoutBytes.Length
    stdoutSha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($stdoutBytes))
    stdoutBase64 = [Convert]::ToBase64String($stdoutBytes)
    stderrBytes = $stderrBytes.Length
    stderrSha256 = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($stderrBytes))
    stderrBase64 = [Convert]::ToBase64String($stderrBytes)
    sealerResult = $sealerResult
    terminalLimit = 'Direct Node sealer root and complete redirected streams. Sealer spawns no children. No universal unrelated-process claim.'
    outerPowerShellToolExitUnknownUntilToolReturns = $true
    preserveThisActualToolReceiptOutsideSealAfterReturn = $true
}
$receipt | ConvertTo-Json -Depth 20 -Compress
if ($caught -or $deadlineExpired -or -not ($rootExited -and $stdoutComplete -and $stderrComplete))
{
    exit 97
}
exit $exitCode
