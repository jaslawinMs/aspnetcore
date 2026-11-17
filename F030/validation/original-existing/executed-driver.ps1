$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F030'
$execution = Join-Path $run 'validation\original-existing'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite a fresh F030 owning test attempt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F030-sync-render-partial-source' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        (& git status --porcelain --untracked-files=no))
    {
        throw 'Require the independent original F030 source branch without product edits.'
    }
    . .\activate.ps1
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -cne '12.0.100-alpha.1.26557.102')
    {
        throw 'Activated SDK differs from the intended owner baseline.'
    }
    $investigation = Get-Content -Raw -LiteralPath (Join-Path $run 'investigation.json') | ConvertFrom-Json
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'An investigated owning/API/producer source changed.'
        }
    }
    $arguments = @('test', 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj',
        '--no-restore', '-c', 'Release', '-f', 'net12.0', '-m:2', '-nr:false',
        '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperPartialExtensionsTest',
        '--logger', 'trx;LogFileName=owning.trx', '--results-directory', $execution, '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'test.stdout') 2> (Join-Path $execution 'test.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
        sourceHead = (& git rev-parse HEAD).Trim(); actualSdk = $sdk
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
        comparativeTiming = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'test.stdout') -Tail 18
    Get-Content -LiteralPath (Join-Path $execution 'test.stderr') -Tail 8
    $report = Join-Path $execution 'owning.trx'
    if (!(Test-Path -LiteralPath $report))
    {
        throw 'Requested tests did not reach a fresh TRX;retain the actual attempt.'
    }
    [xml]$trx = Get-Content -Raw -LiteralPath $report
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $failures = @($rows | Where-Object outcome -ne Passed)
    [ordered]@{
        candidate = 'F030'; actualXmlSha256 = (Get-FileHash -LiteralPath $report).Hash
        actualOutcomeCount = $rows.Count; actualPassed = @($rows | Where-Object outcome -eq Passed).Count
        actualNonPassed = $failures.Count
        actualOutcomes = @($rows | ForEach-Object {
            [ordered]@{ name = $_.testName; testId = $_.testId; executionId = $_.executionId
                outcome = $_.outcome; message = $_.Output.ErrorInfo.Message }
        })
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'actual-outcomes.json') -Encoding utf8NoBOM
    $prefix = 'Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperPartialExtensionsTest.'
    if ($code -ne 0 -or $rows.Count -ne 34 -or $failures.Count -or @($rows | Where-Object {
        !$_.testName.StartsWith($prefix, [StringComparison]::Ordinal)
    }).Count -or @($rows.executionId | Sort-Object -Unique).Count -ne $rows.Count -or
        [int]$trx.TestRun.ResultSummary.Counters.executed -ne $rows.Count)
    {
        throw 'Fresh discovery/execution,unique rows or passing outcomes differ.'
    }
    foreach ($entry in ([ordered]@{
        RenderPartialMethods_DoesNotWrapThrownException = 4
        RenderPartialMethods_CallHtmlHelperWithExpectedArguments = 3
        RenderPartialAsyncMethods_CallHtmlHelperWithExpectedArguments = 3
        RenderPartialAsync_Throws_IfViewNotFound_MessageUsesGetViewLocations = 1
        RenderPartialAsync_Throws_IfViewNotFound_MessageUsesFindViewLocations = 1
        RenderPartialAsync_Throws_IfViewNotFound_MessageUsesAllLocations = 1
    }).GetEnumerator())
    {
        $name = $prefix + $entry.Key
        $matches = @($rows | Where-Object { $_.testName -ceq $name -or
            $_.testName.StartsWith($name + '(', [StringComparison]::Ordinal) })
        if ($matches.Count -ne $entry.Value -or @($matches | Where-Object outcome -ne Passed).Count)
        {
            throw "A required RenderPartial row did not independently pass:$($entry.Key)"
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
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'An investigated source changed during validation.'
        }
    }
    [ordered]@{
        candidate = 'F030'; actualPassed = $rows.Count; actualSkipped = 0; actualFailures = 0
        actualRunnerExitCode = $code; actualOriginalOwners = $owners
        actualAllOriginalSourceHashesRetained = $true; exactFreshXmlOutcomesParsed = $true
        comparativeTiming = $false; aFixOrRedGreenVerification = $false
        existingTestBoundary = 'Four synchronous immediate exception rows;the two three-row CallHtmlHelperWithExpectedArguments methods both use async MemberData. They are not pending-real-producer or synchronous-success evidence.'
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
}
finally
{
    Pop-Location
}
