. "$PSScriptRoot\Record.ps1"
Assert-NativeAllowed
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$paths = @(
    'src\Http\Http.Abstractions\test\UseWhenExtensionsTests.cs',
    'src\Http\Http.Abstractions\test\Microsoft.AspNetCore.Http.Abstractions.Tests.csproj',
    'src\Http\Http.Abstractions\src\Extensions\UseWhenExtensions.cs',
    'src\Http\Http.Abstractions\src\Extensions\UseExtensions.cs',
    'src\Http\Http.Abstractions\src\Extensions\RunExtensions.cs',
    'src\Http\Http.Abstractions\src\HttpContext.cs',
    'src\Http\Http.Abstractions\src\RequestDelegate.cs',
    'src\Http\Http\src\Builder\ApplicationBuilder.cs',
    'src\Http\Http\src\DefaultHttpContext.cs',
    'src\Http\Http\src\Features\ItemsFeature.cs',
    'src\Http\Http\src\Internal\ItemsDictionary.cs',
    'src\Http\Http.Features\src\IItemsFeature.cs',
    'src\Http\Http.Abstractions\src\Microsoft.AspNetCore.Http.Abstractions.csproj',
    'src\Http\Http\src\Microsoft.AspNetCore.Http.csproj',
    'src\Http\build.cmd',
    'global.json',
    'Directory.Build.props',
    'Directory.Build.targets',
    'eng\Versions.props',
    'eng\Build.props',
    'eng\Common.props',
    'docs\BuildFromSource.md',
    'docs\BuildErrors.md',
    'docs\CrossCuttingGuidance.md',
    '.github\copilot-instructions.md',
    '.github\instructions\cross-cutting-guidance.instructions.md',
    '.github\instructions\build.instructions.md',
    'activate.ps1'
)
$catalog = Get-Content -LiteralPath (Join-Path (Split-Path (Split-Path $PSScriptRoot)) 'autoperf-campaign.json') -Raw | ConvertFrom-Json
$selected = @($catalog.candidates | Where-Object { $_.id -in @('F169','F170') })
if ($selected.Count -ne 2 -or @($selected | Where-Object status -ne 'pending').Count -ne 0) { throw 'Exact two candidates must remain pending' }
$selected | ConvertTo-Json -Depth 30 | Set-Content "$PSScriptRoot\candidate-records.json" -Encoding utf8NoBOM
$metadata = @()
foreach ($role in @('original37','default'))
{
    $repo = $roles.$role
    foreach ($path in $paths)
    {
        $source = Join-Path $repo $path
        if (-not (Test-Path -LiteralPath $source)) { continue }
        $destination = Join-Path "$PSScriptRoot\capsule\sources\$role" $path
        New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $destination
        $gitPath = $path.Replace('\','/')
        $blob = (& git -C $repo rev-parse "HEAD:$gitPath").Trim()
        $attributes = (& git -C $repo check-attr text eol -- $gitPath) -join "`n"
        $metadata += @{role=$role;sourcePath=$path;capsulePath="sources\$role\$path";gitBlobSha1=$blob;attributes=$attributes}
    }
    $historyPaths = @(
        'src/Http/Http.Abstractions/test/UseWhenExtensionsTests.cs',
        'src/Http/Http.Abstractions/src/Extensions/UseWhenExtensions.cs',
        'src/Http/Http/src/Internal/ItemsDictionary.cs'
    )
    $i=0
    foreach ($path in $historyPaths)
    {
        $i++
        Invoke-Recorded "011-$role-history-$i" 'git' @('--no-pager','log','--follow','-6','--format=fuller','-p','--',$path) $repo
    }
    Invoke-Recorded "012-$role-source-status" 'git' @('--no-pager','status','--porcelain=v2','--branch') $repo
}
Invoke-Recorded '013-owning-sources-original-default-diff' 'git' (@('--no-pager','diff',$roles.originalCommit,$roles.defaultCommit,'--') + @($paths | ForEach-Object { $_.Replace('\','/') })) $roles.default
$metadata | ConvertTo-Json -Depth 10 | Set-Content "$PSScriptRoot\selected-sources.json" -Encoding utf8NoBOM
