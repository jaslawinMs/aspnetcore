param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+$')]
    [string]$Label,
    [Parameter(Mandatory)]
    [ValidatePattern('^source-[a-z0-9-]+\.cs$')]
    [string]$SourceSnapshot
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run = Join-Path $PSScriptRoot 'autoperf-runs\F070'
$ownerSource = 'src\Components\Web\src\Routing\NavLink.cs'
if ((Get-FileHash $ownerSource).Hash -ne (Get-FileHash (Join-Path $run $SourceSnapshot)).Hash)
{
    throw 'Current owner source does not match the intended browser variant.'
}
$output = Join-Path $run "browser-$Label.json"
if (Test-Path $output)
{
    throw 'Do not overwrite a completed browser receipt.'
}
Copy-Item (Join-Path $PSScriptRoot 'F070-browser-probe.mjs') (Join-Path $run "browser-probe-$Label.mjs")
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$hostProcess = Start-Process -FilePath 'C:\src\aspnetcore\.dotnet\dotnet.exe' `
    -ArgumentList @('C:\src\aspnetcore\artifacts\bin\BlazorWebAppGlobal\Debug\net12.0\BlazorWebAppGlobal.dll', '--urls', 'http://127.0.0.1:0') `
    -WorkingDirectory 'C:\src\aspnetcore\src\Components\Samples\BlazorWebAppGlobal' `
    -RedirectStandardOutput (Join-Path $run "sample-$Label-host.log") `
    -RedirectStandardError (Join-Path $run "sample-$Label-host-error.log") -PassThru
try
{
    $deadline = [DateTime]::UtcNow.AddSeconds(40)
    $url = $null
    while (-not $url)
    {
        if ($hostProcess.HasExited)
        {
            Get-Content (Join-Path $run "sample-$Label-host-error.log") -Tail 12
            throw 'Owned sample exited before readiness.'
        }
        $text = Get-Content (Join-Path $run "sample-$Label-host.log") -Raw
        if ($text -match 'Now listening on:\s*(http://127\.0\.0\.1:[0-9]+)')
        {
            $url = $matches[1]
        }
        if ([DateTime]::UtcNow -gt $deadline)
        {
            throw 'Sample startup timed out.'
        }
        if (-not $url)
        {
            Start-Sleep -Milliseconds 100
        }
    }
    $page = Invoke-WebRequest "$url/autoperf-navlink/alpha"
    if ($page.StatusCode -ne 200 -or -not $page.Content.Contains('f070-increment'))
    {
        throw 'Canonical scenario was not served successfully.'
    }
    Write-Output "Owned $Label sample ready:$url,PID:$($hostProcess.Id),HTTP:$($page.StatusCode)"
    node (Join-Path $PSScriptRoot 'F070-browser-probe.mjs') "$url/" $output (Join-Path $run "browser-$Label-profile")
    $exit = $LASTEXITCODE
    @{
        label = $Label
        host_pid = $hostProcess.Id
        host_url = $url
        document_status = $page.StatusCode
        driver = 'existing Edge CDP;Playwright missing and package feeds unavailable'
        driver_exit = $exit
        source_snapshot = $SourceSnapshot
        owner_sha256 = (Get-FileHash 'artifacts\bin\Microsoft.AspNetCore.Components.Web\Debug\net12.0\Microsoft.AspNetCore.Components.Web.dll').Hash
        source_sha256 = (Get-FileHash $ownerSource).Hash
    } | ConvertTo-Json | Set-Content (Join-Path $run "browser-$Label-command.json") -Encoding utf8
    if ($exit)
    {
        throw 'Real-browser assertions failed.'
    }
}
finally
{
    if (-not $hostProcess.HasExited)
    {
        Stop-Process -Id $hostProcess.Id
    }
    $hostProcess.WaitForExit()
    Write-Output "Owned $Label sample PID:$($hostProcess.Id) stopped."
}
