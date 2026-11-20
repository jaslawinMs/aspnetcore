param([string]$Pass='')
. "$PSScriptRoot\Record.ps1"
Invoke-Recorded "064-upstream-exit-gh$Pass" 'gh' @('api','repos/dotnet/aspnetcore/branches/main','--jq','.commit.sha')
Invoke-Recorded "065-upstream-exit-git$Pass" 'git' @('ls-remote','https://github.com/dotnet/aspnetcore.git','refs/heads/main')
Invoke-Recorded "066-coordinator-exit$Pass" 'git' @('--no-pager','status','--porcelain=v2','--branch')
foreach ($role in @(@{name='original37';repo='C:\src\ap163o011'},@{name='default';repo='C:\src\ap163d011'}))
{
    Invoke-Recorded "067-$($role.name)-tracked-clean$Pass" 'git' @('--no-pager','status','--porcelain=v2','--untracked-files=no') $role.repo
    Invoke-Recorded "068-$($role.name)-actual-head$Pass" 'git' @('rev-parse','HEAD') $role.repo
}
Invoke-Recorded "069-node-version$Pass" 'node' @('--version')
$observations = @()
foreach ($file in Get-ChildItem "$PSScriptRoot\commands" -Filter '*.json')
{
    $r = Get-Content $file.FullName -Raw | ConvertFrom-Json
    if (-not $r.rootAwaited -or -not $r.stdoutAwaited -or -not $r.stderrAwaited) { throw "Nonterminal recorded command: $($r.id)" }
    foreach ($child in $r.descendants)
    {
        $process = Get-Process -Id $child.pid -ErrorAction SilentlyContinue
        $observedStart = $null
        if ($process)
        {
            try { $observedStart = $process.StartTime } catch { }
        }
        $same = $process -and $observedStart -and [Math]::Abs(($observedStart.ToUniversalTime() - [DateTime]::Parse($child.creationDate).ToUniversalTime()).TotalMilliseconds) -lt 1
        if ($process -and -not $observedStart)
        {
            $remaining = Get-Process -Id $child.pid -ErrorAction SilentlyContinue
            if ($remaining) { throw "Known PID $($child.pid) remains present without readable start identity; cannot finish terminal snapshot." }
        }
        if ($same) { $process.WaitForExit() }
        $observations += @{
            commandId=$r.id; pid=$child.pid; originalCreationUtc=$child.creationDate
            pidPresentAtClosingCheck=($null -ne $process); identityMatchedWithinOneMillisecond=[bool]$same
            startTimeReadableAtClosingCheck=($null -ne $observedStart)
            awaitedAtClosingCheck=[bool]$same; terminalAtClosingCheck=$true
        }
    }
}
@{
    recordedAt=[DateTime]::UtcNow.ToString('o')
    agentId='99f6a6f7-2ec9-40ab-aa1d-f6486b7f9d5e'
    actualOwnedNativeChildrenTerminal=$true; actualOwnedStreamsDrained=$true
    actualDotnetWorkComplete=$true; remoteOwnedJobs=@()
    knownDescendantChecks=$observations
    boundary='All recorded roots and both streams awaited. Fresh bounded identity checks cover observed descendant PIDs, including earlier receipts with exact-timestamp comparison. Short-lived unobserved descendants are not an exhaustive historical census; no unrelated/shared-host idleness claim.'
    pending=@('F163','F164','F165')
} | ConvertTo-Json -Depth 20 | Set-Content "$PSScriptRoot\capsule\terminal-native-work.json" -Encoding utf8NoBOM
