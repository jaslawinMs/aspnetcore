param(
    [Parameter(Mandatory)]
    [ValidateSet('original','candidate')]
    [string] $Role
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F018'
$context = Join-Path $run ('contexts\' + $Role)
$execution = Join-Path $run ('characterization-execution\' + $Role + '\attempt-001')
$acceptance = Get-Content (Join-Path $run 'acceptance.json') -Raw | ConvertFrom-Json
if ((Test-Path $context) -or (Test-Path $execution) -or
    (git -C $root rev-parse HEAD).Trim() -cne $acceptance.baseline -or
    (git -C $root branch --show-current).Trim() -cne $acceptance.branch)
{
    throw 'Fresh actual role image/characterization and accepted independent checkout required.'
}
$testAttempt = @(Get-ChildItem (Join-Path $run "preparation-execution\$Role-Test") -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName 'completed.json') } | Sort-Object Name -Descending)
if ($testAttempt.Count -ne 1)
{
    throw 'Exactly one successful actual owning-test attempt required;failed attempts remain separately preserved.'
}
$parsed = Get-Content (Join-Path $testAttempt[0].FullName 'parsed-trx.json') -Raw | ConvertFrom-Json
if ($parsed.total -ne 68 -or $parsed.passed -ne 68 -or $parsed.failed -ne 0 -or $parsed.skipped -ne 0 -or $parsed.preservationRows -ne 18)
{
    throw 'All actual Google suite and preservation rows must have passed.'
}
New-Item -ItemType Directory -Path $context,$execution | Out-Null
Copy-Item $PSCommandPath (Join-Path $execution 'executed-driver.ps1')
$image = Join-Path $context 'image'
New-Item -ItemType Directory -Path $image | Out-Null
$original = Join-Path $run 'contexts\original'
$binarySource = if ($Role -eq 'original') { Join-Path $run 'harness\bin\Release\net12.0' } else { Join-Path $original 'image' }
Get-ChildItem -LiteralPath $binarySource -Force | Copy-Item -Destination $image -Recurse
$product = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Authentication.Google\Release\net12.0'
$tests = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Authentication.Test\Release\net12.0'
$ownerName = 'Microsoft.AspNetCore.Authentication.Google'
if ($Role -eq 'candidate')
{
    foreach ($extension in '.dll','.pdb')
    {
        Copy-Item (Join-Path $product ($ownerName + $extension)) (Join-Path $image ($ownerName + $extension)) -Force
    }
}
foreach ($extension in '.dll','.pdb')
{
    $name = $ownerName + $extension
    if ((Get-FileHash (Join-Path $image $name)).Hash -cne (Get-FileHash (Join-Path $product $name)).Hash -or
        (Get-FileHash (Join-Path $image $name)).Hash -cne (Get-FileHash (Join-Path $tests $name)).Hash)
    {
        throw 'Actual harness/product/tested Google owner or PDB differs.'
    }
}
$sourceMap = [ordered]@{
    'owner\GoogleHandler.cs' = 'src\Security\Authentication\Google\src\GoogleHandler.cs'
    'owner\GoogleOptions.cs' = 'src\Security\Authentication\Google\src\GoogleOptions.cs'
    'owner\OAuthCreatingTicketContext.cs' = 'src\Security\Authentication\OAuth\src\Events\OAuthCreatingTicketContext.cs'
    'owner\OAuthTokenResponse.cs' = 'src\Security\Authentication\OAuth\src\OAuthTokenResponse.cs'
    'owner\GoogleTests.cs' = 'src\Security\Authentication\test\GoogleTests.cs'
    'build\Microsoft.AspNetCore.Authentication.Google.csproj' = 'src\Security\Authentication\Google\src\Microsoft.AspNetCore.Authentication.Google.csproj'
    'build\Microsoft.AspNetCore.Authentication.Test.csproj' = 'src\Security\Authentication\test\Microsoft.AspNetCore.Authentication.Test.csproj'
    'build\PublicAPI.Shipped.txt' = 'src\Security\Authentication\Google\src\PublicAPI.Shipped.txt'
    'build\PublicAPI.Unshipped.txt' = 'src\Security\Authentication\Google\src\PublicAPI.Unshipped.txt'
    'build\.editorconfig' = '.editorconfig'
}
foreach ($entry in $sourceMap.GetEnumerator())
{
    $destination = Join-Path $context ('sources\' + $entry.Key)
    New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
    Copy-Item (Join-Path $root $entry.Value) $destination
}
foreach ($name in 'AutoPerf.Benchmarks.csproj','Program.cs','GoogleFixture.cs','GoogleBenchmarks.cs','SettingsPreservingEmitToolchain.cs')
{
    $destination = Join-Path $context ('sources\harness\' + $name)
    New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
    Copy-Item (Join-Path $run ('harness\' + $name)) $destination
}
$testImage = Join-Path $context 'owning-tests'
New-Item -ItemType Directory -Path $testImage | Out-Null
foreach ($name in 'Microsoft.AspNetCore.Authentication.Test.dll','Microsoft.AspNetCore.Authentication.Test.pdb',
    'Microsoft.AspNetCore.Authentication.Test.deps.json','Microsoft.AspNetCore.Authentication.Test.runtimeconfig.json',
    'Microsoft.AspNetCore.Authentication.Google.dll','Microsoft.AspNetCore.Authentication.Google.pdb')
{
    Copy-Item (Join-Path $tests $name) (Join-Path $testImage $name)
}
$manifest = @(Get-ChildItem $context -Recurse -Force -File | Sort-Object FullName | ForEach-Object {
    [ordered]@{ path = [IO.Path]::GetRelativePath($context,$_.FullName); bytes = $_.Length; sha256 = (Get-FileHash $_.FullName).Hash }
})
$imageRows = @($manifest | Where-Object { $_.path.StartsWith('image\') })
$comparison = $null
if ($Role -eq 'candidate')
{
    $before = Get-Content (Join-Path $original 'manifest.json') -Raw | ConvertFrom-Json
    $beforeImages = @($before.files | Where-Object { $_.path.StartsWith('image\') })
    if ($beforeImages.Count -ne $imageRows.Count)
    {
        throw 'Paired entire prepared output images have different path inventories.'
    }
    $different = @(foreach ($imageRow in $imageRows)
    {
        $pair = @($beforeImages | Where-Object path -CEQ $imageRow.path)
        if ($pair.Count -ne 1 -or $pair[0].sha256 -cne $imageRow.sha256)
        {
            $imageRow.path
        }
    })
    $expected = @("image\$ownerName.dll","image\$ownerName.pdb") | Sort-Object
    if ((($different | Sort-Object) -join "`n") -cne ($expected -join "`n"))
    {
        throw 'Only the actual Google owner DLL/PDB may differ in the complete prepared runtime outputs.'
    }
    foreach ($entry in $manifest | Where-Object { $_.path.StartsWith('sources\') -and $_.path -cne 'sources\owner\GoogleHandler.cs' })
    {
        $pair = @($before.files | Where-Object path -CEQ $entry.path)
        if ($pair.Count -ne 1 -or $pair[0].sha256 -cne $entry.sha256)
        {
            throw "Paired preservation/harness/build/other source changed:$($entry.path)"
        }
    }
    $comparison = [ordered]@{ filesPerRole = $imageRows.Count; differingFiles = $different; allNonownerImageHashesEqual = $true }
}
[ordered]@{
    candidate = 'F018'; role = $Role; baseline = $acceptance.baseline; branch = $acceptance.branch
    files = $manifest; totalFiles = $manifest.Count; preparedImageFiles = $imageRows.Count; owningRows = 68; preservationRows = 18
    actualSuccessfulOwningAttempt = $testAttempt[0].FullName; actualParsedTrxSha256 = (Get-FileHash (Join-Path $testAttempt[0].FullName 'parsed-trx.json')).Hash
    testedProductAndImageOwnerDllPdbMatch = $true; imageComparison = $comparison
    preparedOutputCopyIsNotWholeCompilerOrWholeMachineProvenance = $true
} | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $context 'manifest.json') -Encoding utf8NoBOM
Set-Location $root
. .\activate.ps1
$arguments = @((Join-Path $image 'AutoPerf.Benchmarks.dll'),'--sources',(Join-Path $context 'sources'),
    '--context',$Role,'--mode','characterize','--artifacts',(Join-Path $execution 'artifacts'))
$started = [DateTimeOffset]::UtcNow.ToString('o')
& dotnet @arguments *> (Join-Path $execution 'native.log')
$code = $LASTEXITCODE
[ordered]@{
    executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root; started = $started
    completed = [DateTimeOffset]::UtcNow.ToString('o'); actualExitCode = $code
    outputSha256 = (Get-FileHash (Join-Path $execution 'native.log')).Hash; characterizationOnly = $true; timingPerformed = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $execution 'command.json') -Encoding utf8NoBOM
Get-Content (Join-Path $execution 'native.log') -Tail 30
if ($code)
{
    throw 'Actual original/candidate native producer/consumer preflight failed;retain it and do not time.'
}
$states = @(Get-ChildItem (Join-Path $execution 'artifacts\states') -Filter '*.json' -File | Sort-Object Name | ForEach-Object { Get-Content $_.FullName -Raw | ConvertFrom-Json })
$contracts = @($states | Where-Object { 'allAssertionsPassed' -in $_.PSObject.Properties.Name })
$wrappers = @($states | Where-Object { 'matched' -in $_.PSObject.Properties.Name })
if ($contracts.Count -ne 60 -or @($contracts | Where-Object { -not $_.allAssertionsPassed }).Count -or
    $wrappers.Count -ne 24 -or @($wrappers | Where-Object { -not $_.matched }).Count)
{
    throw 'All48profile/12real-producer-cancellation/24actual-wrapper results required.'
}
foreach ($shape in $acceptance.requiredBenchmarkShapes)
{
    if (@($contracts | Where-Object { $_.shape -ceq $shape -and $_.phase -in 'setup','cleanup' }).Count -ne 2 -or
        @($wrappers | Where-Object shape -CEQ $shape).Count -ne 1)
    {
        throw "Exact original/candidate actual shape reachability differs:$shape"
    }
}
[ordered]@{
    candidate = 'F018'; role = $Role; actualExitCode = 0; actualRecordedProfileContracts = 48; actualProducerCancellationContracts = 12
    actualTimedWrappers = 24; allActualContractAssertionsPassed = $true; frozenFiles = $manifest.Count
    preparedImageFiles = $imageRows.Count; imageComparison = $comparison; timingPerformed = $false
} | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $execution 'completed.json') -Encoding utf8NoBOM
Write-Output "F018:$Role frozen$($manifest.Count)files/$($imageRows.Count)image assets;all68tests/18rows and48profile+12producer-cancellation+24wrapper assertions passed."
