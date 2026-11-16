$ErrorActionPreference='Stop'
$directory=Join-Path $PSScriptRoot 'autoperf-runs\F116\investigation\initial-upstream-work'
if (Test-Path $directory) {throw 'Never overwrite original upstream evidence.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$records=[System.Collections.Generic.List[object]]::new()
foreach ($command in @(
    @('prior-port-cache','pr','view','69558','--repo','dotnet/aspnetcore','--json','title,body,files,commits,mergedAt,author,url'),
    @('port-cache-review-comments','api','-X','GET','repos/dotnet/aspnetcore/pulls/69558/comments','-f','per_page=100'),
    @('port-cache-issue-comments','api','-X','GET','repos/dotnet/aspnetcore/issues/69558/comments','-f','per_page=100'),
    @('getboxedport-related','api','-X','GET','search/issues','-f','q=repo:dotnet/aspnetcore is:pr GetBoxedPort','-f','per_page=30'),
    @('endpoint-port-boxing-related','api','-X','GET','search/issues','-f','q=repo:dotnet/aspnetcore is:pr "server.port" boxing','-f','per_page=30')
))
{
    $name=$command[0];$arguments=@($command|Select-Object -Skip 1)
    gh @arguments 1> (Join-Path $directory "$name.json") 2> (Join-Path $directory "$name.stderr.log")
    $code=$LASTEXITCODE
    $records.Add([pscustomobject]@{name=$name;entryPoint='gh';arguments=$arguments;exitCode=$code})
    if ($code)
    {
        $records|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'commands.json') -Encoding utf8
        throw "Actual upstream read failed:$name"
    }
}
$records|ConvertTo-Json -Depth 7|Set-Content (Join-Path $directory 'commands.json') -Encoding utf8
$summaries=[System.Collections.Generic.List[object]]::new()
$pr=Get-Content (Join-Path $directory 'prior-port-cache.json') -Raw|ConvertFrom-Json
$summaries.Add(($pr|Select-Object author,title,url,mergedAt,body))
foreach ($name in 'port-cache-review-comments','port-cache-issue-comments')
{
    $data=@(Get-Content (Join-Path $directory "$name.json") -Raw|ConvertFrom-Json)
    $summaries.Add([pscustomobject]@{source=$name;rows=$data.Count;comments=@($data|Select-Object body,html_url)})
}
foreach ($name in 'getboxedport-related','endpoint-port-boxing-related')
{
    $data=Get-Content (Join-Path $directory "$name.json") -Raw|ConvertFrom-Json
    $summaries.Add([pscustomobject]@{query=$name;total=$data.total_count;items=@($data.items|Select-Object number,title,html_url)})
}
$summaries|ConvertTo-Json -Depth 8
