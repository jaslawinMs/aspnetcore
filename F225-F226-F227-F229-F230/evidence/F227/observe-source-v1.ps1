$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$receiptPath = Join-Path $PSScriptRoot 'observer-source-v1.json'
if ([IO.File]::Exists($receiptPath)) { throw 'Single-use observer: receipt exists.' }
$acceptance = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'acceptance-v1.json')) | ConvertFrom-Json
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
[IO.File]::WriteAllBytes((Join-Path $PSScriptRoot 'observer-source-v1.policy.json'), $policyBytes)
if ($guard.ownerId -cne $acceptance.ownerBackgroundId -or $guard.scope -cne $acceptance.registeredScopeExact -or $guard.ownerCount -gt 4 -or $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists) { throw 'Fresh exact-scope outer guard denied.' }
$record = [ordered]@{
    observerPid = $PID
    observerIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    observerScriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    guard = $guard
    rootPid = $null
    rootIdentity = $null
    executable = (Get-Command pwsh.exe -CommandType Application).Source
    argv = @('-NoProfile', '-NonInteractive', '-File', '.\collect-source-v1.ps1')
    workingDirectory = $PSScriptRoot
    helperSha256 = (Get-FileHash -LiteralPath '.\collect-source-v1.ps1' -Algorithm SHA256).Hash
    stdoutPath = 'source-v1.stdout.bin'
    stderrPath = 'source-v1.stderr.bin'
    startedUtc = [DateTime]::UtcNow.ToString('o')
    rootWaitReturned = $false
    rootExitCode = $null
    stdoutDrainCompleted = $false
    stderrDrainCompleted = $false
    observedChildren = @()
    failure = $null
    actualOuterToolExit = 'Not self-attested: bind the actual enclosing tool completion after return.'
}
$p = [Diagnostics.Process]::new()
$out = $null
$err = $null
try
{
    $p.StartInfo.FileName = $record.executable
    $p.StartInfo.WorkingDirectory = $PSScriptRoot
    $p.StartInfo.UseShellExecute = $false
    $p.StartInfo.RedirectStandardOutput = $true
    $p.StartInfo.RedirectStandardError = $true
    $p.StartInfo.CreateNoWindow = $true
    foreach ($arg in $record.argv) { $p.StartInfo.ArgumentList.Add($arg) }
    $out = [IO.File]::Open((Join-Path $PSScriptRoot $record.stdoutPath), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $err = [IO.File]::Open((Join-Path $PSScriptRoot $record.stderrPath), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    if (-not $p.Start()) { throw 'Collector did not start.' }
    $record.rootPid = $p.Id
    $ot = $p.StandardOutput.BaseStream.CopyToAsync($out)
    $et = $p.StandardError.BaseStream.CopyToAsync($err)
    $record.rootIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    $record.observedChildren = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($p.Id)" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
    $record.rootWaitReturned = $p.WaitForExit(300000)
    if (-not $record.rootWaitReturned) { throw 'Collector did not complete within finite wait; inspect its actual owned root before any continuation.' }
    $null = $ot.GetAwaiter().GetResult()
    $record.stdoutDrainCompleted = $true
    $null = $et.GetAwaiter().GetResult()
    $record.stderrDrainCompleted = $true
    $record.rootExitCode = $p.ExitCode
}
catch { $record.failure = $_.Exception.ToString(); throw }
finally
{
    if ($null -ne $out) { $out.Dispose() }
    if ($null -ne $err) { $err.Dispose() }
    $p.Dispose()
    $record.finishedUtc = [DateTime]::UtcNow.ToString('o')
    foreach ($name in @('stdout', 'stderr'))
    {
        $path = Join-Path $PSScriptRoot $record["${name}Path"]
        if ([IO.File]::Exists($path))
        {
            $record["${name}Bytes"] = ([IO.FileInfo]::new($path)).Length
            $record["${name}Sha256"] = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        }
    }
    $record.observedChildTerminals = @($record.observedChildren | ForEach-Object {
        $after = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.ProcessId)"
        @{ processId = $_.ProcessId; originalCreationDate = $_.CreationDate; absentOrDifferentIdentity = ($null -eq $after -or $after.CreationDate -ne $_.CreationDate); observedUtc = [DateTime]::UtcNow.ToString('o') }
    })
    [IO.File]::WriteAllText($receiptPath, ($record | ConvertTo-Json -Depth 20) + "`n", $utf8)
}
$record | ConvertTo-Json -Depth 4 -Compress
if ($record.rootExitCode -ne 0) { throw "Collector exited $($record.rootExitCode); preserved raw outcome must not be replayed." }
