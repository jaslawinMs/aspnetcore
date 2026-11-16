$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F109'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F109'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'A new F109 capsule and clean dedicated results checkout are required.'
}
$publication=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
$audit=Get-Content (Join-Path $run 'measurement-audit.json') -Raw|ConvertFrom-Json
if (-not $publication.sourceChanged -or $publication.trackedFilesChanged -ne 2 -or
    -not $publication.actualRemoteCanonicalBytesVerified -or $audit.actualBenchmarkOutcomes -ne 198 -or
    $audit.sourceComparisons -ne 3 -or -not $audit.comparisonBudgetClosed)
{
    throw 'Exact measured source/ref and full three-comparison audit must precede packaging.'
}
$omissions=@(foreach ($folder in Get-ChildItem $run -Recurse -Directory -Force|Where-Object Name -IEQ 'keys')
{
    if (-not $folder.FullName.StartsWith($run+'\',[StringComparison]::OrdinalIgnoreCase) -or
        ($folder.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Only resolved isolated fixture keys may be classified.' }
    foreach ($file in Get-ChildItem -LiteralPath $folder.FullName -File -Force)
    {
        [pscustomobject]@{
            original=[IO.Path]::GetRelativePath($run,$file.FullName);bytes=$file.Length
            sha256=(Get-FileHash $file.FullName).Hash;privateKeyBytesPublished=$false
        }
    }
})
if ($omissions.Count -ne 2) { throw 'Both active and failed-development synthetic private-key files must be excluded.' }
[ordered]@{
    candidate='F109';privateKeyFilesOmitted=$omissions.Count;allPrivateKeysDirectoriesExcluded=$true
    files=$omissions;publicAuditCanRehashOmittedKeyBytes=$false
    note='Hashes/identities only. No private XML bytes are copied,including the failed initial generator keys. Fresh replay regenerates one shared isolated fixture.'
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'omitted-private-key-identities.json') -Encoding utf8
$copies=[System.Collections.Generic.List[object]]::new()
$unique=@{}
function Copy-Exact([string]$Source,[string]$Relative,[string]$Kind,[string]$Original)
{
    $sha=(Get-FileHash -LiteralPath $Source).Hash
    $bytes=(Get-Item -LiteralPath $Source).Length
    if ($Kind -ceq 'run-input') { $Relative="input-blobs\$sha.json" }
    if (@($Relative -split '[\\/]'|Where-Object {$_ -ieq 'keys'}).Count -or [IO.Path]::GetExtension($Relative) -ieq '.xml')
    {
        throw 'No private key directory or XML may enter the public capsule.'
    }
    $target=Join-Path $destination $Relative
    if ($unique.ContainsKey($Relative))
    {
        if ($Kind -cne 'run-input' -or $unique[$Relative].sha256 -cne $sha -or $unique[$Relative].bytes -ne $bytes)
        {
            throw 'Unexpected authoritative destination collision.'
        }
    }
    else
    {
        if (Test-Path $target) { throw 'Never overwrite an actual copied artifact.' }
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
        Copy-Item -LiteralPath $Source -Destination $target
        $unique[$Relative]=[pscustomobject]@{sha256=$sha;bytes=$bytes}
    }
    if ((Get-FileHash $target).Hash -cne $sha) { throw "Copied raw bytes differ:$Original" }
    $copies.Add([pscustomobject]@{original=$Original;destination=$Relative;kind=$Kind;bytes=$bytes;sha256=$sha})
}
function Copy-Run([string]$Relative)
{
    $folder=if ($Relative) {Join-Path $run $Relative} else {$run}
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $relativePath=if ($Relative) {"$Relative\$($entry.Name)"} else {$entry.Name}
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -in 'binaries','bin','obj','node_modules','.git','image','keys') { continue }
            Copy-Run $relativePath
        }
        elseif ($entry.Name -ceq '.editorconfig' -or
            $entry.Extension -in '.cs','.csproj','.props','.targets','.resx','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1','.mjs')
        {
            $input=($relativePath.Contains('\inputs\') -or $relativePath.Contains('\case-inputs\')) -and $entry.Extension -ceq '.json'
            Copy-Exact $entry.FullName $relativePath $(if ($input) {'run-input'} else {'run'}) $relativePath
        }
        elseif ($entry.Extension -cne '.binlog')
        {
            throw "Unclassified raw artifact outside explicitly omitted binary/key/image directories:$relativePath"
        }
    }
}
Copy-Run ''
foreach ($label in 'original-red','candidate1-green','original-whitespace-controls','candidate2-green')
{
    foreach ($file in Get-ChildItem (Join-Path $run "tests\$label\image") -File -Filter 'Microsoft.AspNetCore.Identity.Test.*.json')
    {
        Copy-Exact $file.FullName "tests\$label\image-metadata\$($file.Name)" 'run-image-metadata' "tests\$label\image\$($file.Name)"
    }
}
foreach ($pair in @(
    @('F109-results-readme.md','README.md'),@('F109-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F109-closure.mjs','verify-live-closure.mjs'),@('F109-package-gitattributes.txt','.gitattributes'),
    @('F109-investigate.mjs','historical-investigate.mjs'),@('F109-supplement-source.mjs','historical-supplement-source.mjs'),
    @('F109-test.ps1','historical-test.ps1'),@('F109-bcl-probe.ps1','historical-bcl-probe.ps1'),
    @('F109-build-harness.ps1','historical-build-harness.ps1'),@('F109-finalize-harness.ps1','historical-finalize-harness.ps1'),
    @('F109-finalize-fixture-correction.ps1','historical-finalize-fixture-correction.ps1'),
    @('F109-create-fixture.ps1','historical-create-fixture.ps1'),@('F109-probe.ps1','historical-probe.ps1'),
    @('F109-freeze-original.ps1','historical-freeze-original.ps1'),
    @('F109-validate-freeze-candidate1.ps1','historical-validate-freeze-candidate1.ps1'),
    @('F109-original-whitespace-controls.ps1','historical-original-whitespace-controls.ps1'),
    @('F109-validate-freeze-next.ps1','historical-validate-freeze-next.ps1'),
    @('F109-measure.ps1','historical-measure.ps1'),@('F109-close-evaluation.ps1','historical-close-evaluation.ps1'),
    @('F109-audit-analysis.ps1','historical-audit-analysis.ps1'),
    @('F109-publish-source.ps1','historical-publish-source.ps1'),@('F109-package.ps1','historical-package.ps1')
))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
if (@($copies|Where-Object {$_.kind -like 'run*'}|ForEach-Object original|Sort-Object -Unique).Count -ne
    @($copies|Where-Object {$_.kind -like 'run*'}).Count) { throw 'Every original run artifact needs exactly one mapping.' }
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'Exact copied source/input/contracts/logs/TRX/PDB/overhead/GC/statistical audit failed.' }
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F109 exact historical commands and actual outcomes')
$commands.Add('')
$commands.Add('Every fresh dotnet shell activates `. .\activate.ps1` at C:\src\aspnetcore. Six33-case profiles constitute exactly3 closed comparisons;no fourth run. Failed development fixture and initial shortened-display auditor are retained failures,not passing tests or source comparisons.')
$commands.Add('')
function Quote([string]$Value) { return "'"+$Value.Replace("'","''")+"'" }
foreach ($entry in $copies|Where-Object {$_.kind -like 'run*' -and $_.original.EndsWith('.json') -and
    ($_.original.Contains('command') -or $_.original.EndsWith('\execution.json'))}|Sort-Object original)
{
    $records=@(Get-Content (Join-Path $destination $entry.destination) -Raw|ConvertFrom-Json)
    foreach ($record in $records)
    {
        if (-not $record.arguments)
        {
            if ($record.command)
            {
                if ('exitCode' -notin $record.PSObject.Properties.Name) { throw "Actual command outcome missing:$($entry.original)" }
                $commands.Add("## $($entry.original): actual exit$($record.exitCode)")
                $commands.Add('```powershell')
                $commands.Add([string]$record.command)
                $commands.Add('```')
                $commands.Add('')
            }
            continue
        }
        $exitField=@('exitCode','actualExitCode','exit_code','observedExitCode'|Where-Object {$_ -in $record.PSObject.Properties.Name})|Select-Object -First 1
        if (-not $exitField) { throw "Actual command outcome missing:$($entry.original)" }
        $arguments=@($record.arguments)
        $executable=if ($arguments[0] -in 'node','git','gh','dotnet') {$arguments[0]}
            elseif ($entry.original -ceq 'source-fetch-command.json') {'git'} else {'dotnet'}
        if ($arguments[0] -ceq $executable) { $arguments=@($arguments|Select-Object -Skip 1) }
        $commands.Add("## $($entry.original): actual exit$($record.$exitField)")
        $commands.Add('```powershell')
        $commands.Add($executable+' '+(($arguments|ForEach-Object {Quote $_}) -join ' '))
        $commands.Add('```')
        $commands.Add('')
    }
}
$commands.Add('## Independent fork source publication: actual push/ref/canonical content verification passed')
$commands.Add('```powershell')
$commands.Add('git '+(($publication.pushArguments|ForEach-Object {Quote $_}) -join ' '))
$commands.Add('gh '+(($publication.verificationArguments|ForEach-Object {Quote $_}) -join ' '))
$commands.Add('```')
$commands.Add("Actual fork commit:$($publication.commit). Both remote canonical provider/test byte sequences and blobs were checked. Measured binaries predate that commit and retain their actual captured hashes.")
$commands.Add('')
$commands.Add('## Copied portable audit: actual exit0, passed')
$commands.Add('```powershell')
$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('```')
$commands.Add('198 outcomes/1584 retained results/594 warmups/3655 actual overheads/198 hash-PID setups/396 input proofs/792 complete contracts/990 process-wide calipers/29 test executions including4 expected red failures/20 source-PDB associations verified. No omitted DLL/PDB/key/runtime rehash,method coverage,confidence-critical-value recomputation or universal/application speedup claimed.')
$commands.Add('All6 actual profiles and all probes complete33cases. Selected10/10 owning tests pass0skips;all4 formerly red rows pass,logger failure escapes once,and3 whitespace-preservation rows also pass on the frozen original. Scoped source/test/harness formatting and actual builds pass;development mistakes remain failures with exact executed sources.')
$commands|Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$inputs=@($copies|Where-Object kind -CEQ 'run-input')
$distinct=@($inputs|ForEach-Object destination|Sort-Object -Unique)
if ($inputs.Count -ne 429 -or $distinct.Count -ne 33 -or
    @($copies|Where-Object original -CEQ 'harness\.editorconfig').Count -ne 1 -or
    @(Get-ChildItem $destination -Recurse -Force -File|Where-Object Extension -IEQ '.xml').Count)
{
    throw 'All429 byte-identical input mappings/33 blobs/hidden config and exclusion of every private XML are required.'
}
[ordered]@{
    candidate='F109';disposition='validated';verified_copy_mappings=$copies.Count
    unique_authoritative_destinations=$unique.Count;all_byte_identical=$true
    input_byte_mappings=429;audited_execution_input_byte_mappings=396;fixture_input_byte_mappings=33
    distinct_input_blobs=33;harness_hidden_editorconfig_preserved=$true
    identical_input_bytes_deduplicated_with_complete_path_mappings=$true;copied_portable_audit_passed=$true
    private_key_files_omitted=$omissions.Count;every_private_keys_directory_excluded=$true
    raw_dll_pdb_binlogs_published=$false;public_audit_rehashes_omitted_binaries_or_keys=$false
    source_comparisons=3;original_profiles=3;candidate_profiles=3;comparison_budget_closed=$true
    note='Exact sources/config/deps/PDB-identity/probe/test/setup/measurement/GC/actual-overhead evidence and initial fixture/auditor failures retained. Private synthetic keys including archived development keys excluded;fresh replay regenerates one shared fixture.'
}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $unique.Count+3) { throw 'Only three generated metadata files may lack authoritative mappings.' }
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F109-immutable-file-count.txt') -Encoding ascii
Write-Output "F109:$($copies.Count) exact mappings/429 input paths33 blobs/$($files.Count) immutable files;all private keys omitted,portable audit passed."
