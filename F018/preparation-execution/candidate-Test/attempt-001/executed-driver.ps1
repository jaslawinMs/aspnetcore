param(
    [Parameter(Mandatory)]
    [ValidateSet('BuildProduct','BuildHarness','Test','Format','Pack')]
    [string] $Stage,
    [ValidateSet('original','candidate')]
    [string] $Role = 'original',
    [int] $Attempt = 1
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F018'
$execution = Join-Path $run ('preparation-execution\{0}-{1}\attempt-{2:D3}' -f $Role, $Stage, $Attempt)
$acceptance = Get-Content (Join-Path $run 'acceptance.json') -Raw | ConvertFrom-Json
$owner = 'src\Security\Authentication\Google\src\GoogleHandler.cs'
$testSource = 'src\Security\Authentication\test\GoogleTests.cs'
if ((Test-Path $execution) -or (git -C $root rev-parse HEAD).Trim() -cne $acceptance.baseline -or
    (git -C $root branch --show-current).Trim() -cne $acceptance.branch)
{
    throw 'Fresh actual preparation attempt and independent accepted source branch required.'
}
if ($Role -eq 'original')
{
    git -C $root --no-pager diff --exit-code -- $owner
    if ($LASTEXITCODE)
    {
        throw 'Original preparation must precede the owner edit.'
    }
}
else
{
    $currentOwner = Get-Content (Join-Path $root $owner) -Raw
    if (-not $currentOwner.Contains('Utf8.IsValid(utf8Content.Span)') -or -not $currentOwner.Contains('ReadAsByteArrayAsync(Context.RequestAborted)'))
    {
        throw 'Only the accepted actual candidate may be prepared as candidate.'
    }
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item $PSCommandPath (Join-Path $execution 'executed-driver.ps1')
Set-Location $root
. .\activate.ps1
git --no-pager diff --binary | Set-Content (Join-Path $execution 'actual-tracked-source.patch') -Encoding utf8NoBOM
git status --porcelain | Set-Content (Join-Path $execution 'actual-source-status.txt') -Encoding utf8NoBOM
$sequence = 0
function InvokeRecorded([string] $Label, [string[]] $Arguments)
{
    $script:sequence++
    $stem = Join-Path $execution ('{0:D3}-{1}' -f $script:sequence, $Label)
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> ($stem + '.log')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $Arguments; workingDirectory = $root
        activationScript = (Join-Path $root 'activate.ps1'); activationScriptSha256 = (Get-FileHash (Join-Path $root 'activate.ps1')).Hash
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
        output = [IO.Path]::GetFileName($stem + '.log'); outputSha256 = (Get-FileHash ($stem + '.log')).Hash
    } | ConvertTo-Json -Depth 8 | Set-Content ($stem + '.json') -Encoding utf8NoBOM
    Get-Content ($stem + '.log') -Tail 30
    if ($code)
    {
        throw "Actual $Label exit$code;retain the actual driver,command and output."
    }
}
$product = 'src\Security\Authentication\Google\src\Microsoft.AspNetCore.Authentication.Google.csproj'
$tests = 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj'
switch ($Stage)
{
    'BuildProduct'
    {
        InvokeRecorded 'sdk-info' @('--info')
        InvokeRecorded 'actual-product-targets-and-gate' @('msbuild',$product,'-nologo','-m:2','-v:q','-p:Configuration=Release',
            '-getProperty:TargetFramework,TargetFrameworks,EnablePackageValidation,PackageValidationBaselineVersion,TargetPath,IsPackable')
        InvokeRecorded 'actual-owning-test-targets' @('msbuild',$tests,'-nologo','-m:2','-v:q','-p:Configuration=Release',
            '-getProperty:TargetFramework,TargetFrameworks,IsTestProject,TargetPath')
        InvokeRecorded 'build-all-product-targets' @('build',$product,'-c','Release','--no-restore','-m:2','-v:minimal',
            ('-bl:' + (Join-Path $execution 'product.binlog')))
    }
    'Test'
    {
        $results = Join-Path $execution 'results-net12.0'
        InvokeRecorded 'owning-GoogleTests-net12.0' @('test',$tests,'-c','Release','-f','net12.0','--no-restore','-m:2','-v:minimal',
            '-p:UseIisNativeAssets=false','-p:BuildNodeJS=false','-p:CrossgenOutput=false','-p:GenerateInstallers=false',
            '--filter','FullyQualifiedName~Microsoft.AspNetCore.Authentication.Google.GoogleTests',
            '--logger','trx;LogFileName=focused-net12.0.trx','--results-directory',$results,
            ('-bl:' + (Join-Path $execution 'tests-net12.0.binlog')))
        $file = Join-Path $results 'focused-net12.0.trx'
        [xml] $trx = Get-Content $file -Raw
        $rows = @($trx.TestRun.Results.UnitTestResult)
        $counters = $trx.TestRun.ResultSummary.Counters
        $preservation = @($rows | Where-Object { $_.testName.Contains($acceptance.requiredShippingPreservationTest.name) })
        if ($rows.Count -le 18 -or [int]$counters.total -ne $rows.Count -or [int]$counters.executed -ne $rows.Count -or
            [int]$counters.passed -ne $rows.Count -or @($rows | Where-Object outcome -CNE 'Passed').Count -or $preservation.Count -ne 18)
        {
            throw 'Actual nonempty complete Google TRX discovery/outcome/per-row accounting differs.'
        }
        foreach ($label in $acceptance.requiredShippingPreservationTest.rows)
        {
            $matching = @($preservation | Where-Object { $_.testName -cmatch ('scenario: "' + [regex]::Escape($label) + '"') })
            if ($matching.Count -ne 1 -or $matching[0].outcome -cne 'Passed')
            {
                throw "Each report-safe preservation case must actually pass exactly once:$label"
            }
        }
        [ordered]@{
            role = $Role; actualTrxSha256 = (Get-FileHash $file).Hash; total = $rows.Count; passed = $rows.Count; failed = 0; skipped = 0
            preservationMethod = $acceptance.requiredShippingPreservationTest.name; preservationRows = $preservation.Count
            preservationOutcomes = @($preservation | ForEach-Object { [ordered]@{ testName = $_.testName; outcome = $_.outcome; testId = $_.testId } })
            allRows = @($rows | ForEach-Object { [ordered]@{ testName = $_.testName; outcome = $_.outcome; testId = $_.testId } })
        } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'parsed-trx.json') -Encoding utf8NoBOM
        InvokeRecorded 'actual-test-metadata' @('msbuild',$tests,'-nologo','-m:2','-v:q','-p:Configuration=Release',
            '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants')
    }
    'BuildHarness'
    {
        $sourceDirectory = Join-Path $execution 'harness-source'
        New-Item -ItemType Directory -Path $sourceDirectory | Out-Null
        $inputs = foreach ($name in 'AutoPerf.Benchmarks.csproj','Program.cs','GoogleFixture.cs','GoogleBenchmarks.cs','SettingsPreservingEmitToolchain.cs')
        {
            $inputFile = Join-Path $run ('harness\' + $name)
            Copy-Item $inputFile (Join-Path $sourceDirectory $name)
            [ordered]@{ path = $name; sha256 = (Get-FileHash $inputFile).Hash; capturedBeforeBuild = $true }
        }
        $inputs | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $sourceDirectory 'manifest.json') -Encoding utf8NoBOM
        InvokeRecorded 'build-standalone-harness' @('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),
            '-c','Release','-m:2','-v:minimal',('-bl:' + (Join-Path $execution 'harness.binlog')))
    }
    'Format'
    {
        InvokeRecorded 'verify-changed-whitespace' @('format','whitespace','src\Security\Authentication','--folder',
            '--include',(Join-Path $root $owner),(Join-Path $root $testSource),'--verify-no-changes','--verbosity','diagnostic')
    }
    'Pack'
    {
        InvokeRecorded 'evaluate-package-gate' @('msbuild',$product,'-nologo','-m:2','-v:q','-p:Configuration=Release',
            '-getProperty:EnablePackageValidation,EnablePackageBaselineValidation,PackageValidationBaselineVersion,IsPackable,PackageVersion,PackageId,TargetPath')
        InvokeRecorded 'existing-enabled-package-validation' @('pack',$product,'-c','Release','--no-build','--no-restore',
            '-m:2','-v:normal',("-bl:$(Join-Path $execution 'Pack.binlog');ProjectImports=None"))
    }
}
[ordered]@{
    candidate = 'F018'; role = $Role; stage = $Stage; actualSuccessfulCommands = $sequence; completed = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json | Set-Content (Join-Path $execution 'completed.json') -Encoding utf8NoBOM
