param(
    [ValidateSet('original','candidate-1','candidate-2','candidate-3')]
    [string]$Variant='original'
)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$root = Join-Path $PSScriptRoot "autoperf-runs\F104\tests\$Variant"
if (Test-Path (Join-Path $root 'execution.json')) { throw 'Control execution already recorded; inspect before rerunning.' }
New-Item -ItemType Directory -Path $root -Force | Out-Null
$arguments = @('test','src\Framework\AspNetCoreAnalyzers\test\Microsoft.AspNetCore.App.Analyzers.Test.csproj',
    '--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false',
    '--filter','FullyQualifiedName~Microsoft.AspNetCore.Analyzers.RouteHandlers.DetectAmbiguousMappedRoutesTest',
    '--logger',"trx;LogFileName=owning-$Variant.trx",'--results-directory',$root,'-v:minimal')
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $root 'console.log')
$code = $LASTEXITCODE
[ordered]@{
    candidate='F104';variant=$Variant;arguments=$arguments;exitCode=$code
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    sourceRevision=(git rev-parse HEAD);sourceBranch=(git branch --show-current)
    testSourceSha256=(Get-FileHash 'src\Framework\AspNetCoreAnalyzers\test\RouteHandlers\DetectAmbiguousMappedRoutesTest.cs').Hash
    ownerSourceSha256=(Get-FileHash 'src\Framework\AspNetCoreAnalyzers\src\Analyzers\RouteHandlers\RouteHandlerAnalyzer.cs').Hash
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $root 'execution.json') -Encoding utf8
if ($code)
{
    Get-Content (Join-Path $root 'console.log') -Tail 70
    throw "F104 $Variant focused control command failed with actual exit $code; do not infer passing tests."
}
$trx = [xml](Get-Content (Join-Path $root "owning-$Variant.trx") -Raw)
$rows = @($trx.TestRun.Results.UnitTestResult)
$definitions = @($trx.TestRun.TestDefinitions.UnitTest)
$entries = @($trx.TestRun.TestEntries.TestEntry)
$source = Get-Content 'src\Framework\AspNetCoreAnalyzers\test\RouteHandlers\DetectAmbiguousMappedRoutesTest.cs' -Raw
$facts = [regex]::Matches($source,'(?s)\[Fact\]\s+public async Task (\w+)\(') |
    ForEach-Object {$_.Groups[1].Value}
$expectedRows = @($facts).Count + [regex]::Matches($source,'\[InlineData\(').Count
if ($rows.Count -ne $expectedRows -or $definitions.Count -ne $expectedRows -or $entries.Count -ne $expectedRows -or
    @($rows | Where-Object {$_.outcome -cne 'Passed' -or [TimeSpan]::Parse($_.duration).Ticks -le 0}).Count -or
    @($rows | Select-Object -ExpandProperty testId -Unique).Count -ne $expectedRows)
{
    throw 'Exact source-defined control rows, identities, durations or outcomes differ.'
}
foreach ($row in $rows)
{
    $definition = @($definitions | Where-Object id -eq $row.testId)
    $entry = @($entries | Where-Object testId -eq $row.testId)
    if ($definition.Count -ne 1 -or $entry.Count -ne 1 -or
        $definition[0].Execution.id -cne $row.executionId -or $entry[0].executionId -cne $row.executionId)
    {
        throw 'Actual TRX result/definition/execution mapping differs.'
    }
}
foreach ($fact in $facts)
{
    if (@($definitions | Where-Object {$_.TestMethod.name -eq $fact}).Count -ne 1)
    {
        throw "Actual Fact method row missing: $fact"
    }
}
$output = 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.App.Analyzers.Test\Release\net12.0'
$owner = Join-Path $output 'Microsoft.AspNetCore.App.Analyzers.dll'
$compiler = Join-Path $output 'Microsoft.CodeAnalysis.CSharp.dll'
if (-not (Test-Path $owner) -or -not (Test-Path $compiler)) { throw 'Actual test owner/compiler outputs missing.' }
[ordered]@{
    candidate='F104';variant=$Variant;sourceDefinedFacts=@($facts).Count
    sourceDefinedInlineDataRows=[regex]::Matches($source,'\[InlineData\(').Count
    actualControlRows=$rows.Count;passed=$rows.Count;failed=0;skipped=0
    positiveDurationsAndExactDefinitionExecutionIds=$true
    actualOwnerSha256=(Get-FileHash $owner).Hash;actualCompilerSha256=(Get-FileHash $compiler).Hash
    ownerAssemblyIdentity=[Reflection.AssemblyName]::GetAssemblyName($owner).FullName
    testOutput=$output;trxSha256=(Get-FileHash (Join-Path $root "owning-$Variant.trx")).Hash
    rows=@($rows | ForEach-Object {[ordered]@{
        testName=$_.testName;testId=$_.testId;executionId=$_.executionId;outcome=$_.outcome;duration=$_.duration
    }})
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $root 'test-audit.json') -Encoding utf8
Get-Content (Join-Path $root 'console.log') -Tail 15
Write-Output "F104 ${Variant}: all $($rows.Count) exact Fact/InlineData control rows passed; no skipped or nonpositive-duration rows."
