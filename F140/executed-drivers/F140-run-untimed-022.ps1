param(
    [Parameter(Mandatory)]
    [ValidateSet('Original37', 'Default90')]
    [string] $Role,
    [Parameter(Mandatory)]
    [ValidateSet('build-common-norestore', 'restore-common', 'build-common-afterrestore', 'functional', 'native')]
    [string] $Mode,
    [ValidateSet('baseline', 'candidate')]
    [string] $Variant = 'baseline'
)

$ErrorActionPreference = 'Stop'
$session = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files'
$parallel = Join-Path $session 'autoperf-parallelism'
$output = Join-Path $parallel 'finding-F140-implementation-019'
$graph = if ($Role -eq 'Original37') { 'C:\src\ap-F140-o013' } else { 'C:\src\ap-F140-d013' }
$runtime = if ($Role -eq 'Original37') { '12.0.0-alpha.1.26562.105' } else { '12.0.0-alpha.1.26569.107' }
$policy = Get-Content -LiteralPath (Join-Path $parallel 'policy.json') -Raw | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -or -not $policy.workersMayBuildOrTest -or (Test-Path -LiteralPath (Join-Path $parallel 'benchmark-exclusive.lease.json')))
{
    throw 'Untimed native work is not permitted during a benchmark lease or HOLD.'
}
if ($Mode -like '*common*' -and ($Role -ne 'Original37' -or $Variant -ne 'baseline'))
{
    throw 'One common compile uses only the one frozen Original baseline reference.'
}
$work = Join-Path $output "invocations\$Role-$Variant-$Mode-022"
if (Test-Path -LiteralPath $work)
{
    throw 'Invocation already exists; preserve evidence rather than replay.'
}
New-Item -ItemType Directory -Path $work | Out-Null
Set-Location -LiteralPath $graph
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
. .\activate.ps1
$common = Join-Path $output 'common-image'
$image = Join-Path $output "images\$Role\$Variant"
$project = Join-Path $output 'common-inputs\AutoPerf.SignalR.Probe.csproj'
$obj = Join-Path $output 'common-obj\'
$result = Join-Path $work 'functional-result.json'
$arguments = switch ($Mode)
{
    'build-common-norestore' { @('build', $project, '--no-restore', '-c', 'Release', '-o', $common, "-p:BaseIntermediateOutputPath=$obj", '-m:1', '-nr:false', '-v:q') }
    'restore-common' { @('restore', $project, "-p:BaseIntermediateOutputPath=$obj", '-m:1', '-nr:false', '-v:q') }
    'build-common-afterrestore' { @('build', $project, '--no-restore', '-c', 'Release', '-o', $common, "-p:BaseIntermediateOutputPath=$obj", '-m:1', '-nr:false', '-v:q') }
    'functional' { @('exec', '--fx-version', $runtime, (Join-Path $common 'AutoPerf.SignalR.Probe.dll'), 'functional', $Role, $image, $result) }
    'native' {
        $names = @(
            'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests+Protocol.ClientSendsHandshakeMessageWhenStartingConnection',
            'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests+Protocol.SendAsyncSendsANonBlockingInvocationMessage',
            'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.StreamIntsToServer',
            'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.UploadStreamCancellationSendsStreamComplete',
            'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.UploadStreamErrorSendsStreamComplete',
            'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.ActiveUploadStreamWhenConnectionClosesObservesException',
            'Microsoft.AspNetCore.SignalR.Client.Tests.HubConnectionTests.InvocationCanCompleteBeforeStreamCompletes'
        )
        $filter = ($names | ForEach-Object { "FullyQualifiedName=$_" }) -join '|'
        @('vstest', (Join-Path $image 'Microsoft.AspNetCore.SignalR.Client.Tests.dll'),
            "--TestCaseFilter:$filter", '--logger:trx;LogFileName=F140-native-022.trx', "--ResultsDirectory:$work")
    }
}
$info = [Diagnostics.ProcessStartInfo]::new((Join-Path $graph '.dotnet\dotnet.exe'))
$info.WorkingDirectory = $graph
$info.UseShellExecute = $false
$info.RedirectStandardOutput = $true
$info.RedirectStandardError = $true
$info.CreateNoWindow = $true
foreach ($argument in $arguments)
{
    $info.ArgumentList.Add($argument)
}
$info.Environment.Remove('AUTOPERF_F140_GATE_ADMITTED') | Out-Null
$info.Environment.Remove('DOTNET_TieredCompilation') | Out-Null
if ($Mode -in @('native', 'functional'))
{
    $info.Environment['DOTNET_STARTUP_HOOKS'] = Join-Path $common 'AutoPerf.SignalR.Probe.dll'
    $info.Environment['AUTOPERF_IDENTITY_DIR'] = Join-Path $work 'identities'
}
else
{
    $info.Environment.Remove('DOTNET_STARTUP_HOOKS') | Out-Null
    $info.Environment.Remove('AUTOPERF_IDENTITY_DIR') | Out-Null
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $info
if (-not $process.Start())
{
    throw 'Owned native process did not start.'
}
$started = @{
    role = $Role
    variant = $Variant
    mode = $Mode
    pid = $process.Id
    graph = $graph
    image = $image
    startedUtc = [DateTime]::UtcNow.ToString('o')
    file = $info.FileName
    arguments = $arguments
    actualActivatedExactRepositoryEnvironment = $true
    actualNormalRuntimeSelectionForNativeTests = $true
    actualExplicitFxVersionOnlyForCommonConsumer = $runtime
    actualTimingOrAllocationCounter = $false
}
$started | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $work 'started.json') -Encoding utf8
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExitAsync().GetAwaiter().GetResult() | Out-Null
$outText = $stdout.GetAwaiter().GetResult()
$errText = $stderr.GetAwaiter().GetResult()
[IO.File]::WriteAllText((Join-Path $work 'stdout.txt'), $outText)
[IO.File]::WriteAllText((Join-Path $work 'stderr.txt'), $errText)
$completed = $started.Clone()
$completed.completedUtc = [DateTime]::UtcNow.ToString('o')
$completed.exitCode = $process.ExitCode
$completed.actualRootAwaited = $true
$completed.actualStdoutAwaited = $true
$completed.actualStderrAwaited = $true
$completed | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $work 'completed.json') -Encoding utf8
$code = $process.ExitCode
$process.Dispose()
Write-Output $outText
Write-Output $errText
$completed | ConvertTo-Json -Depth 10
if ($code -ne 0)
{
    throw "Owned $Mode exited $code. Preserve this attempt; do not call failed compilation an executed test."
}
