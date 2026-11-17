param(
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Role
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F015'
$context = Join-Path $run ('contexts\' + $Role)
if (Test-Path -LiteralPath $context)
{
    throw "Do not overwrite an actual frozen context: $context"
}
New-Item -ItemType Directory -Path $context | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $context 'executed-freeze-driver.ps1')
Set-Location $root
. .\activate.ps1
$image = Join-Path $context 'image'
New-Item -ItemType Directory -Path $image | Out-Null
$original = Join-Path $run 'contexts\original'
if ($Role -eq 'original')
{
    Copy-Item -Path (Join-Path $run 'harness\bin\Release\net12.0\*') -Destination $image -Recurse
}
else
{
    Copy-Item -Path (Join-Path $original 'image\*') -Destination $image -Recurse
}
$ownerFiles = @(
    'Managed\ManagedAuthenticatedEncryptor.cs',
    'AuthenticatedEncryption\ManagedAuthenticatedEncryptorFactory.cs',
    'AuthenticatedEncryption\ConfigurationModel\ManagedAuthenticatedEncryptorConfiguration.cs',
    'AuthenticatedEncryption\ConfigurationModel\ManagedAuthenticatedEncryptorDescriptor.cs',
    'Secret.cs',
    'AuthenticatedEncryption\IAuthenticatedEncryptor.cs',
    'KeyManagement\IKey.cs'
)
$sources = Join-Path $context 'sources'
New-Item -ItemType Directory -Path (Join-Path $sources 'owner'),(Join-Path $sources 'test'),(Join-Path $sources 'harness') | Out-Null
foreach ($file in $ownerFiles)
{
    Copy-Item -LiteralPath (Join-Path $root ('src\DataProtection\DataProtection\src\' + $file)) -Destination (Join-Path $sources 'owner')
}
$testRoot = Join-Path $root 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests'
Copy-Item -LiteralPath (Join-Path $testRoot 'Managed\ManagedAuthenticatedEncryptorTests.cs'),
    (Join-Path $testRoot 'AuthenticatedEncryption\ManagedAuthenticatedEncryptorFactoryTest.cs') -Destination (Join-Path $sources 'test')
Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File |
    Where-Object Extension -In '.cs','.csproj' |
    Copy-Item -Destination (Join-Path $sources 'harness')

$productExecution = Join-Path $run ('preparation-execution\' + $Role + '-BuildProduct\attempt-001')
$productIndex = 2
foreach ($target in @('net462', 'netstandard2.0', 'net12.0'))
{
    $productIndex++
    $metadataPath = Join-Path $productExecution ('{0:D3}-actual-product-metadata-{1}.log' -f $productIndex,$target)
    $metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
    $sourceDirectory = Split-Path $metadata.Properties.TargetPath -Parent
    $destination = Join-Path $context ('products\' + $target)
    New-Item -ItemType Directory -Path $destination | Out-Null
    Get-ChildItem -LiteralPath $sourceDirectory -File |
        Where-Object Name -In 'Microsoft.AspNetCore.DataProtection.dll','Microsoft.AspNetCore.DataProtection.pdb','Microsoft.AspNetCore.DataProtection.deps.json' |
        Copy-Item -Destination $destination
}
if ($Role -eq 'candidate')
{
    foreach ($extension in @('dll','pdb'))
    {
        Copy-Item -LiteralPath (Join-Path $context ('products\netstandard2.0\Microsoft.AspNetCore.DataProtection.' + $extension)) -Destination $image -Force
    }
}
$legacyOwner = Join-Path $context 'products\netstandard2.0\Microsoft.AspNetCore.DataProtection.dll'
if ((Get-FileHash $legacyOwner -Algorithm SHA256).Hash -ne
    (Get-FileHash (Join-Path $image 'Microsoft.AspNetCore.DataProtection.dll') -Algorithm SHA256).Hash)
{
    throw 'Frozen image is not the actual built legacy owner.'
}

$testExecution = Join-Path $run ('preparation-execution\' + $Role + '-Test\attempt-001')
$unitReports = @()
$testIndex = 0
foreach ($target in @('net12.0','net472'))
{
    $testIndex += 2
    $metadata = Get-Content -LiteralPath (Join-Path $testExecution ('{0:D3}-actual-test-metadata-{1}.log' -f $testIndex,$target)) -Raw | ConvertFrom-Json
    $sourceDirectory = Split-Path $metadata.Properties.TargetPath -Parent
    $destination = Join-Path $context ('owning-tests\' + $target)
    New-Item -ItemType Directory -Path $destination | Out-Null
    Get-ChildItem -LiteralPath $sourceDirectory -File |
        Where-Object { $_.BaseName -In 'Microsoft.AspNetCore.DataProtection','Microsoft.AspNetCore.DataProtection.Tests' -or
            $_.Name -Like 'Microsoft.AspNetCore.DataProtection.Tests.*.json' -or $_.Name -eq 'Microsoft.AspNetCore.DataProtection.Tests.dll.config' } |
        Copy-Item -Destination $destination
    $actualOwnerTarget = if ($target -eq 'net472') { 'net462' } else { 'net12.0' }
    if ((Get-FileHash (Join-Path $destination 'Microsoft.AspNetCore.DataProtection.dll') -Algorithm SHA256).Hash -ne
        (Get-FileHash (Join-Path $context ('products\' + $actualOwnerTarget + '\Microsoft.AspNetCore.DataProtection.dll')) -Algorithm SHA256).Hash)
    {
        throw "The actually tested $target owner differs from the frozen $actualOwnerTarget product."
    }
    $trxPath = Join-Path $testExecution ('results-' + $target + '\focused-' + $target + '.trx')
    [xml]$trx = Get-Content -LiteralPath $trxPath -Raw
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $expectedCount = if ($target -eq 'net472') { 23 } else { 39 }
    if ($rows.Count -ne $expectedCount -or @($rows | Where-Object outcome -ne Passed).Count -ne 0)
    {
        throw "Every actual $target owning row must pass; expected$expectedCount."
    }
    $preservation = @($rows | Where-Object testName -Like '*Encrypt_BlockAndStreamBoundaries_RoundTripsWithOffsets(*')
    $expectedCases = @(@(0,80),@(15,80),@(16,96),@(17,96),@(191,256),@(192,272),@(193,272),@(65536,65616))
    if ($preservation.Count -ne $expectedCases.Count)
    {
        throw 'Missing or duplicate boundary Theory rows.'
    }
    foreach ($case in $expectedCases)
    {
        $suffix = 'Encrypt_BlockAndStreamBoundaries_RoundTripsWithOffsets(plaintextLength: {0}, expectedPayloadLength: {1})' -f $case[0],$case[1]
        if (@($preservation | Where-Object { $_.testName.EndsWith($suffix, [StringComparison]::Ordinal) }).Count -ne 1)
        {
            throw "Actual Theory payload not exercised: $suffix"
        }
    }
    $unitReports += [pscustomobject]@{
        target = $target
        actualProductTarget = $actualOwnerTarget
        rawTrx = $trxPath
        rawSha256 = (Get-FileHash $trxPath -Algorithm SHA256).Hash
        actualPassed = $rows.Count
        failedOrSkipped = 0
        allEightNewTheoryPayloadsIndividuallyValidated = $true
        summaryCounters = $trx.TestRun.ResultSummary.Counters.OuterXml
        rows = @($rows | Sort-Object testName | ForEach-Object {
            [pscustomobject]@{ testName = $_.testName; outcome = $_.outcome; duration = $_.duration; testId = $_.testId; executionId = $_.executionId }
        })
    }
}
$unitReports | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $context 'owning-test-rows.json') -Encoding utf8NoBOM
$files = @(Get-ChildItem -LiteralPath $image,(Join-Path $context 'products'),(Join-Path $context 'owning-tests'),$sources -Recurse -File |
    Sort-Object FullName | ForEach-Object {
        [pscustomobject]@{ path = [IO.Path]::GetRelativePath($context,$_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash }
    })
if ($Role -eq 'candidate')
{
    $previous = Get-Content -LiteralPath (Join-Path $original 'context-manifest.json') -Raw | ConvertFrom-Json
    $previousImage = @($previous.files | Where-Object path -Like 'image\*')
    $currentImage = @($files | Where-Object path -Like 'image\*')
    if ($previousImage.Count -ne $currentImage.Count)
    {
        throw 'Comparison images have different file inventories.'
    }
    $differences = @($currentImage | Where-Object {
        $match = @($previousImage | Where-Object path -EQ $_.path)
        $match.Count -ne 1 -or $match[0].sha256 -ne $_.sha256
    } | Select-Object -ExpandProperty path)
    if (($differences | Sort-Object) -Join '|' -ne 'image\Microsoft.AspNetCore.DataProtection.dll|image\Microsoft.AspNetCore.DataProtection.pdb')
    {
        throw ('Comparison changes nonowner bytes: ' + ($differences -Join ', '))
    }
}
[pscustomobject]@{
    candidate = 'F015'; role = $Role; frozenAt = [DateTimeOffset]::UtcNow.ToString('o')
    legacyOwnerSha256 = (Get-FileHash $legacyOwner -Algorithm SHA256).Hash
    selectedSourceWitnessesNotWholeCompilerCoverage = $true
    evaluatedDefineConstantsAreBeforeSdkImplicitSymbolTargetsNotFinalCscArguments = $true
    files = $files
} | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $context 'context-manifest.json') -Encoding utf8NoBOM
$arguments = @((Join-Path $image 'AutoPerf.Benchmarks.dll'), '--sources', $sources, '--context', $Role,
    '--mode', 'characterize', '--artifacts', (Join-Path $context 'characterization'))
$started = [DateTimeOffset]::UtcNow.ToString('o')
& dotnet @arguments *> (Join-Path $context 'characterization.log')
$actualExitCode = $LASTEXITCODE
[pscustomobject]@{ executable = (Get-Command dotnet).Source; arguments = $arguments; actualExitCode = $actualExitCode;
    started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); mode = 'Untimed characterization; no profile or comparison consumed.' } |
    ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $context 'characterization-command.json') -Encoding utf8NoBOM
Get-Content -LiteralPath (Join-Path $context 'characterization.log') -Tail 30
if ($actualExitCode -ne 0)
{
    throw "Actual $Role legacy characterization failed; preserve the frozen context/output."
}
Write-Output ("Frozen {0}: {1} files, actual39+23 owning rows and14 legacy wrapper preflights." -f $Role,$files.Count)
