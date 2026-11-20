param([ValidateSet('original37','default')][string]$Role)
. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$repo = $roles.$Role
$flags = @('-v:q','/m:2','/nr:false','/p:UseSharedCompilation=false','/p:UseIisNativeAssets=false')
Invoke-LocalDotnet "020-$Role-generate-restore" $repo (@('restore','eng\tools\GenerateFiles\GenerateFiles.csproj') + $flags)
Invoke-LocalDotnet "021-$Role-generate" $repo (@('msbuild','eng\tools\GenerateFiles\GenerateFiles.csproj','/t:GenerateDirectoryBuildFiles') + $flags)
Invoke-LocalDotnet "022-$Role-components-build" $repo (@('build','src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj') + $flags)
Invoke-LocalDotnet "023-$Role-endpoints-build" $repo (@('build','src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj') + $flags)
