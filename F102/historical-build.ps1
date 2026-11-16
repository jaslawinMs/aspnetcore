$ErrorActionPreference = 'Stop'
$repo = 'C:\src\aspnetcore'
. (Join-Path $repo 'activate.ps1')
$run = Join-Path $PSScriptRoot 'autoperf-runs\F102'
$project = Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'
$helper = Join-Path $PSScriptRoot 'autoperf-runs\F100\harness\CorelibEvidence.cs'
$target = Join-Path $run 'harness\CorelibEvidence.cs'
if (Test-Path -LiteralPath $target) { throw 'Existing F102 metadata helper must not be overwritten.' }
Copy-Item -LiteralPath $helper -Destination $target
if ((Get-FileHash $helper).Hash -cne (Get-FileHash $target).Hash) { throw 'Unchanged compiled-CoreLib metadata helper copy differs.' }
[ordered]@{candidate='F102';original='F100\harness\CorelibEvidence.cs';destination='harness\CorelibEvidence.cs';
    sha256=(Get-FileHash $target).Hash;byteIdentical=$true;
    note='Metadata-only actual compiled CoreLib ctor/reset IL;no runtime source replacement/private state access.'} |
    ConvertTo-Json -Depth 4 | Set-Content (Join-Path $run 'unchanged-helper-copy.json')
function Invoke-Actual([string]$Label, [string[]]$Arguments)
{
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    dotnet @Arguments *> (Join-Path $run "$Label.log")
    $code = $LASTEXITCODE
    [ordered]@{candidate='F102';arguments=$Arguments;exitCode=$code;startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')} |
        ConvertTo-Json -Depth 5 | Set-Content (Join-Path $run "$Label-command.json")
    if ($code) { throw "Actual command failed:$Label;preserve the outcome,not a source comparison." }
}
Invoke-Actual 'harness-restore' @('restore',$project,'--disable-parallel','--verbosity','quiet','-m:2','-p:Configuration=Release')
Invoke-Actual 'harness-whitespace-apply' @('format','whitespace',$project,'--no-restore','--verbosity','quiet')
Invoke-Actual 'harness-whitespace-final' @('format','whitespace',$project,'--no-restore','--verify-no-changes','--verbosity','quiet')
Invoke-Actual 'harness-build-final' @('build',$project,'--no-restore','-c','Release','-m:2','--verbosity','minimal')
if (@(git -C $repo status --porcelain --untracked-files=no).Count) { throw 'Unexpected tracked source edits after F102 external build.' }
Write-Output 'F102 external project restored,formatted/verified before first build and actual baseline void setter harness compiled;no probe or BDN yet.'
