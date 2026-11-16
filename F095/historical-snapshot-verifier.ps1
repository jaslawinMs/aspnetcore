param([ValidateSet('before', 'after')][Parameter(Mandatory)][string]$Variant)
$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$root = Join-Path $PSScriptRoot 'autoperf-runs\F095'
. (Join-Path $repo 'activate.ps1')
$binaries = Join-Path $root "binaries\$Variant"
$source = Join-Path $root "source-$Variant\PageLoader.cs"
$manifest = Get-Content -LiteralPath (Join-Path $root "$Variant-manifest.json") -Raw | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $source).Hash -cne $manifest.target_source_sha256)
{
    throw 'Actual measured owner source hash differs.'
}
$destination = Join-Path $root "verify-$Variant"
if (Test-Path -LiteralPath $destination)
{
    throw 'Refusing to overwrite actual snapshot verification.'
}
$arguments = @((Join-Path $binaries 'AutoPerf.Benchmarks.dll'), '--verify', '--artifacts', $destination)
& dotnet @arguments *> (Join-Path $root "verify-$Variant.log")
$code = $LASTEXITCODE
@{ arguments = $arguments; exit_code = $code } | ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath (Join-Path $root "verify-$Variant-command.json") -Encoding utf8
if ($code -ne 0)
{
    Get-Content -LiteralPath (Join-Path $root "verify-$Variant.log") -Tail 35
    throw "Actual $Variant producer verification failed:$code"
}
$tool = Join-Path $PSScriptRoot 'autoperf-runs\F071\tools\bin\Release\net12.0\AutoPerf.Evidence.dll'
$items = @(
    @{ assembly = 'Microsoft.AspNetCore.Mvc.RazorPages'; name = 'PageLoader.cs'; source = $source; output = "owner-pdb-$Variant.json" }
)
$items += foreach ($name in @('Program.cs', 'LoaderLifecycle.cs', 'LoaderBenchmark.cs', 'LoaderProbe.cs'))
{
    @{ assembly = 'AutoPerf.Benchmarks'; name = $name; source = Join-Path $root "harness\$name"; output = "harness-$($name.Replace('.cs',''))-pdb-$Variant.json" }
}
$items += foreach ($entry in @(
    @('Microsoft.AspNetCore.Mvc.RazorPages', 'src\Mvc\Mvc.RazorPages\src\Infrastructure\DefaultPageLoader.cs'),
    @('Microsoft.AspNetCore.Mvc.RazorPages', 'src\Mvc\Mvc.RazorPages\src\Infrastructure\IPageLoader.cs'),
    @('Microsoft.AspNetCore.Mvc.RazorPages', 'src\Mvc\Mvc.RazorPages\src\ApplicationModels\DefaultPageApplicationModelProvider.cs'),
    @('Microsoft.AspNetCore.Mvc.Razor', 'src\Mvc\Mvc.Razor\src\Compilation\DefaultViewCompiler.cs'),
    @('Microsoft.AspNetCore.Mvc.Razor', 'src\Mvc\Mvc.Razor\src\ApplicationParts\CompiledRazorAssemblyPart.cs')
))
{
    $name = Split-Path $entry[1] -Leaf
    @{ assembly = $entry[0]; name = $name; source = Join-Path $root "producer-source\$($entry[1])"; output = "producer-$($name.Replace('.cs',''))-pdb-$Variant.json" }
}
$commands = foreach ($item in $items)
{
    $arguments = @($tool, 'pdb', (Join-Path $binaries "$($item.assembly).pdb"), $item.name, $item.source)
    & dotnet @arguments > (Join-Path $root $item.output)
    if ($LASTEXITCODE -ne 0)
    {
        throw "Actual portable-PDB source proof failed:$Variant/$($item.name)"
    }
    @{ arguments = $arguments; exitCode = $LASTEXITCODE }
}
$commands | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $root "pdb-$Variant-commands.json") -Encoding utf8
$states = Join-Path $destination 'states'
$rows = @(Get-Content -LiteralPath (Join-Path $states 'resource-check.json') -Raw | ConvertFrom-Json)
if ($rows.Count -ne 4 -or @($rows | Where-Object { $_.operations -ne 5000 -or $_.allocatedBytes -ne 0 }).Count)
{
    throw 'Actual original/prototype primed zero-allocation premise differs.'
}
Write-Output "F095 ${Variant}:12 actual real-loader cases,4 actual pending fault/cancel callers,4x5000 zero-byte primed batches;10 actual owner/producer/harness PDB documents verified."
