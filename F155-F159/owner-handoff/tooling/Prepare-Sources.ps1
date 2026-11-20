$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$git = (Get-Command git).Source
$roles = [ordered]@{
    original37 = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    observedDefault = '90f48c2ea8ab6d5d0fbdcc2862c5e02aa279b44d'
}
foreach ($role in $roles.Keys) {
    $workspace = "$root\workspaces\$role"
    & "$root\Invoke-Recorded.ps1" -Name "010-clone-$role" -Executable $git -Arguments @('clone','--shared','--no-checkout','C:\src\aspnetcore',$workspace)
    if ((Get-Content "$root\commands\010-clone-$role.json" -Raw | ConvertFrom-Json).exitCode -ne 0) { throw 'Clone failed' }
    & "$root\Invoke-Recorded.ps1" -Name "011-object-$role" -Executable $git -WorkingDirectory $workspace -Arguments @('cat-file','-t',$roles[$role])
    if ((Get-Content "$root\commands\011-object-$role.json" -Raw | ConvertFrom-Json).exitCode -ne 0) {
        & "$root\Invoke-Recorded.ps1" -Name "012-fetch-$role" -Executable $git -WorkingDirectory $workspace -Arguments @('fetch','--no-tags','https://github.com/dotnet/aspnetcore.git',$roles[$role])
    }
    & "$root\Invoke-Recorded.ps1" -Name "013-crlf-$role" -Executable $git -WorkingDirectory $workspace -Arguments @('config','core.autocrlf','true')
    & "$root\Invoke-Recorded.ps1" -Name "014-checkout-$role" -Executable $git -WorkingDirectory $workspace -Arguments @('checkout','--detach',$roles[$role])
    if ((Get-Content "$root\commands\014-checkout-$role.json" -Raw | ConvertFrom-Json).exitCode -ne 0) { throw 'Checkout failed' }
    New-Item -ItemType Junction -Path "$workspace\.dotnet" -Target 'C:\src\aspnetcore\.dotnet' | Out-Null
    & "$root\Invoke-Recorded.ps1" -Name "015-identities-$role" -Executable $git -WorkingDirectory $workspace -Arguments @('rev-parse','HEAD','HEAD:src/Mvc/Mvc.Formatters.Xml/test/ValidationProblemDetailsWrapperTest.cs','HEAD:src/Mvc/Mvc.Formatters.Xml/src/ValidationProblemDetailsWrapper.cs')
    & "$root\Invoke-Recorded.ps1" -Name "016-history-$role" -Executable $git -WorkingDirectory $workspace -Arguments @('--no-pager','log','-6','--format=fuller','--follow','--','src/Mvc/Mvc.Formatters.Xml/test/ValidationProblemDetailsWrapperTest.cs')
    Write-Output "ROLE $role = $($roles[$role]); shared existing .dotnet junction = C:\src\aspnetcore\.dotnet"
    Get-Content "$workspace\global.json"
    Select-String -Path "$workspace\eng\Version.Details.props" -Pattern 'MicrosoftInternalRuntime|MicrosoftNETCoreApp' | Out-String | Write-Output
    Get-Content "$workspace\src\Mvc\Mvc.Formatters.Xml\src\ValidationProblemDetailsWrapper.cs"
}
Get-ChildItem 'C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App' -Directory | ForEach-Object FullName
Get-ChildItem 'C:\src\aspnetcore\.dotnet\sdk' -Directory | ForEach-Object FullName
