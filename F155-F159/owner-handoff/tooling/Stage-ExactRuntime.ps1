$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$version = '12.0.0-alpha.1.26569.107'
$roleRoot = 'C:\src\ap-F155-d010'
$sourceRoot = 'C:\src\aspnetcore\.dotnet'
$package = "$root\runtime-repair\microsoft.netcore.app.runtime.win-x64.$version.nupkg"
$failure = Get-Content "$root\commands\050-native-existing-five-observedDefault.json" -Raw | ConvertFrom-Json
if ($failure.exitCode -ne 1) { throw 'Expected retained actual missing runtime failure' }
$policy = Get-Content (Join-Path (Split-Path $root) 'policy.json') -Raw | ConvertFrom-Json
if ($policy.actualWorkerBuildHoldActive -eq $true) { throw 'Active HOLD' }
$link = Get-Item "$roleRoot\.dotnet"
if ($link.LinkType -ne 'Junction' -or $link.Target -ne $sourceRoot) { throw 'Unexpected owned dotnet junction' }
Remove-Item -LiteralPath "$roleRoot\.dotnet"
New-Item -ItemType Directory -Path "$roleRoot\.dotnet", "$roleRoot\.dotnet\shared\Microsoft.NETCore.App\$version" | Out-Null
Copy-Item "$sourceRoot\dotnet.exe" "$roleRoot\.dotnet\dotnet.exe"
foreach ($directory in @('host', 'sdk', 'packs', 'sdk-manifests', 'templates', 'x86')) {
    if (Test-Path "$sourceRoot\$directory") {
        New-Item -ItemType Junction -Path "$roleRoot\.dotnet\$directory" -Target "$sourceRoot\$directory" | Out-Null
    }
}
foreach ($runtime in Get-ChildItem "$sourceRoot\shared\Microsoft.NETCore.App" -Directory) {
    New-Item -ItemType Junction -Path "$roleRoot\.dotnet\shared\Microsoft.NETCore.App\$($runtime.Name)" -Target $runtime.FullName | Out-Null
}
$runtimePath = "$roleRoot\.dotnet\shared\Microsoft.NETCore.App\$version"
$archive = [IO.Compression.ZipFile]::OpenRead($package)
$entries = @()
try {
    foreach ($entry in $archive.Entries) {
        $relative = $null
        foreach ($prefix in @('runtimes/win-x64/native/', 'runtimes/win-x64/lib/net12.0/')) {
            if ($entry.FullName.StartsWith($prefix, [StringComparison]::Ordinal)) {
                $relative = $entry.FullName.Substring($prefix.Length)
            }
        }
        if ($relative -and -not $relative.EndsWith('/')) {
            $destination = Join-Path $runtimePath $relative.Replace('/', '\')
            New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
            [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $false)
            $entries += [ordered]@{
                archiveEntry = $entry.FullName
                relative = $relative.Replace('/', '\')
                bytes = (Get-Item $destination).Length
                sha256 = (Get-FileHash $destination -Algorithm SHA256).Hash.ToLowerInvariant()
            }
        }
    }
} finally {
    $archive.Dispose()
}
foreach ($required in @('System.Private.CoreLib.dll', 'coreclr.dll', 'hostpolicy.dll', 'Microsoft.NETCore.App.deps.json')) {
    if (-not (Test-Path "$runtimePath\$required")) { throw "Runtime package missing required $required" }
}
[ordered]@{
    pid = $PID
    utc = [DateTime]::UtcNow.ToString('o')
    version = $version
    sourcePackage = $package
    packageSha256 = (Get-FileHash $package -Algorithm SHA256).Hash.ToLowerInvariant()
    runtimeRoot = $runtimePath
    existingDotnetHostAndSharedSdk = $sourceRoot
    sdkInstallationIndependent = $false
    runtimeOverride = $false
    reason = 'Exact stock runtimeconfig requirement; staged only after actual missing runtime host failure. Official runtime pack from same public feed as successfully restored reference pack; no bootstrap or machine-wide install.'
    files = $entries
} | ConvertTo-Json -Depth 10 | Set-Content "$root\runtime-repair\exact-runtime-stage.json" -Encoding utf8
"STAGED exact runtime ${version}: $($entries.Count) files; existing SDK/host/packs shared by declared junctions."
