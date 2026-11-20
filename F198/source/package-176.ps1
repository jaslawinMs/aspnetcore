$ErrorActionPreference = 'Stop'
$run = Split-Path $PSScriptRoot -Parent
$session = Split-Path (Split-Path $run -Parent) -Parent
$finding = Join-Path $session 'autoperf-parallelism\finding-F198-158'
$published = Join-Path $session 'autoperf-published-results'
$destination = Join-Path $published 'F198'
$inputs = [Collections.Generic.List[object]]::new()

function Queue-File([string] $Logical, [string] $Source)
{
    $item = Get-Item -LiteralPath $Source
    if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint))
    {
        throw "Expected an ordinary selected file: $Source"
    }
    $inputs.Add([pscustomobject][ordered]@{
        file = $Logical.Replace('\', '/')
        sourcePath = $item.FullName
        bytes = $item.Length
        sha256 = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash
    })
}

function Queue-Tree([string] $Logical, [string] $Source)
{
    foreach ($item in Get-ChildItem -LiteralPath $Source -File -Recurse)
    {
        Queue-File (Join-Path $Logical ([IO.Path]::GetRelativePath($Source, $item.FullName))) $item.FullName
    }
}

function Write-NewJson([string] $Path, [object] $Value)
{
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try
    {
        $bytes = [Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 30) + "`n")
        $stream.Write($bytes)
    }
    finally
    {
        $stream.Dispose()
    }
}

