$ErrorActionPreference='Stop'
Import-Module (Join-Path $PSScriptRoot 'source-observer-256b.psm1') -Force
Assert-SourceGuard256 '023-offline-aggregation-diagnostic'
$bindings=@()
$manifests=@()
foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.sources.json' -File))
{
    $parsed=Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json
    $manifests += [pscustomobject]@{name=$file.Name;parsedType=$parsed.GetType().FullName;parsedCount=$parsed.Count}
    foreach ($item in $parsed) { $bindings += $item }
}
$ordered=@()
$objects=@()
foreach ($binding in $bindings)
{
    $ordered += [ordered]@{role=$binding.role;repositoryPath=$binding.repositoryPath}
    $objects += [pscustomobject]@{role=$binding.role;repositoryPath=$binding.repositoryPath}
}
$result=[ordered]@{
    observerPid=$PID
    recordedAtUtc=[DateTime]::UtcNow.ToString('O')
    manifests=$manifests
    explicitFlattenedBindingCount=$bindings.Count
    orderedDictionaryPropertyGroups=@($ordered | Group-Object role | Select-Object Name,Count)
    orderedDictionaryExpressionGroups=@($ordered | Group-Object { $_['role'] } | Select-Object Name,Count)
    customObjectPropertyGroups=@($objects | Group-Object role | Select-Object Name,Count)
    actualNativeStarts=0
    productExecutions=0
}
Write-FreshJson256 (Join-Path $PSScriptRoot 'audit-d-aggregation-diagnostic.json') $result
$result | ConvertTo-Json -Depth 10
