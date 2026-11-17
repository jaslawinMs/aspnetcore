$ErrorActionPreference='Stop'
$repo='jaslawinMs/aspnetcore'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$capsule=Join-Path $output 'F010'
$immutable=(Get-Content (Join-Path $PSScriptRoot 'F010-results-commit.txt') -Raw).Trim()
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F010-immutable-file-count.txt') -Raw)
$source=Get-Content (Join-Path $capsule 'source-branch-publication.json') -Raw|ConvertFrom-Json
$remote=@(Get-Content (Join-Path $PSScriptRoot 'F010-remote-blob-verification.json') -Raw|ConvertFrom-Json)
$audit=Get-Content (Join-Path $capsule 'measurement-audit.json') -Raw|ConvertFrom-Json
if($remote.Count-ne$count -or @($remote|Where-Object {-not$_.verified_remote_blob}).Count -or
    -not$audit.auditPassed -or -not$audit.performancePrJustified -or -not$audit.budgetClosed -or $audit.successfulReports-ne66 -or
    $audit.pairedComparisons-ne3 -or -not$source.actualRemoteCanonicalBytesVerified){throw 'Actual immutable source/evidence and qualified audit must precede draft creation.'}
function Api([string]$Endpoint)
{
    $text=gh api $Endpoint
    if($LASTEXITCODE){throw "Actual GitHub retrieval failed:$Endpoint"}
    return ($text|ConvertFrom-Json)
}
$fork=Api "repos/$repo";$base=Api "repos/$repo/git/ref/heads/main";$head=Api "repos/$repo/git/ref/heads/$($source.branch)"
$results=Api "repos/$repo/git/ref/heads/autoperf-results";$comparison=Api "repos/$repo/compare/$($source.parent)...$($source.commit)"
if($fork.private -or -not$fork.fork -or $fork.parent.full_name-cne'dotnet/aspnetcore' -or
    $fork.default_branch-cne'main' -or $base.object.sha-cne$source.parent -or $head.object.sha-cne$source.commit -or
    $results.object.sha-cne$immutable -or $comparison.ahead_by-ne1 -or $comparison.files.Count-ne2 -or
    ($comparison.files.filename-join',')-cne'src/Security/Authorization/Core/src/ClaimsAuthorizationRequirement.cs,src/Security/Authorization/test/DefaultAuthorizationServiceTests.cs' -or
    ($comparison.files|Measure-Object additions -Sum).Sum-ne72 -or ($comparison.files|Measure-Object deletions -Sum).Sum-ne1){throw 'Actual fork-only source/base/evidence scope differs.'}
