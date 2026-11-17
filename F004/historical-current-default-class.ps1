param([int]$Attempt=2)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo = [string]$PWD
$run = Join-Path $PSScriptRoot 'autoperf-runs\F004'
$destination = Join-Path $run "current-default-class-probe-attempt$Attempt"
$ownerProject = 'src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj'
$target = Join-Path $PSScriptRoot 'F004-current-default-class.targets'
$captured = Join-Path $run 'current-default-canonical\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
$ownerOutput = Join-Path $repo 'artifacts\bin\Microsoft.AspNetCore.Components.Analyzers\Release\netstandard2.0'
$image = Join-Path $run 'binaries\current-default-class'
$frozen = Join-Path $run 'frozen-source\current-default-class'
if (Test-Path $destination) { throw 'Refusing to overwrite an actual current-default context probe.' }
New-Item $destination -ItemType Directory -Force | Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
Copy-Item $target $destination
$commands = @()
function InvokeRecorded([string]$Name,[string[]]$Arguments)
{
    & dotnet @Arguments *> (Join-Path $destination "$Name.log")
    $code = $LASTEXITCODE
    $script:commands += [ordered]@{name=$Name;entryPoint='dotnet';arguments=$Arguments;actualExitCode=$code}
    $script:commands | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $destination 'execution.json')
    if ($code -ne 0)
    {
        Get-Content (Join-Path $destination "$Name.log") -Tail 35
        throw "Actual $Name failed with exit$code."
    }
}
InvokeRecorded 'existing-extension-point' @('msbuild',$ownerProject,'-nologo','-getProperty:CustomAfterMicrosoftCommonTargets')
$existingExtension = [IO.File]::ReadAllText((Join-Path $destination 'existing-extension-point.log')).Trim()
$existingExtensionFile = $existingExtension.Length -gt 0 -and (Test-Path -LiteralPath $existingExtension -PathType Leaf)
if ($existingExtensionFile)
{
    throw 'Do not replace an existing framework build extension.'
}
$scopeRows = @()
foreach ($file in 'Microsoft.AspNetCore.Components.Analyzers.csproj')
{
    $before = [IO.File]::ReadAllText((Join-Path $run "baseline-canonical\src\Components\Analyzers\src\$file")).Replace("`r`n","`n")
    $after = [IO.File]::ReadAllText((Join-Path $run "current-default-canonical\src\Components\Analyzers\src\$file")).Replace("`r`n","`n")
    if ($before -cne $after) { throw 'The contextual API/project prerequisite is not exactly current-default equivalent.' }
    $scopeRows += [ordered]@{file=$file;canonicalEqual=$true}
}
$beforeApi = [IO.File]::ReadAllText((Join-Path $run 'baseline-canonical\src\Components\Analyzers\src\ComponentsApi.cs'))
$afterApi = [IO.File]::ReadAllText((Join-Path $run 'current-default-canonical\src\Components\Analyzers\src\ComponentsApi.cs'))
foreach ($name in 'BindConverter','ComponentBase','EventCallbackFactory','RenderTreeBuilder')
{
    $pattern = "(?s)public static class $name\s*\{.*?\}"
    $beforeSite = [regex]::Match($beforeApi,$pattern).Value.Replace("`r`n","`n")
    $afterSite = [regex]::Match($afterApi,$pattern).Value.Replace("`r`n","`n")
    if ($beforeSite.Length -lt 50 -or $beforeSite -cne $afterSite) { throw 'An actual referenced API constant class differs on current default.' }
    $scopeRows += [ordered]@{file='ComponentsApi.cs';site=$name;canonicalEqual=$true}
}
$pattern = 'public const string AssemblyName\s*=.*?;'
$beforeSite = [regex]::Match($beforeApi,$pattern).Value
$afterSite = [regex]::Match($afterApi,$pattern).Value
if ($beforeSite.Length -lt 30 -or $beforeSite -cne $afterSite) { throw 'Actual referenced namespace prefix differs on current default.' }
$scopeRows += [ordered]@{file='ComponentsApi.cs';site='AssemblyName';canonicalEqual=$true}
$before = [IO.File]::ReadAllText((Join-Path $run 'baseline-canonical\src\Components\Analyzers\src\DiagnosticDescriptors.cs'))
$after = [IO.File]::ReadAllText((Join-Path $run 'current-default-canonical\src\Components\Analyzers\src\DiagnosticDescriptors.cs'))
$pattern = '(?s)DiagnosticDescriptor ForLoopIteratorVariableUsedInClosure\s*=.*?;'
$beforeDescriptor = [regex]::Match($before,$pattern).Value.Replace("`r`n","`n")
$afterDescriptor = [regex]::Match($after,$pattern).Value.Replace("`r`n","`n")
if ($beforeDescriptor.Length -lt 100 -or $beforeDescriptor -cne $afterDescriptor) { throw 'BL0014 descriptor differs on current default.' }
$scopeRows += [ordered]@{file='DiagnosticDescriptors.cs';site='BL0014 initializer';canonicalEqual=$true}
[xml]$oldResources = [IO.File]::ReadAllText((Join-Path $run 'baseline-canonical\src\Components\Analyzers\src\Resources.resx'))
[xml]$newResources = [IO.File]::ReadAllText((Join-Path $run 'current-default-canonical\src\Components\Analyzers\src\Resources.resx'))
foreach ($name in 'ForLoopIteratorVariableUsedInClosure_Title','ForLoopIteratorVariableUsedInClosure_Format','ForLoopIteratorVariableUsedInClosure_Description')
{
    $oldValue = [string]($oldResources.root.data | Where-Object name -CEQ $name).value
    $newValue = [string]($newResources.root.data | Where-Object name -CEQ $name).value
    if ($oldValue.Length -eq 0 -or $oldValue -cne $newValue) { throw 'Actual BL0014 resource differs on current default.' }
    $scopeRows += [ordered]@{file='Resources.resx';site=$name;canonicalEqual=$true}
}
[ordered]@{candidate='F004';currentDefault='49147673007a4b1d676694e2c5f85b83ad76c36f';exactCapturedClassSha256=(Get-FileHash $captured).Hash;
    scopePrerequisites=$scopeRows;scope='Actual fresh-default ForLoopIteratorInClosureAnalyzer class built by the unchanged shipping project in baseline context,with exact current-equivalent referenced API constants/project/BL0014 descriptor and resources.';
    wholeDefaultAssemblyOrRepositoryIntegration=$false;shippingSourceEdit=$false;performanceComparison=$false;notADefaultNullFixProposal=$true;
    originalOptionalExtensionPath=$existingExtension;originalOptionalExtensionFileExists=$existingExtensionFile;
    previousGuardFailures=@('Attempt1 conservatively stopped on the nonempty SDK optional extension placeholder;actual file is absent. No existing physical extension is replaced.',
        'Attempt2 stopped on whole ComponentsApi equality. Actual delta only adds unrelated RazorComponentResultOfT constants. Check all5 actually referenced API sites rather than claim whole-file equality.')} |
    ConvertTo-Json -Depth 7 | Set-Content (Join-Path $destination 'scope.json')
