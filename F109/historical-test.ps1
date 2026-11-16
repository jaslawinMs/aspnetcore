param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='original',
    [ValidateSet('original','red','green')][string]$Expectation='original',
    [switch]$NoBuild,
    [switch]$WhitespaceControls
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$directory=Join-Path $run "tests\$Label"
if (Test-Path $directory) { throw 'Retain previous test attempts;choose a new explicit label.' }
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5') { throw 'Independent F109 baseline HEAD required.' }
$selection=Get-Content (Join-Path $run 'selected-owning-controls.json') -Raw|ConvertFrom-Json
$filter=($selection.factNames|ForEach-Object {"FullyQualifiedName=$($selection.className).$_"}) -join '|'
$newClass='Microsoft.AspNetCore.Identity.Test.DataProtectorTokenProviderTest'
if ($Expectation -cne 'original') { $filter+="|FullyQualifiedName~$newClass" }
if ($Expectation -in 'original','red')
{
    git diff --quiet HEAD --
    if ($LASTEXITCODE) { throw 'Original/red require unchanged tracked shipping source.' }
}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
$arguments=@('test','src\Identity\test\Identity.Test\Microsoft.AspNetCore.Identity.Test.csproj','--no-restore',
    '-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter',$filter,
    '--logger',"trx;LogFileName=owning-$Label.trx",'--results-directory',$directory,'-v:minimal')
