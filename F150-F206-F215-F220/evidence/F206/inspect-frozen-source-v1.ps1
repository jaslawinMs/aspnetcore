$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot
[Environment]::CurrentDirectory = $PSScriptRoot
$utf8 = [Text.UTF8Encoding]::new($false)
if (Test-Path -LiteralPath '.\inspection-frozen-v1.json') { throw 'Single-use frozen inspection cannot be replayed.' }
$policy = Get-Content -LiteralPath '..\policy.json' -Raw | ConvertFrom-Json
if ($policy.independentFindingPreparationWorkers.F206 -ne '2acd453e-18ab-4dd5-b36b-753c5e5a0a21' -or
    @($policy.independentFindingPreparationWorkers.PSObject.Properties).Count -gt 4 -or
    $policy.actualWorkerBuildHoldActive -ne $false -or
    $policy.buildAndTestWorkQuiesced -ne $false -or
    (Test-Path -LiteralPath '..\benchmark-exclusive.lease.json'))
{
    throw 'Frozen inspection denied by current guards.'
}
$initial = Get-Content -LiteralPath '.\collection-initial-v1.json' -Raw | ConvertFrom-Json
$closure = Get-Content -LiteralPath '.\collection-closure-v1.json' -Raw | ConvertFrom-Json
if ($initial.state -ne 'completed' -or $closure.state -ne 'completed') { throw 'Source collection did not complete.' }
$result = [ordered]@{
    recordedUtc = [DateTime]::UtcNow.ToString('o')
    inspectionPid = $PID
    inspectionIdentity = Get-CimInstance Win32_Process -Filter "ProcessId=$PID" |
        Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine
    scriptSha256 = (Get-FileHash -LiteralPath '.\inspect-frozen-source-v1.ps1' -Algorithm SHA256).Hash
    originalCommit = $initial.originalCommit
    defaultCommit = $initial.defaultCommit
    policySha256 = (Get-FileHash -LiteralPath '..\policy.json' -Algorithm SHA256).Hash
    rolePairs = @()
    anchors = @()
    packageDocumentationProbes = @()
    packageDocumentationCopies = @()
    historySummaries = @()
    rawNativeCommandCount = @($initial.commands).Count + @($closure.commands).Count
    rawNativeAllExitZero = @(@($initial.commands) + @($closure.commands) | Where-Object { $_.exitCode -ne 0 }).Count -eq 0
    rawNativeAllWaitsAndStreamsCompleted = @(@($initial.commands) + @($closure.commands) |
        Where-Object { -not $_.waitForExitReturned -or -not $_.stdoutDrainCompleted -or -not $_.stderrDrainCompleted }).Count -eq 0
}
$originalRoot = [IO.Path]::GetFullPath('.\source\Original')
foreach ($file in Get-ChildItem -LiteralPath '.\source\Original' -File -Recurse | Sort-Object FullName)
{
    $logical = [IO.Path]::GetRelativePath($originalRoot, $file.FullName)
    $defaultFile = ".\source\Default\$logical"
    if (-not (Test-Path -LiteralPath $defaultFile)) { throw "Default whole source missing: $logical" }
    $a = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    $b = (Get-FileHash -LiteralPath $defaultFile -Algorithm SHA256).Hash
    $result.rolePairs += @{
        path = $logical
        originalBytes = $file.Length
        defaultBytes = (Get-Item -LiteralPath $defaultFile).Length
        originalSha256 = $a
        defaultSha256 = $b
        exactByteIdentical = $a -eq $b
    }
}
$selectors = [ordered]@{
    'src\Components\test\E2ETest\Tests\WebAssemblyICUShardingTest.cs' = '\[Fact\]|\[Theory\]|\[InlineData|LoadingApp_|Navigate\(|Browser\.(Exists|Equal)|var expected|var logs|Assert.True|string.Join'
    'src\Shared\E2ETesting\WebDriverExtensions.cs' = 'GetBrowserLogs|GetLog|\.Where|\.ToList|Array.Empty|logs.Count|ShouldIgnore|entry.Message'
    'src\Shared\E2ETesting\WaitAssert.cs' = 'Equal<T>|True\(this|WaitAssertCore|WebDriverWait|GetBrowserLogs|WebDriverTimeoutException'
    'src\Shared\E2ETesting\BrowserFixture.cs' = 'IAsyncLifetime|_browsers|GetOrCreateBrowser|GetOrAdd|IsHostAutomationSupported|SetLoggingPreference|CreateBrowser|maxAttempts|new ChromeDriver|attempt\+\+|while \(attempt'
    'src\Shared\E2ETesting\BrowserTestBase.cs' = 'IClassFixture|InitializeAsync|InitializeBrowser|GetOrCreateBrowser|_asyncBrowser|_logs.Value|Browser ='
    'src\Shared\E2ETesting\CaptureSeleniumLogsAttribute.cs' = 'Before\(|After\(|AvailableLogTypes|GetLog'
    'src\Components\test\E2ETest\Infrastructure\ServerTestBase.cs' = 'IClassFixture|ServerPathBase|Navigate\(|RootUri|InitializeAsyncCore|console.clear'
    'src\Components\test\E2ETest\Infrastructure\ServerFixtures\ToggleExecutionModeServerFixture.cs' = 'StartAndGetRootUri|BlazorWasmTestAppFixture|PathBase|RootUri|Host =|_serverToDispose'
    'src\Components\test\E2ETest\Infrastructure\ServerFixtures\BlazorWasmTestAppFixture.cs' = 'TestTrimmedApps|CreateWebHost|ContentRoot|typeof\(TProgram\)|StaticWebAssets|staticwebassets|UseBlazor|BlazorGateway|UseStaticFiles'
    'src\Components\test\testassets\GlobalizationWasmApp\Program.cs' = 'CreateDefault|Build\(|ConfigureCulture|RunAsync|dotNetCulture|DefaultThreadCurrent'
    'src\Components\test\testassets\GlobalizationWasmApp\wwwroot\index.html' = 'blazor-error-ui|autostart|URLSearchParams|culture|Blazor.start'
    'src\Components\test\testassets\GlobalizationWasmApp\GlobalizationWasmApp.csproj' = 'Sdk=|TargetFramework|BlazorWebAssemblyLoadAll|ProjectReference|WasmApplication'
    'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyCultureProvider.cs' = 'Initialize\(|InitialCulture|GetApplicationCulture|ThrowIfCultureChangeIsUnsupported|__BLAZOR_SHARDED_ICU|InvalidOperationException|Blazor detected|BlazorWebAssemblyLoadAll'
    'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyHost.cs' = 'RunAsync|ThrowIfCultureChangeIsUnsupported|LoadCurrentCultureResources'
    'src\Components\WebAssembly\WebAssembly\src\Hosting\WebAssemblyHostBuilder.cs' = 'CreateDefault|WebAssemblyCultureProvider.Initialize'
    'src\Components\Web.JS\src\Boot.WebAssembly.ts' = 'boot\(|started|setWebAssemblyOptions|startWebAssembly|Blazor.start|shouldAutoStart'
    'src\Components\Web.JS\src\Boot.WebAssembly.Common.ts' = 'startWebAssembly|startPromise|platform\.callEntryPoint|loadWebAssemblyPlatformIfNotStarted|monoPlatform.load'
    'src\Components\Web.JS\src\Platform\Mono\MonoPlatform.ts' = 'callEntryPoint|runtime.runMain|console.error|showErrorNotification|withApplicationCulture|GlobalizationMode.Sharded|__BLAZOR_SHARDED_ICU|getApplicationCulture|printErr'
    'src\Components\Web.JS\src\BootErrors.ts' = 'showErrorNotification|blazor-error-ui|style.display'
    'src\Components\test\E2ETest\Microsoft.AspNetCore.Components.E2ETests.csproj' = '_BuildAndTest|SkipTests|SeleniumE2ETestsSupported|TestTrimmedApps|GlobalizationWasmApp|xunit.runner'
    'src\Shared\E2ETesting\E2ETesting.props' = 'SeleniumE2ETestsSupported|EnforceE2ETestPrerequisites|Selenium.WebDriver|Selenium.Support'
    'eng\Versions.props' = 'SeleniumSupportVersion|SeleniumWebDriverVersion|XunitVersion|XunitAssertVersion'
    'Directory.Packages.props' = 'xunit.assert|Selenium.WebDriver|Selenium.Support'
}
foreach ($role in @('Original', 'Default'))
{
    foreach ($logical in $selectors.Keys)
    {
        $lines = [IO.File]::ReadAllLines(".\source\$role\$logical")
        for ($i = 0; $i -lt $lines.Length; $i++)
        {
            if ($lines[$i] -match $selectors[$logical])
            {
                $result.anchors += @{ role = $role; path = $logical; line = $i + 1; text = $lines[$i] }
            }
        }
    }
}
foreach ($packageRoot in @('C:\src\aspnetcore\.packages\xunit.assert\2.9.2', 'C:\Users\jaslawin\.nuget\packages\xunit.assert\2.9.2'))
{
    $result.packageDocumentationProbes += @{ path = $packageRoot; exists = Test-Path -LiteralPath $packageRoot }
    if (Test-Path -LiteralPath (Join-Path $packageRoot 'lib'))
    {
        $xml = Get-ChildItem -LiteralPath (Join-Path $packageRoot 'lib') -File -Recurse -Filter 'xunit.assert.xml' |
            Sort-Object FullName | Select-Object -First 1
        if ($null -ne $xml)
        {
            New-Item -ItemType Directory -Path '.\source\ExternalContract' -Force | Out-Null
            $destination = '.\source\ExternalContract\xunit.assert-2.9.2.xml'
            [IO.File]::WriteAllBytes($destination, [IO.File]::ReadAllBytes($xml.FullName))
            $result.packageDocumentationCopies += @{
                sourcePath = $xml.FullName
                path = $destination
                sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
                bytes = (Get-Item -LiteralPath $destination).Length
                provenanceBoundary = 'Read-only existing local package XML documentation, not an executed or validated role binary.'
            }
            break
        }
    }
}
foreach ($path in @('.\commands-initial-v1\09-default-target-history.stdout.bin', '.\commands-closure-v1\32-default-culture-history.stdout.bin'))
{
    $items = [IO.File]::ReadAllText($path) | ConvertFrom-Json
    $result.historySummaries += @{
        path = $path
        commits = @($items | ForEach-Object { @{ sha = $_.sha; date = $_.commit.committer.date; message = $_.commit.message } })
    }
}
[IO.File]::WriteAllText('.\inspection-frozen-v1.json', ($result | ConvertTo-Json -Depth 20) + "`n", $utf8)
[Console]::WriteLine("FROZEN_INSPECTION pairs=$($result.rolePairs.Count) identical=$(@($result.rolePairs | Where-Object { $_.exactByteIdentical }).Count) nativeCommands=$($result.rawNativeCommandCount) allNativeExitZero=$($result.rawNativeAllExitZero) allWaitsAndStreams=$($result.rawNativeAllWaitsAndStreamsCompleted) pid=$PID")
foreach ($pair in $result.rolePairs | Where-Object { -not $_.exactByteIdentical })
{
    [Console]::WriteLine("ROLE_DIFFERENCE $($pair.path)")
}
foreach ($summary in $result.historySummaries)
{
    foreach ($commit in $summary.commits)
    {
        [Console]::WriteLine("HISTORY $($summary.path) $($commit.sha) $($commit.date) $($commit.message.Split([char]10)[0])")
    }
}
[Console]::WriteLine("EXISTING_XUNIT_XML_COPIES=$($result.packageDocumentationCopies.Count)")
