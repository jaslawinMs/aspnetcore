param([ValidateSet('original37','default')][string]$Role)
. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
Invoke-LocalDotnet "026-$Role-endpoints-no-static-assets" $roles.$Role @(
    'build','src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj',
    '-v:q','/m:2','/nr:false','/p:UseSharedCompilation=false','/p:UseIisNativeAssets=false',
    '/p:BuildNodeJS=false','/p:StaticWebAssetsEnabled=false')
