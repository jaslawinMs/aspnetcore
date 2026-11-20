param(
    [ValidateSet('Original', 'CurrentDefault')][string]$Role = 'Original',
    [ValidateSet('Baseline', 'F147', 'F149')][string]$Variant = 'Baseline',
    [int]$Attempt = 1
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-Native010.ps1')
$common = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'common-identity.json') -Raw | ConvertFrom-Json
$image = Get-Content -LiteralPath (Join-Path $PSScriptRoot "evidence\$Role-$Variant-image.json") -Raw | ConvertFrom-Json
$output = $common.actualOutputDirectory
$label = "$Role-$Variant-functional-$Attempt"
$results = Join-Path $PSScriptRoot "results\$label"
if (Test-Path -LiteralPath $results)
{
    throw 'Refusing to overwrite functional results.'
}
New-Item -ItemType Directory -Path $results | Out-Null
$env:PROBE010_SAMPLE_PATH = Join-Path $image.actualImagePath 'WebTransportInteractiveSampleApp.dll'
$env:PROBE010_SAMPLE_SHA256 = $image.actualOwnerSha256
$env:PROBE010_CORE_SHA256 = (Get-FileHash -LiteralPath (Join-Path $output 'Microsoft.AspNetCore.Server.Kestrel.Core.dll') -Algorithm SHA256).Hash
$env:AUTOPERF_SAMPLE_MODE = 'inspect'
$env:AUTOPERF_SAMPLE_FINDING = if ($Variant -ceq 'F149') { 'F149' } else { 'F147' }
$env:AUTOPERF_SAMPLE_PAIR = '0'

