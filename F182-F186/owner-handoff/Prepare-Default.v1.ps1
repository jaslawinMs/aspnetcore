$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$checkout = 'C:\src\ap-F182-d022'
$project = 'src\Identity\test\InMemory.Test\Microsoft.AspNetCore.Identity.InMemory.Test.csproj'
function Invoke-Recorded([string]$Label, [string[]]$Arguments)
{
    & (Join-Path $root 'Run-Native.ps1') -Checkout $checkout -Label $Label -NativeArguments $Arguments | Out-Host
    return $LASTEXITCODE
}
$code = Invoke-Recorded 'default-generate-norestore' @('msbuild', 'eng\tools\GenerateFiles\GenerateFiles.csproj', '-t:GenerateDirectoryBuildFiles', '-p:Configuration=Release', '-v:minimal', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
if ($code -ne 0)
{
    $diagnostic = Get-Content -Raw "$root\evidence\default-generate-norestore.stdout.txt"
    if ($diagnostic -notmatch 'NETSDK1004')
    {
        throw 'Unexpected generator prerequisite failure; preserved without automatic restore.'
    }
    $code = Invoke-Recorded 'default-generate-restore' @('restore', 'eng\tools\GenerateFiles\GenerateFiles.csproj', '-v:minimal', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
    if ($code -ne 0)
    {
        throw 'Generator restore failed.'
    }
    $code = Invoke-Recorded 'default-generate-imports' @('msbuild', 'eng\tools\GenerateFiles\GenerateFiles.csproj', '-t:GenerateDirectoryBuildFiles', '-p:Configuration=Release', '-v:minimal', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
    if ($code -ne 0)
    {
        throw 'Generator failed.'
    }
}
$code = Invoke-Recorded 'default-native-assets-check' @('build', $project, '--no-restore', '-c', 'Release', '-v:minimal', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
if ($code -ne 0)
{
    $diagnostic = Get-Content -Raw "$root\evidence\default-native-assets-check.stdout.txt"
    if ($diagnostic -notmatch 'NETSDK1004')
    {
        throw 'Unexpected native prerequisite failure; preserved without automatic restore.'
    }
    $code = Invoke-Recorded 'default-native-restore' @('restore', $project, '-v:minimal', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
    if ($code -ne 0)
    {
        throw 'Native graph restore failed.'
    }
    $code = Invoke-Recorded 'default-native-build' @('build', $project, '--no-restore', '-c', 'Release', '-v:minimal', '-p:UseSharedCompilation=false', '/m:2', '/nr:false', "-bl:$root\evidence\default-native-build.binlog")
    if ($code -ne 0)
    {
        throw 'Normal Default native graph build failed.'
    }
}
Write-Output 'Default unchanged normal dependency-aware native graph preparation completed.'
