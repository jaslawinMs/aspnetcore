$ErrorActionPreference = 'Stop'
$old = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'capture-library-006.ps1'))
$oldExecutable = '$executable = (Get-Command $Tool -CommandType Application -ErrorAction Stop).Source'
$newExecutable = @'
$executable = (Get-Command $Tool -CommandType Application -ErrorAction Stop).Source
    if ($Tool -ceq 'git')
    {
        $coreGit = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetDirectoryName($executable)) '..\mingw64\bin\git.exe'))
        if ([IO.File]::Exists($coreGit)) { $executable = $coreGit }
    }
'@
$new = $old.Replace($oldExecutable, $newExecutable)
$oldChild = '$childTerminal += [ordered]@{ key = $entry.Key; observed = $entry.Value.observed; terminal = $terminal; exitCode = $exitCode; identityOrStateError = $stateError; ownershipNotEstablishedByObservationAlone = $true; stoppedByThisHelper = $false }'
$newChild = @'
$absencePoint = $null
            $stillPresent = $false
            $absenceError = $null
            if (-not $terminal)
            {
                try
                {
                    $laterRows = @(Get-CimInstance -ClassName Win32_Process -Filter ('ProcessId = ' + $entry.Value.observed.pid) -ErrorAction Stop | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine)
                    $absencePoint = [ordered]@{ observedUtc = [DateTime]::UtcNow.ToString('o'); pid = $entry.Value.observed.pid; presentRows = $laterRows; identityAndExitCodeNotRecovered = $true }
                    $stillPresent = $laterRows.Count -gt 0
                }
                catch { $absenceError = $_.Exception.ToString(); $stillPresent = $true }
            }
            $childTerminal += [ordered]@{ key = $entry.Key; observed = $entry.Value.observed; terminal = $terminal; exitCode = $exitCode; identityOrStateError = $stateError; laterAbsencePoint = $absencePoint; absenceCheckError = $absenceError; liveOrUnknownAtEndPoint = $stillPresent; ownershipNotEstablishedByObservationAlone = $true; stoppedByThisHelper = $false }
'@
$new = $new.Replace($oldChild, $newChild)
$oldConsole = '[Console]::WriteLine(($receipt | Select-Object label,started,rootTerminalObserved,rootExitCode,stdoutBytes,stderrBytes,failure | ConvertTo-Json -Compress))'
$newConsole = '[Console]::WriteLine(([ordered]@{ label = $receipt.label; started = $receipt.started; rootTerminalObserved = $receipt.rootTerminalObserved; rootExitCode = $receipt.rootExitCode; stdoutBytes = $receipt.stdoutBytes; stderrBytes = $receipt.stderrBytes; failure = $receipt.failure } | ConvertTo-Json -Compress))'
$new = $new.Replace($oldConsole, $newConsole)
$new = $new.Replace('@($childTerminal | Where-Object { -not $_.terminal }).Count -gt 0', '@($childTerminal | Where-Object { $_.liveOrUnknownAtEndPoint }).Count -gt 0')
if ($new -ceq $old -or -not $new.Contains('laterAbsencePoint')) { throw 'New helper substitutions did not apply' }
$destination = Join-Path $PSScriptRoot 'capture-library-009.ps1'
$bytes = [Text.UTF8Encoding]::new($false).GetBytes($new)
$stream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
try { $stream.Write($bytes,0,$bytes.Length) } finally { $stream.Dispose() }
$errors = $null
$tokens = $null
$null = [Management.Automation.Language.Parser]::ParseFile($destination, [ref]$tokens, [ref]$errors)
if (@($errors).Count -ne 0) { throw ($errors | Out-String) }
$note = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    oldHelperUnchanged = 'capture-library-006.ps1'
    oldStageUnchanged = 'stage-007.ps1'
    actualStage007OuterToolExit = 1
    actualR001RootExit = 0
    actualR002RootExit = 0
    failedReason = 'r002 observer saw two already-unavailable short-lived child PIDs; strict first helper stopped despite complete root and raw streams'
    oldObservedChildExitUnknownNotRequalified = $true
    oldRootsWillNotReplay = $true
    authorAttempt008 = 'Outer tool 4731 parse failure before script creation or any Git/gh launch; nested same-delimiter here-string'
    newHelper = 'capture-library-009.ps1'
    change = 'Use installed Git core executable if present; for newly observed unavailable children retain explicit later PID-absence point, never claim actual exit/identity recovery or universal descendant closure; still fail on live-or-unknown end-point observations'
    sourceBodiesConsumed = 0
    priorGitGhRootsConsumed = 2
    enclosingHelperExitNotSelfAttested = $true
}
$text = ($note | ConvertTo-Json -Depth 10) + "`n"
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'continuation-009.json'), $text, [Text.UTF8Encoding]::new($false))
[Console]::WriteLine($text)
