. (Join-Path $PSScriptRoot 'Common.ps1')
$missingByRole = @{}
$origins = @{}
foreach ($role in @('original','default'))
{
    $prior = Join-Path $Root "images\$role-producer"
    $target = Join-Path $Root "images\$role-complete"
    if (Test-Path $target) { throw 'Refusing to overwrite previous completed image' }
    Copy-Item -LiteralPath $prior -Destination $target -Recurse
    $missing = @{}
    $builtRoot = Join-Path $Root "scratch\$role\artifacts\bin"
    foreach ($projectDirectory in Get-ChildItem $builtRoot -Directory)
    {
        $name = $projectDirectory.Name
        $ownerPath = Join-Path $projectDirectory.FullName "Release\net12.0\$name.dll"
        if (-not (Test-Path $ownerPath)) { continue }
        if (Test-Path (Join-Path $target "$name.dll")) { continue }
        $missing[$name] = $ownerPath
        Copy-Item -LiteralPath $ownerPath -Destination $target
        $pdb = [IO.Path]::ChangeExtension($ownerPath,'.pdb')
        if (Test-Path $pdb) { Copy-Item -LiteralPath $pdb -Destination $target }
    }
    $missingByRole[$role] = $missing
    $origins[$role] = @($missing.GetEnumerator() | Sort-Object Name | ForEach-Object {
        [ordered]@{
            file = "$($_.Name).dll"; actualNativeBuildOutput = $_.Value
            sha256 = (Get-FileHash $_.Value -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    })
}
$originalNames = @($missingByRole.original.Keys | Sort-Object)
$defaultNames = @($missingByRole.default.Keys | Sort-Object)
if (Compare-Object $originalNames $defaultNames) { throw 'Role dependency sets differ; inspect instead of substituting' }
$targetGraph = [ordered]@{}
$libraries = [ordered]@{}
foreach ($name in $originalNames)
{
    $version = [Reflection.AssemblyName]::GetAssemblyName($missingByRole.original[$name]).Version.ToString()
    $otherVersion = [Reflection.AssemblyName]::GetAssemblyName($missingByRole.default[$name]).Version.ToString()
    if ($version -ne $otherVersion) { throw "Dependency assembly identity mismatch: $name" }
    $library = "$name/$version"
    $targetGraph[$library] = @{ runtime = @{ "$name.dll" = @{ assemblyVersion = $version } } }
    $libraries[$library] = @{ type = 'project'; serviceable = $false; sha512 = '' }
}
$additional = [ordered]@{
    runtimeTarget = @{ name = '.NETCoreApp,Version=v12.0'; signature = '' }
    compilationOptions = @{}
    targets = @{ '.NETCoreApp,Version=v12.0' = $targetGraph }
    libraries = $libraries
}
$commonPath = Join-Path $Root 'probe\AutoPerf.F137.SourceClosure.deps.json'
Save-Json $commonPath $additional
foreach ($role in @('original','default'))
{
    $target = Join-Path $Root "images\$role-complete"
    Copy-Item -LiteralPath $commonPath -Destination $target
    Save-Json (Join-Path $Root "evidence\$role-complete-closure-before-execution.json") @(Inventory $target)
}
Save-Json (Join-Path $Root 'evidence\source-closure-prerequisite-repair.json') ([ordered]@{
    failedCommands = @('original-real-managed-producer','default-real-managed-producer')
    failure = 'FileNotFoundException for Microsoft.AspNetCore.Authorization.Policy during AddControllersWithViews before producer assertions could run.'
    causeBoundary = 'Native repo test closure omits some IsAspNetCoreApp shared-framework dependencies; those projects were already built successfully by the same native graph.'
    repair = 'Create new private complete images; copy only missing primary source-built project DLL/PDB outputs. Add byte-identical explicit native-host additional-deps overlay for both roles.'
    commonConsumerRecompiled = $false; compiledAppDllPdbDepsRuntimeconfigUnchanged = $true
    noOldImageOrOutcomeOverwritten = $true
    actualAddedSourceDependencies = $origins
    commonAdditionalDepsSha256 = (Get-FileHash $commonPath -Algorithm SHA256).Hash.ToLowerInvariant()
})
Write-Host "Completed private source closures with $($originalNames.Count) missing source assemblies; common compiled bytes unchanged."
