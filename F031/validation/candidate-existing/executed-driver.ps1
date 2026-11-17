param(
    [ValidateSet('original', 'candidate')]
    [string]$Variant = 'original',
    [switch]$VerifyExisting
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F031'
$execution = Join-Path $run "validation\$Variant-existing"
if ((Test-Path -LiteralPath $execution) -and !$VerifyExisting)
{
    throw 'Do not overwrite an actual F031 owning test attempt.'
}
if ($VerifyExisting)
{
    if (!(Test-Path -LiteralPath (Join-Path $execution 'invocation.json')) -or
        (Test-Path -LiteralPath (Join-Path $execution 'verified-result.json')))
    {
        throw 'Only reverify the retained, not-yet-verified actual invocation.'
    }
    Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-reverification-driver.ps1')
}
else
{
    New-Item -ItemType Directory -Path $execution | Out-Null
    Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
}
Push-Location $root
try
{
    $changed = @(& git diff --name-only)
    if ((& git branch --show-current).Trim() -cne 'autoperf/F031-template-completed-task' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        @(& git diff --cached --name-only).Count -or
        ($Variant -eq 'original' -and $changed.Count) -or
        ($Variant -eq 'candidate' -and ($changed.Count -ne 1 -or
            $changed[0] -cne 'src/Mvc/Mvc.ViewFeatures/src/TemplateRenderer.cs')))
    {
        throw 'Require the independent original branch or its single uncommitted completed-success guard.'
    }
    . .\activate.ps1
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -cne '12.0.100-alpha.1.26557.102')
    {
        throw 'Activated SDK differs from the intended owner baseline.'
    }
    $investigation = Get-Content -Raw (Join-Path $run 'investigation.json') | ConvertFrom-Json
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        if ($Variant -eq 'candidate' -and $entry.file -ceq 'src/Mvc/Mvc.ViewFeatures/src/TemplateRenderer.cs')
        {
            continue
        }
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'An investigated unchanged owning/API/producer source differs.'
        }
    }
    $classes = @(
        'Microsoft.AspNetCore.Mvc.ViewFeatures.TemplateRendererTest',
        'Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultDisplayTemplatesTest',
        'Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultEditorTemplatesTest',
        'Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperDisplayExtensionsTest',
        'Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperEditorExtensionsTest'
    )
    $filter = ($classes | ForEach-Object { "FullyQualifiedName~$_" }) -join '|'
    $arguments = @('test', 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj',
        '--no-restore', '-c', 'Release', '-f', 'net12.0', '-m:2', '-nr:false',
        '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-p:BuildInParallel=false',
        '--filter', $filter, '--logger', 'trx;LogFileName=owning.trx', '--results-directory', $execution, '-v', 'minimal')
    if ($VerifyExisting)
    {
        $invocation = Get-Content -Raw (Join-Path $execution 'invocation.json') | ConvertFrom-Json
        if ($invocation.variant -cne $Variant -or $invocation.actualSdk -cne $sdk -or
            @($invocation.arguments).Count -ne $arguments.Count -or
            @((0..($arguments.Count - 1)) | Where-Object { $arguments[$_] -cne $invocation.arguments[$_] }).Count)
        {
            throw 'Retained test invocation differs from the intended exact command.'
        }
        $code = $invocation.actualExitCode
    }
    else
    {
        $started = [DateTimeOffset]::UtcNow.ToString('o')
        & dotnet @arguments 1> (Join-Path $execution 'test.stdout') 2> (Join-Path $execution 'test.stderr')
        $code = $LASTEXITCODE
        [ordered]@{
            executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
            sourceHead = (& git rev-parse HEAD).Trim(); actualSdk = $sdk; variant = $Variant
            started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
            comparativeTiming = $false
        } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    }
    Get-Content (Join-Path $execution 'test.stdout') -Tail 18
    Get-Content (Join-Path $execution 'test.stderr') -Tail 8
    $report = Join-Path $execution 'owning.trx'
    if (!(Test-Path -LiteralPath $report))
    {
        throw 'Requested tests did not reach a fresh TRX; retain the actual attempt.'
    }
    [xml]$trx = Get-Content -Raw $report
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $nonPassed = @($rows | Where-Object outcome -ne Passed)
    $outcomes = [ordered]@{
        candidate = 'F031'; variant = $Variant; actualXmlSha256 = (Get-FileHash -LiteralPath $report).Hash
        actualOutcomeCount = $rows.Count; actualPassed = @($rows | Where-Object outcome -eq Passed).Count
        actualNonPassed = $nonPassed.Count
        actualOutcomes = @($rows | ForEach-Object {
            [ordered]@{ name = $_.testName; testId = $_.testId; executionId = $_.executionId
                outcome = $_.outcome; message = $_.Output.ErrorInfo.Message }
        })
    }
    $outcomesPath = Join-Path $execution 'actual-outcomes.json'
    if (Test-Path -LiteralPath $outcomesPath)
    {
        if ((Get-Content -Raw $outcomesPath).TrimEnd() -cne ($outcomes | ConvertTo-Json -Depth 10))
        {
            throw 'Retained outcome receipts differ from the actual TRX rows.'
        }
    }
    else
    {
        $outcomes | ConvertTo-Json -Depth 10 | Set-Content $outcomesPath -Encoding utf8NoBOM
    }
    $classCounts = @(foreach ($class in $classes)
    {
        $count = @($rows | Where-Object { $_.testName.StartsWith($class + '.', [StringComparison]::Ordinal) }).Count
        if (!$count)
        {
            throw "A requested owning test class did not execute: $class"
        }
        [ordered]@{ class = $class; actualExecutedPassed = $count }
    })
    if ($code -ne 0 -or $rows.Count -lt 50 -or $nonPassed.Count -or
        @($rows.executionId | Sort-Object -Unique).Count -ne $rows.Count -or
        [int]$trx.TestRun.ResultSummary.Counters.executed -ne $rows.Count -or
        ($classCounts | ForEach-Object { $_.actualExecutedPassed } | Measure-Object -Sum).Sum -ne $rows.Count)
    {
        throw 'Fresh discovery/execution, unique rows or passing outcomes differ.'
    }
    foreach ($required in @(
        @{ name = 'Microsoft.AspNetCore.Mvc.ViewFeatures.TemplateRendererTest.GetTypeNames_ReturnsExpectedResults'; count = 16 },
        @{ name = 'Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultDisplayTemplatesTest.DisplayFor_DoesNotWrapExceptionThrowsDuringViewRendering'; count = 1 },
        @{ name = 'Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultEditorTemplatesTest.EditorFor_DoesNotWrapExceptionThrowsDuringViewRendering'; count = 1 },
        @{ name = 'Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultDisplayTemplatesTest.Display_CallsFindView_WithExpectedPath'; count = 1 },
        @{ name = 'Microsoft.AspNetCore.Mvc.ViewFeatures.DefaultEditorTemplatesTest.EditorForModel_CallsFindView_WithExpectedPath'; count = 1 }
    ))
    {
        $count = @($rows | Where-Object { $_.testName -ceq $required.name -or
            $_.testName.StartsWith($required.name + '(', [StringComparison]::Ordinal) }).Count
        if ($count -ne $required.count)
        {
            throw "A required row did not independently execute and pass: $($required.name)"
        }
    }
    if ($Variant -eq 'candidate')
    {
        $original = Get-Content -Raw (Join-Path $run 'validation\original-existing\actual-outcomes.json') | ConvertFrom-Json
        if (@(Compare-Object @($original.actualOutcomes.name | Sort-Object) @($rows.testName | Sort-Object)).Count)
        {
            throw 'Candidate discovery differs from the original per-case row set.'
        }
    }
    $owners = @(foreach ($assembly in @('Microsoft.AspNetCore.Mvc.ViewFeatures', 'Microsoft.AspNetCore.Mvc.Razor'))
    {
        $product = Join-Path $root "artifacts\bin\$assembly\Release\net12.0\$assembly.dll"
        $executed = Join-Path $root "artifacts\bin\Microsoft.AspNetCore.Mvc.ViewFeatures.Test\Release\net12.0\$assembly.dll"
        if ((Get-FileHash -LiteralPath $product).Hash -cne (Get-FileHash -LiteralPath $executed).Hash)
        {
            throw 'Executed test image differs from the actual product owner.'
        }
        [ordered]@{ assembly = $assembly; actualProductPath = $product
            actualOwnerSha256 = (Get-FileHash -LiteralPath $product).Hash
            actualOwnerPdbSha256 = (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($product, '.pdb'))).Hash }
    })
    Copy-Item -LiteralPath (Join-Path $root 'src\Mvc\Mvc.ViewFeatures\src\TemplateRenderer.cs') `
        -Destination (Join-Path $execution 'TemplateRenderer.cs.executed-source')
    & git --no-pager diff -- src/Mvc/Mvc.ViewFeatures/src/TemplateRenderer.cs |
        Set-Content (Join-Path $execution 'actual-source-diff.patch') -Encoding utf8NoBOM
    [ordered]@{
        candidate = 'F031'; variant = $Variant; actualPassed = $rows.Count; actualSkipped = 0; actualFailures = 0
        actualRunnerExitCode = $code; actualOwners = $owners; actualClassCounts = $classCounts
        actualTemplateRendererSourceSha256 = (Get-FileHash -LiteralPath (Join-Path $execution 'TemplateRenderer.cs.executed-source')).Hash
        exactFreshXmlOutcomesParsed = $true; comparativeTiming = $false
        aFunctionalRedGreenVerification = $false
        actualExistingInvocationReverifiedWithoutNativeRerun = [bool]$VerifyExisting
        existingTestBoundary = 'Real HtmlHelper/default templates with prepared view mocks; separate page-owned pending RazorView producer contracts establish actual asynchronous template reachability.'
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
    if ($VerifyExisting)
    {
        [ordered]@{
            actualOriginalDriverExitCode = 1; actualOriginalTestRunnerExitCode = $code
            actualFreshTestRuns = 1; actualTestRerunPerformed = $false
            actualRootCause = 'Measure-Object -Property actualExecutedPassed on the ordered-dictionary objects returned a null Sum. Enumerating numeric dictionary values before summing fixes only the postprocessing guard.'
            actualOriginalLogsTrxAndOutcomeBytesPreserved = $true
            actualCorrectedClassCounts = $classCounts; actualRows = $rows.Count
        } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'postprocessing-reverification.json') -Encoding utf8NoBOM
    }
}
finally
{
    Pop-Location
}
