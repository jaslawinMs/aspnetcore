param([ValidateRange(1,10)][int]$Attempt=1)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F116'
$directory=Join-Path $run "development\harness-build-attempt$Attempt"
if (Test-Path $directory) {throw 'Never overwrite a harness-build attempt.'}
if (@(git status --porcelain --untracked-files=no).Count -or (git branch --show-current).Trim() -cne 'autoperf/F116-boxed-port-cache') {throw 'Original harness must compile before any shipping edit.'}
$audit=Get-Content (Join-Path $run 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
if (-not $audit.allPassed -or $audit.actualRows -ne 31) {throw 'All actual31 scoped owning rows must pass first.'}
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
Get-ChildItem (Join-Path $run 'harness') -File|Where-Object Extension -In '.cs','.csproj'|Copy-Item -Destination (Join-Path $directory 'source')
$arguments=@('build',(Join-Path $run 'harness\AutoPerf.Benchmarks.csproj'),'-c','Release','-m:2','-p:UseIisNativeAssets=false','-p:BuildProjectReferences=false','-v:quiet')
if ($Attempt -gt 1) {$arguments+='--no-restore'}
$start=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'build.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F116';entryPoint='dotnet';arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    restoreReason='New standalone harness manifest with BenchmarkDotNet0.13.0;existing repository manifests unchanged.'
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'build.log') -Tail 18
if ($code) {throw 'Harness build failed;preserve this exact source/command/output attempt.'}
$output=Join-Path $run 'harness\bin\Release\net12.0'
$owners=@('Microsoft.AspNetCore.Server.Kestrel.Core','Microsoft.AspNetCore.SignalR.Core','Microsoft.AspNetCore.Http.Connections')
$checks=@(foreach ($owner in $owners)
{
    foreach ($extension in '.dll','.pdb')
    {
        $name=$owner+$extension
        $actual=(Get-FileHash (Join-Path $output $name)).Hash
        $matches=@($audit.scopes|ForEach-Object {$_.capturedTestAndOwnerImage}|Where-Object file -CEQ $name)
        if (-not $matches.Count -or @($matches|Where-Object sha256 -CNE $actual).Count) {throw "Harness owner must match every actual tested owner image:$name"}
        [pscustomobject]@{file=$name;sha256=$actual;matchedTestScopes=$matches.Count}
    }
})
$checks|ConvertTo-Json -Depth 5|Set-Content (Join-Path $directory 'tested-owner-matches.json') -Encoding utf8
Write-Output 'F116 original harness built;all six owning DLL/PDB files match actual scoped tested images.'
