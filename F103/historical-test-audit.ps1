param(
    [Parameter(Mandatory)][ValidateSet('original','candidate-1','candidate-2','candidate-3')][string]$Variant,
    [switch]$VerifyOnly
)
$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
$trxPath = Join-Path $run "tests\$Variant\owning-$Variant.trx"
$out = Join-Path $run "tests\$Variant\actual-test-audit-$Variant.json"
$sourceDirectory = Join-Path $repo 'src\Components\Analyzers\test'
$expected = @(
    foreach ($file in 'StateHasChangedAnalyzerTest.cs','StateHasChangedCodeFixProviderTest.cs')
    {
        $content = [IO.File]::ReadAllText((Join-Path $sourceDirectory $file))
        $class = [IO.Path]::GetFileNameWithoutExtension($file)
        foreach ($match in [regex]::Matches($content,'\[Fact\]\s+public void (?<name>\w+)\('))
        {
            [ordered]@{class="Microsoft.AspNetCore.Components.Analyzers.Test.$class";method=$match.Groups['name'].Value;
                source=$file;sourceSha256=(Get-FileHash (Join-Path $sourceDirectory $file)).Hash}
        }
    }
)
if ($expected.Count -ne 30) { throw 'Actual source must define the30 exact scoped Fact controls.' }
[xml]$trx = [IO.File]::ReadAllText($trxPath)
$ns = [Xml.XmlNamespaceManager]::new($trx.NameTable)
$ns.AddNamespace('t','http://microsoft.com/schemas/VisualStudio/TeamTest/2010')
$results = @($trx.SelectNodes('//t:UnitTestResult',$ns))
$definitions = @($trx.SelectNodes('//t:TestDefinitions/t:UnitTest',$ns))
$executions = @($trx.SelectNodes('//t:TestEntries/t:TestEntry',$ns))
if ($results.Count -ne 30 -or $definitions.Count -ne 30 -or $executions.Count -ne 30) { throw 'Actual30 result/definition/execution IDs required.' }
$rows = @(
    foreach ($result in $results)
    {
        if ($result.outcome -cne 'Passed' -or [TimeSpan]::Parse($result.duration).Ticks -le 0) { throw 'Actual control did not pass/run a positive duration.' }
        $definition = @($definitions | Where-Object id -eq $result.testId)
        $execution = @($executions | Where-Object { $_.testId -eq $result.testId -and $_.executionId -eq $result.executionId })
        if ($definition.Count -ne 1 -or $execution.Count -ne 1 -or $definition[0].Execution.id -cne $result.executionId)
        {
            throw 'Actual result/definition/execution identities differ.'
        }
        $method = $definition[0].TestMethod
        $className = ([string]$method.className).Split(',')[0]
        $source = @($expected | Where-Object { $_.class -ceq $className -and $_.method -ceq $method.name })
        if ($source.Count -ne 1) { throw "Unexpected/missing source-defined control:$className.$($method.name)" }
        [ordered]@{class=$className;method=[string]$method.name;source=$source[0].source;sourceSha256=$source[0].sourceSha256;
            testId=[string]$result.testId;executionId=[string]$result.executionId;duration=[string]$result.duration;outcome=[string]$result.outcome}
    }
)
$actualNames = @($rows | ForEach-Object { "$($_.class).$($_.method)" } | Sort-Object -Unique)
if ($actualNames.Count -ne 30) { throw 'Each exact source-defined control must occur once.' }
$binary = Join-Path $repo 'artifacts\bin\Microsoft.AspNetCore.Components.Analyzers.Tests\Release\net12.0'
$frozenOwner = Join-Path $run "binaries\$Variant\Microsoft.AspNetCore.Components.Analyzers.dll"
if (-not $VerifyOnly -and (Get-FileHash (Join-Path $binary 'Microsoft.AspNetCore.Components.Analyzers.dll')).Hash -cne (Get-FileHash $frozenOwner).Hash)
{
    throw 'Actual test output owner must match measured frozen owner.'
}
$report = [ordered]@{candidate='F103';variant=$Variant;trxSha256=(Get-FileHash $trxPath).Hash;
    actualTests=30;passed=30;failed=0;skipped=0;actualSourceDefinedFactsVerified=$true;
    sourceFiles=@($expected | Group-Object source | ForEach-Object { [ordered]@{source=$_.Name;sha256=$_.Group[0].sourceSha256} });
    rows=$rows}
if ($VerifyOnly)
{
    $old = Get-Content $out -Raw | ConvertFrom-Json
    if (($report | ConvertTo-Json -Depth 9 -Compress) -cne ($old | ConvertTo-Json -Depth 9 -Compress))
    {
        throw 'Recorded actual-test audit changed.'
    }
}
else
{
    $report | ConvertTo-Json -Depth 9 | Set-Content $out
}
Write-Output "F103 ${Variant}:actual30 source-defined controls/pass/positive durations/exact result-definition-execution IDs audited."
