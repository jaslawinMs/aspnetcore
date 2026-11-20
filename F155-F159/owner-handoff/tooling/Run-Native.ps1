param(
    [Parameter(Mandatory)][string]$Role,
    [Parameter(Mandatory)][string]$Attempt,
    [Parameter(Mandatory)][string[]]$DotnetArguments,
    [switch]$IdentityCapture
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$policy = Get-Content (Join-Path (Split-Path $root) 'policy.json') -Raw | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -eq $true) { throw 'Active native work HOLD; refusing start' }
$entry = Get-Content "$root\roles.json" -Raw | ConvertFrom-Json | Where-Object name -eq $Role
if (-not $entry) { throw 'Unknown role' }
Set-Location $entry.path
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE = 'false'
$env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = 'false'
$env:MSBUILDDISABLENODEREUSE = '1'
$env:NUGET_PACKAGES = 'C:\.tools\.nuget\packages'
. .\activate.ps1
$environment = @{
    DOTNET_GENERATE_ASPNET_CERTIFICATE = $env:DOTNET_GENERATE_ASPNET_CERTIFICATE
    DOTNET_ADD_GLOBAL_TOOLS_TO_PATH = $env:DOTNET_ADD_GLOBAL_TOOLS_TO_PATH
    MSBUILDDISABLENODEREUSE = $env:MSBUILDDISABLENODEREUSE
    DOTNET_ROOT = $env:DOTNET_ROOT
    'DOTNET_ROOT(x86)' = ${env:DOTNET_ROOT(x86)}
    NUGET_PACKAGES = $env:NUGET_PACKAGES
}
if ($IdentityCapture) {
    $environment.DOTNET_STARTUP_HOOKS = "$root\identity\bin\Release\net12.0\Identity.dll"
    $environment.F155_IDENTITY_DIR = "$root\native\$Role\identities"
}
& "$root\Invoke-Recorded.ps1" -Name "$Attempt-$Role" -Executable "$($entry.path)\.dotnet\dotnet.exe" -WorkingDirectory $entry.path -Arguments $DotnetArguments -Environment $environment
