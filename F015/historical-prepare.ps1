param(
    [Parameter(Mandatory)]
    [ValidateSet('BuildProduct', 'BuildHarness', 'Test', 'Format')]
    [string]$Stage,
    [ValidateSet('original', 'candidate')]
    [string]$Role = 'original',
    [int]$Attempt = 1
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F015'
$execution = Join-Path $run ('preparation-execution\{0}-{1}\attempt-{2:D3}' -f $Role, $Stage, $Attempt)
if (Test-Path -LiteralPath $execution)
{
    throw "Do not overwrite a preparation attempt: $execution"
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Set-Location $root
. .\activate.ps1
$sequence = 0

function Invoke-Dotnet([string]$Label, [string[]]$Arguments)
{
    $script:sequence++
    $stem = Join-Path $execution ('{0:D3}-{1}' -f $script:sequence, $Label)
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> ($stem + '.log')
    $actualExitCode = $LASTEXITCODE
    [pscustomobject]@{
        executable = (Get-Command dotnet).Source
        arguments = $Arguments
        workingDirectory = $root
        started = $started
        completed = [DateTimeOffset]::UtcNow.ToString('o')
        actualExitCode = $actualExitCode
        output = [IO.Path]::GetFileName($stem + '.log')
        outputSha256 = (Get-FileHash -LiteralPath ($stem + '.log') -Algorithm SHA256).Hash
    } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath ($stem + '.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath ($stem + '.log') -Tail 30
    if ($actualExitCode -ne 0)
    {
        throw "Actual $Label exit$actualExitCode; preserved command/output: $stem"
    }
}

$product = 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj'
$tests = 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Microsoft.AspNetCore.DataProtection.Tests.csproj'
switch ($Stage)
{
    'BuildProduct'
    {
        Invoke-Dotnet 'sdk-info' @('--info')
        Invoke-Dotnet 'build-all-product-targets' @('build', $product, '-c', 'Release', '--no-restore', '-m:2', '-v:minimal',
            ('-bl:' + (Join-Path $execution 'product.binlog')))
        foreach ($target in @('net462', 'netstandard2.0', 'net12.0'))
        {
            Invoke-Dotnet ('actual-product-metadata-' + $target) @('msbuild', $product, '-nologo', '-m:2', '-v:q',
                ('-p:TargetFramework=' + $target), '-p:Configuration=Release',
                '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants')
        }
    }
    'BuildHarness'
    {
        $harness = Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'
        Invoke-Dotnet 'build-standalone-harness' @('build', $harness, '-c', 'Release', '-m:2', '-v:minimal',
            ('-bl:' + (Join-Path $execution 'harness.binlog')))
    }
    'Test'
    {
        foreach ($target in @('net12.0', 'net472'))
        {
            $results = Join-Path $execution ('results-' + $target)
            Invoke-Dotnet ('owning-tests-' + $target) @('test', $tests, '-c', 'Release', '-f', $target, '--no-restore',
                '-m:2', '-v:minimal', '--filter',
                'FullyQualifiedName~ManagedAuthenticatedEncryptorTests|FullyQualifiedName~ManagedAuthenticatedEncryptorFactoryTest',
                '--logger', ('trx;LogFileName=focused-' + $target + '.trx'), '--results-directory', $results,
                ('-bl:' + (Join-Path $execution ('tests-' + $target + '.binlog'))))
            Invoke-Dotnet ('actual-test-metadata-' + $target) @('msbuild', $tests, '-nologo', '-m:2', '-v:q',
                ('-p:TargetFramework=' + $target), '-p:Configuration=Release',
                '-getProperty:TargetFramework,TargetFrameworkIdentifier,TargetPath,DefineConstants')
        }
    }
    'Format'
    {
        Invoke-Dotnet 'verify-changed-whitespace' @('format', 'whitespace', 'src\DataProtection\DataProtection', '--folder',
            '--include', (Join-Path $root 'src\DataProtection\DataProtection\src\Managed\ManagedAuthenticatedEncryptor.cs'),
            (Join-Path $root 'src\DataProtection\DataProtection\test\Microsoft.AspNetCore.DataProtection.Tests\Managed\ManagedAuthenticatedEncryptorTests.cs'),
            '--verify-no-changes', '--verbosity', 'diagnostic')
    }
}
[pscustomobject]@{ candidate = 'F015'; role = $Role; stage = $Stage; actualSuccessfulCommands = $sequence; completed = [DateTimeOffset]::UtcNow.ToString('o') } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $execution 'completed.json') -Encoding utf8NoBOM
