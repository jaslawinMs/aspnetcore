$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F115'
$directory=Join-Path $run 'tests\original'
if (Test-Path $directory) {throw 'Never overwrite F115 test attempts.'}
if ((git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or
    (git branch --show-current).Trim() -cne 'autoperf/F115-list-element-boxing' -or
    @(git status --porcelain --untracked-files=no).Count) {throw 'Independent unchanged baseline required.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$commands=[System.Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F115';commands=$commands}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
    if ($code) {Get-Content (Join-Path $directory "$Label.log") -Tail 30;throw "Actual F115 command failed:$Label"}
}
$owner='src\Features\JsonPatch.SystemTextJson\src\Microsoft.AspNetCore.JsonPatch.SystemTextJson.csproj'
$project='src\Features\JsonPatch.SystemTextJson\test\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.csproj'
Invoke-Dotnet 'owner-rebuild' @('build',$owner,'--no-restore','-c','Release','-t:Rebuild','-m:2','-p:BuildProjectReferences=false','-p:UseIisNativeAssets=false','-v:quiet')
$filter='FullyQualifiedName~Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ListAdapterTest|FullyQualifiedName~Microsoft.AspNetCore.JsonPatch.SystemTextJson.Internal.ObjectVisitorTest|FullyQualifiedName~Microsoft.AspNetCore.JsonPatch.SystemTextJson.IntegrationTests.AnonymousObjectIntegrationTest'
Invoke-Dotnet 'discovery' @('test',$project,'--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter',$filter,'--list-tests','-v:quiet')
$discovered=@(Get-Content (Join-Path $directory 'discovery.log')|ForEach-Object {if ($_ -match '^\s+(Microsoft\.AspNetCore\.JsonPatch\.SystemTextJson\..+)$') {$Matches[1]}})
if ($discovered.Count -lt 50 -or @($discovered|Sort-Object -Unique).Count -ne $discovered.Count) {throw 'Positive unique scoped discovery required;retain actual discovery log.'}
Invoke-Dotnet 'owning-tests' @('test',$project,'--no-restore','--no-build','-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter',$filter,'--logger','trx;LogFileName=owning-original.trx','--results-directory',$directory,'-v:minimal')
[xml]$trx=Get-Content (Join-Path $directory 'owning-original.trx') -Raw
$results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
if ($results.Count -ne $discovered.Count -or $definitions.Count -ne $discovered.Count -or $entries.Count -ne $discovered.Count -or
    @($results.testId|Sort-Object -Unique).Count -ne $discovered.Count -or
    @(Compare-Object @($discovered|Sort-Object) @($results.testName|Sort-Object)).Count) {throw 'Every discovered exact row must have exactly one actual result/definition/entry.'}
$rows=@(foreach ($result in $results)
{
    $definition=@($definitions|Where-Object id -CEQ $result.testId)
    $entry=@($entries|Where-Object {$_.testId -ceq $result.testId -and $_.executionId -ceq $result.executionId})
    if ($result.outcome -cne 'Passed' -or $definition.Count -ne 1 -or $entry.Count -ne 1 -or
        $definition[0].Execution.id -cne $result.executionId -or $definition[0].name -cne $result.testName -or
        [TimeSpan]::Parse($result.duration).Ticks -le 0) {throw 'Every actual parameter row must pass with positive duration/exact IDs.'}
    [pscustomobject]@{testName=$result.testName;testId=$result.testId;executionId=$result.executionId;outcome=$result.outcome;duration=$result.duration}
})
foreach ($required in 'ListAdapterTest.Get(','ListAdapterTest.TryTraverse_JsonArray_ValidNumericIndex_ReturnsElement',
    'ListAdapterTest.Test_DoesNotThrowException_IfTestIsSuccessful','ObjectVisitorTest.Visit_ValidPathToArray_ReturnsListAdapter(',
    'AnonymousObjectIntegrationTest.DeeplyNestedArrayTraversal_ReplaceSucceeds')
{
    if (-not @($rows|Where-Object {$_.testName.Contains($required)}).Count) {throw "Required real reader/traversal row missing:$required"}
}
$output='C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests\Release\net12.0'
New-Item -ItemType Directory -Path (Join-Path $directory 'image') -Force|Out-Null
$images=@(foreach ($name in 'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.dll','Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.pdb',
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.deps.json','Microsoft.AspNetCore.JsonPatch.SystemTextJson.Tests.runtimeconfig.json',
    'Microsoft.AspNetCore.JsonPatch.SystemTextJson.dll','Microsoft.AspNetCore.JsonPatch.SystemTextJson.pdb')
{
    $file=Join-Path $output $name
    Copy-Item $file (Join-Path $directory "image\$name")
    [pscustomobject]@{file=$name;bytes=(Get-Item $file).Length;sha256=(Get-FileHash $file).Hash}
})
[ordered]@{candidate='F115';discovered=$discovered.Count;passed=$rows.Count;failed=0;skipped=0;everyDiscoveredNameMatched=$true
    everyRowPositiveDurationAndExactIds=$true;sourceChanged=$false;rows=$rows;capturedTestAndOwnerImage=$images
    trxSha256=(Get-FileHash (Join-Path $directory 'owning-original.trx')).Hash
    note='Three established owning classes;actual public JsonArray traversal regression and every discovered parameter row. Image metadata is not a full-test-closure/in-test loaded-hash proof.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Get-Content (Join-Path $directory 'owning-tests.log') -Tail 8
Write-Output "F115:$($rows.Count) discovered/actual scoped owning rows passed with positive durations,0skips;original owner rebuilt."
