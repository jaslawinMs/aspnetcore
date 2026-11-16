$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
. (Join-Path $repo 'activate.ps1')
$run = Join-Path $PSScriptRoot 'autoperf-runs\F099'
$binary = Join-Path $run 'binaries\original\AutoPerf.Benchmarks.dll'
$manifest = Get-Content (Join-Path $run 'original-manifest.json') -Raw | ConvertFrom-Json
foreach ($phase in @(
    @('frozen-original-compatible','--verify',0),
    @('frozen-generic-reuse-equivalence-red','--require-generic-reuse-equivalence',1)
))
{
    $destination = Join-Path $run "verification\$($phase[0])"
    if (Test-Path -LiteralPath $destination) { throw 'Existing actual F099 probe must not be overwritten or repeated blindly.' }
    $a = @($binary,$phase[1],'--artifacts',$destination)
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    dotnet @a *> (Join-Path $run "$($phase[0]).log")
    $code = $LASTEXITCODE
    [ordered]@{candidate='F099';arguments=$a;actualExitCode=$code;expectedExitCode=$phase[2];
        ownerSha256=$manifest.target_assembly_sha256;harnessSha256=$manifest.benchmark_assembly_sha256;
        shippingSourceCandidate=$false;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')} |
        ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "$($phase[0])-command.json")
    if ($code -ne $phase[2]) { throw 'Actual void original compatibility/public-reuse counterexample exit differs.' }
    $report = Get-Content (Join-Path $destination 'states\explicit-void-timeout-contract-resources.json') -Raw | ConvertFrom-Json
    $runtime = Get-Content (Join-Path $destination 'states\runtime.json') -Raw | ConvertFrom-Json
    if ($report.Observations.Count -ne 20 -or $report.Resources.Count -ne 3 -or $report.FreshRuntimeResources.Count -ne 3 -or
        $report.GenericReuseControl.GenericReuseEquivalent -or $report.GenericReuseControl.IsShippingCandidate -or
        $runtime.ownerSha256 -cne $manifest.target_assembly_sha256 -or $runtime.harnessSha256 -cne $manifest.benchmark_assembly_sha256)
    {
        throw 'Actual loaded owner/harness/all20 void observations/resource/reuse evidence required.'
    }
}
$testDirectory = Join-Path $run 'tests\original'
$a = @('test','src\Components\JSInterop\test\Microsoft.JSInterop.Tests.csproj','--no-restore','--no-build',
    '-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter','FullyQualifiedName~JSRuntimeExtensionsTest',
    '--logger','trx;LogFileName=owning-original.trx','--results-directory',$testDirectory,'-v:q')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @a *> (Join-Path $run 'owning-tests-original.log')
$code = $LASTEXITCODE
[ordered]@{exitCode=$code;arguments=$a;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')} |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'owning-tests-original-command.json')
if ($code) { throw 'Actual existing original eight-owner-test command failed.' }
& (Join-Path $PSScriptRoot 'F099-xml-audit.ps1') -RunRoot $run
$testRoot = Join-Path $repo 'artifacts\bin\Microsoft.JSInterop.Tests\Release\net12.0'
$testOwner = (Get-FileHash (Join-Path $testRoot 'Microsoft.JSInterop.dll')).Hash
if ($testOwner -cne $manifest.target_assembly_sha256) { throw 'Actual tested and exercised frozen owner differ.' }
[ordered]@{testOwnerSha256=$testOwner;frozenOriginalOwnerSha256=$manifest.target_assembly_sha256;
    testAssemblySha256=(Get-FileHash (Join-Path $testRoot 'Microsoft.JSInterop.Tests.dll')).Hash;
    note='Existing compiled baseline8-case test assembly reused via no-build;exact source/PDB/local owning DLL matched before claiming coverage.'} |
    ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run 'test-owner-identities.json')
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$a = @($tool,'pdb',(Join-Path $testRoot 'Microsoft.JSInterop.Tests.pdb'),'JSRuntimeExtensionsTest.cs',
    (Join-Path $repo 'src\Components\JSInterop\test\JSRuntimeExtensionsTest.cs'))
dotnet @a > (Join-Path $run 'owning-tests-source-pdb.json')
$code = $LASTEXITCODE
[ordered]@{exitCode=$code;arguments=$a} | ConvertTo-Json -Depth 5 |
    Set-Content (Join-Path $run 'owning-tests-source-pdb-command.json')
if ($code) { throw 'Actually executed existing owner-test source/PDB differs.' }
node (Join-Path $PSScriptRoot 'F099-closure.mjs') $run --verify
if ($LASTEXITCODE) { throw 'Frozen closure changed after actual void probes/tests.' }
Write-Output 'F099 actual same frozen void harness20 observations/3warm/3fresh rows:original exit0,generic equivalence expected exit1;8 exact existing owner tests/PDB/local owner and62/20 closure passed.'
