$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F031'
$execution = Join-Path $run 'restored-owner-build'
$relocated = Join-Path $run 'relocated-harness'
if ((Test-Path -LiteralPath $execution) -or (Test-Path -LiteralPath $relocated))
{
    throw 'Do not overwrite a restored-owner or relocated reproduction attempt.'
}
$budget = Get-Content -Raw (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
if (!$budget.sourceComparisonBudgetClosed -or $budget.actualSourceComparisonsCompleted -ne 3)
{
    throw 'Require the permanently closed timing budget before untimed reproduction.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Push-Location $root
try
{
    if ((& git branch --show-current).Trim() -cne 'autoperf/F031-template-completed-task' -or
        (& git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
        (& git status --porcelain --untracked-files=no))
    {
        throw 'Restore only the proposed guard before reproducing the unchanged source.'
    }
    . .\activate.ps1
    $arguments = @('build', 'src\Mvc\Mvc.ViewFeatures\src\Microsoft.AspNetCore.Mvc.ViewFeatures.csproj',
        '--no-restore', '-c', 'Release', '-m:2', '-nr:false', '-p:UseSharedCompilation=false',
        '-p:UseIisNativeAssets=false', '-p:BuildInParallel=false', '-v', 'minimal')
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'build.stdout') 2> (Join-Path $execution 'build.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
        actualSdk = (& dotnet --version).Trim(); sourceHead = (& git rev-parse HEAD).Trim()
        started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
        actualTimingPerformed = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    Get-Content (Join-Path $execution 'build.stdout') -Tail 12
    Get-Content (Join-Path $execution 'build.stderr') -Tail 8
    if ($code -ne 0)
    {
        throw 'Restored-owner build failed; retain the actual attempt.'
    }
    $original = Get-Content -Raw (Join-Path $run 'validation\original-existing\verified-result.json') | ConvertFrom-Json
    foreach ($owner in $original.actualOwners)
    {
        if ((Get-FileHash -LiteralPath $owner.actualProductPath).Hash -cne $owner.actualOwnerSha256 -or
            (Get-FileHash -LiteralPath ([IO.Path]::ChangeExtension($owner.actualProductPath, '.pdb'))).Hash -cne $owner.actualOwnerPdbSha256)
        {
            throw 'The restored product is not byte-identical to the actually tested original owner.'
        }
    }
    [ordered]@{
        actualRestoredProductDllAndPdbMatchOriginallyTestedOwners = $true
        actualOriginalOwners = $original.actualOwners
        actualSourceTrackedUnchanged = $true; actualTimingBudgetRemainsClosed = $true
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'verified-restoration.json') -Encoding utf8NoBOM
    New-Item -ItemType Directory -Path $relocated | Out-Null
    $copies = @(foreach ($file in Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File -Force)
    {
        $target = Join-Path $relocated $file.Name
        Copy-Item -LiteralPath $file.FullName -Destination $target
        $hash = (Get-FileHash -LiteralPath $file.FullName).Hash
        if ((Get-FileHash -LiteralPath $target).Hash -cne $hash)
        {
            throw 'A relocated harness source differs.'
        }
        [ordered]@{ original = $file.FullName; copy = $target; sha256 = $hash }
    })
    if ($copies.Count -ne 6)
    {
        throw 'Relocate exactly the measured project and five CSharp files.'
    }
    [ordered]@{ actualFiles = $copies.Count; actualSourcesByteExact = $true; mappings = $copies } |
        ConvertTo-Json -Depth 8 | Set-Content (Join-Path $run 'relocated-harness-copy.json') -Encoding utf8NoBOM
    & (Join-Path $PSScriptRoot 'F031-prepare.ps1') -Label reproduction-preparation -HarnessDirectory $relocated
    & (Join-Path $PSScriptRoot 'F031-run-profile.ps1') -Mode characterize -Label reproduction-characterized -Preparation reproduction-preparation
}
finally
{
    Pop-Location
}
