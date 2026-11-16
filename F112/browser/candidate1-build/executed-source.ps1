param(
    [ValidatePattern('^[a-z0-9-]+$')][string]$Label='original',
    [switch]$RestoreChangedReferences
)
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F112'
$directory=Join-Path $run "browser\$Label-build"
if (Test-Path $directory) { throw 'Preserve every F112 canonical build attempt.' }
$original=Get-Content (Join-Path $run 'producer-source-copies.json') -Raw|ConvertFrom-Json
$ownerSource='src\Components\Endpoints\src\Serialization\JsonStoredDataSerializer.cs'
$originalOwner=@($original|Where-Object path -CEQ $ownerSource)
if ($Label -ceq 'original' -and (Get-FileHash $ownerSource).Hash -cne $originalOwner[0].rawSha256) { throw 'Actual original source required.' }
New-Item -ItemType Directory -Path (Join-Path $directory 'source') -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
foreach ($file in 'Program.cs','BlazorWebAppPerPage.csproj','Components\Pages\AutoPerfF112.razor')
{
    $target=Join-Path $directory "source\$file"
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force|Out-Null
    Copy-Item "src\Components\Samples\BlazorWebAppPerPage\$file" $target
}
if ($RestoreChangedReferences)
{
    $restoreArguments=@('-projects','src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj',
        '-NoBuildNative','-NoBuildNodeJS','-NoBuildJava','-NoBuildInstallers','/m:2','-verbosity:quiet')
    $started=[DateTimeOffset]::UtcNow.ToString('o')
    & .\restore.cmd @restoreArguments *> (Join-Path $directory 'restore-console.log')
    $code=$LASTEXITCODE
    [ordered]@{
        candidate='F112';label=$Label;entryPoint='.\restore.cmd';arguments=$restoreArguments;exitCode=$code
        reason='Temporary canonical sample adds the actual in-tree Session project reference;restore after that explicit manifest change.'
        startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    }|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'restore-execution.json') -Encoding utf8
    if ($code)
    {
        Get-Content (Join-Path $directory 'restore-console.log') -Tail 35
        throw "Changed-reference documented restore failed:$code;preserve this actual boundary."
    }
}
$arguments=@('build','src\Components\Samples\BlazorWebAppPerPage\BlazorWebAppPerPage.csproj',
    '--no-restore','-c','Release','-m:2','-p:UseIisNativeAssets=false','-v:minimal')
$started=[DateTimeOffset]::UtcNow.ToString('o')
dotnet @arguments *> (Join-Path $directory 'console.log')
$code=$LASTEXITCODE
[ordered]@{
    candidate='F112';label=$Label;arguments=$arguments;exitCode=$code
    startedAt=$started;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    ownerSourceSha256=(Get-FileHash $ownerSource).Hash
    canonicalSample='BlazorWebAppPerPage';mode='static SSR/real SupplyParameterFromSession/SessionMiddleware/distributed-memory session'
    temporaryAppUsesPublicEphemeralDataProtection=$true;noSharedUserKeyringModification=$true
    note='Dependency-aware Release sample build,max2nodes,UseIisNativeAssets=false. No full initial eng build is claimed.'
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
Get-Content (Join-Path $directory 'console.log') -Tail 30
if ($code) { throw "Actual canonical F112 sample build failed:$code." }
$output='C:\src\aspnetcore\artifacts\bin\BlazorWebAppPerPage\Release\net12.0'
[ordered]@{
    candidate='F112';label=$Label;actualOutput=$output
    ownerSha256=(Get-FileHash (Join-Path $output 'Microsoft.AspNetCore.Components.Endpoints.dll')).Hash
    sessionSha256=(Get-FileHash (Join-Path $output 'Microsoft.AspNetCore.Session.dll')).Hash
    appSha256=(Get-FileHash (Join-Path $output 'BlazorWebAppPerPage.dll')).Hash
    programSha256=(Get-FileHash 'src\Components\Samples\BlazorWebAppPerPage\Program.cs').Hash
    scenarioSha256=(Get-FileHash 'src\Components\Samples\BlazorWebAppPerPage\Components\Pages\AutoPerfF112.razor').Hash
}|ConvertTo-Json -Depth 6|Set-Content (Join-Path $directory 'built-output.json') -Encoding utf8
Write-Output "F112 canonical${Label} sample compiled;actual owner and real Session identities retained."
