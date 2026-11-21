$ErrorActionPreference = 'Stop'
$Root = 'C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F212-233'
$ParentRoot = Split-Path $Root
$WorkingRepo = 'C:\src\aspnetcore'
$Agent = 'c485590a-1d0d-4aa3-971b-e1bfc2bfe790'
$Utf8 = [Text.UTF8Encoding]::new($false)
$Records = [Collections.Generic.List[object]]::new()
$Bindings = [Collections.Generic.List[object]]::new()
$Scope = ([IO.File]::ReadAllText((Join-Path $Root 'registrations\233234-observed003.json')) | ConvertFrom-Json).registrationScopes.F212
function Save([string] $Relative, [byte[]] $Value)
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
    $null=Save "guards\005-$Label.policy.json" $raw
    $p=$Utf8.GetString($raw) | ConvertFrom-Json
    $lease=Test-Path -LiteralPath (Join-Path $ParentRoot 'benchmark-exclusive.lease.json')
    $ok=$p.independentFindingPreparationWorkers.F212 -ceq $Agent -and $p.activeWorkerPreparationScopes.F212 -ceq $Scope -and
        $p.actualWorkerBuildHoldActive -eq $false -and $p.buildAndTestWorkQuiesced -eq $false -and -not $lease
    $null=Json "guards\005-$Label.admission.json" ([ordered]@{
        observedUtc=[DateTime]::UtcNow.ToString('O'); policySha256=Hash $raw; actualAgent=$p.independentFindingPreparationWorkers.F212
        exactScopeMatches=($p.activeWorkerPreparationScopes.F212 -ceq $Scope); actualWorkerBuildHoldActive=$p.actualWorkerBuildHoldActive
        buildAndTestWorkQuiesced=$p.buildAndTestWorkQuiesced; benchmarkLeasePresent=$lease; admittedThisStartOnly=$ok; purpose='Read-only source/history'
    })
    if (-not $ok) { throw "Fresh guard denied $Label." }
    $i=[Diagnostics.ProcessStartInfo]::new()
    $i.FileName=$Exe; $i.WorkingDirectory=$WorkingRepo; $i.UseShellExecute=$false
    $i.RedirectStandardOutput=$true; $i.RedirectStandardError=$true; $i.CreateNoWindow=$true
    foreach ($arg in $Argv) { $i.ArgumentList.Add($arg) }
    $i.Environment['GIT_OPTIONAL_LOCKS']='0'; $i.Environment['GIT_TERMINAL_PROMPT']='0'
    $i.Environment['GIT_PAGER']='cat'; $i.Environment['GH_PAGER']='cat'; $i.Environment['GH_PROMPT_DISABLED']='1'
    $out=Join-Path $Root "native\005-$Label.stdout"; $err=Join-Path $Root "native\005-$Label.stderr"
    $os=[IO.File]::Open($out,[IO.FileMode]::CreateNew); $es=[IO.File]::Open($err,[IO.FileMode]::CreateNew)
    $process=[Diagnostics.Process]::new(); $process.StartInfo=$i
    $r=[ordered]@{
        label="005-$Label"; executable=$Exe; argv=$Argv; workingDirectory=$WorkingRepo
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
        $null=Json "native\005-$Label.process.json" $r
    }
    if ($r.exitCode -ne 0) { throw "005-$Label exit $($r.exitCode); full streams retained." }
    return $Utf8.GetString([IO.File]::ReadAllBytes($out))
}
function SaveBinding([string] $Repository,[string] $Role,[string] $Commit,[string] $Tree,[string] $Path,[string] $Oid,[byte[]] $Raw)
{
    if ((Blob $Raw) -cne $Oid) { throw "Blob mismatch: $Repository $Path" }
    $saved=Save ("sources-extra\$Role\"+$Path.Replace('/','\')) $Raw
    $Bindings.Add([pscustomobject]@{
        repository=$Repository; role=$Role; commit=$Commit; tree=$Tree; path=$Path; blob=$Oid
        bytes=$Raw.Length; sha256=Hash $Raw; savedPath=$saved; loadedRuntimeProof=$false
    })
}
$self=[Diagnostics.Process]::GetCurrentProcess()
$null=Json 'collector-005.invocation.json' ([ordered]@{
    helperPath=$PSCommandPath; helperSha256=Hash ([IO.File]::ReadAllBytes($PSCommandPath)); processId=$PID
    processStartUtc=$self.StartTime.ToUniversalTime().ToString('O'); argv=[Environment]::GetCommandLineArgs()
    commandLine=[Environment]::CommandLine; oneExecutionOnly=$true; sourceOnly=$true
})
$self.Dispose()
try
{
    $pins=[IO.File]::ReadAllText((Join-Path $Root 'source-pins-003.json')) | ConvertFrom-Json
    $paths=@('src/Components/WebView/WebView/src/Services/WebViewRenderer.cs','src/Components/WebView/WebView/test/Infrastructure/TestWebViewManager.cs')
    $specs=[Collections.Generic.List[object]]::new()
    foreach ($role in @(@('Original','o',$pins.originalCommit),@('Default','d',$pins.defaultCommit)))
    {
        for ($n=0;$n -lt $paths.Count;$n++) { $specs.Add([pscustomobject]@{alias="$($role[1])$n";role=$role[0];commit=$role[2];path=$paths[$n]}) }
    }
    $intro='cf2f128e24187970d66e7b6c5bb529b0a584a015'
    $specs.Add([pscustomobject]@{alias='intro';role='Introduction';commit=$intro;path='src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoWebViewManager.cs'})
    $parts=foreach ($s in $specs) { "$($s.alias):object(expression:`"$($s.commit):$($s.path)`"){... on Blob{oid byteSize text}}" }
    $query='query{repository(owner:"dotnet",name:"aspnetcore"){'+($parts -join ' ')+'}}'
    $null=Save 'github-source-extra-005.graphql' $Utf8.GetBytes($query)
    $data=(Native 'aspnet-extra-source' 'gh' @('api','graphql','-f',"query=$query")) | ConvertFrom-Json
    if ($data.errors) { throw 'Extra ASP.NET source query contains errors.' }
    foreach ($s in $specs)
    {
        $item=$data.data.repository.($s.alias)
        if ($null -eq $item -or $null -eq $item.text) { throw "Missing exact extra source: $($s.role) $($s.path)" }
        $raw=$Utf8.GetBytes([string]$item.text)
        if ($raw.Length -ne $item.byteSize) { throw 'Extra ASP.NET source length mismatch.' }
        SaveBinding 'dotnet/aspnetcore' $s.role $s.commit '' $s.path $item.oid $raw
    }
    $null=Native 'manager-introduction-patch' 'git' @('--no-optional-locks','-C',$WorkingRepo,'show','--format=fuller','--no-ext-diff',$intro,'--','src/Components/WebView/Samples/PhotinoPlatform/src/PhotinoWebViewManager.cs')
    $netTree=[IO.File]::ReadAllText((Join-Path $Root 'native\004-photino-net-tree.stdout')) | ConvertFrom-Json
    $netPin=[IO.File]::ReadAllText((Join-Path $Root 'collector-004.result.json')) | ConvertFrom-Json
    $netEntry=@($netTree.tree | Where-Object { $_.path -ceq 'Photino.NET/PhotinoNetDelegates.cs' })
    if ($netEntry.Count -ne 1) { throw 'Photino.NET managed event source membership unresolved.' }
    $item=(Native 'photino-net-event-source' 'gh' @('api','--method','GET',"repos/tryphotino/photino.NET/git/blobs/$($netEntry[0].sha)")) | ConvertFrom-Json
    if ($item.encoding -cne 'base64') { throw 'Managed event source encoding mismatch.' }
    SaveBinding 'tryphotino/photino.NET' 'Photino.NET-2.5.2' $netPin.commit $netTree.sha $netEntry[0].path $netEntry[0].sha ([Convert]::FromBase64String($item.content))
    $nativeRepo='tryphotino/photino.Native'
    $tags=(Native 'photino-native-tags' 'gh' @('api','--method','GET',"repos/$nativeRepo/tags?per_page=100")) | ConvertFrom-Json
    $tagMatches=@($tags | Where-Object { $_.name -match '^v?2\.5\.2$' })
    if ($tagMatches.Count -ne 1) { throw "Photino.Native2.5.2 exact tag candidates=$($tagMatches.Count); unresolved native source pin." }
    $tag=$tagMatches[0]; $commit=[string]$tag.commit.sha
    $tree=(Native 'photino-native-tree' 'gh' @('api','--method','GET',"repos/$nativeRepo/git/trees/$($commit)?recursive=1")) | ConvertFrom-Json
    if ($tree.truncated) { throw 'Native source tree truncated.' }
    $selected=@($tree.tree | Where-Object { $_.type -eq 'blob' -and
        ($_.path -match '(^|/)Photino(\.(Windows|Linux|Mac))?\.(cpp|mm|h)$' -or
         $_.path -match '(^|/)[Ee]xports\.(cpp|h)$' -or $_.path -eq 'README.md') })
    if ($selected.Count -eq 0 -or $selected.Count -gt 12 -or ($selected | Measure-Object size -Sum).Sum -gt 650000) { throw "Native selection outside finite bounds: $($selected.Count) files" }
    $n=0
    foreach ($entry in $selected)
    {
        $n++
        $response=(Native "photino-native-blob-$n" 'gh' @('api','--method','GET',"repos/$nativeRepo/git/blobs/$($entry.sha)")) | ConvertFrom-Json
        if ($response.encoding -cne 'base64') { throw 'Unsupported native source encoding.' }
        $raw=[Convert]::FromBase64String($response.content)
        if ($raw.Length -ne $response.size) { throw 'Native source byte length mismatch.' }
        SaveBinding $nativeRepo 'Photino.Native-2.5.2' $commit $tree.sha $entry.path $entry.sha $raw
    }
    $null=Json 'source-memberships-005.json' @($Bindings.ToArray())
    $null=Json 'collector-005.result.json' ([ordered]@{
        state='NATIVE_TAG_SOURCE_COLLECTED'; repository=$nativeRepo; tag=$tag.name; commit=$commit; tree=$tree.sha
        selectedFiles=$selected.Count; nativeRoots=@($Records.ToArray()); runtimeExecutions=@(); tests=@(); packageBinaryBindingEstablished=$false
    })
    Write-Output "NATIVE_TAG_SOURCE_COLLECTED $nativeRepo tag=$($tag.name) commit=$commit selected=$($selected.Count)"
    Write-Output 'SELECTED_NATIVE_PATHS:'; $selected.path | Write-Output
    Write-Output 'NATIVE_REPOSITORY_SOURCE_PATHS:'
    $tree.tree | Where-Object { $_.type -eq 'blob' -and $_.path -match '\.(cpp|h|mm)$' -and $_.path -notmatch '(packages|WebView2|webview2)' } | Select-Object -ExpandProperty path | Write-Output
}
catch
{
    $failure=$_ | Format-List * -Force | Out-String
    $null=Save 'collector-005.failure.txt' $Utf8.GetBytes($failure)
    $null=Json 'collector-005.failure.json' ([ordered]@{state='FAILED_NO_SUCCESS_FALLBACK'; exception=$failure; nativeRoots=@($Records.ToArray()); retainedBindings=@($Bindings.ToArray())})
    Write-Error -ErrorAction Continue $failure
    exit 1
}
