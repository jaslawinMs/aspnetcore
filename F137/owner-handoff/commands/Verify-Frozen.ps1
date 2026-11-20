$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$receiptPath = Join-Path $Root 'seal-verification.json'
if(Test-Path -LiteralPath $receiptPath) {throw 'Verification receipt already exists; never overwrite it'}
function Read-Sha256([string]$Path)
{
    $stream = [IO.File]::OpenRead($Path)
    $hasher = [Security.Cryptography.SHA256]::Create()
    try {return [Convert]::ToHexString($hasher.ComputeHash($stream)).ToLowerInvariant()}
    finally {$hasher.Dispose();$stream.Dispose()}
}
$manifestPath = Join-Path $Root 'frozen-files.json'
$manifestSha = Read-Sha256 $manifestPath
$shaLine = (Get-Content -LiteralPath (Join-Path $Root 'frozen-files.sha256') -Raw).Trim() -split '\s+'
if($shaLine.Count -ne 2 -or $shaLine[0] -ne $manifestSha -or $shaLine[1] -ne 'frozen-files.json') {throw 'Manifest envelope hash mismatch'}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$indexed = @{}
$verifiedBytes = 0L
foreach($entry in $manifest.files)
{
    if($indexed.ContainsKey($entry.path) -or $entry.path -like 'scratch\*' -or
        [IO.Path]::IsPathRooted($entry.path) -or '..' -in ($entry.path -split '[\\/]'))
    {
        throw "Invalid manifest path: $($entry.path)"
    }
    $physical = Get-Item -LiteralPath (Join-Path $Root $entry.path)
    if($physical.Length -ne $entry.length -or (Read-Sha256 $physical.FullName) -ne $entry.sha256 -or -not $physical.IsReadOnly)
    {
        throw "Independent byte/read-only verification failed: $($entry.path)"
    }
    $indexed.Add($entry.path,$entry)
    $verifiedBytes += $physical.Length
}
if($indexed.Count -ne $manifest.payloadFileCount -or $verifiedBytes -ne $manifest.payloadBytes) {throw 'Manifest count/length total mismatch'}
$actualPaths = @()
foreach($name in @('acceptance.json','handoff.json','HANDOFF.txt','commands','evidence','source','probe','images','results'))
{
    $item = Get-Item -LiteralPath (Join-Path $Root $name)
    $items = if($item.PSIsContainer) {@(Get-ChildItem -LiteralPath $item.FullName -Recurse -File -Force)} else {@($item)}
    foreach($file in $items)
    {
        $relative = [IO.Path]::GetRelativePath($Root,$file.FullName)
        if(-not $indexed.ContainsKey($relative)) {throw "Unmanifested payload file: $relative"}
        $actualPaths += $relative
    }
}
if($actualPaths.Count -ne $indexed.Count) {throw 'Payload file count changed after sealing'}
$images = Get-Content (Join-Path $Root 'evidence\complete-image-audit.json') -Raw | ConvertFrom-Json
if(@($manifest.files | Where-Object path -Like 'images\*').Count -ne 3592 -or
    $images.commonCompiledConsumerByteIdentity.Count -ne 28 -or
    $images.gateSelfTests.Count -ne 11 -or
    @($images.gateSelfTests | Where-Object outcome -NE 'Passed').Count -ne 0)
{
    throw 'Image/common-once/gate audit boundary changed'
}
$roleResults = @()
foreach($role in @('original','default'))
{
    $main = Get-Content (Join-Path $Root "results\$role-complete\producer.json") -Raw | ConvertFrom-Json
    $edge = Get-Content (Join-Path $Root "results\$role-empty-edge\producer.json") -Raw | ConvertFrom-Json
    $parsed = Get-Content (Join-Path $Root "results\$role\existing-tests-parsed.json") -Raw | ConvertFrom-Json
    [xml]$trx = Get-Content (Join-Path $Root "results\$role\existing.trx") -Raw
    $nativeRows = @($trx.TestRun.Results.UnitTestResult)
    if($nativeRows.Count -ne 10 -or $parsed.rows.Count -ne 10) {throw "Unexpected exact existing-test count: $role"}
    foreach($native in $nativeRows)
    {
        $matching = @($parsed.rows | Where-Object {$_.testId -eq $native.testId -and $_.executionId -eq $native.executionId})
        if($matching.Count -ne 1 -or $native.outcome -ne 'Passed' -or
            $matching[0].outcome -ne 'Passed' -or $matching[0].testName -ne $native.testName)
        {
            throw "Individual native XML/result row mismatch: $role $($native.testName)"
        }
    }
    $passed = @($main.rows | Where-Object outcome -EQ 'Passed')
    $failed = @($main.rows | Where-Object outcome -EQ 'Failed')
    if($main.rows.Count -ne 18 -or $passed.Count -ne 17 -or $failed.Count -ne 1 -or
        $failed[0].name -ne 'EmptyCompilePath_NormalizerRejects' -or
        $main.failed -ne 1 -or $main.assertions -ne 97 -or
        $edge.name -ne 'EmptyCompilePath_RealProjectFileSystemRejectsEmptyPath' -or
        $edge.outcome -ne 'Passed' -or $edge.assertions -ne 5 -or $main.ownerIdentities.Count -ne 4)
    {
        throw "Preserved producer/edge result boundary changed: $role"
    }
    $roleResults += [ordered]@{
        role=$role
        runtime=$main.runtime.frameworkDescription
        rollForward=$main.runtime.rollForward
        exactNativeXmlRowsPassed=$nativeRows.Count
        everyTheoryAndResultRowReconciled=$true
        acceptedContractRows=$passed.Count+1
        validAssertionChecks=$main.assertions+$edge.assertions-1
        checksExecutedIncludingKnownBadProbe=$main.assertions+$edge.assertions
        preservedWrongProbe=$failed[0].name
        supplementalPassingEdge=$edge.name
        selectedLoadedOwnerPePdbSourceAssociations=$main.ownerIdentities.Count
        ownerDllSha256=$main.ownerIdentities[0].sha256
    }
}
$terminal = Get-Content (Join-Path $Root 'evidence\native-process-terminal-audit.json') -Raw | ConvertFrom-Json
$observations = @($terminal.nativeCommandReceipts | ForEach-Object {$_.observedProcesses})
if($terminal.recordedNativeCommands -ne 65 -or -not $terminal.everyObservedNativePidTerminal -or
    @($observations | Where-Object {-not $_.terminalObserved}).Count -ne 0)
{
    throw 'Preserved native terminal audit is incomplete'
}
$active = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CommandLine |
    Where-Object {$_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine.Contains($Root)})
