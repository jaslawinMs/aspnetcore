$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
if (Test-Path -LiteralPath '.\payload-seal-v1.json') { throw 'Single-use payload sealer cannot be replayed.' }
$policyBytes = [IO.File]::ReadAllBytes('..\policy.json')
$policy = $utf8.GetString($policyBytes) | ConvertFrom-Json
if ($policy.independentFindingPreparationWorkers.F206 -ne '2acd453e-18ab-4dd5-b36b-753c5e5a0a21' -or
    @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
    $policy.actualWorkerBuildHoldActive -ne $false -or
    $policy.buildAndTestWorkQuiesced -ne $false -or
    -not $policy.activeWorkerPreparationScopes.F206.StartsWith('245 ') -or
    (Test-Path -LiteralPath '..\benchmark-exclusive.lease.json'))
{
    throw 'Payload sealer denied by current guards.'
}
[IO.File]::WriteAllBytes('.\payload-seal-guard-v1.policy.json', $policyBytes)
$initial = Get-Content -LiteralPath '.\collection-initial-v1.json' -Raw | ConvertFrom-Json
$closure = Get-Content -LiteralPath '.\collection-closure-v1.json' -Raw | ConvertFrom-Json
$inspection = Get-Content -LiteralPath '.\inspection-frozen-v1.json' -Raw | ConvertFrom-Json
$assessment = Get-Content -LiteralPath '.\assessment-v1.json' -Raw | ConvertFrom-Json
if ($initial.state -ne 'completed' -or $closure.state -ne 'completed' -or
    $assessment.disposition -ne 'SOURCE_ONLY_MATERIALITY_UNESTABLISHED_NO_CANDIDATE')
{
    throw 'Source handoff is not in the expected completed source-only state.'
}
$commands = @($initial.commands) + @($closure.commands)
if ($commands.Count -ne 70) { throw 'Unexpected source-read native command inventory.' }
foreach ($command in $commands)
{
    if ($command.exitCode -ne 0 -or -not $command.waitForExitReturned -or
        -not $command.stdoutDrainCompleted -or -not $command.stderrDrainCompleted -or
        $null -ne $command.failure)
    {
        throw "Nonterminal or failed source read: $($command.label)"
    }
    foreach ($stream in @('stdout', 'stderr'))
    {
        $actual = Get-FileHash -LiteralPath $command."${stream}Path" -Algorithm SHA256
        if ($actual.Hash -ne $command."${stream}Sha256") { throw "Raw stream changed: $($command.label) $stream" }
    }
}
$sources = @($initial.copiedFiles) + @($closure.files) + @($inspection.packageDocumentationCopies)
foreach ($source in $sources)
{
    if ((Get-Item -LiteralPath $source.path).Length -ne $source.bytes -or
        (Get-FileHash -LiteralPath $source.path -Algorithm SHA256).Hash -ne $source.sha256)
    {
        throw "Whole frozen source changed: $($source.path)"
    }
}
foreach ($receiptName in @('invocation-initial-v1.json', 'invocation-closure-v1.json'))
{
    $receipt = Get-Content -LiteralPath ".\$receiptName" -Raw | ConvertFrom-Json
    if ($receipt.childExitCode -ne 0 -or -not $receipt.waitForExitReturned -or
        -not $receipt.stdoutDrainCompleted -or -not $receipt.stderrDrainCompleted -or
        $null -ne $receipt.failure)
    {
        throw "Source collector root/streams were not observed terminal: $receiptName"
    }
    if ((Get-FileHash -LiteralPath $receipt.helperPath -Algorithm SHA256).Hash -ne $receipt.helperSha256)
    {
        throw "Executed collector helper bytes changed: $receiptName"
    }
}
foreach ($scriptBinding in @(
    @{ path = '.\collect-initial-source-v1.ps1'; expected = $initial.scriptSha256 },
    @{ path = '.\collect-closure-v1.ps1'; expected = $closure.scriptSha256 },
    @{ path = '.\inspect-frozen-source-v1.ps1'; expected = $inspection.scriptSha256 }
))
{
    if ((Get-FileHash -LiteralPath $scriptBinding.path -Algorithm SHA256).Hash -ne $scriptBinding.expected)
    {
        throw "Executed helper bytes changed: $($scriptBinding.path)"
    }
}
foreach ($file in Get-ChildItem -LiteralPath '.' -File -Recurse -Filter '*.json')
{
    $null = [IO.File]::ReadAllText($file.FullName) | ConvertFrom-Json
}
$excluded = @(
    'payload-seal-v1.json',
    'sealer-v1.stdout.bin',
    'sealer-v1.stderr.bin',
    'sealer-observed-exit-v1.json',
    'WHOLE-SEAL-v1.json'
)
$files = @()
foreach ($file in Get-ChildItem -LiteralPath '.' -File -Recurse -Force | Sort-Object FullName)
{
    if (($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'No reparse-point payload is permitted.' }
    $relative = [IO.Path]::GetRelativePath($PSScriptRoot, $file.FullName)
    if ($relative -in $excluded) { continue }
    $files += @{
        path = $relative
        bytes = $file.Length
        sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
}
$seal = [ordered]@{
    findingId = 'F206'
    ownerId = '2acd453e-18ab-4dd5-b36b-753c5e5a0a21'
    recordedUtc = [DateTime]::UtcNow.ToString('o')
    sealerPid = $PID
    sealerIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" |
        Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    disposition = $assessment.disposition
    originalCommit = $initial.originalCommit
    defaultCommit = $initial.defaultCommit
    roleFilePairs = @($inspection.rolePairs).Count
    wholeSourceBindingsReverified = $sources.Count
    sourceReadNativeCommandsReverified = $commands.Count
    allSourceReadRootWaitsAndBothRawStreamsCompleted = $true
    allCollectorChildRootsObservedExitZero = $true
    exitObservationBoundary = 'Not self-attested. The outside observer must wait for this child and record its actual exit and stream drains.'
    transientExclusions = $excluded
    exclusionReason = 'Self plus not-yet-terminal sealer stdout/stderr/outside observation and outer whole seal. The outside observer seals the complete finished tree after this child actually exits and both streams drain.'
    fileCount = $files.Count
    files = $files
}
[IO.File]::WriteAllText('.\payload-seal-v1.json', ($seal | ConvertTo-Json -Depth 15) + "`n", $utf8)
[Console]::WriteLine("PAYLOAD_SEALED files=$($files.Count) sourceBindings=$($sources.Count) nativeReads=$($commands.Count) sealerPid=$PID")
