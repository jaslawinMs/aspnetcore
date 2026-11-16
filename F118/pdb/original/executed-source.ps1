param([ValidateSet('original','candidate1')][string]$Variant='original')
$ErrorActionPreference='Stop'
Set-Location 'C:\src\aspnetcore'
. .\activate.ps1
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$ready=Get-Content (Join-Path $run "$Variant-ready.json") -Raw|ConvertFrom-Json
$directory=Join-Path $run "pdb\$Variant"
if(Test-Path $directory){throw 'Never overwrite completed PDB document evidence.'}
New-Item -ItemType Directory -Path $directory -Force|Out-Null
Copy-Item $PSCommandPath (Join-Path $directory 'executed-source.ps1')
$toolRoot=Join-Path $PSScriptRoot 'autoperf-runs\F071\tools'
$tool=Join-Path $toolRoot 'bin\Release\net12.0\AutoPerf.Evidence.dll'
Copy-Item (Join-Path $toolRoot 'Program.cs') (Join-Path $directory 'verifier-Program.cs')
Get-ChildItem $toolRoot -File -Filter '*.csproj'|Copy-Item -Destination $directory
$pairs=@(
    @('Microsoft.AspNetCore.Mvc.Razor','src\Mvc\Mvc.Razor\src\TagHelpers\UrlResolutionTagHelper.cs'),
    @('Microsoft.AspNetCore.Mvc.Razor','src\Mvc\Mvc.Razor\src\RazorPageBase.cs'),
    @('Microsoft.AspNetCore.Razor.Runtime','src\Razor\Razor.Runtime\src\Runtime\TagHelpers\TagHelperExecutionContext.cs'),
    @('Microsoft.AspNetCore.Razor.Runtime','src\Razor\Razor.Runtime\src\Runtime\TagHelpers\TagHelperRunner.cs'),
    @('Microsoft.AspNetCore.Razor','src\Razor\Razor\src\TagHelpers\DefaultTagHelperContent.cs'),
    @('Microsoft.AspNetCore.Razor','src\Razor\Razor\src\TagHelpers\TagHelperAttribute.cs'),
    @('Microsoft.AspNetCore.Razor','src\Razor\Razor\src\TagHelpers\TagHelperOutput.cs'),
    @('Microsoft.AspNetCore.Html.Abstractions','src\Html.Abstractions\src\HtmlContentBuilder.cs'),
    @('Microsoft.AspNetCore.Html.Abstractions','src\Html.Abstractions\src\HtmlString.cs'),
    @('Microsoft.AspNetCore.Html.Abstractions','src\Html.Abstractions\src\IHtmlContent.cs'),
    @('Microsoft.AspNetCore.Mvc.Core','src\Mvc\Mvc.Core\src\Routing\UrlHelperFactory.cs'),
    @('Microsoft.AspNetCore.Mvc.Core','src\Mvc\Mvc.Core\src\Routing\UrlHelperBase.cs'),
    @('Microsoft.AspNetCore.Mvc.Core','src\Mvc\Mvc.Core\src\Routing\UrlHelper.cs'),
    @('Microsoft.Extensions.ObjectPool','src\ObjectPool\src\ObjectPool.cs'),
    @('Microsoft.Extensions.ObjectPool','src\ObjectPool\src\DefaultObjectPool.cs'),
    @('Microsoft.Extensions.ObjectPool','src\ObjectPool\src\DefaultObjectPoolProvider.cs'),
    @('Microsoft.Extensions.ObjectPool','src\ObjectPool\src\StringBuilderPooledObjectPolicy.cs'),
    @('Microsoft.AspNetCore.Mvc.Abstractions','src\Mvc\Mvc.Abstractions\src\ActionContext.cs'),
    @('Microsoft.AspNetCore.Mvc.ViewFeatures','src\Mvc\Mvc.ViewFeatures\src\Rendering\ViewContext.cs')
)
$pairs+=@('Program.cs','Workloads.cs','ParallelWork.cs','Controls.cs','SettingsPreservingEmitToolchain.cs'|ForEach-Object {,@('AutoPerf.Benchmarks',"harness\$_")})
$rows=[System.Collections.Generic.List[object]]::new()
$commands=[System.Collections.Generic.List[object]]::new()
foreach($pair in $pairs)
{
    $number=$rows.Count
    $source=Join-Path (Join-Path $run $ready.sourceRelative) $pair[1]
    $pdb=Join-Path (Join-Path $run $ready.imageRelative) "$($pair[0]).pdb"
    $arguments=@($tool,'pdb',$pdb,[IO.Path]::GetFileName($source),$source)
    & dotnet @arguments *> (Join-Path $directory "document-$number.log")
    $code=$LASTEXITCODE
    $commands.Add([pscustomobject]@{entryPoint='dotnet';arguments=$arguments;exitCode=$code})
    [ordered]@{candidate='F118';variant=$Variant;commands=$commands}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $directory 'execution.json') -Encoding utf8
    if($code){Get-Content (Join-Path $directory "document-$number.log");throw 'Actual frozen PDB document mismatch;preserve this attempt.'}
    $actual=Get-Content (Join-Path $directory "document-$number.log") -Raw|ConvertFrom-Json
    if(-not $actual.verified){throw 'Positive source checksum witness required.'}
    $rows.Add([pscustomobject]@{owner=$pair[0];source=$pair[1];pdbSha256=(Get-FileHash $pdb).Hash;sourceSha256=(Get-FileHash $source).Hash;actual=$actual})
}
if($rows.Count -ne 24){throw 'All24 explicitly selected source documents required.'}
[ordered]@{candidate='F118';variant=$Variant;verifiedDocuments=$rows.Count;rows=$rows;verifierAssemblySha256=(Get-FileHash $tool).Hash
    limitation='Portable-PDB source-document checks,not an independent PE/PDB binding or method-coverage proof. Existing F071 tool executes only pdb branch;unexecuted F071 self branch is preserved in verifier source.'
}|ConvertTo-Json -Depth 9|Set-Content (Join-Path $directory 'document-audit.json') -Encoding utf8
Write-Output "F118:$Variant all24 frozen PDB document hashes match exact source snapshots."
