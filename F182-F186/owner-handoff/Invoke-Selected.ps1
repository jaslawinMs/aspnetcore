param([Parameter(Mandatory)][ValidateSet('original', 'default')][string]$Role)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$graphs = Get-Content -Raw "$root\graph-creation.json" | ConvertFrom-Json
$checkout = $graphs."${Role}Path"
$selection = Get-Content -Raw "$root\native-selection.json" | ConvertFrom-Json
$filter = ($selection.expected | ForEach-Object { "FullyQualifiedName=$($_.class).$($_.method)" }) -join '|'
$image = Join-Path (Split-Path $root) "images\$Role"
$report = "$root\evidence\native-$Role"
$arguments = @(
    'vstest',
    "$image\$($selection.assembly).dll",
    "/TestCaseFilter:$filter",
    "/Logger:trx;LogFileName=$Role-role-names.trx",
    "/ResultsDirectory:$report",
    "/Diag:$report\vstest-diagnostic.txt"
)
& "$root\Run-Native.ps1" -Checkout $checkout -Label "$Role-native-role-names" -NativeArguments $arguments -CaptureTesthostModules
exit $LASTEXITCODE