function Read-CommonImage
{
    @(Get-ChildItem -LiteralPath $output -File -Recurse | Sort-Object FullName | ForEach-Object {
        [ordered]@{
            file = [IO.Path]::GetRelativePath($output, $_.FullName).Replace('\', '/')
            bytes = $_.Length
            sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        }
    })
}

$before = Read-CommonImage
$expected = @{}
foreach ($file in $common.actualFiles)
{
    $expected[$file.file] = $file
}
if ($before.Count -ne $expected.Count)
{
    throw 'The common image file set differs before functional validation.'
}
foreach ($file in $before)
{
    if (-not $expected.ContainsKey($file.file) -or $expected[$file.file].sha256 -cne $file.sha256 -or
        $expected[$file.file].bytes -ne $file.bytes)
    {
        throw "The common image changed: $($file.file)"
    }
}
$arguments = @(
    'test', 'src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj',
    '--no-build', '--no-restore', '-c', 'Release',
    '--filter', 'FullyQualifiedName~CompiledSampleProducerTests|FullyQualifiedName~WebTransportSession_CanOpenNewStream|FullyQualifiedName~WebTransportSession_Closed_RemovedFromConnection',
    '-p:UseIisNativeAssets=false', '-p:UseSharedCompilation=false', '/m:2', '/nr:false',
    '-p:RuntimeFrameworkVersion=12.0.0-alpha.1.26557.102',
    "-p:CustomAfterMicrosoftCommonTargets=$(Join-Path $PSScriptRoot 'prepared\Probe010.targets')",
    '--logger', "trx;LogFileName=$label.trx", '--results-directory', $results, '-v:normal'
)
try
{
    Invoke-Native010 -Root $common.graph -Label $label -Executable (Join-Path $common.graph '.dotnet\dotnet.exe') `
        -Arguments $arguments -Dotnet
}
finally
{
    $after = Read-CommonImage
    [ordered]@{ before = $before; after = $after } | ConvertTo-Json -Depth 10 |
        Set-Content -LiteralPath (Join-Path $results 'common-image-maps.json')
}
if ($after.Count -ne $expected.Count)
{
    throw 'The common image file set differs after functional validation.'
}
foreach ($file in $after)
{
    if (-not $expected.ContainsKey($file.file) -or $expected[$file.file].sha256 -cne $file.sha256 -or
        $expected[$file.file].bytes -ne $file.bytes)
    {
        throw "The common image changed after execution: $($file.file)"
    }
}
$trxPath = Join-Path $results "$label.trx"
[xml]$xml = Get-Content -LiteralPath $trxPath -Raw
$ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
$ns.AddNamespace('t', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$rows = @($xml.SelectNodes('//t:UnitTestResult', $ns))
if ($rows.Count -ne 20)
{
    throw "Expected all 20 actual functional rows, got $($rows.Count)."
}
$definitions = @{}
foreach ($definition in $xml.SelectNodes('//t:TestDefinitions/t:UnitTest', $ns))
{
    if ($definitions.ContainsKey($definition.id))
    {
        throw 'Duplicate native definition ID.'
    }
    $definitions[$definition.id] = $definition
}
$reported = foreach ($row in $rows)
{
    if ($row.outcome -cne 'Passed' -or $null -eq $definitions[$row.testId] -or
        $definitions[$row.testId].Execution.id -cne $row.executionId)
    {
        throw "Actual native case did not pass with matching definition/execution: $($row.testName)"
    }
    [ordered]@{ testName = [string]$row.testName; testId = [string]$row.testId
        executionId = [string]$row.executionId; actualOutcome = [string]$row.outcome }
}
$utf8 = @($rows | Where-Object { $_.testName.Contains('ActualSample_Utf8DecodeAndPerReadFallback') })
if ($utf8.Count -ne 6)
{
    throw 'All six UTF8 theory values must actually execute.'
}
$workload = @($rows | Where-Object { $_.testName.EndsWith('.ActualSample_SteadyStateWorkload') })
if ($workload.Count -ne 1)
{
    throw 'The exact real workload inspection did not execute once.'
}
$matches = [regex]::Matches([string]$workload[0].Output.StdOut, 'AUTOPERF_SAMPLE_WORKLOAD_JSON ([^\r\n]+)')
if ($matches.Count -ne 1)
{
    throw 'The real workload did not publish exactly one structured observation.'
}
$observed = $matches[0].Groups[1].Value | ConvertFrom-Json -Depth 20
if ($observed.mode -cne 'inspect' -or $observed.observations.Count -ne 2 -or
    $observed.sampleSha256 -cne $image.actualOwnerSha256)
{
    throw 'Inspection identity/mode does not match the selected sample.'
}
foreach ($observation in $observed.observations)
{
    if ($observation.ActualMeasurement -ne $false -or $observation.AllocatedBytes -ne 0 -or
        $observation.ElapsedMilliseconds -ne 0 -or $observation.Operations -ne 1 -or $observation.PayloadBytes -ne 65536)
    {
        throw 'Untimed inspection used a counter/timer or a different workload.'
    }
}
$counters = $xml.SelectSingleNode('//t:ResultSummary/t:Counters', $ns)
if ([int]$counters.total -ne 20 -or [int]$counters.passed -ne 20 -or [int]$counters.failed -ne 0)
{
    throw 'Actual native counters do not match all 20 passing rows.'
}
$acceptance = [ordered]@{
    recordedAt = [DateTimeOffset]::UtcNow.ToString('o')
    role = $Role
    variant = $Variant
    actualCommonFixtureCompiledOnce = $true
    actualCommonImageFilesAllUnchanged = $true
    actualCommonImageFileCount = $after.Count
    actualNativeTrx = $trxPath
    actualNativeTrxSha256 = (Get-FileHash -LiteralPath $trxPath -Algorithm SHA256).Hash
    actualXmlParser = 'System.Xml.XmlDocument; every result/definition/execution ID and counter'
    actualRows = @($reported)
    actualAllSixUtf8TheoryRowsPassed = $true
    actualWorkloadInspection = $observed
    actualNoStopwatchOrAllocationCounterExecuted = $true
    actualSourceRuntimeBoundary = 'Own source-role sample owner; common Original Kestrel/runtime57, not whole default framework.'
}
$acceptance | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $results 'functional-acceptance.json')
[ordered]@{ role = $Role; variant = $Variant; actualNativeRowsPassed = 20; actualUtf8RowsPassed = 6
    actualCommonFilesUnchanged = $after.Count; actualWorkloadInspectPassed = $true
    actualNoTimingOrAllocationCounterExecuted = $true; results = $results } | ConvertTo-Json -Depth 8