if (Test-Path -LiteralPath $destination)
{
    throw 'The new F198 evidence directory already exists; no overwrite or publication retry is implicit.'
}
$head = & git --no-pager -C $published rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $head -cne 'd8f16e467c033c4f0062eeb1b92d7804adc2bf0e')
{
    throw 'The reviewed public parent changed.'
}
$candidate = 'C:\src\ap-F198-c168'
$changed = @(& git --no-pager -C $candidate diff --name-only -- src)
if ($LASTEXITCODE -ne 0 -or $changed.Count -ne 1 -or $changed[0] -notlike 'src/Servers/Kestrel/Core/*/TransportConnectionManager.cs')
{
    throw 'The one-line candidate source boundary changed.'
}
$numstat = & git --no-pager -C $candidate diff --numstat -- $changed[0]
if ($LASTEXITCODE -ne 0 -or $numstat -cne ("1`t1`t" + $changed[0]))
{
    throw 'The candidate no longer has precisely one insertion and one deletion.'
}
$patch = @(& git --no-pager -C $candidate diff --no-ext-diff --binary -- $changed[0])
if ($LASTEXITCODE -ne 0)
{
    throw 'Cannot retain the actual candidate diff.'
}
$patchFile = Join-Path $PSScriptRoot 'candidate.patch'
$patchStream = [IO.File]::Open($patchFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
try
{
    $patchStream.Write([Text.Encoding]::UTF8.GetBytes(($patch -join "`n") + "`n"))
}
finally
{
    $patchStream.Dispose()
}

Queue-File 'README.md' (Join-Path $PSScriptRoot 'README.md')
Queue-File 'verify.mjs' (Join-Path $PSScriptRoot 'verify.mjs')
Queue-File '.gitattributes' (Join-Path $PSScriptRoot '.gitattributes')
foreach ($name in @('plan.json', 'plan-seal.json', 'diagnostic-budget.json', 'compatibility-173.json',
    'driver-config-173.json', 'driver-seal-173.json', 'math-operationalization-173.json',
    'driver-controls-173.junit.xml', 'quiescence-173.json', 'quiescence-173-released.json',
    'owner-F344-hold-173.json', 'owner-F345-hold-173.json', 'gateway-original-request-173.json',
    'preparation-173.json'))
{
    Queue-File $name (Join-Path $run $name)
}
Queue-File 'source\AutoPerf.F198.Driver173.mjs' (Join-Path $run 'AutoPerf.F198.Driver173.mjs')
Queue-File 'source\driver-controls-173.mjs' (Join-Path $run 'driver-controls-173.mjs')
Queue-File 'source\Invoke-MeasurementChild.ps1' (Join-Path $session 'autoperf-runs\F142-common\Invoke-MeasurementChild.ps1')
Queue-File 'source\Invoke-AutoPerfBenchmark.ps1' (Join-Path $session 'autoperf-parallelism\Invoke-AutoPerfBenchmark.ps1')
Queue-File 'source\autoperf-publish-bounded-outcome-033.mjs' (Join-Path $session 'autoperf-publish-bounded-outcome-033.mjs')
Queue-File 'source\autoperf-publish-bounded-outcome-174.mjs' (Join-Path $session 'autoperf-publish-bounded-outcome-174.mjs')
Queue-File 'source\classification-controls.mjs' (Join-Path $PSScriptRoot 'classification-controls.mjs')
Queue-File 'source\package-176.ps1' $PSCommandPath
Queue-File 'source\package-174.ps1' (Join-Path $run 'publication-174\package.ps1')
Queue-File 'source\preserve-failed-staging-176.ps1' (Join-Path $PSScriptRoot 'preserve-failed-staging.ps1')
Queue-File 'publication-preparation\failed-staging-preservation.json' (Join-Path $PSScriptRoot 'failed-staging-preservation.json')
Queue-File 'publication-preparation\prior-capsule-file-hashes.json' (Join-Path $run 'publication-174\failed-staging-capsule\capsule-file-hashes.json')
Queue-File 'publication-preparation\prior-historical-audit.json' (Join-Path $run 'publication-174\failed-staging-capsule\historical-audit.json')
Queue-File 'publication-preparation\prior-publication-invocations.json' (Join-Path $run 'publication-174\publication-invocations.json')
Queue-File 'classification-control-result.json' (Join-Path $PSScriptRoot 'classification-control-result.json')
Queue-File 'source\TransportConnectionManagerBenchmark.cs' (Join-Path $finding 'TransportConnectionManagerBenchmark.cs')
Queue-File 'source\consumer-163\Program.cs' (Join-Path $finding 'consumer-163\Program.cs')
Queue-File 'source\consumer-163\ExistingBenchmark.csproj' (Join-Path $finding 'consumer-163\ExistingBenchmark.csproj')
Queue-File 'source\Original-TransportConnectionManager.cs' (Join-Path 'C:\src\ap-F198-o158' $changed[0])
Queue-File 'source\Candidate-TransportConnectionManager.cs' (Join-Path $candidate $changed[0])
Queue-File 'source\candidate.patch' $patchFile
Queue-File 'source-producer-equivalence-164.json' (Join-Path $finding 'source-producer-equivalence-164.json')
Queue-File 'original-plan-seal.json' (Join-Path $finding 'plan-seal.json')
foreach ($name in @('Invoke-F198CausalAcceptance-170.ps1', 'Invoke-F198CausalNative-171.ps1', 'Prepare-F198Measurement-173.ps1'))
{
    Queue-File (Join-Path 'source' $name) (Join-Path $session $name)
}
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $finding 'images-169') -File)
{
    Queue-File (Join-Path 'inventories' $file.Name) $file.FullName
}
Queue-Tree 'raw\Original' (Join-Path $run 'Original-comparison-173')
Queue-Tree 'budget-history' (Join-Path $run 'budget-history-173')
Queue-Tree 'correctness\causal-169' (Join-Path $finding 'causal-acceptance-169')
Queue-Tree 'correctness\serial-native-171' (Join-Path $finding 'causal-native-171')
Queue-Tree 'correctness\original-160' (Join-Path $finding 'untimed-160')
Queue-Tree 'correctness\default-native-165' (Join-Path $finding 'default-164\untimed-165\Native')
Queue-Tree 'correctness\default-167' (Join-Path $finding 'default-164\untimed-167')

$driverConfig = Get-Content -LiteralPath (Join-Path $run 'driver-config-173.json') -Raw | ConvertFrom-Json -DateKind String
Queue-File 'selected-pe\Baseline-Kestrel.Core.dll' $driverConfig.specimens.Baseline.Owner.Path
Queue-File 'selected-pe\Candidate-Kestrel.Core.dll' $driverConfig.specimens.Candidate.Owner.Path
Queue-File 'selected-pe\Microsoft.AspNetCore.Server.Kestrel.Microbenchmarks.dll' $driverConfig.specimens.Baseline.Fixture.Path
Queue-File 'selected-pe\AutoPerf.F198.Benchmark163.dll' (Join-Path (Split-Path $driverConfig.specimens.Baseline.Owner.Path -Parent) $driverConfig.adapterFile)

