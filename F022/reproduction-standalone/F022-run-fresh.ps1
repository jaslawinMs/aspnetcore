param(
    [Parameter(Mandatory)]
    [string]$AspNetCoreRoot,
    [Parameter(Mandatory)]
    [string]$OutputRoot,
    [ValidateSet('Prepare', 'Characterize', 'Measure')]
    [string]$Mode = 'Prepare'
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$AspNetCoreRoot = [IO.Path]::GetFullPath($AspNetCoreRoot)
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
$project = Join-Path $PSScriptRoot 'harness\AutoPerf.Benchmarks.csproj'
if (!$IsWindows -or (Test-Path -LiteralPath $OutputRoot) -or !(Test-Path -LiteralPath $project) -or
    $PSScriptRoot.StartsWith($AspNetCoreRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $OutputRoot.StartsWith($AspNetCoreRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase))
{
    throw 'Require Windows PowerShell7,a standalone harness,and a new output directory outside the source checkout.'
}
Push-Location $AspNetCoreRoot
try
{
    $head = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0)
    {
        throw 'An actual source checkout revision is required.'
    }
    New-Item -ItemType Directory -Path $OutputRoot | Out-Null
    Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $OutputRoot 'executed-driver.ps1')
    & git --no-pager diff --binary "--output=$(Join-Path $OutputRoot 'source-tracked.patch')" HEAD
    if ($LASTEXITCODE -ne 0)
    {
        throw 'The actual tracked source delta could not be preserved.'
    }
    . .\activate.ps1
    $commands = [Collections.Generic.List[object]]::new()
    function Invoke-Recorded([string]$Name, [string[]]$Arguments)
    {
        $started = [DateTimeOffset]::UtcNow.ToString('o')
        & dotnet @Arguments 1> (Join-Path $OutputRoot "$Name.stdout") 2> (Join-Path $OutputRoot "$Name.stderr")
        $code = $LASTEXITCODE
        $commands.Add([ordered]@{
            executable = (Get-Command dotnet).Source
            arguments = $Arguments
            workingDirectory = $AspNetCoreRoot
            started = $started
            completed = [DateTimeOffset]::UtcNow.ToString('o')
            actualExitCode = $code
        })
        $commands | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $OutputRoot 'commands.json') -Encoding utf8NoBOM
        if ($code -ne 0)
        {
            Get-Content -LiteralPath (Join-Path $OutputRoot "$Name.stdout") -Tail 30
            Get-Content -LiteralPath (Join-Path $OutputRoot "$Name.stderr") -Tail 12
            throw "Actual fresh $Name failed;retain this output and use a new directory for another attempt."
        }
    }
    $sdk = (& dotnet --version).Trim()
    if ($LASTEXITCODE -ne 0 -or $sdk -ne '12.0.100-alpha.1.26557.102')
    {
        throw 'Use the captured repository SDK;do not substitute an installed release SDK.'
    }
    Invoke-Recorded 'build' @('build', $project, '-c', 'Release', '-f', 'net12.0', '-m:2',
        '-nr:false', '-v:minimal', "-p:AspNetCoreRoot=$AspNetCoreRoot")
    $image = Join-Path $OutputRoot 'image'
    $sources = Join-Path $OutputRoot 'sources'
    New-Item -ItemType Directory -Path $image,(Join-Path $sources 'owner'),(Join-Path $sources 'harness') | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'harness\bin\Release\net12.0') -Force |
        Copy-Item -Destination $image -Recurse
    foreach ($name in @('ExpressionHelper.cs','ModelExpressionProvider.cs','ExpressionMetadataProvider.cs',
        'CachedExpressionCompiler.cs','LambdaExpressionComparer.cs','ModelExplorer.cs'))
    {
        Copy-Item -LiteralPath (Join-Path $AspNetCoreRoot "src\Mvc\Mvc.ViewFeatures\src\$name") -Destination (Join-Path $sources 'owner')
    }
    Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'harness') -File |
        Where-Object Extension -in '.cs','.csproj' | Copy-Item -Destination (Join-Path $sources 'harness')
    $bindings = @(Get-ChildItem -LiteralPath $image -Recurse -File | Sort-Object FullName | ForEach-Object {
        [ordered]@{
            path = [IO.Path]::GetRelativePath($image, $_.FullName)
            sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash
            bytes = $_.Length
        }
    })
    $closure = Join-Path $OutputRoot 'closure.json'
    [ordered]@{ files = $bindings } | ConvertTo-Json -Depth 8 | Set-Content $closure -Encoding utf8NoBOM
    $ownerHash = (Get-FileHash -LiteralPath (Join-Path $image 'Microsoft.AspNetCore.Mvc.ViewFeatures.dll')).Hash
    [ordered]@{
        candidate = 'F022'
        mode = $Mode
        actualSourceHead = $head
        actualSourceCheckout = $AspNetCoreRoot
        actualSourcePatchSha256 = (Get-FileHash -LiteralPath (Join-Path $OutputRoot 'source-tracked.patch')).Hash
        actualSdk = $sdk
        actualOwnerSha256 = $ownerHash
        actualClosureFiles = $bindings.Count
        actualClosureSha256 = (Get-FileHash -LiteralPath $closure).Hash
        metadataUpdatesMustBeDisabled = $true
        freshIndependentWorkNotHistoricalMeasurement = $true
        historicalThreeComparisonBudgetReopened = $false
        comparativeTimingRequested = $Mode -eq 'Measure'
        independentIntentRecordedBeforeNativeExecution = $true
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $OutputRoot 'prepared.json') -Encoding utf8NoBOM
    if ($Mode -eq 'Prepare')
    {
        Write-Output 'Fresh standalone MVC consumer built and frozen;no native execution or additional timing.'
        return
    }
    $native = @((Join-Path $image 'AutoPerf.Benchmarks.dll'), '--sources', $sources, '--context', "fresh-$head",
        '--mode', $Mode.ToLowerInvariant(), '--closure', $closure, '--expected-owner', $ownerHash,
        '--artifacts', (Join-Path $OutputRoot 'artifacts'))
    if ($Mode -eq 'Measure')
    {
        $native += @('--filter','*')
    }
    Invoke-Recorded 'native' $native
    Write-Output "Fresh $Mode passed with the actual source/PDB-bound MVC owner;historical measurements were not overwritten or repeated."
}
finally
{
    Pop-Location
}
