$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F022'
$published = Join-Path $PSScriptRoot 'autoperf-published-results'
$target = Join-Path $published 'F022'
$source = Get-Content -Raw -LiteralPath (Join-Path $run 'source-publication\verified-source-publication.json') | ConvertFrom-Json
$decision = Get-Content -Raw -LiteralPath (Join-Path $run 'decision.json') | ConvertFrom-Json
$budget = Get-Content -Raw -LiteralPath (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
if ((Test-Path -LiteralPath $target) -or @(git -C $published status --porcelain).Count -or
    !$source.actualRemoteRefVerified -or !$source.onlyIntendedTwoSourceFilesCommitted -or
    !$decision.performancePrJustified -or $decision.sourceCommit -ne $source.commit -or
    !$budget.comparison_budget_closed -or $budget.actual_comparisons_started -ne 3)
{
    throw 'Require a fresh destination,clean results checkout and qualified fully published source with closed budget.'
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
    if ((Get-FileHash -LiteralPath $destination).Hash -ne $sha)
    {
        throw "Copied bytes differ:$Relative"
    }
    $copies.Add([ordered]@{
        original = $File; destination = $Relative; kind = $Kind; bytes = (Get-Item -LiteralPath $File).Length; sha256 = $sha
    })
}
$all = @(Get-ChildItem -LiteralPath $run -Recurse -File -Force)
foreach ($file in $all)
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
        '.targets','.cmd','.slnx','.sarif')
    {
        throw "Unclassified evidence artifact:$relative"
    }
    Copy-Exact $file.FullName $relative 'actual-run'
}
foreach ($file in @(Get-ChildItem -LiteralPath $PSScriptRoot -File |
    Where-Object { $_.Name -like 'F022-*' -and $_.Extension -in '.ps1','.mjs' }))
{
    Copy-Exact $file.FullName $file.Name 'session-driver'
}
foreach ($mapping in @(
    @((Join-Path $PSScriptRoot 'F022-package-gitattributes.txt'),'.gitattributes'),
    @('C:\src\aspnetcore\.github\pull_request_template.md','pr-template-source.md'),
    @('C:\src\aspnetcore\docs\BuildFromSource.md','BuildFromSource-captured.md'),
    @('C:\src\aspnetcore\LICENSE.txt','LICENSE.txt')
))
{
    Copy-Exact $mapping[0] $mapping[1] 'publication-source'
}
$copies | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'authoritative-copy-manifest.json') -Encoding utf8NoBOM
$omissions | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $target 'omitted-file-manifest.json') -Encoding utf8NoBOM
$readme = (Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'F022-results-readme.md')).
    Replace('@SOURCE_COMMIT@',$source.commit).
    Replace('@COMPARISON@',(Get-Content -Raw -LiteralPath (Join-Path $run 'comparison.md')).Trim())
if ($readme -match '@SOURCE_COMMIT@|@COMPARISON@')
{
    throw 'Unfilled evidence README placeholder.'
}
$readme | Set-Content (Join-Path $target 'README.md') -Encoding utf8NoBOM -NoNewline
$commands = [Collections.Generic.List[string]]::new()
$commands.Add('# F022 exact recorded commands and actual outcomes')
$commands.Add('')
$commands.Add('Historical evidence only. Three comparisons are permanently closed;do not replay timing or publication drivers. Activate the repository SDK before every dotnet command. Expected negative controls,pre-assertion blockers and formatting boundaries are retained,not relabeled passed.')
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
$commands.Add('Original83:82pass plus the expected19200-byte repeated-resource red. Selected83and expanded96pass,0skips. Strong-key diagnostic:only lifetime red. Actual stable-PID body delta plus live discovery passes;cache-active-under-updates diagnostic fails LIVE_METADATA_PATH_REQUIRED,not stale classification. C#/VB declaration edits unsupported.')
$commands.Add('')
$commands.Add('Initial native-IIS graph stops before ExpressionHelperTest assertions on missing ANCM;actual managed owner passes with UseIisNativeAssets=false. Product whitespace passes;root test retains original BOM CHARSET,original reproduces it,and encoding-only selected mirror passes. No root-file all-green formatting claim.')
$commands.Add('')
$commands.Add('All3comparisons complete,84nativewarmmeans/18firstobservations;initial metadata label/flag correction retained. Relocated fresh standalone Characterize actually passes14wrappers/42contracts with no fourth comparison. Public timing attribution/cold-start/default-SDK integration/native IIS/other OS/runtime/AOT/production frequency remain bounded as README describes.')
$commands.Add('')
$commands.Add('## Copied read-only raw evidence audit')
$commands.Add('```powershell')
$commands.Add('node .\F022-audit-measurements.mjs . --verify')
$commands.Add('```')
$commands.Add('Actual copied-capsule result:exit0,84retained raw means independently recomputed,24nativeprofiles/18coldobservations/source/witness/derived-output checks pass. No omitted binary image is reopened,no timing executed.')
$commands | Set-Content (Join-Path $target 'validation-commands.md') -Encoding utf8NoBOM
& node (Join-Path $target 'F022-audit-measurements.mjs') $target --verify `
    1> (Join-Path $PSScriptRoot 'F022-copied-audit.stdout') 2> (Join-Path $PSScriptRoot 'F022-copied-audit.stderr')
if ($LASTEXITCODE -ne 0)
{
    throw 'Copied standalone text-only audit failed;retain the package and inspect without more timing.'
}
foreach ($copy in $copies)
{
    if ((Get-FileHash -LiteralPath (Join-Path $target $copy.destination)).Hash -ne $copy.sha256)
    {
        throw 'A copied authoritative file was changed during packaging.'
    }
}
[ordered]@{
    candidate = 'F022'; actualByteExactCopies = $copies.Count; actualHashedOmissions = $omissions.Count
    actualCopiedPortableAuditPassed = $true; actualRawMeansRecomputed = 84
    actualComparisons = 3; actualTimingProfiles = 24; actualFirstObservations = 18
    actualSourceCommit = $source.commit; actualSourceFiles = 2
    actualFreshRelocatedSelectedCharacterizationPassed = $true; fourthComparisonExecuted = $false
    onlyTextualEvidencePublished = $true; originalBomPreserved = $true; mergeReady = $false
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $target 'raw-file-copy-verification.json') -Encoding utf8NoBOM
$count = @(Get-ChildItem -LiteralPath $target -Recurse -File -Force).Count
if ($count -ne $copies.Count + 5)
{
    throw 'Actual immutable capsule count differs from copies plus five generated receipts.'
}
$count | Set-Content (Join-Path $PSScriptRoot 'F022-immutable-file-count.txt') -Encoding utf8NoBOM
Write-Output "F022:$count immutable files,$($copies.Count) exact copies,$($omissions.Count) hashed omissions;copied audit passed."
