$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$repo = 'C:\src\aspnetcore'
$par = Split-Path -Parent $PSScriptRoot
$prior = Join-Path $par 'finding-F206-245'
$acceptance = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'acceptance-v1.json')) | ConvertFrom-Json
$receiptPath = Join-Path $PSScriptRoot 'collection-source-v1.json'
if ([IO.File]::Exists($receiptPath)) { throw 'Single-use collector: receipt already exists.' }
$null = [IO.Directory]::CreateDirectory((Join-Path $PSScriptRoot 'commands-source-v1'))
$result = [ordered]@{
    phase = 'source-v1'
    ownerId = $acceptance.ownerBackgroundId
    startedUtc = [DateTime]::UtcNow.ToString('o')
    collectorPid = $PID
    collectorIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    originalCommit = $acceptance.originalCommit
    defaultCommit = $null
    commands = @()
    files = @()
    reusedAdministrativeInputs = @()
    guidance = @()
    preservedReports = @()
    state = 'running'
    failure = $null
}
function Save-Receipt
{
    [IO.File]::WriteAllText($receiptPath, ($result | ConvertTo-Json -Depth 30) + "`n", $utf8)
}
function Get-Digest([string] $Path)
{
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([IO.File]::ReadAllBytes($Path)))
}
function Copy-Exact([string] $From, [string] $To)
{
    $null = [IO.Directory]::CreateDirectory((Split-Path -Parent $To))
    $stream = [IO.File]::Open($To, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try { $bytes = [IO.File]::ReadAllBytes($From); $stream.Write($bytes) }
    finally { $stream.Dispose() }
}
function Get-Guard([string] $Label)
{
    $bytes = [IO.File]::ReadAllBytes((Join-Path $par 'policy.json'))
    $policy = $utf8.GetString($bytes) | ConvertFrom-Json
    $guard = [ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('o')
        policySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
        ownerId = $policy.independentFindingPreparationWorkers.F227
        ownerCount = @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count
        scope = $policy.activeWorkerPreparationScopes.F227
        hold = $policy.actualWorkerBuildHoldActive
        quiesced = $policy.buildAndTestWorkQuiesced
        leasePath = Join-Path $par 'benchmark-exclusive.lease.json'
        leaseExists = [IO.File]::Exists((Join-Path $par 'benchmark-exclusive.lease.json'))
    }
    [IO.File]::WriteAllBytes((Join-Path $PSScriptRoot "commands-source-v1\$Label.policy.json"), $bytes)
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot "commands-source-v1\$Label.guard.json"), ($guard | ConvertTo-Json -Depth 8) + "`n", $utf8)
    if ($guard.ownerId -cne $acceptance.ownerBackgroundId -or $guard.scope -cne $acceptance.registeredScopeExact -or
        $guard.ownerCount -gt 4 -or $guard.hold -ne $false -or $guard.quiesced -ne $false -or $guard.leaseExists)
    {
        throw "Fresh F227 exact-scope guard denied before $Label."
    }
    return $guard
}
function Observe-Identity([int] $ProcessId)
{
    return Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
}
function Read-Native([string] $Label, [string] $Executable, [string[]] $Argv)
{
    if ($result.commands.Count -ge 32) { throw 'Direct Git/gh source-utility bound reached.' }
    $guard = Get-Guard $Label
    $record = [ordered]@{
        label = $Label
        guard = $guard
        executable = (Get-Command $Executable -CommandType Application).Source
        argv = $Argv
        workingDirectory = $repo
        environmentOverrides = @{ GIT_OPTIONAL_LOCKS = '0'; GIT_TERMINAL_PROMPT = '0'; GIT_PAGER = ''; GH_PAGER = ''; GH_PROMPT_DISABLED = '1' }
        startedUtc = [DateTime]::UtcNow.ToString('o')
        nativeRootPid = $null
        nativeRootIdentity = $null
        observedChildren = @()
        observedChildTerminals = @()
        waitForExitMilliseconds = 90000
        waitForExitReturned = $false
        stdoutPath = "commands-source-v1\$Label.stdout.bin"
        stderrPath = "commands-source-v1\$Label.stderr.bin"
        stdoutDrainCompleted = $false
        stderrDrainCompleted = $false
        exitCode = $null
        failure = $null
    }
    $result.commands += $record
    Save-Receipt
    $p = [Diagnostics.Process]::new()
    $out = $null
    $err = $null
    try
    {
        $p.StartInfo.FileName = $record.executable
        $p.StartInfo.WorkingDirectory = $repo
        $p.StartInfo.UseShellExecute = $false
        $p.StartInfo.RedirectStandardOutput = $true
        $p.StartInfo.RedirectStandardError = $true
        $p.StartInfo.CreateNoWindow = $true
        foreach ($arg in $Argv) { $p.StartInfo.ArgumentList.Add($arg) }
        foreach ($key in $record.environmentOverrides.Keys) { $p.StartInfo.Environment[$key] = $record.environmentOverrides[$key] }
        $outPath = Join-Path $PSScriptRoot $record.stdoutPath
        $errPath = Join-Path $PSScriptRoot $record.stderrPath
        $out = [IO.File]::Open($outPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        $err = [IO.File]::Open($errPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        if (-not $p.Start()) { throw 'Native source reader failed to start.' }
        $record.nativeRootPid = $p.Id
        $outTask = $p.StandardOutput.BaseStream.CopyToAsync($out)
        $errTask = $p.StandardError.BaseStream.CopyToAsync($err)
        $record.nativeRootIdentity = Observe-Identity $p.Id
        $record.observedChildren = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($p.Id)" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
        $record.waitForExitReturned = $p.WaitForExit($record.waitForExitMilliseconds)
        if (-not $record.waitForExitReturned)
        {
            Stop-Process -Id $p.Id -Force
            $p.WaitForExit()
        }
        $null = $outTask.GetAwaiter().GetResult()
        $record.stdoutDrainCompleted = $true
        $null = $errTask.GetAwaiter().GetResult()
        $record.stderrDrainCompleted = $true
        $out.Dispose(); $out = $null
        $err.Dispose(); $err = $null
        $record.exitCode = $p.ExitCode
        foreach ($child in $record.observedChildren)
        {
            $now = Observe-Identity $child.ProcessId
            $terminal = [ordered]@{ processId = $child.ProcessId; creationDate = $child.CreationDate; observedUtc = [DateTime]::UtcNow.ToString('o'); state = $null; waited = $false; exitCode = $null }
            if ($null -eq $now) { $terminal.state = 'identity-absent-after-root-wait' }
            elseif ($now.CreationDate -ne $child.CreationDate) { $terminal.state = 'original-identity-absent-pid-reused' }
            else
            {
                $cp = [Diagnostics.Process]::GetProcessById($child.ProcessId)
                try
                {
                    $terminal.waited = $cp.WaitForExit(30000)
                    if ($terminal.waited) { $terminal.exitCode = $cp.ExitCode; $terminal.state = 'observed-handle-exited' }
                    else { $terminal.state = 'still-running'; throw "Observed child $($child.ProcessId) remains running." }
                }
                finally { $cp.Dispose() }
            }
            $record.observedChildTerminals += $terminal
        }
        if (-not $record.waitForExitReturned) { throw 'Read-only source command exceeded finite root wait.' }
        if ($record.exitCode -ne 0) { throw "Read-only source command $Label exited $($record.exitCode)." }
    }
    catch
    {
        $record.failure = $_.Exception.ToString()
        throw
    }
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
                $record["${name}Sha256"] = Get-Digest $path
            }
        }
        Save-Receipt
    }
    return Join-Path $PSScriptRoot $record.stdoutPath
}
function Add-Source([string] $Role, [string] $Commit, [string] $LogicalPath, [string] $SourcePath, [object] $Provenance)
{
    if (@($result.files | Where-Object role -eq $Role).Count -ge 15) { throw "Whole-source bound reached for $Role." }
    $destinationRelative = "source\$Role\$LogicalPath"
    $destination = Join-Path $PSScriptRoot $destinationRelative
    Copy-Exact $SourcePath $destination
    $result.files += [ordered]@{
        role = $Role; commit = $Commit; logicalPath = $LogicalPath; path = $destinationRelative
        bytes = ([IO.FileInfo]::new($destination)).Length; sha256 = Get-Digest $destination
        wholeFile = $true; provenance = $Provenance
    }
    Save-Receipt
}
try
{
    Save-Receipt
    $null = Get-Guard '00-entry'
    $acceptedPath = Join-Path $par 'accepted-terminals-255.json'
    $accepted = [IO.File]::ReadAllText($acceptedPath) | ConvertFrom-Json
    $priorSealPath = Join-Path $prior 'WHOLE-SEAL-v1.json'
    if ((Get-Digest $priorSealPath) -cne $accepted.F206.indexSha256) { throw 'Accepted F206 index digest mismatch.' }
    $priorSeal = [IO.File]::ReadAllText($priorSealPath) | ConvertFrom-Json
    $closurePath = Join-Path $prior 'collection-closure-v1.json'
    $closure = [IO.File]::ReadAllText($closurePath) | ConvertFrom-Json
    foreach ($inputName in @('accepted-terminals-255.json', 'owner-registrations-256-257.json'))
    {
        $from = Join-Path $par $inputName
        $relative = "reused-inputs\$inputName"
        Copy-Exact $from (Join-Path $PSScriptRoot $relative)
        $result.reusedAdministrativeInputs += @{ originalPath = $from; path = $relative; sha256 = Get-Digest $from; bytes = ([IO.FileInfo]::new($from)).Length }
    }
    foreach ($inputName in @('WHOLE-SEAL-v1.json', 'collection-closure-v1.json', 'assessment-v1.json'))
    {
        $from = Join-Path $prior $inputName
        if ($inputName -ne 'WHOLE-SEAL-v1.json')
        {
            $binding = @($priorSeal.files | Where-Object path -eq $inputName)
            if ($binding.Count -ne 1 -or (Get-Digest $from) -cne $binding[0].sha256) { throw "Accepted F206 input mismatch: $inputName" }
        }
        $relative = "reused-inputs\F206-$inputName"
        Copy-Exact $from (Join-Path $PSScriptRoot $relative)
        $result.reusedAdministrativeInputs += @{ originalPath = $from; path = $relative; sha256 = Get-Digest $from; bytes = ([IO.FileInfo]::new($from)).Length }
    }
    $metadataPath = Read-Native '01-default-repository-metadata' 'gh.exe' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore')
    $metadata = [IO.File]::ReadAllText($metadataPath) | ConvertFrom-Json
    if ($metadata.full_name -cne 'dotnet/aspnetcore' -or [string]::IsNullOrWhiteSpace($metadata.default_branch)) { throw 'Default repository metadata not established.' }
    $branchPath = Read-Native '02-default-immutable-ref' 'gh.exe' @('api', '--method', 'GET', "repos/dotnet/aspnetcore/git/ref/heads/$($metadata.default_branch)")
    $branch = [IO.File]::ReadAllText($branchPath) | ConvertFrom-Json
    if ($branch.ref -cne "refs/heads/$($metadata.default_branch)" -or $branch.object.type -cne 'commit' -or $branch.object.sha -notmatch '^[0-9a-f]{40}$') { throw 'Default immutable ref not established.' }
    $result.defaultBranch = $metadata.default_branch
    $result.defaultCommit = $branch.object.sha
    $headPath = Read-Native '03-navigation-head' 'git.exe' @('--no-pager', 'rev-parse', '--verify', 'HEAD')
    $result.navigationHead = [IO.File]::ReadAllText($headPath).Trim()
    if ($result.navigationHead -cne $acceptance.reservedNavigationHeadNotDefault) { throw 'Reserved navigation HEAD changed.' }
    $null = Read-Native '04-navigation-status' 'git.exe' @('--no-pager', 'status', '--porcelain=v1', '--untracked-files=normal')
    foreach ($report in $closure.preservedUntrackedReports)
    {
        $path = Join-Path $repo $report.path
        $observed = @{ path = $report.path; bytes = ([IO.FileInfo]::new($path)).Length; sha256 = Get-Digest $path }
        if ($observed.bytes -ne $report.bytes -or $observed.sha256 -cne $report.sha256) { throw "Pre-existing report mismatch: $($report.path)" }
        $result.preservedReports += $observed
    }
    $guidancePaths = @(
        'src\Components\AGENTS.md',
        '.github\instructions\components.instructions.md',
        '.github\instructions\components.server.instructions.md',
        '.github\instructions\cross-cutting-guidance.instructions.md',
        'docs\BlazorComponentsGuidance.md',
        'docs\CrossCuttingGuidance.md'
    )
    foreach ($logical in $guidancePaths)
    {
        $from = Join-Path $repo $logical
        $relative = "guidance-navigation\$logical"
        Copy-Exact $from (Join-Path $PSScriptRoot $relative)
        $result.guidance += @{ path = $relative; logicalPath = $logical; sha256 = Get-Digest $from; bytes = ([IO.FileInfo]::new($from)).Length; source = 'Observed reserved navigation working-tree bytes; not asserted to be immutable-role content.' }
    }
    $reusePaths = @(
        'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyCultureProvider.cs',
        'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyHost.cs',
        'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyHostBuilder.cs',
        'src\Components\Web.JS\src\Platform\Mono\MonoPlatform.ts'
    )
    foreach ($role in @('Original', 'Default'))
    {
        $commit = if ($role -eq 'Original') { $result.originalCommit } else { $result.defaultCommit }
        foreach ($logical in $reusePaths)
        {
            $binding = @($closure.files | Where-Object { $_.role -eq $role -and $_.logicalPath -eq $logical -and $_.commit -eq $commit })
            if ($binding.Count -ne 1) { throw "Exact same-role/commit F206 reuse unavailable: $role $logical. Stop for finite proposal." }
            $from = [IO.Path]::GetFullPath((Join-Path $prior $binding[0].path))
            if ((Get-Digest $from) -cne $binding[0].sha256 -or ([IO.FileInfo]::new($from)).Length -ne $binding[0].bytes) { throw "F206 source bytes mismatch: $role $logical" }
            $sealBinding = @($priorSeal.files | Where-Object { $_.path -eq ($binding[0].path -replace '^\.\\', '') })
            if ($sealBinding.Count -ne 1 -or $sealBinding[0].sha256 -cne $binding[0].sha256) { throw 'Accepted index/source binding mismatch.' }
            Add-Source $role $commit $logical $from @{ kind = 'hash-verified-accepted-whole-source-reuse'; priorFile = $from; closurePath = 'reused-inputs\F206-collection-closure-v1.json'; acceptedIndexSha256 = $accepted.F206.indexSha256; originalCommandLabel = ($binding[0].path -replace '^.*source\\', '') }
        }
    }
    $listingPath = Read-Native '05-original-bounded-file-list' 'git.exe' @('--no-pager', 'ls-tree', '-r', '--name-only', $result.originalCommit, '--', 'src/Components/WebAssembly/WebAssembly/test', 'src/Components/WebAssembly/WebAssembly/src')
    $listing = @([IO.File]::ReadAllLines($listingPath))
    $cultureTests = @($listing | Where-Object { $_ -match '/WebAssemblyCultureProviderTests?\.cs$' })
    $testProjects = @($listing | Where-Object { $_ -match '/test/[^/]+\.csproj$' })
    $sourceProjects = @($listing | Where-Object { $_ -match '/src/Microsoft\.AspNetCore\.Components\.WebAssembly\.csproj$' })
    if ($cultureTests.Count -ne 1 -or $testProjects.Count -ne 1 -or $sourceProjects.Count -ne 1) { throw 'Bounded source ownership discovery was ambiguous or incomplete; no broadening.' }
    $null = Read-Native '06-original-bounded-exact-reference-fallback' 'git.exe' @('--no-pager', 'grep', '-n', '-e', 'GetCultures(', '-e', 'LoadCurrentCultureResourcesAsync(', $result.originalCommit, '--', 'src/Components/WebAssembly/WebAssembly')
    $newLogicalPaths = @($cultureTests[0].Replace('/', '\'), 'src\Components\Shared\src\CultureStateProvider.cs', $sourceProjects[0].Replace('/', '\'), $testProjects[0].Replace('/', '\'))
    $result.newLogicalPaths = $newLogicalPaths
    $index = 7
    foreach ($logical in $newLogicalPaths)
    {
        $gitPath = $logical.Replace('\', '/')
        foreach ($role in @('Original', 'Default'))
        {
            $commit = if ($role -eq 'Original') { $result.originalCommit } else { $result.defaultCommit }
            $label = ('{0:00}-{1}-{2}' -f $index, $role.ToLowerInvariant(), [IO.Path]::GetFileNameWithoutExtension($logical))
            if ($role -eq 'Original')
            {
                $captured = Read-Native $label 'git.exe' @('--no-pager', 'cat-file', 'blob', "${commit}:$gitPath")
            }
            else
            {
                $captured = Read-Native $label 'gh.exe' @('api', '--method', 'GET', '-H', 'Accept: application/vnd.github.raw+json', "repos/dotnet/aspnetcore/contents/${gitPath}?ref=$commit")
            }
            Add-Source $role $commit $logical $captured @{ kind = 'fresh-immutable-whole-source'; commandLabel = $label }
            $index++
        }
    }
    $result.processBoundary = 'Process.Start root PID, bounded CIM identities/direct children, root-handle wait and both raw stream drains recorded. Child identity absence is not an observed exit code. No universal descendant or unrelated-process absence claim.'
    $result.state = 'completed'
}
catch
{
    $result.state = 'failed'
    $result.failure = $_.Exception.ToString()
    throw
}
finally
{
    $result.finishedUtc = [DateTime]::UtcNow.ToString('o')
    Save-Receipt
}
"F227 source-v1 $($result.state); collector=$PID; Git/gh starts=$($result.commands.Count); whole role files=$($result.files.Count); default=$($result.defaultCommit)"
