. (Join-Path $PSScriptRoot 'Common.ps1')
foreach ($role in @('original','default'))
{
    $receipt = Join-Path $Root "evidence\$role-build-native-test-graph\result.json"
    if (-not (Test-Path $receipt) -or (Get-Content $receipt -Raw | ConvertFrom-Json).exitCode -ne 0)
    {
        throw "Native role build not successfully complete: $role"
    }
    $source = Join-Path $Root "scratch\$role\artifacts\bin\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test\Release\net12.0"
    $target = Join-Path $Root "images\$role-producer"
    if (Test-Path $target) { throw 'Consumer image already exists' }
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Recurse
    Save-Json (Join-Path $Root "evidence\$role-native-consumer-staged.json") ([ordered]@{
        source = $source; target = $target; inventory = @(Inventory $target)
        canonicalTestRuntimeConfig = Get-Content (Join-Path $target 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.runtimeconfig.json') -Raw | ConvertFrom-Json
    })
}
$checkout = Join-Path $Root 'scratch\original'
$dotnet = Join-Path $checkout '.dotnet\dotnet.exe'
$project = Join-Path $Root 'probe\F137Probe.csproj'
$commonOutput = Join-Path $Root 'scratch\common-probe'
$intermediate = Join-Path $Root 'scratch\probe-obj\'
$properties = $Flags + @("-p:BaseIntermediateOutputPath=$intermediate")
Activate-Checkout $checkout
$initial = Run-Native 'common-probe-build-initial-no-restore' $dotnet (@('build',$project,'-c','Release','--no-restore','-o',$commonOutput,'-v:minimal') + $properties) $checkout
if ($initial.exitCode -ne 0)
{
    $diagnostic = Get-Content (Join-Path $Root 'evidence\common-probe-build-initial-no-restore\stdout.txt') -Raw
    if ($diagnostic -notmatch 'NETSDK1004|project.assets.json|assets file') { throw 'Unexpected probe compile failure; preserve and inspect' }
    $emptyFeed = Join-Path $Root 'scratch\empty-feed'
    New-Item -ItemType Directory -Path $emptyFeed -Force | Out-Null
    Activate-Checkout $checkout
    $restore = Run-Native 'common-probe-restore-missing-assets' $dotnet (@('restore',$project,'--source',$emptyFeed,'--verbosity','minimal') + $properties) $checkout
    if ($restore.exitCode -ne 0) { throw 'Probe reference-pack restore failed' }
    Activate-Checkout $checkout
    $build = Run-Native 'common-probe-compile-once' $dotnet (@('build',$project,'-c','Release','--no-restore','-o',$commonOutput,'-v:minimal') + $properties) $checkout
    if ($build.exitCode -ne 0) { throw 'Probe compile failed' }
}
$fixtureProject = Join-Path $Root 'probe\Fixture.csproj'
$fixtureIntermediate = Join-Path $Root 'scratch\fixture-obj\'
$fixtureProperties = $Flags + @("-p:BaseIntermediateOutputPath=$fixtureIntermediate")
Activate-Checkout $checkout
$initialFixture = Run-Native 'fixture-build-initial-no-restore' $dotnet (@('build',$fixtureProject,'-c','Release','--no-restore',"-p:Variant=HIGH",'-o',(Join-Path $Root 'scratch\fixture-HIGH'),'-v:minimal') + $fixtureProperties) $checkout
if ($initialFixture.exitCode -ne 0)
{
    $diagnostic = Get-Content (Join-Path $Root 'evidence\fixture-build-initial-no-restore\stdout.txt') -Raw
    if ($diagnostic -notmatch 'NETSDK1004|project.assets.json|assets file') { throw 'Unexpected fixture compile failure' }
    Activate-Checkout $checkout
    $restore = Run-Native 'fixture-restore-missing-assets' $dotnet (@('restore',$fixtureProject,'-p:Variant=HIGH','--source',(Join-Path $Root 'scratch\empty-feed'),'--verbosity','minimal') + $fixtureProperties) $checkout
    if ($restore.exitCode -ne 0) { throw 'Fixture restore failed' }
}
foreach ($variant in @('HIGH','EXACT','CASE','SLASH','SAMEPART','EMPTYID','NULLID','WRONGTYPE','TURKISH'))
{
    if ($variant -eq 'HIGH' -and $initialFixture.exitCode -eq 0) { continue }
    Activate-Checkout $checkout
    $build = Run-Native "fixture-$variant-compile-once" $dotnet (@('build',$fixtureProject,'-c','Release','--no-restore',"-p:Variant=$variant",'-o',(Join-Path $Root "scratch\fixture-$variant"),'-v:minimal') + $fixtureProperties) $checkout
    if ($build.exitCode -ne 0) { throw "Fixture compile failed: $variant" }
}
$commonFiles = @()
$commonFiles += @(Get-ChildItem $commonOutput -File | Where-Object Name -Like 'AutoPerf.F137.VerifyOnly.*')
foreach ($variant in @('HIGH','EXACT','CASE','SLASH','SAMEPART','EMPTYID','NULLID','WRONGTYPE','TURKISH'))
{
    $commonFiles += @(Get-ChildItem (Join-Path $Root "scratch\fixture-$variant") -File | Where-Object Extension -In @('.dll','.pdb') | Where-Object Name -Like "AutoPerf.F137.Fixture.$variant.*")
}
foreach ($role in @('original','default'))
{
    $target = Join-Path $Root "images\$role-producer"
    foreach ($file in $commonFiles) { Copy-Item -LiteralPath $file.FullName -Destination $target }
    Save-Json (Join-Path $Root "evidence\$role-complete-consumer-before-execution.json") @(Inventory $target)
}
Save-Json (Join-Path $Root 'evidence\compile-once-common-consumer.json') @($commonFiles | ForEach-Object {
    [ordered]@{ file = $_.Name; actualCompileOutputPath = $_.FullName; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(); length = $_.Length }
})
Write-Host 'READY common consumer and fixtures compiled once and byte-reused across roles'