if($active.Count -ne 0) {throw 'Owned-root process command lines remain; cannot acknowledge terminal state'}
if((Read-Sha256 $manifestPath) -ne $manifestSha) {throw 'Manifest changed during independent verification'}
$receipt = [ordered]@{
    finding='F137'
    verifiedUtc=[DateTime]::UtcNow.ToString('o')
    manifest='frozen-files.json'
    manifestSha256=$manifestSha
    frozenPayloadFiles=$indexed.Count
    payloadBytes=$verifiedBytes
    actualConsumerImageFiles=3592
    commonCompiledConsumerFiles=28
    independentFullPayloadRehashPassed=$true
    allPayloadFilesReadOnly=$true
    everyActualConsumerImageEntryCovered=$true
    noScratchCloneBuildObjOrToolchainTreesIncluded=$true
    roleResults=$roleResults
    gateSelfTestsPassed=11
    originalDefaultOwnerOnlyGateRejectedDifferences=$images.originalDefaultRealFullImageGate.rejectedDifferenceCount
    originalDefaultSameRuntimeIdentity=$images.originalDefaultRealFullImageGate.sameRuntimeIdentity
    notACausalPerformancePair=$true
    nativeCommandsRecordedBeforeHold=65
    nativeProcessObservations=$observations.Count
    allObservedOwnedNativePidsTerminal=$true
    freshOwnedRootCommandLinesRemaining=0
    noNewBuildTestHostDotnetRestoreOrBenchmarkAfterRelease=$true
    preservedHoldReceipt='evidence\hold-F145-001.json'
    releaseReceipt='evidence\release-F145-001.json'
    envelopeBoundary='This post-seal verification receipt is an envelope, not a payload entry. frozen-files.json binds the complete selected payload and this verification script; independently compare the published manifest SHA and rerun the hash/result checks.'
    compilerAttestationBoundary='Selected loaded PE/PDB/physical-source associations only; not full compiler-input attestation. External pinned runtimes and SDK prerequisites are inventoried separately, not copied into this payload.'
    freshnessBoundary='GitHub main was freshly queried at entry and after functional execution before the hold; both were 00560e2dd1954a2acf2bc54b35422b0f32484bf1. No new GitHub request or freshness claim after release.'
}
$receipt | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $receiptPath -Encoding utf8
(Get-Item -LiteralPath $receiptPath).IsReadOnly = $true
$receipt | ConvertTo-Json -Depth 15
