$ErrorActionPreference = 'Stop'
$caseRoot = $PSScriptRoot
$root = 'C:\src\aspnetcore'
$validation = Join-Path $caseRoot 'alias-validation'
if (Test-Path -LiteralPath $validation) { throw 'Never overwrite a source-analysis execution.' }
New-Item -ItemType Directory -Path $validation | Out-Null
$global = Join-Path $root 'global.json'
$before = (Get-FileHash -LiteralPath $global -Algorithm SHA256).Hash
Set-Location -LiteralPath $root
. .\activate.ps1
$env:MSBUILDDISABLENODEREUSE = '1'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$dotnet = Join-Path $root '.dotnet\dotnet.exe'
$project = Join-Path $caseRoot 'alias-tool\AutoPerf.OpenApiSourceAliases.csproj'
$commands = @()
function Invoke-RecordedDotnet
{
    param([string] $Label, [string[]] $Arguments)
    $stdout = Join-Path $validation "$Label.stdout.txt"
    $stderr = Join-Path $validation "$Label.stderr.txt"
    $started = [DateTime]::UtcNow.ToString('O')
    & $dotnet @Arguments 1> $stdout 2> $stderr
    $exitCode = $LASTEXITCODE
    $script:commands += [pscustomobject]@{
        label = $Label
        activation = '. .\activate.ps1'
        executable = $dotnet
        arguments = $Arguments
        startedAt = $started
        completedAt = [DateTime]::UtcNow.ToString('O')
        exitCode = $exitCode
        stdoutSha256 = (Get-FileHash -LiteralPath $stdout -Algorithm SHA256).Hash
        stderrSha256 = (Get-FileHash -LiteralPath $stderr -Algorithm SHA256).Hash
    }
    $script:commands | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $validation 'commands.json') -Encoding utf8
    if ($exitCode -ne 0)
    {
        Get-Content -LiteralPath $stdout
        Get-Content -LiteralPath $stderr
        throw "Source analysis $Label failed with exit $exitCode"
    }
}
Invoke-RecordedDotnet 'build-001' @('build', $project, '--configuration', 'Release', '-p:UseSharedCompilation=false', '/m:2', '/nr:false')
Invoke-RecordedDotnet 'execute-001' @((Join-Path $caseRoot 'alias-tool\bin\Release\net12.0\AutoPerf.OpenApiSourceAliases.dll'),
    $caseRoot, (Join-Path $caseRoot 'alias-observations.json'))
$after = (Get-FileHash -LiteralPath $global -Algorithm SHA256).Hash
if ($before -ne $after) { throw 'Protected SDK configuration changed.' }
[pscustomobject]@{
    actualActivatedRepository = $root
    actualProtectedGlobalJsonBefore = $before
    actualProtectedGlobalJsonAfter = $after
    actualCommands = $commands
    actualTiming = $false
    actualSourceOrMachineSettingsChanged = $false
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $validation 'receipt.json') -Encoding utf8
Get-Content -LiteralPath (Join-Path $validation 'execute-001.stdout.txt')