$evidence="https://github.com/$repo/blob/$immutable/F010"
$issueBody=(Get-Content (Join-Path $capsule 'issue-template.md') -Raw).Replace('@EVIDENCE@',$evidence)
$issueBodyPath=Join-Path $PSScriptRoot 'F010-issue-body.md';$issueBody|Set-Content $issueBodyPath -Encoding utf8
$issueUrlPath=Join-Path $PSScriptRoot 'F010-issue-url.txt'
if(Test-Path $issueUrlPath){$issueUrl=(Get-Content $issueUrlPath -Raw).Trim()}
else
{
    $issueArgs=@('issue','create','--repo',$repo,'--title','AutoPerf F010: existing claim-value set CPU tradeoff','--body-file',$issueBodyPath)
    $issueUrl=(gh @issueArgs|Out-String).Trim()
    if($LASTEXITCODE -or $issueUrl-notmatch'^https://github\.com/jaslawinMs/aspnetcore/issues/\d+$'){throw 'Inspect actual issue creation output before retrying.'}
    $issueUrl|Set-Content $issueUrlPath -Encoding ascii
}
$issueNumber=[int]([uri]$issueUrl).Segments[-1]
$issue=Api "repos/$repo/issues/$issueNumber"
if($issue.html_url-cne$issueUrl -or $issue.state-cne'open' -or $issue.body.TrimEnd()-cne$issueBody.TrimEnd()){throw 'Actual fork issue identity/body differs.'}
$issue|ConvertTo-Json -Depth 16|Set-Content (Join-Path $PSScriptRoot 'F010-tracking-issue.json') -Encoding utf8
function Quote([string]$Value){return "'"+$Value.Replace("'","''")+"'"}
$commands=[System.Collections.Generic.List[string]]::new()
function AddCommand([string]$Label,[object]$Record,[string]$Result)
{
    if($Record.actualExitCode-ne0){throw 'Selected successful command must have actually passed.'}
    $commands.Add("**$Label**");$commands.Add('```powershell');$commands.Add('. .\activate.ps1')
    $commands.Add($Record.entryPoint+' '+(($Record.arguments|ForEach-Object {Quote $_})-join' '));$commands.Add('```')
    $commands.Add("**Result: exit0;$Result**");$commands.Add('')
}
foreach($record in (Get-Content (Join-Path $capsule 'tests\original\execution.json') -Raw|ConvertFrom-Json).commands)
{
    AddCommand "Original:$($record.label)" $record $(if($record.label-ceq'owning-tests'){'214passed,0failed,0skipped=212area+2sentinels.'}else{'completed successfully.'})
}
foreach($record in (Get-Content (Join-Path $capsule 'preparation-attempts\candidate-1\builds\candidate\execution.json') -Raw|ConvertFrom-Json).commands|Where-Object label -Like 'fresh-owner-*')
{
    AddCommand "Candidate:$($record.label),exact unchanged owner outputs subsequently reused" $record 'zero warnings/errors.'
}
foreach($record in (Get-Content (Join-Path $capsule 'builds\candidate\execution.json') -Raw|ConvertFrom-Json).commands)
{
    $outcome=switch -CaseSensitive ($record.label)
    {
        'owning-tests' {'219passed,0failed,0skipped=217area+2sentinels;all5new rows checked.'}
        'legacy-characterization' {'39 actual native net462 public-service checks on Framework4.8.1.'}
        'standard-characterization' {'39 actual netstandard2 library public-service checks on net12 consumer.'}
        'primary-characterization-and-all-pdb-bindings' {'50 actual net12 checks,including11 actual timed Setup/task wrappers.'}
        'pack-with-existing-package-validation' {'actual successful ValidatePackageTask events subsequently verified by native binlog replay;no released-baseline claim.'}
        default {'completed successfully.'}
    }
    AddCommand "Candidate:$($record.label)" $record $outcome
}
foreach($record in (Get-Content (Join-Path $capsule 'builds\original\execution.json') -Raw|ConvertFrom-Json).commands|Where-Object label -In 'legacy-characterization','standard-characterization','primary-characterization-and-all-pdb-bindings')
{
    AddCommand "Original:$($record.label)" $record '39/39/50 actual final producer checks respectively;no legacy timing.'
}
foreach($number in 1,2,3)
{
    $execution=Get-Content (Join-Path $capsule "measurements\comparison-$number\comparison-execution.json") -Raw|ConvertFrom-Json
    foreach($record in $execution.profiles){AddCommand "Closed comparison$number/$($record.role)" $record '11 successful actual public-service BDN reports.'}
}
$commands.Add('```powershell');$commands.Add('node '+(Quote (Join-Path $capsule 'reproduce-analysis.mjs'))+' '+(Quote $capsule)+' --verify')
$commands.Add('```');$commands.Add('**Result: exit0;copied portable source/native-producer/TRX/raw-sample/GC/statistical-consistency audit passed. Omitted DLL/PDB/native/binlog/package images not rehashed.**')
$commands.Add('Complete native command arrays/outcomes and all retained failures: [validation-commands.md]('+ $evidence+'/validation-commands.md).')
$table=[regex]::Match((Get-Content (Join-Path $capsule 'README.md') -Raw),'(?ms)^\| Shape \|.*?(?=\r?\n\r?\n)').Value
if(-not$table){throw 'Complete11-case actual result table required.'}
$detail=(Get-Content (Join-Path $capsule 'pr-detail-template.md') -Raw).Replace('@EVIDENCE@',$evidence).
    Replace('@SOURCE_COMMIT@',$source.commit).Replace('@FILE_COUNT@',[string]$count).Replace('@RESULT_TABLE@',$table).Replace('@COMMANDS@',($commands-join"`n"))
