$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F105'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$destination=Join-Path $output 'F105'
if ((Test-Path $destination) -or @(git -C $output status --porcelain).Count)
{
    throw 'A new F105 capsule and clean dedicated results checkout are required.'
}
$source=Get-Content (Join-Path $run 'source-branch-publication.json') -Raw|ConvertFrom-Json
if ($source.disposition -cne 'rejected' -or $source.sourceChanged -or $source.independentOptimizationCommit -or
    $source.commit -cne '37e809ead5824bc753a1c3d56f11615bdb1296c5' -or $source.verificationExitCode -ne 0)
{
    throw 'Actual audited unchanged independent F105 source ref must precede packaging.'
}
$copies=[System.Collections.Generic.List[object]]::new()
$unique=@{}
function Copy-Exact([string]$Source,[string]$Relative,[string]$Kind,[string]$Original)
{
    $sha=(Get-FileHash -LiteralPath $Source).Hash
    $bytes=(Get-Item -LiteralPath $Source).Length
    if ($Kind -ceq 'run-input') { $Relative="input-blobs\$sha.json" }
    $target=Join-Path $destination $Relative
    if ($unique.ContainsKey($Relative))
    {
        if ($Kind -cne 'run-input' -or $unique[$Relative].sha256 -cne $sha -or $unique[$Relative].bytes -ne $bytes)
        {
            throw "Unexpected authoritative destination collision:$Relative"
        }
    }
    else
    {
        if (Test-Path $target) { throw "Unexpected existing copied artifact:$Relative" }
        New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
        Copy-Item -LiteralPath $Source -Destination $target
        $unique[$Relative]=[pscustomobject]@{sha256=$sha;bytes=$bytes}
    }
    if ((Get-FileHash -LiteralPath $target).Hash -cne $sha) { throw "Copied raw bytes differ:$Original" }
    $copies.Add([pscustomobject][ordered]@{original=$Original;destination=$Relative;kind=$Kind;bytes=$bytes;sha256=$sha})
}
function Copy-Run([string]$Relative)
{
    $folder=if ($Relative) {Join-Path $run $Relative} else {$run}
    foreach ($entry in Get-ChildItem -LiteralPath $folder -Force)
    {
        $path=if ($Relative) {"$Relative\$($entry.Name)"} else {$entry.Name}
        if ($entry.PSIsContainer)
        {
            if ($entry.Name -cnotin 'binaries','bin','obj','node_modules','.git') { Copy-Run $path }
        }
        elseif ($entry.Name -ceq '.editorconfig' -or
            $entry.Extension -in '.cs','.csproj','.props','.targets','.resx','.json','.trx','.log','.txt','.html','.md','.csv','.diff','.patch','.ps1','.mjs')
        {
            $kind=if ($path.Contains('\inputs\') -and $entry.Extension -ceq '.json') {'run-input'} else {'run'}
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
    @('F105-results-readme.md','README.md'),
    @('F105-reproduce-analysis.mjs','reproduce-analysis.mjs'),
    @('F105-closure.mjs','verify-live-closure.mjs'),
    @('F105-prepare.mjs','historical-prepare.mjs'),
    @('F105-build-harness.ps1','historical-build-harness.ps1'),
    @('F105-finalize-harness.ps1','historical-finalize-harness.ps1'),
    @('F105-freeze.ps1','historical-freeze.ps1'),
    @('F105-probe.ps1','historical-probe.ps1'),
    @('F105-measure.ps1','historical-measure.ps1'),
    @('F105-test.ps1','historical-test.ps1'),
    @('F105-test-proof.ps1','historical-test-proof.ps1'),
    @('F105-capture-audit-inputs.ps1','historical-capture-audit-inputs.ps1'),
    @('F105-close-evaluation.ps1','historical-close-evaluation.ps1'),
    @('F105-publish-source.ps1','historical-source-publication.ps1'),
    @('F105-package.ps1','historical-packager.ps1'),
    @('F105-package-gitattributes.txt','.gitattributes')
))
{
    Copy-Exact (Join-Path $PSScriptRoot $pair[0]) $pair[1] 'session' $pair[0]
}
if (@($copies|Where-Object {$_.kind -like 'run*'}|ForEach-Object original|Sort-Object -Unique).Count -ne
    @($copies|Where-Object {$_.kind -like 'run*'}).Count)
{
    throw 'Each original raw artifact must have exactly one authoritative mapping.'
}
$copies|ConvertTo-Json -Depth 6|Set-Content (Join-Path $destination 'authoritative-copy-manifest.json') -Encoding utf8
node (Join-Path $destination 'reproduce-analysis.mjs') $destination --verify
if ($LASTEXITCODE) { throw 'Exact copied F105 source/input/public-owner/test/raw/overhead/GC/statistical audit failed.' }
$commands=[System.Collections.Generic.List[string]]::new()
$commands.Add('# F105 actual commands and outcomes')
$commands.Add('')
$commands.Add('Every fresh dotnet shell starts in C:\src\aspnetcore and activates `. .\activate.ps1`. CPU-heavy work serialized/max2 build nodes. One original-only24-case profile,zero source comparisons/three intentionally unused. No compatible performance improvement or executed modified-binary failure claimed.')
$commands.Add('')
function Quote([string]$Value) { return "'"+$Value.Replace("'","''")+"'" }
function Add-Command([string]$Name,[object]$Record)
{
    $fields=@($Record.PSObject.Properties.Name)
    $exitField=@('actualExitCode','exitCode','exit_code','observedExitCode'|Where-Object {$_ -in $fields})|Select-Object -First 1
    if (-not $exitField -or (-not $Record.arguments -and -not $Record.command))
    {
        throw "Exact command/actual outcome required:$Name"
    }
    $commands.Add("## $Name`:actual exit$($Record.$exitField)")
    $commands.Add('```powershell')
    if ($Record.command)
    {
        $commands.Add([string]$Record.command)
    }
    else
    {
        if ($Record.arguments[0] -ceq 'node')
        {
            $commands.Add('node '+(($Record.arguments|Select-Object -Skip 1|ForEach-Object {Quote $_}) -join ' '))
        }
        else
        {
            $commands.Add('dotnet '+(($Record.arguments|ForEach-Object {Quote $_}) -join ' '))
        }
    }
    $commands.Add('```')
    $commands.Add('')
}
foreach ($entry in Get-ChildItem $run -File -Filter '*command*.json'|Sort-Object Name)
{
    $records=@(Get-Content $entry.FullName -Raw|ConvertFrom-Json)
    for ($index=0;$index -lt $records.Count;$index++)
    {
        Add-Command "$($entry.Name)/row$($index+1)" $records[$index]
    }
}
Add-Command 'Actual retained original24-case BDN pressure profile' (Get-Content (Join-Path $run 'execution-original.json') -Raw|ConvertFrom-Json)
foreach ($label in 'development-nullable-guard','original','post-original')
{
    Add-Command "Actual $label public-owner24-case/120-caliper probe" (Get-Content (Join-Path $run "verification\$label\execution.json") -Raw|ConvertFrom-Json)
}
Add-Command 'Actual ten original owning Facts' (Get-Content (Join-Path $run 'tests\original\execution.json') -Raw|ConvertFrom-Json)
Add-Command 'Actual selected test-source/PDB proof' (Get-Content (Join-Path $run 'tests\original\test-source-pdb-command.json') -Raw|ConvertFrom-Json)
Add-Command 'Initial portable-auditor object/array failure,not a benchmark or test failure' (Get-Content (Join-Path $run 'audit-development\initial-failure.json') -Raw|ConvertFrom-Json)
Add-Command 'Corrected actual portable arithmetic/source/test audit' (Get-Content (Join-Path $run 'audit-analysis-execution.json') -Raw|ConvertFrom-Json)
$commands.Add('All ten exact source-defined owning Facts passed,0 failed/0 skipped,positive durations/exact TRX IDs/output-owner/deps/source-PDB identities. They are original preservation controls,not red-green performance tests or an in-test loaded-owner hash marker.')
$commands.Add('Initial full harness build passed with1 CS8602 warning/0errors;exact initial sources/identity retained. Nullable-guard and final builds passed0warnings/0errors. Scoped actual repo whitespace verification passed exit0 without formatter application. Actual development/frozen/pre/post producers and all public semantic controls passed.')
$commands.Add('The first portable auditor failed on a single successful command encoded as an object rather than an array;its exact source/observed failure are retained. The corrected reader passed without raw-data changes or any benchmark/test rerun.')
$commands.Add('')
$commands.Add('## Independent source branch:actual push/ref retrieval passed')
$commands.Add('```powershell')
$commands.Add('git '+(($source.pushArguments|ForEach-Object {Quote $_}) -join ' '))
$commands.Add('gh '+(($source.verificationArguments|ForEach-Object {Quote $_}) -join ' '))
$commands.Add('```')
$commands.Add("Actual fork branch ``$($source.branch)`` remains at ``$($source.commit)``;source diff/whitespace exit0 and20 raw source hashes checked. No shipping source edit or build-output restoration was needed.")
$commands.Add('')
$commands.Add('## Exact copied portable audit:actual exit0,passed')
$commands.Add('```powershell')
$commands.Add('node '+(Quote (Join-Path $destination 'reproduce-analysis.mjs'))+' '+(Quote $destination)+' --verify')
$commands.Add('```')
$commands.Add('24 outcomes/192 results/72 warmups/399 actual overhead samples/24 hash-PID setups/72 exact frozen input proofs/48 independent frozen contracts/240 precise warmed process-wide calipers/20 source identities/17 source-PDB associations per image/10 exact original Facts/305 copied application files/126 declared assets. All sample/R7/variance/SE/actual-overhead/GC rounding/recorded CI arithmetic checked;confidence critical values/omitted DLL-PDB-runtime bytes/method coverage not independently recomputed.')
$commands.Add('All96 present measured/probe input mappings,including24 additional development inputs,resolve exact content-addressed JSON bytes. Initial source/warning/auditor artifacts and hidden harness .editorconfig are preserved.')
$commands.Add('`node F105-closure.mjs <actual-local-run> --verify` passed in guarded actual pre/post probe/profile recipes. It requires the omitted local305-file image;this is not a portable rehash of omitted binaries.')
$commands|Set-Content (Join-Path $destination 'validation-commands.md') -Encoding utf8
$inputs=@($copies|Where-Object kind -CEQ 'run-input')
$audited=@($inputs|Where-Object {$_.original.StartsWith('measurements\') -or
    $_.original.StartsWith('verification\original\') -or $_.original.StartsWith('verification\post-original\')})
$development=@($inputs|Where-Object {$_.original.StartsWith('verification\development-nullable-guard\')})
$audit=Get-Content (Join-Path $destination 'measurement-audit.json') -Raw|ConvertFrom-Json
if ($audit.disposition -cne 'rejected' -or $audited.Count -ne 72 -or $development.Count -ne 24 -or
    $inputs.Count -ne 96 -or @($copies|Where-Object original -CEQ 'harness\.editorconfig').Count -ne 1)
{
    throw 'All72 audited/24 development raw input mappings and hidden formatting configuration are required.'
}
$distinct=@($inputs|ForEach-Object destination|Sort-Object -Unique)
[ordered]@{
    candidate='F105';disposition='rejected';verified_copy_mappings=$copies.Count
    unique_authoritative_destinations=$unique.Count;all_byte_identical=$true
    input_byte_mappings=96;audited_frozen_input_byte_mappings=72;additional_development_input_byte_mappings=24
    distinct_input_blobs=$distinct.Count;harness_hidden_editorconfig_preserved=$true
    identical_input_bytes_deduplicated_with_complete_path_mappings=$true;copied_portable_audit_passed=$true
    raw_dll_pdb_binlogs_published=$false;public_audit_rehashes_omitted_binaries=$false
    source_comparisons=0;original_profiles=1;comparison_budget_closed=$true
    note='Exact raw sources/config/deps/PDB/probe/test/setup/measurement/GC/overhead evidence and initial warning/auditor failure retained. All96 actual input paths resolve byte-identical blobs,not regenerated inputs. Rejected incompatible public-struct replacement,not zero original pressure or universal redesign disproof.'
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $destination 'raw-file-copy-verification.json') -Encoding utf8
$files=@(Get-ChildItem $destination -Recurse -Force -File)
if ($files.Count -ne $unique.Count+3) { throw 'Only three generated metadata files may lack authoritative copy mappings.' }
$files.Count|Set-Content (Join-Path $PSScriptRoot 'F105-immutable-file-count.txt') -Encoding ascii
Write-Output "F105:$($copies.Count) exact copy mappings/$($distinct.Count) distinct input blobs/$($files.Count) immutable files;actual portable audit passed,rejected."
