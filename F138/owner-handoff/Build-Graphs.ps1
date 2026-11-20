$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$recorder = Join-Path $scope 'Invoke-Recorded.ps1'
$flags = @('-v:q', '-p:UseIisNativeAssets=false', '-p:BuildNodeJS=false', '-p:StaticWebAssetsEnabled=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
function Invoke-DotNet([string]$Id, [string[]]$CommandArguments) {
    Set-Location $script:checkout
    . .\activate.ps1
    $env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
    $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
    $env:MSBUILDDISABLENODEREUSE = '1'
    & $script:recorder -Id $Id -File "$env:DOTNET_ROOT\dotnet.exe" -Arguments ($CommandArguments + $script:flags) -WorkingDirectory $script:checkout
}
foreach ($role in @('baseline', 'default')) {
    $script:checkout = Join-Path $scope $role
    $tool = 'eng\tools\GenerateFiles\GenerateFiles.csproj'
    $tests = 'src\OpenApi\test\Microsoft.AspNetCore.OpenApi.Tests\Microsoft.AspNetCore.OpenApi.Tests.csproj'
    Invoke-DotNet "010-$role-generate-before-restore" @('msbuild', $tool, '/t:GenerateDirectoryBuildFiles')
    if ($global:RecordedExitCode -ne 0) {
        Invoke-DotNet "011-$role-restore-generator" @('restore', $tool)
        if ($global:RecordedExitCode -ne 0) { continue }
        Invoke-DotNet "012-$role-generate" @('msbuild', $tool, '/t:GenerateDirectoryBuildFiles')
        if ($global:RecordedExitCode -ne 0) { continue }
    }
    Invoke-DotNet "013-$role-tests-no-restore" @('build', $tests, '--no-restore')
    if ($global:RecordedExitCode -ne 0) {
        $lastLog = Get-Content (Join-Path $scope "logs\013-$role-tests-no-restore.stdout.log") -Raw
        if ($lastLog -notmatch 'NETSDK1004|project.assets.json|MSB4036') { continue }
        Invoke-DotNet "014-$role-restore-tests" @('restore', $tests)
        if ($global:RecordedExitCode -ne 0) { continue }
        Invoke-DotNet "015-$role-build-tests" @('build', $tests, '--no-restore')
    }
}
