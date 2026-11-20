$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$paths = @(
    '.gitmodules'
    'src/Mvc/Mvc.Core/src/Diagnostics/MvcDiagnostics.cs'
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompilerProvider.cs'
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/CSharpCompiler.cs'
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RazorReferenceManager.cs'
    'src/Mvc/test/Mvc.FunctionalTests/Infrastructure/MvcWebApplicationBuilderExtensions.cs'
    'src/Components/Server/src/Microsoft.AspNetCore.Components.Server.csproj'
)
$roles = @(
    @{ role = 'original'; checkout = 'C:\src\ap-F187-o038'; commit = '37e809ead5824bc753a1c3d56f11615bdb1296c5' }
    @{ role = 'default'; checkout = 'C:\src\ap-F187-d038'; commit = '83d976704fa0f9aa4361327d1f9d929c93bd9256' }
)
foreach ($role in $roles)
{
    $expressions = [System.Collections.Generic.List[string]]::new()
    $expressions.Add($role.commit)
    $expressions.Add("$($role.commit)^{tree}")
    $trees = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    foreach ($path in $paths)
    {
        if (!(Test-Path -LiteralPath (Join-Path $role.checkout $path.Replace('/', '\')) -PathType Leaf))
        {
            throw "Selected actual source missing: $path"
        }
        $parts = $path.Split('/')
        for ($count = 1; $count -lt $parts.Count; $count++)
        {
            $tree = $parts[0..($count - 1)] -join '/'
            if ($trees.Add($tree))
            {
                $expressions.Add("$($role.commit):$tree")
            }
        }
        $expressions.Add("$($role.commit):$path")
    }
    [System.IO.File]::WriteAllText((Join-Path $root "research\$($role.role)-supplement-batch-input.txt"), (($expressions -join "`n") + "`n"))
}
[System.IO.File]::WriteAllText((Join-Path $root 'research\selected-source-supplement.json'), ($paths | ConvertTo-Json))
[ordered]@{ result = 'PASS'; roles = $roles; selectedAdditionalPaths = $paths.Count } | ConvertTo-Json -Depth 6
