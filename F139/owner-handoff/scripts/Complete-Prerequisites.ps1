param([ValidateSet('original', 'default')][string]$Role)
$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$checkout = Join-Path $scope $Role
$recorder = Join-Path $scope 'Invoke-Recorded.ps1'
$flags = @('-v:q', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
function Invoke-Native([string]$Id, [string[]]$CommandArguments) {
    Set-Location $script:checkout
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    . .\activate.ps1
    & $script:recorder -Id $Id -File 'C:\src\aspnetcore\.dotnet\dotnet.exe' -Arguments ($CommandArguments + $script:flags) -WorkingDirectory $script:checkout
}
if ($Role -eq 'default') {
    Invoke-Native '017-default-build-without-static-assets' @('build', 'src\Mvc\Mvc.Razor.RuntimeCompilation\test\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.csproj', '--no-restore')
    if ($global:RecordedExitCode -ne 0) { throw 'Default graph failed at the narrower boundary.' }
}
$project = 'src\Security\Authorization\Policy\src\Microsoft.AspNetCore.Authorization.Policy.csproj'
Invoke-Native "023-$Role-missing-runtime-dependency-no-restore" @('build', $project, '--no-restore')
if ($global:RecordedExitCode -ne 0) {
    $text = Get-Content "$scope\logs\023-$Role-missing-runtime-dependency-no-restore.stdout.log" -Raw
    if ($text -notmatch 'NETSDK1004|project.assets.json') { throw 'Missing runtime prerequisite build failed unexpectedly.' }
    Invoke-Native "024-$Role-restore-missing-runtime-dependency" @('restore', $project)
    if ($global:RecordedExitCode -ne 0) { throw 'Missing runtime prerequisite restore failed.' }
    Invoke-Native "025-$Role-build-missing-runtime-dependency" @('build', $project, '--no-restore')
    if ($global:RecordedExitCode -ne 0) { throw 'Missing runtime prerequisite build failed.' }
}
$image = Join-Path $scope "runtime-images\$Role"
New-Item -ItemType Directory -Force $image | Out-Null
$nativeBin = Join-Path $checkout 'artifacts\bin\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test\Debug\net12.0'
Get-ChildItem $nativeBin -File | Where-Object Extension -In '.dll', '.pdb', '.json' | Copy-Item -Destination $image
$copies = @()
foreach ($directory in Get-ChildItem "$checkout\artifacts\bin" -Directory) {
    $product = Join-Path $directory.FullName "Debug\net12.0\$($directory.Name).dll"
    if ((Test-Path $product) -and -not (Test-Path (Join-Path $image "$($directory.Name).dll"))) {
        Copy-Item $product -Destination $image
        $pdb = [IO.Path]::ChangeExtension($product, '.pdb')
        if (Test-Path $pdb) { Copy-Item $pdb -Destination $image }
        $copies += [ordered]@{ source = $product; target = Join-Path $image "$($directory.Name).dll"; sha256 = (Get-FileHash $product -Algorithm SHA256).Hash }
    }
}
$copies | ConvertTo-Json -Depth 6 | Set-Content "$scope\$Role-runtime-image-supplements.json" -Encoding utf8
