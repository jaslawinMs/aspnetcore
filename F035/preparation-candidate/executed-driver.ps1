param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [ValidateSet('original', 'candidate')]
    [string]$Variant = 'original',
    [string]$HarnessDirectory = '',
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$OriginalPreparation = ''
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F035'
$execution = Join-Path $run $Label
if (!$HarnessDirectory)
{
    $HarnessDirectory = Join-Path $run 'harness'
}
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F035 preparation attempt.'
}
$validation = Get-Content -Raw (Join-Path $run "validation\$Variant-existing-1\verified-result.json") | ConvertFrom-Json
if ($validation.actualPassed -ne 34 -or $validation.actualSkipped -ne 0 -or $validation.actualFailures -ne 0)
{
    throw 'Require all34exact fresh owning rows before freezing the owner.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$settingsHash = '02B69C0AA06612700D9DA122BA64081771EE333B126DABC08156C0BD118F115B'
$settingsTarget = Join-Path $HarnessDirectory 'SettingsPreservingEmitToolchain.cs'
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
    throw 'Use actual repository formatting/analyzer configuration.'
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
        throw "Actual $Name failed;retain attempt without timing."
    }
}
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F035-value-provider-enumeration' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5')
    {
        throw 'Require independent F035 source branch.'
    }
    . .\activate.ps1
    $env:AUTOPERF_ASPNETCORE_ROOT = $root
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -cne '12.0.100-alpha.1.26557.102')
    {
        throw 'Use activated repository SDK.'
    }
    $investigation = Get-Content -Raw (Join-Path $run 'investigation.json') | ConvertFrom-Json
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        $expected = $entry.actualWorkingBytesSha256
        if ($entry.file -ceq 'src/Mvc/Mvc.Abstractions/src/ModelBinding/ValueProviderResult.cs')
        {
            $expected = $validation.actualSourceSha256
        }
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $expected)
        {
            throw 'Investigated owning/API/producer source differs from intended tested variant.'
        }
    }
    $owners = @(foreach ($assembly in 'Microsoft.AspNetCore.Mvc.Abstractions','Microsoft.AspNetCore.Mvc.Core')
    {
        $product = Join-Path $root "artifacts\bin\$assembly\Release\net12.0\$assembly.dll"
        $executed = Join-Path $root "artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0\$assembly.dll"
        $pdb = [IO.Path]::ChangeExtension($product,'.pdb')
        $sha = (Get-FileHash -LiteralPath $product).Hash
        $pdbSha = (Get-FileHash -LiteralPath $pdb).Hash
        if ((Get-FileHash -LiteralPath $executed).Hash -cne $sha -or
            (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($executed,'.pdb'))).Hash -cne $pdbSha -or
            ($assembly -ceq 'Microsoft.AspNetCore.Mvc.Abstractions' -and
                ($sha -cne $validation.actualOwnerSha256 -or $pdbSha -cne $validation.actualOwnerPdbSha256)))
        {
            throw 'Current product/test-bin owner observation differs from actual fresh owner test receipt.'
        }
        [ordered]@{assembly=$assembly;actualProductPath=$product;actualOwnerSha256=$sha;actualOwnerPdbSha256=$pdbSha}
    })
    $owners | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'test-image-match-at-freeze.json') -Encoding utf8NoBOM
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
            throw 'Formatting must not alter byte-exact executor.'
        }
        $formatted = Join-Path $execution 'formatted-harness-inputs-before-build'
        New-Item -ItemType Directory -Path $formatted | Out-Null
        Get-ChildItem -LiteralPath $HarnessDirectory -File -Force | Copy-Item -Destination $formatted
        Invoke-RecordedDotnet 'build' @('build', $project, '-c', 'Release', '-m:2', '-nr:false',
            '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', "-p:RestoreConfigFile=$root\NuGet.config", '-v', 'minimal')
        if ((Get-Content -Raw (Join-Path $execution 'build.stdout')) -notmatch '\b0 Warning\(s\)' -or
            (Get-Content -Raw (Join-Path $execution 'build.stdout')) -notmatch '\b0 Error\(s\)')
        {
            throw 'Require an actual zero-warning/zero-error standalone build before freezing.'
        }
        Copy-Item -LiteralPath (Join-Path $HarnessDirectory 'bin\Release\net12.0') -Destination $consumer -Recurse
    }
    else
    {
        if (!$OriginalPreparation)
        {
            throw 'Select the actual successful authoritative original preparation explicitly.'
        }
        $original = Get-Content -Raw (Join-Path $run "$OriginalPreparation\prepared\capsule.json") | ConvertFrom-Json
        $originalClosure = Get-Content -Raw $original.closurePath | ConvertFrom-Json
        foreach ($file in $originalClosure.files)
        {
            if ((Get-FileHash -LiteralPath (Join-Path $original.output $file.path)).Hash -cne $file.sha256)
            {
                throw 'Original consumer changed before identical-harness candidate copy.'
            }
        }
        Copy-Item -LiteralPath $original.output -Destination $consumer -Recurse
        $owner = $owners | Where-Object assembly -eq 'Microsoft.AspNetCore.Mvc.Abstractions'
        foreach ($extension in '.dll','.pdb')
        {
            Copy-Item -LiteralPath ([IO.Path]::ChangeExtension($owner.actualProductPath,$extension)) `
                -Destination (Join-Path $consumer "Microsoft.AspNetCore.Mvc.Abstractions$extension")
        }
        $differences = @(foreach ($file in $originalClosure.files)
        {
            $actual = (Get-FileHash -LiteralPath (Join-Path $consumer $file.path)).Hash
            if ($actual -cne $file.sha256)
            {
                [ordered]@{path=$file.path;originalSha256=$file.sha256;candidateSha256=$actual}
            }
        })
        if ($differences.Count -ne 2 -or @($differences | Where-Object {
            $_.path -notin 'Microsoft.AspNetCore.Mvc.Abstractions.dll','Microsoft.AspNetCore.Mvc.Abstractions.pdb'
        }).Count)
        {
            throw 'Only actual tested MVC.Abstractions DLL/PDB may differ.'
        }
        [ordered]@{actualHarnessRebuilt=$false;actualOriginalConsumerCopied=$true;actualChangedConsumerFiles=$differences} |
            ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'identical-harness-owner-patch.json') -Encoding utf8NoBOM
    }
    foreach ($owner in $owners)
    {
        if ((Get-FileHash -LiteralPath (Join-Path $consumer "$($owner.assembly).dll")).Hash -cne $owner.actualOwnerSha256 -or
            (Get-FileHash -LiteralPath (Join-Path $consumer "$($owner.assembly).pdb")).Hash -cne $owner.actualOwnerPdbSha256)
        {
            throw 'Frozen consumer did not select actual observed/tested MVC owner.'
        }
    }
    $prepared = Join-Path $execution 'prepared'
    $sources = Join-Path $prepared 'sources'
    foreach ($name in 'owner','core','harness')
    {
        New-Item -ItemType Directory -Path (Join-Path $sources $name) -Force | Out-Null
    }
    Copy-Item -LiteralPath (Join-Path $root 'src\Mvc\Mvc.Abstractions\src\ModelBinding\ValueProviderResult.cs') `
        -Destination (Join-Path $sources 'owner\ValueProviderResult.cs')
    foreach ($file in 'QueryStringValueProvider.cs','QueryStringValueProviderFactory.cs',
        'Binders\CollectionModelBinder.cs','Binders\SimpleTypeModelBinder.cs')
    {
        Copy-Item -LiteralPath (Join-Path $root "src\Mvc\Mvc.Core\src\ModelBinding\$file") `
            -Destination (Join-Path $sources "core\$([IO.Path]::GetFileName($file))")
    }
    Get-ChildItem -LiteralPath $HarnessDirectory -File -Force | Copy-Item -Destination (Join-Path $sources 'harness')
    $closure = [ordered]@{
        candidate = 'F035'; variant = $Variant
        files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse -Force | ForEach-Object {
            [ordered]@{path=[IO.Path]::GetRelativePath($consumer,$_.FullName);sha256=(Get-FileHash -LiteralPath $_.FullName).Hash;bytes=$_.Length}
        })
    }
    $closurePath = Join-Path $prepared 'closure.json'
    $closure | ConvertTo-Json -Depth 10 | Set-Content $closurePath -Encoding utf8NoBOM
    [ordered]@{
        candidate = 'F035'; variant = $Variant; actualSourceHeadAtBuild = (& git rev-parse HEAD).Trim()
        actualPreparationLabel = $Label; actualShippingChanges = $(if ($Variant -eq 'candidate') { 1 } else { 0 })
        actualHarnessSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.dll')).Hash
        actualHarnessPdbSha256 = (Get-FileHash -LiteralPath (Join-Path $consumer 'AutoPerf.Benchmarks.pdb')).Hash
        actualSettingsExecutorSourceSha256 = $settingsHash; actualClosureFiles = $closure.files.Count
        actualWhitespaceVerifiedBeforeFreeze = $true; actualHarnessRebuilt = $Variant -eq 'original'
        actualRepoEditorConfigSha256 = (Get-FileHash -LiteralPath $config).Hash
        output = $consumer; sources = $sources; closurePath = $closurePath; actualTestedOwners = $owners
        sourceFiles = @(Get-ChildItem -LiteralPath $sources -File -Recurse -Force | ForEach-Object {
            [ordered]@{path=[IO.Path]::GetRelativePath($prepared,$_.FullName);sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}
        })
    } | ConvertTo-Json -Depth 15 | Set-Content (Join-Path $prepared 'capsule.json') -Encoding utf8NoBOM
    Write-Output "F035 prepared $Variant :$($closure.files.Count)frozen consumer files;no timing."
}
finally
{
    Pop-Location
}
