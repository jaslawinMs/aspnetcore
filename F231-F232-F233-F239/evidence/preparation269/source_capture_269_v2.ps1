param(
    [Parameter(Mandatory)][string]$Plan,
    [Parameter(Mandatory)][string]$Run
)
$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$par = Split-Path -Parent $base
$repo = 'C:\src\aspnetcore'
$owner = 'ec444276-1562-48a8-8655-bc9a7c90de94'
function Write-NewBytes([string]$Path, [byte[]]$Bytes)
{
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew)
    try { $stream.Write($Bytes) } finally { $stream.Dispose() }
}
function Write-NewJson([string]$Path, $Value)
{
    Write-NewBytes $Path ([Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 50) + "`n"))
}
function Hash([byte[]]$Bytes)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Bytes))
}
function Identity([Diagnostics.Process]$Process)
{
    return @{
        pid = $Process.Id
        creationUtc = $Process.StartTime.ToUniversalTime().ToString('o')
        creationFileTime100ns = $Process.StartTime.ToUniversalTime().ToFileTimeUtc()
        observedUtc = [DateTime]::UtcNow.ToString('o')
    }
}
function Guard([string]$Label, [string]$Prefix)
{
    $raw = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $registrationRaw = [IO.File]::ReadAllBytes((Join-Path $par 'owner-registrations-267-268-269.json'))
    $policy = [Text.Encoding]::UTF8.GetString($raw) | ConvertFrom-Json -AsHashtable
    $registration = [Text.Encoding]::UTF8.GetString($registrationRaw) | ConvertFrom-Json -AsHashtable
    $scope = $registration.scopes.F239
    $checks = @{
        ownActualPolicyRegistration = $policy.independentFindingPreparationWorkers.F239 -ceq $owner
        ownActualRegistrationReceipt = $registration.actualOwners.F239 -ceq $owner
        exact269Scope = $policy.activeWorkerPreparationScopes.F239 -ceq $scope -and $scope.StartsWith('269 SOURCE ONLY after GO269')
        withinRegisteredOwnerLimit = $policy.independentFindingPreparationWorkers.Count -le $policy.maximumRegisteredPreparationOwners -and $policy.maximumRegisteredPreparationOwners -eq 4
        leaseAbsent = -not [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
        actualWorkerBuildHoldActiveFalse = $policy.actualWorkerBuildHoldActive -ceq $false
        buildAndTestWorkQuiescedFalse = $policy.buildAndTestWorkQuiesced -ceq $false
    }
    Write-NewBytes "$Prefix.policy.raw.json" $raw
    Write-NewBytes "$Prefix.registration.raw.json" $registrationRaw
    Write-NewJson "$Prefix.guard.json" @{
        label = $Label
        observedUtc = [DateTime]::UtcNow.ToString('o')
        policySha256 = Hash $raw
        registrationSha256 = Hash $registrationRaw
        checks = $checks
        exactScope = $scope
        pointOnly = $true
    }
    if ($checks.Values -contains $false)
    {
        throw 'Fresh source-only guard failed'
    }
}
function Display([string]$Label, [byte[]]$Bytes, [int]$Start = 1, [int]$End = [int]::MaxValue)
{
    [Console]::WriteLine("=== $Label (decoded display only; original bytes retained) ===")
    $lines = [Text.Encoding]::UTF8.GetString($Bytes) -split "\r?\n"
    for ($i = [Math]::Max($Start, 1); $i -le [Math]::Min($End, $lines.Count); $i++)
    {
        [Console]::WriteLine("${i}: " + $lines[$i - 1])
    }
}
function Charge($Entries)
{
    foreach ($entry in $Entries)
    {
        foreach ($role in $entry.chargedRoles)
        {
            $null = $script:paths[$role].Add($entry.logicalPath)
        }
    }
    if ($script:paths.Original.Count -gt 15 -or $script:paths.Default.Count -gt 15)
    {
        throw 'Whole logical source file budget exceeded'
    }
}
function Parse-Batch([byte[]]$Raw, $Specs, [string]$Directory)
{
    $offset = 0
    $bindings = [Collections.Generic.List[object]]::new()
    for ($index = 0; $index -lt $Specs.Count; $index++)
    {
        $row = $Specs[$index].Clone()
        $begin = $offset
        $headerEnd = $offset
        while ($headerEnd -lt $Raw.Length -and $Raw[$headerEnd] -ne 10) { $headerEnd++ }
        if ($headerEnd -ge $Raw.Length) { throw 'Missing Git batch header separator' }
        $header = [Text.Encoding]::ASCII.GetString($Raw, $offset, $headerEnd - $offset)
        $offset = $headerEnd + 1
        if ($header.EndsWith(' missing'))
        {
            $row.missing = $true
            $row.framingStart = $begin
            $row.framingEnd = $offset
            $bindings.Add($row)
            continue
        }
        $pieces = $header.Split(' ')
        if ($pieces.Count -ne 3) { throw 'Invalid Git batch header' }
        $objectId, $kind = $pieces[0], $pieces[1]
        $size = [int]$pieces[2]
        if ($offset + $size -ge $Raw.Length -or $Raw[$offset + $size] -ne 10) { throw 'Invalid Git batch binary payload framing' }
        $body = [byte[]]::new($size)
        [Array]::Copy($Raw, $offset, $body, 0, $size)
        $prefix = [Text.Encoding]::ASCII.GetBytes("$kind $size" + [char]0)
        $objectBytes = [byte[]]::new($prefix.Length + $size)
        [Array]::Copy($prefix, $objectBytes, $prefix.Length)
        [Array]::Copy($body, 0, $objectBytes, $prefix.Length, $size)
        $computed = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($objectBytes)).ToLowerInvariant()
        if ($computed -cne $objectId -or $kind -cne $row.expectedType) { throw 'Git object SHA-1 or type mismatch' }
        if (-not $row.spec.Contains(':') -and $row.spec -cne $objectId) { throw 'Commit SHA-1 mismatch' }
        $objectName = 'object-{0:d2}.{1}.bin' -f $index, $kind
        $output = Join-Path $Directory $objectName
        Write-NewBytes $output $body
        $row.objectSha1 = $objectId
        $row.type = $kind
        $row.size = $size
        $row.contentSha256 = Hash $body
        $row.gitObjectSha1Verified = $true
        $row.output = [IO.Path]::GetRelativePath($base, $output)
        $row.framingStart = $begin
        $row.payloadStart = $offset
        $row.payloadEnd = $offset + $size
        $row.framingEnd = $offset + $size + 1
        $bindings.Add($row)
        $offset += $size + 1
    }
    if ($offset -ne $Raw.Length) { throw 'Trailing raw bytes after Git batch objects' }
    return ,$bindings.ToArray()
}
$runDir = Join-Path (Join-Path $base 'runs') $Run
if (Test-Path -LiteralPath $runDir) { throw 'Fresh run directory already exists' }
$null = New-Item -ItemType Directory -Path $runDir
$planRaw = [IO.File]::ReadAllBytes((Join-Path $base $Plan))
Write-NewBytes (Join-Path $runDir 'executed-plan.raw.json') $planRaw
$planValue = [Text.Encoding]::UTF8.GetString($planRaw) | ConvertFrom-Json -AsHashtable
$root = Identity ([Diagnostics.Process]::GetCurrentProcess())
$parentRow = Get-CimInstance -ClassName Win32_Process -Filter "ProcessId=$PID" -Property ParentProcessId
$parentIdentity = Identity (Get-Process -Id $parentRow.ParentProcessId)
$observerStart = [Diagnostics.ProcessStartInfo]::new((Get-Command pwsh).Source)
$observerStart.WorkingDirectory = $base
$observerStart.UseShellExecute = $false
$observerStart.RedirectStandardOutput = $true
$observerStart.RedirectStandardError = $true
$observerArgv = @('-NoLogo', '-NoProfile', '-File', (Join-Path $base 'observer_269_v2.ps1'), '-Directory', $runDir, '-RootPid', "$PID", '-RootCreationFileTime', "$($root.creationFileTime100ns)")
foreach ($arg in $observerArgv) { $observerStart.ArgumentList.Add($arg) }
$observer = [Diagnostics.Process]::new()
$observer.StartInfo = $observerStart
$null = $observer.Start()
$observerIdentity = Identity $observer
$observerOut = [IO.File]::Open((Join-Path $runDir 'observer.stdout.raw.bin'), [IO.FileMode]::CreateNew)
$observerErr = [IO.File]::Open((Join-Path $runDir 'observer.stderr.raw.bin'), [IO.FileMode]::CreateNew)
$observerOutTask = $observer.StandardOutput.BaseStream.CopyToAsync($observerOut)
$observerErrTask = $observer.StandardError.BaseStream.CopyToAsync($observerErr)
Write-NewJson (Join-Path $runDir 'root-start.json') @{
    root = $root; parent = $parentIdentity; observer = $observerIdentity
    argv = [Environment]::GetCommandLineArgs(); cwd = (Get-Location).Path
    observerArgv = $observerArgv; scope = 'F239 269 SOURCE ONLY'
    maximumGitGhRoots = 32; maximumWholeLogicalFilesPerRole = 15
    sourceCommandTimeoutSeconds = 120; sourceStreamDeclaredLimitBytes = 33554432
    streamPolicy = 'Complete binary .NET BaseStream copies; no text transcoding or truncation.'
}
$readyDeadline = [DateTime]::UtcNow.AddSeconds(15)
while (-not [IO.File]::Exists((Join-Path $runDir 'observer-ready.json')))
{
    if ($observer.HasExited -or [DateTime]::UtcNow -gt $readyDeadline) { throw 'Observer not ready within 15 seconds' }
    Start-Sleep -Milliseconds 50
}
$script:roots = 0
$script:paths = @{
    Original = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    Default = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
}
foreach ($old in Get-ChildItem -LiteralPath (Join-Path $base 'runs') -Filter 'command-*.result.json' -Recurse -File)
{
    $value = [IO.File]::ReadAllText($old.FullName) | ConvertFrom-Json -AsHashtable
    if ($value.gitGhSourceRoot) { $script:roots++ }
    Charge @($value.wholeSources)
}
$failure = $null
$summaries = [Collections.Generic.List[string]]::new()
try
{
    for ($index = 0; $index -lt $planValue.commands.Count; $index++)
    {
        $command = $planValue.commands[$index]
        $label = 'command-{0:d2}' -f ($index + 1)
        $prefix = Join-Path $runDir $label
        Guard $command.label $prefix
        $null = New-Item -ItemType Directory -Path $prefix
        $result = @{
            startedUtc = [DateTime]::UtcNow.ToString('o'); label = $command.label
            kind = $command.kind; wholeSources = @(); gitGhSourceRoot = $false
        }
        $resultPath = "$prefix.result.json"
        try
        {
            if ($command.kind -eq 'local-instructions')
            {
                $present = @($command.paths | Where-Object { [IO.File]::Exists((Join-Path $repo $_)) })
                $entries = @($present | ForEach-Object { @{logicalPath = $_.Replace('\', '/'); chargedRoles = @('Original', 'Default')} })
                Charge $entries
                for ($i = 0; $i -lt $present.Count; $i++)
                {
                    $name = $present[$i]
                    $data = [IO.File]::ReadAllBytes((Join-Path $repo $name))
                    $output = Join-Path $prefix ('instruction-{0:d2}.raw.bin' -f $i)
                    Write-NewBytes $output $data
                    $entry = $entries[$i].Clone()
                    $entry.sourceFile = Join-Path $repo $name
                    $entry.size = $data.Length
                    $entry.contentSha256 = Hash $data
                    $entry.output = [IO.Path]::GetRelativePath($base, $output)
                    $entry.provenance = 'Local reserved working-tree guidance only; not a Default source binding.'
                    $result.wholeSources += $entry
                    if ($command.display) { Display $name $data }
                }
                $result.absentPaths = @($command.paths | Where-Object { $_ -notin $present })
                $result.exitCode = 0
            }
            elseif ($command.kind -eq 'show')
            {
                $source = Join-Path $base $command.path
                $data = [IO.File]::ReadAllBytes($source)
                $result.source = $source
                $result.contentSha256 = Hash $data
                $result.exitCode = 0
                $first = if ($command.ContainsKey('start')) { [int]$command.start } else { 1 }
                $last = if ($command.ContainsKey('end')) { [int]$command.end } else { [int]::MaxValue }
                Display $command.path $data $first $last
            }
            else
            {
                if ($script:roots -ge 32) { throw 'Git/gh root budget exhausted' }
                $stdin = [byte[]]::new(0)
                $specs = $null
                if ($command.kind -eq 'batch')
                {
                    $specs = @(@{spec = $command.commit; expectedType = 'commit'})
                    $entries = @()
                    foreach ($name in $command.paths)
                    {
                        $entry = @{logicalPath = $name; chargedRoles = @($command.role)}
                        $entries += $entry
                        $spec = $entry.Clone()
                        $spec.spec = $command.commit + ':' + $name
                        $spec.expectedType = 'blob'
                        $specs += $spec
                    }
                    Charge $entries
                    $stdin = [Text.Encoding]::UTF8.GetBytes((($specs | ForEach-Object { $_.spec }) -join "`n") + "`n")
                    $exe = (Get-Command git).Source
                    $arguments = @('--no-pager', 'cat-file', '--batch')
                }
                else
                {
                    if ($command.executable -notin @('git', 'gh')) { throw 'Only read-only Git/gh source utilities allowed' }
                    $exe = (Get-Command $command.executable).Source
                    $arguments = @($command.args)
                }
                if ([IO.Path]::GetFileNameWithoutExtension($exe) -ieq 'git' -and $arguments[0] -cne '--no-pager') { throw 'Git pager must be disabled' }
                Write-NewBytes (Join-Path $prefix 'stdin.raw.bin') $stdin
                $environmentOverrides = @{GIT_OPTIONAL_LOCKS = '0'; GIT_TERMINAL_PROMPT = '0'; GH_PROMPT_DISABLED = '1'; GH_PAGER = 'cat'; GIT_PAGER = 'cat'}
                Write-NewJson (Join-Path $prefix 'start.json') @{
                    argv = @($exe) + $arguments; cwd = $repo; startedUtc = [DateTime]::UtcNow.ToString('o')
                    stdinSize = $stdin.Length; stdinSha256 = Hash $stdin; environmentOverrides = $environmentOverrides
                }
                $start = [Diagnostics.ProcessStartInfo]::new($exe)
                $start.WorkingDirectory = $repo
                $start.UseShellExecute = $false
                $start.RedirectStandardInput = $true
                $start.RedirectStandardOutput = $true
                $start.RedirectStandardError = $true
                foreach ($arg in $arguments) { $start.ArgumentList.Add([string]$arg) }
                foreach ($key in $environmentOverrides.Keys) { $start.Environment[$key] = $environmentOverrides[$key] }
                $child = [Diagnostics.Process]::new()
                $child.StartInfo = $start
                $null = $child.Start()
                $script:roots++
                $result.gitGhSourceRoot = $true
                $result.argv = @($exe) + $arguments
                $result.cwd = $repo
                $result.child = Identity $child
                $stdoutPath = Join-Path $prefix 'stdout.raw.bin'
                $stderrPath = Join-Path $prefix 'stderr.raw.bin'
                $out = [IO.File]::Open($stdoutPath, [IO.FileMode]::CreateNew)
                $err = [IO.File]::Open($stderrPath, [IO.FileMode]::CreateNew)
                $outTask = $child.StandardOutput.BaseStream.CopyToAsync($out)
                $errTask = $child.StandardError.BaseStream.CopyToAsync($err)
                $child.StandardInput.BaseStream.Write($stdin)
                $child.StandardInput.Close()
                if (-not $child.WaitForExit(120000)) { throw "Owned source child $($child.Id) exceeded deadline; outstanding, not blindly killed" }
                $null = $outTask.GetAwaiter().GetResult()
                $null = $errTask.GetAwaiter().GetResult()
                $out.Dispose()
                $err.Dispose()
                $result.waitReturnedUtc = [DateTime]::UtcNow.ToString('o')
                $result.exitCode = $child.ExitCode
                $result.waitComplete = $true
                $result.childAfterWait = Identity $child
                $stdout = [IO.File]::ReadAllBytes($stdoutPath)
                $stderr = [IO.File]::ReadAllBytes($stderrPath)
                $result.stdoutSize = $stdout.Length
                $result.stdoutSha256 = Hash $stdout
                $result.stderrSize = $stderr.Length
                $result.stderrSha256 = Hash $stderr
                $result.streamsTruncated = $false
                if ([Math]::Max($stdout.Length, $stderr.Length) -gt 33554432) { throw 'Declared stream limit exceeded; complete bytes preserved' }
                if ($null -ne $specs -and $child.ExitCode -eq 0)
                {
                    $bindings = Parse-Batch $stdout $specs $prefix
                    Write-NewJson (Join-Path $prefix 'bindings.json') $bindings
                    $result.wholeSources = @($bindings | Where-Object { $_.ContainsKey('logicalPath') })
                    if (@($bindings | Where-Object { $_.missing }).Count) { throw 'Requested Git object missing; no blind retry authorized' }
                    foreach ($binding in $bindings)
                    {
                        if ($binding.logicalPath -in $command.displayPaths)
                        {
                            Display $binding.spec ([IO.File]::ReadAllBytes((Join-Path $base $binding.output)))
                        }
                    }
                }
                elseif ($command.display)
                {
                    Display $command.label $stdout
                }
                $accepted = if ($command.ContainsKey('acceptedExitCodes')) { $command.acceptedExitCodes } else { @(0) }
                if ($child.ExitCode -notin $accepted) { throw "Source utility returned $($child.ExitCode)" }
            }
            $result.finishedUtc = [DateTime]::UtcNow.ToString('o')
        }
        catch
        {
            $result.failure = $_.ToString()
            $result.scriptStackTrace = $_.ScriptStackTrace
            throw
        }
        finally
        {
            $result.budgetAfter = @{
                gitGhRoots = $script:roots
                wholeLogicalFilesPerRole = @{Original = @($script:paths.Original | Sort-Object); Default = @($script:paths.Default | Sort-Object)}
            }
            Write-NewJson $resultPath $result
            $summaries.Add([IO.Path]::GetRelativePath($base, $resultPath))
        }
    }
}
catch
{
    $failure = @{error = $_.ToString(); scriptStackTrace = $_.ScriptStackTrace}
}
finally
{
    Write-NewJson (Join-Path $runDir 'observer-stop.json') @{requestedUtc = [DateTime]::UtcNow.ToString('o'); byRoot = $root}
    if (-not $observer.WaitForExit(15000)) { throw 'Observer outstanding after 15 second closure; not blindly killed' }
    $null = $observerOutTask.GetAwaiter().GetResult()
    $null = $observerErrTask.GetAwaiter().GetResult()
    $observerOut.Dispose()
    $observerErr.Dispose()
    Write-NewJson (Join-Path $runDir 'root-result.json') @{
        root = $root; parent = $parentIdentity; observer = $observerIdentity
        finishedUtc = [DateTime]::UtcNow.ToString('o'); observerWaitComplete = $true
        observerExitCode = $observer.ExitCode; observerWaitReturnedUtc = [DateTime]::UtcNow.ToString('o')
        commandResults = @($summaries); failure = $failure; sourceOnly = $true
        budget = @{gitGhRoots = $script:roots; wholeLogicalFilesPerRole = @{Original = @($script:paths.Original | Sort-Object); Default = @($script:paths.Default | Sort-Object)}}
        rootExitIsNotSelfAttested = $true
        limits = 'The outer waiter and actual tool return establish root termination, not this in-process receipt.'
    }
}
[Console]::WriteLine((@{
    run = $Run; root = $root; observer = $observerIdentity; observerExitCode = $observer.ExitCode
    failure = $failure; gitGhRoots = $script:roots
    wholeLogicalFileCounts = @{Original = $script:paths.Original.Count; Default = $script:paths.Default.Count}
} | ConvertTo-Json -Depth 10 -Compress))
if ($null -ne $failure -or $observer.ExitCode -ne 0) { exit 1 }
exit 0
