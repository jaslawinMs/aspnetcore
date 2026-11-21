$ErrorActionPreference = 'Stop'
$Root = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F212-233'
$ParentRoot = Split-Path $Root
$Repo = 'C:\src\aspnetcore'
$Agent = 'c485590a-1d0d-4aa3-971b-e1bfc2bfe790'
$Utf8 = [Text.UTF8Encoding]::new($false)
$NativeRecords = [Collections.Generic.List[object]]::new()
$ExternalBindings = [Collections.Generic.List[object]]::new()
$ExpectedScope = ([IO.File]::ReadAllText((Join-Path $Root 'registrations\233234-observed003.json')) | ConvertFrom-Json).registrationScopes.F212
function Save([string] $Relative, [byte[]] $Value)
{
    $path = Join-Path $Root $Relative
    [void][IO.Directory]::CreateDirectory((Split-Path $path))
    $s = [IO.File]::Open($path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
    try { $s.Write($Value, 0, $Value.Length) } finally { $s.Dispose() }
    return $path
}
function Json([string] $Relative, $Value)
{
    $path = Save $Relative $Utf8.GetBytes((ConvertTo-Json -InputObject $Value -Depth 100))
    $null = [IO.File]::ReadAllText($path) | ConvertFrom-Json
    return $path
}
function Hash([byte[]] $Value) { return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Value)) }
function Blob([byte[]] $Value)
{
    $h = $Utf8.GetBytes("blob $($Value.Length)`0"); $b = [byte[]]::new($h.Length + $Value.Length)
    [Array]::Copy($h,0,$b,0,$h.Length); [Array]::Copy($Value,0,$b,$h.Length,$Value.Length)
    return [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($b)).ToLowerInvariant()
}
function Native([string] $Label, [string] $Exe, [string[]] $Argv)
{
    $raw = [IO.File]::ReadAllBytes((Join-Path $ParentRoot 'policy.json'))
    $null = Save "guards\004-$Label.policy.json" $raw
    $p = $Utf8.GetString($raw) | ConvertFrom-Json
    $lease = Test-Path -LiteralPath (Join-Path $ParentRoot 'benchmark-exclusive.lease.json')
    $ok = $p.independentFindingPreparationWorkers.F212 -ceq $Agent -and $p.activeWorkerPreparationScopes.F212 -ceq $ExpectedScope -and
        $p.actualWorkerBuildHoldActive -eq $false -and $p.buildAndTestWorkQuiesced -eq $false -and -not $lease
    $null = Json "guards\004-$Label.admission.json" ([ordered]@{
        observedUtc = [DateTime]::UtcNow.ToString('O'); policySha256 = Hash $raw; actualAgent = $p.independentFindingPreparationWorkers.F212
        exactScopeMatches = ($p.activeWorkerPreparationScopes.F212 -ceq $ExpectedScope); actualWorkerBuildHoldActive = $p.actualWorkerBuildHoldActive
        buildAndTestWorkQuiesced = $p.buildAndTestWorkQuiesced; benchmarkLeasePresent = $lease; admittedThisStartOnly = $ok; purpose = 'Read-only source/history'
    })
    if (-not $ok) { throw "Fresh guard denied $Label." }
    $i = [Diagnostics.ProcessStartInfo]::new()
    $i.FileName = $Exe; $i.WorkingDirectory = $Repo; $i.UseShellExecute = $false
    $i.RedirectStandardOutput = $true; $i.RedirectStandardError = $true; $i.CreateNoWindow = $true
    foreach ($arg in $Argv) { $i.ArgumentList.Add($arg) }
    $i.Environment['GIT_OPTIONAL_LOCKS']='0'; $i.Environment['GIT_TERMINAL_PROMPT']='0'
    $i.Environment['GIT_PAGER']='cat'; $i.Environment['GH_PAGER']='cat'; $i.Environment['GH_PROMPT_DISABLED']='1'
    $out = Join-Path $Root "native\004-$Label.stdout"; $err = Join-Path $Root "native\004-$Label.stderr"
    $os = [IO.File]::Open($out,[IO.FileMode]::CreateNew); $es = [IO.File]::Open($err,[IO.FileMode]::CreateNew)
    $process = [Diagnostics.Process]::new(); $process.StartInfo = $i
    $r = [ordered]@{
        label = "004-$Label"; executable = $Exe; argv = $Argv; workingDirectory = $Repo
        processId = $null; processStartUtc = $null; exitCode = $null; rootTerminal = $false
        stdoutPath = $out; stderrPath = $err; stdoutDrained = $false; stderrDrained = $false
        observedChildren = @(); childObservationLimit = 'Direct gh/git roots only; no child enumeration or universal descendant-closure claim.'
    }
    try
    {
        if (-not $process.Start()) { throw "Process.Start returned false: $Label" }
        $r.processId=$process.Id; $r.processStartUtc=$process.StartTime.ToUniversalTime().ToString('O')
        $ot=$process.StandardOutput.BaseStream.CopyToAsync($os); $et=$process.StandardError.BaseStream.CopyToAsync($es)
        $process.WaitForExit(); [void]$ot.GetAwaiter().GetResult(); [void]$et.GetAwaiter().GetResult()
        $r.exitCode=$process.ExitCode; $r.rootTerminal=$process.HasExited; $r.stdoutDrained=$true; $r.stderrDrained=$true
    }
    finally
    {
        $os.Dispose(); $es.Dispose(); $process.Dispose(); $NativeRecords.Add([pscustomobject]$r)
        $null = Json "native\004-$Label.process.json" $r
    }
    if ($r.exitCode -ne 0) { throw "004-$Label exit $($r.exitCode); full streams retained." }
    return $Utf8.GetString([IO.File]::ReadAllBytes($out))
}
$self = [Diagnostics.Process]::GetCurrentProcess()
$null = Json 'collector-004.invocation.json' ([ordered]@{
    helperPath = $PSCommandPath; helperSha256 = Hash ([IO.File]::ReadAllBytes($PSCommandPath)); processId = $PID
    processStartUtc = $self.StartTime.ToUniversalTime().ToString('O'); argv = [Environment]::GetCommandLineArgs()
    commandLine = [Environment]::CommandLine; oneExecutionOnly = $true; sourceOnly = $true
})
$self.Dispose()
try
{
    $members = [IO.File]::ReadAllText((Join-Path $Root 'source-memberships-003.json')) | ConvertFrom-Json
    $summary = foreach ($m in $members)
    {
        [pscustomobject]@{ role=$m.role; path=$m.path; present=$m.present; blob=$m.blob; bytes=$m.bytes; sha256=$m.sha256; reservedExactBytesMatch=$m.reservedNavigationBytesMatch }
    }
    $null = Json 'source-membership-summary-004.json' @($summary)
    foreach ($role in @('Original','Default'))
    {
        $history = [IO.File]::ReadAllText((Join-Path $Root "native\003-github-history-$role.stdout")) | ConvertFrom-Json
        $null = Json "history\$role-summary-004.json" @($history | ForEach-Object { [pscustomobject]@{ sha=$_.sha; date=$_.commit.author.date; message=$_.commit.message; url=$_.html_url } })
    }
    $original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    $manager = 'src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoWebViewManager.cs'
    $null = Native 'manager-follow-history' 'git' @('--no-optional-locks','-C',$Repo,'log','--follow','-n','16','--format=%H %aI %s','--name-status',$original,'--',$manager)
    $null = Native 'manager-dispatch-blame' 'git' @('--no-optional-locks','-C',$Repo,'blame','-L','32,45',$original,'--',$manager)
    $externalRepo = 'tryphotino/photino.NET'
    $tags = (Native 'photino-net-tags' 'gh' @('api','--method','GET',"repos/$externalRepo/tags?per_page=100")) | ConvertFrom-Json
    $matches = @($tags | Where-Object { $_.name -match '^v?2\.5\.2$' })
    if ($matches.Count -ne 1) { throw "Exact Photino.NET2.5.2 tag candidates=$($matches.Count); external pin unresolved." }
    $tag = $matches[0]
    $commit = [string]$tag.commit.sha
    $tree = (Native 'photino-net-tree' 'gh' @('api','--method','GET',"repos/$externalRepo/git/trees/$($commit)?recursive=1")) | ConvertFrom-Json
    if ($tree.truncated) { throw 'Photino.NET tree truncated; not a complete source inventory.' }
    $selected = @($tree.tree | Where-Object {
        $_.type -eq 'blob' -and ($_.path -match '(^|/)PhotinoWindow[^/]*\.cs$' -or
            $_.path -match '(^|/)Photino[^/]*(Dll|Interop|Native|Wrapper)[^/]*\.cs$' -or
            $_.path -match '\.csproj$' -or $_.path -eq 'README.md')
    })
    if ($selected.Count -gt 12) { throw "Photino.NET selection exceeds finite12-file bound: $($selected.Count)" }
    $n = 0
    foreach ($entry in $selected)
    {
        $n++
        $response = (Native "photino-net-blob-$n" 'gh' @('api','--method','GET',"repos/$externalRepo/git/blobs/$($entry.sha)")) | ConvertFrom-Json
        if ($response.encoding -cne 'base64') { throw 'Unsupported external blob encoding.' }
        $raw = [Convert]::FromBase64String($response.content)
        if ((Blob $raw) -cne $entry.sha -or $raw.Length -ne $response.size) { throw "External source byte/blob mismatch: $($entry.path)" }
        $saved = Save ("external\Photino.NET-2.5.2\" + $entry.path.Replace('/','\')) $raw
        $ExternalBindings.Add([pscustomobject]@{
            repository=$externalRepo; tag=$tag.name; commit=$commit; tree=$tree.sha; path=$entry.path; blob=$entry.sha
            bytes=$raw.Length; sha256=Hash $raw; savedPath=$saved; packageBinaryOrLoadedRuntimeProof=$false
        })
    }
    $null = Json 'external-memberships-004.json' @($ExternalBindings.ToArray())
    $null = Json 'collector-004.result.json' ([ordered]@{
        state='DEPENDENCY_TAG_SOURCE_COLLECTED'; repository=$externalRepo; tag=$tag.name; commit=$commit; selectedFiles=$selected.Count
        nativeRoots=@($NativeRecords.ToArray()); runtimeExecutions=@(); tests=@(); packageBinaryBindingEstablished=$false
    })
    Write-Output "DEPENDENCY_TAG_SOURCE_COLLECTED $externalRepo tag=$($tag.name) commit=$commit selected=$($selected.Count)"
    Write-Output 'PINNED_SOURCE_ABSENCES:'
    $summary | Where-Object { -not $_.present } | Format-Table role,path -AutoSize | Out-String | Write-Output
    Write-Output 'PHOTINO.NET_TREE_PATHS:'
    $tree.tree | Where-Object { $_.type -eq 'blob' } | Select-Object -ExpandProperty path | Write-Output
}
catch
{
    $failure=$_ | Format-List * -Force | Out-String
    $null=Save 'collector-004.failure.txt' $Utf8.GetBytes($failure)
    $null=Json 'collector-004.failure.json' ([ordered]@{state='FAILED_NO_SUCCESS_FALLBACK'; exception=$failure; nativeRoots=@($NativeRecords.ToArray()); retainedExternalBindings=@($ExternalBindings.ToArray())})
    Write-Error -ErrorAction Continue $failure
    exit 1
}
