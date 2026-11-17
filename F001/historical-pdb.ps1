$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F001'
$ready=Get-Content (Join-Path $run 'original-ready.json') -Raw|ConvertFrom-Json
$directory=Join-Path $run 'pdb\original'
if(Test-Path $directory){throw 'Never overwrite completed source-document evidence.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$toolRoot=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools'
$tool=Join-Path $toolRoot 'bin\Release\net12.0\AutoPerf.Evidence.dll'
Copy-Item (Join-Path $toolRoot 'Program.cs') (Join-Path $directory 'verifier-Program.cs')
Get-ChildItem $toolRoot -File -Filter '*.csproj'|Copy-Item -Destination $directory
$pairs=@(
    @('Microsoft.AspNetCore.Server.Kestrel.Core','src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportSession.cs'),
    @('Microsoft.AspNetCore.Server.Kestrel.Core','src\Servers\Kestrel\Core\src\Internal\WebTransport\WebTransportStream.cs'),
    @('Microsoft.AspNetCore.Server.Kestrel.Core','src\Servers\Kestrel\Core\src\Internal\Http3\Http3Connection.cs'),
    @('Microsoft.AspNetCore.Server.Kestrel.Core','src\Servers\Kestrel\Core\src\Internal\Http3\Http3Stream.cs'),
    @('Microsoft.AspNetCore.Server.Kestrel.Core','src\Shared\runtime\Http3\Http3StreamType.cs'),
    @('InMemory.FunctionalTests','src\Servers\Kestrel\shared\test\Http3\Http3InMemory.cs'),
    @('InMemory.FunctionalTests','src\Servers\Kestrel\shared\test\TestServiceContext.cs'),
    @('InMemory.FunctionalTests','src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\Http3TestBase.cs'),
    @('InMemory.FunctionalTests','src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportSessionTests.cs'),
    @('InMemory.FunctionalTests','src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportStreamTests.cs'),
    @('InMemory.FunctionalTests','src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportHandshakeTests.cs'),
    @('InMemory.FunctionalTests','src\Servers\Kestrel\test\InMemory.FunctionalTests\Http3\WebTransport\WebTransportTestUtilities.cs'),
    @('InMemory.FunctionalTests','src\Servers\Kestrel\shared\CompletionPipeReader.cs'),
    @('InMemory.FunctionalTests','src\Servers\Kestrel\shared\CompletionPipeWriter.cs'),
    @('Microsoft.AspNetCore.Http.Features','src\Http\Http.Features\src\IWebTransportSession.cs'),
    @('Microsoft.AspNetCore.Http.Features','src\Http\Http.Features\src\IHttpWebTransportFeature.cs'),
    @('AutoPerf.Benchmarks','harness\Program.cs'),
    @('AutoPerf.Benchmarks','harness\ProtocolFixture.cs'),
    @('AutoPerf.Benchmarks','harness\SettingsPreservingEmitToolchain.cs')
)
$rows=[System.Collections.Generic.List[object]]::new()
$commands=[System.Collections.Generic.List[object]]::new()
foreach($pair in $pairs)
{
    $number=$rows.Count
    $source=if($pair[0] -ceq 'AutoPerf.Benchmarks'){Join-Path $ready.source ([IO.Path]::GetFileName($pair[1]))}
        else{Join-Path $run "producer-source\$($pair[1])"}
    $pdb=Join-Path $ready.image "$($pair[0]).pdb"
    $arguments=@($tool,'pdb',$pdb,[IO.Path]::GetFileName($source),$source)
    dotnet @arguments *> (Join-Path $directory "document-$number.log");$code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{entryPoint='dotnet';arguments=$arguments;actualExitCode=$code})
    [ordered]@{candidate='F001';variant='original';commands=$commands}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
    if($code){Get-Content (Join-Path $directory "document-$number.log");throw 'Actual frozen source/PDB document mismatch;preserve this attempt.'}
    $actual=Get-Content (Join-Path $directory "document-$number.log") -Raw|ConvertFrom-Json
    if(-not $actual.verified){throw 'Positive source checksum witness required.'}
    $rows.Add([pscustomobject]@{owner=$pair[0];source=$pair[1];pdbSha256=(Get-FileHash $pdb).Hash;sourceSha256=(Get-FileHash $source).Hash;actual=$actual})
}
if($rows.Count -ne 19){throw 'All19 explicitly selected document checks required.'}
[ordered]@{
    candidate='F001';variant='original';verifiedDocuments=19;rows=$rows;verifierAssemblySha256=(Get-FileHash $tool).Hash
    limitation='Portable-PDB source-document checks,not an independent PE/PDB binding or method-coverage proof. QUIC source is context-only and its transport was not executed. Existing F071 tool executes only pdb branch;unexecuted F071 self branch remains in preserved verifier source.'
}|ConvertTo-Json -Depth 10|Set-Content (Join-Path $directory 'document-audit.json') -Encoding utf8
Write-Output 'F001:all19 actual owner/protocol/pipe/harness source-PDB document checks passed;not PE/PDB binding or live QUIC execution.'
