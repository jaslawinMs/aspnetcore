$ErrorActionPreference = 'Stop'
$session = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files'
$parallel = Join-Path $session 'autoperf-parallelism'
$original = Join-Path $parallel 'finding-F151-F152-005'
$sourceRoot = 'C:\src\autoperf-finding-F151-default'
$sourceConsumer = Join-Path $original 'outputs\default\repo-artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Debug\net12.0'
$canonicalConfig = Join-Path $original 'outputs\default\failed-canonical-existing-tests\Microsoft.AspNetCore.Mvc.Core.Test.runtimeconfig.json'
$runtimeRoot = Join-Path $parallel 'finding-F145-005\runtime-default'
$runtimeExe = Join-Path $runtimeRoot 'dotnet.exe'
$platformVersion = '12.0.0-alpha.1.26568.110'
$runtimeFile = Join-Path $runtimeRoot "shared\Microsoft.NETCore.App\$platformVersion\System.Private.CoreLib.dll"
$vstest = 'C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102\vstest.console.dll'
$output = Join-Path $parallel 'finding-F151-F152-canonical-007'
if (Test-Path -LiteralPath $output)
{
    throw 'Preserve the previous canonical follow-up; use a new attempt path.'
}
foreach ($required in @($sourceConsumer, $canonicalConfig, $runtimeExe, $runtimeFile, $vstest))
{
    if (-not (Test-Path -LiteralPath $required))
    {
        throw "Missing explicit prerequisite: $required"
    }
}
$manifest = Join-Path $original 'frozen-files.json'
$manifestHashBefore = (Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash
if ((Get-FileHash -LiteralPath $runtimeExe -Algorithm SHA256).Hash -ne 'E7A8B31264AF6F112132138EFD5A5AED405FF81741640F77AE718082F6817B20' -or
    (Get-FileHash -LiteralPath $runtimeFile -Algorithm SHA256).Hash -ne '0DC3FC5D0DC4422CDC82F106336DE0F82B07F42B20674E4D8BE2D997B6E7DE20')
{
    throw 'Private existing runtime identity changed.'
}
New-Item -ItemType Directory -Path $output | Out-Null
$consumer = Join-Path $output 'consumer'
Copy-Item -LiteralPath $sourceConsumer -Destination $consumer -Recurse
Copy-Item -LiteralPath $canonicalConfig -Destination (Join-Path $consumer 'Microsoft.AspNetCore.Mvc.Core.Test.runtimeconfig.json')
$owner = Join-Path $consumer 'Microsoft.AspNetCore.Mvc.Core.dll'
if ((Get-FileHash -LiteralPath $owner -Algorithm SHA256).Hash -ne '5D7628E0E23C9378BC8A264C81AB04C65F7A44AA3495792881202B95157DBEF8')
{
    throw 'Copied default test consumer has a different source owner.'
}
$config = Get-Content -LiteralPath (Join-Path $consumer 'Microsoft.AspNetCore.Mvc.Core.Test.runtimeconfig.json') -Raw | ConvertFrom-Json
if ($config.runtimeOptions.framework.version -ne $platformVersion)
{
    throw 'Canonical requested runtime changed.'
}
$files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse | ForEach-Object {
    [ordered]@{
        file = [IO.Path]::GetRelativePath($consumer, $_.FullName)
        bytes = $_.Length
        sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    }
})
$files | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $output 'consumer-inputs.json') -Encoding utf8NoBOM
$results = Join-Path $output 'results'
$names = @(
    'Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvokerProviderTest.OnExecuting_ConfiguresModelState_WithMvcOptions'
    'Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvokerTest.AddingValueProviderFactory_AtResourceFilter_IsAvailableInControllerContext'
    'Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvokerTest.DeletingValueProviderFactory_AtResourceFilter_IsNotAvailableInControllerContext'
)
$filter = ($names | ForEach-Object { "FullyQualifiedName=$_" }) -join '|'
$arguments = @(
    'exec', '--fx-version', $platformVersion, '--roll-forward', 'Disable', $vstest
    (Join-Path $consumer 'Microsoft.AspNetCore.Mvc.Core.Test.dll')
    "/TestCaseFilter:$filter"
    '/Logger:trx;LogFileName=canonical-default.trx'
    "/ResultsDirectory:$results"
    "/Diag:$(Join-Path $output 'vstest-diag.log')"
)
$start = [Diagnostics.ProcessStartInfo]::new($runtimeExe)
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
$start.WorkingDirectory = $sourceRoot
foreach ($argument in $arguments)
{
    $start.ArgumentList.Add($argument)
}
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
Push-Location $sourceRoot
try
{
    . .\activate.ps1
}
finally
{
    Pop-Location
}
foreach ($name in @('DOTNET_ROOT', 'DOTNET_ROOT_X64'))
{
    $start.Environment[$name] = $runtimeRoot
}
$start.Environment['DOTNET_HOST_PATH'] = $runtimeExe
$start.Environment['PATH'] = "$runtimeRoot;$env:PATH"
$start.Environment['DOTNET_GENERATE_ASPNET_CERTIFICATE'] = 'false'
$start.Environment['DOTNET_ADD_GLOBAL_TOOLS_TO_PATH'] = 'false'
$start.Environment['MSBUILDDISABLENODEREUSE'] = '1'
$start.Environment['DOTNET_ROLL_FORWARD'] = 'Disable'
$start.Environment['DOTNET_HOST_TRACE'] = '1'
$start.Environment['DOTNET_HOST_TRACEFILE'] = Join-Path $output 'dotnet-host-trace.log'
$started = [DateTime]::UtcNow.ToString('o')
$process = [Diagnostics.Process]::Start($start)
$stdout = $process.StandardOutput.ReadToEndAsync()
$stderr = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$stdout.Result | Set-Content -LiteralPath (Join-Path $output 'stdout.txt') -Encoding utf8NoBOM
$stderr.Result | Set-Content -LiteralPath (Join-Path $output 'stderr.txt') -Encoding utf8NoBOM
$invocation = [ordered]@{
    activation = '. .\activate.ps1'
    workingDirectory = $sourceRoot
    executable = $runtimeExe
    arguments = $arguments
    actualOwnedPid = $process.Id
    actualExitCode = $process.ExitCode
    actualChildAwaitedToExit = $true
    startedAt = $started
    completedAt = [DateTime]::UtcNow.ToString('o')
    processOnlyRuntimeRoot = $runtimeRoot
    canonicalRequestedRuntime = $platformVersion
    exactCanonicalRuntimeConfigCopiedWithoutEditing = $true
    originalFrozenManifestUnchanged = ((Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash -eq $manifestHashBefore)
    noRuntimeOrSdkInstalled = $true
}
$invocation | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $output 'invocation.json') -Encoding utf8NoBOM
if ($process.ExitCode -ne 0)
{
    throw "Canonical follow-up exit $($process.ExitCode): $($stderr.Result) $($stdout.Result)"
}
[xml]$trx = Get-Content -LiteralPath (Join-Path $results 'canonical-default.trx') -Raw
$rows = @($trx.TestRun.Results.UnitTestResult)
if ($rows.Count -ne 3 -or @($rows | Where-Object outcome -ne 'Passed').Count -ne 0 -or
    (Compare-Object @($rows | ForEach-Object testName | Sort-Object) @($names | Sort-Object)))
{
    throw 'Required exact three canonical test rows did not all pass.'
}
$trace = Get-Content -LiteralPath (Join-Path $output 'dotnet-host-trace.log') -Raw
if (-not $trace.Contains((Join-Path $runtimeRoot "shared\Microsoft.NETCore.App\$platformVersion")))
{
    throw 'Canonical runtime-directory resolution was not retained in the actual native host trace.'
}
$outcome = [ordered]@{
    actualCanonicalDefaultTestRowsPassed = 3
    actualExactTestNames = $names
    actualCanonicalRuntimeConfigPreserved = $true
    actualRequestedAndHostResolvedRuntime = $platformVersion
    actualNativeHostTraceRetained = $true
    actualSourceOwnerSha256 = (Get-FileHash -LiteralPath $owner -Algorithm SHA256).Hash
    actualNoChangesToOriginal230FileCapsule = $invocation.originalFrozenManifestUnchanged
    actualNoRuntimeOrSdkInstalled = $true
    actualNoBenchmarkOrAllocationCounterExecuted = $true
    actualNativeChildTerminal = $true
}
$outcome | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $output 'verified-canonical-default.json') -Encoding utf8NoBOM
$outcome | ConvertTo-Json -Depth 8
