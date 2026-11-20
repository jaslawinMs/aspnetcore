. (Join-Path $PSScriptRoot 'Common.ps1')
$checkout = Join-Path $Root 'scratch\original'
$dotnet = Join-Path $checkout '.dotnet\dotnet.exe'
$project = Join-Path $Root 'probe\EmptyPath.csproj'
$out = Join-Path $Root 'scratch\empty-edge-common'
$properties = $Flags + @("-p:BaseIntermediateOutputPath=$(Join-Path $Root 'scratch\empty-edge-obj\')")
Activate-Checkout $checkout
$initial = Run-Native 'empty-edge-initial-no-restore' $dotnet (@('build',$project,'-c','Release','--no-restore','-o',$out,'-v:minimal') + $properties) $checkout
if ($initial.exitCode -ne 0)
{
    $diagnostic = Get-Content (Join-Path $Root 'evidence\empty-edge-initial-no-restore\stdout.txt') -Raw
    if ($diagnostic -notmatch 'NETSDK1004|project.assets.json|assets file') { throw 'Unexpected edge compile failure' }
    Activate-Checkout $checkout
    $restore = Run-Native 'empty-edge-restore-missing-assets' $dotnet (@('restore',$project,'--source',(Join-Path $Root 'scratch\empty-feed'),'--verbosity','minimal') + $properties) $checkout
    if ($restore.exitCode -ne 0) { throw 'Edge restore failed' }
    Activate-Checkout $checkout
    $build = Run-Native 'empty-edge-compile-once' $dotnet (@('build',$project,'-c','Release','--no-restore','-o',$out,'-v:minimal') + $properties) $checkout
    if ($build.exitCode -ne 0) { throw 'Edge compile failed' }
}
$common = @(Get-ChildItem $out -File | Where-Object Name -Like 'AutoPerf.F137.EmptyPath.VerifyOnly.*')
Save-Json (Join-Path $Root 'evidence\empty-edge-common-compiled-once.json') @($common | ForEach-Object {
    [ordered]@{file=$_.Name;sha256=(Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant();length=$_.Length}
})
foreach ($role in @('original','default'))
{
    $checkout = Join-Path $Root "scratch\$role"
    $image = Join-Path $Root "images\$role-final"
    if (Test-Path $image) { throw 'Preserve previous final image' }
    Copy-Item -LiteralPath (Join-Path $Root "images\$role-complete") -Destination $image -Recurse
    foreach($file in $common) { Copy-Item -LiteralPath $file.FullName -Destination $image }
    Save-Json (Join-Path $Root "evidence\$role-final-consumer-before-execution.json") @(Inventory $image)
    $results = Join-Path $Root "results\$role-empty-edge"
    New-Item -ItemType Directory -Path $results | Out-Null
    $config = Get-Content (Join-Path $image 'Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.runtimeconfig.json') -Raw | ConvertFrom-Json
    $version = $config.runtimeOptions.framework.version
    $exe = if($role -eq 'default') {$PrivateRuntime} else {Join-Path $checkout '.dotnet\dotnet.exe'}
    $runtimeRoot = Split-Path $exe -Parent
    Activate-Checkout $checkout
    $env:DOTNET_ROOT = $runtimeRoot
    $env:DOTNET_ROOT_X64 = $runtimeRoot
    $env:DOTNET_HOST_PATH = $exe
    $env:PATH = "$runtimeRoot;$env:PATH"
    $env:DOTNET_ROLL_FORWARD = 'Disable'
    $env:DOTNET_HOST_TRACE = '1'
    $env:DOTNET_HOST_TRACEFILE = Join-Path $results 'native-host-trace.log'
    $run = Run-Native "$role-empty-edge-producer" $exe @(
        'exec','--fx-version',$version,'--roll-forward','Disable',
        '--additional-deps',(Join-Path $image 'AutoPerf.F137.SourceClosure.deps.json'),
        (Join-Path $image 'AutoPerf.F137.EmptyPath.VerifyOnly.dll'),$role,(Join-Path $results 'producer.json')
    ) $checkout
    if($run.exitCode -ne 0) {throw 'Empty-edge producer validation failed'}
}
