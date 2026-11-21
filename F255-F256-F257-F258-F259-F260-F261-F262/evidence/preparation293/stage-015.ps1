$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'capture-library-009.ps1')
$pins = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'source-role-pins-007.json')) | ConvertFrom-Json
$oldTree = @([IO.File]::ReadAllText((Join-Path $PSScriptRoot 'all-tree-metadata-011.json')) | ConvertFrom-Json -Depth 30)
$newRows = @()
foreach ($role in @('Original','ObservedDefault'))
{
    $label = if ($role -ceq 'Original') { 'r008-original-guidance-doc-metadata' } else { 'r009-default-guidance-doc-metadata' }
    $raw = Invoke-SourceRoot $label 'git' @('--no-pager','-c','core.quotepath=false','ls-tree','-z',$pins.$role,'--','docs/CrossCuttingGuidance.md')
    foreach ($record in [Text.Encoding]::UTF8.GetString($raw).Split([char]0))
    {
        if ($record.Length -eq 0) { continue }
        if ($record -notmatch '(?s)^(?<mode>[0-7]{6}) (?<type>\S+) (?<oid>[0-9a-f]{40})\t(?<path>.+)$') { throw 'Unexpected additional metadata framing' }
        $newRows += [ordered]@{ role = $role; commit = $pins.$role; mode = $Matches.mode; type = $Matches.type; blob = $Matches.oid; path = $Matches.path; provenanceRoot = $label }
    }
}
Save-NewJson 'additional-guidance-metadata-015.json' $newRows
if ($newRows.Count -ne 2) { throw 'Referenced cross-cutting guidance body not established in both immutable roles; stop without guessed replacement' }
Save-NewJson 'all-tree-metadata-015.json' (@($oldTree) + $newRows)
$oldLibrary = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'capture-bodies-012.ps1'))
$newLibrary = $oldLibrary.Replace('all-tree-metadata-011.json','all-tree-metadata-015.json')
if ($newLibrary -ceq $oldLibrary) { throw 'No new whole-body library metadata binding' }
Save-NewBytes 'capture-bodies-015.ps1' ([Text.UTF8Encoding]::new($false).GetBytes($newLibrary))
$stats = @()
$allRows = @()
foreach ($role in @('Original','ObservedDefault'))
{
    $baselinePath = Join-Path $PSScriptRoot ('bodies\' + $role + '\src\ProjectTemplates\test\Templates.Tests\template-baselines.json.raw')
    $baselineBytes = [IO.File]::ReadAllBytes($baselinePath)
    $baseline = [Text.Encoding]::UTF8.GetString($baselineBytes).TrimStart([char]0xFEFF) | ConvertFrom-Json -AsHashtable -Depth 100
    $rows = @()
    foreach ($template in $baseline.GetEnumerator())
    {
        foreach ($scenario in $template.Value.GetEnumerator())
        {
            $files = @($scenario.Value['Files'])
            if (@($files | Where-Object { $_ -isnot [string] }).Count -ne 0) { throw 'Non-string expected file entry' }
            $distinct = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
            $duplicates = [Collections.Generic.List[string]]::new()
            $ignored = [Collections.Generic.List[string]]::new()
            foreach ($file in $files)
            {
                if (-not $distinct.Add($file)) { $duplicates.Add($file) }
                if ($file.EndsWith('.csproj',[StringComparison]::Ordinal) -or $file.EndsWith('.fsproj',[StringComparison]::Ordinal) -or $file.EndsWith('.props',[StringComparison]::Ordinal) -or $file.EndsWith('.sln',[StringComparison]::Ordinal) -or $file.EndsWith('.slnx',[StringComparison]::Ordinal) -or $file.EndsWith('.targets',[StringComparison]::Ordinal) -or $file.StartsWith('bin/',[StringComparison]::Ordinal) -or $file.StartsWith('obj/',[StringComparison]::Ordinal) -or $file.Contains('/bin/',[StringComparison]::Ordinal) -or $file.Contains('/obj/',[StringComparison]::Ordinal)) { $ignored.Add($file) }
            }
            $row = [ordered]@{ role = $role; template = $template.Key; scenario = $scenario.Key; arguments = $scenario.Value['Arguments']; expectedFileCount = $files.Count; distinctOrdinalExpectedFileCount = $distinct.Count; duplicateExpectedFiles = @($duplicates.ToArray()); ignoredByGeneratedMembershipPredicate = @($ignored.ToArray()); baselineEntriesEligibleForMembership = $files.Count - $ignored.Count; generatedFileCountNotObserved = $true }
            $rows += [pscustomobject]$row
            $allRows += $row
        }
    }
    $counts = @($rows.expectedFileCount | Sort-Object)
    $median = if ($counts.Count % 2 -eq 1) { $counts[[int][Math]::Floor($counts.Count/2)] } else { ($counts[$counts.Count/2-1] + $counts[$counts.Count/2])/2 }
    $stats += [ordered]@{
        role = $role
        sourceSha256 = (Get-BytesSha256 $baselineBytes)
        templateFamilies = $baseline.Count
        declaredTheoryRows = $rows.Count
        totalExpectedEntries = ($rows.expectedFileCount | Measure-Object -Sum).Sum
        minExpectedEntries = $counts[0]
        medianExpectedEntries = $median
        maxExpectedEntries = $counts[-1]
        rowsWithDuplicates = @($rows | Where-Object { $_.duplicateExpectedFiles.Count -gt 0 }).Count
        totalEligibleBaselineEntries = ($rows.baselineEntriesEligibleForMembership | Measure-Object -Sum).Sum
        minRows = @($rows | Where-Object { $_.expectedFileCount -eq $counts[0] } | Select-Object -First 2)
        maxRows = @($rows | Where-Object { $_.expectedFileCount -eq $counts[-1] } | Select-Object -First 2)
        countsByTemplate = @($rows | Group-Object template | ForEach-Object { [ordered]@{ template = $_.Name; rows = $_.Count; min = ($_.Group.expectedFileCount | Measure-Object -Minimum).Minimum; max = ($_.Group.expectedFileCount | Measure-Object -Maximum).Maximum } })
        boundary = 'Whole checked-in baseline JSON parsed statically; not observed generated files, discovery, execution, elapsed time or performance'
    }
}
Save-NewJson 'baseline-rows-015.json' $allRows
Save-NewJson 'baseline-cardinality-015.json' $stats
$sharedNames = @($oldTree | Where-Object { $_.role -ceq 'Original' -and $_.path -match '^src/ProjectTemplates/(Shared/[^/]+|TestInfrastructure/[^/]+|test/Templates.Tests/[^/]+)$' } | ForEach-Object { $_.path })
Save-NewJson 'bounded-infrastructure-filenames-015.json' $sharedNames
[Console]::WriteLine(($stats | ConvertTo-Json -Depth 12))
[Console]::WriteLine(($sharedNames | ConvertTo-Json))
