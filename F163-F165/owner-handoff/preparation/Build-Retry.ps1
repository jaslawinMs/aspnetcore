param([ValidateSet('original37','default')][string]$Role)
. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$repo = $roles.$Role
$flags = @('-v:q','/m:2','/nr:false','/p:UseSharedCompilation=false','/p:UseIisNativeAssets=false','/p:BuildNodeJS=false')
Invoke-LocalDotnet "024-$Role-components-no-js" $repo (@('build','src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj') + $flags)
Invoke-LocalDotnet "025-$Role-endpoints-no-js" $repo (@('build','src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj') + $flags)
