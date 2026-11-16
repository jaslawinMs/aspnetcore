$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
. (Join-Path $repo 'activate.ps1')
$run = Join-Path $PSScriptRoot 'autoperf-runs\F100'
$binary = Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'
$manifest = Get-Content (Join-Path $run 'original-manifest.json') -Raw | ConvertFrom-Json
foreach ($phase in @(
    @('frozen-original-characterization','--characterize',0),
    @('frozen-original-deadline-red','--require-deadlines',1),
    @('frozen-generic-reuse-equivalence-red','--require-generic-reuse-equivalence',1)
))
{
    $destination = Join-Path $run "verification\$($phase[0])"
    if (Test-Path -LiteralPath $destination) { throw 'Existing actual F100 probe must not be overwritten or repeated blindly.' }
    $a = @($binary,$phase[1],'--artifacts',$destination)
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    dotnet @a *> (Join-Path $run "$($phase[0]).log")
    $code = $LASTEXITCODE
    [ordered]@{candidate='F100';arguments=$a;actualExitCode=$code;expectedExitCode=$phase[2];
        ownerSha256=$manifest.target_assembly_sha256;harnessSha256=$manifest.benchmark_assembly_sha256;
        shippingSourceCandidate=$false;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')} |
        ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "$($phase[0])-command.json")
    if ($code -ne $phase[2]) { throw 'Actual constructor characterization/original deadline/public reset exits differ.' }
    $report = Get-Content (Join-Path $destination 'states\explicit-constructor-timeout-contract-resources.json') -Raw | ConvertFrom-Json
    $runtime = Get-Content (Join-Path $destination 'states\runtime.json') -Raw | ConvertFrom-Json
    if ($report.Observations.Count -ne 24 -or $report.Resources.Count -ne 3 -or $report.FreshRuntimeResources.Count -ne 3 -or
        $report.OriginalConstructorDeadlineFailures -ne 3 -or $report.GenericReuseControl.GenericReuseEquivalent -or
        $report.GenericReuseControl.IsShippingCandidate -or $runtime.ownerSha256 -cne $manifest.target_assembly_sha256 -or
        $runtime.harnessSha256 -cne $manifest.benchmark_assembly_sha256)
    {
        throw 'Actual loaded owner/harness/all24 constructor observations/resources/3 original deadline failures/reuse evidence required.'
    }
}
$testDirectory = Join-Path $run 'tests\original'
$names = @(
    'Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CancelsAsyncTask_AfterDefaultTimeout',
    'Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CompletesSuccessfullyBeforeTimeout',
    'Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_CancelsAsyncTasksWhenCancellationTokenFires',
    'Microsoft.JSInterop.JSRuntimeTest.InvokeAsync_DoesNotStartWorkWhenCancellationHasBeenRequested',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_InvokeAsync_CallsUnderlyingJSRuntimeInvokeAsync',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_Dispose_DisallowsFurtherInteropCalls',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException',
    'Microsoft.JSInterop.Tests.JSObjectReferenceTest.JSObjectReference_DisposeAsync_IgnoresJSDisconnectedException_OnMultipleCalls'
)
$filter = 'FullyQualifiedName~JSRuntimeExtensionsTest|' + (($names | ForEach-Object { "FullyQualifiedName=$_" }) -join '|')
$a = @('test','src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj','--no-restore','--no-build',
    '-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter',$filter,
    '--logger','trx;LogFileName=owning-original.trx','--results-directory',$testDirectory,'-v:q')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @a *> (Join-Path $run 'owning-tests-original.log')
$code = $LASTEXITCODE
[ordered]@{exitCode=$code;arguments=$a;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')} |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'owning-tests-original-command.json')
if ($code) { throw 'Actual existing original16-owning-test command failed.' }
& (Join-Path $PSScriptRoot 'F100-xml-audit.ps1') -RunRoot $run
$testRoot = Join-Path $repo 'artifacts\bin\Microsoft.JSInterop.Tests\Release\net12.0'
$testOwner = (Get-FileHash (Join-Path $testRoot 'Microsoft.JSInterop.dll')).Hash
if ($testOwner -cne $manifest.target_assembly_sha256) { throw 'Actual tested and exercised frozen owner differ.' }
[ordered]@{testOwnerSha256=$testOwner;frozenOriginalOwnerSha256=$manifest.target_assembly_sha256;
    testAssemblySha256=(Get-FileHash (Join-Path $testRoot 'Microsoft.JSInterop.Tests.dll')).Hash;
    note='Existing compiled baseline16-case test assembly reused via no-build;three exact test-source/PDB docs and local owning DLL matched,not assumed fresh.'} |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'test-owner-identities.json')
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$commands = [System.Collections.Generic.List[object]]::new()
foreach ($name in 'JSRuntimeExtensionsTest','JSRuntimeTest','JSObjectReferenceTest')
{
    $a = @($tool,'pdb',(Join-Path $testRoot 'Microsoft.JSInterop.Tests.pdb'),"$name.cs",
        (Join-Path $repo "src\Components\JSInterop\test\$name.cs"))
    dotnet @a > (Join-Path $run "owning-$name-source-pdb.json")
    $code = $LASTEXITCODE
    $commands.Add([ordered]@{exitCode=$code;arguments=$a;source="$name.cs"})
    if ($code) { throw "Actually executed existing owning test source/PDB differs:$name" }
}
$commands | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'owning-tests-source-pdb-commands.json')
node (Join-Path $PSScriptRoot 'F100-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Frozen closure changed after actual constructor probes/tests.' }
Write-Output 'F100 actual same frozen constructor harness24 observations/3warm/3fresh rows:characterization0,original deadline and public-reuse expected1;16 exact existing owner tests/three PDB docs/local owner and closure passed.'
