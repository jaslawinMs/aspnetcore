$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$repo = 'C:\src\aspnetcore'
$roles = @(
    @{ Name = 'original'; Pin = '37e809ead5824bc753a1c3d56f11615bdb1296c5' },
    @{ Name = 'default'; Pin = 'd3483989953ae3cccd773aea5ea04cb0c7198531' }
)
$paths = @(
    '.editorconfig',
    '.github/instructions/cross-cutting-guidance.instructions.md',
    '.github/instructions/build.instructions.md',
    'docs/BuildFromSource.md',
    'docs/BuildErrors.md',
    'docs/CrossCuttingGuidance.md',
    'global.json',
    'activate.ps1',
    'src/Mvc/AGENTS.md',
    'src/Mvc/Mvc.Core/src/ApplicationParts',
    'src/Mvc/Mvc.Core/src/DependencyInjection/MvcCoreServiceCollectionExtensions.cs',
    'src/Mvc/Mvc.Core/src/DependencyInjection/MvcCoreMvcBuilderExtensions.cs',
    'src/Mvc/Mvc.Core/test/ApplicationParts/ApplicationPartManagerTest.cs',
    'src/Mvc/Mvc.Razor/src/TagHelpers',
    'src/Mvc/Mvc.Razor/src/ApplicationParts',
    'src/Mvc/Mvc.Razor/src/DefaultTagHelperFactory.cs',
    'src/Mvc/Mvc.Razor/src/RazorHotReload.cs',
    'src/Mvc/Mvc.Razor/src/DependencyInjection/TagHelpersAsServices.cs',
    'src/Mvc/Mvc.Razor/src/DependencyInjection/MvcRazorMvcBuilderExtensions.cs',
    'src/Mvc/Mvc.Razor/src/DependencyInjection/MvcRazorMvcCoreBuilderExtensions.cs',
    'src/Mvc/Mvc.Razor/test/DependencyInjection/MvcRazorMvcBuilderExtensionsTest.cs',
    'src/Mvc/Mvc.Razor/test/DependencyInjection/MvcRazorMvcCoreBuilderExtensionsTest.cs',
    'src/Mvc/Mvc.Razor/test/Microsoft.AspNetCore.Mvc.Razor.Test.csproj',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/DependencyInjection/RazorRuntimeCompilationMvcCoreBuilderExtensions.cs',
    'src/Mvc/Mvc.TagHelpers/src',
    'src/Mvc/test/WebSites/TagHelpersWebSite/Startup.cs',
    'src/Mvc/test/WebSites/ControllersFromServicesWebSite/Startup.cs',
    'src/Mvc/test/WebSites/ControllersFromServicesWebSite/ControllersFromServicesWebSite.csproj',
    'src/Mvc/test/WebSites/ControllersFromServicesWebSite/TagHelpers/InServicesTagHelper.cs',
    'src/Mvc/test/WebSites/ControllersFromServicesClassLibrary'
)

$records = [System.Collections.Generic.List[object]]::new()
foreach ($role in $roles)
{
    $name = $role.Name
    $archive = Join-Path $PSScriptRoot "source\$name-raw-source.zip"
    if (Test-Path -LiteralPath $archive)
    {
        throw "Refusing to overwrite $archive"
    }

    $argv = @('--no-optional-locks', '--no-pager', '-C', $repo, 'archive', '--format=zip', "--output=$archive", $role.Pin, '--') + $paths
    & git @argv 2> ".\source\$name-archive.stderr.txt"
    $exitCode = $LASTEXITCODE
    $records.Add([ordered]@{
        executable = 'git'
        argv = $argv
        exitCode = $exitCode
        stdout = 'Archive written directly by git; no source re-encoding.'
        stderr = "source\$name-archive.stderr.txt"
        streamsClosed = $true
        nativeBuildOrTest = $false
    })
    if ($exitCode -ne 0)
    {
        $records | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8NoBOM '.\validation\source-capture-commands.json'
        throw "Source archive failed for $name with exit $exitCode"
    }

    $argv = @('--no-optional-locks', '--no-pager', '-C', $repo, 'ls-tree', '-r', $role.Pin, '--') + $paths
    & git @argv > ".\source\$name-raw-source-tree.txt" 2> ".\source\$name-tree.stderr.txt"
    $exitCode = $LASTEXITCODE
    $records.Add([ordered]@{
        executable = 'git'
        argv = $argv
        exitCode = $exitCode
        stdout = "source\$name-raw-source-tree.txt"
        stderr = "source\$name-tree.stderr.txt"
        streamsClosed = $true
        nativeBuildOrTest = $false
    })
    if ($exitCode -ne 0)
    {
        throw "Source tree failed for $name with exit $exitCode"
    }
}

$records | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8NoBOM '.\validation\source-capture-commands.json'
Get-Item '.\source\original-raw-source.zip', '.\source\default-raw-source.zip' | Select-Object Name, Length