try
{
    InvokeRecorded 'captured-class-owner-build' @('build',$ownerProject,'--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q','-p:UseIisNativeAssets=false',"-p:CustomAfterMicrosoftCommonTargets=$target","-p:F004CapturedSource=$captured","-bl:$destination\captured-class-owner-build.binlog")
    New-Item $image -ItemType Directory -Force | Out-Null
    Copy-Item (Join-Path $run 'binaries\original\*') $image -Recurse
    foreach ($name in 'Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb')
    {
        Copy-Item (Join-Path $ownerOutput $name) (Join-Path $image $name)
    }
    New-Item $frozen -ItemType Directory -Force | Out-Null
    Copy-Item (Join-Path $run 'frozen-source\original\*') $frozen -Recurse
    Copy-Item $captured (Join-Path $frozen 'owner\ForLoopIteratorInClosureAnalyzer.cs')
    $files = @(Get-ChildItem $image -File -Recurse | ForEach-Object {
        [ordered]@{relativePath=[IO.Path]::GetRelativePath($image,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}
    })
    $sources = @(Get-ChildItem $frozen -File -Recurse | ForEach-Object {
        [ordered]@{relativePath=[IO.Path]::GetRelativePath($frozen,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}
    })
    [ordered]@{candidate='F004';variant='current-default-class';ownerSha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash;
        imageRoot=$image;files=$files;frozenSources=$sources;actualTestOutputOwnerMatched=$false;existingTestRows=0;wholeDefaultIntegration=$false} |
        ConvertTo-Json -Depth 7 | Set-Content (Join-Path $run 'manifest-current-default-class.json')
    & (Join-Path $PSScriptRoot 'F004-characterize.ps1') -Variant current-default-class
}
finally
{
    InvokeRecorded 'restore-baseline-owner-output' @('build',$ownerProject,'--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q','-p:UseIisNativeAssets=false',"-bl:$destination\restore-baseline-owner-output.binlog")
    $original = Get-Content (Join-Path $run 'manifest-original.json') -Raw | ConvertFrom-Json
    if ((Get-FileHash (Join-Path $ownerOutput 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash -cne $original.ownerSha256)
    {
        throw 'Restored baseline owner output did not exactly match the actual original image.'
    }
}
Write-Output 'F004 actual captured current-default class:72 real compiler checks/adjacent null fix passed;baseline owner output restored byte-exact. No whole-default integration claim.'
