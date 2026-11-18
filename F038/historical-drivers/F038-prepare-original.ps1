$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F038'
$preparation = Join-Path $run 'preparation-original-001'
$harness = Join-Path $run 'harness'
if (Test-Path -LiteralPath $preparation)
{
    throw 'Do not overwrite original preparation.'
}
$tests = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\original-existing-1\verified-result.json') | ConvertFrom-Json
$browser = Get-Content -Raw -LiteralPath (Join-Path $run 'sample-original\browser-result.json') | ConvertFrom-Json
if ($tests.actualPassed -ne 83 -or $tests.actualSkipped -ne 0 -or -not $browser.actualPassed)
{
    throw 'Actual original owning and browser validation must be green before preparation.'
}
New-Item -ItemType Directory -Path $preparation | Out-Null
New-Item -ItemType Directory -Path (Join-Path $preparation 'sources') | Out-Null
$selected = @(
    'src\Components\Components\src\RenderTree\RenderTreeDiffBuilder.cs',
    'src\Components\Components\src\RenderTree\Renderer.cs',
    'src\Components\Components\src\RenderTree\StackObjectPool.cs',
    'src\Components\Components\src\Rendering\RenderTreeBuilder.cs',
    'src\Components\Components\src\Rendering\ComponentState.cs',
    'src\Components\Components\src\Rendering\KeyedItemInfo.cs',
    'src\Components\Components\src\Rendering\RenderBatchBuilder.cs',
    'src\Components\Components\src\Rendering\RendererSynchronizationContext.cs',
    'src\Components\Components\src\RenderHandle.cs'
)
foreach ($source in $selected)
{
    Copy-Item -LiteralPath (Join-Path $root $source) -Destination (Join-Path $preparation 'sources')
}
Set-Location $root
. .\activate.ps1
$env:AUTOPERF_ASPNETCORE_ROOT = $root
$env:MSBUILDDISABLENODEREUSE = '1'
$commands = @()
$project = Join-Path $harness 'AutoPerf.Benchmarks.csproj'
foreach ($operation in 'restore', 'build')
{
    $arguments = @($operation, $project, '-m:2', '-nr:false', '--verbosity', 'quiet',
        '-p:UseIisNativeAssets=false', '-p:BuildProjectReferences=false', '-p:UseSharedCompilation=false')
    if ($operation -eq 'restore')
    {
        $arguments += @('--configfile', (Join-Path $root 'NuGet.config'))
    }
    else
    {
        $arguments += @('--configuration', 'Release', '--no-restore')
    }
    $started = [DateTime]::UtcNow
    & dotnet @arguments 1> (Join-Path $preparation "$operation.stdout") 2> (Join-Path $preparation "$operation.stderr")
    $nativeExit = $LASTEXITCODE
    $commands += [ordered]@{executable=(Get-Command dotnet).Source;arguments=$arguments;actualExitCode=$nativeExit;
        startedUtc=$started.ToString('O');finishedUtc=[DateTime]::UtcNow.ToString('O')}
    $commands | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $preparation 'commands.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $preparation "$operation.stdout") -Tail 18
    Get-Content -LiteralPath (Join-Path $preparation "$operation.stderr") -Tail 10
    if ($nativeExit -ne 0)
    {
        throw "Original harness $operation failed:$nativeExit; preserve this preparation and inspect the actual error."
    }
}
$output = Join-Path $harness 'bin\Release\net12.0'
$consumer = Join-Path $preparation 'consumer'
Copy-Item -LiteralPath $output -Destination $consumer -Recurse
$files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse | Sort-Object FullName | ForEach-Object {
    [ordered]@{path=[IO.Path]::GetRelativePath($consumer,$_.FullName);bytes=$_.Length;
        sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
})
[ordered]@{candidate='F038';variant='original';actualConsumerRoot=$consumer;files=$files
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $preparation 'consumer-closure.json') -Encoding utf8NoBOM
$owner = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Components\Release\net12.0\Microsoft.AspNetCore.Components.dll'
$ownerHash = (Get-FileHash -LiteralPath $owner -Algorithm SHA256).Hash
if ($ownerHash -cne $browser.actualOwnerSha256 -or $ownerHash -cne (Get-FileHash -LiteralPath (Join-Path $consumer 'Microsoft.AspNetCore.Components.dll') -Algorithm SHA256).Hash)
{
    throw 'Actual original browser, product and frozen consumer owner hashes must match.'
}
$emitter = Join-Path $harness 'SettingsPreservingEmitToolchain.cs'
$priorEmitter = Join-Path $PSScriptRoot 'autoperf-runs\F036\comparison-harness\SettingsPreservingEmitToolchain.cs'
if ([IO.File]::ReadAllText($emitter).Replace("`r`n","`n") -cne [IO.File]::ReadAllText($priorEmitter).Replace("`r`n","`n"))
{
    throw 'Settings-preserving emitter must match the previously validated implementation.'
}
$harnessFiles = @(Get-ChildItem -LiteralPath $harness -File | Sort-Object Name | ForEach-Object {
    [ordered]@{file=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
})
[ordered]@{candidate='F038';actualSuccessful=$true;actualConsumerFiles=$files.Count;actualOriginalOwnerSha256=$ownerHash;
    actualBrowserProductConsumerMatched=$true;actualEmitterUnchanged=$true;actualSelectedSourceFiles=$selected;actualHarnessFiles=$harnessFiles
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $preparation 'verified-preparation.json') -Encoding utf8NoBOM
Write-Output "F038:original harness built and frozen;$($files.Count)consumer files;browser/product/consumer owner identical."
