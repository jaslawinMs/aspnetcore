$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F036'
$execution = Join-Path $run 'comparison-preparation-candidate'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual F036 candidate freeze.'
}
$validation = Get-Content -Raw (Join-Path $run 'validation\candidate-existing-1\verified-result.json') | ConvertFrom-Json
$original = Get-Content -Raw (Join-Path $run 'comparison-preparation-original\prepared\capsule.json') | ConvertFrom-Json
$originalClosure = Get-Content -Raw $original.closurePath | ConvertFrom-Json
if ($validation.actualPassed -ne 19 -or $validation.actualSkipped -ne 0 -or $validation.actualFailures -ne 0 -or
    (& git -C $root branch --show-current).Trim() -cne 'autoperf/F036-viewdata-enumeration' -or
    (& git -C $root rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5')
{
    throw 'Require the independent candidate and all19fresh owning rows.'
}
$changed = @(& git -C $root diff --name-only)
if ($changed.Count -ne 1 -or $changed[0] -cne 'src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs' -or
    @(& git -C $root diff --cached --name-only).Count)
{
    throw 'Only the uncommitted ViewData implementation seam may differ.'
}
$ownerSource = Join-Path $root 'src\Mvc\Mvc.ViewFeatures\src\ViewDataDictionary.cs'
if ((Get-FileHash -LiteralPath $ownerSource).Hash -cne $validation.actualSourceSha256)
{
    throw 'Current candidate source differs from the actually tested source.'
}
foreach ($file in $originalClosure.files)
{
    if ((Get-FileHash -LiteralPath (Join-Path $original.output $file.path)).Hash -cne $file.sha256)
    {
        throw 'Original comparison consumer changed before candidate copy.'
    }
}
foreach ($file in @($original.sourceFiles | Where-Object { $_.path.StartsWith('sources\harness\', [StringComparison]::Ordinal) }))
{
    if ((Get-FileHash -LiteralPath (Join-Path $run "comparison-harness\$([IO.Path]::GetFileName($file.path))")).Hash -cne $file.sha256)
    {
        throw 'The characterized comparison harness source changed.'
    }
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$consumer = Join-Path $execution 'consumer'
Copy-Item -LiteralPath $original.output -Destination $consumer -Recurse
foreach ($owner in $validation.actualTestBinOwners)
{
    $prior = @($original.actualTestedOwners | Where-Object assembly -CEQ $owner.assembly)
    if ($prior.Count -ne 1)
    {
        throw 'Require the same selected owner set across variants.'
    }
    if ($owner.assembly -cne 'Microsoft.AspNetCore.Mvc.ViewFeatures' -and
        ($prior[0].actualOwnerSha256 -cne $owner.actualOwnerSha256 -or $prior[0].actualOwnerPdbSha256 -cne $owner.actualOwnerPdbSha256))
    {
        throw 'An unchanged MVC dependency differs.'
    }
    foreach ($extension in '.dll','.pdb')
    {
        $expected = if ($extension -ceq '.dll') { $owner.actualOwnerSha256 } else { $owner.actualOwnerPdbSha256 }
        $product = [IO.Path]::ChangeExtension($owner.actualProductPath,$extension)
        if ((Get-FileHash -LiteralPath $product).Hash -cne $expected)
        {
            throw 'Tested candidate product PE/PDB changed.'
        }
        if ($owner.assembly -ceq 'Microsoft.AspNetCore.Mvc.ViewFeatures')
        {
            Copy-Item -LiteralPath $product -Destination (Join-Path $consumer "$($owner.assembly)$extension")
        }
    }
}
$differences = @(foreach ($file in $originalClosure.files)
{
    $actual = (Get-FileHash -LiteralPath (Join-Path $consumer $file.path)).Hash
    if ($actual -cne $file.sha256)
    {
        [ordered]@{path=$file.path; originalSha256=$file.sha256; candidateSha256=$actual}
    }
})
if ($differences.Count -ne 2 -or @($differences | Where-Object {
    $_.path -notin 'Microsoft.AspNetCore.Mvc.ViewFeatures.dll','Microsoft.AspNetCore.Mvc.ViewFeatures.pdb'
}).Count)
{
    throw 'Only the actual tested ViewFeatures DLL/PDB may differ.'
}
$prepared = Join-Path $execution 'prepared'
$sources = Join-Path $prepared 'sources'
New-Item -ItemType Directory -Path $prepared | Out-Null
Copy-Item -LiteralPath $original.sources -Destination $sources -Recurse
Copy-Item -LiteralPath $ownerSource -Destination (Join-Path $sources 'owner\ViewDataDictionary.cs')
$patch = Join-Path $execution 'candidate.patch'
& git -C $root --no-pager diff --binary "--output=$patch" -- src/Mvc/Mvc.ViewFeatures/src/ViewDataDictionary.cs
if ($LASTEXITCODE -ne 0)
{
    throw 'Could not retain the exact candidate patch.'
}
$closure = [ordered]@{
    candidate='F036'; variant='candidate'
    files=@(Get-ChildItem -LiteralPath $consumer -File -Recurse -Force | ForEach-Object {
        [ordered]@{path=[IO.Path]::GetRelativePath($consumer,$_.FullName); sha256=(Get-FileHash -LiteralPath $_.FullName).Hash; bytes=$_.Length}
    })
}
$closurePath = Join-Path $prepared 'closure.json'
$closure | ConvertTo-Json -Depth 10 | Set-Content $closurePath -Encoding utf8NoBOM
[ordered]@{
    candidate='F036'; variant='candidate'; actualSourceHeadAtBuild=(& git -C $root rev-parse HEAD).Trim()
    actualPreparationLabel='comparison-preparation-candidate'; actualShippingChanges=1
    actualHarnessSha256=$original.actualHarnessSha256; actualHarnessPdbSha256=$original.actualHarnessPdbSha256
    actualSettingsExecutorSourceSha256=$original.actualSettingsExecutorSourceSha256
    actualClosureFiles=$closure.files.Count; actualWhitespaceVerifiedBeforeFreeze=$true
    actualHarnessRebuilt=$false; actualOriginalConsumerCopied=$true; actualFullCurrentMainIntegration=$false
    actualChangedConsumerFiles=$differences; output=$consumer; sources=$sources; closurePath=$closurePath
    actualTestedOwners=$validation.actualTestBinOwners
    sourceFiles=@(Get-ChildItem -LiteralPath $sources -File -Recurse -Force | ForEach-Object {
        [ordered]@{path=[IO.Path]::GetRelativePath($prepared,$_.FullName); sha256=(Get-FileHash -LiteralPath $_.FullName).Hash}
    })
} | ConvertTo-Json -Depth 15 | Set-Content (Join-Path $prepared 'capsule.json') -Encoding utf8NoBOM
Write-Output "F036 candidate:$($closure.files.Count)frozen files;only tested ViewFeatures PE/PDB changed;comparison harness not rebuilt."
