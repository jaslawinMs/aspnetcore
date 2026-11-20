. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$project = 'src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj'
foreach ($role in @('original37','default'))
{
    $repo = $roles.$role
    Invoke-LocalDotnet "010-$role-initial-no-restore" $repo @('test',$project,'--no-restore','-v:q','/m:2','/nr:false','/p:UseSharedCompilation=false','/p:UseIisNativeAssets=false','--filter','FullyQualifiedName~ResourceAssetCollectionTest')
}
