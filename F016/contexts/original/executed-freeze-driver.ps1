param(
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string] $Role
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F016'
$context = Join-Path $run ('contexts\' + $Role)
$acceptance = Get-Content -LiteralPath (Join-Path $run 'acceptance.json') -Raw | ConvertFrom-Json
if (Test-Path -LiteralPath $context)
{
    throw "Do not overwrite an actual frozen context:$context"
}
New-Item -ItemType Directory -Path $context | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $context 'executed-freeze-driver.ps1')
Set-Location $root
. .\activate.ps1
$original = Join-Path $run 'contexts\original'
$imageKinds = @(
    [pscustomobject]@{ name = 'standard'; directory = 'image'; host = 'net12.0'; product = 'netstandard2.0'; entry = 'AutoPerf.Benchmarks.dll' },
    [pscustomobject]@{ name = 'framework'; directory = 'framework-image'; host = 'net472'; product = 'net462'; entry = 'AutoPerf.Benchmarks.exe' }
)
foreach ($kind in $imageKinds)
{
    $image = Join-Path $context $kind.directory
    New-Item -ItemType Directory -Path $image | Out-Null
    $from = if ($Role -eq 'original') { Join-Path $run ('harness\bin\Release\' + $kind.host) } else { Join-Path $original $kind.directory }
    Copy-Item -Path (Join-Path $from '*') -Destination $image -Recurse
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
$productIndex = 4
foreach ($target in 'net462','netstandard2.0','net12.0')
{
    $productIndex++
    $metadataPath = Join-Path $productExecution ('{0:D3}-actual-product-metadata-{1}.log' -f $productIndex,$target)
    $metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
    if ($metadata.Properties.TargetFramework -ne $target)
    {
        throw "Unexpected actual built target:$metadataPath"
    }
    $sourceDirectory = Split-Path $metadata.Properties.TargetPath -Parent
    $destination = Join-Path $context ('products\' + $target)
    New-Item -ItemType Directory -Path $destination | Out-Null
    Get-ChildItem -LiteralPath $sourceDirectory -File |
        Where-Object Name -In 'Microsoft.AspNetCore.DataProtection.dll','Microsoft.AspNetCore.DataProtection.pdb','Microsoft.AspNetCore.DataProtection.deps.json' |
        Copy-Item -Destination $destination
}
foreach ($kind in $imageKinds)
{
    $image = Join-Path $context $kind.directory
    foreach ($extension in 'dll','pdb')
    {
        $built = Join-Path $context ('products\' + $kind.product + '\Microsoft.AspNetCore.DataProtection.' + $extension)
        if ($Role -eq 'candidate')
        {
            Copy-Item -LiteralPath $built -Destination $image -Force
        }
        if ((Get-FileHash $built).Hash -ne (Get-FileHash (Join-Path $image ('Microsoft.AspNetCore.DataProtection.' + $extension))).Hash)
        {
            throw "Actual $($kind.name) image does not contain its built $($kind.product) owner $extension."
        }
    }
}

$testExecution = Join-Path $run ('preparation-execution\' + $Role + '-Test\attempt-001')
$unitReports = @()
$testIndex = 0
foreach ($target in 'net12.0','net472')
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
    if ((Get-FileHash (Join-Path $destination 'Microsoft.AspNetCore.DataProtection.dll')).Hash -ne
        (Get-FileHash (Join-Path $context ('products\' + $actualOwnerTarget + '\Microsoft.AspNetCore.DataProtection.dll'))).Hash)
    {
        throw "The actually tested $target owner differs from the frozen $actualOwnerTarget product."
    }
    $trxPath = Join-Path $testExecution ('results-' + $target + '\focused-' + $target + '.trx')
    [xml] $trx = Get-Content -LiteralPath $trxPath -Raw
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $expectedCount = if ($target -eq 'net472') { 24 } else { 40 }
    $counters = $trx.TestRun.ResultSummary.Counters
    if ($rows.Count -ne $expectedCount -or @($rows | Where-Object outcome -ne Passed).Count -ne 0 -or
        [int]$counters.total -ne $expectedCount -or [int]$counters.executed -ne $expectedCount -or [int]$counters.passed -ne $expectedCount -or
        @($rows.executionId | Select-Object -Unique).Count -ne $expectedCount)
    {
        throw "Every actual $target owning row must pass;expected$expectedCount with matching complete exported TRX counters."
    }
    $preservation = @($rows | Where-Object testName -Like '*Decrypt_BlockAndStreamBoundaries_PreservesPayloadAndInputs(*')
    if ($preservation.Count -ne $acceptance.focused_preservation_cases.Count)
    {
        throw 'Missing or duplicate new boundary Theory rows.'
    }
    foreach ($case in $acceptance.focused_preservation_cases)
    {
        $suffix = 'Decrypt_BlockAndStreamBoundaries_PreservesPayloadAndInputs(plaintextLength: {0}, expectedPayloadLength: {1})' -f $case[0],$case[1]
        if (@($preservation | Where-Object { $_.testName.EndsWith($suffix, [StringComparison]::Ordinal) }).Count -ne 1)
        {
            throw "Actual Theory payload not exercised:$suffix"
        }
    }
    $unitReports += [pscustomobject]@{
        target = $target; actualProductTarget = $actualOwnerTarget; rawTrx = $trxPath
        rawSha256 = (Get-FileHash $trxPath).Hash; actualPassed = $rows.Count; failedOrSkipped = 0
        allNineNewTheoryPayloadsIndividuallyValidated = $true; summaryCounters = $counters.OuterXml
        rows = @($rows | Sort-Object testName | ForEach-Object {
            [pscustomobject]@{ testName = $_.testName; outcome = $_.outcome; duration = $_.duration; testId = $_.testId; executionId = $_.executionId }
        })
    }
}
$unitReports | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $context 'owning-test-rows.json') -Encoding utf8NoBOM
$files = @(Get-ChildItem -LiteralPath (Join-Path $context 'image'),(Join-Path $context 'framework-image'),
        (Join-Path $context 'products'),(Join-Path $context 'owning-tests'),$sources -Recurse -File |
    Sort-Object FullName | ForEach-Object {
        [pscustomobject]@{ path = [IO.Path]::GetRelativePath($context,$_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
    })
$imageComparisons = @()
if ($Role -eq 'candidate')
{
    $previous = Get-Content -LiteralPath (Join-Path $original 'context-manifest.json') -Raw | ConvertFrom-Json
    foreach ($kind in $imageKinds)
    {
        $prefix = $kind.directory + '\'
        $old = @($previous.files | Where-Object { $_.path.StartsWith($prefix, [StringComparison]::Ordinal) })
        $now = @($files | Where-Object { $_.path.StartsWith($prefix, [StringComparison]::Ordinal) })
        if ($old.Count -ne $now.Count)
        {
            throw "Comparison $($kind.name) images have different inventories."
        }
        $differences = @($now | Where-Object {
            $current = $_
            $match = @($old | Where-Object path -CEQ $current.path)
            $match.Count -ne 1 -or $match[0].sha256 -cne $current.sha256
        } | Select-Object -ExpandProperty path | Sort-Object)
        $expected = @($prefix + 'Microsoft.AspNetCore.DataProtection.dll'; $prefix + 'Microsoft.AspNetCore.DataProtection.pdb') | Sort-Object
        if (($differences -join '|') -cne ($expected -join '|'))
        {
            throw "Comparison $($kind.name) changes nonowner bytes:$($differences -join ',')"
        }
        $imageComparisons += [pscustomobject]@{ name = $kind.name; files = $now.Count; onlyOwnerDllPdbChanged = $true; changedPaths = $differences }
    }
}
[ordered]@{
    candidate = 'F016'; role = $Role; frozenAt = [DateTimeOffset]::UtcNow.ToString('o')
    imageKinds = $imageKinds; pairedImageComparisons = $imageComparisons
    selectedSourceWitnessesNotWholeCompilerCoverage = $true
    evaluatedDefineConstantsAreBeforeSdkImplicitSymbolTargetsNotFinalCscArguments = $true
    files = $files
} | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $context 'context-manifest.json') -Encoding utf8NoBOM
foreach ($kind in $imageKinds)
{
    $entry = Join-Path $context ($kind.directory + '\' + $kind.entry)
    $arguments = @('--sources', $sources, '--context', ($Role + '-' + $kind.name),
        '--mode', 'characterize', '--artifacts', (Join-Path $context ('characterization-' + $kind.name)))
    $executable = $entry
    if ($kind.name -eq 'standard')
    {
        $executable = (Get-Command dotnet).Source
        $arguments = @($entry) + $arguments
    }
    $log = Join-Path $context ('characterization-' + $kind.name + '.log')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & $executable @arguments *> $log
    $actualExitCode = $LASTEXITCODE
    [ordered]@{
        executable = $executable; arguments = $arguments; actualExitCode = $actualExitCode
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o')
        mode = 'Untimed actual public-factory characterization;no profile or comparison consumed.'
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $context ('characterization-' + $kind.name + '-command.json')) -Encoding utf8NoBOM
    Get-Content -LiteralPath $log -Tail 30
    if ($actualExitCode -ne 0)
    {
        throw "Actual $Role $($kind.name) characterization failed;preserve this actual context and output."
    }
    $statePath = Join-Path $context ('characterization-' + $kind.name + '\states')
    $completed = @(Get-ChildItem -LiteralPath $statePath -Filter '*-characterization-completed.json' -File)
    if ($completed.Count -ne 1)
    {
        throw 'Actual native characterization completion record missing or duplicated.'
    }
    $record = Get-Content -LiteralPath $completed[0].FullName -Raw | ConvertFrom-Json
    if (-not $record.allSuccessful -or $record.actualTimedWrapperPaths -ne $acceptance.proposed_benchmark_shapes.Count -or
        $record.nativeRoundtripRecords -ne 3 * $acceptance.proposed_benchmark_shapes.Count -or $record.argumentContractCases -ne 3)
    {
        throw 'Actual native characterization completion counts differ from the predeclared acceptance.'
    }
}
[ordered]@{
    candidate = 'F016'; role = $Role; allSuccessful = $true; actualFrozenFiles = $files.Count
    actualOwningPassed = 64; actualNativeHosts = 2; actualWrapperPreflightsPerHost = 21
    actualNativeRoundtripRecordsPerHost = 63; completed = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json | Set-Content (Join-Path $context 'freeze-completed.json') -Encoding utf8NoBOM
Write-Output ("Frozen {0}:{1} files,40+24 owning rows,and21 actual wrappers/63 native roundtrips per host." -f $Role,$files.Count)
