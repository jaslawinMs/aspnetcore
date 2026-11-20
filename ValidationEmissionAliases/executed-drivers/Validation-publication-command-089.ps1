param(
    [Parameter(Mandatory)]
    [ValidateSet('Prepare', 'Offline', 'Publish')]
    [string] $Stage
)

$ErrorActionPreference = 'Stop'
$directory = Join-Path $PSScriptRoot 'autoperf-published-results\ValidationEmissionAliases'
$run = Join-Path $PSScriptRoot 'autoperf-runs\ValidationEmissionAliases'
$prefix = if ($Stage -eq 'Prepare')
{
    Join-Path $PSScriptRoot 'autoperf-parallelism\Validation-prepare-089'
}
else
{
    Join-Path $run ($Stage.ToLowerInvariant() + '-089')
}
if (Test-Path -LiteralPath ($prefix + '.exit.json'))
{
    throw 'Preserve every publication invocation; do not blindly replay a partial operation.'
}

$arguments = [Collections.Generic.List[string]]::new()
switch ($Stage)
{
    'Prepare'
    {
        $arguments.Add((Join-Path $PSScriptRoot 'Validation-prepare-publication-089.mjs'))
    }
    'Offline'
    {
        $arguments.Add((Join-Path $directory 'verify.mjs'))
        $arguments.Add($directory)
    }
    'Publish'
    {
        $arguments.Add((Join-Path $PSScriptRoot 'autoperf-publish-bounded-outcome-033.mjs'))
        $arguments.Add((Join-Path $run 'publication-config.json'))
    }
}
$info = [Diagnostics.ProcessStartInfo]::new('C:\Program Files\nodejs\node.exe')
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in $arguments)
{
    $info.ArgumentList.Add($argument)
}
$process = [Diagnostics.Process]::Start($info)
$creation = $process.StartTime.ToUniversalTime().ToString('o')
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
[IO.File]::WriteAllText(($prefix + '.stdout.txt'), $stdout.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText(($prefix + '.stderr.txt'), $stderr.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath $PSCommandPath -Destination ($prefix + '.executed-command.ps1') -ErrorAction Stop
[ordered]@{
    actualStage = $Stage
    actualExecutable = $info.FileName
    actualArguments = $arguments.ToArray()
    actualRootPid = $process.Id
    actualRootCreationUtc = $creation
    actualRootTerminal = $process.HasExited
    actualExitCode = $process.ExitCode
    actualStdoutDrained = $stdout.IsCompletedSuccessfully
    actualStderrDrained = $stderr.IsCompletedSuccessfully
    actualNoProductCompilerTestConsumerOrPerformanceInvocation = $true
    actualNoCandidatePrWindowOrCanonicalBudgetAuthorization = $true
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath ($prefix + '.exit.json') -Encoding utf8NoBOM
Get-Content -LiteralPath ($prefix + '.stdout.txt') -Tail 75
Get-Content -LiteralPath ($prefix + '.stderr.txt') -Tail 40
exit $process.ExitCode
