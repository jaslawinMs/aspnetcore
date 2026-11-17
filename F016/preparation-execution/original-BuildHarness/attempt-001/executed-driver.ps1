param(
    [Parameter(Mandatory)]
    [ValidateSet('BuildProduct', 'BuildHarness', 'Test', 'Format', 'Pack')]
    [string] $Stage,
    [ValidateSet('original', 'candidate')]
    [string] $Role = 'original',
    [int] $Attempt = 1
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F016'
$execution = Join-Path $run ('preparation-execution\{0}-{1}\attempt-{2:D3}' -f $Role, $Stage, $Attempt)
if (Test-Path -LiteralPath $execution)
{
    throw "Do not overwrite an actual preparation attempt:$execution"
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Set-Location $root
. .\activate.ps1
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
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
        output = [IO.Path]::GetFileName($stem + '.log'); outputSha256 = (Get-FileHash ($stem + '.log')).Hash
    } | ConvertTo-Json -Depth 8 | Set-Content ($stem + '.json') -Encoding utf8NoBOM
    Get-Content ($stem + '.log') -Tail 30
    if ($code)
    {
        throw "Actual $Label exit$code;retain the actual command,driver and output."
    }
}
$product = 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj'
$tests = 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj'
switch ($Stage)
{
    'BuildProduct'
    {
        InvokeRecorded 'sdk-info' @('--info')
        InvokeRecorded 'actual-product-targets' @('msbuild', $product, '-nologo', '-m:2', '-v:q', '-p:Configuration=Release',
            '-getProperty:TargetFrameworks,EnablePackageValidation,PackageValidationBaselineVersion')
        InvokeRecorded 'actual-owning-test-targets' @('msbuild', $tests, '-nologo', '-m:2', '-v:q', '-p:Configuration=Release',
            '-getProperty:TargetFrameworks,IsTestProject')
        InvokeRecorded 'build-all-product-targets' @('build', $product, '-c', 'Release', '--no-restore', '-m:2', '-v:minimal',
            ('-bl:' + (Join-Path $execution 'product.binlog')))
        foreach ($target in 'net462','netstandard2.0','net12.0')
        {
            InvokeRecorded ('actual-product-metadata-' + $target) @('msbuild', $product, '-nologo', '-m:2', '-v:q',
                ('-p:TargetFramework=' + $target), '-p:Configuration=Release',
                '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants')
        }
    }
    'BuildHarness'
    {
        InvokeRecorded 'build-standalone-harness' @('build', (Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),
            '-c', 'Release', '-m:2', '-v:minimal', ('-bl:' + (Join-Path $execution 'harness.binlog')))
    }
    'Test'
    {
        foreach ($target in 'net12.0','net472')
        {
            InvokeRecorded ('owning-tests-' + $target) @('test', $tests, '-c', 'Release', '-f', $target, '--no-restore',
                '-m:2', '-v:minimal', '--filter',
                'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest',
                '--logger', ('trx;LogFileName=focused-' + $target + '.trx'),
                '--results-directory', (Join-Path $execution ('results-' + $target)),
                ('-bl:' + (Join-Path $execution ('tests-' + $target + '.binlog'))))
            InvokeRecorded ('actual-test-metadata-' + $target) @('msbuild', $tests, '-nologo', '-m:2', '-v:q',
                ('-p:TargetFramework=' + $target), '-p:Configuration=Release',
                '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants')
        }
    }
    'Format'
    {
        InvokeRecorded 'verify-changed-whitespace' @('format', 'whitespace', 'src\DataProtection\DataProtection', '--folder',
            '--include', (Join-Path $root 'src\DataProtection\DataProtection\src\Managed\ManagedAuthenticatedEncryptor.cs'),
            (Join-Path $root 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Managed\ManagedAuthenticatedEncryptorTests.cs'),
            '--verify-no-changes', '--verbosity', 'diagnostic')
    }
    'Pack'
    {
        InvokeRecorded 'evaluate-package-gate' @('msbuild', $product, '-nologo', '-m:2', '-v:q', '-p:Configuration=Release',
            '-getProperty:EnablePackageValidation,EnablePackageBaselineValidation,PackageValidationBaselineVersion,IsPackable,PackageVersion,PackageId')
        InvokeRecorded 'existing-enabled-package-validation' @('pack', $product, '-c', 'Release', '--no-build', '--no-restore',
            '-m:2', '-v:normal', ("-bl:$(Join-Path $execution 'Pack.binlog');ProjectImports=None"))
    }
}
[ordered]@{
    candidate = 'F016'; role = $Role; stage = $Stage; actualSuccessfulCommands = $sequence; completed = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json | Set-Content (Join-Path $execution 'completed.json') -Encoding utf8NoBOM
