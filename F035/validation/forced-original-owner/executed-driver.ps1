param(
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Variant
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F035'
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
if (!$budget.sourceComparisonBudgetClosed -or $budget.actualSourceComparisonsConcluded -ne 3 -or
    (Test-Path -LiteralPath (Join-Path $run 'actual-profile.lock')))
{
    throw 'Only rebuild after the closed three-comparison timing budget;never overlap heavy work.'
}
$prepared = Join-Path $run "$($budget.authoritativePreparations.$Variant)\prepared"
$capsule = Get-Content -Raw (Join-Path $prepared 'capsule.json') | ConvertFrom-Json
$target = Join-Path $root 'src\Mvc\Mvc.Abstractions\src\ModelBinding\ValueProviderResult.cs'
$source = @($capsule.sourceFiles | Where-Object path -CEQ 'sources\owner\ValueProviderResult.cs')
$execution = Join-Path $run "validation\forced-$Variant-owner"
if ((Test-Path -LiteralPath $execution) -or $source.Count -ne 1 -or
    (Get-FileHash -LiteralPath $target).Hash -cne $source[0].sha256)
{
    throw 'Require the exact intended source and a fresh forced-build receipt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F035-value-provider-enumeration' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5')
    {
        throw 'Require independent F035 source branch.'
    }
    . .\activate.ps1
    $argsFormat = @('format', 'whitespace', 'src\Mvc\Mvc.Abstractions\src', '--folder',
        '--include', $target, '--verify-no-changes', '--verbosity', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @argsFormat 1> (Join-Path $execution 'format.stdout') 2> (Join-Path $execution 'format.stderr')
    $formatCode = $LASTEXITCODE
    [ordered]@{
        executable=(Get-Command dotnet).Source;arguments=$argsFormat;workingDirectory=$root
        started=$started;completed=[DateTimeOffset]::UtcNow.ToString('o');actualExitCode=$formatCode
        actualVerifyOnly=$true;comparativeTiming=$false
    } | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $execution 'format-invocation.json') -Encoding utf8NoBOM
    if ($formatCode -ne 0)
    {
        throw 'Exact changed-seam whitespace verification failed.'
    }
    $arguments = @('build', 'src\Mvc\Mvc.Abstractions\src\Microsoft.AspNetCore.Mvc.Abstractions.csproj',
        '--no-restore', '--no-incremental', '-c', 'Release', '-f', 'net12.0', '-m:2', '-nr:false',
        '-p:BuildProjectReferences=false', '-p:UseSharedCompilation=false', '-p:UseIisNativeAssets=false',
        '-p:BuildInParallel=false', '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'build.stdout') 2> (Join-Path $execution 'build.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable=(Get-Command dotnet).Source;arguments=$arguments;workingDirectory=$root
        actualSourceHead=(& git rev-parse HEAD).Trim();actualSourceSha256=(Get-FileHash -LiteralPath $target).Hash
        actualVariant=$Variant;started=$started;completed=[DateTimeOffset]::UtcNow.ToString('o')
        actualExitCode=$code;comparativeTiming=$false
    } | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'build-invocation.json') -Encoding utf8NoBOM
    Get-Content (Join-Path $execution 'build.stdout') -Tail 16
    Get-Content (Join-Path $execution 'build.stderr') -Tail 8
    $log = Get-Content -Raw (Join-Path $execution 'build.stdout')
    if ($code -ne 0 -or $log -notmatch '\b0 Warning\(s\)' -or $log -notmatch '\b0 Error\(s\)')
    {
        throw 'Require a successful zero-warning/error forced owner-only rebuild.'
    }
    $bindings = @(foreach ($owner in $capsule.actualTestedOwners)
    {
        $pdb = [IO.Path]::ChangeExtension($owner.actualProductPath, '.pdb')
        if ((Get-FileHash -LiteralPath $owner.actualProductPath).Hash -cne $owner.actualOwnerSha256 -or
            (Get-FileHash -LiteralPath $pdb).Hash -cne $owner.actualOwnerPdbSha256)
        {
            throw 'Forced owner-only rebuild must byte-match the earlier tested owner pair;Core must remain unchanged.'
        }
        [ordered]@{
            assembly=$owner.assembly;actualDllPath=$owner.actualProductPath;actualPdbPath=$pdb
            actualDllSha256=$owner.actualOwnerSha256;actualPdbSha256=$owner.actualOwnerPdbSha256
            actualMatchesEarlierTestedFrozenOwner=$true
        }
    })
    $copies = @()
    if ($Variant -eq 'original')
    {
        $owner = $capsule.actualTestedOwners | Where-Object assembly -CEQ 'Microsoft.AspNetCore.Mvc.Abstractions'
        $copies = @(foreach ($test in 'Microsoft.AspNetCore.Mvc.Abstractions.Test','Microsoft.AspNetCore.Mvc.Core.Test')
        {
            foreach ($extension in '.dll','.pdb')
            {
                $from = [IO.Path]::ChangeExtension($owner.actualProductPath, $extension)
                $to = Join-Path $root "artifacts\bin\$test\Release\net12.0\Microsoft.AspNetCore.Mvc.Abstractions$extension"
                $before = (Get-FileHash -LiteralPath $to).Hash
                Copy-Item -LiteralPath $from -Destination $to
                $after = (Get-FileHash -LiteralPath $to).Hash
                if ($after -cne (Get-FileHash -LiteralPath $from).Hash)
                {
                    throw 'Exact already-tested original owner copy failed.'
                }
                [ordered]@{destination=$to;actualBeforeSha256=$before;actualAfterSha256=$after;actualNewTestExecution=$false}
            }
        })
    }
    [ordered]@{
        candidate='F035';actualVariant=$Variant;actualForcedOwnerOnlyRebuildPassed=$true
        actualExactEarlierSourceDllPdbMatched=$true;actualChangedSeamWhitespaceVerified=$true
        actualCoreUnchanged=$true;actualBindings=$bindings;actualTestBinCopies=$copies
        actualNewOwningTestRun=$false;actualRetiming=$false
    } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $execution 'verified-result.json') -Encoding utf8NoBOM
}
finally
{
    Pop-Location
}
