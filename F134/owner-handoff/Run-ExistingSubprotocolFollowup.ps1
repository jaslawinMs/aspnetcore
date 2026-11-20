$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = $PSScriptRoot
if (-not (Get-Content -Raw -LiteralPath (Join-Path $root 'native-release.json') | ConvertFrom-Json).released)
{
    throw 'No scoped F134 native-work authorization.'
}
$repo = Join-Path $root 'repo'
$runtime = '12.0.0-alpha.1.26565.104'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_HOME = Join-Path $root 'out\cli-home'
$env:NUGET_PACKAGES = Join-Path $root 'out\packages'
$env:NUGET_HTTP_CACHE_PATH = Join-Path $root 'out\http-cache'
$env:NUGET_PLUGINS_CACHE_PATH = Join-Path $root 'out\plugins-cache'
$env:TEMP = Join-Path $root 'out\scratch'
$env:TMP = $env:TEMP
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
$env:DOTNET_NOLOGO = '1'
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
$env:DISABLE_CUSTOM_PROMPT = '1'
$env:DOTNET_HOST_TRACE = '1'
$env:DOTNET_HOST_TRACEFILE = Join-Path $root 'logs\existing-subprotocol-host-resolution.txt'
Set-Location -LiteralPath $repo
. .\activate.ps1
$id = '08-existing-subprotocol-test'
$stdout = Join-Path $root "logs\$id.stdout.txt"
$stderr = Join-Path $root "logs\$id.stderr.txt"
if (Test-Path -LiteralPath $stdout)
{
    throw 'Do not replace an earlier follow-up attempt.'
}
$arguments = @(
    'exec', '--fx-version', $runtime,
    (Join-Path $repo '.dotnet\sdk\12.0.100-alpha.1.26557.102\vstest.console.dll'),
    (Join-Path $root 'out\existing-tests\Microsoft.AspNetCore.TestHost.Tests.dll'),
    '/TestCaseFilter:FullyQualifiedName=Microsoft.AspNetCore.TestHost.TestClientTests.WebSocketSubProtocolsWorks',
    '/Logger:trx;LogFileName=F134-subprotocol.trx',
    "/ResultsDirectory:$root\logs\test-results-subprotocol",
    "/Diag:$root\logs\vstest-subprotocol-diagnostic.txt"
)
$escaped = $arguments | ForEach-Object { '"' + ($_ -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"' }
$started = [DateTime]::UtcNow.ToString('O')
$process = Start-Process -FilePath (Join-Path $repo '.dotnet\dotnet.exe') -ArgumentList ($escaped -join ' ') -WorkingDirectory $repo -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
$observed = [Collections.Generic.List[object]]::new()
$observed.Add([ordered]@{ processId = $process.Id; owner = $id; kind = 'direct-dotnet'; terminal = $false })
$seen = @{}
while (-not $process.HasExited)
{
    foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($process.Id)" -ErrorAction SilentlyContinue))
    {
        if (-not $seen.ContainsKey([int]$child.ProcessId))
        {
            $seen[[int]$child.ProcessId] = $true
            $observed.Add([ordered]@{ processId = [int]$child.ProcessId; owner = $id; parentProcessId = $process.Id; image = $child.Name; kind = 'observed-direct-child'; terminal = $false })
        }
    }
    $process.WaitForExit(250) | Out-Null
    $process.Refresh()
}
$process.WaitForExit()
$exitCode = $process.ExitCode
$record = [ordered]@{
    id = $id
    executable = Join-Path $repo '.dotnet\dotnet.exe'
    workingDirectory = $repo
    activation = '. .\activate.ps1'
    arguments = $arguments
    processId = $process.Id
    startedUtc = $started
    completedUtc = [DateTime]::UtcNow.ToString('O')
    exitCode = $exitCode
    expectedExitCode = 0
    stdout = $stdout
    stderr = $stderr
    runtimeForManagedOwnerExecution = $runtime
    terminal = $process.HasExited
}
$commands = @(Get-Content -Raw -LiteralPath (Join-Path $root 'logs\commands.json') | ConvertFrom-Json)
ConvertTo-Json -InputObject @($commands + $record) -Depth 9 | Set-Content -LiteralPath (Join-Path $root 'logs\commands.json') -Encoding utf8
$prior = Get-Content -Raw -LiteralPath (Join-Path $root 'logs\process-terminal.json') | ConvertFrom-Json
$all = @($prior.ownedObservedProcesses) + @($observed)
foreach ($item in $all)
{
    $item.terminal = $null -eq (Get-Process -Id $item.processId -ErrorAction SilentlyContinue)
}
[ordered]@{
    recordedUtc = [DateTime]::UtcNow.ToString('O')
    ownedObservedProcesses = $all
    allObservedTerminal = @($all | Where-Object { -not $_.terminal }).Count -eq 0
    processSamplingBoundary = $prior.processSamplingBoundary
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $root 'logs\process-terminal.json') -Encoding utf8
Get-Content -LiteralPath $stdout -Tail 12
Write-Output "$id PID=$($process.Id) exit=$exitCode"
if ($exitCode -ne 0)
{
    throw 'The missing subprotocol test did not complete successfully.'
}