if ($NoBuild) { $arguments+='--no-build' }
$sdk=dotnet --version
if ($LASTEXITCODE) { throw 'Activated SDK identity failed.' }
$started=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F109';label=$Label;expectation=$Expectation;arguments=$arguments;exitCode=$code;sdk=$sdk
    expectedRows=$(if ($Expectation -ceq 'original') {2} elseif ($WhitespaceControls) {10} else {7})
    expectedFailedRows=$(if ($Expectation -ceq 'red') {4} else {0})
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
$expectedCode=if ($Expectation -ceq 'red') {1} else {0}
if ($code -ne $expectedCode) { throw "Actual focused F109 command exit$code differs from expected$expectedCode;retain exact failure." }
$trxFile=Join-Path $directory "owning-$Label.trx"
[xml]$trx=Get-Content $trxFile -Raw
$results=@($trx.TestRun.Results.UnitTestResult)
$definitions=@($trx.TestRun.TestDefinitions.UnitTest)
$entries=@($trx.TestRun.TestEntries.TestEntry)
$expectedCount=if ($Expectation -ceq 'original') {2} elseif ($WhitespaceControls) {10} else {7}
if ($results.Count -ne $expectedCount -or $definitions.Count -ne $expectedCount -or $entries.Count -ne $expectedCount -or
    @($results.testId|Sort-Object -Unique).Count -ne $expectedCount)
{
    throw 'Nonzero exact complete F109 test discovery/result/definition/entry set required.'
}
$caseLabels=@('InvalidCharacter','InvalidLength','InvalidPadding','NonAscii')
$observedLabels=[System.Collections.Generic.List[string]]::new()
$whitespaceLabels=@('Leading','Embedded','Trailing')
$observedWhitespaceLabels=[System.Collections.Generic.List[string]]::new()
$rows=@(foreach ($result in $results)
{
    $definition=@($definitions|Where-Object id -CEQ $result.testId)
    $entry=@($entries|Where-Object {$_.testId -ceq $result.testId -and $_.executionId -ceq $result.executionId})
    if ($definition.Count -ne 1 -or $entry.Count -ne 1 -or $definition[0].Execution.id -cne $result.executionId -or
        $definition[0].name -cne $result.testName -or [TimeSpan]::Parse($result.duration).Ticks -le 0)
    {
        throw 'Exact positive-duration F109 result-definition-execution identities required.'
    }
    $expected='Passed'
    $caseLabel=$null
    if ($result.testName.StartsWith("$newClass.ValidateAsyncAvoidsFormatExceptionsForMalformedTokens("))
    {
        if ($result.testName -cnotmatch '\(caseName:\s*"(?<label>[A-Za-z]+)"\)$') { throw 'Safe exact theory label required.' }
        $caseLabel=$Matches.label
        if ($caseLabel -cnotin $caseLabels) { throw 'Unexpected malformed-input theory label.' }
        $observedLabels.Add($caseLabel)
        if ($Expectation -ceq 'red')
        {
            $expected='Failed'
            $message=[string]$result.Output.ErrorInfo.Message
            if ($message -notmatch 'Expected:\s+0' -or $message -notmatch 'Actual:\s+1')
            {
                throw 'Each original theory row must fail specifically because one actual FormatException was observed instead of zero.'
            }
        }
    }
    elseif ($WhitespaceControls -and $result.testName.StartsWith("$newClass.ValidateAsyncRejectsMalformedTokensWithWhitespace("))
    {
        if ($result.testName -cnotmatch '\(caseName:\s*"(?<label>[A-Za-z]+)"\)$' -or $Matches.label -cnotin $whitespaceLabels)
        {
            throw 'An exact safe whitespace-fallback case label is required.'
        }
        $caseLabel=$Matches.label
        $observedWhitespaceLabels.Add($caseLabel)
    }
    elseif ($result.testName -cnotin @($selection.factNames|ForEach-Object {"$($selection.className).$_"}) -and
        $result.testName -cne "$newClass.ValidateAsyncPropagatesLoggingFailureOnceForMalformedToken")
    {
        throw "Unexpected source-defined F109 test:$($result.testName)"
    }
    if ($result.outcome -cne $expected) { throw "Unexpected F109 outcome:$($result.testName)/$($result.outcome)" }
    [pscustomobject]@{testName=$result.testName;caseLabel=$caseLabel;testId=$result.testId;executionId=$result.executionId;
        outcome=$result.outcome;duration=$result.duration;expectedRedFormatExceptionCountFailure=($expected -ceq 'Failed')}
})
if ($Expectation -cne 'original' -and
    (Compare-Object @($observedLabels|Sort-Object) @($caseLabels|Sort-Object)))
{
    throw 'Every distinct parameterized malformed-input row must execute exactly once.'
}
if ($WhitespaceControls -and (Compare-Object @($observedWhitespaceLabels|Sort-Object) @($whitespaceLabels|Sort-Object)))
{
    throw 'Each of the three exact whitespace-fallback rows must execute once.'
}
$testOutput='C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Identity.Test\Release\net12.0'
$owners=@(foreach ($name in 'Microsoft.AspNetCore.Identity','Microsoft.Extensions.Identity.Core','Microsoft.AspNetCore.DataProtection.Abstractions')
{
    $file=Join-Path $testOutput "$name.dll"
    [pscustomobject]@{assembly=$name;file=$file;sha256=(Get-FileHash $file).Hash}
})
[ordered]@{
    candidate='F109';label=$Label;expectation=$Expectation;actualControlRows=$results.Count
    passed=@($results|Where-Object outcome -CEQ 'Passed').Count;failed=@($results|Where-Object outcome -CEQ 'Failed').Count
    skipped=0;everyMalformedTheoryRowChecked=($Expectation -cne 'original');positiveDurationsAndExactIds=$true
    actualOutput=$testOutput;actualOwners=$owners;trxSha256=(Get-FileHash $trxFile).Hash;rows=$rows
    note='Original existing Facts are dispatch/metrics controls;red rows observe actual Convert.FormatException on the real provider path,not an injected callback. Expected-red evidence is not reported as a passing test run.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Write-Output "F109 actual$Label rows=$($results.Count),passed=$(@($results|Where-Object outcome -CEQ 'Passed').Count),failed=$(@($results|Where-Object outcome -CEQ 'Failed').Count);all expected exact outcomes/IDs/positive durations verified."
