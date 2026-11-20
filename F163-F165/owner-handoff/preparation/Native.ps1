param(
    [ValidateSet('original37','default')][string]$Role,
    [ValidateSet('components','endpoints')][string]$Group,
    [string]$Attempt='loaded',
    [switch]$WithoutHook
)
. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$repo = $roles.$Role
$names = @(
    'IncomingParameterMatchesAnnotatedPrivateProperty_SetsValue',
    'IncomingParameterMatchesDeclaredParameterCaseInsensitively_SetsValue',
    'IncomingParameterMatchesInheritedDeclaredParameter_SetsValue',
    'IncomingParameterMatchesOverriddenParameter_ThatDoesNotHaveAttribute',
    'DeclaredParametersVaryOnlyByCase_Throws',
    'DeclaredParameterClashesWithInheritedParameter_Throws'
)
$filters = @($names | ForEach-Object { "FullyQualifiedName=Microsoft.AspNetCore.Components.ParameterViewTest.$_" })
$filters += @('CanCreateResourceCollection','CanResolveFingerprintedResources','ResolvingNoFingerprintedResourcesReturnsSameUrl','ResolvingNonExistentResourceReturnsSameUrl','CanDetermineContentSpecificUrls') | ForEach-Object { "FullyQualifiedName=Microsoft.AspNetCore.Components.ResourceAssetCollectionTest.$_" }
if ($Group -eq 'components')
{
    $project = 'src\Components\Components\test\Microsoft.AspNetCore.Components.Tests.csproj'
    $filter = $filters -join '|'
}
else
{
    $project = 'src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj'
    $filter = 'FullyQualifiedName~ImportMapDefinitionTest|FullyQualifiedName~ImportMapTest|FullyQualifiedName~RazorComponentsEndpointConventionBuilderExtensionsTest.WithStaticAssets'
}
$dir = "$PSScriptRoot\native\$Role\$Group-$Attempt"
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$id = "040-$Role-$Group-$Attempt"
$extra = @{}
$settings = @()
if (-not $WithoutHook)
{
    $hook = "$PSScriptRoot\common\bin\Debug\net12.0\ContractIdentity.dll"
    if (-not (Test-Path $hook)) { throw 'Common assembly not compiled' }
    $extra = @{DOTNET_STARTUP_HOOKS=$hook; AUTOPERF_IDENTITY_DIR="$PSScriptRoot\identity\$Role\$Group"; AUTOPERF_LAUNCH_ID=$id}
    $xml = [System.Security.SecurityElement]::Escape($hook)
    $identity = [System.Security.SecurityElement]::Escape($extra.AUTOPERF_IDENTITY_DIR)
    "<RunSettings><RunConfiguration><EnvironmentVariables><DOTNET_STARTUP_HOOKS>$xml</DOTNET_STARTUP_HOOKS><AUTOPERF_IDENTITY_DIR>$identity</AUTOPERF_IDENTITY_DIR><AUTOPERF_LAUNCH_ID>$id</AUTOPERF_LAUNCH_ID></EnvironmentVariables></RunConfiguration></RunSettings>" | Set-Content "$dir\identity.runsettings" -Encoding utf8NoBOM
    $settings = @('--settings',"$dir\identity.runsettings")
}
Invoke-LocalDotnet $id $repo (@(
    'test',$project,'--no-build','--no-restore','-v:q','/m:2','/nr:false',
    '/p:UseSharedCompilation=false','/p:UseIisNativeAssets=false','/p:BuildNodeJS=false','/p:StaticWebAssetsEnabled=false',
    '--filter',$filter,'--logger',"trx;LogFileName=$Group-$Attempt.trx",
    '--results-directory',$dir,'--diag',"$dir\vstest.log"
) + $settings) $extra
