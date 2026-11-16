param([ValidatePattern('^[a-z0-9-]+$')][string]$Label='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F111'
$directory=Join-Path $run "browser\$Label-build"
if (Test-Path $directory) { throw 'Preserve every sample build attempt.' }
$original=Get-Content (Join-Path $run 'producer-source-copies.json') -Raw|ConvertFrom-Json
$ownerSource='src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'
if ($Label -ceq 'original' -and (Get-FileHash $ownerSource).Hash -cne $original[0].rawSha256)
{
    throw 'Original canonical sample must use exact original shipping owner source.'
}
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
foreach ($file in 'Program.cs','BlazorWebAppPerPage.csproj','Components\Pages\AutoPerfF111.razor')
{
    $target=Join-Path $directory "source\$file"
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
    Copy-Item "src\Components\Samples\BlazorWebAppPerPage\$file" $target
}
$arguments=@('build','src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj',
    '--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','-v:minimal')
$started=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F111';label=$Label;arguments=$arguments;exitCode=$code
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    ownerSourceSha256=(Get-FileHash $ownerSource).Hash
    canonicalSample='BlazorWebAppPerPage';mode='static SSR/default Cookie TempData'
    temporaryAppUsesPublicEphemeralDataProtection=$true;noSharedUserKeyringModification=$true
    note='Targeted dependency-aware Release sample build,max2nodes,UseIisNativeAssets=false. No full initial eng build or fresh JS bundle is claimed by this record.'
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 35
if ($code) { throw "Actual canonical F111 sample build failed:$code;preserve identified boundary before retry." }
$output='C:\src\aspnetcore\artifacts\bin\BlazorWebAppPerPage\Release\net12.0'
$owner=Join-Path $output 'Microsoft.AspNetCore.Components.Endpoints.dll'
[ordered]@{
    candidate='F111';label=$Label;actualOutput=$output;ownerFile=$owner;ownerSha256=(Get-FileHash $owner).Hash
    appSha256=(Get-FileHash (Join-Path $output 'BlazorWebAppPerPage.dll')).Hash
    programSha256=(Get-FileHash 'src\Components\Samples\BlazorWebAppPerPage\Program.cs').Hash
    scenarioSha256=(Get-FileHash 'src\Components\Samples\BlazorWebAppPerPage\Components\Pages\AutoPerfF111.razor').Hash
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'built-output.json') -Encoding utf8
Write-Output "F111 canonical${Label} sample compiled;actual owner identity retained."
