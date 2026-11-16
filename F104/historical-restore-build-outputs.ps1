$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$record = Join-Path $run 'restored-build-outputs.json'
if (Test-Path -LiteralPath $record) { throw 'Output restoration is already recorded;verify rather than overwrite.' }
$original = Get-Content (Join-Path $run 'execution-closure-original.json') -Raw | ConvertFrom-Json
$proposed = Get-Content (Join-Path $run 'execution-closure-candidate-3.json') -Raw | ConvertFrom-Json
$folders = @(
    (Join-Path $repo 'artifacts\bin\Microsoft.AspNetCore.App.Analyzers\Release\netstandard2.0'),
    (Join-Path $repo 'artifacts\bin\Microsoft.AspNetCore.App.Analyzers.Test\Release\net12.0'),
    (Join-Path $run 'harness\bin\Release\net12.0')
)
$rows = @(foreach ($folder in $folders)
{
    foreach ($name in 'Microsoft.AspNetCore.App.Analyzers.dll','Microsoft.AspNetCore.App.Analyzers.pdb')
    {
        $target = Join-Path $folder $name
        $before = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
        $expected = ($original.files | Where-Object file -CEQ $name).sha256
        $experimental = ($proposed.files | Where-Object file -CEQ $name).sha256
        if ($before -cnotin $expected,$experimental)
        {
            throw "Unexpected output bytes;do not overwrite another build:$target"
        }
        $copied = $before -cne $expected
        if ($copied) { Copy-Item -LiteralPath (Join-Path $run "binaries\original\$name") -Destination $target }
        $after = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
        if ($after -cne $expected) { throw "Exact original output restoration failed:$target" }
        [pscustomobject]@{path=$target;beforeSha256=$before;afterSha256=$after;copiedOriginalBytes=$copied}
    }
})
[ordered]@{
    candidate='F104';actualOutputFiles=$rows.Count;rows=$rows;allMatchFrozenTestedOriginal=$true
    existingControlsRerun=$false;frozenMeasuredImagesChanged=$false
    boundary='Only known own analyzer DLL/PDB bytes in the product,test and development harness outputs. A different concurrent output hash would stop restoration. Original owning controls remain the previously executed35 rows,not a new test claim.'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $record -Encoding utf8
Write-Output "F104:$($rows.Count) scoped development output files match the tested frozen original;all measured images retained."
