$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F062'
$build = Join-Path $run 'harness\bin\Release\net12.0'
$config = Get-Content (Join-Path $build 'AutoPerf.Benchmarks.runtimeconfig.json') -Raw | ConvertFrom-Json
if ($config.runtimeOptions.framework.name -cne 'Microsoft.NETCore.App' -or $config.runtimeOptions.frameworks)
{
    throw 'No installed ASP.NET framework fallback is permitted.'
}
$sources = [ordered]@{}
foreach ($file in Get-ChildItem (Join-Path $run 'harness') -File | Sort-Object Name)
{
    $sources[$file.Name] = (Get-FileHash $file.FullName).Hash
}
$closures = @{}
foreach ($role in @('before','after'))
{
    $name = "$role-2"
    $root = Join-Path $run "binaries\$name"
    if (Test-Path $root)
    {
        throw "Refuse to overwrite corrected snapshot$name."
    }
    New-Item -ItemType Directory -Path $root | Out-Null
    Get-ChildItem $build -Force | Copy-Item -Destination $root -Recurse
    $legacy = Get-Content (Join-Path $run "$role-manifest.json") -Raw | ConvertFrom-Json
    foreach ($owner in @('Microsoft.AspNetCore.SpaServices.Extensions.dll','Microsoft.AspNetCore.SpaServices.Extensions.pdb'))
    {
        Copy-Item (Join-Path $run "binaries\$role\$owner") (Join-Path $root $owner)
    }
    if ((Get-FileHash (Join-Path $root $legacy.target_assembly)).Hash -cne $legacy.target_assembly_sha256)
    {
        throw "Corrected$name must reuse the already verified actual$role owner."
    }
    $closure = [ordered]@{}
    foreach ($file in Get-ChildItem $root -File -Recurse | Where-Object { $_.Extension -in @('.dll','.json') } | Sort-Object FullName)
    {
        $key = $file.FullName.Substring($root.Length + 1).Replace([IO.Path]::DirectorySeparatorChar, '/')
        $closure[$key] = (Get-FileHash $file.FullName).Hash
    }
    $closures[$role] = $closure
    [ordered]@{
        candidate = 'F062'; variant = $role; snapshot = $name; captured_at = [DateTimeOffset]::UtcNow.ToString('o')
        source_revision = $legacy.source_revision; target_source = $legacy.target_source
        target_source_sha256 = $legacy.target_source_sha256; target_assembly = $legacy.target_assembly
        target_assembly_sha256 = $legacy.target_assembly_sha256; reused_verified_owner_from_snapshot = $role
        benchmark_assembly = 'AutoPerf.Benchmarks.dll'; benchmark_assembly_sha256 = $closure['AutoPerf.Benchmarks.dll']
        runtime_configuration_sha256 = $closure['AutoPerf.Benchmarks.runtimeconfig.json']
        dependency_configuration_sha256 = $closure['AutoPerf.Benchmarks.deps.json']
        runtime_framework = $config.runtimeOptions.framework.version
        harness_sources = $sources; corrected_harness_definition = 'cached faulted URI task;explicit host-only stopping profiles'
        shipping_source_tunes = 0; harness_correction = 1; files = $closure
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run "$name-manifest.json") -Encoding utf8
}
$before = $closures.before
$after = $closures.after
$changed = @($before.Keys | Where-Object { $before[$_] -cne $after[$_] })
if ($before.Count -ne $after.Count -or @(Compare-Object @($before.Keys) @($after.Keys)).Count -or
    $changed.Count -ne 1 -or $changed[0] -cne 'Microsoft.AspNetCore.SpaServices.Extensions.dll')
{
    throw 'Corrected recursive DLL/JSON closure must differ only in the verified original/proposed owner.'
}
[ordered]@{before=$before;after=$after;files_per_role=$before.Count;different_files=$changed;comparison_one_not_aggregated=$true;corrected_comparisons_allowed=@(2,3)} |
    ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'corrected-dependency-closure.json') -Encoding utf8
Write-Output "Corrected identical harness/$($before.Count)-file owner-only snapshots;original owner and proposed source are unchanged;only comparisons2/3 remain."
