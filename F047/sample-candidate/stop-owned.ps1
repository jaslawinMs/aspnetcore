$ErrorActionPreference = 'Stop'
$processes = @(Get-CimInstance Win32_Process)
$queue = [Collections.Generic.Queue[int]]::new(); $queue.Enqueue(2660)
$owned = [Collections.Generic.List[object]]::new(); $seen = [Collections.Generic.HashSet[int]]::new()
while ($queue.Count -gt 0) { $idValue = $queue.Dequeue(); if (-not $seen.Add($idValue)) { continue }; $entry = @($processes | Where-Object { $_.ProcessId -eq $idValue }); if ($entry.Count -eq 1) { $owned.Add(($entry[0] | Select-Object ProcessId,ParentProcessId,Name,CreationDate)); foreach ($next in @($processes | Where-Object { $_.ParentProcessId -eq $idValue })) { $queue.Enqueue([int]$next.ProcessId) } } }
$captured = @($owned.ToArray())
foreach ($entry in @($captured | Sort-Object ProcessId -Descending)) { $current = @(Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.ProcessId)"); if ($current.Count -eq 1 -and $current[0].CreationDate -eq $entry.CreationDate) { Stop-Process -Id ([int]$entry.ProcessId) -Force -ErrorAction Stop } }
$deadline = [DateTime]::UtcNow.AddSeconds(10)
do { $remaining = @($captured | Where-Object { $entry = $_; @(Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.ProcessId)" | Where-Object { $_.CreationDate -eq $entry.CreationDate }).Count -ne 0 }); if ($remaining.Count -gt 0) { Start-Sleep -Milliseconds 100 } } while ($remaining.Count -gt 0 -and [DateTime]::UtcNow -lt $deadline)
if ($remaining.Count -ne 0) { throw "Owned sample processes remain." }
[ordered]@{ actualCapturedOwnedProcesses=$captured; actualAllCapturedOwnedHelpersGone=$true; actualNoNameBasedTermination=$true } | ConvertTo-Json -Depth 7
