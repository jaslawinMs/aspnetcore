param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [switch]$IncludeFocused,
    [switch]$ExpectAllocationRed
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F024'
$execution = Join-Path $run "validation\$Label"
$source = Join-Path $root 'src\Middleware\Session\src\DistributedSession.cs'
$testSource = Join-Path $root 'src\Middleware\Session\test\SessionTests.cs'
$focusedSource = Join-Path $root 'src\Middleware\Session\test\DistributedSessionCommitTests.cs'
$project = Join-Path $root 'src\Middleware\Session\test\Microsoft.AspNetCore.Session.Tests.csproj'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F024 test attempt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Copy-Item -LiteralPath $source -Destination (Join-Path $execution 'executed-DistributedSession.cs')
Copy-Item -LiteralPath $testSource -Destination (Join-Path $execution 'executed-SessionTests.cs')
if (Test-Path -LiteralPath $focusedSource)
{
    Copy-Item -LiteralPath $focusedSource -Destination (Join-Path $execution 'executed-DistributedSessionCommitTests.cs')
}
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -ne 'autoperf/F024-session-commit-timeout-source')
    {
        throw 'Require the independent F024 source branch.'
    }
    . .\activate.ps1
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -ne '12.0.100-alpha.1.26557.102')
    {
        throw 'The activated SDK differs from the intended owner baseline.'
    }
    $filter = 'FullyQualifiedName~Microsoft.AspNetCore.Session.SessionTests'
    if ($IncludeFocused)
    {
        $filter += '|FullyQualifiedName~Microsoft.AspNetCore.Session.DistributedSessionCommitTests'
    }
    $arguments = @('test', $project, '--no-restore', '-c', 'Release', '-f', 'net12.0',
        '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        '--filter', $filter, '--logger', 'trx;LogFileName=owning.trx',
        '--results-directory', $execution, '-v', 'minimal')
    $sourceHash = (Get-FileHash -LiteralPath $source).Hash
    $investigation = Get-Content -Raw -LiteralPath (Join-Path $run 'investigation.json') | ConvertFrom-Json
    $originalHash = @($investigation.snapshots | Where-Object {
        $_.variant -ceq 'working' -and $_.file -ceq 'src/Middleware/Session/src/DistributedSession.cs'
    })[0].sha256
    if ($Label.StartsWith('original-', [StringComparison]::Ordinal) -and $sourceHash -cne $originalHash)
    {
        throw 'Original checks require exactly the independently captured owner.'
    }
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'test.stdout') 2> (Join-Path $execution 'test.stderr')
    $actualExit = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
        sourceHead = (& git rev-parse HEAD).Trim(); actualSourceSha256 = $sourceHash
        actualTestSha256 = (Get-FileHash -LiteralPath $testSource).Hash; actualSdk = $sdk
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $actualExit
        expectedAllocationRedRows = $(if ($ExpectAllocationRed) { 2 } else { 0 })
        comparativeTiming = $false; nativeIisValidated = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'test.stdout') -Tail 22
    Get-Content -LiteralPath (Join-Path $execution 'test.stderr') -Tail 10
    $report = Join-Path $execution 'owning.trx'
    if (!(Test-Path -LiteralPath $report))
    {
        throw 'The requested tests did not reach a fresh TRX. Preserve the actual attempt.'
    }
    [xml]$trx = Get-Content -Raw -LiteralPath $report
    $rows = @($trx.TestRun.Results.UnitTestResult)
    $failures = @($rows | Where-Object outcome -ne Passed)
    $outcomes = @($rows | ForEach-Object {
        [ordered]@{ name = $_.testName; testId = $_.testId; executionId = $_.executionId
            outcome = $_.outcome; message = $_.Output.ErrorInfo.Message }
    })
    [ordered]@{
        candidate = 'F024'; actualXmlSha256 = (Get-FileHash -LiteralPath $report).Hash
        actualOutcomeCount = $rows.Count; actualPassed = @($rows | Where-Object outcome -eq Passed).Count
        actualNonPassed = $failures.Count; actualOutcomes = $outcomes
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'actual-outcomes.json') -Encoding utf8NoBOM
    $expectedRows = if ($IncludeFocused) { 34 } else { 26 }
    if ($rows.Count -ne $expectedRows -or @($rows | Where-Object {
        !$_.testName.StartsWith('Microsoft.AspNetCore.Session.SessionTests.', [StringComparison]::Ordinal) -and
        !($_.testName.StartsWith('Microsoft.AspNetCore.Session.DistributedSessionCommitTests.', [StringComparison]::Ordinal) -and $IncludeFocused)
    }).Count -or @($rows.executionId | Sort-Object -Unique).Count -ne $rows.Count -or
        [int]$trx.TestRun.ResultSummary.Counters.executed -ne $rows.Count)
    {
        throw 'Exact requested discovery,parameterized multiplicity or execution uniqueness differs.'
    }
    $baselineReport = Join-Path $run 'validation\original-existing\actual-outcomes.json'
    if ($Label -cne 'original-existing')
    {
        $baseline = Get-Content -Raw -LiteralPath $baselineReport | ConvertFrom-Json
        foreach ($group in @($baseline.actualOutcomes | Group-Object -Property name -CaseSensitive))
        {
            $matches = @($rows | Where-Object { $_.testName -ceq $group.Name })
            if ($matches.Count -ne $group.Count -or @($matches | Where-Object outcome -ne Passed).Count)
            {
                throw "An original outcome or theory multiplicity changed:$($group.Name)"
            }
        }
    }
    if ($IncludeFocused)
    {
        $prefix = 'Microsoft.AspNetCore.Session.DistributedSessionCommitTests.'
        foreach ($value in @('True','False'))
        {
            $allocation = @($rows | Where-Object { $_.testName -ceq "${prefix}CommitAsync_InfiniteTimeoutAvoidsTimerAllocation(modified: $value)" })
            $lifetime = @($rows | Where-Object { $_.testName -ceq "${prefix}CommitAsync_InfiniteTimeoutPreservesOwnedTokenLifetime(modified: $value)" })
            if ($allocation.Count -ne 1 -or $lifetime.Count -ne 1 -or $lifetime[0].outcome -ne 'Passed')
            {
                throw "A required allocation/lifetime theory row did not independently execute:$value"
            }
            if ($ExpectAllocationRed)
            {
                $message = $allocation[0].Output.ErrorInfo.Message
                if ($allocation[0].outcome -ne 'Failed' -or
                    !$message.Contains("Infinite timeout commit allocation must be below finite timeout allocation. Modified:$value;"))
                {
                    throw "A resource row did not produce its exact expected red:$value"
                }
            }
            elseif ($allocation[0].outcome -ne 'Passed')
            {
                throw "A selected resource row is not green:$value"
            }
            foreach ($before in @('True','False'))
            {
                $cancellation = @($rows | Where-Object {
                    $_.testName -ceq "${prefix}CommitAsync_InfiniteTimeoutPreservesCallerCancellation(modified: $value, canceledBeforeCommit: $before)"
                })
                if ($cancellation.Count -ne 1 -or $cancellation[0].outcome -ne 'Passed')
                {
                    throw "A caller producer row did not independently pass:$value/$before"
                }
            }
        }
    }
    if ($ExpectAllocationRed)
    {
        if ($actualExit -ne 1 -or $failures.Count -ne 2)
        {
            throw 'Original characterization must have exactly the two independently checked allocation failures.'
        }
    }
    elseif ($actualExit -ne 0 -or $failures.Count)
    {
        throw 'The selected owning scope is not green.'
    }
    if ((Get-FileHash -LiteralPath $source).Hash -cne $sourceHash)
    {
        throw 'Owner source changed during validation.'
    }
    $productOwner = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Session\Release\net12.0\Microsoft.AspNetCore.Session.dll'
    $testOwner = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Session.Tests\Release\net12.0\Microsoft.AspNetCore.Session.dll'
    if ((Get-FileHash -LiteralPath $productOwner).Hash -cne (Get-FileHash -LiteralPath $testOwner).Hash)
    {
        throw 'Executed test image differs from the rebuilt product owner.'
    }
    [ordered]@{
        candidate = 'F024'; actualSourceSha256 = $sourceHash
        actualOwnerSha256 = (Get-FileHash -LiteralPath $productOwner).Hash
        actualOwnerPdbSha256 = (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($productOwner, '.pdb'))).Hash
        actualRunnerExitCode = $actualExit; actualPassed = $rows.Count - $failures.Count
        actualExpectedRed = $failures.Count; actualSkipped = 0; exactFreshXmlOutcomesParsed = $true
        comparativeTiming = $false; nativeIisValidated = $false
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
}
finally
{
    Pop-Location
}
