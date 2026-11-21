$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
$owner = '0e68af4c-282e-499c-824b-253a9e5d389b'
$repository = 'C:\src\aspnetcore'
$base = Split-Path $PSScriptRoot -Parent
$policyPath = Join-Path $base 'policy.json'
$leasePath = Join-Path $base 'benchmark-exclusive.lease.json'
$pin = Get-Content -LiteralPath 'source-002\source-manifest.json' -Raw | ConvertFrom-Json
$script:sequence = 0
$script:commands = [Collections.Generic.List[object]]::new()
$script:sources = [Collections.Generic.List[object]]::new()
$utf8 = [Text.UTF8Encoding]::new($false)

function New-Json([string] $Path, [object] $Value)
{
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try
    {
        $bytes = $utf8.GetBytes(($Value | ConvertTo-Json -Depth 30) + [Environment]::NewLine)
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
}

function Guard
{
    $p = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
    $leaseExists = Test-Path -LiteralPath $leasePath
    if ($p.independentFindingPreparationWorkers.F150 -cne $owner -or
        @($p.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
        $leaseExists -or $p.actualWorkerBuildHoldActive -ne $false -or
        $p.buildAndTestWorkQuiesced -ne $false -or
        $p.activeWorkerPreparationScopes.F150 -notmatch '^246 SOURCE ONLY')
    {
        throw 'F150 source-only live guard rejected.'
    }
    return [ordered]@{observedUtc=[DateTime]::UtcNow.ToString('o'); policySha256=(Get-FileHash -LiteralPath $policyPath -Algorithm SHA256).Hash; actualOwner=$p.independentFindingPreparationWorkers.F150; registeredOwnerCount=@($p.independentFindingPreparationWorkers.PSObject.Properties).Count; leaseExists=$leaseExists; actualHOLD=$p.actualWorkerBuildHoldActive; quiesced=$p.buildAndTestWorkQuiesced}
}

function Read-Git([string[]] $Argv, [string] $Label)
{
    $guard = Guard
    $script:sequence++
    $stem = 'closure-003\commands\{0:D3}-{1}' -f $script:sequence, $Label
    $stdoutPath = [IO.Path]::GetFullPath("$stem.stdout.bin")
    $stderrPath = [IO.Path]::GetFullPath("$stem.stderr.bin")
    $arguments = @('--no-pager', '--no-optional-locks', '-C', $repository) + $Argv
    $record = [ordered]@{label=$Label; executable=$git; argv=$arguments; workingDirectory=$PSScriptRoot; guard=$guard}
    New-Json "$stem.invocation.json" $record
    $outStream = [IO.File]::Open($stdoutPath, [IO.FileMode]::CreateNew)
    $errStream = [IO.File]::Open($stderrPath, [IO.FileMode]::CreateNew)
    $process = [Diagnostics.Process]::new()
    $children = [Collections.Generic.List[object]]::new()
    try
    {
        $process.StartInfo.FileName = $git
        $process.StartInfo.WorkingDirectory = $PSScriptRoot
        $process.StartInfo.UseShellExecute = $false
        $process.StartInfo.RedirectStandardOutput = $true
        $process.StartInfo.RedirectStandardError = $true
        $process.StartInfo.Environment['GIT_PAGER'] = ''
        $process.StartInfo.Environment['GIT_OPTIONAL_LOCKS'] = '0'
        foreach ($a in $arguments)
        {
            $process.StartInfo.ArgumentList.Add($a)
        }
        if (-not $process.Start())
        {
            throw 'Source-only git reader did not start.'
        }
        $record['rootPid'] = $process.Id
        $record['rootStartTimeUtc'] = $process.StartTime.ToUniversalTime().ToString('o')
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($outStream)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($errStream)
        do
        {
            foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($process.Id)"))
            {
                $identity = '{0}|{1}' -f $child.ProcessId, $child.CreationDate.ToUniversalTime().ToString('o')
                if (-not @($children | Where-Object { $_.identity -ceq $identity }).Count)
                {
                    $children.Add([ordered]@{identity=$identity; pid=[int]$child.ProcessId; creationTimeUtc=$child.CreationDate.ToUniversalTime().ToString('o'); parentPid=[int]$child.ParentProcessId; name=$child.Name; commandLine=$child.CommandLine})
                }
            }
        }
        while (-not $process.WaitForExit(50))
        $process.WaitForExit()
        $outTask.GetAwaiter().GetResult() | Out-Null
        $errTask.GetAwaiter().GetResult() | Out-Null
        $record['rootExitCode'] = $process.ExitCode
        $record['rootExitTimeUtc'] = $process.ExitTime.ToUniversalTime().ToString('o')
        $record['rootWaitReturned'] = $true
        $record['stdoutCopyAwaited'] = $true
        $record['stderrCopyAwaited'] = $true
        foreach ($child in $children)
        {
            $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($child.pid)"
            $child['sameInstancePresentAfterRootWait'] = $null -ne $current -and $current.CreationDate.ToUniversalTime().ToString('o') -ceq $child.creationTimeUtc
            if ($child.sameInstancePresentAfterRootWait)
            {
                throw 'Observed source-reader child remains live.'
            }
        }
        $record['observedChildInstances'] = @($children.ToArray())
        $record['descendantObservationLimit'] = 'Immediate Win32_Process snapshots while source root is live, not universal descendant closure.'
    }
    catch
    {
        $record['failure'] = $_.ToString()
        throw
    }
    finally
    {
        $outStream.Dispose()
        $errStream.Dispose()
        $record['stdoutPath'] = $stdoutPath
        $record['stderrPath'] = $stderrPath
        $record['stdoutSha256'] = (Get-FileHash -LiteralPath $stdoutPath -Algorithm SHA256).Hash
        $record['stderrSha256'] = (Get-FileHash -LiteralPath $stderrPath -Algorithm SHA256).Hash
        New-Json "$stem.result.json" $record
        $script:commands.Add($record)
        $process.Dispose()
    }
    Write-Output ("SOURCE_READ_RETURNED {0} rootPid={1} exit={2}" -f $Label, $record.rootPid, $record.rootExitCode) | Out-Host
    if ($record.rootExitCode -ne 0)
    {
        throw "Source-only git reader $Label exited $($record.rootExitCode)."
    }
    return [pscustomobject]@{record=$record; stdoutPath=$stdoutPath; text=$(if ($Label -notmatch 'archive') { [IO.File]::ReadAllText($stdoutPath) } else { $null })}
}

$guard = Guard
New-Item -ItemType Directory -Path 'closure-003\commands' | Out-Null
New-Json 'closure-003\helper-start.json' ([ordered]@{script=$PSCommandPath; scriptSha256=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash; argv=@(); rootPowerShellPid=$PID; rootPowerShellStartTimeUtc=(Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o'); guard=$guard; pinManifestSha256=(Get-FileHash -LiteralPath 'source-002\source-manifest.json' -Algorithm SHA256).Hash; sourceOnly=$true})
$git = (Get-Command git.exe -CommandType Application).Source
$fixed = @(
    'src/Components/Components/src/RenderTree/Renderer.cs',
    'src/Components/Components/src/Rendering/ComponentState.cs',
    'src/Components/Components/src/ComponentBase.cs',
    'src/Components/Components/src/Dispatcher.cs',
    'src/Components/Components/src/RenderHandle.cs',
    'src/Components/Components/src/ComponentFactory.cs',
    'src/Components/Components/src/CascadingValue.cs',
    'src/Components/Components/src/IHandleAfterRender.cs',
    'src/Components/Components/src/IComponent.cs',
    'src/Components/AGENTS.md',
    'src/Components/ARCHITECTURE.md',
    '.github/instructions/components.instructions.md',
    '.github/instructions/cross-cutting-guidance.instructions.md',
    'docs/BlazorComponentsGuidance.md',
    'docs/CrossCuttingGuidance.md'
)
$wasmPattern = '^src/Components/benchmarkapps/Wasm\.Performance/(ConsoleHost/.*\.(cs|csproj)|TestApp/(Pages/GridRendering\.razor|BenchmarkEvent\.cs|_Imports\.razor|Wasm\.Performance\.TestApp\.csproj|Shared/(FastGrid|PlainTable|ComplexTable)/.*\.(cs|razor))|Driver/.*\.(cs|csproj)|Directory\.Build\.props|README\.md|benchmarks\.compose\.json|dockerfile|exec\.sh)$'
$roles = @([pscustomobject]@{name='Original'; commit=$pin.originalCommit}, [pscustomobject]@{name='Default'; commit=$pin.defaultCommit})
$missing = [Collections.Generic.List[object]]::new()
foreach ($role in $roles)
{
    $tree = Read-Git (@('ls-tree', '-r', '--name-only', $role.commit, '--', 'src/Components/benchmarkapps/Wasm.Performance', 'src/Shared/CommandLineUtils') + $fixed) ("$($role.name)-closure-tree")
    $allPaths = @($tree.text -split '\r?\n' | Where-Object { $_.Length -gt 0 })
    $selected = @($allPaths | Where-Object { $_ -match $wasmPattern -or $_ -match '^src/Shared/CommandLineUtils/.*\.cs$' -or $_ -cin $fixed } | Sort-Object -Unique)
    foreach ($path in $fixed)
    {
        if ($path -cnotin $allPaths)
        {
            $missing.Add([ordered]@{role=$role.name; commit=$role.commit; repositoryPath=$path; evidence='Absent from role-specific ls-tree; not substituted from navigation checkout.'})
        }
    }
    $archive = Read-Git (@('archive', '--format=zip', $role.commit, '--') + $selected) ("$($role.name)-closure-archive")
    $zipStream = [IO.File]::OpenRead($archive.stdoutPath)
    $zip = [IO.Compression.ZipArchive]::new($zipStream, [IO.Compression.ZipArchiveMode]::Read)
    $extracted = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    try
    {
        foreach ($entry in $zip.Entries)
        {
            if ($entry.FullName.EndsWith('/'))
            {
                continue
            }
            if ($entry.FullName -cnotin $selected -or -not $extracted.Add($entry.FullName))
            {
                throw "Unexpected or duplicate archive entry: $($entry.FullName)"
            }
            $destination = Join-Path "closure-003\sources\$($role.name)" ($entry.FullName.Replace('/', '\'))
            New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
            $inputStream = $entry.Open()
            $outputStream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew)
            try
            {
                $inputStream.CopyTo($outputStream)
            }
            finally
            {
                $inputStream.Dispose()
                $outputStream.Dispose()
            }
            $script:sources.Add([ordered]@{role=$role.name; commit=$role.commit; repositoryPath=$entry.FullName; evidencePath=$destination; bytes=(Get-Item -LiteralPath $destination).Length; sha256=(Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash; wholeFile=$true; sourceCommand=$archive.record.label})
        }
    }
    finally
    {
        $zip.Dispose()
        $zipStream.Dispose()
    }
    if ($extracted.Count -ne $selected.Count)
    {
        throw 'Whole source archive extraction is incomplete.'
    }
}
$introduction = Read-Git @('show', '--format=fuller', '--stat', '--patch', '1885af963432ee7d66a80448cc2c24fa95c25d24', '--', 'src/Components/benchmarkapps/Wasm.Performance') 'console-introduction-history'
$cliHistory = Read-Git @('log', '--follow', '--name-status', '--format=fuller', '-n', '8', $pin.defaultCommit, '--', 'src/Shared/CommandLineUtils/CommandLine/CommandLineApplication.cs') 'default-cli-history'
$rendererHistory = Read-Git @('log', '--follow', '--name-status', '--format=fuller', '-n', '8', $pin.defaultCommit, '--', 'src/Components/benchmarkapps/Wasm.Performance/ConsoleHost/ConsoleHostRenderer.cs') 'default-console-renderer-history'
$guidance = foreach ($path in @('src\Components\AGENTS.md', '.github\instructions\components.instructions.md', '.github\instructions\cross-cutting-guidance.instructions.md', 'docs\BlazorComponentsGuidance.md', 'docs\CrossCuttingGuidance.md'))
{
    $source = Join-Path $repository $path
    $destination = Join-Path 'closure-003\navigation-guidance' $path
    New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
    $bytes = [IO.File]::ReadAllBytes($source)
    $stream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew)
    try
    {
        $stream.Write($bytes, 0, $bytes.Length)
    }
    finally
    {
        $stream.Dispose()
    }
    [ordered]@{role='NavigationGuidanceNotDefault'; repositoryPath=$path; evidencePath=$destination; bytes=$bytes.Length; sha256=(Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash; wholeFile=$true}
}
$comparison = foreach ($group in ($script:sources | Group-Object repositoryPath))
{
    $entries = @($group.Group)
    [ordered]@{repositoryPath=$group.Name; roleCount=$entries.Count; identicalAcrossRoles=($entries.Count -eq 2 -and $entries[0].sha256 -ceq $entries[1].sha256)}
}
New-Json 'closure-003\source-manifest.json' ([ordered]@{findingId='F150'; owner=$owner; originalCommit=$pin.originalCommit; defaultBranch=$pin.defaultBranch; defaultCommit=$pin.defaultCommit; defaultObservationUtc=$pin.defaultObservationUtc; sources=@($script:sources.ToArray()); roleComparisons=@($comparison); missingRolePaths=@($missing.ToArray()); navigationGuidance=@($guidance); nativeCommandCount=$script:commands.Count; measured=$false; runtimeBehaviorVerified=$false; nativeScope='Source-only git tree/archive/history reads and inert ZIP extraction; no product-native/SDK/build/test/scenario/browser execution.'; exitGuard=(Guard)})
Write-Output ("CLOSURE003_SCRIPT_RETURNING sources={0} missingRolePaths={1} commands={2}; outer tool exit is separate" -f $script:sources.Count, $missing.Count, $script:commands.Count)
