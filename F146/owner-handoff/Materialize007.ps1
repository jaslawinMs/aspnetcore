$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Invoke-Recorded007.ps1')
$pins = [ordered]@{
    Original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    ObservedDefault = 'ae89581dfd24c6277b4267a9779d05f7b9f047f1'
}
$graphs = Join-Path $PSScriptRoot 'graphs'
New-Item -ItemType Directory -Path $graphs | Out-Null
foreach ($role in $pins.Keys)
{
    $graph = Join-Path $graphs $role
    New-Item -ItemType Directory -Path $graph | Out-Null
    $archive = Join-Path $PSScriptRoot "$role.source.tar"
    Invoke-Recorded007 -Root $PSScriptRoot -Label "$role-archive" -Executable 'C:\Program Files\Git\cmd\git.exe' -Arguments @('--no-pager','-C','C:\src\aspnetcore','archive','--format=tar',"--output=$archive",$pins[$role])
    Invoke-Recorded007 -Root $PSScriptRoot -Label "$role-extract" -Executable 'C:\Windows\system32\tar.exe' -Arguments @('-xf',$archive,'-C',$graph)
    New-Item -ItemType Junction -Path (Join-Path $graph '.dotnet') -Target 'C:\src\aspnetcore\.dotnet' | Out-Null
    [ordered]@{
        role = $role
        sourcePin = $pins[$role]
        archiveSha256 = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
        graph = $graph
        candidateApplied = $false
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot "$role-source.json")
    $dotnet = Join-Path $graph '.dotnet\dotnet.exe'
    Invoke-Recorded007 -Root $graph -Label "$role-sdk-version" -Executable $dotnet -Arguments @('--version') -Dotnet
    $flags = @('-p:UseIisNativeAssets=false','-p:BuildNodeJS=false','-p:StaticWebAssetsEnabled=false','-p:UseSharedCompilation=false','/m:2','/nr:false','-p:LangVersion=13.0','-p:RuntimeFrameworkVersion=12.0.0-alpha.1.26562.105',"-p:F146SourceRole=$role","-p:CustomAfterMicrosoftCommonTargets=$(Join-Path $PSScriptRoot 'prepared\F146.Producer.targets')")
    Invoke-Recorded007 -Root $graph -Label "$role-initial-no-restore" -Executable $dotnet -Arguments (@('build','src\Servers\Kestrel\test\InMemory.FunctionalTests\InMemory.FunctionalTests.csproj','--no-restore','-c','Release','-v:q') + $flags) -Dotnet -AllowFailure
}
