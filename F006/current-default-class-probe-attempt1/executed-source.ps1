param([int]$Attempt=1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$repo=[string]$PWD
$run=Join-Path $PSScriptRoot 'autoperf-runs\F006'
$destination=Join-Path $run "current-default-class-probe-attempt$Attempt"
$ownerProject='src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj'
$target=Join-Path $PSScriptRoot 'F006-current-default-class.targets'
$captured=Join-Path $run 'current-default-canonical\src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
$ownerOutput=Join-Path $repo 'artifacts\bin\Microsoft.AspNetCore.Components.Analyzers\Release\netstandard2.0'
$image=Join-Path $run 'binaries\current-default-class'
$frozen=Join-Path $run 'frozen-source\current-default-class'
if((Test-Path $destination) -or (Test-Path $image) -or (Test-Path $frozen) -or @(git diff --name-only).Count){throw 'Fresh contextual replay and unchanged original source required.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
Copy-Item $target $destination
$commands=@()
function InvokeRecorded([string]$Name,[string[]]$Arguments)
{
    & dotnet @Arguments *> (Join-Path $destination "$Name.log")
    $code=$LASTEXITCODE
    $script:commands+=[ordered]@{name=$Name;entryPoint='dotnet';arguments=$Arguments;actualExitCode=$code}
    $script:commands|ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'execution.json')
    if($code-ne0)
    {
        Get-Content (Join-Path $destination "$Name.log") -Tail 35
        throw "Actual $Name failed with exit$code."
    }
}
InvokeRecorded 'existing-extension-point' @('msbuild',$ownerProject,'-nologo','-getProperty:CustomAfterMicrosoftCommonTargets')
$existingExtension=[IO.File]::ReadAllText((Join-Path $destination 'existing-extension-point.log')).Trim()
$existingExtensionFile=$existingExtension.Length-gt0 -and (Test-Path -LiteralPath $existingExtension -PathType Leaf)
if($existingExtensionFile){throw 'Do not replace an existing framework build extension.'}
$scopeRows=@()
foreach($name in 'Microsoft.AspNetCore.Components.Analyzers.csproj')
{
    $before=[IO.File]::ReadAllText((Join-Path $run "baseline-canonical\src\Components\Analyzers\src\$name")).Replace("`r`n","`n")
    $after=[IO.File]::ReadAllText((Join-Path $run "current-default-canonical\src\Components\Analyzers\src\$name")).Replace("`r`n","`n")
    if($before-cne$after){throw 'Actual contextual project differs on current default.'}
    $scopeRows+=[ordered]@{file=$name;canonicalEqual=$true}
}
$beforeApi=[IO.File]::ReadAllText((Join-Path $run 'baseline-canonical\src\Components\Analyzers\src\ComponentsApi.cs'))
$afterApi=[IO.File]::ReadAllText((Join-Path $run 'current-default-canonical\src\Components\Analyzers\src\ComponentsApi.cs'))
foreach($name in 'BindConverter','ComponentBase','EventCallbackFactory','RenderTreeBuilder')
{
    $pattern="(?s)public static class $name\s*\{.*?\}"
    $beforeSite=[regex]::Match($beforeApi,$pattern).Value.Replace("`r`n","`n")
    $afterSite=[regex]::Match($afterApi,$pattern).Value.Replace("`r`n","`n")
    if($beforeSite.Length-lt50 -or $beforeSite-cne$afterSite){throw 'Actual referenced API class differs on current default.'}
    $scopeRows+=[ordered]@{file='ComponentsApi.cs';site=$name;canonicalEqual=$true}
}
$pattern='public const string AssemblyName\s*=.*?;'
$beforeSite=[regex]::Match($beforeApi,$pattern).Value;$afterSite=[regex]::Match($afterApi,$pattern).Value
if($beforeSite.Length-lt30 -or $beforeSite-cne$afterSite){throw 'Actual referenced namespace prefix differs.'}
$scopeRows+=[ordered]@{file='ComponentsApi.cs';site='AssemblyName';canonicalEqual=$true}
$before=[IO.File]::ReadAllText((Join-Path $run 'baseline-canonical\src\Components\Analyzers\src\DiagnosticDescriptors.cs'))
$after=[IO.File]::ReadAllText((Join-Path $run 'current-default-canonical\src\Components\Analyzers\src\DiagnosticDescriptors.cs'))
$pattern='(?s)DiagnosticDescriptor ForLoopIteratorVariableUsedInClosure\s*=.*?;'
$beforeSite=[regex]::Match($before,$pattern).Value.Replace("`r`n","`n");$afterSite=[regex]::Match($after,$pattern).Value.Replace("`r`n","`n")
if($beforeSite.Length-lt100 -or $beforeSite-cne$afterSite){throw 'Actual BL0014 descriptor differs.'}
$scopeRows+=[ordered]@{file='DiagnosticDescriptors.cs';site='BL0014 initializer';canonicalEqual=$true}
[xml]$oldResources=[IO.File]::ReadAllText((Join-Path $run 'baseline-canonical\src\Components\Analyzers\src\Resources.resx'))
[xml]$newResources=[IO.File]::ReadAllText((Join-Path $run 'current-default-canonical\src\Components\Analyzers\src\Resources.resx'))
foreach($name in 'ForLoopIteratorVariableUsedInClosure_Title','ForLoopIteratorVariableUsedInClosure_Format','ForLoopIteratorVariableUsedInClosure_Description')
{
    $oldValue=[string]($oldResources.root.data|Where-Object name -CEQ $name).value
    $newValue=[string]($newResources.root.data|Where-Object name -CEQ $name).value
    if($oldValue.Length-eq0 -or $oldValue-cne$newValue){throw 'Actual BL0014 resource differs.'}
    $scopeRows+=[ordered]@{file='Resources.resx';site=$name;canonicalEqual=$true}
}
if($scopeRows.Count-ne10){throw 'Ten actual referenced prerequisites required.'}
[ordered]@{candidate='F006';currentDefault=(Get-Content (Join-Path $run 'current-source-investigation.json') -Raw|ConvertFrom-Json).currentDefault;
    exactCapturedClassSha256=(Get-FileHash $captured).Hash;scopePrerequisites=$scopeRows;
    scope='Actual captured current-default class through baseline shipping project with ten exact referenced prerequisites and original identical harness image.';
    wholeDefaultAssemblyOrRepositoryIntegration=$false;shippingSourceEdit=$false;performanceComparison=$false;notADefaultNullFixProposal=$true;
    originalOptionalExtensionPath=$existingExtension;originalOptionalExtensionFileExists=$existingExtensionFile;explicitlyReusedGuardDesignFrom='F005,not its results'}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'scope.json')
