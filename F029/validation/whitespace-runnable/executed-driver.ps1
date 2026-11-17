param(
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label = 'whitespace',
    [switch]$Folder
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F029'
$execution = Join-Path $run "validation\$Label"
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual whitespace validation.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
Copy-Item -LiteralPath (Join-Path $root '.editorconfig') -Destination (Join-Path $run '.editorconfig')
$files = @(Get-ChildItem -LiteralPath (Join-Path $run 'harness') -File -Filter '*.cs')
$before = @($files | ForEach-Object { [ordered]@{ path = $_.FullName; sha256 = (Get-FileHash -LiteralPath $_.FullName).Hash } })
Push-Location $root
try
{
    . .\activate.ps1
    $target = if ($Folder) { Join-Path $run 'harness' } else { Join-Path $run 'harness\AutoPerf.Benchmarks.csproj' }
    $arguments = @('format', 'whitespace', $target, '--verify-no-changes', '--verbosity', 'minimal')
    if ($Folder)
    {
        $arguments += '--folder'
    }
    else
    {
        $arguments += '--no-restore'
    }
    $arguments += @('--include') + @($files.FullName)
    $started = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @arguments 1> (Join-Path $execution 'format.stdout') 2> (Join-Path $execution 'format.stderr')
    $code = $LASTEXITCODE
    [ordered]@{
        executable = (Get-Command dotnet).Source; arguments = $arguments; workingDirectory = $root
        actualExitCode = $code; started = $started; completed = [DateTimeOffset]::UtcNow.ToString('o')
        actualCopiedRepoEditorConfigSha256 = (Get-FileHash -LiteralPath (Join-Path $run '.editorconfig')).Hash
        actualRootEditorConfigSha256 = (Get-FileHash -LiteralPath (Join-Path $root '.editorconfig')).Hash
        actualIncludedSources = $before; actualFolderWorkspace = [bool]$Folder; verifyOnly = $true; timing = $false
    } | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $execution 'invocation.json') -Encoding utf8NoBOM
    Get-Content -LiteralPath (Join-Path $execution 'format.stdout') -Tail 10
    Get-Content -LiteralPath (Join-Path $execution 'format.stderr') -Tail 10
    foreach ($entry in $before)
    {
        if ((Get-FileHash -LiteralPath $entry.path).Hash -cne $entry.sha256)
        {
            throw 'Frozen source changed during a verify-only whitespace check.'
        }
    }
    if ($code -ne 0)
    {
        throw 'The exact original harness did not pass the repository-config whitespace check.'
    }
}
finally
{
    Pop-Location
}
