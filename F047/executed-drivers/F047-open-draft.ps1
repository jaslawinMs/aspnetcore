param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$ReceiptPath
)

$ErrorActionPreference = 'Stop'
if ($Url -notmatch '^https://github\.com/jaslawinMs/aspnetcore/pull/\d+$')
{
    throw 'Only the actual authorized fork draft may be opened.'
}
if (Test-Path -LiteralPath $ReceiptPath)
{
    throw 'A browser receipt already exists; do not reopen the draft.'
}
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path -LiteralPath $edge))
{
    throw 'The previously used Edge executable is unavailable.'
}
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class F047Windows
{
    public sealed class Window
    {
        public long Handle { get; set; }
        public int ProcessId { get; set; }
    }
    private delegate bool Callback(IntPtr window, IntPtr parameter);
    [DllImport("user32.dll")] private static extern bool EnumWindows(Callback callback, IntPtr parameter);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    public static Window[] EdgeWindows()
    {
        var result = new List<Window>();
        var session = Process.GetCurrentProcess().SessionId;
        EnumWindows((window, parameter) =>
        {
            if (!IsWindowVisible(window))
            {
                return true;
            }
            GetWindowThreadProcessId(window, out var id);
            try
            {
                using var process = Process.GetProcessById((int)id);
                if (process.SessionId == session && process.ProcessName == "msedge")
                {
                    result.Add(new Window { Handle = window.ToInt64(), ProcessId = (int)id });
                }
            }
            catch (ArgumentException)
            {
                return true;
            }
            return true;
        }, IntPtr.Zero);
        return result.ToArray();
    }
}
'@
$before = @([F047Windows]::EdgeWindows())
$started = [DateTime]::UtcNow.ToString('o')
Start-Process -FilePath $edge -ArgumentList @('--new-window', $Url)
$deadline = [DateTime]::UtcNow.AddSeconds(35)
$newWindows = @()
do
{
    Start-Sleep -Milliseconds 500
    $after = @([F047Windows]::EdgeWindows())
    $newWindows = @($after | Where-Object { $_.Handle -notin $before.Handle })
}
while ($newWindows.Count -eq 0 -and [DateTime]::UtcNow -lt $deadline)
if ($newWindows.Count -eq 0)
{
    throw 'Edge launch was requested, but no distinct visible window was observed.'
}
$receipt = [ordered]@{
    actualPrUrl = $Url
    actualBrowserLaunchRequested = $true
    actualExecutable = $edge
    actualArguments = @('--new-window', $Url)
    actualRequestedImmediatelyAfterCreateBeforePrVerification = $true
    actualDistinctVisibleEdgeWindowObserved = $true
    actualPriorVisibleEdgeWindows = $before
    actualNewVisibleEdgeWindows = $newWindows
    actualWindowTitlesNotReadOrRecorded = $true
    actualPageContentsOrUrlNotInspectedThroughBrowserAutomation = $true
    actualExistingReportWindowNotReopenedOrClosed = $true
    actualStarted = $started
    actualCompleted = [DateTime]::UtcNow.ToString('o')
}
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReceiptPath -Encoding utf8NoBOM
$receipt | ConvertTo-Json -Depth 8
