. "$PSScriptRoot\Record.ps1"
Assert-NativeAllowed
$failure = Get-Content "$PSScriptRoot\commands\040-default-components-initial-runtime.json" -Raw | ConvertFrom-Json
if ($failure.exitCode -eq 0) { throw 'No runtime failure: staging is not authorized by prerequisite policy.' }
$text = (Get-Content "$PSScriptRoot\commands\040-default-components-initial-runtime.stdout.txt" -Raw) + (Get-Content "$PSScriptRoot\commands\040-default-components-initial-runtime.stderr.txt" -Raw)
if ($text -notmatch '26569.107' -or $text -notmatch 'install or update .NET') { throw 'Failure does not establish missing exact runtime69.' }
$dir = "$PSScriptRoot\runtime-repair"
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$metadata = Get-Content 'C:\.tools\.nuget\packages\microsoft.netcore.app.ref\12.0.0-alpha.1.26569.107\.nupkg.metadata' -Raw | ConvertFrom-Json
Copy-Item 'C:\.tools\.nuget\packages\microsoft.netcore.app.ref\12.0.0-alpha.1.26569.107\.nupkg.metadata' "$dir\reference-package-source.json"
Invoke-Recorded '050-runtime-public-feed-index' 'curl.exe' @('--fail','--location','--silent','--show-error','--output',"$dir\public-feed-index.json",$metadata.source)
$index = Get-Content "$dir\public-feed-index.json" -Raw | ConvertFrom-Json
$base = ($index.resources | Where-Object { $_.'@type' -like 'PackageBaseAddress*' } | Select-Object -First 1).'@id'
if (-not $base.StartsWith('https://pkgs.dev.azure.com/dnceng/')) { throw 'Unexpected public feed package source' }
$version = '12.0.0-alpha.1.26569.107'
$packageName = "microsoft.netcore.app.runtime.win-x64.$version.nupkg"
$package = "$dir\$packageName"
$url = $base.TrimEnd('/') + "/microsoft.netcore.app.runtime.win-x64/$version/$packageName"
Invoke-Recorded '051-runtime-exact-public-package' 'curl.exe' @('--fail','--location','--silent','--show-error','--output',$package,$url)
if (-not (Test-Path $package)) { throw 'Exact runtime download failed' }
[IO.Compression.ZipFile]::ExtractToDirectory($package,"$dir\expanded")
$repo = 'C:\src\ap163d011'
$link = Get-Item "$repo\.dotnet"
if ($link.LinkType -ne 'Junction') { throw 'Expected declared SDK junction; refusing other filesystem alteration.' }
$oldTarget = $link.Target
[IO.Directory]::Delete("$repo\.dotnet")
New-Item -ItemType Directory -Path "$repo\.dotnet","$repo\.dotnet\shared","$repo\.dotnet\shared\Microsoft.NETCore.App" | Out-Null
$sdk = 'C:\src\aspnetcore\.dotnet'
foreach ($file in Get-ChildItem $sdk -File)
{
    Copy-Item $file.FullName "$repo\.dotnet\$($file.Name)"
}
foreach ($name in @('sdk','host','packs','sdk-manifests','metadata'))
{
    if (Test-Path "$sdk\$name") { New-Item -ItemType Junction -Path "$repo\.dotnet\$name" -Target "$sdk\$name" | Out-Null }
}
foreach ($framework in Get-ChildItem "$sdk\shared" -Directory)
{
    if ($framework.Name -ne 'Microsoft.NETCore.App')
    {
        New-Item -ItemType Junction -Path "$repo\.dotnet\shared\$($framework.Name)" -Target $framework.FullName | Out-Null
    }
}
foreach ($runtime in Get-ChildItem "$sdk\shared\Microsoft.NETCore.App" -Directory)
{
    New-Item -ItemType Junction -Path "$repo\.dotnet\shared\Microsoft.NETCore.App\$($runtime.Name)" -Target $runtime.FullName | Out-Null
}
$destination = "$repo\.dotnet\shared\Microsoft.NETCore.App\$version"
New-Item -ItemType Directory -Path $destination | Out-Null
Copy-Item "$dir\expanded\runtimes\win-x64\lib\net12.0\*" $destination
Copy-Item "$dir\expanded\runtimes\win-x64\native\*" $destination
@{
    exactVersion=$version; trigger=$failure.id; sourcePackage=$url
    packageSha256=(Get-FileHash $package -Algorithm SHA256).Hash.ToLowerInvariant()
    previousSdkJunctionTarget=$oldTarget; privateDotnetRoot="$repo\.dotnet"
    sharedSdkAndPacks=$sdk
    noRuntimeVersionOverride=$true; noMachineWideInstall=$true
    nativeFileCount=@(Get-ChildItem $destination -File).Count
} | ConvertTo-Json -Depth 10 | Set-Content "$dir\repair.json" -Encoding utf8NoBOM
Invoke-LocalDotnet '052-default-repaired-info' $repo @('--info')
