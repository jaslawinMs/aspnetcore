param(
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label = 'preparation'
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F028'
$execution = Join-Path $run $Label
$prepared = Join-Path $run 'prepared'
$consumer = Join-Path $run 'consumer'
if ((Test-Path -LiteralPath $execution) -or (Test-Path -LiteralPath $consumer) -or
    ((Test-Path -LiteralPath $prepared) -and @(Get-ChildItem -LiteralPath $prepared -Force).Count))
{
    throw 'Do not overwrite an actual prepared F028 consumer.'
}
$validation = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\selected-owning\verified-result.json') | ConvertFrom-Json
$red = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\original-resource-characterization-002\verified-result.json') | ConvertFrom-Json
if ($validation.actualPassed -ne 138 -or $validation.actualExpectedRed -ne 0 -or $validation.actualSkipped -ne 0 -or
    $red.actualPassed -ne 137 -or $red.actualExpectedRed -ne 1 -or $red.actualSkipped -ne 0)
{
    throw 'Require all138selected rows and the corrected specific original resource red.'
}
$source = Join-Path $root 'src\Identity\Core\src\SignInManager.cs'
if ((Get-FileHash -LiteralPath $source).Hash -cne $validation.actualSourceSha256)
{
    throw 'The selected owner changed after its actual owning tests.'
}
$originalText = [IO.File]::ReadAllText((Join-Path $run 'owners\original\SignInManager.cs'))
$selectedText = [IO.File]::ReadAllText($source)
$startMarker = '    public virtual async Task<ExternalLoginInfo?> GetExternalLoginInfoAsync'
$endMarker = '    public virtual async Task<IdentityResult> UpdateExternalAuthenticationTokensAsync'
if ($originalText.Substring(0, $originalText.IndexOf($startMarker, [StringComparison]::Ordinal)) -cne
    $selectedText.Substring(0, $selectedText.IndexOf($startMarker, [StringComparison]::Ordinal)) -or
    $originalText.Substring($originalText.IndexOf($endMarker, [StringComparison]::Ordinal)) -cne
    $selectedText.Substring($selectedText.IndexOf($endMarker, [StringComparison]::Ordinal)))
{
    throw 'A different SignInManager method changed out of scope.'
}
New-Item -ItemType Directory -Path $execution, $prepared | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$settingsSource = Join-Path $PSScriptRoot 'autoperf-runs\F022\harness\SettingsPreservingEmitToolchain.cs'
$settingsHash = '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B'
if ((Get-FileHash -LiteralPath $settingsSource).Hash -cne $settingsHash)
{
    throw 'Reuse the byte-exact settings-preserving executor,not a stock priority-changing executor.'
}
Copy-Item -LiteralPath $settingsSource -Destination (Join-Path $run 'harness\SettingsPreservingEmitToolchain.cs')
Push-Location $root
try
{
    . .\activate.ps1
    $env:AUTOPERF_ASPNETCORE_ROOT = $root
    $sdk = (& dotnet --version).Trim()
    if ($sdk -ne '12.0.100-alpha.1.26557.102')
    {
        throw 'Use the actual pinned repository SDK.'
    }
    $ownerArguments = @('build', 'src\Identity\Core\src\Microsoft.AspNetCore.Identity.csproj', '-c', 'Release',
        '--no-restore', '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        '-p:BuildProjectReferences=false', '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @ownerArguments 1> (Join-Path $execution 'owner-build.stdout') 2> (Join-Path $execution 'owner-build.stderr')
    $ownerCode = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $ownerArguments; actualSdk = $sdk
        workingDirectory = $root; actualExitCode = $ownerCode; started = $started
        completed = [DateTimeOffset]::UtcNow.ToString('o'); separateExplicitOwningBuild = $true; comparativeTiming = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'owner-build-invocation.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'owner-build.stdout') -Tail 10
    if ($ownerCode -ne 0)
    {
        Get-Content -LiteralPath (Join-Path $execution 'owner-build.stderr') -Tail 20
        throw 'The separate actual owning build failed;preserve this attempt.'
    }
    $selectedOwner = Join-Path $run 'owners\selected'
    if (Test-Path -LiteralPath $selectedOwner)
    {
        throw 'Do not overwrite an earlier frozen selected owner.'
    }
    New-Item -ItemType Directory -Path $selectedOwner | Out-Null
    foreach ($extension in @('dll', 'pdb'))
    {
        $name = 'Microsoft.AspNetCore.Identity.' + $extension
        $actual = Join-Path $root "artifacts\bin\Microsoft.AspNetCore.Identity\Release\net12.0\$name"
        $expected = if ($extension -eq 'dll') { $validation.actualOwnerSha256 } else { $validation.actualOwnerPdbSha256 }
        if ((Get-FileHash -LiteralPath $actual).Hash -cne $expected)
        {
            throw 'The separate owning build no longer matches the actually tested owner.'
        }
        Copy-Item -LiteralPath $actual -Destination (Join-Path $selectedOwner $name)
    }
    Copy-Item -LiteralPath $source -Destination (Join-Path $selectedOwner 'SignInManager.cs')
    $buildInputs = Join-Path $execution 'harness-inputs'
    New-Item -ItemType Directory -Path $buildInputs | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File | Copy-Item -Destination $buildInputs
    $arguments = @('build', (Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'), '-c', 'Release',
        '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        "-p:RestoreConfigFile=$root\NuGet.config", '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'build.stdout') 2> (Join-Path $execution 'build.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; actualSdk = $sdk
        workingDirectory = $root; sourceHead = (& git rev-parse HEAD).Trim()
        actualSourceSha256 = $validation.actualSourceSha256; actualExitCode = $code
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o')
        newStandaloneManifestPermitsRestore = $true; actualRootManifestChanges = 0; comparativeTiming = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'build-invocation.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'build.stdout') -Tail 22
    if ($code -ne 0)
    {
        Get-Content -LiteralPath (Join-Path $execution 'build.stderr') -Tail 22
        throw 'The actual standalone Identity harness failed to build. Preserve this attempt.'
    }
    $built = Join-Path $run 'harness\bin\Release\net12.0'
    if ((Get-FileHash -LiteralPath (Join-Path $built 'Microsoft.AspNetCore.Identity.dll')).Hash -cne $validation.actualOwnerSha256)
    {
        throw 'The actual standalone project did not select the tested rebuilt Identity owner.'
    }
    Copy-Item -LiteralPath $built -Destination $consumer -Recurse
    $variants = [ordered]@{}
    foreach ($variant in @('original', 'selected'))
    {
        $directory = Join-Path $prepared $variant
        $sources = Join-Path $directory 'sources'
        $ownerSources = Join-Path $sources 'owner'
        $providerSources = Join-Path $sources 'provider'
        $harnessSources = Join-Path $sources 'harness'
        New-Item -ItemType Directory -Path $ownerSources, $providerSources, $harnessSources | Out-Null
        foreach ($name in @('SignInManager.cs', 'ExternalLoginInfo.cs', 'Microsoft.AspNetCore.Identity.csproj'))
        {
            $input = if ($name -eq 'SignInManager.cs') { Join-Path $run "owners\$variant\$name" }
                else { Join-Path $root "src\Identity\Core\src\$name" }
            Copy-Item -LiteralPath $input -Destination (Join-Path $ownerSources $name)
        }
        Copy-Item -LiteralPath (Join-Path $root 'src\Http\Authentication.Core\src\AuthenticationSchemeProvider.cs') `
            -Destination (Join-Path $providerSources 'AuthenticationSchemeProvider.cs')
        Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File | Copy-Item -Destination $harnessSources
        $owners = @(foreach ($extension in @('dll', 'pdb'))
        {
            $name = 'Microsoft.AspNetCore.Identity.' + $extension
            $frozen = Join-Path $run "owners\$variant\$name"
            Copy-Item -LiteralPath $frozen -Destination (Join-Path $consumer $name)
            [ordered]@{ name = $name; source = $frozen; sha256 = (Get-FileHash -LiteralPath $frozen).Hash }
        })
        $closure = [ordered]@{
            candidate = 'F028'; variant = $variant
            files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse | ForEach-Object {
                [ordered]@{ path = [IO.Path]::GetRelativePath($consumer, $_.FullName); sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash; bytes = $_.Length }
            })
        }
        $closurePath = Join-Path $directory 'closure.json'
        $closure | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $closurePath -Encoding utf8NoBOM
        $variants[$variant] = [ordered]@{
            directory = $directory; sources = $sources; owners = $owners; closurePath = $closurePath
            sourceFiles = @(Get-ChildItem -LiteralPath $sources -File -Recurse | ForEach-Object {
                [ordered]@{ path = [IO.Path]::GetRelativePath($directory, $_.FullName); sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash }
            })
        }
    }
    $original = Get-Content -Raw -LiteralPath $variants.original.closurePath | ConvertFrom-Json
    $selected = Get-Content -Raw -LiteralPath $variants.selected.closurePath | ConvertFrom-Json
    if ($original.files.Count -ne $selected.files.Count)
    {
        throw 'Actual original/selected closure file counts differ.'
    }
    $differences = @($original.files | Where-Object {
        $entry = $_
        $other = @($selected.files | Where-Object { $_.path -ceq $entry.path })
        $other.Count -ne 1 -or $other[0].sha256 -cne $entry.sha256
    } | ForEach-Object path)
    if ($differences.Count -ne 2 -or 'Microsoft.AspNetCore.Identity.dll' -cnotin $differences -or
        'Microsoft.AspNetCore.Identity.pdb' -cnotin $differences)
    {
        throw 'Only the actual Identity DLL/PDB may differ between the paired consumer images.'
    }
    [ordered]@{
        candidate = 'F028'; actualSourceHeadAtBuild = (& git rev-parse HEAD).Trim()
        actualBuiltAsBaselinePlusUncommittedScopedPatch = $true
        actualSelectedSourceSha256 = $validation.actualSourceSha256
        actualHarnessSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.dll')).Hash
        actualSettingsExecutorSourceSha256 = $settingsHash; actualClosureFiles = $selected.files.Count
        actualOnlyClosureDifferences = $differences; output = $consumer; variants = $variants
        actualComparisonProfilesStarted = 0; actualOtherSignInManagerMethodsUnchanged = $true
        authoritativeOriginalResourceValidation = 'original-resource-characterization-002'
        initialResourceFixtureConfoundRetainedAndExcludedAsIsolatedProof = $true
    } | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath (Join-Path $prepared 'capsule.json') -Encoding utf8NoBOM
    Write-Output "F028 prepared:$($selected.files.Count)actual closure files;only Identity DLL/PDB differ;0timing profiles."
}
finally
{
    Pop-Location
}
