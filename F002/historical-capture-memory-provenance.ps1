$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$directory=Join-Path $run 'investigation\bdn-memory-accounting'
$previous=Join-Path $PSScriptRoot 'autoperf-runs\F001\investigation\bdn-memory-accounting'
$original=Join-Path $PSScriptRoot 'autoperf-runs\F118\investigation\bdn-memory-accounting'
if(Test-Path $directory){throw 'Never overwrite captured provenance.'}
$prior=Get-Content (Join-Path $previous 'provenance.json') -Raw|ConvertFrom-Json
$capture=Get-Content (Join-Path $original 'execution.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $run 'manifest-original-prep6.json') -Raw|ConvertFrom-Json
$assembly=@($manifest.files|Where-Object file -CEQ 'BenchmarkDotNet.dll')
if($assembly.Count -ne 1 -or $assembly[0].sha256 -cne $prior.f001_measured_bdn_dll_sha256 -or
    $capture.exitCode -ne 0 -or (Get-FileHash (Join-Path $original 'GcStats.cs')).Hash -cne $prior.source_sha256){throw 'Exact reused upstream source and actual identical BDN assembly required.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item (Join-Path $previous 'provenance.json') (Join-Path $directory 'borrowed-F001-provenance.json')
Copy-Item (Join-Path $original 'execution.json') (Join-Path $directory 'borrowed-F118-source-read-execution.json')
Copy-Item (Join-Path $original 'GcStats.cs') (Join-Path $directory 'GcStats.cs')
[ordered]@{
    candidate='F002';source_url=$prior.source_url;source_sha256=$prior.source_sha256
    original_source_capture='F118/investigation/bdn-memory-accounting';source_identity_reuse='F001 same measured BDN DLL'
    source_fetch_rerun_for_f002=$false;f002_measured_bdn_dll_sha256=$assembly[0].sha256
    runtime='Microsoft.NETCore.App/12.0.0-alpha.1.26562.105';source_observation=$prior.source_observation
    limitation='Explicit reused upstream-source/identical-BDN-image evidence,not new source fetch,runtime delegate instrumentation or independent assembly/source binding. Process-wide all-worker/async fixture activity can contribute;not pure per-thread component allocation.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $directory 'provenance.json') -Encoding utf8
Write-Output 'F002 identical measured BDN image and explicitly borrowed process-wide accounting source/provenance captured;no source fetch/tests/profile repeated.'
