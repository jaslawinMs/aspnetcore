param([Parameter(Mandatory)][string]$ScriptName, [Parameter(Mandatory)][string]$Label)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$scriptPath = Join-Path $PSScriptRoot $ScriptName
if (-not [IO.File]::Exists($scriptPath)) { throw 'Named data helper is missing' }
$info = [Diagnostics.ProcessStartInfo]::new()
$info.FileName = (Get-Command pwsh -CommandType Application).Source
$info.WorkingDirectory = $PSScriptRoot
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in @('-NoLogo','-NoProfile','-NonInteractive','-File',$scriptPath)) { $info.ArgumentList.Add($argument) }
$process = [Diagnostics.Process]::new()
$process.StartInfo = $info
$outputPath = Join-Path $PSScriptRoot ($Label + '.helper.stdout.bin')
$errorPath = Join-Path $PSScriptRoot ($Label + '.helper.stderr.bin')
$output = [IO.File]::Open($outputPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
$errorOutput = [IO.File]::Open($errorPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
$failure = $null
$exitCode = $null
$streamComplete = $false
$identity = $null
try
{
    $null = $process.Start()
    $identity = [ordered]@{ pid = $process.Id; startUtc = $process.StartTime.ToUniversalTime().ToString('o'); image = $info.FileName; script = $ScriptName; scriptSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($scriptPath))); cwd = $PSScriptRoot }
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot ($Label + '.helper.started.json')), ($identity | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
    $outTask = $process.StandardOutput.BaseStream.CopyToAsync($output)
    $errTask = $process.StandardError.BaseStream.CopyToAsync($errorOutput)
    if (-not $process.WaitForExit(360000))
    {
        if (-not $process.HasExited -and $process.StartTime.ToUniversalTime().ToString('o') -ceq $identity.startUtc) { Stop-Process -Id $process.Id }
        throw 'Data helper exceeded six-minute boundary; owned helper root only stopped, descendant status not inferred'
    }
    $exitCode = $process.ExitCode
    $streamComplete = [Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]@($outTask,$errTask),10000)
    if (-not $streamComplete) { throw 'Data helper streams not complete within bounded wait' }
}
catch { $failure = $_.Exception.ToString() }
finally
{
    $output.Dispose()
    $errorOutput.Dispose()
    $rootTerminal = $false
    try { $rootTerminal = $process.HasExited } catch {}
    $process.Dispose()
    $outBytes = [IO.File]::ReadAllBytes($outputPath)
    $errBytes = [IO.File]::ReadAllBytes($errorPath)
    $receipt = [ordered]@{ observedUtc = [DateTime]::UtcNow.ToString('o'); child = $identity; actualChildExitCode = $exitCode; childRootTerminalObserved = $rootTerminal; stdoutCompleteObserved = $streamComplete; stderrCompleteObserved = $streamComplete; stdoutBytes = $outBytes.Length; stdoutSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($outBytes)); stderrBytes = $errBytes.Length; stderrSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($errBytes)); failure = $failure; nestedGitGhRootsHaveSeparateObservationReceipts = $true; childRootOnlyNotUniversalDescendantClosure = $true; enclosingWrapperExitMustComeFromToolAfterReturn = $true }
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot ($Label + '.helper.receipt.json')), ($receipt | ConvertTo-Json -Depth 100), [Text.UTF8Encoding]::new($false))
}
[Console]::Write([Text.Encoding]::UTF8.GetString($outBytes))
if ($errBytes.Length -gt 0) { [Console]::Error.Write([Text.Encoding]::UTF8.GetString($errBytes)) }
if ($null -ne $failure) { throw $failure }
exit $exitCode
