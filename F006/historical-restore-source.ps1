$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F006'
$destination=Join-Path $run 'restored-original-owner-attempt1'
if(Test-Path $destination){throw 'Do not overwrite actual restoration evidence.'}
New-Item $destination -ItemType Directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $destination 'executed-source.ps1')
$source='src\Components\Analyzers\src\ForLoopIteratorInClosureAnalyzer.cs'
$before=Join-Path $run "producer-source\$source"
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if(-not$audit.actualLiveAuditPassed -or $audit.performancePrJustified -or
    (Get-FileHash $source).Hash-cne(Get-FileHash $before).Hash -or @(git diff --name-only).Count -or @(git diff --cached --name-only).Count){throw 'Actual passed no-gain audit and byte-exact restored original tracked source required.'}
$a=@('build','src\Components\Analyzers\src\Microsoft.AspNetCore.Components.Analyzers.csproj','--no-restore','--no-dependencies','-c','Release','-t:Rebuild','-m:2','-v:q','-p:UseIisNativeAssets=false',"-bl:$destination\restored-owner-build.binlog")
& dotnet @a *> (Join-Path $destination 'restored-owner-build.log')
$code=$LASTEXITCODE
[ordered]@{candidate='F006';entryPoint='dotnet';arguments=$a;actualExitCode=$code;activation='. .\activate.ps1'}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'execution.json')
if($code){Get-Content (Join-Path $destination 'restored-owner-build.log') -Tail 35;throw 'Actual restored original owner rebuild failed.'}
$manifest=Get-Content (Join-Path $run 'manifest-original.json') -Raw|ConvertFrom-Json
$rows=@(foreach($name in 'Microsoft.AspNetCore.Components.Analyzers.dll','Microsoft.AspNetCore.Components.Analyzers.pdb')
{
    $path=Join-Path $PWD "artifacts\bin\Microsoft.AspNetCore.Components.Analyzers\Release\netstandard2.0\$name"
    $expected=@($manifest.files|Where-Object relativePath -CEQ $name)
    if($expected.Count-ne1 -or (Get-FileHash $path).Hash-cne$expected[0].sha256){throw 'Restored original owner DLL/PDB differs from measured original bytes.'}
    [ordered]@{name=$name;sha256=(Get-FileHash $path).Hash;measuredOriginalByteExact=$true}
})
[ordered]@{candidate='F006';fiveCandidateStatementsReverted=$true;sourceSha256=(Get-FileHash $source).Hash;
    measuredOriginalSourceSha256=(Get-FileHash $before).Hash;sourceByteExact=$true;trackedDiffFiles=0;trackedStagedFiles=0;
    restoredOwnerDllAndPdbByteExact=$true;ownerFiles=$rows;baseline='37e809ead5824bc753a1c3d56f11615bdb1296c5';
    preservedCandidatePatch=$true;performancePrCreated=$false;newSourceCommitCreated=$false;completedUtc=[DateTimeOffset]::UtcNow.ToString('o')}|
    ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'source-restoration.json')
[ordered]@{candidate='F006';disposition='no-gain';qualification=$audit.qualification;literalZeroLocalBenefitClaimed=$false;
    actualIndependentAuditAttempt=1;actualIndependentLiveAuditPassed=$true;all132PositiveAndAdverseReportsRetained=$true;
    exactHarnessControlledComparisons=3;sourceCandidateShapes=1;harnessVersionsMeasured=1;comparisonBudgetClosed=$true;
    sourceAndOwnerRestoredByteExact=$true;fiveSelectedStatementsReverted=$true;performancePrJustified=$false;performancePrCreated=$false;
    historicalFinalEvaluationRemainsPreaduitPendingSnapshot=$true;publicationStillPending=$true}|
    ConvertTo-Json -Depth 6|Set-Content (Join-Path $run 'post-audit-decision.json')
Write-Output 'F006 five statements and original owner DLL/PDB restored byte-exact;tracked source clean. Audited conservative no-gain,all evidence retained,no speculative PR.'
