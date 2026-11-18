param(
    [ValidateSet('original', 'candidate')]
    [string]$Variant = 'original',
    [ValidateRange(1, 3)]
    [int]$Attempt = 1
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F036'
$execution = Join-Path $run "validation\$Variant-existing-$Attempt"
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F036 owning test attempt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Push-Location $root
try
{
    $changed = @(& git diff --name-only)
    if ((& git branch --show-current).Trim() -cne 'autoperf/F036-viewdata-enumeration' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        @(& git diff --cached --name-only).Count -or
        ($Variant -ceq 'original' -and $changed.Count) -or
        ($Variant -ceq 'candidate' -and ($changed.Count -ne 1 -or
            $changed[0] -cne 'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs')))
    {
        throw 'Require the independent original branch or its sole uncommitted ViewData implementation candidate.'
    }
    $investigation = Get-Content -Raw (Join-Path $run 'investigation.json') | ConvertFrom-Json
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        if ($Variant -ceq 'candidate' -and $entry.file -ceq 'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs')
        {
            continue
        }
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
    $sourceFile = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\src\ViewDataDictionary.cs'
    $sourceHash = (Get-FileHash -LiteralPath $sourceFile).Hash
    Copy-Item -LiteralPath $sourceFile -Destination (Join-Path $execution 'ViewDataDictionary.cs.executed-source')
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
        sourceHead=(& git rev-parse HEAD).Trim(); actualSdk=$sdk; variant=$Variant
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
        candidate='F036'; variant=$Variant; actualXmlSha256=(Get-FileHash -LiteralPath $report).Hash
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
        if ($Variant -ceq 'candidate')
        {
            $original = Get-Content -Raw (Join-Path $run 'validation\original-existing-1\actual-outcomes.json') | ConvertFrom-Json
            if (@(Compare-Object @($original.actualOutcomes.name | Sort-Object) @($rows.testName | Sort-Object)).Count)
            {
                throw 'Candidate discovery differs from the original actual case-name multiset.'
            }
        }
        if ((Get-FileHash -LiteralPath $sourceFile).Hash -cne $sourceHash)
        {
            throw 'The tested owner source changed during execution.'
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
        candidate='F036'; variant=$Variant; actualPassed=$rows.Count; actualSkipped=0; actualFailures=0
        actualSelection=$selection; actualTestBinOwners=$owners; actualAllFreshXmlOutcomesParsed=$true
        actualSourceSha256=$sourceHash
        actualMetadataTheoryRows=8; actualBothNullableIntegerRowsObserved=$true
        comparativeTiming=$false; aFunctionalRedGreenVerification=$false; actualFullCurrentMainIntegration=$false
        boundary='19existing base/typed/copy model-metadata constructor rows on independent37e809e. Preservation coverage,not a semantic bug-fix red/green claim. TemplateInfo current-default drift separately retained;actual cursor/lazy/derived contracts require standalone owner characterization.'
    } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
    Write-Output 'F036:19fresh owning rows passed;0skipped;all8metadata and both nullable integer rows accounted.'
}
finally
{
    Pop-Location
}
