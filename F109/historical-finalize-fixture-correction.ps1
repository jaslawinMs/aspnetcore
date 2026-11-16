$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$record=Join-Path $run 'format-fixture-correction-command.json'
if (Test-Path $record) { throw 'Retain the actual fixture-correction formatting record.' }
$arguments=@('format','whitespace',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'--no-restore',
    '--verify-no-changes','--include',(Join-Path $run 'harness\TokenFixture.cs'))
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $run 'format-fixture-correction.log')
$code=$LASTEXITCODE
[ordered]@{
    arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    sourceComparisons=0;reason='Correct original-runtime nonzero-unused-pad-bit precondition before any shipping implementation/profile.'
}|ConvertTo-Json -Depth 6|Set-Content $record -Encoding utf8
if ($code) { throw 'Scoped fixture-correction formatting failed;retain it.' }
& (Join-Path $PSScriptRoot 'F109-build-harness.ps1') -Label fixture-correction -NoRestore
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'F109-case-matrix.md') -Destination (Join-Path $run 'case-matrix.md')
Write-Output 'F109 corrected33-case original precondition/formatting/clean build retained;zero source comparisons.'
