$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F105'
$selection = Get-Content (Join-Path $run 'selected-owning-controls.json') -Raw | ConvertFrom-Json
$directory = Join-Path $run 'tests\original'
if (Test-Path -LiteralPath $directory) { throw 'F105 original test record exists;inspect rather than overwrite.' }
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5')
{
    throw 'The independent campaign baseline is required.'
}
git diff --quiet HEAD --
if ($LASTEXITCODE) { throw 'Original controls require unchanged tracked source.' }
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$filter = ($selection.factNames | ForEach-Object {"FullyQualifiedName=$($selection.className).$_"}) -join '|'
$arguments = @('test','src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj',
    '--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter',$filter,
    '--logger','trx;LogFileName=owning-original.trx','--results-directory',$directory,'-v:minimal')
$sdk = dotnet --version
if ($LASTEXITCODE) { throw 'Activated SDK identity failed.' }
$started = [DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code = $LASTEXITCODE
[ordered]@{
    candidate='F105';variant='original';arguments=$arguments;exitCode=$code;sdk=$sdk
    expectedFactRows=10;expectedInlineDataRows=0;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 22
if ($code) { throw "Actual focused original F105 owning controls failed with exit$code." }
$trxPath = Join-Path $directory 'owning-original.trx'
[xml]$trx = Get-Content -LiteralPath $trxPath -Raw
$results = @($trx.TestRun.Results.UnitTestResult)
$definitions = @($trx.TestRun.TestDefinitions.UnitTest)
$entries = @($trx.TestRun.TestEntries.TestEntry)
$expectedNames = @($selection.factNames | ForEach-Object {"$($selection.className).$_"} | Sort-Object)
if ($results.Count -ne 10 -or $definitions.Count -ne 10 -or $entries.Count -ne 10 -or
    @($results | Where-Object outcome -CNE 'Passed').Count -or
    @($results.testId | Sort-Object -Unique).Count -ne 10 -or
    (Compare-Object @($results.testName | Sort-Object) $expectedNames))
{
    throw 'All ten exact source-defined Fact rows must pass with unique complete result definitions.'
}
$rows = @(foreach ($result in $results)
{
    $definition = @($definitions | Where-Object id -CEQ $result.testId)
    $entry = @($entries | Where-Object {$_.testId -ceq $result.testId -and $_.executionId -ceq $result.executionId})
    if ($definition.Count -ne 1 -or $entry.Count -ne 1 -or
        $definition[0].Execution.id -cne $result.executionId -or
        $definition[0].name -cne $result.testName -or [TimeSpan]::Parse($result.duration).Ticks -le 0)
    {
        throw 'Actual positive durations/exact result-definition-entry-execution IDs required.'
    }
    [pscustomobject]@{testName=$result.testName;testId=$result.testId;executionId=$result.executionId;outcome=$result.outcome;duration=$result.duration}
})
$testOutput = 'C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.Core.Test\Release\net12.0'
$owners = @(foreach ($name in 'Microsoft.AspNetCore.Mvc.Abstractions','Microsoft.AspNetCore.Mvc.Core','Microsoft.AspNetCore.Mvc.DataAnnotations')
{
    $file = Join-Path $testOutput "$name.dll"
    [pscustomobject]@{assembly=$name;file=$file;sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash}
})
[ordered]@{
    candidate='F105';variant='original';actualControlRows=10;passed=10;failed=0;skipped=0
    sourceDefinedSelectedFacts=10;selectedInlineDataRows=0;exactAllSelectedSourceFactsPassed=$true
    positiveDurationsAndExactDefinitionExecutionIds=$true;sourceSha256=$selection.sourceSha256
    actualOutput=$testOutput;actualOwners=$owners;trxSha256=(Get-FileHash -LiteralPath $trxPath -Algorithm SHA256).Hash
    existingControlsNotDedicatedEnumeratorOrRedGreenPerformanceTests=$true;rows=$rows
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Write-Output 'F105 actual original owning controls:10 passed,0 skipped;all exact Facts/IDs/positive durations/output owner hashes retained.'
