param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [ValidateSet('original', 'candidate')]
    [string]$Variant = 'original',
    [string]$HarnessDirectory = ''
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F033'
$execution = Join-Path $run $Label
if (!$HarnessDirectory)
{
    $HarnessDirectory = Join-Path $run 'harness'
}
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F033 preparation attempt.'
}
$validation = Get-Content -Raw (Join-Path $run "validation\$Variant-existing-1\verified-result.json") | ConvertFrom-Json
if ($validation.actualPassed -ne 15 -or $validation.actualSkipped -ne 0 -or $validation.actualFailures -ne 0)
{
    throw 'Require all 15 exact fresh owning functional rows before freezing the owner.'
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
$project = Join-Path $HarnessDirectory 'AutoPerf.Benchmarks.csproj'
$config = Join-Path $run '.editorconfig'
if (!(Test-Path -LiteralPath $config))
{
    Copy-Item -LiteralPath (Join-Path $root '.editorconfig') -Destination $config
}
if ((Get-FileHash -LiteralPath $config).Hash -cne (Get-FileHash -LiteralPath (Join-Path $root '.editorconfig')).Hash)
{
    throw 'Use the actual repository formatting/analyzer configuration.'
}
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
        throw "The actual $Name step failed; retain the attempt without timing."
    }
}
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F033-httpsys-write-start' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5')
    {
        throw 'Require the independent F033 source branch.'
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
        $expected = $entry.actualWorkingBytesSha256
        if ($entry.file -ceq 'src/Servers/HttpSys/src/ResponseStream.cs')
        {
            $expected = $validation.actualResponseStreamSourceSha256
        }
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $expected)
        {
            throw 'An investigated owning/API/producer source differs from the intended tested variant.'
        }
    }
    foreach ($owner in $validation.actualOwners)
    {
        if ((Get-FileHash -LiteralPath $owner.actualProductPath).Hash -cne $owner.actualOwnerSha256 -or
            (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($owner.actualProductPath, '.pdb'))).Hash -cne $owner.actualOwnerPdbSha256)
        {
            throw 'Product owner differs from the actual fresh test build.'
        }
    }
    $consumer = Join-Path $execution 'consumer'
    if ($Variant -eq 'original')
    {
        $inputs = Join-Path $execution 'harness-inputs-before-format'
        New-Item -ItemType Directory -Path $inputs | Out-Null
        Get-ChildItem -LiteralPath $HarnessDirectory -File -Force | Copy-Item -Destination $inputs
        $format = @('format', 'whitespace', $HarnessDirectory, '--folder', '--verbosity', 'minimal', '--include') +
            @(Get-ChildItem -LiteralPath $HarnessDirectory -File -Filter '*.cs' | ForEach-Object FullName)
        Invoke-RecordedDotnet 'format-before-freeze' $format
        Invoke-RecordedDotnet 'verify-whitespace-before-freeze' ($format + '--verify-no-changes')
        if ((Get-FileHash -LiteralPath $settingsTarget).Hash -cne $settingsHash)
        {
            throw 'Formatting must not alter the byte-exact executor.'
        }
        $formatted = Join-Path $execution 'formatted-harness-inputs-before-build'
        New-Item -ItemType Directory -Path $formatted | Out-Null
        Get-ChildItem -LiteralPath $HarnessDirectory -File -Force | Copy-Item -Destination $formatted
        Invoke-RecordedDotnet 'build' @('build', $project, '-c', 'Release', '-m:2', '-nr:false',
            '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', "-p:RestoreConfigFile=$root\NuGet.config", '-v', 'minimal')
        Copy-Item -LiteralPath (Join-Path $HarnessDirectory 'bin\Release\net12.0') -Destination $consumer -Recurse
    }
    else
    {
        $original = Get-Content -Raw (Join-Path $run 'preparation-original-002\prepared\capsule.json') | ConvertFrom-Json
        $originalClosure = Get-Content -Raw $original.closurePath | ConvertFrom-Json
        foreach ($file in $originalClosure.files)
        {
            if ((Get-FileHash -LiteralPath (Join-Path $original.output $file.path)).Hash -cne $file.sha256)
            {
                throw 'Original consumer changed before the identical-harness candidate copy.'
            }
        }
        Copy-Item -LiteralPath $original.output -Destination $consumer -Recurse
        foreach ($extension in @('.dll', '.pdb'))
        {
            $owner = $validation.actualOwners | Where-Object assembly -eq 'Microsoft.AspNetCore.Server.HttpSys'
            Copy-Item -LiteralPath ([IO.Path]::ChangeExtension($owner.actualProductPath, $extension)) `
                -Destination (Join-Path $consumer "Microsoft.AspNetCore.Server.HttpSys$extension")
        }
        $differences = @(foreach ($file in $originalClosure.files)
        {
            $actual = (Get-FileHash -LiteralPath (Join-Path $consumer $file.path)).Hash
            if ($actual -cne $file.sha256)
            {
                [ordered]@{ path = $file.path; originalSha256 = $file.sha256; candidateSha256 = $actual }
            }
        })
        if ($differences.Count -ne 2 -or @($differences | Where-Object {
            $_.path -notin @('Microsoft.AspNetCore.Server.HttpSys.dll', 'Microsoft.AspNetCore.Server.HttpSys.pdb')
        }).Count)
        {
            throw 'Only the actual tested HTTP.sys owner DLL/PDB may differ.'
        }
        [ordered]@{
            actualHarnessRebuilt = $false; actualOriginalConsumerCopied = $true
            actualChangedConsumerFiles = $differences
        } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'identical-harness-owner-patch.json') -Encoding utf8NoBOM
    }
    foreach ($owner in $validation.actualOwners)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $consumer "$($owner.assembly).dll")).Hash -cne $owner.actualOwnerSha256 -or
            (Get-FileHash -LiteralPath (Join-Path $consumer "$($owner.assembly).pdb")).Hash -cne $owner.actualOwnerPdbSha256)
        {
            throw 'Frozen consumer did not select the actually tested owner.'
        }
    }
    $prepared = Join-Path $execution 'prepared'
    $sources = Join-Path $prepared 'sources'
    foreach ($name in @('httpsys', 'harness'))
    {
        New-Item -ItemType Directory -Path (Join-Path $sources $name) -Force | Out-Null
    }
    foreach ($file in @('ResponseStream.cs', 'RequestProcessing\RequestContext.FeatureCollection.cs',
        'RequestProcessing\ResponseBody.cs', 'MessagePump.cs'))
    {
        Copy-Item -LiteralPath (Join-Path $root "src\Servers\HttpSys\src\$file") `
            -Destination (Join-Path $sources "httpsys\$([IO.Path]::GetFileName($file))")
    }
    Get-ChildItem -LiteralPath $HarnessDirectory -File -Force | Copy-Item -Destination (Join-Path $sources 'harness')
    $closure = [ordered]@{
        candidate = 'F033'; variant = $Variant
        files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse -Force | ForEach-Object {
            [ordered]@{ path = [IO.Path]::GetRelativePath($consumer, $_.FullName)
                sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash; bytes = $_.Length }
        })
    }
    $closurePath = Join-Path $prepared 'closure.json'
    $closure | ConvertTo-Json -Depth 10 | Set-Content $closurePath -Encoding utf8NoBOM
    [ordered]@{
        candidate = 'F033'; variant = $Variant; actualSourceHeadAtBuild = (& git rev-parse HEAD).Trim()
        actualPreparationLabel = $Label; actualShippingChanges = $(if ($Variant -eq 'candidate') { 1 } else { 0 })
        actualHarnessSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.dll')).Hash
        actualHarnessPdbSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.pdb')).Hash
        actualSettingsExecutorSourceSha256 = $settingsHash; actualClosureFiles = $closure.files.Count
        actualWhitespaceVerifiedBeforeFreeze = $true; actualHarnessRebuilt = $Variant -eq 'original'
        actualRepoEditorConfigSha256 = (Get-FileHash -LiteralPath $config).Hash
        output = $consumer; sources = $sources; closurePath = $closurePath
        actualTestedOwners = $validation.actualOwners
        sourceFiles = @(Get-ChildItem -LiteralPath $sources -File -Recurse -Force | ForEach-Object {
            [ordered]@{ path = [IO.Path]::GetRelativePath($prepared, $_.FullName); sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash }
        })
    } | ConvertTo-Json -Depth 15 | Set-Content (Join-Path $prepared 'capsule.json') -Encoding utf8NoBOM
    Write-Output "F033 prepared $Variant : $($closure.files.Count) frozen consumer files;no timing."
}
finally
{
    Pop-Location
}
