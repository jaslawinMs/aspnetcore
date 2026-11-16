param([ValidateSet('original','candidate1')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$directory=Join-Path $run "tests\$Variant"
if ((Test-Path $directory) -or (git branch --show-current).Trim() -cne 'autoperf/F118-url-resolution-writer' -or
    (git rev-parse HEAD).Trim() -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5') {throw 'Exact independent baseline branch/new owning-test run required.'}
$changes=@(git diff --name-only)
if (($Variant -ceq 'original' -and $changes.Count) -or
    ($Variant -ceq 'candidate1' -and @($changes|Where-Object {$_ -notin 'src/Mvc/Mvc.Razor/src/TagHelpers/UrlResolutionTagHelper.cs','src/Mvc/Mvc.Razor/test/TagHelpers/UrlResolutionTagHelperTest.cs'}).Count)) {throw 'Only planned exact source/test seam permitted.'}
New-Item -ItemType Directory -Path $directory|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$commands=[System.Collections.Generic.List[object]]::new()
function Invoke-Dotnet([string]$Label,[string[]]$Arguments)
{
    $start=[DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $directory "$Label.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{label=$Label;entryPoint='dotnet';arguments=$Arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')})
    [ordered]@{candidate='F118';variant=$Variant;commands=$commands}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8

    return $code
}
$project='src\Mvc\Mvc.Razor\test\Microsoft.AspNetCore.Mvc.Razor.Test.csproj'
$filter='FullyQualifiedName~Microsoft.AspNetCore.Mvc.Razor.TagHelpers.UrlResolutionTagHelperTest'
$arguments=@('test',$project,'--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','--filter',$filter,'--list-tests','-v:quiet')
$code=Invoke-Dotnet 'discovery-initial' $arguments
$discoveryLog='discovery-initial.log'
if ($code)
{
    if ((Get-Content (Join-Path $directory $discoveryLog) -Raw) -notmatch 'NETSDK1004|NETSDK1005|NETSDK1064') {Get-Content (Join-Path $directory $discoveryLog) -Tail 35;throw 'Scoped discovery failed for a non-missing-package reason;preserve this run.'}
    $code=Invoke-Dotnet 'restore-after-missing-assets' @('restore',$project,'--disable-parallel','-p:UseIisNativeAssets=false','-v:quiet')
    if ($code) {throw 'Actual missing-assets restore failed.'}
    $code=Invoke-Dotnet 'discovery-after-restore' $arguments;$discoveryLog='discovery-after-restore.log'
    if ($code) {Get-Content (Join-Path $directory $discoveryLog) -Tail 35;throw 'Scoped discovery still failed after missing-asset restoration.'}
}
$discovered=@(Get-Content (Join-Path $directory $discoveryLog)|ForEach-Object {if ($_ -match '^\s+(Microsoft\.AspNetCore\..+)$') {$Matches[1]}})
if ($discovered.Count -lt 40 -or @($discovered|Sort-Object -Unique).Count -ne $discovered.Count) {throw 'Positive unique exact owning discovery required.'}
$trxName="owning-$Variant.trx"
$code=Invoke-Dotnet 'owning-tests' @('test',$project,'--no-restore','--no-build','-c','Release','-m:2','-p:UseIisNativeAssets=false',
    '--filter',$filter,'--logger',"trx;LogFileName=$trxName",'--results-directory',$directory,'-v:minimal')
if ($code) {Get-Content (Join-Path $directory 'owning-tests.log') -Tail 40;throw 'Actual owning tests failed;never silently rerun.'}
$output='C:\src\aspnetcore\artifacts\bin\Microsoft.AspNetCore.Mvc.Razor.Test\Release\net12.0'
$image=Join-Path $directory 'image'
New-Item -ItemType Directory -Path $image|Out-Null
$owners=@('Microsoft.AspNetCore.Mvc.Razor','Microsoft.AspNetCore.Razor.Runtime','Microsoft.AspNetCore.Razor',
    'Microsoft.AspNetCore.Html.Abstractions','Microsoft.AspNetCore.Mvc.Core','Microsoft.Extensions.ObjectPool')
$names=@('Microsoft.AspNetCore.Mvc.Razor.Test.dll','Microsoft.AspNetCore.Mvc.Razor.Test.pdb',
    'Microsoft.AspNetCore.Mvc.Razor.Test.deps.json','Microsoft.AspNetCore.Mvc.Razor.Test.runtimeconfig.json')+
    @($owners|ForEach-Object {"$_.dll";"$_.pdb"})
$images=@(foreach ($name in $names)
{
    $file=Join-Path $output $name
    Copy-Item $file (Join-Path $image $name)
    [pscustomobject]@{file=$name;bytes=(Get-Item $file).Length;sha256=(Get-FileHash $file).Hash}
})
[xml]$trx=Get-Content (Join-Path $directory $trxName) -Raw
$results=@($trx.TestRun.Results.UnitTestResult);$definitions=@($trx.TestRun.TestDefinitions.UnitTest);$entries=@($trx.TestRun.TestEntries.TestEntry)
if ($definitions.Count -ne $discovered.Count -or $entries.Count -ne $results.Count -or
    @(Compare-Object @($discovered|Sort-Object) @($definitions.name|Sort-Object)).Count -or
    @($results.executionId|Sort-Object -Unique).Count -ne $results.Count) {throw 'Exact discovery/definition/expanded result sets differ;repair only the audit,not the completed test run.'}
foreach ($definition in $definitions)
{
    $rows=@($results|Where-Object testId -CEQ $definition.id)
    if ($rows.Count -ne 1 -or $definition.Execution.id -cne $rows[0].executionId -or $definition.name -cne $rows[0].testName) {throw 'This string-data class requires one exact result per discovered row.'}
}
$rows=@(foreach ($row in $results)
{
    $entry=@($entries|Where-Object {$_.testId -ceq $row.testId -and $_.executionId -ceq $row.executionId})
    if ($row.outcome -cne 'Passed' -or $entry.Count -ne 1 -or [TimeSpan]::Parse($row.duration).Ticks -le 0) {throw 'Every discovered row must pass with positive duration/exact execution IDs,zero skips.'}
    [pscustomobject]@{testName=$row.testName;testId=$row.testId;executionId=$row.executionId;outcome=$row.outcome;duration=$row.duration}
})
[ordered]@{
    candidate='F118';variant=$Variant;actualRows=$rows.Count;discovered=$discovered.Count;allPassed=$true;skipped=0;rows=$rows
    project=$project;filter=$filter;discoveryLog=$discoveryLog;trx=$trxName;trxSha256=(Get-FileHash (Join-Path $directory $trxName)).Hash
    capturedTestAndProducerImage=$images;imageRelative='image'
    note='Exact existing UrlResolutionTagHelperTest rows,all result/definition/entry IDs,names,positive durations and zero skips. Images captured from actual tested output before harness build;not an in-test full loaded-closure trace.'
}|ConvertTo-Json -Depth 11|Set-Content (Join-Path $directory 'test-audit.json') -Encoding utf8
Get-Content (Join-Path $directory 'owning-tests.log') -Tail 7
Write-Output "F118:$Variant all$($rows.Count) actual discovered owning rows passed,zero skips;actual tested owner/producer images captured."
