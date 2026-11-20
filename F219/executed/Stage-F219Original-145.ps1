$ErrorActionPreference = 'Stop'
$session = $PSScriptRoot
$run = Join-Path $session 'autoperf-runs\F219'
$root = Join-Path $run 'causal-original-145'
$common = Join-Path $run 'preparation-original-142\image'
$native = 'C:\src\autoperf-finding-F145-original\artifacts\bin\Microsoft.AspNetCore.OpenApi.Tests\Release\net12.0'
$candidate = 'C:\src\ap-F219-c143\artifacts\bin\Microsoft.AspNetCore.OpenApi\Release\net12.0'
$launcher = Join-Path $session 'autoperf-runs\F142-common\Invoke-MeasurementChild.ps1'
$prior = Get-Content -LiteralPath (Join-Path $run 'preparation-original-142\inspection-launch.json') -Raw | ConvertFrom-Json
$expected = [xml](Get-Content -LiteralPath (Join-Path $session 'autoperf-parallelism\finding-F219-090\coordinator-project-135\baseline-native\selected.trx') -Raw)
$expectedNames = @($expected.TestRun.Results.UnitTestResult | ForEach-Object { $_.testName } | Sort-Object)
if ($expectedNames.Count -ne 15 -or @($expected.TestRun.Results.UnitTestResult | Where-Object outcome -ne 'Passed').Count -ne 0)
{
    throw 'The preserved exact fifteen-row native selection is not green.'
}
if ((Get-FileHash -LiteralPath $launcher).Hash -cne '611CF0C7A98CAA3BF79BBBED27A0D96F6427EC2AD3E7BD37972ADDC37C139B74')
{
    throw 'The reviewed direct-child launcher changed.'
}
if (Test-Path -LiteralPath $root)
{
    throw 'Preserve an existing causal preparation attempt.'
}
$null = New-Item -ItemType Directory -Path $root

