param(
    [Parameter(Mandatory)]
    [ValidateSet('Analyze', 'Verify')]
    [string] $Stage
)

$ErrorActionPreference = 'Stop'
$parallel = Join-Path $PSScriptRoot 'autoperf-parallelism'
$root = Join-Path $parallel 'finding-ValidationAliases-080'
$prefix = Join-Path $parallel ('Validation-' + $Stage + '-080')
if (Test-Path -LiteralPath ($prefix + '.exit.json'))
{
    throw 'Preserve every completed source-analysis invocation.'
}

$name = if ($Stage -eq 'Analyze') { 'Validation-analyze-alias-source-080.mjs' } else { 'Validation-verify-alias-source-080.mjs' }
$arguments = [Collections.Generic.List[string]]::new()
$arguments.Add('--permission')
$arguments.Add('--allow-fs-read=' + $root)
if ($Stage -eq 'Analyze')
{
    $arguments.Add('--allow-fs-write=' + (Join-Path $root 'alias-observations.json'))
}
$arguments.Add((Join-Path $root ('tools\' + $name)))
$arguments.Add($root)
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
    actualSourceInputsReadOnly = $true
    actualOnlyAnalysisArtifactWriteAllowed = ($Stage -eq 'Analyze')
    actualNoChildWorkerOrAddonGrant = $true
    actualNoProductCompilerTestConsumerOrPerformanceInvocation = $true
    actualNoCandidateCanonicalVerdictOrBudgetAuthorization = $true
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath ($prefix + '.exit.json') -Encoding utf8NoBOM
Get-Content -LiteralPath ($prefix + '.stdout.txt') -Tail 35
Get-Content -LiteralPath ($prefix + '.stderr.txt') -Tail 30
exit $process.ExitCode
