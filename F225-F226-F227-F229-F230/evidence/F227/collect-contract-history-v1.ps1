$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
$repo = 'C:\src\aspnetcore'
$par = Split-Path -Parent $PSScriptRoot
$acceptance = [IO.File]::ReadAllText('.\acceptance-v1.json') | ConvertFrom-Json
$initial = [IO.File]::ReadAllText('.\collection-source-v1.json') | ConvertFrom-Json
if ($initial.state -ne 'completed') { throw 'Initial collection is not completed.' }
$receiptPath = Join-Path $PSScriptRoot 'collection-contract-history-v1.json'
if ([IO.File]::Exists($receiptPath)) { throw 'Single-use contract/history collector cannot be replayed.' }
$null = [IO.Directory]::CreateDirectory((Join-Path $PSScriptRoot 'commands-contract-history-v1'))
$result = [ordered]@{
    phase = 'contract-history-v1'
    ownerId = $acceptance.ownerBackgroundId
    startedUtc = [DateTime]::UtcNow.ToString('o')
    collectorPid = $PID
    collectorIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    scriptSha256 = (Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    originalCommit = $initial.originalCommit
    defaultCommit = $initial.defaultCommit
    previousGitGhStarts = @($initial.commands).Count
    commands = @()
    files = @()
    referenceContracts = @()
    rolePairs = @()
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
    [IO.File]::WriteAllBytes((Join-Path $PSScriptRoot "commands-contract-history-v1\$Label.policy.json"), $bytes)
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot "commands-contract-history-v1\$Label.guard.json"), ($guard | ConvertTo-Json -Depth 8) + "`n", $utf8)
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
    if (($result.previousGitGhStarts + $result.commands.Count) -ge 32) { throw 'Cumulative direct Git/gh source-utility bound reached.' }
    $guard = Get-Guard $Label
    $record = [ordered]@{
        label = $Label; guard = $guard
        executable = (Get-Command $Executable -CommandType Application).Source
        argv = $Argv; workingDirectory = $repo
        environmentOverrides = @{ GIT_OPTIONAL_LOCKS = '0'; GIT_TERMINAL_PROMPT = '0'; GIT_PAGER = ''; GH_PAGER = ''; GH_PROMPT_DISABLED = '1' }
        startedUtc = [DateTime]::UtcNow.ToString('o')
        nativeRootPid = $null; nativeRootIdentity = $null
        observedChildren = @(); observedChildTerminals = @()
        waitForExitMilliseconds = 90000; waitForExitReturned = $false
        stdoutPath = "commands-contract-history-v1\$Label.stdout.bin"
        stderrPath = "commands-contract-history-v1\$Label.stderr.bin"
        stdoutDrainCompleted = $false; stderrDrainCompleted = $false
        exitCode = $null; failure = $null
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
        if (-not $record.waitForExitReturned) { Stop-Process -Id $p.Id -Force; $p.WaitForExit() }
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
                $record["${name}Sha256"] = Get-Digest $path
            }
        }
        Save-Receipt
    }
    return (Join-Path $PSScriptRoot $record.stdoutPath)
}
try
{
    Save-Receipt
    $null = Get-Guard '00-entry'
    $prior = Join-Path $par 'finding-F206-245'
    $closure = [IO.File]::ReadAllText('.\reused-inputs\F206-collection-closure-v1.json') | ConvertFrom-Json
    $priorSeal = [IO.File]::ReadAllText('.\reused-inputs\F206-WHOLE-SEAL-v1.json') | ConvertFrom-Json
    foreach ($role in @('Original', 'Default'))
    {
        $commit = if ($role -eq 'Original') { $result.originalCommit } else { $result.defaultCommit }
        $binding = @($closure.files | Where-Object { $_.role -eq $role -and $_.logicalPath -eq 'eng\Versions.props' -and $_.commit -eq $commit })
        if ($binding.Count -ne 1) { throw 'Same-role accepted Versions.props binding unavailable.' }
        $from = [IO.Path]::GetFullPath((Join-Path $prior $binding[0].path))
        $sealBinding = @($priorSeal.files | Where-Object { $_.path -eq ($binding[0].path -replace '^\.\\', '') })
        if ($sealBinding.Count -ne 1 -or $sealBinding[0].sha256 -cne $binding[0].sha256 -or (Get-Digest $from) -cne $binding[0].sha256) { throw 'Accepted Versions.props byte provenance mismatch.' }
        $relative = "source\$role\eng\Versions.props"
        Copy-Exact $from (Join-Path $PSScriptRoot $relative)
        $result.files += @{ role = $role; commit = $commit; logicalPath = 'eng\Versions.props'; path = $relative; wholeFile = $true; bytes = ([IO.FileInfo]::new($from)).Length; sha256 = Get-Digest $from; provenance = @{ kind = 'hash-verified-accepted-whole-source-reuse'; priorFile = $from; acceptedIndexSha256 = Get-Digest (Join-Path $prior 'WHOLE-SEAL-v1.json') } }
    }
    $providerGitPath = 'src/Components/WebAssembly/WebAssembly/src/Hosting/WebAssemblyCultureProvider.cs'
    $testGitPath = 'src/Components/WebAssembly/WebAssembly/test/Hosting/WebAssemblyCultureProviderTest.cs'
    $null = Read-Native '15-original-GetCultures-filtered-history' 'git.exe' @('--no-pager', 'log', '--follow', '-n', '4', '--format=fuller', '-p', '-G', 'GetCultures|GetCultureHierarchy|culturesToLoad', $result.originalCommit, '--', $providerGitPath)
    $null = Read-Native '16-default-provider-history-metadata' 'gh.exe' @('api', '--method', 'GET', 'repos/dotnet/aspnetcore/commits', '-f', "sha=$($result.defaultCommit)", '-f', "path=$providerGitPath", '-f', 'per_page=6')
    $null = Read-Native '17-original-culture-test-history' 'git.exe' @('--no-pager', 'log', '--follow', '-n', '3', '--format=fuller', '-p', '-G', 'GetCultures_Return|tzm-Latn-DZ|en-GB', $result.originalCommit, '--', $testGitPath)
    $runtimeMetadataPath = Read-Native '18-runtime-reference-immutable-commit' 'gh.exe' @('api', '--method', 'GET', 'repos/dotnet/runtime/commits/main')
    $runtimeMetadata = [IO.File]::ReadAllText($runtimeMetadataPath) | ConvertFrom-Json
    if ($runtimeMetadata.sha -notmatch '^[0-9a-f]{40}$') { throw 'External reference source SHA not established.' }
    $result.runtimeReferenceCommit = $runtimeMetadata.sha
    $result.runtimeReferenceBoundary = 'Common source-level API/implementation witness only. Not bound to either ASP.NET role runtime binary, SDK, package graph, browser or execution. No inference of selected runtime implementation or completion.'
    $contractPaths = @(
        'src\libraries\System.Private.CoreLib\src\System\Globalization\CultureInfo.cs',
        'src\libraries\System.Linq\src\System\Linq\Contains.cs',
        'src\libraries\System.Linq\src\System\Linq\AppendPrepend.cs',
        'src\libraries\System.Private.CoreLib\src\System\String.Comparison.cs'
    )
    $index = 19
    foreach ($logical in $contractPaths)
    {
        $label = ('{0:00}-runtime-reference-{1}' -f $index, [IO.Path]::GetFileNameWithoutExtension($logical))
        $gitPath = $logical.Replace('\', '/')
        $captured = Read-Native $label 'gh.exe' @('api', '--method', 'GET', '-H', 'Accept: application/vnd.github.raw+json', "repos/dotnet/runtime/contents/${gitPath}?ref=$($runtimeMetadata.sha)")
        $relative = "source\ReferenceContract\dotnet-runtime\$logical"
        Copy-Exact $captured (Join-Path $PSScriptRoot $relative)
        $result.referenceContracts += @{ role = 'CommonReferenceContract'; repository = 'dotnet/runtime'; commit = $runtimeMetadata.sha; logicalPath = $logical; path = $relative; wholeFile = $true; bytes = ([IO.FileInfo]::new($captured)).Length; sha256 = Get-Digest $captured; commandLabel = $label; notRoleRuntimeQualification = $true }
        $index++
    }
    $allRoleFiles = @($initial.files) + @($result.files)
    foreach ($logical in @($allRoleFiles | ForEach-Object logicalPath | Sort-Object -Unique))
    {
        $original = @($allRoleFiles | Where-Object { $_.role -eq 'Original' -and $_.logicalPath -eq $logical })
        $default = @($allRoleFiles | Where-Object { $_.role -eq 'Default' -and $_.logicalPath -eq $logical })
        if ($original.Count -ne 1 -or $default.Count -ne 1) { throw "Incomplete or repeated source role binding: $logical" }
        foreach ($binding in @($original[0], $default[0]))
        {
            if ((Get-Digest (Join-Path $PSScriptRoot $binding.path)) -cne $binding.sha256) { throw "Fresh source binding mismatch: $($binding.path)" }
        }
        $result.rolePairs += @{ logicalPath = $logical; originalSha256 = $original[0].sha256; defaultSha256 = $default[0].sha256; exactByteIdentical = ($original[0].sha256 -ceq $default[0].sha256) }
    }
    $result.boundsObserved = @{
        directGitGhSourceUtilityStarts = $result.previousGitGhStarts + $result.commands.Count
        wholeProductTestConfigurationFilesPerRole = @($allRoleFiles | Where-Object role -eq 'Original').Count
        commonWholeReferenceContractFiles = $result.referenceContracts.Count
        navigationInstructionFiles = 4
        navigationWholeGuidanceDocuments = 2
        conservativeRolePlusCommonContractsPlusGuidanceDocumentCount = @($allRoleFiles | Where-Object role -eq 'Original').Count + $result.referenceContracts.Count + 2
        maximumWholeProductDocTestFilesPerRole = 15
    }
    if ($result.boundsObserved.conservativeRolePlusCommonContractsPlusGuidanceDocumentCount -gt 15) { throw 'Conservative whole-file bound exceeded.' }
    $result.state = 'completed'
}
catch { $result.state = 'failed'; $result.failure = $_.Exception.ToString(); throw }
finally { $result.finishedUtc = [DateTime]::UtcNow.ToString('o'); Save-Receipt }
"F227 contract/history $($result.state); collector=$PID; cumulative Git/gh=$($result.previousGitGhStarts + $result.commands.Count); conservative whole files/role=$($result.boundsObserved.conservativeRolePlusCommonContractsPlusGuidanceDocumentCount)"
