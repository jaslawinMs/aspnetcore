$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F029'
$execution = Join-Path $run 'validation\format-runnable'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite a recorded post-measurement formatting operation.'
}
$budget = Get-Content -Raw -LiteralPath (Join-Path $run 'measurement-budget.json') | ConvertFrom-Json
if (!$budget.original_diagnostic_budget_closed -or $budget.actual_diagnostic_profiles_completed -ne 1)
{
    throw 'Keep historical timing permanently closed before formatting only the runnable working copy.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
$files = @(Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File -Filter '*.cs')
$before = @{}
foreach ($file in $files)
{
    $snapshot = Join-Path $run "preparation-005\prepared\sources\harness\$($file.Name)"
    if ((Get-FileHash -LiteralPath $snapshot).Hash -cne (Get-FileHash -LiteralPath $file.FullName).Hash)
    {
        throw 'Require the byte-exact historical harness before this recorded whitespace-only publication step.'
    }
    $before[$file.Name] = [ordered]@{
        path = $file.FullName; frozenHistoricalSource = $snapshot
        sha256 = (Get-FileHash -LiteralPath $snapshot).Hash; text = [IO.File]::ReadAllText($snapshot)
    }
}
Push-Location $root
try
{
    . .\activate.ps1
    $arguments = @('format', 'whitespace', (Join-Path $run 'harness'), '--folder',
        '--verbosity', 'minimal', '--include') + @($files.FullName)
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'format.stdout') 2> (Join-Path $execution 'format.stderr')
    $code = $LASTEXITCODE
    $observed = @(foreach ($file in $files)
    {
        $previous = $before[$file.Name]
        $current = [IO.File]::ReadAllText($file.FullName)
        if ([regex]::Replace($previous.text, '\s', '') -cne [regex]::Replace($current, '\s', '') -or
            (Get-FileHash -LiteralPath $previous.frozenHistoricalSource).Hash -cne $previous.sha256)
        {
            throw 'Formatting changed non-whitespace characters or the frozen historical source.'
        }
        [ordered]@{
            file = $file.Name; actualHistoricalSourceSha256 = $previous.sha256
            actualRunnableSourceSha256 = (Get-FileHash -LiteralPath $file.FullName).Hash
            actualNonWhitespaceCharacterStreamUnchanged = $true; actualHistoricalCopyUnchanged = $true
        }
    })
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
        actualExitCode = $code; started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o')
        actualSources = $observed; historicalMeasuredConsumerAndSourceModified = $false
        formattedRunnableCopyOnly = $true; additionalTimingPermitted = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    if ($code -ne 0)
    {
        throw 'The post-measurement runnable-copy formatting failed.'
    }
    Write-Output 'Runnable harness whitespace formatted;all frozen measured source/image copies unchanged;no new timing.'
}
finally
{
    Pop-Location
}
