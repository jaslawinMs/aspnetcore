param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [string]$HarnessDirectory = ''
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F036'
$execution = Join-Path $run $Label
if (!$HarnessDirectory)
{
    $HarnessDirectory = Join-Path $run 'harness'
}
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F036 preparation attempt.'
}
$validation = Get-Content -Raw (Join-Path $run 'validation\original-existing-1\verified-result.json') | ConvertFrom-Json
if ($validation.actualPassed -ne 19 -or $validation.actualSkipped -ne 0 -or $validation.actualFailures -ne 0)
{
    throw 'Require all19fresh owning rows before freezing the owner.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$settingsHash = '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B'
$settingsTarget = Join-Path $HarnessDirectory 'SettingsPreservingEmitToolchain.cs'
if (!(Test-Path -LiteralPath $settingsTarget))
{
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'autoperf-runs\F035\harness\SettingsPreservingEmitToolchain.cs') -Destination $settingsTarget
}
if ((Get-FileHash -LiteralPath $settingsTarget).Hash -cne $settingsHash)
{
    throw 'Require the byte-exact settings-preserving emitter;never overwrite an altered executor.'
}
$project = Join-Path $HarnessDirectory 'AutoPerf.Benchmarks.csproj'
$config = Join-Path $run '.editorconfig'
if (!(Test-Path -LiteralPath $config))
{
    Copy-Item -LiteralPath (Join-Path $root '.editorconfig') -Destination $config
}
if ((Get-FileHash -LiteralPath $config).Hash -cne (Get-FileHash -LiteralPath (Join-Path $root '.editorconfig')).Hash)
{
    throw 'Require the actual repository formatting configuration.'
}
$invocations = [Collections.Generic.List[object]]::new()
function Invoke-RecordedDotnet([string]$Name, [string[]]$Arguments)
{
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments 1> (Join-Path $execution "$Name.stdout") 2> (Join-Path $execution "$Name.stderr")
    $code = $LASTEXITCODE
    $invocations.Add([ordered]@{
        executable=(Get-Command dotnet).Source; arguments=$Arguments; workingDirectory=$root
        actualSdk=$sdk; started=$started; completed=[DateTimeOffset]::UtcNow.ToString('o')
        actualExitCode=$code; stdout="$Name.stdout"; stderr="$Name.stderr"; comparativeTiming=$false
    })
    $invocations | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'actual-invocations.json') -Encoding utf8NoBOM
    Get-Content (Join-Path $execution "$Name.stdout") -Tail 16
    Get-Content (Join-Path $execution "$Name.stderr") -Tail 8
    if ($code -ne 0)
    {
        throw "Actual $Name failed;retain this untimed preparation."
    }
}
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F036-viewdata-enumeration' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        @(& git status --porcelain=v1 --untracked-files=no).Count)
    {
        throw 'Require the independent unchanged F036 source branch.'
    }
    . .\activate.ps1
    $env:AUTOPERF_ASPNETCORE_ROOT = $root
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -cne '12.0.100-alpha.1.26557.102')
    {
        throw 'Use the activated repository SDK.'
    }
    $investigation = Get-Content -Raw (Join-Path $run 'investigation.json') | ConvertFrom-Json
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'Investigated owning/API/producer source changed.'
        }
    }
    $drift = Get-Content -Raw (Join-Path $run 'constructor-dependency-review\verified-dependency-drift.json') | ConvertFrom-Json
    if ((Get-FileHash -LiteralPath (Join-Path $root $drift.file)).Hash -cne $drift.actualWorkingBytesSha256)
    {
        throw 'The separately reviewed construction dependency changed.'
    }
    foreach ($owner in $validation.actualTestBinOwners)
    {
        $test = Join-Path $root "artifacts\bin\Microsoft.AspNetCore.Mvc.ViewFeatures.Test\Release\net12.0\$($owner.assembly).dll"
        foreach ($extension in '.dll','.pdb')
        {
            $expected = if ($extension -ceq '.dll') { $owner.actualOwnerSha256 } else { $owner.actualOwnerPdbSha256 }
            if ((Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($owner.actualProductPath,$extension))).Hash -cne $expected -or
                (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($test,$extension))).Hash -cne $expected)
            {
                throw 'Product/test-bin PE/PDB differs from the fresh owning-test receipt.'
            }
        }
    }
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
    $buildOutput = Get-Content -Raw (Join-Path $execution 'build.stdout')
    if ($buildOutput -notmatch '\b0 Warning\(s\)' -or $buildOutput -notmatch '\b0 Error\(s\)')
    {
        throw 'Require a zero-warning/zero-error standalone build before freezing.'
    }
    $consumer = Join-Path $execution 'consumer'
    Copy-Item -LiteralPath (Join-Path $HarnessDirectory 'bin\Release\net12.0') -Destination $consumer -Recurse
    foreach ($owner in $validation.actualTestBinOwners)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $consumer "$($owner.assembly).dll")).Hash -cne $owner.actualOwnerSha256 -or
            (Get-FileHash -LiteralPath (Join-Path $consumer "$($owner.assembly).pdb")).Hash -cne $owner.actualOwnerPdbSha256)
        {
            throw 'Frozen consumer did not select the actual observed/tested MVC owner.'
        }
    }
    $prepared = Join-Path $execution 'prepared'
    $sources = Join-Path $prepared 'sources'
    foreach ($name in 'owner','cow','harness')
    {
        New-Item -ItemType Directory -Path (Join-Path $sources $name) -Force | Out-Null
    }
    foreach ($file in 'ViewDataDictionary.cs','ViewDataDictionaryOfT.cs','TemplateInfo.cs')
    {
        Copy-Item -LiteralPath (Join-Path $root "src\Mvc\Mvc.ViewFeatures\src\$file") -Destination (Join-Path $sources "owner\$file")
    }
    Copy-Item -LiteralPath (Join-Path $root 'src\Shared\CopyOnWriteDictionary\CopyOnWriteDictionary.cs') `
        -Destination (Join-Path $sources 'cow\CopyOnWriteDictionary.cs')
    Get-ChildItem -LiteralPath $HarnessDirectory -File -Force | Copy-Item -Destination (Join-Path $sources 'harness')
    $closure = [ordered]@{
        candidate='F036'; variant='original'
        files=@(Get-ChildItem -LiteralPath $consumer -File -Recurse -Force | ForEach-Object {
            [ordered]@{path=[IO.Path]::GetRelativePath($consumer,$_.FullName); sha256=(Get-FileHash -LiteralPath $_.FullName).Hash; bytes=$_.Length}
        })
    }
    $closurePath = Join-Path $prepared 'closure.json'
    $closure | ConvertTo-Json -Depth 10 | Set-Content $closurePath -Encoding utf8NoBOM
    [ordered]@{
        candidate='F036'; variant='original'; actualSourceHeadAtBuild=(& git rev-parse HEAD).Trim()
        actualPreparationLabel=$Label; actualShippingChanges=0; actualSourceComparisons=0
        actualHarnessSha256=(Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.dll')).Hash
        actualHarnessPdbSha256=(Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.pdb')).Hash
        actualSettingsExecutorSourceSha256=$settingsHash; actualClosureFiles=$closure.files.Count
        actualWhitespaceVerifiedBeforeFreeze=$true; actualHarnessRebuilt=$true; actualFullCurrentMainIntegration=$false
        actualRepoEditorConfigSha256=(Get-FileHash -LiteralPath $config).Hash
        output=$consumer; sources=$sources; closurePath=$closurePath; actualTestedOwners=$validation.actualTestBinOwners
        sourceFiles=@(Get-ChildItem -LiteralPath $sources -File -Recurse -Force | ForEach-Object {
            [ordered]@{path=[IO.Path]::GetRelativePath($prepared,$_.FullName); sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}
        })
    } | ConvertTo-Json -Depth 15 | Set-Content (Join-Path $prepared 'capsule.json') -Encoding utf8NoBOM
    Write-Output "F036 prepared original:$($closure.files.Count)frozen consumer files;no native timing."
}
finally
{
    Pop-Location
}
