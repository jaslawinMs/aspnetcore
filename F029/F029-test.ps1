$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F029'
$execution = Join-Path $run 'validation\original-existing'
$project = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\test\Microsoft.AspNetCore.Mvc.ViewFeatures.Test.csproj'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F029 owning test attempt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F029-sync-partial-source' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        (& git status --porcelain --untracked-files=no))
    {
        throw 'Require the independent original F029 branch without product edits.'
    }
    . .\activate.ps1
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -cne '12.0.100-alpha.1.26557.102')
    {
        throw 'The activated SDK differs from the intended owner baseline.'
    }
    $investigation = Get-Content -Raw -LiteralPath (Join-Path $run 'investigation.json') | ConvertFrom-Json
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'An investigated owning/API/producer source changed.'
        }
    }
    $arguments = @('test', $project, '--no-restore', '-c', 'Release', '-f', 'net12.0',
        '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperPartialExtensionsTest',
        '--logger', 'trx;LogFileName=owning.trx', '--results-directory', $execution, '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'test.stdout') 2> (Join-Path $execution 'test.stderr')
    $actualExit = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
        sourceHead = (& git rev-parse HEAD).Trim(); actualSdk = $sdk
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o')
        actualExitCode = $actualExit; comparativeTiming = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'test.stdout') -Tail 22
    Get-Content -LiteralPath (Join-Path $execution 'test.stderr') -Tail 10
    $report = Join-Path $execution 'owning.trx'
    if (!(Test-Path -LiteralPath $report))
    {
        throw 'Requested tests did not reach a fresh TRX. Preserve the actual attempt.'
    }
    [xml]$trx = Get-Content -Raw -LiteralPath $report
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $failures = @($rows | Where-Object outcome -ne Passed)
    $outcomes = @($rows | ForEach-Object {
        [ordered]@{ name = $_.testName; testId = $_.testId; executionId = $_.executionId
            outcome = $_.outcome; message = $_.Output.ErrorInfo.Message }
    })
    [ordered]@{
        candidate = 'F029'; actualXmlSha256 = (Get-FileHash -LiteralPath $report).Hash
        actualOutcomeCount = $rows.Count; actualPassed = @($rows | Where-Object outcome -eq Passed).Count
        actualNonPassed = $failures.Count; actualOutcomes = $outcomes
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'actual-outcomes.json') -Encoding utf8NoBOM
    $prefix = 'Microsoft.AspNetCore.Mvc.Rendering.HtmlHelperPartialExtensionsTest.'
    if ($actualExit -ne 0 -or !$rows.Count -or $failures.Count -or @($rows | Where-Object {
        !$_.testName.StartsWith($prefix, [StringComparison]::Ordinal)
    }).Count -or @($rows.executionId | Sort-Object -Unique).Count -ne $rows.Count -or
        [int]$trx.TestRun.ResultSummary.Counters.executed -ne $rows.Count)
    {
        throw 'Fresh execution,requested discovery,unique rows or passing outcomes differ.'
    }
    foreach ($entry in ([ordered]@{
        PartialMethods_CallHtmlHelperWithExpectedArguments = 4
        PartialMethods_DoesNotWrapThrownException = 4
        Partial_InvokesAndRendersPartialAsyncOnHtmlHelperOfT = 1
        PartialWithModel_InvokesAndRendersPartialAsyncOnHtmlHelperOfT = 1
        PartialWithViewData_InvokesAndRendersPartialAsyncOnHtmlHelperOfT = 1
    }).GetEnumerator())
    {
        $name = $prefix + $entry.Key
        $matches = @($rows | Where-Object { $_.testName -ceq $name -or
            $_.testName.StartsWith($name + '(', [StringComparison]::Ordinal) })
        if ($matches.Count -ne $entry.Value -or @($matches | Where-Object outcome -ne Passed).Count)
        {
            throw "A required synchronous Partial row did not independently pass:$($entry.Key)"
        }
    }
    $owners = @(foreach ($assembly in @('Microsoft.AspNetCore.Mvc.ViewFeatures', 'Microsoft.AspNetCore.Mvc.Razor'))
    {
        $product = Join-Path $root "artifacts\bin\$assembly\Release\net12.0\$assembly.dll"
        $executed = Join-Path $root "artifacts\bin\Microsoft.AspNetCore.Mvc.ViewFeatures.Test\Release\net12.0\$assembly.dll"
        if ((Get-FileHash -LiteralPath $product).Hash -cne (Get-FileHash -LiteralPath $executed).Hash)
        {
            throw 'Executed test image differs from the rebuilt real product owner.'
        }
        [ordered]@{ assembly = $assembly; actualProductPath = $product
            actualOwnerSha256 = (Get-FileHash -LiteralPath $product).Hash
            actualOwnerPdbSha256 = (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($product, '.pdb'))).Hash }
    })
    foreach ($entry in @($investigation.parity | Where-Object core))
    {
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'An actual source changed during validation.'
        }
    }
    [ordered]@{
        candidate = 'F029'; actualPassed = $rows.Count; actualSkipped = 0; actualFailures = 0
        actualRunnerExitCode = $actualExit; actualOriginalOwners = $owners
        actualAllOriginalSourceHashesRetained = $true; exactFreshXmlOutcomesParsed = $true
        comparativeTiming = $false; aFixOrRedGreenVerification = $false
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
}
finally
{
    Pop-Location
}
