param([Parameter(Mandatory)][ValidateSet('original', 'default')][string]$Role)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$graphs = Get-Content -Raw "$root\graph-creation.json" | ConvertFrom-Json
$image = Join-Path (Split-Path $root) "images\$Role"
$owner = 'Microsoft.AspNetCore.Identity.InMemory.Test'
$arguments = @(
    'exec',
    '--depsfile', "$image\$owner.deps.json",
    '--runtimeconfig', "$image\$owner.runtimeconfig.json",
    "$image\AutoPerf.Identity.RoleNames.dll",
    $Role,
    "$root\evidence\$Role-supplemental-v1.json",
    "$root\evidence\$Role-supplemental-v1-identity.json"
)
& "$root\Run-Native.ps1" -Checkout $graphs."${Role}Path" -Label "$Role-supplemental-v1" -NativeArguments $arguments
exit $LASTEXITCODE
