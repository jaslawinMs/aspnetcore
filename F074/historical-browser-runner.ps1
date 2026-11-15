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
$run = Join-Path $PSScriptRoot 'autoperf-runs\F074'
$ownerSource = 'src\Components\Server\src\Circuits\ComponentParameterDeserializer.cs'
if ((Get-FileHash $ownerSource).Hash -ne (Get-FileHash (Join-Path $run $SourceSnapshot)).Hash)
{
    throw 'Current source does not match the intended browser owner.'
}
$ownerHash = (Get-FileHash 'artifacts\bin\Microsoft.AspNetCore.Components.Server\Debug\net12.0\Microsoft.AspNetCore.Components.Server.dll').Hash
$sampleOwnerHash = (Get-FileHash 'artifacts\bin\BlazorWebAppPerPage\Debug\net12.0\Microsoft.AspNetCore.Components.Server.dll').Hash
if ($ownerHash -ne $sampleOwnerHash)
{
    throw 'The sample does not execute the freshly built Server owner.'
}
$output = Join-Path $run "browser-$Label.json"
if (Test-Path $output)
{
    throw 'Do not overwrite a completed browser receipt.'
}
Copy-Item (Join-Path $PSScriptRoot 'F074-browser-probe.mjs') (Join-Path $run "browser-probe-$Label.mjs")
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$hostProcess = Start-Process -FilePath 'C:\src\aspnetcore\.dotnet\dotnet.exe' `
    -ArgumentList @('C:\src\aspnetcore\artifacts\bin\BlazorWebAppPerPage\Debug\net12.0\BlazorWebAppPerPage.dll', '--urls', 'http://127.0.0.1:0') `
    -WorkingDirectory 'C:\src\aspnetcore\src\Components\Samples\BlazorWebAppPerPage' `
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
            throw 'Owned sample startup timed out.'
        }
        if (-not $url)
        {
            Start-Sleep -Milliseconds 100
        }
    }
    $document = Invoke-WebRequest "$url/autoperf-fragment"
    if ($document.StatusCode -ne 200 -or -not $document.Content.Contains('f074-plain-content'))
    {
        throw 'Canonical original scenario was not served successfully.'
    }
    Write-Output "Owned $Label sample ready:$url,PID:$($hostProcess.Id),HTTP:$($document.StatusCode)"
    node (Join-Path $PSScriptRoot 'F074-browser-probe.mjs') "$url/" $output (Join-Path $run "browser-$Label-profile")
    $exit = $LASTEXITCODE
    @{
        label = $Label
        host_pid = $hostProcess.Id
        host_url = $url
        document_status = $document.StatusCode
        driver = 'existing Edge CDP; current Playwright module lookup failed'
        driver_exit = $exit
        source_snapshot = $SourceSnapshot
        source_sha256 = (Get-FileHash $ownerSource).Hash
        owner_sha256 = $ownerHash
        sample_owner_sha256 = $sampleOwnerHash
    } | ConvertTo-Json | Set-Content (Join-Path $run "browser-$Label-command.json") -Encoding utf8
    if ($exit)
    {
        throw 'Real-browser fragment assertions failed.'
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
