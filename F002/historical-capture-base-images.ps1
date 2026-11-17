$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F002'
$prior=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$directory=Join-Path $run 'base-image-capture'
$borrowed=Join-Path $run 'tests\borrowed-F001'
$quic=Join-Path $run 'quic-owner\image'
$compiled='C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Server.Kestrel.Transport.Quic\Release\net12.0'
if((Test-Path $directory) -or (Test-Path $borrowed) -or (Test-Path $quic) -or
    (git branch --show-current).Trim() -cne 'autoperf/F002-webtransport-stream-removal' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or @(git diff --name-only).Count){throw 'Fresh independent baseline image capture required.'}
$sources=Get-Content (Join-Path $run 'current-source-investigation.json') -Raw|ConvertFrom-Json
if(@($sources.sources|Where-Object identicalToPriorF001RawSource -EQ $true).Count -ne 21){throw 'All21 explicitly reused source inputs must be byte-exact.'}
$testAudit=Get-Content (Join-Path $prior 'tests\original\test-audit.json') -Raw|ConvertFrom-Json
if(-not $testAudit.allPassed -or $testAudit.actualRows -ne 17 -or $testAudit.skipped){throw 'Exact original17 passing0skip source-identified rows required.'}
New-Item -ItemType Directory -Path $directory,(Join-Path $borrowed 'image'),$quic -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
foreach($name in 'test-audit.json','webtransport-original.trx','discovery-initial.log','owning-tests.log','execution.json','discovery-checker-failure.json')
{
    Copy-Item (Join-Path $prior "tests\original\$name") (Join-Path $borrowed $name)
}
$testImage=@(foreach($row in $testAudit.capturedFlatTestAndOwnerImage)
{
    $source=Join-Path $prior "tests\original\image\$($row.file)"
    if((Get-Item $source).Length -ne $row.bytes -or (Get-FileHash $source).Hash -cne $row.sha256){throw 'Original borrowed test image changed.'}
    $target=Join-Path $borrowed "image\$($row.file)"
    Copy-Item $source $target
    if((Get-FileHash $target).Hash -cne $row.sha256){throw 'Actual copied test image differs.'}
    $row
})
$quicImage=@(foreach($name in 'Microsoft.AspNetCore.Server.Kestrel.Transport.Quic.dll','Microsoft.AspNetCore.Server.Kestrel.Transport.Quic.pdb','Microsoft.AspNetCore.Server.Kestrel.Transport.Quic.deps.json')
{
    $source=Join-Path $compiled $name
    if(-not (Test-Path $source))
    {
        if($name.EndsWith('.deps.json')){continue}
        throw 'Actual existing baseline QUIC DLL/PDB required.'
    }
    Copy-Item $source (Join-Path $quic $name)
    [ordered]@{file=$name;bytes=(Get-Item $source).Length;sha256=(Get-FileHash $source).Hash;original=$source}
})
$commands=[System.Collections.Generic.List[object]]::new()
dotnet --info *> (Join-Path $directory 'dotnet-info.log');$code=$LASTEXITCODE
$commands.Add([pscustomobject]@{entryPoint='dotnet';arguments=@('--info');actualExitCode=$code})
if($code){throw 'Actual activated SDK identity capture failed.'}
$toolRoot=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools'
$tool=Join-Path $toolRoot 'bin\Release\net12.0\AutoPerf.Evidence.dll'
Copy-Item (Join-Path $toolRoot 'Program.cs') (Join-Path $directory 'verifier-Program.cs')
$documents=[System.Collections.Generic.List[object]]::new()
foreach($relative in 'src\Servers\Kestrel\Transport.Quic\src\Internal\QuicStreamContext.cs','src\Servers\Kestrel\Transport.Quic\src\Internal\QuicConnectionContext.cs')
{
    $source=Join-Path $run "producer-source\$relative"
    $pdb=Join-Path $quic 'Microsoft.AspNetCore.Server.Kestrel.Transport.Quic.pdb'
    $arguments=@($tool,'pdb',$pdb,[IO.Path]::GetFileName($source),$source)
    $log=Join-Path $directory "quic-document-$($documents.Count).log"
    dotnet @arguments *> $log;$code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{entryPoint='dotnet';arguments=$arguments;actualExitCode=$code})
    [ordered]@{candidate='F002';commands=$commands}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
    if($code){Get-Content $log;throw 'Actual existing QUIC source/PDB document differs;preserve this capture and diagnose before building.'}
    $actual=Get-Content $log -Raw|ConvertFrom-Json
    if(-not $actual.verified){throw 'Positive QUIC source-document witness required.'}
    $documents.Add([pscustomobject]@{owner='Microsoft.AspNetCore.Server.Kestrel.Transport.Quic';source=$relative;pdbSha256=(Get-FileHash $pdb).Hash;sourceSha256=(Get-FileHash $source).Hash;actual=$actual})
}
[ordered]@{
    candidate='F002';borrowedTestEvidenceFrom='F001/tests/original';borrowedTestRows=17;newExistingTestExecutions=0
    reusedSourceFilesExactlyEqual=21;originalTrxSha256=$testAudit.trxSha256;testImageFiles=$testImage
    existingActualQuicOwnerRebuiltForF002=$false;quicImageFiles=$quicImage;actualQuicPdbDocumentChecks=$documents
    limitation='Explicit borrowed original test/image evidence,not newly executed F002 tests. Existing actual on-disk QUIC owner captured with2 fresh source/PDB document checks,not full build provenance,PE/PDB binding or method coverage.'
}|ConvertTo-Json -Depth 12|Set-Content (Join-Path $run 'base-image-ready.json') -Encoding utf8
Write-Output "F002:exact$($testImage.Count)-file borrowed original test image captured;17 borrowed0 new test rows;actual existing QUIC owner captured and2 fresh document checks passed."
