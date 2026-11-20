$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$recorder = Join-Path $scope 'Invoke-Recorded.ps1'
$flags = @('-v:q', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
function Invoke-DotNet([string]$Id, [string[]]$CommandArguments) {
    Set-Location $script:checkout
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    . .\activate.ps1
    & $script:recorder -Id $Id -File 'C:\src\aspnetcore\.dotnet\dotnet.exe' -Arguments ($CommandArguments + $script:flags) -WorkingDirectory $script:checkout
}
foreach ($role in @('original', 'default')) {
    $script:checkout = Join-Path $scope $role
    $tool = 'eng\tools\GenerateFiles\GenerateFiles.csproj'
    $tests = 'src\Mvc\Mvc.Razor.RuntimeCompilation\test\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.csproj'
    Invoke-DotNet "010-$role-initial-no-restore" @('build', $tests, '--no-restore')
    if ($global:RecordedExitCode -eq 0) { continue }
    Invoke-DotNet "011-$role-generate-before-restore" @('msbuild', $tool, '/t:GenerateDirectoryBuildFiles')
    if ($global:RecordedExitCode -ne 0) {
        $text = Get-Content "$scope\logs\011-$role-generate-before-restore.stdout.log" -Raw
        if ($text -notmatch 'NETSDK1004|project.assets.json|MSB4036') { continue }
        Invoke-DotNet "012-$role-restore-generator" @('restore', $tool)
        if ($global:RecordedExitCode -ne 0) { continue }
        Invoke-DotNet "013-$role-generate" @('msbuild', $tool, '/t:GenerateDirectoryBuildFiles')
        if ($global:RecordedExitCode -ne 0) { continue }
    }
    Invoke-DotNet "014-$role-tests-no-restore" @('build', $tests, '--no-restore')
    if ($global:RecordedExitCode -ne 0) {
        $text = Get-Content "$scope\logs\014-$role-tests-no-restore.stdout.log" -Raw
        if ($text -notmatch 'NETSDK1004|project.assets.json|MSB4036') { continue }
        Invoke-DotNet "015-$role-restore-tests" @('restore', $tests)
        if ($global:RecordedExitCode -ne 0) { continue }
        Invoke-DotNet "016-$role-build-tests" @('build', $tests, '--no-restore')
    }
}
