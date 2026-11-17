$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F010'
$retired=Join-Path $run 'preparation-attempts\candidate-1'
if(Test-Path $retired){throw 'Preserve actual first candidate preparation.'}
$execution=Get-Content (Join-Path $run 'builds\candidate\execution.json') -Raw|ConvertFrom-Json
if($execution.commands.Count-ne4 -or $execution.commands[-1].label-cne'owning-test-build' -or
    $execution.commands[-1].actualExitCode-ne1 -or
    @($execution.commands|Select-Object -First 3|Where-Object actualExitCode -NE 0).Count)
{throw 'Only actual xUnit2017 test-build preparation failure may be retired.'}
New-Item $retired -ItemType Directory -Force|Out-Null
foreach($item in @(@{source='src\Security\Authorization\Core\src\ClaimsAuthorizationRequirement.cs';name='ClaimsAuthorizationRequirement.cs'},
    @{source='src\Security\Authorization\test\DefaultAuthorizationServiceTests.cs';name='DefaultAuthorizationServiceTests.cs'}))
{Copy-Item $item.source (Join-Path $retired $item.name)}
$mappings=@()
foreach($relative in 'builds\candidate','tests\candidate')
{
    $from=Join-Path $run $relative;$to=Join-Path $retired $relative
    $files=@(Get-ChildItem $from -Recurse -File|ForEach-Object{
        @{path=[IO.Path]::GetRelativePath($from,$_.FullName);bytes=$_.Length;sha256=(Get-FileHash $_.FullName).Hash}})
    New-Item (Split-Path $to) -ItemType Directory -Force|Out-Null
    Move-Item $from $to
    foreach($file in $files)
    {if((Get-FileHash (Join-Path $to $file.path)).Hash-cne$file.sha256){throw 'Actual candidate preparation bytes changed during retirement.'}}
    $mappings+=@{from=$relative;to=[IO.Path]::GetRelativePath($run,$to);files=$files}
}
[ordered]@{candidate='F010';preparation=1;phase='candidate';outcome='All3 private candidate owner builds passed with zero warnings/errors;test build failed xUnit2017 on2 direct Assert.True(HashSet.Contains(...)) precondition assertions. No tests launched and no timing.';
    nativeExitCode=1;comparisonsSpent=0;ownerSourceSha256=(Get-FileHash (Join-Path $retired 'ClaimsAuthorizationRequirement.cs')).Hash;
    testSourceSha256=(Get-FileHash (Join-Path $retired 'DefaultAuthorizationServiceTests.cs')).Hash;byteExactMovedMappings=$mappings;
    repair='Use explanatory Boolean locals to distinguish native HashSet.Contains preconditions from IEnumerable membership assertions. Assert.Contains would exercise the wrong comparer or reimplemented enumerator in these2 deliberately divergent cases;no suppression or weaker expectation.'}|
    ConvertTo-Json -Depth 10|Set-Content (Join-Path $retired 'retirement.json')
Write-Output 'F010 first candidate3 successful builds/source bytes and xUnit2017 failure retained;reuse unchanged owner compilation after test-only precondition clarification,no timing spent.'
