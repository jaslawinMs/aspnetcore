param(
    [Parameter(Mandatory)][ValidateSet('Original', 'Default')][string] $Role,
    [Parameter(Mandatory)][ValidateSet('Compile', 'Run')][string] $Mode,
    [Parameter(Mandatory)][string] $Attempt,
    [ValidatePattern('^common-[0-9]{3}$')][string] $Cohort = 'common-062'
)

$ErrorActionPreference = 'Stop'
if ($Attempt -cnotmatch '^[a-z0-9-]+$')
{
    throw 'An explicit unique attempt identifier is required.'
}
$parallel = Join-Path $PSScriptRoot 'autoperf-parallelism'
$root = Join-Path $parallel 'finding-F237-F238-059'
$common = Join-Path $root $Cohort
$policy = Get-Content -LiteralPath (Join-Path $parallel 'policy.json') -Raw | ConvertFrom-Json -DateKind String
if ((Test-Path -LiteralPath (Join-Path $parallel 'benchmark-exclusive.lease.json')) -or
    !$policy.workersMayBuildOrTest -or $policy.actualWorkerBuildHoldActive)
{
    throw 'The benchmark/build hold prevents this correctness command.'
}
$entry = Get-Content -LiteralPath (Join-Path $root 'entry-plan.json') -Raw | ConvertFrom-Json -DateKind String
$freeze = Get-Content -LiteralPath (Join-Path $common 'compile-plan.json') -Raw | ConvertFrom-Json -DateKind String
$source = Join-Path $common 'Program.cs'
if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -cne $freeze.actualSourceSha256 -or
    (Get-FileHash -LiteralPath (Join-Path $common 'fixture-plan.json') -Algorithm SHA256).Hash -cne $freeze.actualFixturePlanSha256 -or
    (Get-FileHash -LiteralPath (Join-Path $common 'compile.rsp') -Algorithm SHA256).Hash -cne $freeze.actualResponseFileSha256)
{
    throw 'Frozen common inputs changed.'
}
$output = Join-Path $common 'RuntimePageDiscovery.CommonProbe.dll'
if ($Mode -ceq 'Compile' -and ($Role -cne 'Original' -or (Test-Path -LiteralPath $output)))
{
    throw 'Compile once against Original references and preserve any existing output.'
}
if ($Mode -ceq 'Compile')
{
    $references = Get-Content -LiteralPath (Join-Path $common 'reference-inputs.json') -Raw | ConvertFrom-Json -DateKind String
    foreach ($reference in $references.actualReferences)
    {
        if ((Get-FileHash -LiteralPath $reference.file -Algorithm SHA256).Hash -cne $reference.sha256)
        {
            throw "A recorded compiler reference changed: $($reference.file)"
        }
    }
}
$out = Join-Path $root "common-$Role-$Mode-$Attempt"
if (Test-Path -LiteralPath $out)
{
    throw 'Preserve an existing common command attempt.'
}
New-Item -ItemType Directory -Path $out | Out-Null
[IO.File]::Copy($PSCommandPath, (Join-Path $out 'executed-common-command-064.ps1'), $false)
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:NUGET_PACKAGES = Join-Path $root "packages-$Role"
$env:DOTNET_CLI_HOME = Join-Path $root "cli-home-$Role"
$env:NUGET_SCRATCH = Join-Path $root "nuget-scratch-$Role"
$env:NUGET_HTTP_CACHE_PATH = Join-Path $root "nuget-http-$Role"
$env:NUGET_PLUGINS_CACHE_PATH = Join-Path $root "nuget-plugins-$Role"
$env:TEMP = Join-Path $root "temp-$Role"
$env:TMP = $env:TEMP
$graph = $entry.actualIndependentGraphs.$Role
Set-Location -LiteralPath $graph
. .\activate.ps1 1> (Join-Path $out 'activation.stdout.txt') 2> (Join-Path $out 'activation.stderr.txt')
$nativeBin = Join-Path $graph 'artifacts\bin\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test\Release\net12.0'
$arguments = if ($Mode -ceq 'Compile')
{
    @('exec', (Join-Path $graph '.dotnet\sdk\12.0.100-alpha.1.26557.102\Roslyn\bincore\csc.dll'),
        '/noconfig', ('@' + (Join-Path $common 'compile.rsp')))
}
else
{
    @('exec', '--depsfile', (Join-Path $nativeBin 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.deps.json'),
        '--runtimeconfig', (Join-Path $nativeBin 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.runtimeconfig.json'),
        $output, $Role, (Join-Path $common 'fixture-inputs'), (Join-Path $common 'fixture-plan.json'))
}
$executable = (Get-Command dotnet).Source
$info = [Diagnostics.ProcessStartInfo]::new($executable)
$info.WorkingDirectory = $nativeBin
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in $arguments)
{
    $info.ArgumentList.Add($argument)
}
$inputConsumerHash = if (Test-Path -LiteralPath $output) { (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash } else { $null }
$startedAt = [DateTime]::UtcNow.ToString('o')
$process = [Diagnostics.Process]::Start($info)
$creation = $process.StartTime.ToUniversalTime().ToString('o')
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$stdoutValue = $stdout.GetAwaiter().GetResult()
$stderrValue = $stderr.GetAwaiter().GetResult()
[IO.File]::WriteAllText((Join-Path $out 'stdout.txt'), $stdoutValue, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $out 'stderr.txt'), $stderrValue, [Text.UTF8Encoding]::new($false))
$receipt = [ordered]@{
    actualRole = $Role; actualMode = $Mode; actualAttempt = $Attempt; actualCohort = $Cohort
    actualStartedAt = $startedAt; actualCompletedAt = [DateTime]::UtcNow.ToString('o')
    actualActivatedGraph = $graph; actualExecutable = $executable; actualArguments = $arguments
    actualRootPid = $process.Id; actualRootCreationUtc = $creation
    actualRootTerminal = $process.HasExited; actualExitCode = $process.ExitCode
    actualStdoutDrained = $stdout.IsCompletedSuccessfully; actualStderrDrained = $stderr.IsCompletedSuccessfully
    actualInputConsumerSha256 = $inputConsumerHash
    actualOutputConsumerSha256 = if (Test-Path -LiteralPath $output) { (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash } else { $null }
    actualNoDescendantEnumerationOrUniversalClosureClaim = $true
    actualNoProcessStopNativeTestRerunCandidateCounterOrBenchmark = $true
    actualCompilerManagedRuntimeNotObservedByThisWrapper = $true
}
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $out 'exit.json') -Encoding utf8NoBOM
[pscustomobject]@{
    actualRole = $Role; actualMode = $Mode; actualExitCode = $process.ExitCode
    actualRootPid = $process.Id; actualOutput = $out
    actualConsumerSha256 = $receipt.actualOutputConsumerSha256
} | ConvertTo-Json
if ($process.ExitCode -ne 0)
{
    Get-Content -LiteralPath (Join-Path $out 'stdout.txt') -Tail 30
    Get-Content -LiteralPath (Join-Path $out 'stderr.txt') -Tail 20
    throw 'The actual common command failed; preserve this attempt and inspect its explicit boundary.'
}
