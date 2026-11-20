param([ValidateSet('original37','default')][string]$Role)
. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$repo = $roles.$Role
$bin = "$repo\artifacts\bin\Microsoft.AspNetCore.Components.Endpoints.Tests\Debug\net12.0"
$common = "$PSScriptRoot\common\bin\Debug\net12.0\ContractIdentity.dll"
$id = "041-$Role-supplemental-public-contracts"
$envs = @{ DOTNET_STARTUP_HOOKS=$common; AUTOPERF_IDENTITY_DIR="$PSScriptRoot\identity\$Role\supplement"; AUTOPERF_LAUNCH_ID=$id }
Invoke-LocalDotnet $id $repo @(
    'exec','--runtimeconfig',"$bin\Microsoft.AspNetCore.Components.Endpoints.Tests.runtimeconfig.json",
    $common,$bin
) $envs
