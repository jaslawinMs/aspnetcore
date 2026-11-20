$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$recorder = Join-Path $scope 'Invoke-Recorded.ps1'
$git = (Get-Command git).Source
& $recorder -Id '001-fresh-upstream' -File $git -Arguments @('ls-remote', 'https://github.com/dotnet/aspnetcore.git', 'refs/heads/main')
if ($global:RecordedExitCode -ne 0) { throw 'Cannot freshly pin upstream.' }
$pin = ((Get-Content "$scope\logs\001-fresh-upstream.stdout.log" -Raw).Trim() -split '\s+')[0]
if ($pin -ne '00560e2dd1954a2acf2bc54b35422b0f32484bf1') { throw "Upstream moved: $pin; revise role pin before preparing." }
foreach ($role in @('original', 'default')) {
    $checkout = Join-Path $scope $role
    $sha = if ($role -eq 'original') { '37e809ead5824bc753a1c3d56f11615bdb1296c5' } else { $pin }
    & $recorder -Id "002-$role-clone" -File $git -Arguments @('clone', '--shared', '--no-checkout', '--quiet', 'C:\src\aspnetcore', $checkout)
    if ($global:RecordedExitCode -ne 0) { throw "$role clone failed" }
    & $recorder -Id "003-$role-checkout" -File $git -Arguments @('-c', 'core.longpaths=true', 'checkout', '--detach', '--force', '--quiet', $sha) -WorkingDirectory $checkout
    if ($global:RecordedExitCode -ne 0) { throw "$role checkout failed" }
    New-Item -ItemType Junction -Path "$checkout\.dotnet" -Target 'C:\src\aspnetcore\.dotnet' | Out-Null
}
