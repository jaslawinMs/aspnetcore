$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F038'
$original = Join-Path $run 'preparation-original-001'
$preparation = Join-Path $run 'preparation-candidate-001'
if (Test-Path -LiteralPath $preparation)
{
    throw 'Do not overwrite candidate preparation.'
}
$baseline = Get-Content -Raw -LiteralPath (Join-Path $run 'baseline-validation.json') | ConvertFrom-Json
$tests = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\candidate-existing-1\verified-result.json') | ConvertFrom-Json
$originalPreparation = Get-Content -Raw -LiteralPath (Join-Path $original 'verified-preparation.json') | ConvertFrom-Json
$originalClosure = Get-Content -Raw -LiteralPath (Join-Path $original 'consumer-closure.json') | ConvertFrom-Json
if (-not $baseline.actualBaselineValidationPassed -or $tests.actualPassed -ne 83 -or $tests.actualSkipped -ne 0)
{
    throw 'Fresh baseline and candidate owning checks must pass before candidate preparation.'
}
foreach ($entry in $originalClosure.files)
{
    if ((Get-FileHash -LiteralPath (Join-Path $original "consumer\$($entry.path)") -Algorithm SHA256).Hash -cne $entry.sha256)
    {
        throw "Frozen original consumer changed:$($entry.path)"
    }
}
foreach ($entry in $originalPreparation.actualHarnessFiles)
{
    if ((Get-FileHash -LiteralPath (Join-Path $run "harness\$($entry.file)") -Algorithm SHA256).Hash -cne $entry.sha256)
    {
        throw "Measured harness source changed:$($entry.file)"
    }
}
$ownerRelative = 'src\Components\Components\src\RenderTree\RenderTreeDiffBuilder.cs'
$before = [IO.File]::ReadAllText((Join-Path $original 'sources\RenderTreeDiffBuilder.cs'))
$newline = if ($before.Contains("`r`n")) { "`r`n" } else { "`n" }
$expected = $before.Replace('using System.Diagnostics;', "using System.Diagnostics;$newline" + 'using System.Runtime.InteropServices;')
$expected = $expected.Replace('                if (!result.TryGetValue(key, out var existingEntry))',
    "                ref var existingEntry = ref CollectionsMarshal.GetValueRefOrAddDefault(result, key, out var exists);$newline" +
    '                if (!exists)')
$expected = $expected.Replace('                    result[key] = new KeyedItemInfo(-1, newStartIndex);',
    '                    existingEntry = new KeyedItemInfo(-1, newStartIndex);')
$expected = $expected.Replace('                    result[key] = new KeyedItemInfo(existingEntry.OldIndex, newStartIndex);',
    '                    existingEntry = new KeyedItemInfo(existingEntry.OldIndex, newStartIndex);')
if ($expected -ceq $before -or $expected -cne [IO.File]::ReadAllText((Join-Path $root $ownerRelative)))
{
    throw 'Candidate source must equal the four literal seam replacements, preserving every other character and newline.'
}
Set-Location $root
$changed = @(git --no-pager diff --name-only)
if ($LASTEXITCODE -ne 0 -or $changed.Count -ne 1 -or $changed[0].Replace('/', '\') -cne $ownerRelative)
{
    throw 'Unexpected tracked source changes.'
}
New-Item -ItemType Directory -Path (Join-Path $preparation 'sources') | Out-Null
$consumer = Join-Path $preparation 'consumer'
Copy-Item -LiteralPath (Join-Path $original 'consumer') -Destination $consumer -Recurse
$product = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Components\Release\net12.0'
foreach ($file in 'Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb')
{
    Copy-Item -LiteralPath (Join-Path $product $file) -Destination (Join-Path $consumer $file) -Force
}
$selectedSources = @()
foreach ($source in $originalPreparation.actualSelectedSourceFiles)
{
    $target = Join-Path $preparation "sources\$([IO.Path]::GetFileName($source))"
    Copy-Item -LiteralPath (Join-Path $root $source) -Destination $target
    $beforeHash = (Get-FileHash -LiteralPath (Join-Path $original "sources\$([IO.Path]::GetFileName($source))") -Algorithm SHA256).Hash
    $afterHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    if (($source -ceq $ownerRelative) -eq ($beforeHash -ceq $afterHash))
    {
        throw "Unexpected source delta:$source"
    }
    $selectedSources += [ordered]@{path=$source;sha256=$afterHash;changed=($beforeHash -cne $afterHash)}
}
$files = @(Get-ChildItem -LiteralPath $consumer -File -Recurse | Sort-Object FullName | ForEach-Object {
    [ordered]@{path=[IO.Path]::GetRelativePath($consumer,$_.FullName);bytes=$_.Length;
        sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
})
if ($files.Count -ne 106 -or $files.Count -ne @($originalClosure.files).Count)
{
    throw 'The frozen consumer inventory must remain106files.'
}
$changedConsumerFiles = @()
foreach ($entry in $files)
{
    $matching = @($originalClosure.files | Where-Object { $_.path -ceq $entry.path })
    if ($matching.Count -ne 1)
    {
        throw "Unexpected consumer path:$($entry.path)"
    }
    if ($matching[0].sha256 -cne $entry.sha256)
    {
        $changedConsumerFiles += $entry.path
    }
}
$required = @('Microsoft.AspNetCore.Components.dll', 'Microsoft.AspNetCore.Components.pdb')
if ((@($changedConsumerFiles | Sort-Object -CaseSensitive) | ConvertTo-Json -Compress) -cne
    (@($required | Sort-Object -CaseSensitive) | ConvertTo-Json -Compress))
{
    throw "Only the actual owner DLL/PDB may differ:$($changedConsumerFiles -join ',')"
}
$ownerHash = (Get-FileHash -LiteralPath (Join-Path $consumer 'Microsoft.AspNetCore.Components.dll') -Algorithm SHA256).Hash
$testOwner = Join-Path $root 'artifacts\bin\Microsoft.AspNetCore.Components.Tests\Release\net12.0\Microsoft.AspNetCore.Components.dll'
if ((Get-FileHash -LiteralPath $testOwner -Algorithm SHA256).Hash -cne $ownerHash)
{
    throw 'Fresh owning tests and frozen candidate must use the exact same actual owner.'
}
[ordered]@{candidate='F038';variant='candidate';actualConsumerRoot=$consumer;files=$files
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $preparation 'consumer-closure.json') -Encoding utf8NoBOM
[ordered]@{candidate='F038';actualSuccessful=$true;actualConsumerFiles=$files.Count;
    actualCandidateOwnerSha256=$ownerHash;actualChangedConsumerFiles=$changedConsumerFiles;
    actualHarnessByteIdentical=$true;actualOther104FilesByteIdentical=$true;
    actualExactSourceSeamVerified=$true;actualSelectedSourceFiles=$selectedSources;
    actualOwningTestImageMatched=$true;actualHarnessFiles=$originalPreparation.actualHarnessFiles
} | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $preparation 'verified-preparation.json') -Encoding utf8NoBOM
git --no-pager diff -- src\Components\Components\src\RenderTree\RenderTreeDiffBuilder.cs |
    Set-Content -LiteralPath (Join-Path $preparation 'candidate-source.patch') -Encoding utf8NoBOM
if ($LASTEXITCODE -ne 0)
{
    throw 'Failed to capture exact source patch.'
}
Write-Output "F038:candidate frozen;106files;only actual owner DLL/PDB changed;104others+measured harness byte-identical;exact source seam verified."
