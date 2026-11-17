param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [string]$ExpectedFailureName = '',
    [string]$ExpectedFailureFragment = ''
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F022'
$execution = Join-Path $run "validation\$Label"
$source = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\src\ExpressionHelper.cs'
$testSource = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\test\ExpressionHelperTest.cs'
$project = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual owning-test attempt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Copy-Item -LiteralPath $source -Destination (Join-Path $execution 'executed-ExpressionHelper.cs')
Copy-Item -LiteralPath $testSource -Destination (Join-Path $execution 'executed-ExpressionHelperTest.cs')
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -ne 'autoperf/F022-indexer-metadata-cache')
    {
        throw 'Require the independent F022 source branch.'
    }
    & git --no-pager diff -- src/Mvc/Mvc.ViewFeatures/src/ExpressionHelper.cs src/Mvc/Mvc.ViewFeatures/test/ExpressionHelperTest.cs `
        1> (Join-Path $execution 'executed-source.patch') 2> (Join-Path $execution 'source-diff.stderr')
    if ($LASTEXITCODE -ne 0)
    {
        throw 'The actual executed source diff could not be captured.'
    }
    . .\activate.ps1
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -ne '12.0.100-alpha.1.26557.102')
    {
        throw 'The actual activated SDK differs.'
    }
    $arguments = @('test', $project, '--no-restore', '-c', 'Release', '-f', 'net12.0',
        '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.ViewFeatures.ExpressionHelperTest',
        '--logger', 'trx;LogFileName=owning.trx', '--results-directory', $execution, '-v', 'minimal')
    $sourceHash = (Get-FileHash -LiteralPath $source).Hash
    $testHash = (Get-FileHash -LiteralPath $testSource).Hash
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'test.stdout') 2> (Join-Path $execution 'test.stderr')
    $actualExit = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source
        arguments = $arguments
        workingDirectory = $root
        sourceHead = (& git rev-parse HEAD).Trim()
        actualSourceSha256 = $sourceHash
        actualTestSha256 = $testHash
        actualSdk = $sdk
        started = $started
        completed = [DateTimeOffset]::UtcNow.ToString('o')
        actualExitCode = $actualExit
        expectedFailureName = $ExpectedFailureName
        timingProfile = $false
        nativeIisValidated = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'test.stdout') -Tail 20
    Get-Content -LiteralPath (Join-Path $execution 'test.stderr') -Tail 12
    $report = Join-Path $execution 'owning.trx'
    if (!(Test-Path -LiteralPath $report))
    {
        throw 'The requested tests did not reach a fresh TRX. Preserve the actual attempt.'
    }
    [xml]$trx = Get-Content -Raw -LiteralPath $report
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $original = Get-Content -Raw -LiteralPath (Join-Path $run 'baseline-original-outcomes.json') | ConvertFrom-Json
    $expectedNewNames = @(
        'IsSingleArgumentIndexer_RepeatedClassificationMatchesMetadataUpdateSupport',
        'GetExpressionText_RetainedExpressionUsesCurrentIndex',
        'IsSingleArgumentIndexer_DoesNotCacheMutableReflectionMetadata',
        'IsSingleArgumentIndexer_DoesNotRetainCollectibleMetadata'
    )
    $failures = @($rows | Where-Object outcome -ne Passed)
    $outcomes = @($rows | ForEach-Object {
        [ordered]@{ name = $_.testName; outcome = $_.outcome; message = $_.Output.ErrorInfo.Message }
    })
    [ordered]@{
        candidate = 'F022'
        actualXmlSha256 = (Get-FileHash -LiteralPath $report).Hash
        actualOutcomeCount = $rows.Count
        actualPassed = @($rows | Where-Object outcome -eq Passed).Count
        actualNonPassed = $failures.Count
        actualOutcomes = $outcomes
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'actual-outcomes.json') -Encoding utf8NoBOM
    if ($rows.Count -ne $original.original_outcomes + $expectedNewNames.Count)
    {
        throw 'Actual owning discovery differs from the original79 plus the four focused cases.'
    }
    foreach ($old in $original.outcomes)
    {
        $matches = @($rows | Where-Object { $_.testName -ceq $old.name })
        if ($matches.Count -ne 1 -or $matches[0].outcome -ne 'Passed')
        {
            throw "An original parameterized outcome changed:$($old.name)"
        }
    }
    foreach ($name in $expectedNewNames)
    {
        if (@($rows | Where-Object { $_.testName.EndsWith('.' + $name, [StringComparison]::Ordinal) }).Count -ne 1)
        {
            throw "A new focused outcome was not discovered exactly once:$name"
        }
    }
    if ($ExpectedFailureName)
    {
        if ($actualExit -ne 1 -or $failures.Count -ne 1 -or $failures[0].outcome -ne 'Failed' -or
            !$failures[0].testName.EndsWith('.' + $ExpectedFailureName, [StringComparison]::Ordinal) -or
            ($ExpectedFailureFragment -and !$failures[0].Output.ErrorInfo.Message.Contains($ExpectedFailureFragment)))
        {
            throw 'The actual red outcome is not the one expected assertion failure.'
        }
    }
    elseif ($actualExit -ne 0 -or $failures.Count)
    {
        throw 'The actual owning suite is not green.'
    }
    if ((Get-FileHash -LiteralPath $source).Hash -ne $sourceHash -or
        (Get-FileHash -LiteralPath $testSource).Hash -ne $testHash)
    {
        throw 'Executed source changed during validation.'
    }
    $productOwner = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Mvc.ViewFeatures\Release\net12.0\Microsoft.AspNetCore.Mvc.ViewFeatures.dll'
    $testOwner = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Mvc.ViewFeatures.Test\Release\net12.0\Microsoft.AspNetCore.Mvc.ViewFeatures.dll'
    $ownerHash = (Get-FileHash -LiteralPath $productOwner).Hash
    if ((Get-FileHash -LiteralPath $testOwner).Hash -ne $ownerHash)
    {
        throw 'The actual executed test closure does not contain the rebuilt product owner.'
    }
    [ordered]@{
        candidate = 'F022'
        actualSourceSha256 = $sourceHash
        actualTestSha256 = $testHash
        actualOwnerSha256 = $ownerHash
        originalCasesPreserved = $original.original_outcomes
        actualFocusedCases = $expectedNewNames.Count
        actualPassed = $rows.Count - $failures.Count
        actualExpectedRed = $failures.Count
        actualSkipped = 0
        actualRunnerExitCode = $actualExit
        originalAndNewOutcomesValidated = $true
        nativeIisValidated = $false
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
}
finally
{
    Pop-Location
}
