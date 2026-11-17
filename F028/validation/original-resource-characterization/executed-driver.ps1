param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [switch]$IncludeFocused,
    [switch]$ExpectAllocationRed
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F028'
$execution = Join-Path $run "validation\$Label"
$source = Join-Path $root 'src\Identity\Core\src\SignInManager.cs'
$testSource = Join-Path $root 'src\Identity\test\Identity.Test\SignInManagerTest.cs'
$project = Join-Path $root 'src\Identity\test\Identity.Test\Microsoft.AspNetCore.Identity.Test.csproj'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F028 test attempt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Copy-Item -LiteralPath $source -Destination (Join-Path $execution 'executed-SignInManager.cs')
Copy-Item -LiteralPath $testSource -Destination (Join-Path $execution 'executed-SignInManagerTest.cs')
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -ne 'autoperf/F028-external-login-scheme-source')
    {
        throw 'Require the independent F028 source branch.'
    }
    . .\activate.ps1
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -ne '12.0.100-alpha.1.26557.102')
    {
        throw 'The activated SDK differs from the intended owner baseline.'
    }
    $arguments = @('test', $project, '--no-restore', '-c', 'Release', '-f', 'net12.0',
        '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        '--filter', 'FullyQualifiedName~Microsoft.AspNetCore.Identity.Test.SignInManagerTest',
        '--logger', 'trx;LogFileName=owning.trx', '--results-directory', $execution, '-v', 'minimal')
    $sourceHash = (Get-FileHash -LiteralPath $source).Hash
    $investigation = Get-Content -Raw -LiteralPath (Join-Path $run 'investigation.json') | ConvertFrom-Json
    $originalHash = @($investigation.parity | Where-Object file -CEQ 'src/Identity/Core/src/SignInManager.cs')[0].actualWorkingBytesSha256
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
        expectedAllocationRedRows = $(if ($ExpectAllocationRed) { 1 } else { 0 })
        comparativeTiming = $false
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
        candidate = 'F028'; actualXmlSha256 = (Get-FileHash -LiteralPath $report).Hash
        actualOutcomeCount = $rows.Count; actualPassed = @($rows | Where-Object outcome -eq Passed).Count
        actualNonPassed = $failures.Count; actualOutcomes = $outcomes
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'actual-outcomes.json') -Encoding utf8NoBOM
    $prefix = 'Microsoft.AspNetCore.Identity.Test.SignInManagerTest.'
    if (!$rows.Count -or @($rows | Where-Object {
        !$_.testName.StartsWith($prefix, [StringComparison]::Ordinal)
    }).Count -or @($rows.executionId | Sort-Object -Unique).Count -ne $rows.Count -or
        [int]$trx.TestRun.ResultSummary.Counters.executed -ne $rows.Count)
    {
        throw 'Requested discovery or execution uniqueness differs.'
    }
    if ($Label -cne 'original-existing')
    {
        $baseline = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\original-existing\actual-outcomes.json') | ConvertFrom-Json
        if ($rows.Count -ne $baseline.actualOutcomeCount + $(if ($IncludeFocused) { 17 } else { 0 }))
        {
            throw 'The actual original/focused row count differs.'
        }
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
        $methods = [ordered]@{
            GetExternalLoginInfoAsyncUsesDefaultProviderDisplayName = 6
            GetExternalLoginInfoAsyncObservesDefaultProviderChanges = 1
            GetExternalLoginInfoAsyncPreservesManagerSchemeOverride = 5
            GetExternalLoginInfoAsyncPreservesDerivedProviderEnumeration = 2
            GetExternalLoginInfoAsyncWaitsForCustomSchemeEnumeration = 1
            GetExternalLoginInfoAsyncPreservesCustomEnumerationFailure = 1
            GetExternalLoginInfoAsyncDefaultTypesAvoidEnumerationAllocations = 1
        }
        foreach ($method in $methods.Keys)
        {
            $name = $prefix + $method
            $matches = @($rows | Where-Object { $_.testName -ceq $name -or $_.testName.StartsWith($name + '(', [StringComparison]::Ordinal) })
            if ($matches.Count -ne $methods[$method] -or
                @($matches | Where-Object {
                    $_.outcome -ne 'Passed' -and !($ExpectAllocationRed -and $method -ceq 'GetExternalLoginInfoAsyncDefaultTypesAvoidEnumerationAllocations')
                }).Count)
            {
                throw "A required focused method/theory row did not independently execute:$method"
            }
        }
    }
    if ($ExpectAllocationRed)
    {
        if ($actualExit -ne 1 -or $failures.Count -ne 1 -or
            $failures[0].testName -cne ($prefix + 'GetExternalLoginInfoAsyncDefaultTypesAvoidEnumerationAllocations') -or
            !$failures[0].Output.ErrorInfo.Message.Contains('Default type lookup allocation must be below derived fallback allocation.'))
        {
            throw 'Original characterization must have only the exact independently checked allocation failure.'
        }
    }
    elseif ($actualExit -ne 0 -or $failures.Count)
    {
        throw 'The requested owning scope is not green.'
    }
    if ((Get-FileHash -LiteralPath $source).Hash -cne $sourceHash)
    {
        throw 'Owner source changed during validation.'
    }
    $productOwner = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Identity\Release\net12.0\Microsoft.AspNetCore.Identity.dll'
    $testOwner = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Identity.Test\Release\net12.0\Microsoft.AspNetCore.Identity.dll'
    if ((Get-FileHash -LiteralPath $productOwner).Hash -cne (Get-FileHash -LiteralPath $testOwner).Hash)
    {
        throw 'Executed test image differs from the rebuilt product owner.'
    }
    [ordered]@{
        candidate = 'F028'; actualSourceSha256 = $sourceHash
        actualOwnerSha256 = (Get-FileHash -LiteralPath $productOwner).Hash
        actualOwnerPdbSha256 = (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($productOwner, '.pdb'))).Hash
        actualRunnerExitCode = $actualExit; actualPassed = $rows.Count - $failures.Count
        actualExpectedRed = $failures.Count; actualSkipped = 0; exactFreshXmlOutcomesParsed = $true
        comparativeTiming = $false
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
}
finally
{
    Pop-Location
}
