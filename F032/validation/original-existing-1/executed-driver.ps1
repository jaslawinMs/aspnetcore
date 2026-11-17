param(
    [ValidateSet('original', 'candidate')]
    [string]$Variant = 'original',
    [ValidateRange(1, 3)]
    [int]$Attempt = 1,
    [switch]$VerifyExisting
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F032'
$execution = Join-Path $run "validation\$Variant-existing-$Attempt"
if ((Test-Path -LiteralPath $execution) -and !$VerifyExisting)
{
    throw 'Do not overwrite an actual F032 owning test attempt.'
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
    if ((& git branch --show-current).Trim() -cne 'autoperf/F032-httpsys-flush-start' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        @(& git diff --cached --name-only).Count -or
        ($Variant -eq 'original' -and $changed.Count) -or
        ($Variant -eq 'candidate' -and ($changed.Count -ne 1 -or
            $changed[0] -cne 'src/Servers/HttpSys/src/ResponseStream.cs')))
    {
        throw 'Require independent original branch or only its uncommitted Flush completed-success guard.'
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
        if ($Variant -eq 'candidate' -and $entry.file -ceq 'src/Servers/HttpSys/src/ResponseStream.cs')
        {
            continue
        }
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'An investigated unchanged owning/API/producer source differs.'
        }
    }
    $prefix = 'Microsoft.AspNetCore.Server.HttpSys.'
    $selection = @(
        @{ method = $prefix + 'ResponseBodyTests.ResponseBody_StartAsync_LocksHeadersAndTriggersOnStarting'; rows = 1 },
        @{ method = $prefix + 'ResponseBodyTests.ResponseBody_CompleteAsync_TriggersOnStartingAndLocksHeaders'; rows = 1 },
        @{ method = $prefix + 'ResponseBodyTests.ResponseBody_CompleteAsync_FlushesThePipe'; rows = 1 },
        @{ method = $prefix + 'ResponseBodyTests.ResponseBody_PipeAdapter_AutomaticallyFlushed'; rows = 1 },
        @{ method = $prefix + 'ResponseBodyTests.ResponseBody_WriteNoHeadersAndFlush_DefaultsToChunked'; rows = 1 },
        @{ method = $prefix + 'ResponseBodyTests.ResponseBody_Write_TriggersOnStarting'; rows = 1 },
        @{ method = $prefix + 'ResponseBodyTests.ResponseBody_BeginWrite_TriggersOnStarting'; rows = 1 },
        @{ method = $prefix + 'ResponseBodyTests.ResponseBody_WriteAsync_TriggersOnStarting'; rows = 1 },
        @{ method = $prefix + 'ResponseBodyTests.ResponseBody_ZeroLengthTrailingWrite_Success'; rows = 2 },
        @{ method = $prefix + 'ResponseTests.Response_Empty_CallsOnStartingAndOnCompleted'; rows = 1 },
        @{ method = $prefix + 'ResponseTests.Response_OnStartingThrows_StillCallsOnCompleted'; rows = 1 },
        @{ method = $prefix + 'ResponseTests.Response_OnStartingThrowsAfterWrite_WriteThrowsAndStillCallsOnCompleted'; rows = 1 },
        @{ method = $prefix + 'Listener.ResponseBodyTests.ResponseBody_SyncWriteDisabledByDefault_WorksWhenEnabled'; rows = 1 },
        @{ method = $prefix + 'Listener.ResponseBodyTests.ResponseBody_FlushThenWrite_DefaultsToChunkedAndTerminates'; rows = 1 }
    )
    $filter = ($selection | ForEach-Object { "FullyQualifiedName=$($_.method)" }) -join '|'
    $arguments = @('test', 'src\Servers\HttpSys\test\FunctionalTests\Microsoft.AspNetCore.Server.HttpSys.FunctionalTests.csproj',
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
        $selection | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $execution 'selection.json') -Encoding utf8NoBOM
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
    $outcomes = [ordered]@{
        candidate = 'F032'; variant = $Variant; actualXmlSha256 = (Get-FileHash -LiteralPath $report).Hash
        actualOutcomeCount = $rows.Count; actualPassed = @($rows | Where-Object outcome -eq Passed).Count
        actualNonPassed = @($rows | Where-Object outcome -ne Passed).Count
        actualOutcomes = @($rows | ForEach-Object {
            [ordered]@{ name = $_.testName; testId = $_.testId; executionId = $_.executionId
                outcome = $_.outcome; message = $_.Output.ErrorInfo.Message }
        })
    }
    $outcomes | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'actual-outcomes.json') -Encoding utf8NoBOM
    if ($code -ne 0 -or $rows.Count -ne 15 -or $outcomes.actualNonPassed -or
        @($rows.executionId | Sort-Object -Unique).Count -ne $rows.Count -or
        [int]$trx.TestRun.ResultSummary.Counters.executed -ne $rows.Count)
    {
        throw 'Require every selected actual row executed and passed, with no skipped prerequisites.'
    }
    foreach ($required in $selection)
    {
        $count = @($rows | Where-Object { $_.testName -ceq $required.method -or
            $_.testName.StartsWith($required.method + '(', [StringComparison]::Ordinal) }).Count
        if ($count -ne $required.rows)
        {
            throw "A required owning scenario did not independently execute: $($required.method)"
        }
    }
    $values = @($rows | Where-Object { $_.testName.Contains('ResponseBody_ZeroLengthTrailingWrite_Success(') } |
        ForEach-Object {
            if ($_.testName -notmatch '(?i)setContentLength:\s*(true|false)')
            {
                throw 'Expected an explicit retained Boolean theory identity.'
            }
            $Matches[1].ToLowerInvariant()
        } | Sort-Object -Unique)
    if (($values -join ',') -cne 'false,true')
    {
        throw 'Both distinct theory rows must execute their actual assertions.'
    }
    if ($Variant -eq 'candidate')
    {
        $original = Get-Content -Raw (Join-Path $run 'validation\original-existing-1\actual-outcomes.json') | ConvertFrom-Json
        if (@(Compare-Object @($original.actualOutcomes.name | Sort-Object) @($rows.testName | Sort-Object)).Count)
        {
            throw 'Candidate discovery differs from the original per-case row set.'
        }
    }
    $assembly = 'Microsoft.AspNetCore.Server.HttpSys'
    $product = Join-Path $root "artifacts\bin\$assembly\Release\net12.0\$assembly.dll"
    $executed = Join-Path $root "artifacts\bin\Microsoft.AspNetCore.Server.HttpSys.FunctionalTests\Release\net12.0\$assembly.dll"
    if ((Get-FileHash -LiteralPath $product).Hash -cne (Get-FileHash -LiteralPath $executed).Hash)
    {
        throw 'Executed native functional-test image differs from the actual product owner.'
    }
    Copy-Item -LiteralPath (Join-Path $root 'src\Servers\HttpSys\src\ResponseStream.cs') `
        -Destination (Join-Path $execution 'ResponseStream.cs.executed-source')
    & git --no-pager diff -- src/Servers/HttpSys/src/ResponseStream.cs |
        Set-Content (Join-Path $execution 'actual-source-diff.patch') -Encoding utf8NoBOM
    [ordered]@{
        candidate = 'F032'; variant = $Variant; actualPassed = $rows.Count; actualSkipped = 0; actualFailures = 0
        actualRunnerExitCode = $code; actualSelection = $selection; actualBooleanTheoryValues = $values
        actualOwners = @([ordered]@{
            assembly = $assembly; actualProductPath = $product
            actualOwnerSha256 = (Get-FileHash -LiteralPath $product).Hash
            actualOwnerPdbSha256 = (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($product, '.pdb'))).Hash
        })
        actualResponseStreamSourceSha256 = (Get-FileHash -LiteralPath (Join-Path $execution 'ResponseStream.cs.executed-source')).Hash
        exactFreshXmlOutcomesParsed = $true; comparativeTiming = $false; aFunctionalRedGreenVerification = $false
        actualExistingInvocationReverifiedWithoutNativeRerun = [bool]$VerifyExisting
        existingTestBoundary = 'Thirteen full-host rows exercise real HTTP.sys start/completion/writes/headers;two lower Listener rows cover native ResponseBody but bypass ResponseStream. Separate standalone full-host pending Flush producer contracts remain required.'
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
    Write-Output "F032 $Variant :all15 exact native functional rows passed;0skipped;both Boolean theory rows independently observed."
}
finally
{
    Pop-Location
}
