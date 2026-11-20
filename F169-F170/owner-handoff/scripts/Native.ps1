param(
    [ValidateSet('original37','default')][string]$Role,
    [ValidateSet('initial-build','generate','build','test')][string]$Phase,
    [string]$Attempt='first',
    [switch]$WithHook,
    [string[]]$AdditionalProperties=@()
)
. "$PSScriptRoot\Record.ps1"
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$repo = $roles.$Role
$project = 'src\Http\Http.Abstractions\test\Microsoft.AspNetCore.Http.Abstractions.Tests.csproj'
$flags = @('-v:q','/m:2','/nr:false','/p:UseSharedCompilation=false') + $AdditionalProperties
switch ($Phase)
{
    'initial-build'
    {
        Invoke-LocalDotnet "020-$Role-initial-build" $repo (@('build',$project,'--no-restore') + $flags)
    }
    'generate'
    {
        $code = Invoke-LocalDotnet "021-$Role-generate-build" $repo (@('build','eng\tools\GenerateFiles\GenerateFiles.csproj') + $flags)
        if ($code -ne 0) { throw 'GenerateFiles build failed' }
        Invoke-LocalDotnet "022-$Role-generate-directory-files" $repo (@('msbuild','eng\tools\GenerateFiles\GenerateFiles.csproj','/t:GenerateDirectoryBuildFiles') + $flags)
    }
    'build'
    {
        Invoke-LocalDotnet "023-$Role-build-$Attempt" $repo (@('build',$project) + $flags)
    }
    'test'
    {
        $dir = "$PSScriptRoot\native\$Role\$Attempt"
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        $id = "030-$Role-test-$Attempt"
        $extra = @{}
        $settings = @()
        if ($WithHook)
        {
            $hook = "$($roles.common)\bin\Debug\net12.0\UseWhenPreparation.dll"
            if (-not (Test-Path -LiteralPath $hook)) { throw 'Common diagnostic assembly not compiled' }
            $identity = "$PSScriptRoot\identity\$Role\native"
            $extra = @{DOTNET_STARTUP_HOOKS=$hook; AUTOPERF_IDENTITY_DIR=$identity; AUTOPERF_LAUNCH_ID=$id}
            $hookXml = [System.Security.SecurityElement]::Escape($hook)
            $identityXml = [System.Security.SecurityElement]::Escape($identity)
            "<RunSettings><RunConfiguration><EnvironmentVariables><DOTNET_STARTUP_HOOKS>$hookXml</DOTNET_STARTUP_HOOKS><AUTOPERF_IDENTITY_DIR>$identityXml</AUTOPERF_IDENTITY_DIR><AUTOPERF_LAUNCH_ID>$id</AUTOPERF_LAUNCH_ID></EnvironmentVariables></RunConfiguration></RunSettings>" |
                Set-Content -LiteralPath "$dir\identity.runsettings" -Encoding utf8NoBOM
            $settings = @('--settings',"$dir\identity.runsettings")
        }
        Invoke-LocalDotnet $id $repo (@(
            'test',$project,'--no-build','--no-restore',
            '--filter','FullyQualifiedName~Microsoft.AspNetCore.Builder.Extensions.UseWhenExtensionsTests',
            '--logger',"trx;LogFileName=UseWhen-$Attempt.trx",
            '--results-directory',$dir,'--diag',"$dir\vstest.log"
        ) + $flags + $settings) $extra
    }
}
