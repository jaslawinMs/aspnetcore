$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$prior=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$native=Get-Content (Join-Path $run 'native-ready.json') -Raw|ConvertFrom-Json
$manifest=Get-Content (Join-Path $run $native.manifest) -Raw|ConvertFrom-Json
$directory=Join-Path $run 'pdb\original'
if(Test-Path $directory){throw 'Never overwrite source-document evidence.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$toolRoot=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools'
$tool=Join-Path $toolRoot 'bin\Release\net12.0\AutoPerf.Evidence.dll'
Copy-Item (Join-Path $toolRoot 'Program.cs') (Join-Path $directory 'verifier-Program.cs')
Get-ChildItem $toolRoot -File -Filter '*.csproj'|Copy-Item -Destination $directory
$borrowed=Get-Content (Join-Path $prior 'pdb\original\document-audit.json') -Raw|ConvertFrom-Json
$rows=[System.Collections.Generic.List[object]]::new()
foreach($row in @($borrowed.rows|Where-Object owner -CNE 'AutoPerf.Benchmarks'))
{
    $source=Join-Path $run "producer-source\$($row.source)"
    $pdb=Join-Path $manifest.image "$($row.owner).pdb"
    if(-not $row.actual.verified -or (Get-FileHash $source).Hash -cne $row.sourceSha256 -or (Get-FileHash $pdb).Hash -cne $row.pdbSha256){throw 'Borrowed owner document must bind exactly the same raw source/PDB bytes.'}
    $row|Add-Member -NotePropertyName evidenceOrigin -NotePropertyValue 'Borrowed exact F001 owner witness;not a new check'
    $rows.Add($row)
}
if($rows.Count -ne 16){throw 'Exactly16 reused owner documents,excluding all3 old harness documents,required.'}
$base=Get-Content (Join-Path $run 'base-image-ready.json') -Raw|ConvertFrom-Json
foreach($row in $base.actualQuicPdbDocumentChecks)
{
    if(-not $row.actual.verified -or (Get-FileHash (Join-Path $run "producer-source\$($row.source)")).Hash -cne $row.sourceSha256 -or
        (Get-FileHash (Join-Path $manifest.image "$($row.owner).pdb")).Hash -cne $row.pdbSha256){throw 'Earlier fresh QUIC witness changed.'}
    $row|Add-Member -NotePropertyName evidenceOrigin -NotePropertyValue 'Fresh F002 base-image capture;not repeated'
    $rows.Add($row)
}
$pairs=@(
    @('Microsoft.AspNetCore.Server.Kestrel.Transport.Quic','src\Servers\Kestrel\Transport.Quic\src\Internal\QuicConnectionListener.cs'),
    @('Microsoft.AspNetCore.Server.Kestrel.Transport.Quic','src\Servers\Kestrel\shared\CompletionPipeReader.cs'),
    @('Microsoft.AspNetCore.Server.Kestrel.Transport.Quic','src\Servers\Kestrel\shared\CompletionPipeWriter.cs'),
    @('InMemory.FunctionalTests','src\Shared\TestResources.cs'),
    @('AutoPerf.Benchmarks','harness\Program.cs'),
    @('AutoPerf.Benchmarks','harness\ProtocolFixture.cs'),
    @('AutoPerf.Benchmarks','harness\SettingsPreservingEmitToolchain.cs'),
    @('AutoPerf.Benchmarks','harness\NativeQuicProbe.cs')
)
$commands=[System.Collections.Generic.List[object]]::new()
foreach($pair in $pairs)
{
    $source=if($pair[0] -ceq 'AutoPerf.Benchmarks'){Join-Path $manifest.source ([IO.Path]::GetFileName($pair[1]))}
        else{Join-Path $run "producer-source\$($pair[1])"}
    $pdb=Join-Path $manifest.image "$($pair[0]).pdb"
    $arguments=@($tool,'pdb',$pdb,[IO.Path]::GetFileName($source),$source)
    $log=Join-Path $directory "document-$($commands.Count).log"
    dotnet @arguments *> $log;$code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{entryPoint='dotnet';arguments=$arguments;actualExitCode=$code})
    [ordered]@{candidate='F002';commands=$commands}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
    if($code){Get-Content $log;throw 'Actual source/PDB document mismatch;preserve this attempt.'}
    $actual=Get-Content $log -Raw|ConvertFrom-Json
    if(-not $actual.verified){throw 'Positive source-document checksum witness required.'}
    $rows.Add([pscustomobject]@{owner=$pair[0];source=$pair[1];pdbSha256=(Get-FileHash $pdb).Hash;sourceSha256=(Get-FileHash $source).Hash;actual=$actual;evidenceOrigin='Fresh F002 final frozen-image document check'})
}
if($rows.Count -ne 26){throw 'Exactly26 selected document witnesses required.'}
[ordered]@{
    candidate='F002';tag=$manifest.tag;verifiedDocuments=26;borrowedF001OwnerWitnesses=16;freshF002BaseWitnesses=2;freshF002FinalWitnesses=8
    rows=$rows;verifierAssemblySha256=(Get-FileHash $tool).Hash
    limitation='Source/PDB document witnesses,not independent PE/PDB binding,complete build provenance or method coverage. Only8 checks newly executed here;2 earlier F002 and16 exact borrowed F001 witnesses retained with provenance. The old3 F001 harness witnesses are excluded.'
}|ConvertTo-Json -Depth 12|Set-Content (Join-Path $directory 'document-audit.json') -Encoding utf8
Write-Output 'F002:8 new final-source document checks passed;2 earlier F002+16 exact borrowed owner witnesses,26 total with explicit provenance.'
