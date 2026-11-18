param(
    [ValidateRange(1, 3)]
    [int]$Attempt = 1
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F036'
$execution = Join-Path $run "validation\original-existing-$Attempt"
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F036 owning test attempt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F036-viewdata-enumeration' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        @(& git status --porcelain=v1 --untracked-files=no).Count)
    {
        throw 'Require the independent unchanged F036 original source branch.'
    }
    $investigation = Get-Content -Raw (Join-Path $run 'investigation.json') | ConvertFrom-Json
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'An investigated owning/API/producer source changed.'
        }
    }
    $drift = Get-Content -Raw (Join-Path $run 'constructor-dependency-review\verified-dependency-drift.json') | ConvertFrom-Json
    if ((Get-FileHash -LiteralPath (Join-Path $root $drift.file)).Hash -cne $drift.actualWorkingBytesSha256)
    {
        throw 'The separately reviewed TemplateInfo source changed.'
    }
    . .\activate.ps1
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -cne '12.0.100-alpha.1.26557.102')
    {
        throw 'Use the activated repository SDK.'
    }
    $prefix = 'Microsoft.AspNetCore.Mvc.ViewFeatures.'
    $selection = @(
        @{ method = $prefix + 'ViewDataDictionaryTest.ConstructorWithOneParameterInitializesMembers'; rows = 1 },
        @{ method = $prefix + 'ViewDataDictionaryTest.ConstructorInitializesMembers'; rows = 1 },
        @{ method = $prefix + 'ViewDataDictionaryTest.CopyConstructorInitializesModelAndModelMetadataBasedOnSource'; rows = 1 },
        @{ method = $prefix + 'ViewDataDictionaryTest.CopyConstructor_CopiesModelMetadata'; rows = 8 },
        @{ method = $prefix + 'ViewDataDictionaryTest.CopyConstructor_CopiesModelMetadata_ForTypeObject'; rows = 1 },
        @{ method = $prefix + 'ViewDataDictionaryOfTModelTest.Constructor_InitializesMembers'; rows = 1 },
        @{ method = $prefix + 'ViewDataDictionaryOfTModelTest.CopyConstructors_InitializeModelAndModelMetadataBasedOnSource'; rows = 1 },
        @{ method = $prefix + 'ViewDataDictionaryOfTModelTest.CopyConstructors_InitializeModelAndModelMetadataBasedOnSource_NullModel'; rows = 1 },
        @{ method = $prefix + 'ViewDataDictionaryOfTModelTest.CopyConstructor_DoesNotChangeMetadata_WhenValueCompatibleWithSourceMetadata'; rows = 2 },
        @{ method = $prefix + 'ViewDataDictionaryOfTModelTest.CopyConstructor_InitializesModelAndModelMetadataBasedOnSource_ModelOfSubclass'; rows = 1 },
        @{ method = $prefix + 'ViewDataDictionaryOfTModelTest.CopyConstructor_InitializesModelBasedOnSource_ModelMetadataBasedOnTModel'; rows = 1 }
    )
    $selection | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $execution 'selection.json') -Encoding utf8NoBOM
    $filter = ($selection | ForEach-Object { "FullyQualifiedName=$($_.method)" }) -join '|'
    $arguments = @('test', 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj',
        '--no-restore', '-c', 'Release', '-f', 'net12.0', '-m:2', '-nr:false',
        '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-p:BuildInParallel=false',
        '--filter', $filter, '--logger', 'trx;LogFileName=owning.trx', '--results-directory', $execution, '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'test.stdout') 2> (Join-Path $execution 'test.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable=(Get-Command dotnet).Source; arguments=$arguments; workingDirectory=$root
        sourceHead=(& git rev-parse HEAD).Trim(); actualSdk=$sdk; variant='original'
        started=$started; completed=[DateTimeOffset]::UtcNow.ToString('o'); actualExitCode=$code
        comparativeTiming=$false; actualFullCurrentMainIntegration=$false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    Get-Content (Join-Path $execution 'test.stdout') -Tail 12
    Get-Content (Join-Path $execution 'test.stderr') -Tail 6
    $report = Join-Path $execution 'owning.trx'
    if (!(Test-Path -LiteralPath $report))
    {
        throw 'Requested tests did not reach a fresh TRX;retain actual attempt.'
    }
    [xml]$trx = Get-Content -Raw $report
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $outcomes = [ordered]@{
        candidate='F036'; variant='original'; actualXmlSha256=(Get-FileHash -LiteralPath $report).Hash
        actualOutcomeCount=$rows.Count; actualPassed=@($rows | Where-Object outcome -eq Passed).Count
        actualNonPassed=@($rows | Where-Object outcome -ne Passed).Count
        actualOutcomes=@($rows | ForEach-Object {
            [ordered]@{name=$_.testName; testId=$_.testId; executionId=$_.executionId
                outcome=$_.outcome; message=$_.Output.ErrorInfo.Message}
        })
    }
    $outcomes | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'actual-outcomes.json') -Encoding utf8NoBOM
    $expected = ($selection | Measure-Object -Property rows -Sum).Sum
    if ($code -ne 0 -or $expected -ne 19 -or $rows.Count -ne $expected -or $outcomes.actualNonPassed -or
        @($rows.executionId | Sort-Object -Unique).Count -ne $rows.Count -or
        [int]$trx.TestRun.ResultSummary.Counters.executed -ne $rows.Count)
    {
        throw 'All19selected rows must independently execute and pass without skipped prerequisites.'
    }
    foreach ($required in $selection)
    {
        $cases = @($rows | Where-Object { $_.testName -ceq $required.method -or
            $_.testName.StartsWith($required.method + '(', [StringComparison]::Ordinal) })
        if ($cases.Count -ne $required.rows)
        {
            throw "A required owning scenario did not independently execute:$($required.method)"
        }
        if ($required.rows -eq 2)
        {
            $values = @($cases | ForEach-Object {
                if ($_.testName -notmatch 'model:\s*(null|23)\)')
                {
                    throw 'Require the retained nullable integer theory identity.'
                }
                $Matches[1]
            } | Sort-Object -Unique)
            if (($values -join ',') -cne '23,null')
            {
                throw 'Both null and23must reach their assertions.'
            }
        }
    }
    $owners = @(foreach ($assembly in 'Microsoft.AspNetCore.Mvc.ViewFeatures','Microsoft.AspNetCore.Mvc.Abstractions','Microsoft.AspNetCore.Mvc.Core')
    {
        $product = Join-Path $root "artifacts\bin\$assembly\Release\net12.0\$assembly.dll"
        $test = Join-Path $root "artifacts\bin\Microsoft.AspNetCore.Mvc.ViewFeatures.Test\Release\net12.0\$assembly.dll"
        $pdb = [IO.Path]::ChangeExtension($product,'.pdb')
        $sha = (Get-FileHash -LiteralPath $product).Hash
        $pdbSha = (Get-FileHash -LiteralPath $pdb).Hash
        if ((Get-FileHash -LiteralPath $test).Hash -cne $sha -or
            (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($test,'.pdb'))).Hash -cne $pdbSha)
        {
            throw 'Test-bin owner differs from the observed product PE/PDB.'
        }
        [ordered]@{assembly=$assembly; actualProductPath=$product; actualOwnerSha256=$sha; actualOwnerPdbSha256=$pdbSha}
    })
    [ordered]@{
        candidate='F036'; variant='original'; actualPassed=$rows.Count; actualSkipped=0; actualFailures=0
        actualSelection=$selection; actualTestBinOwners=$owners; actualAllFreshXmlOutcomesParsed=$true
        actualMetadataTheoryRows=8; actualBothNullableIntegerRowsObserved=$true
        comparativeTiming=$false; aFunctionalRedGreenVerification=$false; actualFullCurrentMainIntegration=$false
        boundary='19existing base/typed/copy model-metadata constructor rows on independent37e809e. No shipping change or candidate regression. TemplateInfo current-default drift separately retained;actual cursor/lazy/derived contracts require the standalone owner characterization.'
    } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
    Write-Output 'F036:19fresh owning rows passed;0skipped;all8metadata and both nullable integer rows accounted.'
}
finally
{
    Pop-Location
}