try
{
    InvokeRecorded 'captured-class-owner-build' @('build',$ownerProject,'--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q','-p:UseIisNativeAssets=false',"-p:CustomAfterMicrosoftCommonTargets=$target","-p:F006CapturedSource=$captured","-bl:$destination\captured-class-owner-build.binlog")
    New-Item $image -ItemType Directory -Force|Out-Null
    Copy-Item (Join-Path $run 'binaries\original\*') $image -Recurse
    foreach($name in 'Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb'){Copy-Item (Join-Path $ownerOutput $name) (Join-Path $image $name)}
    New-Item $frozen -ItemType Directory -Force|Out-Null
    Copy-Item (Join-Path $run 'frozen-source\original\*') $frozen -Recurse
    Copy-Item $captured (Join-Path $frozen 'owner\ForLoopIteratorInClosureAnalyzer.cs')
    $files=@(Get-ChildItem $image -File -Recurse|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($image,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
    $sources=@(Get-ChildItem $frozen -File -Recurse|ForEach-Object {[ordered]@{relativePath=[IO.Path]::GetRelativePath($frozen,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
    [ordered]@{candidate='F006';variant='current-default-class';ownerSha256=(Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash;
        imageRoot=$image;files=$files;frozenSources=$sources;actualTestOutputOwnerMatched=$false;existingTestRows=0;wholeDefaultIntegration=$false}|
        ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'manifest-current-default-class.json')
    & (Join-Path $PSScriptRoot 'F006-characterize.ps1') -Variant current-default-class
}
finally
{
    InvokeRecorded 'restore-baseline-owner-output' @('build',$ownerProject,'--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q','-p:UseIisNativeAssets=false',"-bl:$destination\restore-baseline-owner-output.binlog")
    $original=Get-Content (Join-Path $run 'manifest-original.json') -Raw|ConvertFrom-Json
    if((Get-FileHash (Join-Path $ownerOutput 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash-cne$original.ownerSha256){throw 'Restored baseline owner output differs bytewise.'}
}
Write-Output 'F006 captured current-default class120 real compiler checks/adjacent null fix passed;baseline owner output restored byte-exact. No whole-default integration claim.'
