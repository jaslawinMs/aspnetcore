param([ValidateSet('initial-build','restore','build','run')][string]$Phase, [ValidateSet('original37','default')][string]$Role='original37')
. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$common = $roles.common
$project = "$common\UseWhenPreparation.csproj"
$flags = @('-v:q','/m:2','/nr:false','/p:UseSharedCompilation=false')
$extra = @{
    DOTNET_CLI_HOME="$common\.autoperf\cli"
    TEMP="$common\.autoperf\scratch"; TMP="$common\.autoperf\scratch"
    NUGET_HTTP_CACHE_PATH="$common\.autoperf\nuget-http"; NUGET_PLUGINS_CACHE_PATH="$common\.autoperf\nuget-plugins"
}
foreach ($dir in @('cli','scratch','nuget-http','nuget-plugins'))
{
    New-Item -ItemType Directory -Path "$common\.autoperf\$dir" -Force | Out-Null
}
switch ($Phase)
{
    'initial-build'
    {
        Invoke-LocalDotnet '040-common-initial-no-restore' $roles.original37 (@('build',$project,'--no-restore') + $flags) $extra
    }
    'restore'
    {
        Invoke-LocalDotnet '041-common-restore-after-missing-assets' $roles.original37 (@('restore',$project) + $flags) $extra
    }
    'build'
    {
        Invoke-LocalDotnet '042-common-compile' $roles.original37 (@('build',$project,'--no-restore') + $flags) $extra
    }
    'run'
    {
        $extra.DOTNET_STARTUP_HOOKS = "$common\bin\Debug\net12.0\UseWhenPreparation.dll"
        $extra.AUTOPERF_IDENTITY_DIR = "$PSScriptRoot\identity\$Role\supplemental"
        $extra.AUTOPERF_LAUNCH_ID = "050-$Role-supplemental"
        Invoke-LocalDotnet "050-$Role-supplemental" $roles.$Role @(
            "$common\bin\Debug\net12.0\UseWhenPreparation.dll",
            "$($roles.$Role)\artifacts\bin\Microsoft.AspNetCore.Http.Abstractions.Tests\Debug\net12.0"
        ) $extra
    }
}
