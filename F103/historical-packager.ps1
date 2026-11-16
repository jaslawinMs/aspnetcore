param([switch]$ResumeIncomplete)
$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F103'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F103'
$pending = @(git -C $output status --porcelain)
if ($ResumeIncomplete)
{
    if (-not (Test-Path $destination) -or (Test-Path (Join-Path $destination 'raw-file-copy-verification.json')) -or
        @($pending | Where-Object { $_ -cne '?? F103/' }).Count)
    {
        throw 'Resume is only permitted for this incomplete,unstaged raw-copy destination.'
    }
}
elseif ((Test-Path $destination) -or $pending.Count)
{
    throw 'A new F103 destination and clean dedicated results checkout are required.'
}
$source = Get-Content (Join-Path $run 'source-branch-publication.json') -Raw | ConvertFrom-Json
if (-not $source.actualRemoteCanonicalBytesVerified -or $source.parent -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5')
{
    throw 'Exact measured-source publication must precede packaging.'
}
$copies = [System.Collections.Generic.List[object]]::new()
$unique = @{}
function Copy-Exact([string]$Source, [string]$Relative, [string]$Kind, [string]$Original)
{
    $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $Source).Hash
    $bytes = (Get-Item -LiteralPath $Source).Length
    if ($Kind -ceq 'run-input')
    {
        $Relative = "input-blobs\$sha.cs"
    }
    $target = Join-Path $destination $Relative
    if ($unique.ContainsKey($Relative))
    {
        if ($Kind -cne 'run-input' -or $unique[$Relative].sha256 -cne $sha -or $unique[$Relative].bytes -ne $bytes)
        {
            throw "Unexpected authoritative destination collision:$Relative"
        }
    }
    else
    {
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
        if (Test-Path -LiteralPath $target)
        {
            if (-not $ResumeIncomplete -or (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash -cne $sha)
            {
                throw "Unexpected/changed incomplete copied file:$Relative"
            }
        }
        else
        {
            Copy-Item -LiteralPath $Source -Destination $target
        }
        $unique[$Relative] = @{sha256=$sha;bytes=$bytes}
    }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash -cne $sha)
    {
        throw "Exact copied bytes changed:$Original"
    }
    $copies.Add([pscustomobject][ordered]@{original=$Original;destination=$Relative;kind=$Kind;bytes=$bytes;sha256=$sha})
}
function Copy-Run([string]$Relative)
{
    $folder = if ($Relative) { Join-Path $run $Relative } else { $run }
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $path = if ($Relative) { "$Relative\$($entry.Name)" } else { $entry.Name }
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -notin 'binaries','bin','obj','node_modules','.git')
            {
                Copy-Run $path
            }
        }
        elseif ($entry.Extension -in '.cs','.csproj','.props','.targets','.resx','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1')
        {
            $kind = if ($path.Contains('\inputs\') -and $entry.Extension -ceq '.cs') { 'run-input' } else { 'run' }
            Copy-Exact $entry.FullName $path $kind $path
        }
        elseif ($entry.Extension -in '.dll','.pdb','.exe')
        {
            throw "Unexpected binary outside omitted output:$path"
        }
        elseif ($entry.Extension -cne '.binlog')
        {
            throw "Unclassified raw artifact:$path"
        }
    }
}
Copy-Run ''
foreach ($pair in @(
    @('F103-acceptance.md','acceptance.md'),
    @('F103-results-readme.md','README.md'),
    @('F103-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F103-closure.mjs','verify-live-closure.mjs'),
    @('F103-prepare.ps1','historical-prepare.ps1'),
    @('F103-finalize-harness.ps1','historical-finalize-harness.ps1'),
    @('F103-freeze.ps1','historical-freeze.ps1'),
    @('F103-variant.ps1','historical-variant.ps1'),
    @('F103-reference-repeat.ps1','historical-paired-reference.ps1'),
    @('F103-measure.ps1','historical-measure.ps1'),
    @('F103-test-audit.ps1','historical-test-audit.ps1'),
    @('F103-test-proof.ps1','historical-test-proof.ps1'),
    @('F103-publish-source.ps1','historical-source-publication.ps1'),
    @('F103-package.ps1','historical-packager.ps1'),
    @('F103-package-gitattributes.txt','.gitattributes')
))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($file in Get-ChildItem (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs','.csproj')
{
    Copy-Exact $file.FullName "pdb-tools\$($file.Name)" 'pdb-tools' $file.Name
}
if (@($copies | Where-Object {$_.kind -like 'run*'} | ForEach-Object {$_.original} | Sort-Object -Unique).Count -ne
    @($copies | Where-Object {$_.kind -like 'run*'}).Count)
{
    throw 'Each original raw artifact must have exactly one authoritative mapping.'
}
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json')
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'Exact deduplicated portable source/input/producer/test/raw/GC/sample audit failed.' }
$commands = [System.Collections.Generic.List[string]]::new()
$commands.Add('# F103 actual commands and outcomes')
$commands.Add('')
$commands.Add('Every fresh dotnet shell starts in C:\src\aspnetcore and activates `. .\activate.ps1`. CPU-heavy work serialized/max2 build nodes. Three actual source comparisons/six preserved10-case sweeps;the exact original harness is used in every image. Final source was built from37e809e plus the recorded patch before its later source commit.')
$commands.Add('')
function Quote([string]$Value) { return "'" + $Value.Replace("'","''") + "'" }
function Add-Command([string]$Name, [object]$Record)
{
    $names = @($Record.PSObject.Properties.Name)
    $field = @('actualExitCode','exitCode','exit_code' | Where-Object { $_ -in $names }) | Select-Object -First 1
    if (-not $field) { throw "Actual command outcome missing:$Name" }
    $commands.Add("## $Name`: actual exit$($Record.$field)")
    if ($Record.arguments -or $Record.command)
    {
        $commands.Add('```powershell')
        $commands.Add($(if ($Record.arguments) { 'dotnet ' + (($Record.arguments | ForEach-Object { Quote $_ }) -join ' ') }
            else { [string]$Record.command }))
        $commands.Add('```')
    }
    elseif ($Record.filter)
    {
        $commands.Add("Original control record preserves exact filter ``$($Record.filter)``, source revision and actual exit;full original argv was not retained in this record and is not invented. Actual original30-row TRX/source/PDB/owner/compiler proof is included.")
    }
    else { throw "Actual command argument boundary not documented:$Name" }
    $commands.Add('')
}
foreach ($file in Get-ChildItem -LiteralPath $run -File -Filter '*command*.json' | Sort-Object Name)
{
    $records = @(Get-Content $file.FullName -Raw | ConvertFrom-Json)
    for ($index = 0; $index -lt $records.Count; $index++)
    {
        Add-Command "$($file.Name)/row$($index + 1)" $records[$index]
    }
}
foreach ($label in 'original','candidate-1','original-2','candidate-2','original-3','candidate-3')
{
    Add-Command "Actual retained $label ten-case BDN sweep" (Get-Content (Join-Path $run "execution-$label.json") -Raw | ConvertFrom-Json)
}
foreach ($variant in 'original','candidate-3')
{
    Add-Command "Actual $variant thirty owning controls" (Get-Content (Join-Path $run "tests\$variant\execution.json") -Raw | ConvertFrom-Json)
}
$commands.Add('Actual final controls:30 passed/0 failed/0 skipped,positive durations/exact result-definition-execution IDs/two source-PDB associations/test-output owner matches the measured image. Existing diagnostic/code-fix controls are not red-green performance tests.')
$commands.Add('Final standalone harness build:actual0 errors/4 known warnings CS0618/RS1038/RS1041/RS1036. Later incremental0-warning output is not treated as resolving those warnings. Failed three-argument netstandard2.0 build:actualexit1/six CS1503 errors,premeasurement;not a consumed source comparison.')
$commands.Add('')
$commands.Add('## Exact measured source branch:passed,actual push/ref/blob retrieval exits0')
$commands.Add('```powershell')
$commands.Add('git ' + (($source.pushArguments | ForEach-Object { Quote $_ }) -join ' '))
$commands.Add('gh ' + (($source.verificationArguments | ForEach-Object { Quote $_ }) -join ' '))
$commands.Add('```')
$commands.Add("Actual source commit ``$($source.commit)``/parent37e809e/canonical remote bytes verified;one tracked source file changed.")
$commands.Add('')
$commands.Add('`node .\reproduce-analysis.mjs <absolute-capsule> --verify`:passed,exit0 against exact copied/deduplicated artifacts;60 outcomes/480 results/180 workload warmups/20 overhead samples/60 hash-PID setups/128 input proofs/9472 input-byte mappings/20 source identities/13 source-PDB associations per image/17 observations/10 producers/10 process-wide calipers/30 original+30 final controls. Actual median-overhead subtraction/GC rounding/sample/R7 percentile/recorded CI arithmetic checked;confidence critical values/omitted DLL/PDB/runtime-pack bytes/method coverage/causal speedup not claimed.')
$commands.Add('`node F103-closure.mjs <absolute-actual-local-run> <variant> --verify`:passed before/after actual sweeps;98 copied application files/29 declared assets/exact two-file candidate differences. Requires omitted local binary images;not a portable binary rehash.')
$commands | Set-Content (Join-Path $destination 'validation-commands.md')
$inputCopies = @($copies | Where-Object {$_.kind -ceq 'run-input'})
$inputDestinations = @($inputCopies | ForEach-Object {$_.destination} | Sort-Object -Unique)
$auditedInputs = @($inputCopies | Where-Object {
    $_.original.StartsWith('measurements\') -or $_.original.StartsWith('verification\')
})
$prototypeInputs = @($inputCopies | Where-Object {$_.original.StartsWith('initial-original-prototype\')})
$audit = Get-Content (Join-Path $destination 'measurement-audit.json') -Raw | ConvertFrom-Json
if ($auditedInputs.Count -ne 9472 -or $audit.actualInputByteMappingsChecked -ne $auditedInputs.Count -or
    $inputCopies.Count -ne $auditedInputs.Count + $prototypeInputs.Count)
{
    throw 'Every audited input and additional prototype input must have an exact classified mapping.'
}
[ordered]@{
    candidate='F103';verified_copy_mappings=$copies.Count;unique_authoritative_destinations=$unique.Count
    all_byte_identical=$true;input_byte_mappings=$inputCopies.Count;distinct_input_blobs=$inputDestinations.Count
    audited_measurement_probe_input_byte_mappings=$auditedInputs.Count
    additional_initial_prototype_input_byte_mappings=$prototypeInputs.Count
    identical_input_bytes_deduplicated_with_complete_path_mappings=$true;copied_portable_audit_passed=$true
    raw_dll_pdb_binlogs_published=$false;public_audit_rehashes_omitted_binaries=$false
    source_comparisons=3;original_sweeps=3;comparison_budget_closed=$true
    note='All raw source/config/deps/probe/test/setup/sample/GC evidence preserved;9472 audited measurement/probe input mappings plus additional initial-prototype input mappings resolve content-addressed raw blobs,not regenerated inputs. Recorded PDB associations are not method coverage.'
} | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json')
$files = @(Get-ChildItem -LiteralPath $destination -Recurse -File)
if ($files.Count -ne $unique.Count + 3) { throw 'Only three authored metadata files may be outside exact copy mappings.' }
$files.Count | Set-Content (Join-Path $PSScriptRoot 'F103-immutable-file-count.txt')
Write-Output "F103:$($copies.Count) byte-identical mappings/$($inputDestinations.Count) distinct input blobs/$($files.Count) immutable files;strict copied compiler-owned audit passed."
