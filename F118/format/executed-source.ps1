$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$directory=Join-Path $run 'format'
if(Test-Path $directory){throw 'Do not overwrite a completed source-format check.'}
New-Item -ItemType Directory -Path $directory|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$source='src\Mvc\Mvc.Razor\src\TagHelpers\UrlResolutionTagHelper.cs'
$before=(Get-FileHash $source).Hash
$arguments=@('format','whitespace','src\Mvc\Mvc.Razor\src\Microsoft.AspNetCore.Mvc.Razor.csproj','--no-restore','--verify-no-changes','--include',$source,'--verbosity','quiet')
$start=[DateTimeOffset]::UtcNow.ToString('o')
& dotnet @arguments *> (Join-Path $directory 'console.log');$code=$LASTEXITCODE
[ordered]@{candidate='F118';entryPoint='dotnet';arguments=$arguments;exitCode=$code;startedAt=$start;completedAt=[DateTimeOffset]::UtcNow.ToString('o')
    sourceSha256=$before;sourceByteUnchanged=((Get-FileHash $source).Hash -ceq $before)
}|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
if($code -or (Get-FileHash $source).Hash -cne $before){Get-Content (Join-Path $directory 'console.log') -Tail 30;throw 'Source-only no-mutation formatting check failed.'}
& git --no-pager diff --check
if($LASTEXITCODE){throw 'Surgical source whitespace failed.'}
Write-Output 'F118:exact measured source dotnet format whitespace --verify-no-changes and git diff --check passed,no source mutation.'
