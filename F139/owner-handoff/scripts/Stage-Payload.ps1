$ErrorActionPreference = 'Stop'
$scope = $PSScriptRoot
$capsule = Join-Path $scope 'capsule'
if (Test-Path $capsule) { throw 'Capsule already exists; preserve the existing attempt.' }
New-Item -ItemType Directory -Force $capsule | Out-Null
foreach ($directory in @('common', 'consumer-source', 'fixtures', 'images\original', 'images\default', 'results\original-producer', 'results\default-producer', 'native-tests', 'scripts', 'failed-attempts')) {
    New-Item -ItemType Directory -Force (Join-Path $capsule $directory) | Out-Null
}
Get-ChildItem "$scope\consumer\bin\Debug\net12.0" -File | Copy-Item -Destination "$capsule\common"
Copy-Item "$scope\consumer\Program.cs", "$scope\consumer\F139.EmitProbe.csproj" -Destination "$capsule\consumer-source"
foreach ($context in @('portable', 'none')) {
    $target = "$capsule\consumer-source\contexts\$context"
    New-Item -ItemType Directory -Force $target | Out-Null
    Get-ChildItem "$scope\consumer\contexts\$context" -File | Copy-Item -Destination $target
}
Copy-Item "$scope\fixtures\*" -Destination "$capsule\fixtures" -Recurse
Copy-Item "$scope\audit.mjs" -Destination $capsule
Copy-Item "$scope\acceptance.json", "$scope\common-once.json", "$scope\common-closure.json", "$scope\fixture-context-configuration.json" -Destination $capsule
Copy-Item "$scope\failed-attempts\unsupported-language-context\*" -Destination "$capsule\failed-attempts"
Get-ChildItem $scope -Filter '*.ps1' -File | Copy-Item -Destination "$capsule\scripts"
$sourceCatalog = @()
$ownerProofs = @()
$selected = @(
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompiler.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/CSharpCompiler.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeViewCompilerProvider.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RazorReferenceManager.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/CompilationFailedExceptionFactory.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/FileProviderRazorProjectFileSystem.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/RuntimeCompilationFileProvider.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/DependencyInjection/RazorRuntimeCompilationMvcCoreBuilderExtensions.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.csproj',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/src/PACKAGE.md',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/test/RuntimeViewCompilerTest.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/test/CSharpCompilerTest.cs',
    'src/Mvc/Mvc.Razor.RuntimeCompilation/test/Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation.Test.csproj',
    'src/Mvc/Mvc.Razor/src/RazorView.cs',
    'src/Mvc/Mvc.ViewFeatures/src/DefaultHtmlGenerator.cs',
    'src/Razor/Razor.Runtime/src/Runtime/TagHelpers/TagHelperExecutionContext.cs',
    'eng/Versions.props',
    'eng/Version.Details.props',
    'Directory.Packages.props',
    'global.json'
)
$git = (Get-Command git).Source
foreach ($role in @('original', 'default')) {
    $checkout = Join-Path $scope $role
    $sha = if ($role -eq 'original') { '37e809ead5824bc753a1c3d56f11615bdb1296c5' } else { '00560e2dd1954a2acf2bc54b35422b0f32484bf1' }
    $input = Join-Path $scope "results\$role-producer-complete"
    if (-not (Test-Path "$input\rows.json")) { throw "No complete producer result for $role" }
    $rows = Get-Content "$input\rows.json" -Raw | ConvertFrom-Json
    if ($rows.Count -ne 26 -or @($rows | Where-Object { -not $_.passes }).Count -ne 0) { throw "Material-consumer assertions are not all green: $role" }
    $loaded = Get-Content "$input\loaded-assemblies.json" -Raw | ConvertFrom-Json
    $roleImage = Join-Path $scope "runtime-images\$role"
    foreach ($entry in $loaded) {
        if ($entry.path.StartsWith($roleImage + '\', [StringComparison]::OrdinalIgnoreCase)) {
            $relative = [IO.Path]::GetRelativePath($roleImage, $entry.path)
            $target = Join-Path "$capsule\images\$role" $relative
            New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
            Copy-Item $entry.path -Destination $target
        }
    }
    foreach ($name in @('Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation', 'Microsoft.AspNetCore.Mvc.Razor', 'Microsoft.AspNetCore.Mvc.ViewFeatures', 'Microsoft.AspNetCore.Razor.Runtime')) {
        $owner = $loaded | Where-Object name -EQ $name
        if (-not $owner) { throw "Required owner did not load: $role/$name" }
        Copy-Item ([IO.Path]::ChangeExtension($owner.path, '.pdb')) -Destination "$capsule\images\$role"
        $ownerProofs += [ordered]@{
            role = $role; name = $name; image = "images\$role\$name.dll"; pdb = "images\$role\$name.pdb"
            sha256 = $owner.sha256; mvid = $owner.mvid; actualLoadedPath = $owner.path; loaded = $true
        }
    }
    Get-ChildItem $input -File | Copy-Item -Destination "$capsule\results\$role-producer"
    Copy-Item "$scope\results\$role-existing\$role.trx" -Destination "$capsule\native-tests"
    $existing = @($selected | Where-Object { Test-Path (Join-Path $checkout $_.Replace('/', '\')) })
    & "$scope\Invoke-Recorded.ps1" -Id "040-$role-selected-source-tree" -File $git -Arguments (@('ls-tree', '-r', '--full-tree', $sha, '--') + $existing) -WorkingDirectory $checkout
    if ($global:RecordedExitCode -ne 0) { throw "Cannot attest selected source tree: $role" }
    $blobs = @{}
    foreach ($line in Get-Content "$scope\logs\040-$role-selected-source-tree.stdout.log") {
        if ($line -match '^\d+ blob ([0-9a-f]{40})\t(.+)$') { $blobs[$Matches[2]] = $Matches[1] }
    }
    foreach ($relative in $existing) {
        if (-not $blobs.ContainsKey($relative)) { throw "Selected path absent from pinned git tree: $relative" }
        $source = Join-Path $checkout $relative.Replace('/', '\')
        $snapshot = "sources\$role\" + $relative.Replace('/', '\')
        $target = Join-Path $capsule $snapshot
        New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
        Copy-Item $source -Destination $target
        $bytes = [IO.File]::ReadAllBytes($source)
        $lf = [Text.Encoding]::UTF8.GetBytes([Text.Encoding]::UTF8.GetString($bytes).Replace("`r`n", "`n"))
        $sourceCatalog += [ordered]@{
            role = $role; revision = $sha; relativePath = $relative; originalPath = $source; snapshot = $snapshot
            bytes = $bytes.Length; rawSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
            gitLfSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($lf))
            gitBlobSha1 = $blobs[$relative]
            physicalContainsCRLF = [Text.Encoding]::UTF8.GetString($bytes).Contains("`r`n")
        }
    }
    & "$scope\Invoke-Recorded.ps1" -Id "041-$role-tracked-status" -File $git -Arguments @('status', '--short', '--untracked-files=no') -WorkingDirectory $checkout
    if ($global:RecordedExitCode -ne 0) { throw "Cannot record role tracked status: $role" }
}
$sourceCatalog | ConvertTo-Json -Depth 8 | Set-Content "$capsule\source-catalog.json" -Encoding utf8
$ownerProofs | ConvertTo-Json -Depth 8 | Set-Content "$scope\staged-owner-proofs.json" -Encoding utf8
Get-ChildItem $capsule -Recurse -File | Measure-Object -Property Length -Sum | Select-Object Count, Sum
