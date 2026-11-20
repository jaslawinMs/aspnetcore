$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$git = (Get-Command git).Source
$roles = @(
    @{ name = 'original37'; commit = '37e809ead5824bc753a1c3d56f11615bdb1296c5'; path = 'C:\src\ap-F155-o010' },
    @{ name = 'observedDefault'; commit = '90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d'; path = 'C:\src\ap-F155-d010' }
)
$roles | ConvertTo-Json | Set-Content "$root\roles.json" -Encoding utf8
foreach ($role in $roles) {
    if (Test-Path $role.path) { throw "Workspace already exists: $($role.path)" }
    & "$root\Invoke-Recorded.ps1" -Name "020-clone-$($role.name)" -Executable $git -Arguments @('clone','--shared','--no-checkout','--config','core.longpaths=true','--config','core.autocrlf=true','C:\src\aspnetcore',$role.path)
    & "$root\Invoke-Recorded.ps1" -Name "021-object-$($role.name)" -Executable $git -WorkingDirectory $role.path -Arguments @('cat-file','-t',$role.commit)
    if ((Get-Content "$root\commands\021-object-$($role.name).json" -Raw | ConvertFrom-Json).exitCode -ne 0) {
        & "$root\Invoke-Recorded.ps1" -Name "022-fetch-$($role.name)" -Executable $git -WorkingDirectory $role.path -Arguments @('fetch','--no-tags','https://github.com/dotnet/aspnetcore.git',$role.commit)
    }
    & "$root\Invoke-Recorded.ps1" -Name "023-checkout-$($role.name)" -Executable $git -WorkingDirectory $role.path -Arguments @('checkout','--detach',$role.commit)
    if ((Get-Content "$root\commands\023-checkout-$($role.name).json" -Raw | ConvertFrom-Json).exitCode -ne 0) { throw 'Checkout failed' }
    New-Item -ItemType Junction -Path "$($role.path)\.dotnet" -Target 'C:\src\aspnetcore\.dotnet' | Out-Null
    & "$root\Invoke-Recorded.ps1" -Name "024-identities-$($role.name)" -Executable $git -WorkingDirectory $role.path -Arguments @('rev-parse','HEAD','HEAD:src/Mvc/Mvc.Formatters.Xml/test/ValidationProblemDetailsWrapperTest.cs','HEAD:src/Mvc/Mvc.Formatters.Xml/src/ValidationProblemDetailsWrapper.cs')
    & "$root\Invoke-Recorded.ps1" -Name "025-history-$($role.name)" -Executable $git -WorkingDirectory $role.path -Arguments @('--no-pager','log','-4','--format=fuller','--follow','--','src/Mvc/Mvc.Formatters.Xml/test/ValidationProblemDetailsWrapperTest.cs')
    "ROLE $($role.name)"
    Get-Content "$($role.path)\global.json"
    Select-String -Path "$($role.path)\eng\Version.Details.props" -Pattern 'MicrosoftInternalRuntime|MicrosoftNETCoreApp' | Out-String | Write-Output
}
Get-ChildItem 'C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App' -Directory | ForEach-Object FullName
Get-ChildItem 'C:\src\aspnetcore\.dotnet\sdk' -Directory | ForEach-Object FullName
