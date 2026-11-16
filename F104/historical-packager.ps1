$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F104'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$destination = Join-Path $output 'F104'
if ((Test-Path -LiteralPath $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'A new F104 capsule and clean dedicated results checkout are required.'
}
$source = Get-Content (Join-Path $run 'source-branch-publication.json') -Raw | ConvertFrom-Json
$restored = Get-Content (Join-Path $run 'restored-build-outputs.json') -Raw | ConvertFrom-Json
if ($source.disposition -cne 'no-gain' -or $source.sourceChanged -or $source.independentOptimizationCommit -or
    $source.commit -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or $source.verificationExitCode -ne 0 -or
    -not $restored.allMatchFrozenTestedOriginal -or $restored.actualOutputFiles -ne 6)
{
    throw 'Actual unchanged no-gain source ref and exact known output restoration must precede packaging.'
}
$copies = [System.Collections.Generic.List[object]]::new()
$unique = @{}
function Copy-Exact([string]$Source, [string]$Relative, [string]$Kind, [string]$Original)
{
    $sha = (Get-FileHash -Algorithm SHA256 -LiteralPath $Source).Hash
    $bytes = (Get-Item -LiteralPath $Source).Length
    if ($Kind -ceq 'run-input') { $Relative = "input-blobs\$sha.cs" }
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
        if (Test-Path -LiteralPath $target) { throw "Unexpected existing copied file:$Relative" }
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $Source -Destination $target
        $unique[$Relative] = [pscustomobject]@{sha256=$sha;bytes=$bytes}
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
            if ($entry.Name -cnotin 'binaries','bin','obj','node_modules','.git') { Copy-Run $path }
        }
        elseif ($entry.Name -ceq '.editorconfig' -or
            $entry.Extension -in '.cs','.csproj','.props','.targets','.resx','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1','.mjs')
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
    @('F104-results-readme.md','README.md'),
    @('F104-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F104-closure.mjs','verify-live-closure.mjs'),
    @('F104-prepare.ps1','historical-prepare.ps1'),
    @('F104-build-harness.ps1','historical-build-harness.ps1'),
    @('F104-finalize-harness.ps1','historical-finalize-harness.ps1'),
    @('F104-build-variant.ps1','historical-build-variant.ps1'),
    @('F104-freeze.ps1','historical-freeze.ps1'),
    @('F104-prototype-probe.ps1','historical-prototype-probe.ps1'),
    @('F104-probe.ps1','historical-probe.ps1'),
    @('F104-measure.ps1','historical-measure.ps1'),
    @('F104-test.ps1','historical-test.ps1'),
    @('F104-test-parameter-proof.ps1','historical-test-parameter-proof.ps1'),
    @('F104-test-proof.ps1','historical-test-proof.ps1'),
    @('F104-capture-metadata-source.ps1','historical-capture-metadata-source.ps1'),
    @('F104-capture-audit-inputs.ps1','historical-capture-audit-inputs.ps1'),
    @('F104-restore-build-outputs.ps1','historical-restore-build-outputs.ps1'),
    @('F104-publish-source.ps1','historical-source-publication.ps1'),
    @('F104-package.ps1','historical-packager.ps1'),
    @('F104-package-gitattributes.txt','.gitattributes')
))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
foreach ($entry in Get-ChildItem (Join-Path $PSScriptRoot 'autoperf-runs\F071\tools') -File |
    Where-Object Extension -in '.cs','.csproj')
{
    Copy-Exact $entry.FullName "pdb-tools\$($entry.Name)" 'pdb-tools' $entry.Name
}
if (@($copies | Where-Object {$_.kind -like 'run*'} | ForEach-Object {$_.original} | Sort-Object -Unique).Count -ne
    @($copies | Where-Object {$_.kind -like 'run*'}).Count)
{
    throw 'Each original raw artifact must have exactly one authoritative mapping.'
}
$copies | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'Exact copied F104 source/input/producer/test/raw/GC/sample audit failed.' }
$commands = [System.Collections.Generic.List[string]]::new()
$commands.Add('# F104 actual commands and outcomes')
$commands.Add('')
$commands.Add('Every fresh dotnet shell starts in C:\src\aspnetcore and activates `. .\activate.ps1`. CPU-heavy work serialized/max2 build nodes. Three actual comparisons/six ten-case sweeps;no fourth run. Exact original harness/config/compiler/dependency bytes throughout;trial images built from37e809e plus recorded patches. Final disposition:no-gain,not zero partial savings or universal redesign disproof.')
$commands.Add('')
function Quote([string]$Value) { return "'" + $Value.Replace("'","''") + "'" }
function Add-Command([string]$Name, [object]$Record)
{
    $fields = @($Record.PSObject.Properties.Name)
    $exitField = @('actualExitCode','exitCode','exit_code' | Where-Object { $_ -in $fields }) | Select-Object -First 1
    if (-not $exitField -or (-not $Record.arguments -and -not $Record.command))
    {
        throw "Exact recorded command/actual outcome required:$Name"
    }
    $commands.Add("## $Name`: actual exit$($Record.$exitField)")
    $commands.Add('```powershell')
    $commands.Add($(if ($Record.arguments) { 'dotnet ' + (($Record.arguments | ForEach-Object { Quote $_ }) -join ' ') }
        else { [string]$Record.command }))
    $commands.Add('```')
    $commands.Add('')
}
foreach ($entry in Get-ChildItem -LiteralPath $run -File -Filter '*command*.json' | Sort-Object Name)
{
    $records = @(Get-Content $entry.FullName -Raw | ConvertFrom-Json)
    for ($index = 0; $index -lt $records.Count; $index++)
    {
        Add-Command "$($entry.Name)/row$($index + 1)" $records[$index]
    }
}
foreach ($label in 'original','candidate-1','original-2','candidate-2','original-3','candidate-3')
{
    Add-Command "Actual retained $label ten-case BDN sweep" (Get-Content (Join-Path $run "execution-$label.json") -Raw | ConvertFrom-Json)
}
foreach ($variant in 'original','candidate-3')
{
    Add-Command "Actual $variant thirty-five owning controls" (Get-Content (Join-Path $run "tests\$variant\execution.json") -Raw | ConvertFrom-Json)
    Add-Command "Actual $variant owning test source/PDB proof" (Get-Content (Join-Path $run "tests\$variant\test-source-pdb-command.json") -Raw | ConvertFrom-Json)
}
$commands.Add('Original/final owning controls:35 passed/0 failed/0 skipped each;23 Facts plus all12 exact literal InlineData rows/positive durations/exact IDs/source-PDB/output-owner/compiler identities. Existing controls are not red-green performance tests.')
$commands.Add('Initial context compile:actual exit1/four errors(CS0308 twice,CS0534 twice);corrected-signature compile:actual exit1/CS0246 RequestDelegate. Subsequent first successful full harness build:0 errors/six warnings(CS0618,RS1038,RS1041,RS1036,RS1012 twice). Final format/apply/verify and incremental build:actual exit0/0 warnings/0 errors,not erasure of the earlier warnings.')
$commands.Add('Premeasurement real-owner prototypes retain actual nonzero process exits for missing routing/MVC metadata,explicit-cast route reachability and the observer filter assumption. Final real-owner observer/context prototype:actual exit0. Casts remain negative controls;main inputs use ordinary lambdas. The freeze guard initially expected six C# files but actual final harness has five plus its project;25 successful PDB proofs were retained rather than rerun.')
$commands.Add('')
$commands.Add('## Actual unchanged independent source branch:passed,push/ref retrieval exits0')
$commands.Add('```powershell')
$commands.Add('git ' + (($source.pushArguments | ForEach-Object { Quote $_ }) -join ' '))
$commands.Add('gh ' + (($source.verificationArguments | ForEach-Object { Quote $_ }) -join ' '))
$commands.Add('```')
$commands.Add("Actual fork branch ``$($source.branch)`` remains at ``$($source.commit)``;source diff/whitespace exit0 and exact original raw source hash checked. Only known own development analyzer DLL/PDB output bytes were restored;all frozen measured images and final test proofs retained.")
$commands.Add('')
$commands.Add('## Exact copied portable audit:passed,actual exit0')
$commands.Add('```powershell')
$commands.Add('node ' + (Quote (Join-Path $destination 'reproduce-analysis.mjs')) + ' ' + (Quote $destination) + ' --verify')
$commands.Add('```')
$commands.Add('60 outcomes/480 results/180 workload warmups/0 actual overhead samples/60 hash-PID setups/192 input proofs/3784 audited input-byte mappings/238 reference names per input/28 source identities/25 source-PDB associations per image/33 observations/10 producers/10 warm process-wide calipers/10 fresh-compilation rows per image/35 original+35 final controls. Actual raw-total overhead handling/GC rounding/sample/R7/recorded CI arithmetic checked;critical values/omitted DLL-PDB-runtime-pack bytes/method coverage/causal speedup not claimed.')
$commands.Add('`node F104-closure.mjs <actual-local-run> <variant> --verify`:passed in actual guarded before/after sweep recipes;196 copied application files/59 declared assets/exact two-file original-to-trial differences. Requires the omitted actual local images;not a portable binary rehash.')
$commands.Add('Source retrieval argv/exits are retained in producer-source-copies.json and metadata-*-source-proof.json. Pinned public BDN source receipts were reused byte-for-byte from already verified F103,not freshly retrieved.')
$commands | Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$inputs = @($copies | Where-Object {$_.kind -ceq 'run-input'})
$audited = @($inputs | Where-Object {$_.original.StartsWith('measurements\') -or $_.original.StartsWith('verification\')})
$prototype = @($inputs | Where-Object {
    $_.original.StartsWith('initial-original-prototype\') -or $_.original.StartsWith('prototype-')
})
$audit = Get-Content (Join-Path $destination 'measurement-audit.json') -Raw | ConvertFrom-Json
if ($audit.disposition -cne 'no-gain' -or $audit.actualInputByteMappings -ne 3784 -or $audited.Count -ne 3784 -or
    $inputs.Count -ne $audited.Count + $prototype.Count -or
    @($copies | Where-Object {$_.original -ceq 'harness\.editorconfig'}).Count -ne 1)
{
    throw 'Every audited and all additional failed/successful prototype input mappings plus .editorconfig are required.'
}
$inputDestinations = @($inputs | ForEach-Object {$_.destination} | Sort-Object -Unique)
[ordered]@{
    candidate='F104';disposition='no-gain';verified_copy_mappings=$copies.Count
    unique_authoritative_destinations=$unique.Count;all_byte_identical=$true
    input_byte_mappings=$inputs.Count;distinct_input_blobs=$inputDestinations.Count
    audited_measurement_probe_input_byte_mappings=$audited.Count
    additional_prototype_input_byte_mappings=$prototype.Count
    additional_prototype_roots=@($prototype | ForEach-Object {$_.original.Split('\')[0]} | Sort-Object -Unique)
    harness_hidden_editorconfig_preserved=$true
    identical_input_bytes_deduplicated_with_complete_path_mappings=$true;copied_portable_audit_passed=$true
    raw_dll_pdb_binlogs_published=$false;public_audit_rehashes_omitted_binaries=$false
    source_comparisons=3;original_sweeps=3;comparison_budget_closed=$true
    note='All final exact source/config/deps/probe/test/setup/sample/GC evidence and failed/successful development artifacts preserved.3784 audited input mappings plus every additional prototype input resolve exact content-addressed bytes,not regenerated inputs. PDB associations are not method coverage;no partial savings are suppressed.'
} | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files = @(Get-ChildItem -LiteralPath $destination -Recurse -Force -File)
if ($files.Count -ne $unique.Count + 3) { throw 'Only three generated metadata files may be outside authoritative copy mappings.' }
$files.Count | Set-Content (Join-Path $PSScriptRoot 'F104-immutable-file-count.txt') -Encoding ascii
Write-Output "F104:$($copies.Count) exact copy mappings/$($inputDestinations.Count) distinct raw input blobs/$($files.Count) immutable files;portable audit passed,no-gain."
