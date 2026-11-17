$ErrorActionPreference='Stop'
$directory=Join-Path $PSScriptRoot 'autoperf-runs\F001\investigation\bdn-memory-accounting'
$previous=Join-Path $PSScriptRoot 'autoperf-runs\F118\investigation\bdn-memory-accounting'
if(Test-Path $directory){throw 'Never overwrite captured provenance.'}
$capture=Get-Content (Join-Path $previous 'execution.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $PSScriptRoot 'autoperf-runs\F001\manifest-original-prep2.json') -Raw|ConvertFrom-Json
if($capture.exitCode -ne 0 -or $capture.arguments[1] -cne 'repos/dotnet/BenchmarkDotNet/contents/src/BenchmarkDotNet/Engines/GcStats.cs?ref=v0.13.0'){throw 'Exact actual prior accounting source read required.'}
$assembly=@($manifest.files|Where-Object file -CEQ 'BenchmarkDotNet.dll')
if($assembly.Count -ne 1){throw 'Exact actual measured BDN image identity required.'}
New-Item -ItemType Directory -Path $directory|Out-Null
Copy-Item (Join-Path $previous 'execution.json') (Join-Path $directory 'borrowed-source-read-execution.json')
[ordered]@{
    candidate='F001';source_url='https://github.com/dotnet/BenchmarkDotNet/blob/v0.13.0/src/BenchmarkDotNet/Engines/GcStats.cs'
    prior_actual_source_capture='F118/investigation/bdn-memory-accounting';source_sha256=(Get-FileHash (Join-Path $previous 'GcStats.cs')).Hash
    prior_source_captured_at=$capture.capturedAt;source_fetch_rerun_for_f001=$false
    f001_measured_bdn_dll_sha256=$assembly[0].sha256;f001_runtime='Microsoft.NETCore.App/12.0.0-alpha.1.26562.105'
    source_observation='ReadInitial/ReadFinal call GetAllocatedBytes;when available its reflected GC.GetTotalAllocatedBytes(bool) delegate is invoked with precise=true. It falls back to current-thread accounting only when that API is absent. The pinned net12 runtime supplies the process-wide API.'
    limitation='Explicit reused upstream-source provenance,not a new source fetch during F001,not runtime delegate instrumentation and not independent assembly/source binding. All-worker/async fixture activity can contribute;do not label this pure per-thread cleanup allocation.'
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'provenance.json') -Encoding utf8
Write-Output 'F001 memory interpretation references exact previously captured BDN0.13 source with explicit reuse provenance;no tests/timing rerun.'
