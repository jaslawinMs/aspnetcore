$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$recorder = Join-Path $scope 'Invoke-Recorded.ps1'
$checkout = Join-Path $scope 'original'
$project = Join-Path $scope 'consumer\F139.EmitProbe.csproj'
$flags = @('-v:q', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
function Invoke-Common([string]$Id, [string[]]$CommandArguments) {
    Set-Location $script:checkout
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    . .\activate.ps1
    & $script:recorder -Id $Id -File 'C:\src\aspnetcore\.dotnet\dotnet.exe' -Arguments ($CommandArguments + $script:flags) -WorkingDirectory $script:checkout
}
Invoke-Common '020-common-no-restore' @('build', $project, '--no-restore')
if ($global:RecordedExitCode -ne 0) {
    $text = Get-Content "$scope\logs\020-common-no-restore.stdout.log" -Raw
    if ($text -notmatch 'NETSDK1004|project.assets.json') { throw 'Common no-restore failed for an unexpected reason; do not silently recompile.' }
    Invoke-Common '021-common-restore' @('restore', $project)
    if ($global:RecordedExitCode -ne 0) { throw 'Common restore failed.' }
    Invoke-Common '022-common-build-once' @('build', $project, '--no-restore')
    if ($global:RecordedExitCode -ne 0) { throw 'Common compilation failed; preserve this attempt and report exact compile-once limitation.' }
}
$bin = Join-Path $scope 'consumer\bin\Debug\net12.0'
foreach ($fixture in @('portable', 'none')) {
    Get-ChildItem "$scope\consumer\contexts\$fixture\bin\Debug\net12.0" -Filter '*.deps.json' |
        Copy-Item -Destination $bin
}
$common = @()
foreach ($file in Get-ChildItem $bin -File) {
    $common += [ordered]@{ name = $file.Name; bytes = $file.Length; sha256 = (Get-FileHash $file.FullName -Algorithm SHA256).Hash }
}
$common | ConvertTo-Json -Depth 6 | Set-Content "$scope\common-once.json" -Encoding utf8
