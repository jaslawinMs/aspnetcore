param([ValidateSet('original','default')][string]$Role)
. (Join-Path $PSScriptRoot 'Common.ps1')
$checkout = Join-Path $Root "scratch\$Role"
$image = Join-Path $Root "images\$Role-producer"
$results = Join-Path $Root "results\$Role"
New-Item -ItemType Directory -Path $results -Force | Out-Null
$configPath = Join-Path $image 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.runtimeconfig.json'
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$version = $config.runtimeOptions.framework.version
if (-not $version) { throw 'Inspect canonical framework request instead of guessing' }
$exe = if ($Role -eq 'default') { $PrivateRuntime } else { Join-Path $checkout '.dotnet\dotnet.exe' }
$runtimeRoot = Split-Path $exe -Parent
$runtimeDirectory = Join-Path $runtimeRoot "shared\Microsoft.NETCore.App\$version"
if (-not (Test-Path $runtimeDirectory)) { throw "Unchanged canonical requested runtime unavailable: $runtimeDirectory" }
$canonicalConfigHash = (Get-FileHash $configPath -Algorithm SHA256).Hash.ToLowerInvariant()
$vstest = Join-Path $SdkRoot 'sdk\12.0.100-alpha.1.26557.102\vstest.console.dll'
$filter = @(
    'FullyQualifiedName~CompileAsync_ReturnsPrecompiledViews'
    'FullyQualifiedName~CompileAsync_PerformsCaseInsensitiveLookupsForPrecompiledViews'
    'FullyQualifiedName~CompileAsync_NormalizesPathSeparatorForPaths'
    'FullyQualifiedName~CompileAsync_ReturnsResultWithNullAttribute_IfFileIsNotFoundInFileSystem'
) -join '|'
Activate-Checkout $checkout
$env:DOTNET_ROOT = $runtimeRoot
$env:DOTNET_ROOT_X64 = $runtimeRoot
$env:DOTNET_HOST_PATH = $exe
$env:PATH = "$runtimeRoot;$env:PATH"
$env:DOTNET_ROLL_FORWARD = 'Disable'
$env:DOTNET_HOST_TRACE = '1'
$env:DOTNET_HOST_TRACEFILE = Join-Path $results 'existing-tests-native-host-trace.log'
$test = Run-Native "$Role-existing-tests-canonical" $exe @(
    'exec','--fx-version',$version,'--roll-forward','Disable',$vstest,
    (Join-Path $image 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.dll'),
    "/TestCaseFilter:$filter",'/Logger:trx;LogFileName=existing.trx',"/ResultsDirectory:$results",
    "/Diag:$(Join-Path $results 'vstest-diag.log')"
) $checkout
if ($test.exitCode -ne 0) { throw 'Existing native tests failed; preserve exact attempt' }
[xml]$trx = Get-Content (Join-Path $results 'existing.trx') -Raw
$rows = @($trx.TestRun.Results.UnitTestResult)
$expectedMethods = [ordered]@{
    'CompileAsync_ReturnsPrecompiledViews' = 1
    'CompileAsync_PerformsCaseInsensitiveLookupsForPrecompiledViews' = 3
    'CompileAsync_PerformsCaseInsensitiveLookupsForPrecompiledViews_WithNonNormalizedPaths' = 1
    'CompileAsync_NormalizesPathSeparatorForPaths' = 4
    'CompileAsync_ReturnsResultWithNullAttribute_IfFileIsNotFoundInFileSystem' = 1
}
$observed = @()
foreach ($row in $rows)
{
    $definition = @($trx.TestRun.TestDefinitions.UnitTest | Where-Object id -EQ $row.testId)
    if ($definition.Count -ne 1) { throw 'Missing unique TRX definition for result row' }
    $method = $definition[0].TestMethod.name
    $observed += [ordered]@{ testName = $row.testName; method = $method; outcome = $row.outcome; testId = $row.testId; executionId = $row.executionId }
    if ($row.outcome -ne 'Passed') { throw "Existing result was not passed: $($row.testName)" }
}
foreach ($method in $expectedMethods.Keys)
{
    $actual = @($observed | Where-Object { $_.method -eq $method }).Count
    if ($actual -ne $expectedMethods[$method]) { throw "Expected $($expectedMethods[$method]) exact rows for $method, observed $actual" }
}
if ($rows.Count -ne 10) { throw 'Expected exactly ten native existing-test rows including every theory row' }
Save-Json (Join-Path $results 'existing-tests-parsed.json') ([ordered]@{
    rows = $observed; count = $rows.Count; allPassed = $true; expectedRowsByMethod = $expectedMethods
    requestedRuntime = $version; actualHostResolutionTrace = 'existing-tests-native-host-trace.log'
    canonicalConfigUnchanged = ((Get-FileHash $configPath -Algorithm SHA256).Hash.ToLowerInvariant() -eq $canonicalConfigHash)
})
Activate-Checkout $checkout
$env:DOTNET_ROOT = $runtimeRoot
$env:DOTNET_ROOT_X64 = $runtimeRoot
$env:DOTNET_HOST_PATH = $exe
$env:PATH = "$runtimeRoot;$env:PATH"
$env:DOTNET_ROLL_FORWARD = 'Disable'
$env:DOTNET_HOST_TRACE = '1'
$env:DOTNET_HOST_TRACEFILE = Join-Path $results 'producer-native-host-trace.log'
$probe = Run-Native "$Role-real-managed-producer" $exe @(
    'exec','--fx-version',$version,'--roll-forward','Disable',
    (Join-Path $image 'AutoPerf.F137.VerifyOnly.dll'),$Role,$checkout,(Join-Path $results 'producer.json')
) $checkout
if ($probe.exitCode -ne 0) { throw 'Producer contract assertions failed' }
$producer = Get-Content (Join-Path $results 'producer.json') -Raw | ConvertFrom-Json
if ($producer.failed -ne 0 -or @($producer.rows | Where-Object outcome -NE 'Passed').Count -ne 0) { throw 'Producer row validation failed' }
$traces = @('existing-tests-native-host-trace.log','producer-native-host-trace.log')
foreach ($traceName in $traces)
{
    $trace = Get-Content (Join-Path $results $traceName) -Raw
    if (-not $trace.Contains($runtimeDirectory)) { throw "Actual host trace missing exact requested runtime directory: $traceName" }
}
Save-Json (Join-Path $results 'role-verification.json') ([ordered]@{
    role = $Role; canonicalRequestedRuntime = $version; actualRuntime = $producer.runtime
    canonicalConfigSha256 = $canonicalConfigHash; nativeHostTracesVerified = $true
    existingTestRows = $rows.Count; producerRows = $producer.rows.Count; assertions = $producer.assertions
    ownerIdentities = $producer.ownerIdentities
    noTimingOrCounters = $true; noCandidateSourceApplied = $true
    everyObservedNativePidTerminal = $true
})
Write-Host "VERIFIED $Role existing=$($rows.Count) producer=$($producer.rows.Count) assertions=$($producer.assertions) runtime=$version"