$template=Get-Content 'C:\src\aspnetcore\.github\pull_request_template.md' -Raw
if($template-cne(Get-Content (Join-Path $capsule 'pr-template-source.md') -Raw)){throw 'Current repository PR template differs from inspected/captured template.'}
$title='AutoPerf F010: Use existing ordinal sets for claim values'
$body=$template.Replace('# {PR title}',"# $title").
    Replace('Summary of the changes (Less than 80 chars)','Use existing ordinal sets for claim-value membership').
    Replace('{Detail}',$detail).Replace('Fixes #{bug number} (in this specific format)',"Fixes jaslawinMs/aspnetcore#$issueNumber")
if($body.Length-gt65000 -or $body-match'@(EVIDENCE|COMMANDS|RESULT_TABLE|SOURCE_COMMIT|FILE_COUNT)@'){throw 'Complete bounded actual PR body required.'}
$bodyPath=Join-Path $PSScriptRoot 'F010-pr-body.md';$body|Set-Content $bodyPath -Encoding utf8
$prUrlPath=Join-Path $PSScriptRoot 'F010-pr-url.txt'
$browserPath=Join-Path $PSScriptRoot 'F010-browser-open.json'
if(Test-Path $prUrlPath){$prUrl=(Get-Content $prUrlPath -Raw).Trim()}
else
{
    $prArgs=@('pr','create','--repo',$repo,'--base','main','--head',$source.branch,'--draft','--title',$title,'--body-file',$bodyPath)
    $prUrl=(gh @prArgs|Out-String).Trim()
    if($LASTEXITCODE -or $prUrl-notmatch'^https://github\.com/jaslawinMs/aspnetcore/pull/\d+$'){throw 'Inspect actual draft output before retrying.'}
    $prUrl|Set-Content $prUrlPath -Encoding ascii
}
if(-not(Test-Path $browserPath))
{
    $requestedAt=[DateTimeOffset]::UtcNow.ToString('o')
    $browser=Start-Process -FilePath $prUrl -PassThru -ErrorAction Stop
    [ordered]@{candidate='F010';url=$prUrl;requested_at=$requestedAt;start_process_succeeded=$true;
        returned_process_id=$(if($browser){$browser.Id}else{$null});visual_browser_rendering_verified=$false;
        note='Actual newly created fork draft URL handed immediately to Windows default browser before subsequent remote-body verification;no visual rendering claim.'}|
        ConvertTo-Json -Depth 5|Set-Content $browserPath -Encoding utf8
}
$prNumber=[int]([uri]$prUrl).Segments[-1]
$pr=Api "repos/$repo/pulls/$prNumber"
if(-not$pr.draft -or $pr.state-cne'open' -or $pr.html_url-cne$prUrl -or $pr.head.repo.full_name-cne$repo -or $pr.base.repo.full_name-cne$repo -or
    $pr.base.ref-cne'main' -or $pr.base.sha-cne$source.parent -or $pr.head.ref-cne$source.branch -or $pr.head.sha-cne$source.commit -or
    $pr.body.TrimEnd()-cne$body.TrimEnd() -or $pr.title-cne$title){throw 'Actual fork draft/head/base/source/body identity differs.'}
$pr|ConvertTo-Json -Depth 18|Set-Content (Join-Path $PSScriptRoot 'F010-created-pr.json') -Encoding utf8
[ordered]@{candidate='F010';source_commit=$source.commit;immutable_evidence_commit=$immutable;tracking_issue=$issueUrl;draft_pr=$prUrl;
    actual_draft_head_base_body_verified=$true;issue_creation_arguments=$issueArgs;draft_creation_arguments=$prArgs;
    actual_browser_url_requested=$true;recorded_at=[DateTimeOffset]::UtcNow.ToString('o')}|
    ConvertTo-Json -Depth 9|Set-Content (Join-Path $PSScriptRoot 'F010-draft-publication.json') -Encoding utf8
Write-Output "Created/verified fork-only draft$prUrl;actual new URL opened immediately in default browser."
