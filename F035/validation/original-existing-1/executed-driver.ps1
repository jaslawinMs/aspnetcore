param(
    [ValidateSet('original', 'candidate')]
    [string]$Variant = 'original',
    [ValidateRange(1, 3)]
    [int]$Attempt = 1
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F035'
$execution = Join-Path $run "validation\$Variant-existing-$Attempt"
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F035 owning test attempt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Push-Location $root
try
{
    $changed = @(& git diff --name-only)
    if ((& git branch --show-current).Trim() -cne 'autoperf/F035-value-provider-enumeration' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        @(& git diff --cached --name-only).Count -or
        ($Variant -eq 'original' -and $changed.Count) -or
        ($Variant -eq 'candidate' -and ($changed.Count -ne 1 -or
            $changed[0] -cne 'src/Mvc/Mvc.Abstractions/src/ModelBinding/ValueProviderResult.cs')))
    {
        throw 'Require independent original branch or only its uncommitted same-signature enumeration implementation.'
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
        if ($Variant -eq 'candidate' -and $entry.file -ceq 'src/Mvc/Mvc.Abstractions/src/ModelBinding/ValueProviderResult.cs')
        {
            continue
        }
        if ((Get-FileHash -LiteralPath (Join-Path $root $entry.file)).Hash -cne $entry.actualWorkingBytesSha256)
        {
            throw 'An investigated unchanged owning/API/producer source differs.'
        }
    }
    $prefix = 'Microsoft.AspNetCore.Mvc.ModelBinding.'
    $scopes = @(
        @{
            name = 'abstractions'
            assembly = 'Microsoft.AspNetCore.Mvc.Abstractions'
            project = 'src\Mvc\Mvc.Abstractions\test\Microsoft.AspNetCore.Mvc.Abstractions.Test.csproj'
            testAssembly = 'Microsoft.AspNetCore.Mvc.Abstractions.Test'
            selection = @(
                @{ method = $prefix + 'ValueProviderResultTest.Construct_With_NullString'; rows = 1 },
                @{ method = $prefix + 'ValueProviderResultTest.Construct_With_NullArray'; rows = 1 },
                @{ method = $prefix + 'ValueProviderResultTest.Construct_With_None'; rows = 1 },
                @{ method = $prefix + 'ValueProviderResultTest.Construct_With_String'; rows = 1 },
                @{ method = $prefix + 'ValueProviderResultTest.Construct_With_Array'; rows = 1 },
                @{ method = $prefix + 'ValueProviderResultTest.Enumerator_WithString'; rows = 1 },
                @{ method = $prefix + 'ValueProviderResultTest.Enumerator_WithArray'; rows = 1 },
                @{ method = $prefix + 'ValueProviderResultTest.Operator_Equals'; rows = 11 },
                @{ method = $prefix + 'ValueProviderResultTest.Operator_NotEquals'; rows = 11 }
            )
        },
        @{
            name = 'core'
            assembly = 'Microsoft.AspNetCore.Mvc.Core'
            project = 'src\Mvc\Mvc.Core\test\Microsoft.AspNetCore.Mvc.Core.Test.csproj'
            testAssembly = 'Microsoft.AspNetCore.Mvc.Core.Test'
            selection = @(
                @{ method = $prefix + 'Binders.CollectionModelBinderTest.BindModel_SimpleCollection_Succeeds'; rows = 2 },
                @{ method = $prefix + 'Binders.CollectionModelBinderTest.BindModel_SimpleCollection_BindingContextModelNonNull_Succeeds'; rows = 2 },
                @{ method = $prefix + 'Binders.CollectionModelBinderTest.BindModelAsync_SimpleCollectionWithNullValue_Succeeds'; rows = 1 }
            )
        }
    )
    $observed = @()
    foreach ($scope in $scopes)
    {
        $directory = Join-Path $execution $scope.name
        New-Item -ItemType Directory -Path $directory | Out-Null
        $filter = ($scope.selection | ForEach-Object { "FullyQualifiedName=$($_.method)" }) -join '|'
        $arguments = @('test', $scope.project, '--no-restore', '-c', 'Release', '-f', 'net12.0',
            '-m:2', '-nr:false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false', '-p:BuildInParallel=false',
            '--filter', $filter, '--logger', 'trx;LogFileName=owning.trx', '--results-directory', $directory, '-v', 'minimal')
        $scope.selection | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $directory 'selection.json') -Encoding utf8NoBOM
        $started = [DateTimeOffset]::UtcNow.ToString('o')
        & dotnet @arguments 1> (Join-Path $directory 'test.stdout') 2> (Join-Path $directory 'test.stderr')
        $code = $LASTEXITCODE
        [ordered]@{
            executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
            sourceHead = (& git rev-parse HEAD).Trim(); actualSdk = $sdk; variant = $Variant
            started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
            comparativeTiming = $false
        } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $directory 'invocation.json') -Encoding utf8NoBOM
        Get-Content (Join-Path $directory 'test.stdout') -Tail 10
        Get-Content (Join-Path $directory 'test.stderr') -Tail 6
        $report = Join-Path $directory 'owning.trx'
        if (!(Test-Path -LiteralPath $report))
        {
            throw 'Requested tests did not reach a fresh TRX;retain actual attempt.'
        }
        [xml]$trx = Get-Content -Raw $report
        $rows = @($trx.TestRun.Results.UnitTestResult)
        $outcomes = [ordered]@{
            candidate = 'F035'; variant = $Variant; scope = $scope.name
            actualXmlSha256 = (Get-FileHash -LiteralPath $report).Hash
            actualOutcomeCount = $rows.Count; actualPassed = @($rows | Where-Object outcome -eq Passed).Count
            actualNonPassed = @($rows | Where-Object outcome -ne Passed).Count
            actualOutcomes = @($rows | ForEach-Object {
                [ordered]@{ name = $_.testName; testId = $_.testId; executionId = $_.executionId
                    outcome = $_.outcome; message = $_.Output.ErrorInfo.Message }
            })
        }
        $outcomes | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $directory 'actual-outcomes.json') -Encoding utf8NoBOM
        $expected = ($scope.selection | Measure-Object -Property rows -Sum).Sum
        if ($code -ne 0 -or $rows.Count -ne $expected -or $outcomes.actualNonPassed -or
            @($rows.executionId | Sort-Object -Unique).Count -ne $rows.Count -or
            [int]$trx.TestRun.ResultSummary.Counters.executed -ne $rows.Count)
        {
            throw 'Every selected actual test row must execute and pass without skipped prerequisites.'
        }
        foreach ($required in $scope.selection)
        {
            $cases = @($rows | Where-Object { $_.testName -ceq $required.method -or
                $_.testName.StartsWith($required.method + '(', [StringComparison]::Ordinal) })
            if ($cases.Count -ne $required.rows)
            {
                throw "A required owning scenario did not independently execute: $($required.method)"
            }
            if ($scope.name -eq 'core' -and $required.rows -eq 2)
            {
                $values = @($cases | ForEach-Object {
                    if ($_.testName -notmatch '(?i)isReadOnly:\s*(true|false)')
                    {
                        throw 'Expected an explicit retained Boolean theory identity.'
                    }
                    $Matches[1].ToLowerInvariant()
                } | Sort-Object -Unique)
                if (($values -join ',') -cne 'false,true')
                {
                    throw 'Both distinct Boolean theory cases must reach their assertions.'
                }
            }
        }
        if ($Variant -eq 'candidate')
        {
            $original = Get-Content -Raw (Join-Path $run "validation\original-existing-1\$($scope.name)\actual-outcomes.json") | ConvertFrom-Json
            if (@(Compare-Object @($original.actualOutcomes.name | Sort-Object) @($rows.testName | Sort-Object)).Count)
            {
                throw 'Candidate discovery differs from original actual per-case row multiset.'
            }
        }
        foreach ($owner in 'Microsoft.AspNetCore.Mvc.Abstractions',$scope.assembly | Select-Object -Unique)
        {
            $product = Join-Path $root "artifacts\bin\$owner\Release\net12.0\$owner.dll"
            $executed = Join-Path $root "artifacts\bin\$($scope.testAssembly)\Release\net12.0\$owner.dll"
            if ((Get-FileHash -LiteralPath $product).Hash -cne (Get-FileHash -LiteralPath $executed).Hash)
            {
                throw 'Executed owning test image differs from the actual product assembly.'
            }
        }
        $observed += [ordered]@{scope=$scope.name;actualPassed=$rows.Count;actualSkipped=0;actualFailures=0;actualSelection=$scope.selection}
    }
    Copy-Item -LiteralPath (Join-Path $root 'src\Mvc\Mvc.Abstractions\src\ModelBinding\ValueProviderResult.cs') `
        -Destination (Join-Path $execution 'ValueProviderResult.cs.executed-source')
    & git --no-pager diff -- src/Mvc/Mvc.Abstractions/src/ModelBinding/ValueProviderResult.cs |
        Set-Content (Join-Path $execution 'actual-source-diff.patch') -Encoding utf8NoBOM
    $ownerPath = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Mvc.Abstractions\Release\net12.0\Microsoft.AspNetCore.Mvc.Abstractions.dll'
    [ordered]@{
        candidate = 'F035'; variant = $Variant; actualPassed = 34; actualSkipped = 0; actualFailures = 0
        actualScopes = $observed; actualOwnerSha256 = (Get-FileHash -LiteralPath $ownerPath).Hash
        actualOwnerPdbSha256 = (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($ownerPath,'.pdb'))).Hash
        actualSourceSha256 = (Get-FileHash -LiteralPath (Join-Path $execution 'ValueProviderResult.cs.executed-source')).Hash
        actualAllFreshXmlOutcomesParsed = $true; actualBothCoreBooleanRowsPerMethodObserved = $true
        comparativeTiming = $false; aFunctionalRedGreenVerification = $false
        boundary = '29existing ValueProviderResult constructor/enumeration/equality rows plus5actual collection-binding rows. These preserve semantics,not performance or public-return-type replacement compatibility. Separate complete cursor and actual request-query/binder characterization required.'
    } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
    Write-Output "F035 $Variant :29abstractions+5actual collection binder rows independently passed;0skipped."
}
finally
{
    Pop-Location
}
