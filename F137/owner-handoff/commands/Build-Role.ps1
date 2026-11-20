param([ValidateSet('original','default')][string]$Role)
. (Join-Path $PSScriptRoot 'Common.ps1')
$checkout = Join-Path $Root "scratch\$Role"
Activate-Checkout $checkout
$dotnet = Join-Path $checkout '.dotnet\dotnet.exe'
[void](Run-Native "$Role-sdk-info" $dotnet @('--info') $checkout)
$project = Join-Path $checkout 'src\Mvc\Mvc.Razor.RuntimeCompilation\test\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.csproj'
$argsBuild = @('build',$project,'-c','Release','--no-restore','-v:minimal') + $Flags
$initial = Run-Native "$Role-build-initial-no-restore" $dotnet $argsBuild $checkout
if ($initial.exitCode -ne 0)
{
    $diagnostic = Get-Content (Join-Path $Root "evidence\$Role-build-initial-no-restore\stdout.txt") -Raw
    if ($diagnostic -match 'GenerateFiles|Directory.Build.props')
    {
        $generate = Run-Native "$Role-generate-build-imports" $dotnet (@(
            'msbuild',(Join-Path $checkout 'eng\tools\GenerateFiles\GenerateFiles.csproj'),
            '-restore','-target:GenerateDirectoryBuildFiles','-verbosity:minimal'
        ) + $Flags) $checkout
        if ($generate.exitCode -ne 0) { throw 'Generated build imports failed' }
    }
    $restore = Run-Native "$Role-restore-missing-test-graph" $dotnet (@('restore',$project,'--verbosity','minimal') + $Flags) $checkout
    if ($restore.exitCode -ne 0) { throw 'Native test graph restore failed' }
    $build = Run-Native "$Role-build-native-test-graph" $dotnet $argsBuild $checkout
    if ($build.exitCode -ne 0) { throw 'Native test graph build failed' }
}
$paths = @(
    'global.json','Directory.Build.props','Directory.Build.targets','Directory.Packages.props',
    'eng\Versions.props','src\Mvc\AGENTS.md','docs\BuildFromSource.md',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\RuntimeViewCompiler.cs',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\RuntimeViewCompilerProvider.cs',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\RuntimeViewCompiler.Log.cs',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\ChecksumValidator.cs',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\CSharpCompiler.cs',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\RazorReferenceManager.cs',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\RuntimeCompilationFileProvider.cs',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\DependencyInjection\RazorRuntimeCompilationMvcCoreBuilderExtensions.cs',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\src\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.csproj',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\test\Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.csproj',
    'src\Mvc\Mvc.Razor.RuntimeCompilation\test\RuntimeViewCompilerTest.cs',
    'src\Mvc\Mvc.Razor\src\ApplicationParts\RazorCompiledItemFeatureProvider.cs',
    'src\Mvc\Mvc.Razor\src\ApplicationParts\CompiledRazorAssemblyPart.cs',
    'src\Mvc\Mvc.Razor\src\Compilation\CompiledViewDescriptor.cs',
    'src\Mvc\Mvc.Razor\src\ViewPath.cs',
    'src\Mvc\Mvc.Razor\test\ApplicationParts\RazorCompiledItemFeatureProviderTest.cs',
    'src\Mvc\Mvc.Razor\test\Compilation\CompiledViewDescriptorTest.cs',
    'src\Mvc\Mvc.Core\src\ApplicationParts\ApplicationPartManager.cs'
)
$selected = @()
foreach ($relative in $paths)
{
    $physical = Join-Path $checkout $relative
    if (-not (Test-Path -LiteralPath $physical)) { continue }
    $target = Join-Path $Root "source\$Role\$relative"
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $physical -Destination $target
    $selected += [ordered]@{
        repositoryPath = $relative; physicalSourcePath = $physical
        physicalSha256 = (Get-FileHash $physical -Algorithm SHA256).Hash.ToLowerInvariant()
        frozenRelativePath = [IO.Path]::GetRelativePath($Root,$target)
    }
}
Save-Json (Join-Path $Root "evidence\$Role-selected-source.json") $selected
[void](Run-Native "$Role-source-status-after-build" 'git' @('--no-pager','-C',$checkout,'status','--porcelain=v1') $checkout)
[void](Run-Native "$Role-seam-history" 'git' @('--no-pager','-C',$checkout,'log','-8','--format=fuller','--follow','--','src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompiler.cs') $checkout)
[void](Run-Native "$Role-seam-blame" 'git' @('--no-pager','-C',$checkout,'blame','-L','55,85','HEAD','--','src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompiler.cs') $checkout)
Write-Host "READY $Role"
