param([Parameter(Mandatory)][ValidateRange(2,3)][int]$Round)
$ErrorActionPreference = 'Stop'
. 'C:\src\aspnetcore\activate.ps1'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F062'
$path = Join-Path $run 'execution.json'
$execution = @(Get-Content $path -Raw | ConvertFrom-Json)
$last = ($execution | Measure-Object round -Maximum).Maximum
if ($Round -ne $last + 1 -and $Round -ne $last)
{
    throw 'Continue the existing three-comparison budget without restarting or skipping a comparison.'
}
if (@($execution | Where-Object { $_.round -lt $Round -and $_.exit_code -ne 0 }).Count)
{
    throw 'Earlier failed measurement cannot be treated as complete.'
}
$sdk = (dotnet --version).Trim()
if ($LASTEXITCODE)
{
    throw 'Repository SDK activation failed.'
}
$order = if ($Round -eq 2) { @('after','before') } else { @('before','after') }
foreach ($role in $order)
{
    $name = "$role-2"
    $manifest = Get-Content (Join-Path $run "$name-manifest.json") -Raw | ConvertFrom-Json
    $root = Join-Path $run "binaries\$name"
    foreach ($file in $manifest.files.PSObject.Properties)
    {
        if ((Get-FileHash (Join-Path $root $file.Name.Replace('/','\'))).Hash -cne $file.Value)
        {
            throw "Corrected frozen dependency changed:$name/$($file.Name)."
        }
    }
    $label = "round-$Round-$role"
    $output = Join-Path $run $label
    $existing = @($execution | Where-Object { $_.round -eq $Round -and $_.variant -eq $role })
    if ($existing.Count)
    {
        if ($existing.Count -ne 1 -or $existing[0].exit_code -ne 0 -or $existing[0].snapshot -cne $name)
        {
            throw 'Only an already completed identical frozen role can be reused.'
        }
    }
    else
    {
        if (Test-Path $output)
        {
            throw "Refuse to overwrite measured output$label."
        }
        New-Item -ItemType Directory -Path $output | Out-Null
        $arguments = @((Join-Path $root 'AutoPerf.Benchmarks.dll'),'--filter','*Proxy*Benchmark*','--inProcess',
            '--exporters','json','csv','--artifacts',$output,'--job','Short','--warmupCount','3',
            '--iterationCount','8','--iterationTime','100','--outliers','DontRemove')
        $started = [DateTimeOffset]::UtcNow
        Write-Output "Starting$label with corrected identical harness;budget comparison$Round/3."
        dotnet @arguments *> (Join-Path $output 'console.log')
        $code = $LASTEXITCODE
        $execution += [pscustomobject]@{round=$Round;variant=$role;snapshot=$name;label=$label;
            started_at=$started.ToString('o');completed_at=[DateTimeOffset]::UtcNow.ToString('o');sdk=$sdk;
            arguments=$arguments;exit_code=$code;harness_definition='corrected cached URI task and host-only stopping profiles'}
        $execution | ConvertTo-Json -Depth 8 | Set-Content $path -Encoding utf8
        if ($code)
        {
            throw "Measured$label failed with exit$code;preserve its raw evidence."
        }
    }
    $reports = @(Get-ChildItem (Join-Path $output 'results') -File -Filter '*-full*.json')
    $cases = @()
    foreach ($report in $reports)
    {
        $cases += @(Get-Content $report.FullName -Raw | ConvertFrom-Json | Select-Object -ExpandProperty Benchmarks)
    }
    if ($reports.Count -ne 2 -or $cases.Count -ne 22 -or @($cases.FullName | Sort-Object -Unique).Count -ne 22 -or
        @($cases | Where-Object { $_.Statistics.N -ne 8 -or $_.Statistics.Mean -le 0 }).Count)
    {
        throw 'Each corrected role must contain exactly6 request+16 stopping profiles and eight actual samples each.'
    }
    Write-Output "Completed$label;all22 corrected cases/eight samples retained."
}