function Write-NewJson([string] $File, [object] $Value)
{
    $stream = [IO.File]::Open($File, [IO.FileMode]::CreateNew)
    try
    {
        $bytes = [Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 20) + "`n")
        $stream.Write($bytes)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Get-ImagePin([string] $File)
{
    $stream = [IO.File]::OpenRead($File)
    $pe = [Reflection.PortableExecutable.PEReader]::new($stream)
    try
    {
        $reader = [Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($pe)
        $module = $reader.GetModuleDefinition()
        return [ordered]@{ Path = $File; Sha256 = (Get-FileHash -LiteralPath $File).Hash; Mvid = $reader.GetGuid($module.Mvid).ToString() }
    }
    finally
    {
        $pe.Dispose()
        $stream.Dispose()
    }
}

function Invoke-Recorded([string] $Directory, [string[]] $Arguments)
{
    $null = New-Item -ItemType Directory -Path $Directory
    $request = [ordered]@{
        activationSourceRoot = 'C:\src\autoperf-finding-F145-original'
        stdoutPath = Join-Path $Directory 'stdout.txt'
        stderrPath = Join-Path $Directory 'stderr.txt'
        lifecyclePath = Join-Path $Directory 'lifecycle.json'
        arguments = $Arguments
    }
    $file = Join-Path $Directory 'invocation.json'
    Write-NewJson $file $request
    & $launcher -InvocationPath $file
    $code = $LASTEXITCODE
    Write-Output ("F219_PREPARATION=$Directory EXIT=$code")
    Get-Content -LiteralPath $request.stdoutPath -Tail 22
    Get-Content -LiteralPath $request.stderrPath -Tail 12
    if ($code -ne 0)
    {
        throw "The recorded untimed child failed with exit $code; preserve $Directory."
    }
}

$roles = [ordered]@{}
foreach ($role in @('Baseline', 'Candidate'))
{
    $roleRoot = Join-Path $root $role
    $image = Join-Path $roleRoot 'image'
    $benchmark = Join-Path $image 'Benchmark'
    $tests = Join-Path $image 'Native'
    $null = New-Item -ItemType Directory -Path $benchmark, $tests
    Get-ChildItem -LiteralPath $common -Force | Copy-Item -Destination $benchmark -Recurse
    Get-ChildItem -LiteralPath $native -Force | Copy-Item -Destination $tests -Recurse
    if ($role -eq 'Candidate')
    {
        foreach ($part in @($benchmark, $tests))
        {
            foreach ($name in @('Microsoft.AspNetCore.OpenApi.dll', 'Microsoft.AspNetCore.OpenApi.pdb'))
            {
                Copy-Item -LiteralPath (Join-Path $candidate $name) -Destination (Join-Path $part $name) -Force
            }
        }
    }
    $records = Join-Path $roleRoot 'records'
    $null = New-Item -ItemType Directory -Path $records
    $spec = [ordered]@{
        Role = 'Original' + $role; Runtime = $prior.Runtime; Output = Join-Path $records 'inspection'
        Owner = Get-ImagePin (Join-Path $benchmark 'Microsoft.AspNetCore.OpenApi.dll')
        Fixture = Get-ImagePin (Join-Path $benchmark 'Microsoft.AspNetCore.OpenApi.Microbenchmarks.dll')
        CoreLib = $prior.CoreLib
    }
    $specFile = Join-Path $records 'inspection-launch.json'
    Write-NewJson $specFile $spec
    $env:DOTNET_gcServer = '1'
    $env:DOTNET_ROLL_FORWARD = 'Disable'
    Invoke-Recorded (Join-Path $records 'inspect-child') @(
        'exec', '--fx-version', $prior.Runtime, '--roll-forward', 'Disable',
        '--runtimeconfig', (Join-Path $benchmark 'Microsoft.AspNetCore.OpenApi.Microbenchmarks.runtimeconfig.json'),
        '--depsfile', (Join-Path $benchmark 'Microsoft.AspNetCore.OpenApi.Microbenchmarks.deps.json'),
        (Join-Path $benchmark 'AutoPerf.F219.ExistingBenchmark.dll'), 'inspect', $specFile
    )
    $nativeRecords = Join-Path $records 'native'
    $filter = 'FullyQualifiedName~OpenApiDocumentServiceTests.GetRequestBody_HandlesJsonBody|FullyQualifiedName~OpenApiDocumentServiceTests.GetOpenApiRequestBody_SetsNullRequestBodyWithNoParameters|FullyQualifiedName~OpenApiDocumentServiceTests.GetRequestBody_HandlesIFormFile'
    Invoke-Recorded $nativeRecords @(
        'vstest', (Join-Path $tests 'Microsoft.AspNetCore.OpenApi.Tests.dll'),
        "--TestAdapterPath:$tests", "--TestCaseFilter:$filter",
        '--logger:trx;LogFileName=selected.trx', '--logger:console;verbosity=detailed',
        "--ResultsDirectory:$nativeRecords", ('--Diag:' + (Join-Path $nativeRecords 'diagnostic.log'))
    )
    $trxPath = Join-Path $nativeRecords 'selected.trx'
    $actual = [xml](Get-Content -LiteralPath $trxPath -Raw)
    $actualNames = @($actual.TestRun.Results.UnitTestResult | ForEach-Object { $_.testName } | Sort-Object)
    if ($actualNames.Count -ne 15 -or @($actual.TestRun.Results.UnitTestResult | Where-Object outcome -ne 'Passed').Count -ne 0 -or
        ($actualNames -join "`n") -cne ($expectedNames -join "`n"))
    {
        throw "The exact fifteen native rows did not all pass for $role."
    }
    $inspection = Get-Content -LiteralPath (Join-Path $spec.Output 'inspection.json') -Raw | ConvertFrom-Json
    $completion = Get-Content -LiteralPath (Join-Path $spec.Output 'completion.json') -Raw | ConvertFrom-Json
    if ($inspection.NoMeasurementExecuted -ne $true -or $inspection.Helper.Count -ne 7 -or
        @($inspection.Helper | Where-Object Passed -ne $true).Count -ne 0 -or $completion.Passed -ne $true)
    {
        throw "Real helper/document inspection did not pass for $role."
    }
    $files = @(Get-ChildItem -LiteralPath $image -File -Recurse -Force | Sort-Object FullName | ForEach-Object {
        if (($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
        {
            throw 'Unexpected reparse file in owned causal image.'
        }
        [ordered]@{ File = [IO.Path]::GetRelativePath($image, $_.FullName); Bytes = $_.Length; Sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash }
    })
    $inventory = Join-Path $records 'image-inventory.json'
    Write-NewJson $inventory ([ordered]@{ Files = $files })
    $roles[$role] = [ordered]@{
        root = $image; consumer = $benchmark; nativeConsumer = $tests; launchSpec = $spec
        inventory = $inventory; inventorySha256 = (Get-FileHash -LiteralPath $inventory).Hash
        inspection = Join-Path $spec.Output 'inspection.json'; inspectionCompletion = Join-Path $spec.Output 'completion.json'
        nativeTrx = $trxPath; actualNativeRowNames = $actualNames; actualNativeRowsPassed = 15
    }
}
Write-NewJson (Join-Path $root 'prepared-roles.json') ([ordered]@{
    actualNoMeasurementExecuted = $true; actualRoleNativeRows = 15; actualRoleHelperRows = 7
    actualSourceRole = 'Original'; roles = $roles; recordedAtUtc = [DateTime]::UtcNow.ToString('o')
})
Write-Output "F219_CAUSAL_PREPARATION_GREEN=$root"
