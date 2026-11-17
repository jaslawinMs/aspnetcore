$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F028'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F028'
$source = Get-Content -Raw -LiteralPath (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw -LiteralPath (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw -LiteralPath (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
$selected = Get-Content -Raw -LiteralPath (Join-Path $run 'validation\selected-owning\verified-result.json') | ConvertFrom-Json
$fresh = Get-Content -Raw -LiteralPath (Join-Path $run 'reproduction-characterized\verified-fresh-consumer.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $target) -or @(git -C $published status --porcelain).Count -or
    !$source.actualAllRemoteSourceRefsAndBlobsVerified -or
    $decision.disposition -ne 'qualified-default-types-scoped-fork-draft' -or
    !$budget.comparison_budget_closed -or $budget.actual_comparisons_started -ne 1 -or
    $budget.actual_comparisons_completed -ne 1 -or $selected.actualPassed -ne 138 -or
    $selected.actualExpectedRed -ne 0 -or $selected.actualSkipped -ne 0 -or
    $fresh.mode -ne 'Characterize' -or $fresh.actualTimingPerformed)
{
    throw 'Require a fresh destination,clean results checkout,verified source,qualified result,green owning/fresh checks and permanently closed budget.'
}
$copies = [Collections.Generic.List[object]]::new()
$omissions = [Collections.Generic.List[object]]::new()
function Copy-Exact([string]$File, [string]$Relative, [string]$Kind)
{
    $destination = Join-Path $target $Relative
    if (Test-Path -LiteralPath $destination)
    {
        throw "Refuse to overwrite authoritative evidence:$Relative"
    }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destination)) | Out-Null
    Copy-Item -LiteralPath $File -Destination $destination
    $sha = (Get-FileHash -LiteralPath $File).Hash
    if ((Get-FileHash -LiteralPath $destination).Hash -cne $sha)
    {
        throw "Copied bytes differ:$Relative"
    }
    $copies.Add([ordered]@{
        original = $File; destination = $Relative; kind = $Kind; bytes = (Get-Item -LiteralPath $File).Length; sha256 = $sha
    })
}
foreach ($file in @(Get-ChildItem -LiteralPath $run -Recurse -File -Force))
{
    $relative = [IO.Path]::GetRelativePath($run, $file.FullName)
    $generated = $relative -match '(^|\\)(bin|obj|image|images|\.git|node_modules)(\\|$)'
    if ($generated -or $file.Extension -in '.dll','.exe','.pdb','.binlog','.nupkg','.snupkg')
    {
        $omissions.Add([ordered]@{
            original = $relative; bytes = $file.Length; sha256 = (Get-FileHash -LiteralPath $file.FullName).Hash
            reason = 'Compiled,restore,build,package or frozen consumer image omitted;exact hashes and actual textual native/source/test evidence remain.'
        })
        continue
    }
    if ($file.Extension -notin '.cs','.csproj','.vb','.vbproj','.json','.trx','.log','.txt','.html','.md','.csv',
        '.patch','.diff','.ps1','.mjs','.stdout','.stderr','.config','.xml','.nuspec','.editorconfig','.props',
        '.targets','.cmd','.slnx','.sarif','.baseline','.current','.working')
    {
        throw "Unclassified evidence artifact:$relative"
    }
    Copy-Exact $file.FullName $relative 'actual-run'
}
foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -File |
    Where-Object { $_.Name -like 'F028-*' -and $_.Extension -in '.ps1','.mjs' }))
{
    Copy-Exact $file.FullName $file.Name 'session-driver'
}
foreach ($mapping in @(
    @((Join-Path $PSScriptRoot 'F028-package-gitattributes.txt'),'.gitattributes'),
    @((Join-Path $PSScriptRoot 'F028-issue-template.md'),'publication-inputs\issue-template.md'),
    @((Join-Path $PSScriptRoot 'F028-pr-detail-template.md'),'publication-inputs\pr-detail-template.md'),
    @('C:\src\aspnetcore\.github\pull_request_template.md','pr-template-source.md'),
    @('C:\src\aspnetcore\docs\BuildFromSource.md','BuildFromSource-captured.md'),
    @('C:\src\aspnetcore\LICENSE.txt','LICENSE.txt')
))
{
    Copy-Exact $mapping[0] $mapping[1] 'publication-source'
}
$copies | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'authoritative-copy-manifest.json') -Encoding utf8NoBOM
$omissions | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'omitted-file-manifest.json') -Encoding utf8NoBOM
$readme = (Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'F028-results-readme.md')).
    Replace('@SOURCE_COMMIT@',$source.actualSourceCommit).
    Replace('@COMPARISON@',(Get-Content -Raw -LiteralPath (Join-Path $run 'comparison.md')).Trim())
