param(
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label = 'preparation',
    [string]$HarnessDirectory = ''
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F029'
$execution = Join-Path $run $Label
if (!$HarnessDirectory)
{
    $HarnessDirectory = Join-Path $run 'harness'
}
$prepared = Join-Path $execution 'prepared'
$consumer = Join-Path $execution 'consumer'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F029 build/preparation attempt.'
}
$validation = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\original-existing\verified-result.json') | ConvertFrom-Json
if ($validation.actualPassed -ne 34 -or $validation.actualSkipped -ne 0 -or $validation.actualFailures -ne 0)
{
    throw 'Require all34original owning rows before preparation.'
}
$investigation = Get-Content -Raw -LiteralPath (Join-Path $run 'investigation.json') | ConvertFrom-Json
foreach ($entry in @($investigation.parity | Where-Object core))
{
    if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
    {
        throw 'An investigated owning/API/producer source changed.'
    }
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$settingsSource = Join-Path $PSScriptRoot 'autoperf-runs\F022\harness\SettingsPreservingEmitToolchain.cs'
$settingsHash = '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B'
if ((Get-FileHash -LiteralPath $settingsSource).Hash -cne $settingsHash)
{
    throw 'Reuse the byte-exact settings-preserving emitter,not a stock priority-changing executor.'
}
$settingsTarget = Join-Path $HarnessDirectory 'SettingsPreservingEmitToolchain.cs'
if (Test-Path -LiteralPath $settingsTarget)
{
    if ((Get-FileHash -LiteralPath $settingsTarget).Hash -cne $settingsHash)
    {
        throw 'Do not replace an altered executor source.'
    }
}
else
{
    Copy-Item -LiteralPath $settingsSource -Destination $settingsTarget
}
$inputs = Join-Path $execution 'harness-inputs'
New-Item -ItemType Directory -Path $inputs | Out-Null
Get-ChildItem -LiteralPath $HarnessDirectory -File -Force | Copy-Item -Destination $inputs
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F029-sync-partial-source' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        (& git status --porcelain --untracked-files=no))
    {
        throw 'Require the independent original F029 branch without product edits.'
    }
    . .\activate.ps1
    $env:AUTOPERF_ASPNETCORE_ROOT = $root
    $sdk = (& dotnet --version).Trim()
    if ($sdk -cne '12.0.100-alpha.1.26557.102')
    {
        throw 'Use the actual pinned repository SDK.'
    }
    foreach ($owner in $validation.actualOriginalOwners)
    {
        $arguments = @('build', "src\Mvc\$($owner.assembly.Replace('Microsoft.AspNetCore.',''))\src\$($owner.assembly).csproj",
            '-c', 'Release', '--no-restore', '-m:2', '-nr:false', '-p:UseSharedCompilation=false',
            '-p:UseIisNativeAssets=false', '-p:BuildProjectReferences=false', '-v', 'minimal')
        $labelPrefix = $owner.assembly
        $started = [DateTimeOffset]::UtcNow.ToString('o')
        & dotnet @arguments 1> (Join-Path $execution "$labelPrefix-build.stdout") 2> (Join-Path $execution "$labelPrefix-build.stderr")
        $code = $LASTEXITCODE
        [ordered]@{
            executable = (Get-Command dotnet).Source; arguments = $arguments; actualSdk = $sdk
            workingDirectory = $root; actualExitCode = $code; started = $started
            completed = [DateTimeOffset]::UtcNow.ToString('o'); separateExplicitOwningBuild = $true; comparativeTiming = $false
        } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution "$labelPrefix-build-invocation.json") -Encoding utf8NoBOM
        Get-Content -LiteralPath (Join-Path $execution "$labelPrefix-build.stdout") -Tail 8
        if ($code -ne 0 -or (Get-FileHash -LiteralPath $owner.actualProductPath).Hash -cne $owner.actualOwnerSha256 -or
            (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($owner.actualProductPath, '.pdb'))).Hash -cne $owner.actualOwnerPdbSha256)
        {
            throw 'The separate actual owning build failed or differs from the actually tested owner.'
        }
    }
    $arguments = @('build', (Join-Path $HarnessDirectory 'AutoPerf.Benchmarks.csproj'), '-c', 'Release',
        '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        "-p:RestoreConfigFile=$root\NuGet.config", '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'build.stdout') 2> (Join-Path $execution 'build.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; actualSdk = $sdk
        workingDirectory = $root; sourceHead = (& git rev-parse HEAD).Trim()
        actualExitCode = $code; started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o')
        newStandaloneManifestPermitsRestore = $true; actualRootManifestChanges = 0; comparativeTiming = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'build-invocation.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'build.stdout') -Tail 25
    if ($code -ne 0)
    {
        Get-Content -LiteralPath (Join-Path $execution 'build.stderr') -Tail 20
        throw 'The standalone original-only harness failed to build. Preserve this attempt.'
    }
    $built = Join-Path $HarnessDirectory 'bin\Release\net12.0'
    foreach ($owner in $validation.actualOriginalOwners)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $built "$($owner.assembly).dll")).Hash -cne $owner.actualOwnerSha256)
        {
            throw 'The standalone build did not select the actually tested original owner.'
        }
    }
    Copy-Item -LiteralPath $built -Destination $consumer -Recurse
    $sources = Join-Path $prepared 'sources'
    foreach ($name in @('viewfeatures', 'razor', 'harness'))
    {
        New-Item -ItemType Directory -Path (Join-Path $sources $name) -Force | Out-Null
    }
    foreach ($file in @('Rendering\HtmlHelperPartialExtensions.cs', 'HtmlHelper.cs', 'Buffers\MemoryPoolViewBufferScope.cs'))
    {
        Copy-Item -LiteralPath (Join-Path $root "src\Mvc\Mvc.ViewFeatures\src\$file") `
            -Destination (Join-Path $sources "viewfeatures\$([IO.Path]::GetFileName($file))")
    }
    foreach ($file in @('RazorView.cs', 'RazorPage.cs', 'RazorPageBase.cs'))
    {
        Copy-Item -LiteralPath (Join-Path $root "src\Mvc\Mvc.Razor\src\$file") -Destination (Join-Path $sources "razor\$file")
    }
    Get-ChildItem -LiteralPath $HarnessDirectory -File -Force | Copy-Item -Destination (Join-Path $sources 'harness')
    $closure = [ordered]@{
        candidate = 'F029'; variant = 'unchanged-original'
        files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse -Force | ForEach-Object {
            [ordered]@{ path = [IO.Path]::GetRelativePath($consumer, $_.FullName)
                sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash; bytes = $_.Length }
        })
    }
    $closurePath = Join-Path $prepared 'closure.json'
    $closure | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $closurePath -Encoding utf8NoBOM
    [ordered]@{
        candidate = 'F029'; actualSourceHeadAtBuild = (& git rev-parse HEAD).Trim()
        actualPreparationLabel = $Label; actualShippingChanges = 0; sourceComparison = $false
        actualHarnessSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.dll')).Hash
        actualSettingsExecutorSourceSha256 = $settingsHash; actualClosureFiles = $closure.files.Count
        output = $consumer; sources = $sources; closurePath = $closurePath
        actualOriginalOwners = $validation.actualOriginalOwners
        sourceFiles = @(Get-ChildItem -LiteralPath $sources -File -Recurse -Force | ForEach-Object {
            [ordered]@{ path = [IO.Path]::GetRelativePath($prepared, $_.FullName)
                sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash }
        })
    } | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath (Join-Path $prepared 'capsule.json') -Encoding utf8NoBOM
    Write-Output "F029 prepared:$($closure.files.Count)actual original-only closure files;0timing profiles."
}
finally
{
    Pop-Location
}
