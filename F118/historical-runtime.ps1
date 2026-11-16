param([switch]$Verify)
$ErrorActionPreference='Stop'
$run=Join-Path $PSScriptRoot 'autoperf-runs\F118'
$dotnetRoot='C:\src\aspnetcore\.dotnet'
$framework=Join-Path $dotnetRoot 'shared\Microsoft.NETCore.App\12.0.0-alpha.1.26562.105'
$manifestFile=Join-Path $run 'runtime-inventory.json'
$files=@((Get-Item (Join-Path $dotnetRoot 'dotnet.exe')))+
    @(Get-ChildItem $framework -File -Recurse)+@(Get-ChildItem (Join-Path $dotnetRoot 'host\fxr') -File -Recurse)
$rows=@(foreach($file in $files|Sort-Object FullName)
{
    if($file.LinkType){throw 'Only actual regular pinned-runtime files may be inventoried.'}
    [pscustomobject]@{file=$file.FullName.Substring($dotnetRoot.Length+1);bytes=$file.Length;sha256=(Get-FileHash $file.FullName).Hash}
})
if($Verify)
{
    $prior=Get-Content $manifestFile -Raw|ConvertFrom-Json
    if($prior.files.Count -ne $rows.Count){throw 'Pinned complete runtime/host file set changed.'}
    foreach($row in $rows)
    {
        $match=@($prior.files|Where-Object file -CEQ $row.file)
        if($match.Count -ne 1 -or $match[0].sha256 -cne $row.sha256 -or $match[0].bytes -ne $row.bytes){throw "Pinned runtime/host changed:$($row.file)"}
    }
}
else
{
    if(Test-Path $manifestFile){throw 'Never overwrite the pre-timing pinned-runtime inventory.'}
    [ordered]@{candidate='F118';dotnetRoot=$dotnetRoot;runtime='12.0.0-alpha.1.26562.105';files=$rows
        capturedAt=[DateTimeOffset]::UtcNow.ToString('o');limitation='Read-only exact whole pinned shared runtime/installed host inventory before source timings,then rehashed before each profile;not continuous file monitoring or evidence about unrelated installed runtimes.'}|ConvertTo-Json -Depth 7|Set-Content $manifestFile -Encoding utf8
    [ordered]@{capturedAt=[DateTimeOffset]::UtcNow.ToString('o');processor=@(Get-CimInstance Win32_Processor|Select-Object Name,NumberOfCores,NumberOfLogicalProcessors)
        os=Get-CimInstance Win32_OperatingSystem|Select-Object Caption,Version,TotalVisibleMemorySize,FreePhysicalMemory
        claim='Separate read-only CIM point observation,not replacement for BDN Unknown processor metadata. Shared VM,not a dedicated task sandbox;no deliberate process/thread priority,affinity,power or unrelated-process changes.'
    }|ConvertTo-Json -Depth 7|Set-Content (Join-Path $run 'machine-observation.json') -Encoding utf8
}
Write-Output "F118:$($rows.Count) exact installed pinned-runtime/host files inventoried/verified read-only."
