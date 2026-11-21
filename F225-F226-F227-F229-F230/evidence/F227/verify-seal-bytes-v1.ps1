$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
if ([IO.File]::Exists('.\verification-seal-bytes-v1.json')) { throw 'Single-use byte verifier cannot be replayed.' }
$acceptance = [IO.File]::ReadAllText('.\acceptance-v1.json') | ConvertFrom-Json
$par = Split-Path -Parent $PSScriptRoot
$policyBytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
$policy = $utf8.GetString($policyBytes) | ConvertFrom-Json
$guard = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    ownerId = $policy.independentFindingPreparationWorkers.F227
    ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
    scope = $policy.activeWorkerPreparationScopes.F227
    hold = $policy.actualWorkerBuildHoldActive; quiesced = $policy.buildAndTestWorkQuiesced
    leaseExists = [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
    policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($policyBytes))
}
[IO.File]::WriteAllBytes('.\verification-seal-bytes-v1.policy.json', $policyBytes)
$result = [ordered]@{
    processId = $PID
    identity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    guard = $guard; startedUtc = [DateTime]::UtcNow.ToString('o')
    state = 'running'; failure = $null
    scope = 'Retained-byte/JSON/process-receipt verification only. No Git/gh source roots, new source discovery, candidate, SDK, test, browser or product runtime.'
    verifiedBindings = @(); sourceCollectorObserverPairs = @()
}
function Digest([string] $Path)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($Path)))
}
function Check([string] $Path, [long] $Bytes, [string] $Sha256)
{
    if (([IO.FileInfo]::new($Path)).Length -ne $Bytes -or (Digest $Path) -cne $Sha256) { throw "Retained evidence fingerprint mismatch: $Path" }
    $result.verifiedBindings += @{ path = $Path; bytes = $Bytes; sha256 = $Sha256 }
}
try
{
    if ($guard.ownerId -cne $acceptance.ownerBackgroundId -or $guard.scope -cne $acceptance.registeredScopeExact -or $guard.ownerCount -gt 4 -or $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists) { throw 'Fresh exact-scope byte-verifier guard denied.' }
    $final = [IO.File]::ReadAllText('.\collection-final-source-v1.json') | ConvertFrom-Json
    if ($final.state -cne 'completed' -or $null -ne $final.failure -or $final.nativeReadRootCount -ne 25 -or $final.nativeReadAttemptCount -ne 25) { throw 'Source closure is not the successful 25-reader result.' }
    foreach ($binding in $final.fileVerifications) { Check $binding.path $binding.bytes $binding.sha256 }
    foreach ($binding in $final.immutableExecutedHelpersVerified)
    {
        if ((Digest $binding.path) -cne $binding.hash) { throw 'An earlier executed helper changed.' }
    }
    if ((Digest '.\collect-final-source-v1.ps1') -cne $final.scriptSha256) { throw 'Successful final collector changed.' }
    $before = [IO.File]::ReadAllText('.\pre-final-files-v1.json') | ConvertFrom-Json
    foreach ($binding in $before.files) { Check $binding.path $binding.bytes $binding.sha256 }
    foreach ($receipt in @('observer-source-v1.json', 'observer-contract-history-v1.json', 'observer-final-source-v2.json'))
    {
        $observer = [IO.File]::ReadAllText($receipt) | ConvertFrom-Json
        if ($observer.rootExitCode -ne 0 -or -not $observer.rootWaitReturned -or -not $observer.stdoutDrainCompleted -or -not $observer.stderrDrainCompleted -or $null -ne $observer.failure -or $observer.observerPid -eq $observer.rootPid) { throw "Collector/outside-observer root closure is incomplete: $receipt" }
        foreach ($name in @('stdout', 'stderr')) { Check $observer."${name}Path" $observer."${name}Bytes" $observer."${name}Sha256" }
        $script = switch ($receipt) { 'observer-source-v1.json' { 'observe-source-v1.ps1' } 'observer-contract-history-v1.json' { 'observe-contract-history-v1.ps1' } 'observer-final-source-v2.json' { 'observe-final-source-v2.ps1' } }
        if ((Digest $script) -cne $observer.observerScriptSha256) { throw "Executed observer bytes changed: $script" }
        $result.sourceCollectorObserverPairs += @{ receipt = $receipt; collectorPid = $observer.rootPid; observerPid = $observer.observerPid; rootExit = $observer.rootExitCode; rootWait = $observer.rootWaitReturned; bothStreamsDrained = $true; observedChildren = @($observer.observedChildren); observedChildTerminals = @($observer.observedChildTerminals) }
    }
    $firstFailureBinding = [IO.File]::ReadAllText('.\observer-final-source-v2.json') | ConvertFrom-Json
    if ((Digest '.\observe-final-source-v1.ps1') -cne $firstFailureBinding.priorFailedAttempt.unchangedHelperSha256) { throw 'Preserved failed v1 observer bytes changed.' }
    $allNative = @($final.terminalVerifications | Where-Object { $null -ne $_.PSObject.Properties['nativeRootPid'] })
    if ($allNative.Count -ne 25) { throw 'Native root terminal receipt count differs from 25.' }
    foreach ($root in $allNative)
    {
        if ($root.exit -ne 0 -or -not $root.rootWait -or -not $root.stdoutDrained -or -not $root.stderrDrained -or @($root.observedChildren).Count -ne @($root.observedChildTerminals).Count) { throw 'A recorded native reader or its observed-child receipt is incomplete.' }
    }
    $jsonChecks = @()
    foreach ($path in [IO.Directory]::EnumerateFiles($PSScriptRoot, '*.json', [IO.SearchOption]::AllDirectories))
    {
        $null = [IO.File]::ReadAllText($path) | ConvertFrom-Json -ErrorAction Stop
        $jsonChecks += @{ path = [IO.Path]::GetRelativePath($PSScriptRoot, $path); sha256 = Digest $path }
    }
    $result.jsonChecks = $jsonChecks
    $result.nativeReadRootCount = 25
    $result.additionalGitGhStarts = 0
    $result.nativeObservedChildCount = $final.nativeObservedChildCount
    $result.nativeObservedChildTerminalCount = $final.nativeObservedChildTerminalCount
    $result.observerOuterFailureBoundary = 'The final source observer v2 observed its collector exit 0 and drained both streams, then its actual enclosing tool exited 1 during index metadata construction. Its terminal root receipt does not claim a successful outer seal; both failed outer outcomes are separately retained.'
    $result.state = 'completed'
}
catch { $result.state = 'failed'; $result.failure = $_.Exception.ToString(); throw }
finally
{
    $result.finishedUtc = [DateTime]::UtcNow.ToString('o')
    [IO.File]::WriteAllText('.\verification-seal-bytes-v1.json', ($result | ConvertTo-Json -Depth 20) + "`n", $utf8)
}
"F227 byte-verifier completed; pid=$PID; retained bindings=$($result.verifiedBindings.Count); native readers remain25; new Git/gh=0; product execution=0."
