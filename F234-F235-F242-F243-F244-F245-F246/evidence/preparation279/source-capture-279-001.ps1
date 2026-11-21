$ErrorActionPreference = 'Stop'
$phasePath = $PSCommandPath
. (Join-Path $PSScriptRoot 'control-support-279.ps1')
$paths = @(
    'src/Identity/Specification.Tests/src/UserManagerSpecificationTestBase.cs',
    'src/Identity/Core/src/PasskeyHandler.cs',
    'src/Identity/test/InMemory.Test/ControllerTest.cs'
)
$roles = [ordered]@{
    Original = @{
        commit = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
        meaning = 'Existing pinned Original; unchanged from268'
    }
    Default = @{
        commit = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
        meaning = 'Existing observed268Default; not a new current-default observation'
    }
}
$selections = @(
    foreach ($role in $roles.Keys)
    {
        foreach ($path in $paths)
        {
            @{ role = $role; commit = $roles[$role].commit; path = $path }
        }
    }
)
if ($selections.Count -ne 6 -or $paths.Count -ne 3)
{
    throw 'GO279 must select exactly the approved six members.'
}
Write-FreshJson279 (Join-Path $Out 'ROLES-279.json') $roles
Write-FreshJson279 (Join-Path $Out 'BATCH-PLAN-279.json') @{
    selections = $selections
    previousWholeFilesPerRole = 15
    newWholeFilesPerRole = 3
    cumulativeWholeFilesPerRole = 18
    newDirectGitGhRootLimit = 1
    previousDirectGitGhRoots = 9
    aggregateDirectGitGhRoots = 10
    recursiveBroadeningAuthorized = $false
    canonicalGitObjectPathsAreNotOperatingSystemPaths = $true
}
$requests = @($selections | ForEach-Object { $_.commit + ':' + $_.path })
$stdinBytes = [Text.UTF8Encoding]::new($false).GetBytes(($requests -join "`n") + "`n")
$root = Join-Path $Out 'roots\root-010'
if (Test-Path -LiteralPath (Join-Path $Out 'roots'))
{
    throw 'The single279 source-root attempt must be fresh; no replay.'
}
$null = [IO.Directory]::CreateDirectory($root)
$guard = Get-FreshGuard279 'Single approved six-member raw cat-file source batch; aggregate root010'
[IO.File]::WriteAllBytes((Join-Path $root 'policy.raw.json'), $guard.policyBytes)
[IO.File]::WriteAllBytes((Join-Path $root 'registration.raw.json'), $guard.registrationBytes)
Write-FreshJson279 (Join-Path $root 'guard.json') $guard.receipt
[IO.File]::WriteAllBytes((Join-Path $root 'stdin.bin'), $stdinBytes)
$tool = (Get-Command -Name 'git.exe' -CommandType Application -ErrorAction Stop).Source
$arguments = @('--no-pager', '-C', $Repo, 'cat-file', '--batch')
$argumentString = ($arguments | ForEach-Object {
    if ($_ -match '[\s"]')
    {
        '"' + [Regex]::Replace([Regex]::Replace($_, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1') + '"'
    }
    else
    {
        $_
    }
}) -join ' '
$environment = [ordered]@{
    GIT_OPTIONAL_LOCKS = '0'
    GIT_NO_REPLACE_OBJECTS = '1'
    GIT_NO_LAZY_FETCH = '1'
    GIT_TERMINAL_PROMPT = '0'
    GIT_PAGER = ''
    GH_PAGER = ''
    GH_PROMPT_DISABLED = '1'
    NO_COLOR = '1'
}
$launch = [ordered]@{
    rootAttemptIn279 = 1
    aggregateRootAttempt = 10
    argv = @($tool) + $arguments
    windowsArgumentString = $argumentString
    cwd = $Repo
    requestedUtc = [DateTime]::UtcNow.ToString('o')
    observer = Get-ProcessIdentity279 (Get-Process -Id $PID)
    helper = $phasePath
    helperSha256 = (Get-FileHash -LiteralPath $phasePath -Algorithm SHA256).Hash
    support = (Join-Path $Out 'control-support-279.ps1')
    supportSha256 = (Get-FileHash -LiteralPath (Join-Path $Out 'control-support-279.ps1') -Algorithm SHA256).Hash
    stdinBytes = $stdinBytes.Length
    stdinSha256 = Get-BytesHash279 $stdinBytes
    environmentOverrides = $environment
}
Write-FreshJson279 (Join-Path $root 'launch.json') $launch
$start = [Diagnostics.ProcessStartInfo]::new()
$start.FileName = $tool
$start.Arguments = $argumentString
$start.WorkingDirectory = $Repo
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardInput = $true
$start.RedirectStandardOutput = $true
$start.RedirectStandardError = $true
foreach ($key in $environment.Keys)
{
    $start.EnvironmentVariables[$key] = $environment[$key]
}
$process = [Diagnostics.Process]::new()
$process.StartInfo = $start
$stdoutStream = [IO.FileStream]::new((Join-Path $root 'stdout.bin'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$stderrStream = [IO.FileStream]::new((Join-Path $root 'stderr.bin'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
$null = $process.Start()
$null = $process.Handle
$rootIdentity = Get-ProcessIdentity279 $process
$known = @{}
$known[$process.Id] = @{ process = $process; identity = $rootIdentity }
$errors = [Collections.Generic.List[string]]::new()
$snapshots = 0
$stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($stdoutStream)
$stderrTask = $process.StandardError.BaseStream.CopyToAsync($stderrStream)
$process.StandardInput.BaseStream.Write($stdinBytes, 0, $stdinBytes.Length)
$process.StandardInput.Close()
do
{
    foreach ($parentId in @($known.Keys))
    {
        $parent = $known[$parentId]
        try
        {
            if ($parent.process.HasExited)
            {
                continue
            }
            $currentParent = Get-Process -Id $parentId -ErrorAction Stop
            if ($currentParent.StartTime.ToUniversalTime().ToFileTimeUtc() -ne $parent.identity.creationFileTime)
            {
                $errors.Add("PID reuse at observed parent $parentId")
                continue
            }
            foreach ($child in @(Get-CimInstance -ClassName Win32_Process -Filter "ParentProcessId = $parentId" -ErrorAction Stop))
            {
                $childId = [int]$child.ProcessId
                if ($known.ContainsKey($childId))
                {
                    continue
                }
                if ($known.Count -gt 64)
                {
                    throw 'Maximum64 observed descendants exceeded.'
                }
                try
                {
                    $childProcess = Get-Process -Id $childId -ErrorAction Stop
                    $null = $childProcess.Handle
                    $childIdentity = Get-ProcessIdentity279 $childProcess
                    if ($childIdentity.creationFileTime -lt $parent.identity.creationFileTime)
                    {
                        $childProcess.Dispose()
                        continue
                    }
                    $known[$childId] = @{
                        process = $childProcess
                        identity = $childIdentity
                        parentPid = $parentId
                        executableName = $child.Name
                        firstObservedUtc = [DateTime]::UtcNow.ToString('o')
                    }
                }
                catch
                {
                    $errors.Add("Unresolved observed child ${childId}: $($_.Exception.Message)")
                }
            }
        }
        catch
        {
            $errors.Add("Observation limitation at ${parentId}: $($_.Exception.Message)")
        }
    }
    $snapshots++
}
while (-not $process.WaitForExit(100))
$process.WaitForExit()
$stdoutTask.GetAwaiter().GetResult()
$stderrTask.GetAwaiter().GetResult()
$stdoutStream.Dispose()
$stderrStream.Dispose()
$deadline = [DateTime]::UtcNow.AddSeconds(10)
$children = @(
    foreach ($childId in @($known.Keys))
    {
        if ($childId -eq $process.Id)
        {
            continue
        }
        $row = $known[$childId]
        $remaining = [Math]::Max(0, [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds)
        $terminal = $row.process.WaitForExit($remaining)
        [ordered]@{
            identity = $row.identity
            parentPid = $row.parentPid
            executableName = $row.executableName
            firstObservedUtc = $row.firstObservedUtc
            observedIdentityWaitReturned = $terminal
            waitRecordedUtc = [DateTime]::UtcNow.ToString('o')
        }
        $row.process.Dispose()
    }
)
$raw = [IO.File]::ReadAllBytes((Join-Path $root 'stdout.bin'))
$stderr = [IO.File]::ReadAllBytes((Join-Path $root 'stderr.bin'))
$exitCode = $process.ExitCode
Write-FreshJson279 (Join-Path $root 'receipt.json') ([ordered]@{
    rootAttemptIn279 = 1
    aggregateRootAttempt = 10
    launch = $launch
    rootIdentity = $rootIdentity
    observedCompletedUtc = [DateTime]::UtcNow.ToString('o')
    exitCode = $exitCode
    explicitRootWaitReturned = $true
    stdoutCopyAwaitedToEof = $stdoutTask.IsCompleted
    stderrCopyAwaitedToEof = $stderrTask.IsCompleted
    streamFilesClosed = $true
    stdoutBytes = $raw.Length
    stdoutSha256 = Get-BytesHash279 $raw
    stderrBytes = $stderr.Length
    stderrSha256 = Get-BytesHash279 $stderr
    snapshots = $snapshots
    observationErrors = @($errors)
    observedChildren = $children
    observedChildLimit = 'Creation-checked live-parent CIM census; nominal100ms root waits; maximum64 observed descendants and10s total post-root observed-child waits. Short-lived/reparented/inaccessible/unobserved children are not proven absent.'
})
$process.Dispose()
Write-Host ("SOURCE_ROOT010_PID={0};OBSERVER={1};EXIT={2};STDOUT={3};STDERR={4};OBSERVED_CHILDREN={5}" -f $rootIdentity.pid, $PID, $exitCode, $raw.Length, $stderr.Length, $children.Count)
if ($exitCode -ne 0 -or @($children | Where-Object { -not $_.observedIdentityWaitReturned }).Count -ne 0)
{
    throw 'Single allowed source attempt failed or observed child remains outstanding; no retry.'
}

$offset = 0
$ordinal = 0
$bindings = @(
    foreach ($selection in $selections)
    {
        $headerOffset = $offset
        $newline = [Array]::IndexOf($raw, [byte]10, $offset)
        if ($newline -lt $offset)
        {
            throw 'Preserved raw stream has no next member header LF.'
        }
        $header = [Text.Encoding]::ASCII.GetString($raw, $offset, $newline - $offset)
        if ($header -notmatch '^([0-9a-f]{40}) blob ([0-9]+)$')
        {
            throw "Preserved unsupported/missing raw member: $header"
        }
        $blobId = $Matches[1]
        $size = [int]$Matches[2]
        $offset = $newline + 1
        $bodyOffset = $offset
        if ($offset + $size -ge $raw.Length -or $raw[$offset + $size] -ne 10)
        {
            throw 'Invalid binary member size or trailing framing LF.'
        }
        $body = [byte[]]::new($size)
        [Array]::Copy($raw, $offset, $body, 0, $size)
        $objectHeader = [Text.Encoding]::ASCII.GetBytes("blob $size$([char]0)")
        $objectBytes = [byte[]]::new($objectHeader.Length + $body.Length)
        [Array]::Copy($objectHeader, 0, $objectBytes, 0, $objectHeader.Length)
        [Array]::Copy($body, 0, $objectBytes, $objectHeader.Length, $body.Length)
        $sha1 = [Security.Cryptography.SHA1]::Create()
        try
        {
            $recomputedId = [BitConverter]::ToString($sha1.ComputeHash($objectBytes)).Replace('-', '').ToLowerInvariant()
        }
        finally
        {
            $sha1.Dispose()
        }
        if ($recomputedId -cne $blobId)
        {
            throw 'Binary Git object ID mismatch.'
        }
        $captureDirectory = Join-Path (Join-Path $Out 'blobs') $selection.role
        $null = [IO.Directory]::CreateDirectory($captureDirectory)
        $capture = Join-Path $captureDirectory ($selection.path.Replace('/', '__') + '.raw.txt')
        if (Test-Path -LiteralPath $capture)
        {
            throw 'Fresh exact source capture already exists.'
        }
        [IO.File]::WriteAllBytes($capture, $body)
        $offset += $size + 1
        [ordered]@{
            role = $selection.role
            commit = $selection.commit
            path = $selection.path
            commitPath = $selection.commit + ':' + $selection.path
            objectType = 'blob'
            blobId = $blobId
            recomputedGitObjectId = $recomputedId
            bytes = $size
            sha256 = Get-BytesHash279 $body
            capture = $capture
            sourceRequestAssociation = 'Exact retained commit:path request and corresponding git cat-file --batch member; no independent raw commit/tree-chain expansion.'
            textNormalizationPerformed = $false
            rawStdout = Join-Path $root 'stdout.bin'
            rawStdoutSha256 = Get-BytesHash279 $raw
            requestOrdinal = $ordinal
            headerOffset = $headerOffset
            headerAscii = $header
            bodyOffset = $bodyOffset
            trailingFramingLfOffset = $offset - 1
        }
        $ordinal++
    }
)
if ($offset -ne $raw.Length -or $bindings.Count -ne 6)
{
    throw 'Incomplete or extra raw batch members.'
}
Write-FreshJson279 (Join-Path $Out 'BINDINGS-279.json') @{
    bindings = $bindings
    completeFramingConsumed = $true
    rawStdoutBytes = $raw.Length
    newWholeFilesPerRole = 3
    cumulativeWholeFilesPerRole = 18
    newGitGhRoots = 1
    aggregateGitGhRoots = 10
    noFurtherSourceBodiesAuthorized = $true
}
foreach ($binding in $bindings)
{
    Write-Host ("BLOB {0} {1} {2} {3}bytes SHA256={4}" -f $binding.role, $binding.commit, $binding.path, $binding.bytes, $binding.sha256)
}
Write-Host '279_SOURCE_BODY_AND_ROOT_BUDGET_CLOSED=6whole new members;18files/role cumulative;1new/10aggregate Git-gh roots;no recursive broadening'
