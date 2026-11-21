Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:EvidenceBase = $PSScriptRoot
$script:ParallelBase = [IO.Directory]::GetParent($PSScriptRoot).FullName
$script:SessionBase = [IO.Directory]::GetParent($script:ParallelBase).FullName
$script:ScopeBinding = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot 'scope-binding-005.json'))) | ConvertFrom-Json
function Get-BytesSha256([byte[]]$Bytes)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes))
}
function Save-NewBytes([string]$RelativePath, [byte[]]$Bytes)
{
    $destination = Join-Path $script:EvidenceBase $RelativePath
    $directory = [IO.Path]::GetDirectoryName($destination)
    if (-not [IO.Directory]::Exists($directory)) { $null = [IO.Directory]::CreateDirectory($directory) }
    $stream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try { $stream.Write($Bytes, 0, $Bytes.Length) } finally { $stream.Dispose() }
}
function Save-NewJson([string]$RelativePath, $Value)
{
    $text = ($Value | ConvertTo-Json -Depth 100) + "`n"
    Save-NewBytes $RelativePath ([Text.UTF8Encoding]::new($false).GetBytes($text))
}
function Assert-Current293Guard([string]$Label)
{
    $rawPaths = [ordered]@{
        policy = (Join-Path $script:ParallelBase 'policy.json')
        registration = (Join-Path $script:ParallelBase 'template-owner-registration-293.json')
        campaign = (Join-Path $script:SessionBase 'autoperf-campaign.json')
    }
    $values = @{}
    $bindings = @()
    foreach ($entry in $rawPaths.GetEnumerator())
    {
        $raw = [IO.File]::ReadAllBytes($entry.Value)
        $relative = 'guards\' + $Label + '.' + $entry.Key + '.raw.json'
        Save-NewBytes $relative $raw
        $values[$entry.Key] = [Text.Encoding]::UTF8.GetString($raw).TrimStart([char]0xFEFF) | ConvertFrom-Json -Depth 100
        $bindings += [ordered]@{ kind = $entry.Key; source = $entry.Value; captured = $relative; bytes = $raw.Length; sha256 = (Get-BytesSha256 $raw) }
    }
    $policy = $values.policy
    $registration = $values.registration
    if ($registration.actualOwner -cne $script:ScopeBinding.actualOwner) { throw 'Registration task ID changed' }
    if ($registration.exactScope -cne $script:ScopeBinding.exactScope) { throw 'Registration293 scope changed' }
    if ($registration.policyAfterSha256 -cne $script:ScopeBinding.policyRegistrationSha256) { throw 'Registration point policy SHA changed' }
    if ($policy.independentFindingPreparationWorkers.F255 -cne $script:ScopeBinding.actualOwner) { throw 'Fresh actual-own-ID guard failed' }
    if ($policy.activeWorkerPreparationScopes.F255 -cne $script:ScopeBinding.exactScope) { throw 'Fresh exact293scope guard failed' }
    if ($policy.actualWorkerBuildHoldActive -cne $false -or $policy.buildAndTestWorkQuiesced -cne $false) { throw 'Fresh HOLDfalse/nonquiesced guard failed' }
    $ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
    if ($ownerCount -gt 4 -or $policy.maximumRegisteredPreparationOwners -ne 4) { throw 'Registered owner ceiling exceeded/changed' }
    $leasePath = Join-Path $script:ParallelBase 'benchmark-exclusive.lease.json'
    if ([IO.File]::Exists($leasePath) -or [IO.Directory]::Exists($leasePath)) { throw 'Fresh no-lease guard failed' }
    $pending = @($values.campaign.candidates | Where-Object { $_.id -in @('F255', 'F256') })
    if ($pending.Count -ne 2 -or @($pending | Where-Object { $_.status -cne 'pending' }).Count -ne 0) { throw 'Fresh F255F256outerpending guard failed' }
    $receipt = [ordered]@{ observedUtc = [DateTime]::UtcNow.ToString('o'); actualOwner = $script:ScopeBinding.actualOwner; exactScopeMatches = $true; registeredOwners = $ownerCount; leaseAbsent = $true; HOLD = $false; quiesced = $false; outer = @($pending | ForEach-Object { [ordered]@{ id = $_.id; status = $_.status } }); bindings = $bindings; pointObservationOnly = $true }
    Save-NewJson ('guards\' + $Label + '.receipt.json') $receipt
    return $receipt
}
function Get-ObservedChildSnapshot([int]$ParentId)
{
    try
    {
        $rows = @(Get-CimInstance -ClassName Win32_Process -Filter ('ParentProcessId = ' + $ParentId) -ErrorAction Stop | ForEach-Object {
            [ordered]@{ pid = [int]$_.ProcessId; parentPid = [int]$_.ParentProcessId; creationUtc = if ($null -ne $_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { $null }; executablePath = $_.ExecutablePath; commandLine = $_.CommandLine }
        })
        return [ordered]@{ observedUtc = [DateTime]::UtcNow.ToString('o'); parentPid = $ParentId; rows = $rows; error = $null }
    }
    catch
    {
        return [ordered]@{ observedUtc = [DateTime]::UtcNow.ToString('o'); parentPid = $ParentId; rows = @(); error = $_.Exception.ToString() }
    }
}
function Invoke-SourceRoot([string]$Label, [ValidateSet('git','gh')][string]$Tool, [string[]]$Arguments, [byte[]]$InputBytes = @(), [int]$TimeoutSeconds = 120)
{
    $existingRoots = @([IO.Directory]::EnumerateFiles($script:EvidenceBase, '*.start.json', [IO.SearchOption]::TopDirectoryOnly))
    if ($existingRoots.Count -ge 32) { throw 'Direct Git/gh root budget exhausted' }
    $guard = Assert-Current293Guard $Label
    $executable = (Get-Command $Tool -CommandType Application -ErrorAction Stop).Source
    $outputPath = Join-Path $script:EvidenceBase ($Label + '.stdout.bin')
    $errorPath = Join-Path $script:EvidenceBase ($Label + '.stderr.bin')
    Save-NewBytes ($Label + '.stdin.bin') $InputBytes
    $start = [ordered]@{ label = $Label; rootOrdinal = $existingRoots.Count + 1; intentUtc = [DateTime]::UtcNow.ToString('o'); callerPid = $PID; tool = $Tool; executable = $executable; arguments = $Arguments; cwd = 'C:\src\aspnetcore'; stdinBytes = $InputBytes.Length; stdinSha256 = (Get-BytesSha256 $InputBytes); timeoutSeconds = $TimeoutSeconds; guardReceipt = ('guards\' + $Label + '.receipt.json'); inheritedEnvironmentNotInventoried = $true; overrides = [ordered]@{ GIT_OPTIONAL_LOCKS = '0'; GIT_TERMINAL_PROMPT = '0'; GIT_PAGER = 'cat'; GH_PROMPT_DISABLED = '1'; GH_PAGER = 'cat' } }
    Save-NewJson ($Label + '.start.json') $start
    $info = [Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $executable
    $info.WorkingDirectory = 'C:\src\aspnetcore'
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    foreach ($argument in $Arguments) { $info.ArgumentList.Add($argument) }
    foreach ($entry in $start.overrides.GetEnumerator()) { $info.Environment[$entry.Key] = $entry.Value }
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $info
    $output = [IO.File]::Open($outputPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $errorOutput = [IO.File]::Open($errorPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    $started = $false
    $rootIdentity = $null
    $rootExitCode = $null
    $failure = $null
    $timedOut = $false
    $streamComplete = $false
    $snapshots = [Collections.Generic.List[object]]::new()
    $childHandles = @{}
    $childTerminal = @()
    try
    {
        $started = $process.Start()
        $rootIdentity = [ordered]@{ pid = $process.Id; startUtc = $null; observedImage = $null; identityError = $null }
        try { $rootIdentity.startUtc = $process.StartTime.ToUniversalTime().ToString('o'); $rootIdentity.observedImage = $process.MainModule.FileName } catch { $rootIdentity.identityError = $_.Exception.ToString() }
        Save-NewJson ($Label + '.started.json') $rootIdentity
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($output)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($errorOutput)
        if ($InputBytes.Length -gt 0) { $process.StandardInput.BaseStream.Write($InputBytes, 0, $InputBytes.Length) }
        $process.StandardInput.Close()
        $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
        do
        {
            $snapshot = Get-ObservedChildSnapshot $process.Id
            $snapshots.Add($snapshot)
            foreach ($child in $snapshot.rows)
            {
                $key = [string]$child.pid + ':' + [string]$child.creationUtc
                if (-not $childHandles.ContainsKey($key))
                {
                    $handle = $null
                    $identityError = $null
                    try
                    {
                        $handle = [Diagnostics.Process]::GetProcessById($child.pid)
                        $null = $handle.SafeHandle
                        if ($null -eq $child.creationUtc -or $handle.StartTime.ToUniversalTime().ToString('o') -cne $child.creationUtc) { $identityError = 'CIM/Process creation representations differ or unknown; observation not owned identity proof' }
                    }
                    catch { $identityError = $_.Exception.ToString() }
                    $childHandles[$key] = [ordered]@{ observed = $child; handle = $handle; identityError = $identityError }
                }
            }
            if ($process.WaitForExit(200)) { break }
            if ([DateTime]::UtcNow -gt $deadline)
            {
                $timedOut = $true
                if (-not $process.HasExited -and $null -ne $rootIdentity.startUtc -and $process.StartTime.ToUniversalTime().ToString('o') -ceq $rootIdentity.startUtc) { Stop-Process -Id $process.Id -ErrorAction Stop }
                break
            }
        } while ($true)
        if (-not $process.WaitForExit(10000)) { throw 'Owned Git/gh root remains nonterminal after bounded wait' }
        $rootExitCode = $process.ExitCode
        $streamComplete = [Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]@($outTask, $errTask), 10000)
        if (-not $streamComplete) { throw 'Redirected stream completion not established within 10 seconds' }
        foreach ($entry in $childHandles.GetEnumerator())
        {
            $terminal = $false
            $exitCode = $null
            $stateError = $entry.Value.identityError
            if ($null -ne $entry.Value.handle)
            {
                try
                {
                    $terminal = $entry.Value.handle.WaitForExit(10000)
                    if ($terminal) { $exitCode = $entry.Value.handle.ExitCode }
                }
                catch { $stateError = [string]$stateError + '; ' + $_.Exception.ToString() }
            }
            $childTerminal += [ordered]@{ key = $entry.Key; observed = $entry.Value.observed; terminal = $terminal; exitCode = $exitCode; identityOrStateError = $stateError; ownershipNotEstablishedByObservationAlone = $true; stoppedByThisHelper = $false }
        }
        if ($timedOut) { throw 'Owned Git/gh root exceeded bounded timeout; root only was stopped if retained identity matched' }
    }
    catch { $failure = $_.Exception.ToString() }
    finally
    {
        $output.Dispose()
        $errorOutput.Dispose()
        foreach ($entry in $childHandles.GetEnumerator()) { if ($null -ne $entry.Value.handle) { $entry.Value.handle.Dispose() } }
        $rootTerminal = $false
        if ($started) { try { $rootTerminal = $process.HasExited } catch {} }
        $process.Dispose()
        $stdoutBytes = [IO.File]::ReadAllBytes($outputPath)
        $stderrBytes = [IO.File]::ReadAllBytes($errorPath)
        $receipt = [ordered]@{ label = $Label; observedEndUtc = [DateTime]::UtcNow.ToString('o'); started = $started; rootIdentity = $rootIdentity; rootTerminalObserved = $rootTerminal; rootExitCode = $rootExitCode; stdoutCompleteObserved = $streamComplete; stderrCompleteObserved = $streamComplete; stdoutBytes = $stdoutBytes.Length; stdoutSha256 = (Get-BytesSha256 $stdoutBytes); stderrBytes = $stderrBytes.Length; stderrSha256 = (Get-BytesSha256 $stderrBytes); timedOut = $timedOut; failure = $failure; observedChildSnapshots = @($snapshots.ToArray()); observedChildren = $childTerminal; unobservedOrShortLivedDescendantsNotExcluded = $true; noUniversalIdlenessOrDedicatedHostClaim = $true; enclosingHelperExitNotSelfAttested = $true }
        Save-NewJson ($Label + '.receipt.json') $receipt
    }
    [Console]::WriteLine(($receipt | Select-Object label,started,rootTerminalObserved,rootExitCode,stdoutBytes,stderrBytes,failure | ConvertTo-Json -Compress))
    if ($null -ne $failure -or $rootExitCode -ne 0 -or -not $streamComplete -or @($childTerminal | Where-Object { -not $_.terminal }).Count -gt 0) { throw ('Source root failed or observed custody incomplete; no replay: ' + $Label) }
    return ,$stdoutBytes
}