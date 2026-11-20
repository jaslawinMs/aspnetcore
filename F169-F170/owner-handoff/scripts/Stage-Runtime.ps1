. "$PSScriptRoot\Record.ps1"
Assert-NativeAllowed
$failed = Get-Content "$PSScriptRoot\commands\030-default-test-initial-runtime.json" -Raw | ConvertFrom-Json
$failureText = Get-Content "$PSScriptRoot\commands\030-default-test-initial-runtime.stderr.txt" -Raw
if ($failed.exitCode -ne 1 -or $failureText -notmatch '12\.0\.0-alpha\.1\.26569\.107') { throw 'Actual native missing-runtime failure is required first' }
$roles = Get-Content "$PSScriptRoot\roles.json" -Raw | ConvertFrom-Json
$source = 'C:\src\ap-F155-d010\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26569.107'
$destination = "$($roles.default)\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26569.107"
if (Test-Path -LiteralPath $destination) { throw 'Private runtime destination must be absent' }
$expectedCoreLib = '09dc73d8b850905f8250c160732cedeb532349827e59267bf04b0f59b0d55af8'
if ((Get-FileHash -LiteralPath "$source\System.Private.CoreLib.dll" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedCoreLib) { throw 'Known exact runtime CoreLib differs' }
function Inventory([string]$Root)
{
    $result = [ordered]@{}
    foreach ($file in Get-ChildItem -LiteralPath $Root -Recurse -File | Sort-Object FullName)
    {
        $result[[IO.Path]::GetRelativePath($Root, $file.FullName)] = @{
            bytes=$file.Length
            sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }
    return $result
}
$before = Inventory $source
Set-Location -LiteralPath "$($roles.default)\.dotnet\shared\Microsoft.NETCore.App"
New-Item -ItemType Directory -Path '12.0.0-alpha.1.26569.107' | Out-Null
Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $destination -Recurse
$after = Inventory $destination
if (($before | ConvertTo-Json -Depth 10 -Compress) -ne ($after | ConvertTo-Json -Depth 10 -Compress)) { throw 'Copied runtime all-file inventory differs' }
@{
    source=$source; destination=$destination
    trigger='030-default-test-initial-runtime: actual source-built testhost failed before any case because exact runtime69 was absent'
    method='Private same-host byte copy of the explicitly provided already-staged exact runtime. No machine install, auth operation, dependency substitution or runtime-version override.'
    expectedCoreLibSha256=$expectedCoreLib
    sourceInventory=$before; destinationInventory=$after
    fileCount=$after.Count
} | ConvertTo-Json -Depth 20 | Set-Content "$PSScriptRoot\runtime69-staging.json" -Encoding utf8NoBOM
Write-Output "Privately staged runtime69: $($after.Count) files; exact CoreLib $expectedCoreLib"
