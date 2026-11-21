$ErrorActionPreference = 'Stop'
$repository = 'C:\src\aspnetcore'
$original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$default = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
$destination = Join-Path $PSScriptRoot 'source'
if (Test-Path -LiteralPath $destination)
{
    throw 'Preserve the existing source evidence; do not overwrite it.'
}
New-Item -ItemType Directory -Path $destination | Out-Null

$paths = @(
    'src/SignalR/samples/SocialWeather/PersistentConnectionLifeTimeManager.cs'
    'src/SignalR/samples/SocialWeather/Startup.cs'
    'src/SignalR/samples/SocialWeather/SocialWeatherConnectionHandler.cs'
    'src/SignalR/samples/SocialWeather/ConnectionList.cs'
    'src/SignalR/samples/SocialWeather/FormatterResolver.cs'
    'src/SignalR/samples/SocialWeather/IStreamFormatter.cs'
    'src/SignalR/samples/SocialWeather/WeatherReport.cs'
    'src/SignalR/samples/SocialWeather/Json/JSonStreamFormatter.cs'
    'src/SignalR/samples/SocialWeather/Pipe/PipeWeatherStreamFormatter.cs'
    'src/SignalR/samples/SocialWeather/Protobuf/ProtobufWeatherStreamFormatter.cs'
    'src/SignalR/samples/SocialWeather/wwwroot/index.html'
    'src/SignalR/samples/SocialWeather/SocialWeather.csproj'
    'src/Servers/Connections.Abstractions/src/ConnectionBuilderExtensions.cs'
    'src/SignalR/common/Http.Connections/src/ConnectionEndpointRouteBuilderExtensions.cs'
    'src/SignalR/common/Http.Connections/src/Internal/HttpConnectionManager.cs'
    'src/SignalR/common/Http.Connections/src/Internal/HttpConnectionDispatcher.cs'
    'src/SignalR/common/Shared/DuplexPipe.cs'
    'src/SignalR/common/Http.Connections/src/Internal/HttpConnectionContext.cs'
    'src/SignalR/common/Http.Connections/src/Internal/Transports/WebSocketsServerTransport.cs'
    'src/SignalR/common/Http.Connections/src/HttpConnectionDispatcherOptions.cs'
    'src/SignalR/common/Http.Connections/test/Microsoft.AspNetCore.Http.Connections.Tests.csproj'
    'src/SignalR/clients/csharp/Client/test/FunctionalTests/Microsoft.AspNetCore.SignalR.Client.FunctionalTests.csproj'
    'src/SignalR/server/SignalR/test/Microsoft.AspNetCore.SignalR.Tests/Microsoft.AspNetCore.SignalR.Tests.csproj'
    'src/SignalR/README.md'
    'src/SignalR/samples/README.md'
    'src/SignalR/build.cmd'
    '.editorconfig'
    '.github/instructions/cross-cutting-guidance.instructions.md'
    'docs/CrossCuttingGuidance.md'
    'docs/BuildFromSource.md'
    'global.json'
    'activate.ps1'
)

$receipts = foreach ($path in $paths)
{
    $file = Join-Path $destination ($path.Replace('/', '__'))
    $arguments = @('--no-pager', '-C', $repository, 'show', ($default + ':' + $path))
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = 'git'
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($argument in $arguments)
    {
        $start.ArgumentList.Add($argument)
    }

    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $start
    [void]$process.Start()
    $stderr = $process.StandardError.ReadToEndAsync()
    $stream = [IO.File]::Open($file, [IO.FileMode]::CreateNew)
    try
    {
        $process.StandardOutput.BaseStream.CopyTo($stream)
    }
    finally
    {
        $stream.Dispose()
    }
    $process.WaitForExit()
    $errorText = $stderr.GetAwaiter().GetResult()
    $exitCode = $process.ExitCode
    $process.Dispose()
    if ($exitCode -ne 0)
    {
        throw "Source retrieval failed for $path with $exitCode : $errorText"
    }

    $originalBlob = & git --no-pager -C $repository rev-parse ($original + ':' + $path)
    if ($LASTEXITCODE -ne 0)
    {
        throw "Original source identity unavailable: $path"
    }
    $defaultBlob = & git --no-pager -C $repository rev-parse ($default + ':' + $path)
    if ($LASTEXITCODE -ne 0)
    {
        throw "Default source identity unavailable: $path"
    }
    [PSCustomObject]@{
        path = $path
        originalPin = $original
        originalBlob = $originalBlob
        defaultPin = $default
        defaultBlob = $defaultBlob
        identicalBetweenPins = $originalBlob -ceq $defaultBlob
        rawSnapshot = 'source\' + [IO.Path]::GetFileName($file)
        rawSha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
        executable = 'git'
        arguments = $arguments
        exitCode = $exitCode
        stdoutCopiedAsBytesAndClosed = $true
        stderrDrainedAndClosed = $true
        stderr = $errorText
        managedBuildOrTestStarted = $false
    }
}
$receipts | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'raw-source-index.json')
[PSCustomObject]@{
    capturedFiles = @($receipts).Count
    originalPin = $original
    defaultPin = $default
    managedNativeStarts = 0
    comparisons = 0
} | ConvertTo-Json
