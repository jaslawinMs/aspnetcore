param(
    [Parameter(Mandatory)]
    [ValidateSet('original', 'candidate')]
    [string]$Variant
)

$ErrorActionPreference = 'Stop'
$root = 'C:\src\aspnetcore'
$directory = Join-Path $PSScriptRoot "autoperf-runs\F039\sample-$Variant"
if (Test-Path -LiteralPath $directory)
{
    throw "Do not overwrite a sample run: $directory"
}
New-Item -ItemType Directory -Path $directory | Out-Null
Set-Location $root
. .\activate.ps1
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$arguments = @('run', '--project', 'src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj',
    '--configuration', 'Release', '--no-build', '--no-restore', '--no-launch-profile',
    '--', '--urls', 'http://127.0.0.1:0')
[ordered]@{
    candidate = 'F039'
    variant = $Variant
    wrapperProcessId = $PID
    startedUtc = [DateTime]::UtcNow.ToString('O')
    executable = (Get-Command dotnet).Source
    arguments = $arguments
    boundedOwnedHelper = $true
    detached = $false
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $directory 'launch.json') -Encoding utf8NoBOM
& dotnet @arguments 2>&1 | ForEach-Object {
    Add-Content -LiteralPath (Join-Path $directory 'stdout.log') -Value $_ -Encoding utf8NoBOM
    Write-Output $_
}
$nativeExit = $LASTEXITCODE
Write-Output "F039:$Variant sample server exited:$nativeExit"
exit $nativeExit
