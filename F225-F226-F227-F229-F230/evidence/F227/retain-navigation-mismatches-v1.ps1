$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$receiptPath = '.\navigation-mismatch-bindings-v1.json'
if ([IO.File]::Exists($receiptPath)) { throw 'Single-use mismatch retainer cannot be replayed.' }
$acceptance = [IO.File]::ReadAllText('.\acceptance-v1.json') | ConvertFrom-Json
$inspection = [IO.File]::ReadAllText('.\inspection-source-bindings-v1.json') | ConvertFrom-Json
$par = Split-Path -Parent $PSScriptRoot
$policyBytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
$policy = $utf8.GetString($policyBytes) | ConvertFrom-Json
$guard = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    ownerId = $policy.independentFindingPreparationWorkers.F227
    ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
    scope = $policy.activeWorkerPreparationScopes.F227
    hold = $policy.actualWorkerBuildHoldActive
    quiesced = $policy.buildAndTestWorkQuiesced
    leasePath = Join-Path $par 'benchmark-exclusive.lease.json'
    leaseExists = [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
    policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($policyBytes))
}
[IO.File]::WriteAllBytes('.\navigation-mismatch-bindings-v1.policy.json', $policyBytes)
if ($guard.ownerId -cne $acceptance.ownerBackgroundId -or $guard.scope -cne $acceptance.registeredScopeExact -or $guard.ownerCount -gt 4 -or $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists) { throw 'Fresh exact-scope mismatch-retention guard denied.' }
$result = [ordered]@{
    processId = $PID
    processIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    guard = $guard
    context = 'Retain the two already-observed navigation/raw-source mismatches; no additional logical source path, Git/gh invocation, source rewrite, runtime probe or candidate.'
    reservedHeadContextOnly = $acceptance.reservedNavigationHeadNotDefault
    files = @()
    state = 'running'
}
foreach ($observation in $inspection.navigationLspBindings)
{
    $from = Join-Path 'C:\src\aspnetcore' $observation.logicalPath
    $bytes = [IO.File]::ReadAllBytes($from)
    $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    if ($hash -cne $observation.sha256) { throw 'Navigation bytes changed since the preserved mismatch observation; stop without rewriting the earlier receipt.' }
    $relative = "navigation-observed\$($observation.logicalPath)"
    $to = Join-Path $PSScriptRoot $relative
    $null = [IO.Directory]::CreateDirectory((Split-Path -Parent $to))
    $stream = [IO.File]::Open($to, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try { $stream.Write($bytes) }
    finally { $stream.Dispose() }
    $text = $utf8.GetString($bytes)
    $lfText = $text.Replace("`r`n", "`n")
    $lfHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($utf8.GetBytes($lfText)))
    $roleComparisons = @()
    foreach ($role in @('Original', 'Default'))
    {
        $roleBytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot "source\$role\$($observation.logicalPath)"))
        $roleText = $utf8.GetString($roleBytes)
        $roleComparisons += @{
            role = $role
            rawSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($roleBytes))
            rawByteEqual = ([Convert]::ToBase64String($bytes) -ceq [Convert]::ToBase64String($roleBytes))
            exactDecodedTextEqual = ($text -ceq $roleText)
            crlfToLfOnlyTextEqual = ($lfText -ceq $roleText.Replace("`r`n", "`n"))
        }
    }
    $result.files += @{
        path = $relative; logicalPath = $observation.logicalPath; rawSha256 = $hash; bytes = $bytes.Length
        role = 'NavigationObservedRaw'; immutableCommitClaim = $false
        crlfPairs = [regex]::Matches($text, "`r`n").Count
        lineFeeds = [regex]::Matches($text, "`n").Count
        carriageReturns = [regex]::Matches($text, "`r").Count
        secondaryCrlfToLfOnlySha256 = $lfHash
        comparisons = $roleComparisons
        boundary = 'Raw mismatch remains preserved and is never relabeled byte-identical. Secondary CRLF-to-LF text comparison is navigation-only, not immutable source or selected-runtime identity.'
    }
}
$result.state = 'completed'
$result.recordedUtc = [DateTime]::UtcNow.ToString('o')
[IO.File]::WriteAllText($receiptPath, ($result | ConvertTo-Json -Depth 15) + "`n", $utf8)
$result | ConvertTo-Json -Depth 7
