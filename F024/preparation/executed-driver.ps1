param(
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label = 'preparation'
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F024'
$execution = Join-Path $run $Label
$prepared = Join-Path $run 'prepared'
$consumer = Join-Path $run 'consumer'
if ((Test-Path -LiteralPath $execution) -or (Test-Path -LiteralPath $consumer) -or
    ((Test-Path -LiteralPath $prepared) -and @(Get-ChildItem -LiteralPath $prepared -Force).Count))
{
    throw 'Do not overwrite an actual prepared F024 consumer.'
}
$validation = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\selected-owning\verified-result.json') | ConvertFrom-Json
if ($validation.actualPassed -ne 34 -or $validation.actualExpectedRed -ne 0 -or $validation.actualSkipped -ne 0)
{
    throw 'The actual34 selected owning/resource/lifetime/cancellation rows must pass first.'
}
$source = Join-Path $root 'src\Middleware\Session\src\DistributedSession.cs'
if ((Get-FileHash -LiteralPath $source).Hash -cne $validation.actualSourceSha256)
{
    throw 'The selected owner changed after its actual owning tests.'
}
$originalText = [IO.File]::ReadAllText((Join-Path $run 'owners\original\DistributedSession.cs'))
$selectedText = [IO.File]::ReadAllText($source)
$startMarker = '    public async Task CommitAsync'
$endMarker = '    // Format:'
if ($originalText.Substring(0, $originalText.IndexOf($startMarker, [StringComparison]::Ordinal)) -cne
    $selectedText.Substring(0, $selectedText.IndexOf($startMarker, [StringComparison]::Ordinal)) -or
    $originalText.Substring($originalText.IndexOf($endMarker, [StringComparison]::Ordinal)) -cne
    $selectedText.Substring($selectedText.IndexOf($endMarker, [StringComparison]::Ordinal)))
{
    throw 'F023 LoadAsync or other non-CommitAsync source changed out of scope.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
if (!(Test-Path -LiteralPath $prepared))
{
    New-Item -ItemType Directory -Path $prepared | Out-Null
}
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$settingsSource = Join-Path $PSScriptRoot 'autoperf-runs\F022\harness\SettingsPreservingEmitToolchain.cs'
$settingsHash = '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B'
if ((Get-FileHash -LiteralPath $settingsSource).Hash -cne $settingsHash)
{
    throw 'Reuse the byte-exact settings-preserving executor,not a stock priority-changing executor.'
}
Copy-Item -LiteralPath $settingsSource -Destination (Join-Path $run 'harness\SettingsPreservingEmitToolchain.cs')
$selectedOwner = Join-Path $run 'owners\selected'
if (!(Test-Path -LiteralPath $selectedOwner))
{
    New-Item -ItemType Directory -Path $selectedOwner | Out-Null
}
foreach ($extension in @('dll', 'pdb'))
{
    $name = 'Microsoft.AspNetCore.Session.' + $extension
    $actual = Join-Path $root "artifacts\bin\Microsoft.AspNetCore.Session\Release\net12.0\$name"
    $expected = if ($extension -eq 'dll') { $validation.actualOwnerSha256 } else { $validation.actualOwnerPdbSha256 }
    if ((Get-FileHash -LiteralPath $actual).Hash -cne $expected)
    {
        throw 'The selected owning-test image changed before freezing.'
    }
    $snapshot = Join-Path $selectedOwner $name
    if (Test-Path -LiteralPath $snapshot)
    {
        if ((Get-FileHash -LiteralPath $snapshot).Hash -cne $expected)
        {
            throw 'Do not replace a different selected owner from an earlier preparation.'
        }
    }
    else
    {
        Copy-Item -LiteralPath $actual -Destination $snapshot
    }
}
$selectedSnapshot = Join-Path $selectedOwner 'DistributedSession.cs'
if (Test-Path -LiteralPath $selectedSnapshot)
{
    if ((Get-FileHash -LiteralPath $selectedSnapshot).Hash -cne $validation.actualSourceSha256)
    {
        throw 'Do not replace a different selected source snapshot.'
    }
}
else
{
    Copy-Item -LiteralPath $source -Destination $selectedSnapshot
}
$buildInputs = Join-Path $execution 'harness-inputs'
New-Item -ItemType Directory -Path $buildInputs | Out-Null
Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File | Copy-Item -Destination $buildInputs
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
    $arguments = @('build', (Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'), '-c', 'Release',
        '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        "-p:RestoreConfigFile=$root\NuGet.config", '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'build.stdout') 2> (Join-Path $execution 'build.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source
        arguments = $arguments
        actualSdk = $sdk
        workingDirectory = $root
        sourceHead = (& git rev-parse HEAD).Trim()
        actualSourceSha256 = $validation.actualSourceSha256
        actualExitCode = $code
        started = $started
        completed = [DateTimeOffset]::UtcNow.ToString('o')
        newStandaloneManifestPermitsRestore = $true
        actualRootManifestChanges = 0
        comparativeTiming = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'build-invocation.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'build.stdout') -Tail 18
    if ($code -ne 0)
    {
        Get-Content -LiteralPath (Join-Path $execution 'build.stderr') -Tail 18
        throw 'The actual standalone Session harness failed to build. Preserve this attempt.'
    }
    $built = Join-Path $run 'harness\bin\Release\net12.0'
    if ((Get-FileHash -LiteralPath (Join-Path $built 'Microsoft.AspNetCore.Session.dll')).Hash -cne $validation.actualOwnerSha256)
    {
        throw 'The actual standalone project did not select the tested rebuilt Session owner.'
    }
    Copy-Item -LiteralPath $built -Destination $consumer -Recurse
    $variants = [ordered]@{}
    foreach ($variant in @('original', 'selected'))
    {
        $directory = Join-Path $prepared $variant
        $sources = Join-Path $directory 'sources'
        $ownerSources = Join-Path $sources 'owner'
        $harnessSources = Join-Path $sources 'harness'
        New-Item -ItemType Directory -Path $ownerSources, $harnessSources | Out-Null
        foreach ($name in @('DistributedSession.cs', 'DistributedSessionStore.cs', 'SessionOptions.cs', 'DefaultDistributedSessionStore.cs', 'Microsoft.AspNetCore.Session.csproj'))
        {
            $input = if ($name -eq 'DistributedSession.cs') { Join-Path $run "owners\$variant\$name" }
                else { Join-Path $root "src\Middleware\Session\src\$name" }
            Copy-Item -LiteralPath $input -Destination (Join-Path $ownerSources $name)
        }
        Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File | Copy-Item -Destination $harnessSources
        $owners = @(foreach ($extension in @('dll', 'pdb'))
        {
            $name = 'Microsoft.AspNetCore.Session.' + $extension
            $frozen = Join-Path $run "owners\$variant\$name"
            Copy-Item -LiteralPath $frozen -Destination (Join-Path $consumer $name)
            [ordered]@{ name = $name; source = $frozen; sha256 = (Get-FileHash -LiteralPath $frozen).Hash }
        })
        $closure = [ordered]@{
            candidate = 'F024'
            variant = $variant
            files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse | ForEach-Object {
                [ordered]@{ path = [IO.Path]::GetRelativePath($consumer, $_.FullName); sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash; bytes = $_.Length }
            })
        }
        $closurePath = Join-Path $directory 'closure.json'
        $closure | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $closurePath -Encoding utf8NoBOM
        $variants[$variant] = [ordered]@{
            directory = $directory
            sources = $sources
            owners = $owners
            closurePath = $closurePath
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
    if ($differences.Count -ne 2 -or 'Microsoft.AspNetCore.Session.dll' -cnotin $differences -or
        'Microsoft.AspNetCore.Session.pdb' -cnotin $differences)
    {
        throw 'Only the actual Session DLL/PDB may differ between the paired consumer images.'
    }
    [ordered]@{
        candidate = 'F024'
        actualSourceHeadAtBuild = (& git rev-parse HEAD).Trim()
        actualBuiltAsBaselinePlusUncommittedScopedPatch = $true
        actualSelectedSourceSha256 = $validation.actualSourceSha256
        actualHarnessSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.dll')).Hash
        actualSettingsExecutorSourceSha256 = $settingsHash
        actualClosureFiles = $selected.files.Count
        actualOnlyClosureDifferences = $differences
        output = $consumer
        variants = $variants
        actualComparisonProfilesStarted = 0
        actualF023LoadAndNonCommitSourceUnchanged = $true
    } | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath (Join-Path $prepared 'capsule.json') -Encoding utf8NoBOM
    Write-Output "F024 prepared:$($selected.files.Count)actual closure files;only Session DLL/PDB differ;0timing profiles."
}
finally
{
    Pop-Location
}
