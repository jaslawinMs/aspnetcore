$ErrorActionPreference = 'Stop'
$parallel = Join-Path $PSScriptRoot 'autoperf-parallelism'
$common = Join-Path $parallel 'finding-F180-F204-046\common-049'
$plan = Get-Content -LiteralPath (Join-Path $common 'compile-plan.json') -Raw | ConvertFrom-Json -DateKind String
if (Test-Path -LiteralPath (Join-Path $common 'compiler.exit.json')) { throw 'Preserve an existing compilation attempt.' }
if (Test-Path -LiteralPath (Join-Path $parallel 'benchmark-exclusive.lease.json')) { throw 'A benchmark lease exists.' }
$policy = Get-Content -LiteralPath (Join-Path $parallel 'policy.json') -Raw | ConvertFrom-Json -DateKind String
if (!$policy.workersMayBuildOrTest -or $policy.actualWorkerBuildHoldActive) { throw 'Native work is held.' }
[IO.File]::Copy($PSCommandPath, (Join-Path $common 'executed-compile-common-049.ps1'), $false)
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
Set-Location -LiteralPath $plan.actualActivationGraph
. .\activate.ps1
$info = [Diagnostics.ProcessStartInfo]::new((Get-Command dotnet).Source)
$info.UseShellExecute = $false
$info.CreateNoWindow = $true
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
foreach ($argument in @('exec', $plan.actualCompilerDll, '/noconfig', "@$($plan.actualResponseFile)")) { $info.ArgumentList.Add($argument) }
$process = [Diagnostics.Process]::Start($info)
$created = $process.StartTime.ToUniversalTime().ToString('o')
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
[IO.File]::WriteAllText((Join-Path $common 'compiler.stdout.txt'), $stdout.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $common 'compiler.stderr.txt'), $stderr.GetAwaiter().GetResult(), [Text.UTF8Encoding]::new($false))
[pscustomobject]@{
    executable = $info.FileName; arguments = @($info.ArgumentList); pid = $process.Id; creationUtc = $created
    actualRootTerminal = $process.HasExited; actualExitCode = $process.ExitCode
    actualStdoutDrained = $stdout.IsCompletedSuccessfully; actualStderrDrained = $stderr.IsCompletedSuccessfully
    actualChildCompilerNotSeparatelyInventoried = $true
    actualCompilerDllSha256 = (Get-FileHash -LiteralPath $plan.actualCompilerDll -Algorithm SHA256).Hash
    actualResponseFileSha256 = (Get-FileHash -LiteralPath $plan.actualResponseFile -Algorithm SHA256).Hash
    actualNoRestoreOrBenchmarkOrCandidate = $true
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $common 'compiler.exit.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $common 'compiler.stdout.txt')
Get-Content -LiteralPath (Join-Path $common 'compiler.stderr.txt')
if ($process.ExitCode -ne 0) { throw 'Common consumer compilation failed; preserve exact source and streams.' }