if ($readme -match '@SOURCE_COMMIT@|@COMPARISON@')
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F028 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical evidence only. One comparison met the declared substantial-primary threshold;all remaining slots are permanently closed. Do not replay historical timing or publication drivers. Activate the repository SDK before every dotnet command. Preserve expected resource reds and the initial failed untimed attempt as failures,not passes.')
$commands.Add('')
function Quote([string]$Value)
{
    return "'" + $Value.Replace("'","''") + "'"
}
foreach ($copy in $copies | Where-Object { $_.kind -eq 'actual-run' -and $_.destination.EndsWith('.json') } | Sort-Object destination)
{
    $data = Get-Content -Raw -LiteralPath (Join-Path $target $copy.destination) | ConvertFrom-Json
    $records = if ($data -is [array]) { @($data) } elseif ($data.commands) { @($data.commands) } else { @($data) }
    foreach ($record in $records)
    {
        if (!$record.executable -or !$record.arguments -or 'actualExitCode' -notin $record.PSObject.Properties.Name)
        {
            continue
        }
        $commands.Add("## $($copy.destination): actual exit$($record.actualExitCode)")
        $commands.Add('```powershell')
        if ($record.workingDirectory)
        {
            $commands.Add('Set-Location ' + (Quote $record.workingDirectory))
        }
        if ([IO.Path]::GetFileNameWithoutExtension($record.executable) -eq 'dotnet')
        {
            $commands.Add('. .\activate.ps1')
        }
        $commands.Add('& ' + (Quote $record.executable) + ' ' + (($record.arguments | ForEach-Object { Quote $_ }) -join ' '))
        $commands.Add('```')
        $commands.Add('')
    }
}
$commands.Add('## Interpretation')
$commands.Add('Original existing121/121pass. Initial expanded137pass+one73264/55832red had unequal mocked/real context accessor branches and is not isolated resource proof. Corrected expanded original137pass+one exact expected55832=55832resource red. Selected138/138pass,0skipped. All16focused preservation rows and121original rows pass independently;the one resource row changes red-to-green. Actual fresh XML outcomes/multiplicity and owner-image binding checked.')
$commands.Add('')
$commands.Add('Separate explicit owner build and targeted source/test repository whitespace check pass. Initial standalone build passed but untimed characterization failed with native exit-532462766 for missing Http.Features;the129-file consumer/prepared tree and raw failure are preserved. Added the direct manifest reference before any timing. Corrected standalone132-file closure builds0warnings/0errors;each owner passes10public wrappers/20values/18additional actual provider/override/update/pending/failure/metadata producers. Prepared authentication-result seam,not full login/HTTP/network.')
$commands.Add('')
$commands.Add('One actual comparison,6nativeprofiles/20raw warm rows/4first observations. Ordinary4scheme target24.1percent less time and104Bop less allocation;declared128scheme tail86.4percent less time. Derived controls5.7/6.5percent more time with no allocation benefit. All unfavorable controls/first observations retained. Stop rule met;remaining slots permanently closed. Fresh relocated standalone Characterize passes10/20/18 with no additional timing.')
$commands.Add('')
$commands.Add('## Copied read-only raw evidence audit')
$commands.Add('```powershell')
$commands.Add('node .\F028-audit-measurements.mjs . --verify')
$commands.Add('```')
$commands.Add('Actual copied-capsule result:exit0,all20raw retained means independently recomputed;6timing profiles/4first observations and copied source/metadata witnesses/derived outputs pass. No omitted native/runtime image is opened and no timing is executed.')
$commands | Set-Content (Join-Path $target 'validation-commands.md') -Encoding utf8NoBOM
& node (Join-Path $target 'F028-audit-measurements.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F028-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F028-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied standalone text-only audit failed;retain the package and inspect without more timing.'
}
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $target $copy.destination)).Hash -cne $copy.sha256)
    {
        throw 'A copied authoritative file was changed during packaging.'
    }
}
[ordered]@{
    candidate = 'F028'; actualByteExactCopies = $copies.Count; actualHashedOmissions = $omissions.Count
    actualCopiedPortableAuditPassed = $true; actualRawMeansRecomputed = 20
    actualComparisons = 1; actualTimingProfiles = 6; actualFirstObservations = 4
    actualSourceCommit = $source.actualSourceCommit; actualSourceFiles = 2
    actualFreshRelocatedSelectedCharacterizationPassed = $true; additionalComparisonExecuted = $false
    onlyTextualEvidencePublished = $true; mergeReady = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Actual immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F028-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F028:$count immutable files,$($copies.Count) exact copies,$($omissions.Count) hashed omissions;copied audit passed."
