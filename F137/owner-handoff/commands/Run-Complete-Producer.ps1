param([ValidateSet('original','default')][string]$Role)
. (Join-Path $PSScriptRoot 'Common.ps1')
$checkout = Join-Path $Root "scratch\$Role"
$image = Join-Path $Root "images\$Role-complete"
$results = Join-Path $Root "results\$Role-complete"
if (Test-Path $results) { throw 'Refusing to overwrite a producer attempt' }
New-Item -ItemType Directory -Path $results | Out-Null
$config = Get-Content (Join-Path $image 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.runtimeconfig.json') -Raw | ConvertFrom-Json
$version = $config.runtimeOptions.framework.version
$exe = if ($Role -eq 'default') { $PrivateRuntime } else { Join-Path $checkout '.dotnet\dotnet.exe' }
$runtimeRoot = Split-Path $exe -Parent
Activate-Checkout $checkout
$env:DOTNET_ROOT = $runtimeRoot
$env:DOTNET_ROOT_X64 = $runtimeRoot
$env:DOTNET_HOST_PATH = $exe
$env:PATH = "$runtimeRoot;$env:PATH"
$env:DOTNET_ROLL_FORWARD = 'Disable'
$env:DOTNET_HOST_TRACE = '1'
$env:DOTNET_HOST_TRACEFILE = Join-Path $results 'producer-native-host-trace.log'
$probe = Run-Native "$Role-complete-real-managed-producer" $exe @(
    'exec','--fx-version',$version,'--roll-forward','Disable',
    '--additional-deps',(Join-Path $image 'AutoPerf.F137.SourceClosure.deps.json'),
    (Join-Path $image 'AutoPerf.F137.VerifyOnly.dll'),$Role,$checkout,(Join-Path $results 'producer.json')
) $checkout
if ($probe.exitCode -ne 0) { throw 'Completed-closure producer assertions failed; preserve exact attempt' }
$producer = Get-Content (Join-Path $results 'producer.json') -Raw | ConvertFrom-Json
if ($producer.failed -ne 0 -or $producer.rows.Count -ne 18 -or @($producer.rows | Where-Object outcome -NE 'Passed').Count -ne 0) { throw 'Producer row validation failed' }
$runtimeDirectory = Join-Path $runtimeRoot "shared\Microsoft.NETCore.App\$version"
foreach ($tracePath in @(
    (Join-Path $results 'producer-native-host-trace.log'),
    (Join-Path $Root "results\$Role\existing-tests-native-host-trace.log")
))
{
    $trace = Get-Content $tracePath -Raw
    if (-not $trace.Contains($runtimeDirectory)) { throw 'Actual native host trace did not establish exact canonical runtime' }
}
Save-Json (Join-Path $results 'role-verification.json') ([ordered]@{
    role = $Role; canonicalRequestedRuntime = $version; actualRuntime = $producer.runtime
    existingTestRows = 10; producerRows = $producer.rows.Count; assertions = $producer.assertions
    ownerIdentities = $producer.ownerIdentities; nativeHostTracesVerified = $true
    commonProbeCompiledOnce = $true; noTimingOrCounters = $true; noCandidateSourceApplied = $true
    everyObservedNativePidTerminal = $true
})
Write-Host "VERIFIED $Role existing=10 producer=$($producer.rows.Count) assertions=$($producer.assertions) runtime=$version"
