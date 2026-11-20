param(
    [Parameter(Mandatory)][string]$Id,
    [Parameter(Mandatory)][string[]]$Arguments
)
$ErrorActionPreference = 'Stop'
$directory = Join-Path $PSScriptRoot "node-attempts\$Id"
if (Test-Path -LiteralPath $directory)
{
    throw "Node attempt already exists: $Id"
}
New-Item -ItemType Directory -Path "$directory\source" -Force | Out-Null
foreach ($name in @('Assemble.cjs', 'Audit.cjs', 'Metadata.cjs', 'Xml.cjs', 'Run-Node.ps1', 'Seal-Payload.cjs'))
{
    $source = Join-Path $PSScriptRoot $name
    if (Test-Path -LiteralPath $source)
    {
        Copy-Item -LiteralPath $source -Destination "$directory\source\$name"
    }
}
$info = [Diagnostics.ProcessStartInfo]::new()
$info.FileName = (Get-Command node).Source
$info.UseShellExecute = $false
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in $Arguments)
{
    $info.ArgumentList.Add($argument)
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $info
$startedUtc = [DateTime]::UtcNow.ToString('o')
$null = $process.Start()
$identity = [ordered]@{
    pid = $process.Id
    creationUtc = $process.StartTime.ToUniversalTime().ToString('o')
    creationTicks = $process.StartTime.ToUniversalTime().Ticks.ToString()
}
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$outText = $stdout.GetAwaiter().GetResult()
$errText = $stderr.GetAwaiter().GetResult()
[IO.File]::WriteAllText("$directory\stdout.txt", $outText)
[IO.File]::WriteAllText("$directory\stderr.txt", $errText)
[ordered]@{
    id = $Id
    executable = $info.FileName
    executableSHA256 = (Get-FileHash -LiteralPath $info.FileName -Algorithm SHA256).Hash
    arguments = $Arguments
    exactCommand = 'node ' + (($Arguments | ForEach-Object { '"' + $_ + '"' }) -join ' ')
    startedUtc = $startedUtc
    completedUtc = [DateTime]::UtcNow.ToString('o')
    ownedRoot = $identity
    rootHasExited = $process.HasExited
    rootExitCode = $process.ExitCode
    stdoutTaskCompleted = $stdout.IsCompletedSuccessfully
    stderrTaskCompleted = $stderr.IsCompletedSuccessfully
    stdoutUtf8Bytes = [Text.Encoding]::UTF8.GetByteCount($outText)
    stderrUtf8Bytes = [Text.Encoding]::UTF8.GetByteCount($errText)
    observedChildIdentities = @()
    childObservationLimit = 'This Node runner does not sample descendants. The permission-bounded final auditor is denied child-process permission; assembler Git reads are not native .NET test execution.'
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath "$directory\receipt.json" -Encoding utf8
$outText
if ($errText.Length -gt 0)
{
    [Console]::Error.Write($errText)
}
Write-Output "NODE-RECORDED $Id PID=$($process.Id) EXIT=$($process.ExitCode)"
