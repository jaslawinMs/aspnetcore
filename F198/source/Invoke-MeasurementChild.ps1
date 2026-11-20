param([Parameter(Mandatory)][string]$InvocationPath)

$ErrorActionPreference = 'Stop'
$request = Get-Content -LiteralPath $InvocationPath -Raw | ConvertFrom-Json
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_TieredCompilation = '0'
$env:COMPlus_TieredCompilation = '0'
Set-Location -LiteralPath $request.activationSourceRoot
. .\activate.ps1
$dotnet = Join-Path $request.activationSourceRoot '.dotnet\dotnet.exe'
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = $dotnet
$start.WorkingDirectory = $request.activationSourceRoot
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
foreach ($argument in $request.arguments)
{
    $start.ArgumentList.Add([string]$argument)
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $start
$startedAt = [DateTime]::UtcNow.ToString('o')
if (-not $process.Start())
{
    throw 'The exact owned measurement child could not start.'
}
$ownedPid = $process.Id
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$exitCode = $process.ExitCode
[IO.File]::WriteAllText($request.stdoutPath, $stdout.GetAwaiter().GetResult())
[IO.File]::WriteAllText($request.stderrPath, $stderr.GetAwaiter().GetResult())
$process.Dispose()
[ordered]@{
    activation = '. .\activate.ps1'; executable = $dotnet; arguments = $request.arguments
    actualOwnedChildPid = $ownedPid; actualExitCode = $exitCode; actualChildAwaitedToExit = $true
    startedAt = $startedAt; completedAt = [DateTime]::UtcNow.ToString('o')
    processOnlyRuntimeConfiguration = @{ DOTNET_TieredCompilation = '0'; COMPlus_TieredCompilation = '0' }
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $request.lifecyclePath
exit $exitCode
