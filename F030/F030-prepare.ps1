param(
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label = 'preparation',
    [string]$HarnessDirectory = ''
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F030'
$execution = Join-Path $run $Label
if (!$HarnessDirectory)
{
    $HarnessDirectory = Join-Path $run 'harness'
}
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F030 preparation attempt.'
}
$validation = Get-Content -Raw (Join-Path $run 'validation\original-existing\verified-result.json') | ConvertFrom-Json
if ($validation.actualPassed -ne 34 -or $validation.actualSkipped -ne 0 -or $validation.actualFailures -ne 0)
{
    throw 'Require all fresh owning test outcomes before preparation.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$settingsSource = Join-Path $PSScriptRoot 'autoperf-runs\F022\harness\SettingsPreservingEmitToolchain.cs'
$settingsHash = '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B'
if ((Get-FileHash -LiteralPath $settingsSource).Hash -cne $settingsHash)
{
    throw 'Require the byte-exact settings-preserving emitter.'
}
$settingsTarget = Join-Path $HarnessDirectory 'SettingsPreservingEmitToolchain.cs'
if (!(Test-Path -LiteralPath $settingsTarget))
{
    Copy-Item -LiteralPath $settingsSource -Destination $settingsTarget
}
if ((Get-FileHash -LiteralPath $settingsTarget).Hash -cne $settingsHash)
{
    throw 'Do not replace an altered executor source.'
}
$config = Join-Path $run '.editorconfig'
if (!(Test-Path -LiteralPath $config))
{
    Copy-Item -LiteralPath (Join-Path $root '.editorconfig') -Destination $config
}
if ((Get-FileHash -LiteralPath $config).Hash -cne (Get-FileHash -LiteralPath (Join-Path $root '.editorconfig')).Hash)
{
    throw 'Use the actual repository formatting/analyzer configuration.'
}
$inputs = Join-Path $execution 'harness-inputs-before-format'
New-Item -ItemType Directory -Path $inputs | Out-Null
Get-ChildItem -LiteralPath $HarnessDirectory -File -Force | Copy-Item -Destination $inputs
$invocations = [Collections.Generic.List[object]]::new()
function Invoke-RecordedDotnet([string]$Name, [string[]]$Arguments)
{
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments 1> (Join-Path $execution "$Name.stdout") 2> (Join-Path $execution "$Name.stderr")
    $code = $LASTEXITCODE
    $invocations.Add([ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $Arguments; workingDirectory = $root
        actualSdk = $sdk; started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o')
        actualExitCode = $code; stdout = "$Name.stdout"; stderr = "$Name.stderr"; comparativeTiming = $false
    })
    $invocations | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'actual-invocations.json') -Encoding utf8NoBOM
    Get-Content (Join-Path $execution "$Name.stdout") -Tail 16
    Get-Content (Join-Path $execution "$Name.stderr") -Tail 8
    if ($code -ne 0)
    {
        throw "The actual $Name step failed;retain it without relabeling or timing."
    }
}
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F030-sync-render-partial-source' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        (& git status --porcelain --untracked-files=no))
    {
        throw 'Require the independent original F030 source branch without product edits.'
    }
    . .\activate.ps1
    $env:AUTOPERF_ASPNETCORE_ROOT = $root
    $sdk = (& dotnet --version).Trim()
    if ($sdk -cne '12.0.100-alpha.1.26557.102')
    {
        throw 'Use the activated repository SDK.'
    }
    $investigation = Get-Content -Raw (Join-Path $run 'investigation.json') | ConvertFrom-Json
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'An investigated owning/API/producer source changed.'
        }
    }
    foreach ($owner in $validation.actualOriginalOwners)
    {
        if ((Get-FileHash -LiteralPath $owner.actualProductPath).Hash -cne $owner.actualOwnerSha256 -or
            (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($owner.actualProductPath, '.pdb'))).Hash -cne $owner.actualOwnerPdbSha256)
        {
            throw 'A product owner differs from the actual fresh test build.'
        }
    }
    $format = @('format', 'whitespace', $HarnessDirectory, '--folder', '--verbosity', 'minimal', '--include') +
        @(Get-ChildItem -LiteralPath $HarnessDirectory -File -Filter '*.cs' | ForEach-Object FullName)
    Invoke-RecordedDotnet 'format-before-freeze' $format
    Invoke-RecordedDotnet 'verify-whitespace-before-freeze' ($format + '--verify-no-changes')
    if ((Get-FileHash -LiteralPath $settingsTarget).Hash -cne $settingsHash)
    {
        throw 'Formatting must not alter the byte-exact executor.'
    }
    $arguments = @('build', (Join-Path $HarnessDirectory 'AutoPerf.Benchmarks.csproj'), '-c', 'Release',
        '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        "-p:RestoreConfigFile=$root\NuGet.config", '-v', 'minimal')
    Invoke-RecordedDotnet 'build' $arguments
    $built = Join-Path $HarnessDirectory 'bin\Release\net12.0'
    foreach ($owner in $validation.actualOriginalOwners)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $built "$($owner.assembly).dll")).Hash -cne $owner.actualOwnerSha256)
        {
            throw 'The standalone consumer did not select the actually tested owner.'
        }
    }
    $consumer = Join-Path $execution 'consumer'
    Copy-Item -LiteralPath $built -Destination $consumer -Recurse
    $prepared = Join-Path $execution 'prepared'
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
        candidate = 'F030'; variant = 'unchanged-original'
        files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse -Force | ForEach-Object {
            [ordered]@{ path = [IO.Path]::GetRelativePath($consumer, $_.FullName)
                sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash; bytes = $_.Length }
        })
    }
    $closurePath = Join-Path $prepared 'closure.json'
    $closure | ConvertTo-Json -Depth 10 | Set-Content $closurePath -Encoding utf8NoBOM
    [ordered]@{
        candidate = 'F030'; actualSourceHeadAtBuild = (& git rev-parse HEAD).Trim()
        actualPreparationLabel = $Label; actualShippingChanges = 0; sourceComparison = $false
        actualHarnessSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.dll')).Hash
        actualSettingsExecutorSourceSha256 = $settingsHash; actualClosureFiles = $closure.files.Count
        actualWhitespaceVerifiedBeforeFreeze = $true; actualRepoEditorConfigSha256 = (Get-FileHash -LiteralPath $config).Hash
        output = $consumer; sources = $sources; closurePath = $closurePath
        actualOriginalOwners = $validation.actualOriginalOwners
        sourceFiles = @(Get-ChildItem -LiteralPath $sources -File -Recurse -Force | ForEach-Object {
            [ordered]@{ path = [IO.Path]::GetRelativePath($prepared, $_.FullName); sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash }
        })
    } | ConvertTo-Json -Depth 15 | Set-Content (Join-Path $prepared 'capsule.json') -Encoding utf8NoBOM
    Write-Output "F030 prepared:$($closure.files.Count) original-only consumer files;direct whitespace verified before freeze;no timing."
}
finally
{
    Pop-Location
}
