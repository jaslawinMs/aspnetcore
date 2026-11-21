param(
    [Parameter(Mandatory)][string]$Helper,
    [Parameter(Mandatory)][string]$Name
)
$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$start = [Diagnostics.ProcessStartInfo]::new((Get-Command pwsh).Source)
$start.WorkingDirectory = $base
$start.UseShellExecute = $false
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$arguments = @('-NoLogo', '-NoProfile', '-File', (Join-Path $base $Helper))
foreach ($arg in $arguments) { $start.ArgumentList.Add($arg) }
$process = [Diagnostics.Process]::new()
$process.StartInfo = $start
$null = $process.Start()
$creation = $process.StartTime.ToUniversalTime().ToString('o')
$outPath = Join-Path $base "$Name.outer.stdout.raw.bin"
$errPath = Join-Path $base "$Name.outer.stderr.raw.bin"
$out = [IO.File]::Open($outPath, [IO.FileMode]::CreateNew)
$err = [IO.File]::Open($errPath, [IO.FileMode]::CreateNew)
$outTask = $process.StandardOutput.BaseStream.CopyToAsync($out)
$errTask = $process.StandardError.BaseStream.CopyToAsync($err)
$process.WaitForExit()
$null = $outTask.GetAwaiter().GetResult()
$null = $errTask.GetAwaiter().GetResult()
$out.Dispose()
$err.Dispose()
$receipt = @{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    outerPid = $PID
    outerCreationUtc = [Diagnostics.Process]::GetCurrentProcess().StartTime.ToUniversalTime().ToString('o')
    childPid = $process.Id; childCreationUtc = $creation
    childWaitComplete = $true; childExitCode = $process.ExitCode
    argv = @($start.FileName) + $arguments; cwd = $base
    stdoutBytes = (Get-Item -LiteralPath $outPath).Length
    stdoutSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($outPath)))
    stderrBytes = (Get-Item -LiteralPath $errPath).Length
    stderrSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($errPath)))
    noSelfProspectiveExit = $true
}
if ($Name -ceq 'seal')
{
    foreach ($entry in @(
        @{key = 'byteIndex'; file = 'seal.byte-index.json'},
        @{key = 'sealReceipt'; file = 'seal.receipt.json'},
        @{key = 'handoff'; file = 'HANDOFF.md'}
    ))
    {
        $path = Join-Path $base $entry.file
        if ([IO.File]::Exists($path))
        {
            $receipt[$entry.key] = @{
                path = $path; size = (Get-Item -LiteralPath $path).Length
                sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($path)))
            }
        }
    }
}
$receiptPath = Join-Path $base "$Name.outer-wait.json"
$bytes = [Text.Encoding]::UTF8.GetBytes(($receipt | ConvertTo-Json -Depth 20) + "`n")
$stream = [IO.File]::Open($receiptPath, [IO.FileMode]::CreateNew)
try { $stream.Write($bytes) } finally { $stream.Dispose() }
[Console]::Write([IO.File]::ReadAllText($outPath))
[Console]::Error.Write([IO.File]::ReadAllText($errPath))
if ($Name -ceq 'seal')
{
    [Console]::WriteLine((@{
        terminalReceipt = $receiptPath
        terminalReceiptSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($receiptPath)))
        actualWaitedChildExitCode = $process.ExitCode
        outerPid = $PID
        childPid = $process.Id
        note = 'These are actual completed child waits. The outer tool return, when delivered, establishes outer termination.'
    } | ConvertTo-Json -Depth 10 -Compress))
}
exit $process.ExitCode
