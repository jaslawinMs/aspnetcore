param([switch] $NativeWorkReleased)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = $PSScriptRoot
if (-not $NativeWorkReleased)
{
    throw 'Build/test/host work is gated. Supply -NativeWorkReleased only with actual scoped authorization and no effective F134 coordinator hold.'
}
if (-not (Test-Path -LiteralPath (Join-Path $root 'native-release.json')))
{
    throw 'Record actual scoped authorization or coordinator release in native-release.json before starting native work.'
}
$release = Get-Content -Raw -LiteralPath (Join-Path $root 'native-release.json') | ConvertFrom-Json
if ($release.released -ne $true)
{
    throw 'The recorded hold has not been released.'
}
$repo = Join-Path $root 'repo'
$requiredSdk = '12.0.100-alpha.1.26557.102'
$runtime = '12.0.0-alpha.1.26565.104'
$spec = Get-Content -Raw -LiteralPath (Join-Path $repo 'global.json') | ConvertFrom-Json
if ($spec.sdk.version -ne $requiredSdk)
{
    throw 'Unexpected SDK pin.'
}
foreach ($required in @(".dotnet\sdk\$requiredSdk\dotnet.dll", ".dotnet\shared\Microsoft.NETCore.App\$runtime\System.Private.CoreLib.dll"))
{
    if (-not (Test-Path -LiteralPath (Join-Path $repo $required)))
    {
        throw "Required immutable installed toolchain input missing: $required"
    }
}
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
foreach ($directory in @($env:DOTNET_CLI_HOME, $env:NUGET_PACKAGES, $env:NUGET_HTTP_CACHE_PATH, $env:NUGET_PLUGINS_CACHE_PATH, $env:TEMP, (Join-Path $root 'out\empty-feed')))
{
    $null = New-Item -ItemType Directory -Force -Path $directory
}
$records = [Collections.Generic.List[object]]::new()
$knownChildren = @{}
$commandIndex = 0
function Invoke-RecordedDotnet
{
    param([string] $Name, [string[]] $Arguments, [int] $ExpectedExitCode = 0)
    if ((Get-Content -Raw -LiteralPath (Join-Path $root 'native-release.json') | ConvertFrom-Json).released -ne $true)
    {
        throw 'Hold reinstated: do not launch another child.'
    }
    Set-Location -LiteralPath $repo
    . .\activate.ps1
    $script:commandIndex++
    $id = '{0:D2}-{1}' -f $script:commandIndex, $Name
    $stdout = Join-Path $root "logs\$id.stdout.txt"
    $stderr = Join-Path $root "logs\$id.stderr.txt"
    $escaped = $Arguments | ForEach-Object { '"' + ($_ -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"' }
    $started = [DateTime]::UtcNow.ToString('O')
    $process = Start-Process -FilePath (Join-Path $repo '.dotnet\dotnet.exe') -ArgumentList ($escaped -join ' ') -WorkingDirectory $repo -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    $knownChildren[$process.Id] = [ordered]@{ processId = $process.Id; owner = $id; kind = 'direct-dotnet'; terminal = $false }
    while (-not $process.HasExited)
    {
        foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($process.Id)" -ErrorAction SilentlyContinue))
        {
            $knownChildren[[int]$child.ProcessId] = [ordered]@{ processId = [int]$child.ProcessId; owner = $id; parentProcessId = $process.Id; image = $child.Name; kind = 'observed-direct-child'; terminal = $false }
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
        arguments = $Arguments
        processId = $process.Id
        startedUtc = $started
        completedUtc = [DateTime]::UtcNow.ToString('O')
        exitCode = $exitCode
        expectedExitCode = $ExpectedExitCode
        stdout = $stdout
        stderr = $stderr
        runtimeForManagedOwnerExecution = $runtime
        terminal = $process.HasExited
    }
    $records.Add($record)
    $records | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $root 'logs\commands.json') -Encoding utf8
    Write-Output "$id PID=$($process.Id) exit=$exitCode"
    if ($exitCode -ne $ExpectedExitCode)
    {
        Get-Content -LiteralPath $stdout -Tail 30
        Get-Content -LiteralPath $stderr -Tail 30
        throw "$id failed with exit $exitCode (expected $ExpectedExitCode)."
    }
}

try
{
    node (Join-Path $root 'Verify-Inputs.cjs') 'evidence\inputs-before-execution.json'
    if ($LASTEXITCODE -ne 0)
    {
        throw 'Immutable input verification failed.'
    }
    Invoke-RecordedDotnet -Name 'sdk-version' -Arguments @('--version')
    $actualSdk = (Get-Content -Raw -LiteralPath (Join-Path $root 'logs\01-sdk-version.stdout.txt')).Trim()
    if ($actualSdk -ne $requiredSdk)
    {
        throw 'Actual SDK version did not match the repository pin.'
    }
    $assemblyInputs = Join-Path $root 'inputs\default\assemblies'
    $project = Join-Path $root 'consumer\F134.Characterization.csproj'
    $obj = Join-Path $root 'out\common\obj'
    $commonBin = Join-Path $root 'out\common\bin'
    $properties = @(
        "-p:SourceBuiltAssemblies=$assemblyInputs",
        "-p:BaseIntermediateOutputPath=$obj\",
        "-p:MSBuildProjectExtensionsPath=$obj\",
        "-p:OutputPath=$commonBin\",
        '-p:ImportDirectoryBuildProps=false',
        '-p:ImportDirectoryBuildTargets=false',
        '-p:UseIisNativeAssets=false',
        '-p:BuildNodeJS=false',
        '-p:StaticWebAssetsEnabled=false',
        '-p:UseSharedCompilation=false',
        '/m:2',
        '/nr:false'
    )
    Invoke-RecordedDotnet -Name 'common-restore' -Arguments (@('restore', $project, '--source', (Join-Path $root 'out\empty-feed'), '--verbosity', 'minimal') + $properties)
    Invoke-RecordedDotnet -Name 'common-build' -Arguments (@('build', $project, '-c', 'Release', '--no-restore', '--verbosity', 'minimal', "-bl:$root\logs\common-consumer.binlog;ProjectImports=None") + $properties)
    foreach ($variant in @('original', 'default'))
    {
        $assemblyInputs = Join-Path $root "inputs\$variant\assemblies"
        $bin = Join-Path $root "out\$variant\bin"
        if (Test-Path -LiteralPath $bin)
        {
            throw 'Never replace an existing variant execution image.'
        }
        $null = New-Item -ItemType Directory -Force -Path (Split-Path -Path $bin -Parent)
        Copy-Item -LiteralPath $commonBin -Destination $bin -Recurse
        Get-ChildItem -LiteralPath $assemblyInputs -File | Copy-Item -Destination $bin -Force
        Copy-Item -LiteralPath (Join-Path $root "inputs\$variant\owner.pdb") -Destination (Join-Path $bin 'Microsoft.AspNetCore.TestHost.pdb')
        $env:DOTNET_HOST_TRACE = '1'
        $env:DOTNET_HOST_TRACEFILE = Join-Path $root "logs\$variant-host-resolution.txt"
        Invoke-RecordedDotnet -Name "$variant-verify" -Arguments @('exec', '--fx-version', $runtime, (Join-Path $bin 'AutoPerf.F134.Characterization.dll'), '--verify-only', (Join-Path $root "inputs\$variant\payload.json"))
        Remove-Item Env:DOTNET_HOST_TRACE
        Remove-Item Env:DOTNET_HOST_TRACEFILE
    }
    Invoke-RecordedDotnet -Name 'refuse-unapproved-mode' -ExpectedExitCode 2 -Arguments @('exec', '--fx-version', $runtime, (Join-Path $root 'out\default\bin\AutoPerf.F134.Characterization.dll'), '--measurement-not-authorized')
    $testRun = Join-Path $root 'out\existing-tests'
    if (Test-Path -LiteralPath $testRun)
    {
        throw 'Never replace an existing test execution output directory.'
    }
    Copy-Item -LiteralPath (Join-Path $root 'inputs\existing-test-closure') -Destination $testRun -Recurse
    $runtimeConfig = Join-Path $testRun 'Microsoft.AspNetCore.TestHost.Tests.runtimeconfig.json'
    $config = Get-Content -Raw -LiteralPath $runtimeConfig | ConvertFrom-Json
    $before = (Get-FileHash -LiteralPath $runtimeConfig -Algorithm SHA256).Hash
    $declared = $config.runtimeOptions.framework.version
    $config.runtimeOptions.framework.version = $runtime
    $config | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $runtimeConfig -Encoding utf8
    [ordered]@{
        file = $runtimeConfig
        originalInputNotModified = Join-Path $root 'inputs\existing-test-closure\Microsoft.AspNetCore.TestHost.Tests.runtimeconfig.json'
        previousSha256 = $before
        declaredUnavailableRuntime = $declared
        explicitPrivateOutputRuntime = $runtime
        outputSha256 = (Get-FileHash -LiteralPath $runtimeConfig -Algorithm SHA256).Hash
        reason = 'A new private run-output runtimeconfig overlay selects the installed runtime explicitly. Accepted input closure and repository config files are unchanged.'
    } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $root 'logs\existing-test-runtime-overlay.json') -Encoding utf8
    $filter = 'FullyQualifiedName=Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.CanAcceptWebSocket|FullyQualifiedName=Microsoft.AspNetCore.TestHost.TestClientTests.WebSocketSubProtocolsWorks|FullyQualifiedName=Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.ConnectAsync_ShouldSetRequestProperties|FullyQualifiedName=Microsoft.AspNetCore.TestHost.Tests.WebSocketClientTests.VerifyWebSocketAndUpgradeFeatures'
    Invoke-RecordedDotnet -Name 'existing-tests' -Arguments @(
        'exec', '--fx-version', $runtime,
        (Join-Path $repo ".dotnet\sdk\$requiredSdk\vstest.console.dll"),
        (Join-Path $testRun 'Microsoft.AspNetCore.TestHost.Tests.dll'),
        "/TestCaseFilter:$filter",
        '/Logger:trx;LogFileName=F134-existing.trx',
        "/ResultsDirectory:$root\logs\test-results",
        "/Diag:$root\logs\vstest-diagnostic.txt"
    )
}
finally
{
    node (Join-Path $root 'Verify-Inputs.cjs') 'evidence\inputs-after-execution.json'
    foreach ($record in $knownChildren.Values)
    {
        $record.terminal = $null -eq (Get-Process -Id $record.processId -ErrorAction SilentlyContinue)
    }
    [ordered]@{
        recordedUtc = [DateTime]::UtcNow.ToString('O')
        ownedObservedProcesses = @($knownChildren.Values | Sort-Object processId)
        allObservedTerminal = @($knownChildren.Values | Where-Object { -not $_.terminal }).Count -eq 0
        processSamplingBoundary = 'Direct dotnet PIDs and observed direct descendants; short-lived compiler children may escape sampling. No name-based termination is used.'
    } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $root 'logs\process-terminal.json') -Encoding utf8
}