if (@($inputs.file | Select-Object -Unique).Count -ne $inputs.Count -or
    $inputs.Count -gt 1000 -or ($inputs | Measure-Object -Property bytes -Sum).Sum -gt 67108864)
{
    throw 'Selected evidence membership or bounded snapshot size differs.'
}
$null = New-Item -ItemType Directory -Path $destination
foreach ($inputFile in $inputs)
{
    $target = [IO.Path]::GetFullPath((Join-Path $destination $inputFile.file))
    if (-not $target.StartsWith($destination + '\', [StringComparison]::OrdinalIgnoreCase))
    {
        throw 'Selected evidence must remain inside F198.'
    }
    $null = [IO.Directory]::CreateDirectory((Split-Path $target -Parent))
    [IO.File]::Copy($inputFile.sourcePath, $target, $false)
    if ((Get-Item -LiteralPath $target).Length -ne $inputFile.bytes -or
        (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -cne $inputFile.sha256)
    {
        throw 'Copied evidence bytes differ.'
    }
}
Write-NewJson (Join-Path $destination 'evidence-selection.json') ([ordered]@{
    findingId = 'F198'
    recordedUtc = [DateTime]::UtcNow.ToString('o')
    files = $inputs
    scope = 'Complete retained Original comparison outputs, selected correctness/provenance, four selected PE files. Inventories are supplied but full native/perf images, SDK/runtime/compiler and complete source graphs are not supplied.'
    noNewCounterOrBenchmarkExecution = $true
})
$publication = [ordered]@{
    folder = 'F198'
    run = $PSScriptRoot
    expectedParentIndex = 'd8f16e467c033c4f0062eeb1b92d7804adc2bf0e'
    performancePrAuthorized = $false
    completedComparisons = @([ordered]@{
        findingId = 'F198'
        closedBudgetFile = (Join-Path $run 'diagnostic-budget.json')
        closedBudgetSha256 = '0BFA4006C3EA313F10E5035CA6AF7C09131EED5EC10A18AE2A529C5535690F12'
        authorizations = 1
        actualOutcomeFile = (Join-Path $run 'Original-comparison-173\outcome.json')
        actualOutcomeSha256 = '32552182F0DE4C75616CC86FB952475498260A90119124D97D46C1FD1CC1E9A2'
    })
    subtype = 'inconclusive-control-drift'
    outcomes = @([ordered]@{
        id = 'F198'
        status = 'no-gain'
        note = 'Administrativeno-gain,subtypeinconclusive-control-drift,NOTmeasuredzerobenefitorverifiedregression. Whole real graceful transport drain,notrequestthroughput. One-line Task.WhenAll array clone removal; F199abortpathunchanged. Causal native2rows/variant andrealproducer4cases/variant passed; nativecaseCLR/MVIDnotdirectlysampled,common/measurementowner-fixture-CoreLibSHA/MVIDbound. Originalonly sevenfreshprocess BaselineBefore/Candidate/BaselineAfterblocks,21hosts84rows42084rawresults. Five frozen10percent baseline controls failed atcount0; primary16elapsedreduction-0.060603percent andallocation2.411168percent do not establish benefit; no retuning/exclusion/retry. Actual completedcomparison1of3permanentlyclosed; noDefaultauthorization. Fullrawoutputs plusselectedsources/4PEs/inventories supplied,notwholeSDK/runtime/imageclosure. Originalfailedparallel native setup record preserved,serial2passes/role; originalswallowedexceptionunknown,norace/productregressionclaim.'
        readmeRow = '| F198 | No qualified gain: inconclusive | [jaslawinMs/aspnetcore#{{ISSUE_NUMBER}}]({{ISSUE_URL}}): completed 7-block study failed baseline drift controls; 1/3 permanently closed, no retry, Default comparison or PR. [Evidence](F198/README.md) |'
    })
    authoredMarkdown = @('README.md')
    evidenceCommitTitle = 'Record F198 completed transport-drain comparison with failed controls'
    evidenceCommitDescription = 'Preserve every raw result and frozen protocol, actual correctness and identities, the prior native setup failure, and the unchanged permanently closed budget. Control drift prevents gain or regression claims. No retry, Default comparison, implementation PR or report change.'
    indexCommitTitle = 'Finalize F198 as control-inconclusive at 234 of 358'
    issueSearch = 'F198 in:title'
    issueTitle = '[AutoPerf F198] Kestrel graceful-drain comparison inconclusive after baseline control drift'
}
Write-NewJson (Join-Path $PSScriptRoot 'publication-config.json') $publication
[ordered]@{
    actualSelectedFiles = $inputs.Count
    actualSelectedBytes = ($inputs | Measure-Object -Property bytes -Sum).Sum
    actualNoNewBenchmark = $true
    destination = $destination
} | ConvertTo-Json
