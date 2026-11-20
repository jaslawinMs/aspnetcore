$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$scope = "$root\work\default"
$observations = [System.Collections.Generic.List[object]]::new()
$files = @{}
$errors = [System.Collections.Generic.List[string]]::new()
for ($attempt = 0; $attempt -lt 24; $attempt++)
{
    $hosts = @(Get-CimInstance Win32_Process -Filter "Name = 'testhost.exe'" |
        Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith($scope, [StringComparison]::OrdinalIgnoreCase) })
    foreach ($hostProcess in $hosts)
    {
        try
        {
            $process = Get-Process -Id $hostProcess.ProcessId -ErrorAction Stop
            $modules = @($process.Modules | ForEach-Object {
                $file = $_.FileName
                if (-not $files.ContainsKey($file))
                {
                    $files[$file] = [ordered]@{path=$file;sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash;bytes=(Get-Item -LiteralPath $file).Length}
                }
                $file
            })
            $observations.Add([ordered]@{
                pid = [int]$hostProcess.ProcessId
                parentPid = [int]$hostProcess.ParentProcessId
                createdAt = $hostProcess.CreationDate.ToUniversalTime().ToString('o')
                observedAt = [DateTime]::UtcNow.ToString('o')
                executable = $hostProcess.ExecutablePath
                commandLine = $hostProcess.CommandLine
                modulePaths = $modules
            })
        }
        catch
        {
            $errors.Add($_.Exception.Message)
        }
    }
    Start-Sleep -Milliseconds 200
}
[ordered]@{
    collectorPid = $PID
    boundary = 'Read-only process-module identity snapshots during the owned Default native run; not a profiler or exhaustive managed-assembly/descendant census.'
    observations = @($observations)
    files = @($files.Values)
    transientReadErrors = @($errors)
    completed = $true
} | ConvertTo-Json -Depth 10 | Set-Content "$root\evidence\default69-native-module-observations.json"
[pscustomobject]@{snapshots=$observations.Count;distinctObservedModuleFiles=$files.Count;transientReadErrors=$errors.Count} | ConvertTo-Json
