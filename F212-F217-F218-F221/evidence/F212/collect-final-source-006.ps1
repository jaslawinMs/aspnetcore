$ErrorActionPreference='Stop'
$Root='C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F212-233'
$ParentRoot=Split-Path $Root
$WorkingRepo='C:\src\aspnetcore'
$Agent='c485590a-1d0d-4aa3-971b-e1bfc2bfe790'
$Utf8=[Text.UTF8Encoding]::new($false)
$Records=[Collections.Generic.List[object]]::new()
$Bindings=[Collections.Generic.List[object]]::new()
$Scope=([IO.File]::ReadAllText((Join-Path $Root 'registrations\233234-observed003.json')) | ConvertFrom-Json).registrationScopes.F212
function Save([string] $Relative,[byte[]] $Value)
{
    $path=Join-Path $Root $Relative
    [void][IO.Directory]::CreateDirectory((Split-Path $path))
    $s=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
    try { $s.Write($Value,0,$Value.Length) } finally { $s.Dispose() }
    return $path
}
function Json([string] $Relative,$Value)
{
    $path=Save $Relative $Utf8.GetBytes((ConvertTo-Json -InputObject $Value -Depth 100))
    $null=[IO.File]::ReadAllText($path) | ConvertFrom-Json
    return $path
}
function Hash([byte[]] $Value) { return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Value)) }
function Blob([byte[]] $Value)
{
    $h=$Utf8.GetBytes("blob $($Value.Length)`0"); $b=[byte[]]::new($h.Length+$Value.Length)
    [Array]::Copy($h,0,$b,0,$h.Length); [Array]::Copy($Value,0,$b,$h.Length,$Value.Length)
    return [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($b)).ToLowerInvariant()
}
function Native([string] $Label,[string] $Exe,[string[]] $Argv)
{
    $raw=[IO.File]::ReadAllBytes((Join-Path $ParentRoot 'policy.json'))
    $null=Save "guards\006-$Label.policy.json" $raw
    $p=$Utf8.GetString($raw) | ConvertFrom-Json
    $lease=Test-Path -LiteralPath (Join-Path $ParentRoot 'benchmark-exclusive.lease.json')
    $ok=$p.independentFindingPreparationWorkers.F212 -ceq $Agent -and $p.activeWorkerPreparationScopes.F212 -ceq $Scope -and
        $p.actualWorkerBuildHoldActive -eq $false -and $p.buildAndTestWorkQuiesced -eq $false -and -not $lease
    $null=Json "guards\006-$Label.admission.json" ([ordered]@{
        observedUtc=[DateTime]::UtcNow.ToString('O'); policySha256=Hash $raw; actualAgent=$p.independentFindingPreparationWorkers.F212
        exactScopeMatches=($p.activeWorkerPreparationScopes.F212 -ceq $Scope); actualWorkerBuildHoldActive=$p.actualWorkerBuildHoldActive
        buildAndTestWorkQuiesced=$p.buildAndTestWorkQuiesced; benchmarkLeasePresent=$lease; admittedThisStartOnly=$ok; purpose='Final bounded source/provenance only'
    })
    if (-not $ok) { throw "Fresh guard denied $Label." }
    $i=[Diagnostics.ProcessStartInfo]::new()
    $i.FileName=$Exe; $i.WorkingDirectory=$WorkingRepo; $i.UseShellExecute=$false
    $i.RedirectStandardOutput=$true; $i.RedirectStandardError=$true; $i.CreateNoWindow=$true
    foreach ($arg in $Argv) { $i.ArgumentList.Add($arg) }
    $i.Environment['GIT_OPTIONAL_LOCKS']='0'; $i.Environment['GIT_TERMINAL_PROMPT']='0'
    $i.Environment['GIT_PAGER']='cat'; $i.Environment['GH_PAGER']='cat'; $i.Environment['GH_PROMPT_DISABLED']='1'
    $out=Join-Path $Root "native\006-$Label.stdout"; $err=Join-Path $Root "native\006-$Label.stderr"
    $os=[IO.File]::Open($out,[IO.FileMode]::CreateNew); $es=[IO.File]::Open($err,[IO.FileMode]::CreateNew)
    $process=[Diagnostics.Process]::new(); $process.StartInfo=$i
    $r=[ordered]@{
        label="006-$Label"; executable=$Exe; argv=$Argv; workingDirectory=$WorkingRepo
        processId=$null; processStartUtc=$null; exitCode=$null; rootTerminal=$false
        stdoutPath=$out; stderrPath=$err; stdoutDrained=$false; stderrDrained=$false
        observedChildren=@(); childObservationLimit='Direct gh/git roots only; no child enumeration or universal descendant-closure claim.'
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
        $os.Dispose(); $es.Dispose(); $process.Dispose(); $Records.Add([pscustomobject]$r)
        $null=Json "native\006-$Label.process.json" $r
    }
    if ($r.exitCode -ne 0) { throw "006-$Label exit $($r.exitCode); full streams retained." }
    return $Utf8.GetString([IO.File]::ReadAllBytes($out))
}
function Binding([string] $Repository,[string] $Commit,[string] $Tree,[string] $Path,[string] $Oid,[byte[]] $Raw,[string] $Role)
{
    if ((Blob $Raw) -cne $Oid) { throw "Source blob mismatch: $Repository $Path" }
    $saved=Save ("sources-extra\$Role\"+$Path.Replace('/','\')) $Raw
    $Bindings.Add([pscustomobject]@{
        repository=$Repository; role=$Role; commit=$Commit; tree=$Tree; path=$Path; blob=$Oid; bytes=$Raw.Length
        sha256=Hash $Raw; savedPath=$saved; loadedRuntimeProof=$false
    })
}
$self=[Diagnostics.Process]::GetCurrentProcess()
$null=Json 'collector-006.invocation.json' ([ordered]@{
    helperPath=$PSCommandPath; helperSha256=Hash ([IO.File]::ReadAllBytes($PSCommandPath)); processId=$PID
    processStartUtc=$self.StartTime.ToUniversalTime().ToString('O'); argv=[Environment]::GetCommandLineArgs()
    commandLine=[Environment]::CommandLine; oneExecutionOnly=$true; sourceOnly=$true
})
$self.Dispose()
try
{
    $tree=[IO.File]::ReadAllText((Join-Path $Root 'native\005-photino-native-tree.stdout')) | ConvertFrom-Json
    $nativePin=[IO.File]::ReadAllText((Join-Path $Root 'collector-005.result.json')) | ConvertFrom-Json
    $n=0
    foreach ($path in @('Photino.Native/Photino.Mac.UiDelegate.h','Photino.Native/Photino.Mac.UiDelegate.mm'))
    {
        $n++; $entries=@($tree.tree | Where-Object { $_.path -ceq $path })
        if ($entries.Count -ne 1) { throw "Exact macOS callback source unresolved: $path" }
        $entry=$entries[0]
        $response=(Native "mac-ui-blob-$n" 'gh' @('api','--method','GET',"repos/tryphotino/photino.Native/git/blobs/$($entry.sha)")) | ConvertFrom-Json
        if ($response.encoding -cne 'base64') { throw 'macOS source encoding mismatch.' }
        Binding 'tryphotino/photino.Native' $nativePin.commit $tree.sha $path $entry.sha ([Convert]::FromBase64String($response.content)) 'Photino.Native-2.5.2'
    }
    $query='query{repository(owner:"MicrosoftDocs",name:"edge-developer"){nameWithOwner defaultBranchRef{name target{... on Commit{oid tree{oid}}}}}}'
    $null=Save 'github-doc-pin-006.graphql' $Utf8.GetBytes($query)
    $docRepo=(Native 'webview2-doc-pin' 'gh' @('api','graphql','-f',"query=$query")) | ConvertFrom-Json
    if ($docRepo.errors) { throw 'Official WebView2 documentation pin query failed.' }
    $docCommit=[string]$docRepo.data.repository.defaultBranchRef.target.oid
    if ($docCommit -notmatch '^[0-9a-f]{40}$') { throw 'No exact official documentation commit pin.' }
    $docPath='microsoft-edge/webview2/concepts/threading-model.md'
    $query='query{repository(owner:"MicrosoftDocs",name:"edge-developer"){object(expression:"'+$docCommit+':'+$docPath+'"){... on Blob{oid byteSize text}}}}'
    $null=Save 'github-doc-source-006.graphql' $Utf8.GetBytes($query)
    $doc=(Native 'webview2-threading-doc' 'gh' @('api','graphql','-f',"query=$query")) | ConvertFrom-Json
    $item=$doc.data.repository.object
    if ($doc.errors -or $null -eq $item -or $null -eq $item.text) { throw 'Whole official WebView2 threading documentation unresolved.' }
    $raw=$Utf8.GetBytes([string]$item.text)
    if ($raw.Length -ne $item.byteSize) { throw 'Official documentation length mismatch.' }
    Binding 'MicrosoftDocs/edge-developer' $docCommit $docRepo.data.repository.defaultBranchRef.target.tree.oid $docPath $item.oid $raw 'WebView2-Threading-Documentation'
    $null=Json 'source-memberships-006.json' @($Bindings.ToArray())
    $members=@([IO.File]::ReadAllText((Join-Path $Root 'source-memberships-003.json')) | ConvertFrom-Json)
    $extra=@([IO.File]::ReadAllText((Join-Path $Root 'source-memberships-005.json')) | ConvertFrom-Json)
    $pairs=[Collections.Generic.List[object]]::new()
    foreach ($o in @($members+$extra | Where-Object { $_.role -ceq 'Original' }))
    {
        $d=@($members+$extra | Where-Object { $_.role -ceq 'Default' -and $_.path -ceq $o.path })
        if ($d.Count -ne 1) { throw "Source role pair unresolved: $($o.path)" }
        $originalPresent=if ($o.PSObject.Properties['present']) {[bool]$o.present} else {$true}
        $defaultPresent=if ($d[0].PSObject.Properties['present']) {[bool]$d[0].present} else {$true}
        $identical=if ($originalPresent -and $defaultPresent) {$o.blob -ceq $d[0].blob} else {$null}
        $pairs.Add([pscustomobject]@{path=$o.path;originalPresent=$originalPresent;defaultPresent=$defaultPresent;originalBlob=$o.blob;defaultBlob=$d[0].blob;wholeBytesIdentical=$identical})
    }
    $null=Json 'source-role-pairs-006.json' @($pairs.ToArray())
    $before=[IO.File]::ReadAllText((Join-Path $Root 'reserved\before003.snapshot.json')) | ConvertFrom-Json
    $head=(Native 'after-head' 'git' @('--no-optional-locks','-C',$WorkingRepo,'rev-parse','--verify','HEAD')).Trim()
    $branch=(Native 'after-branch' 'git' @('--no-optional-locks','-C',$WorkingRepo,'symbolic-ref','-q','HEAD')).Trim()
    $status=Native 'after-status' 'git' @('--no-optional-locks','-C',$WorkingRepo,'status','--porcelain=v1','-uall')
    $headBytes=[IO.File]::ReadAllBytes((Join-Path $before.gitDirectory 'HEAD'))
    $indexBytes=[IO.File]::ReadAllBytes((Join-Path $before.gitDirectory 'index'))
    $null=Save 'reserved\after006\HEAD' $headBytes; $null=Save 'reserved\after006\index' $indexBytes
    $reports=foreach ($report in $before.untracked)
    {
        $raw=[IO.File]::ReadAllBytes((Join-Path $WorkingRepo $report.path)); $sha=Hash $raw
        [pscustomobject]@{path=$report.path;bytes=$raw.Length;sha256=$sha;unchanged=($sha -ceq $report.sha256 -and $raw.Length -eq $report.bytes)}
    }
    $unchanged=$head -ceq $before.head -and $branch -ceq $before.branch -and $status -ceq $before.status -and
        (Hash $headBytes) -ceq $before.headFileSha256 -and (Hash $indexBytes) -ceq $before.indexSha256 -and
        @($reports | Where-Object {-not $_.unchanged}).Count -eq 0
    $null=Json 'reserved\after006.snapshot.json' ([ordered]@{
        head=$head;branch=$branch;status=$status;headFileSha256=Hash $headBytes;indexSha256=Hash $indexBytes
        untracked=@($reports);allAssignedReservedInvariantsUnchanged=$unchanged;comparison='reserved\before003.snapshot.json'
    })
    if (-not $unchanged) { throw 'Reserved worktree/index/HEAD/report invariant changed; no success fallback.' }
    $null=Json 'collector-006.result.json' ([ordered]@{
        state='FINAL_SOURCE_AND_RESERVED_INVARIANTS_COLLECTED';nativeRoots=@($Records.ToArray());sourceBindings=$Bindings.Count
        reservedInvariantsUnchanged=$unchanged;sourceRolePairs=$pairs.Count;noRuntimeOrBrowserExecution=$true;noCandidate=$true
    })
    Write-Output "FINAL_SOURCE_AND_RESERVED_INVARIANTS_COLLECTED bindings=$($Bindings.Count) pairs=$($pairs.Count) reservedUnchanged=$unchanged nativeRoots=$($Records.Count)"
    Write-Output 'SOURCE_PAIR_DIFFERENCES:'
    $pairs | Where-Object {$_.originalPresent -and $_.defaultPresent -and -not $_.wholeBytesIdentical} | Format-Table path,originalBlob,defaultBlob -AutoSize | Out-String | Write-Output
    Write-Output "OFFICIAL_WEBVIEW2_DOC_COMMIT=$docCommit"
}
catch
{
    $failure=$_ | Format-List * -Force | Out-String
    $null=Save 'collector-006.failure.txt' $Utf8.GetBytes($failure)
    $null=Json 'collector-006.failure.json' ([ordered]@{state='FAILED_NO_SUCCESS_FALLBACK';exception=$failure;nativeRoots=@($Records.ToArray());retainedBindings=@($Bindings.ToArray())})
    Write-Error -ErrorAction Continue $failure
    exit 1
}
