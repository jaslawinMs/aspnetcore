param([switch]$VerifyOnly)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$manifestPath = Join-Path $PSScriptRoot 'frozen-files.json'
$shaPath = Join-Path $PSScriptRoot 'frozen-files.sha256'
$verificationPath = Join-Path $PSScriptRoot 'verification.json'
function Read-Sha256([string]$Path)
{
    $stream = [IO.File]::OpenRead($Path)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try {return [Convert]::ToHexString($hasher.ComputeHash($stream)).ToLowerInvariant()}
    finally {$hasher.Dispose();$stream.Dispose()}
}
if(-not $VerifyOnly)
{
    if((Test-Path $manifestPath) -or (Test-Path $shaPath) -or (Test-Path $verificationPath)) {throw 'Never overwrite a finalization output'}
    $priorPath = Join-Path $Root 'frozen-files.json'
    if((Get-FileHash -LiteralPath $priorPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne '1341b0fe0cb2d9fd558a99a8f79cde94336f2b1300700ac6f07e3601ec47a2fc')
    {
        throw 'Prior failed seal changed'
    }
    $prior = Get-Content -LiteralPath $priorPath -Raw | ConvertFrom-Json
    if($prior.files.Count -ne 3992 -or $null -ne $prior.payloadBytes) {throw 'Prior failure boundary changed'}
    $rows = @($prior.files)
    foreach($relative in @('frozen-files.json','frozen-files.sha256',
        'seal-finalization-002\handoff.json','seal-finalization-002\sealing-attempts.json',
        'seal-finalization-002\Seal-And-Verify.ps1','seal-finalization-002\attempt001-freeze-stdout.txt'))
    {
        $file = Get-Item -LiteralPath (Join-Path $Root $relative)
        $rows += [pscustomobject]@{path=$relative;length=$file.Length;sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
    }
    $total = 0L
    foreach($row in $rows) {$total += [long]$row.length}
    [ordered]@{
        schema='F137 final additive selected-payload manifest v2'
        sealedUtc=[DateTime]::UtcNow.ToString('o')
        entryPathsRelativeTo='..'
        payloadFileCount=$rows.Count
        payloadBytes=$total
        originalUnchangedPayloadFiles=3992
        actualConsumerImageFiles=3592
        excluded='scratch wholesale: source clones/build/obj/temp/CLI-home and toolchain trees'
        envelopeFilesExcluded=@('seal-finalization-002\frozen-files.json','seal-finalization-002\frozen-files.sha256','seal-finalization-002\verification.json')
        associationBoundary='Selected loaded PE/PDB/physical-source associations, not complete compiler-input attestation. External pinned prerequisites inventoried separately.'
        files=@($rows | Sort-Object path)
    } | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $manifestPath -Encoding utf8
    $sha = (Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
    "$sha  frozen-files.json" | Set-Content -LiteralPath $shaPath -Encoding utf8
    foreach($row in $rows) {(Get-Item -LiteralPath (Join-Path $Root $row.path)).IsReadOnly=$true}
    (Get-Item -LiteralPath $manifestPath).IsReadOnly=$true
    (Get-Item -LiteralPath $shaPath).IsReadOnly=$true
}
$manifestSha = Read-Sha256 $manifestPath
$envelope = (Get-Content -LiteralPath $shaPath -Raw).Trim() -split '\s+'
if($envelope.Count -ne 2 -or $envelope[0] -ne $manifestSha -or $envelope[1] -ne 'frozen-files.json') {throw 'Final manifest SHA envelope mismatch'}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$index = @{}
$verifiedBytes = 0L
foreach($row in $manifest.files)
{
    if($index.ContainsKey($row.path) -or $row.path -like 'scratch\*' -or
        [IO.Path]::IsPathRooted($row.path) -or '..' -in ($row.path -split '[\\/]'))
    {
        throw "Invalid selected-payload path: $($row.path)"
    }
    $file = Get-Item -LiteralPath (Join-Path $Root $row.path)
    if($file.Length -ne $row.length -or (Read-Sha256 $file.FullName) -ne $row.sha256 -or -not $file.IsReadOnly)
    {
        throw "Independent full-byte verification failed: $($row.path)"
    }
    $index.Add($row.path,$row)
    $verifiedBytes += $file.Length
}
if($index.Count -ne $manifest.payloadFileCount -or $verifiedBytes -ne $manifest.payloadBytes) {throw 'Final count/Int64 byte total mismatch'}
$originalPaths = @()
foreach($name in @('acceptance.json','handoff.json','HANDOFF.txt','commands','evidence','source','probe','images','results'))
{
    $item = Get-Item -LiteralPath (Join-Path $Root $name)
    $files = if($item.PSIsContainer) {@(Get-ChildItem -LiteralPath $item.FullName -Recurse -File -Force)} else {@($item)}
    foreach($file in $files)
    {
        $relative = [IO.Path]::GetRelativePath($Root,$file.FullName)
        if(-not $index.ContainsKey($relative)) {throw "Unmanifested original payload file: $relative"}
        $originalPaths += $relative
    }
}
if($originalPaths.Count -ne 3992) {throw 'Original selected payload changed'}
$images = Get-Content (Join-Path $Root 'evidence\complete-image-audit.json') -Raw | ConvertFrom-Json -AsHashtable
$imageCount = 0
foreach($image in $images.imageInventories.GetEnumerator())
{
    foreach($entry in $image.Value.GetEnumerator())
    {
        $relative = "images\$($image.Key)\$($entry.Key.Replace('/','\'))"
        if($index[$relative].sha256 -ne $entry.Value.sha256 -or $index[$relative].length -ne $entry.Value.length) {throw "Actual image inventory mismatch: $relative"}
        $imageCount++
    }
}
if($imageCount -ne 3592 -or @($manifest.files | Where-Object path -Like 'images\*').Count -ne 3592 -or
    $images.commonCompiledConsumerByteIdentity.Count -ne 28 -or $images.gateSelfTests.Count -ne 11 -or
    @($images.gateSelfTests | Where-Object outcome -NE 'Passed').Count -ne 0)
{
    throw 'Image/common-once/gate evidence boundary changed'
}
foreach($common in $images.commonCompiledConsumerByteIdentity)
{
    foreach($image in $common.images)
    {
        if($index["images\$image\$($common.file.Replace('/','\'))"].sha256 -ne $common.sha256) {throw 'Common-once compiled bytes changed'}
    }
}
$roleResults = @()
foreach($role in @('original','default'))
{
    $main = Get-Content (Join-Path $Root "results\$role-complete\producer.json") -Raw | ConvertFrom-Json
    $edge = Get-Content (Join-Path $Root "results\$role-empty-edge\producer.json") -Raw | ConvertFrom-Json
    $parsed = Get-Content (Join-Path $Root "results\$role\existing-tests-parsed.json") -Raw | ConvertFrom-Json
    [xml]$trx = Get-Content (Join-Path $Root "results\$role\existing.trx") -Raw
    $nativeRows = @($trx.TestRun.Results.UnitTestResult)
    if($nativeRows.Count -ne 10 -or $parsed.rows.Count -ne 10) {throw "Unexpected exact native test count: $role"}
    foreach($native in $nativeRows)
    {
        $matching = @($parsed.rows | Where-Object {$_.testId -eq $native.testId -and $_.executionId -eq $native.executionId})
        if($matching.Count -ne 1 -or $native.outcome -ne 'Passed' -or
            $matching[0].outcome -ne 'Passed' -or $matching[0].testName -ne $native.testName)
        {
            throw "Exact XML/theory result mismatch: $role $($native.testName)"
        }
    }
    $passed = @($main.rows | Where-Object outcome -EQ 'Passed')
    $failed = @($main.rows | Where-Object outcome -EQ 'Failed')
    if($main.rows.Count -ne 18 -or $passed.Count -ne 17 -or $failed.Count -ne 1 -or
        $failed[0].name -ne 'EmptyCompilePath_NormalizerRejects' -or $main.failed -ne 1 -or $main.assertions -ne 97 -or
        $edge.name -ne 'EmptyCompilePath_RealProjectFileSystemRejectsEmptyPath' -or $edge.outcome -ne 'Passed' -or
        $edge.assertions -ne 5 -or $main.ownerIdentities.Count -ne 4 -or $main.runtime.rollForward -ne 'Disable')
    {
        throw "Preserved producer/edge/runtime boundary changed: $role"
    }
    foreach($owner in $main.ownerIdentities)
    {
        foreach($identityFile in @(@{path=$owner.location;hash=$owner.sha256},@{path=$owner.pdbPath;hash=$owner.pdbSha256}))
        {
            if($index[[IO.Path]::GetRelativePath($Root,$identityFile.path)].sha256 -ne $identityFile.hash) {throw "Loaded PE/PDB hash mismatch: $role"}
        }
        $sourceRelative = [IO.Path]::GetRelativePath((Join-Path $Root "scratch\$role"),$owner.selectedDocument.physical)
        if($index["source\$role\$sourceRelative"].sha256 -ne $owner.selectedDocument.physicalSha256 -or
            -not $owner.selectedDocument.checksumMatches -or $owner.peCodeView.Guid -ne $owner.pdbId.guid -or
            $owner.peCodeView.Stamp -ne $owner.pdbId.stamp)
        {
            throw "Selected PE/PDB/physical-source association mismatch: $role"
        }
    }
    $roleResults += [ordered]@{
        role=$role;runtime=$main.runtime.frameworkDescription;rollForward=$main.runtime.rollForward
        nativeXmlRowsPassed=$nativeRows.Count;eachTheoryRowReconciled=$true
        acceptedProducerContractRows=$passed.Count+1;validAssertionChecks=$main.assertions+$edge.assertions-1
        checksExecutedIncludingKnownBadProbe=$main.assertions+$edge.assertions
        preservedWrongProbe=$failed[0].name;supplementalPassingEdge=$edge.name
        selectedLoadedPePdbSourceAssociations=$main.ownerIdentities.Count;ownerDllSha256=$main.ownerIdentities[0].sha256
    }
}
$terminal = Get-Content (Join-Path $Root 'evidence\native-process-terminal-audit.json') -Raw | ConvertFrom-Json
$observations = @($terminal.nativeCommandReceipts | ForEach-Object {$_.observedProcesses})
if($terminal.recordedNativeCommands -ne 65 -or -not $terminal.everyObservedNativePidTerminal -or
    @($observations | Where-Object {-not $_.terminalObserved}).Count -ne 0)
{
    throw 'Preserved native terminal receipts are incomplete'
}
$active = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CommandLine |
    Where-Object {$_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains($Root)})
if($active.Count -ne 0) {throw 'Other owned-root process command lines remain'}
if((Read-Sha256 $manifestPath) -ne $manifestSha) {throw 'Final manifest changed during verification'}
$receipt = [ordered]@{
    finding='F137';verifiedUtc=[DateTime]::UtcNow.ToString('o')
    manifest='frozen-files.json';manifestSha256=$manifestSha;entryPathsRelativeTo='..'
    frozenPayloadFiles=$index.Count;payloadBytes=$verifiedBytes;originalPayloadFilesUnchanged=3992
    actualConsumerImageFiles=$imageCount;commonCompiledConsumerFiles=28
    independentEveryByteVerificationPassed=$true;allSelectedPayloadFilesReadOnly=$true
    everyNativeXmlTheoryRowAndSelectedOwnerIdentityReconciled=$true;roleResults=$roleResults
    gateSelfTestsPassed=11;actualPairRejectedNonOwnerDifferences=$images.originalDefaultRealFullImageGate.rejectedDifferenceCount
    actualPairSameRuntimeIdentity=$images.originalDefaultRealFullImageGate.sameRuntimeIdentity
    notACausalPerformancePair=$true;nativeCommandsRecordedBeforeHold=65;nativeProcessObservations=$observations.Count
    allObservedOwnedNativePidsTerminal=$true;freshOtherOwnedRootCommandLinesRemaining=0
    noNewBuildTestHostDotnetRestoreOrBenchmarkAfterRelease=$true
    failedInitialSealAndDiagnosticRetained=$true;holdAndReleaseReceiptsFrozen=$true
    excluded='scratch clones/build/obj/toolchain trees; final manifest/SHA/verification envelopes'
    attestationBoundary='Selected PE/PDB/physical-source association only, not complete compiler-input attestation; external pinned prerequisites inventoried separately'
    freshnessBoundary='No post-release GitHub query or freshness claim; actual entry/post-functional-execution before-HOLD observations retained'
}
if(-not $VerifyOnly)
{
    $receipt | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $verificationPath -Encoding utf8
    (Get-Item -LiteralPath $verificationPath).IsReadOnly=$true
}
$receipt | ConvertTo-Json -Depth 15
