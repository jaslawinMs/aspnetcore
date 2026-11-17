$ErrorActionPreference = 'Stop'
Set-Location 'C:\src\aspnetcore'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F015'
$execution = Join-Path $run 'preparation-execution\candidate-Pack\attempt-001'
if (Test-Path -LiteralPath $execution)
{
    throw 'Do not overwrite an actual package-validation attempt.'
}
New-Item -ItemType Directory -Path $execution | Out-Null
Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $execution 'executed-driver.ps1')
. .\activate.ps1
$project = 'src\DataProtection\DataProtection\src\Microsoft.AspNetCore.DataProtection.csproj'
$commands = [System.Collections.Generic.List[object]]::new()
function InvokeRecorded([string] $Label, [string[]] $Arguments)
{
    $start = [DateTimeOffset]::UtcNow.ToString('o')
    & dotnet @Arguments *> (Join-Path $execution "$Label.log")
    $code = $LASTEXITCODE
    $commands.Add([ordered]@{
        label = $Label
        entryPoint = 'dotnet'
        resolvedExecutable = (Get-Command dotnet).Source
        arguments = $Arguments
        started = $start
        completed = [DateTimeOffset]::UtcNow.ToString('o')
        actualExitCode = $code
    })
    $commands | ConvertTo-Json -Depth 7 | Set-Content (Join-Path $execution 'execution.json') -Encoding utf8NoBOM
    if ($code)
    {
        Get-Content (Join-Path $execution "$Label.log") -Tail 60
        throw "Actual $Label failed; retain this attempt."
    }
}
InvokeRecorded 'EvaluatePackageGate' @('msbuild', $project, '-nologo', '-m:2', '-v:q', '-p:Configuration=Release',
    '-getProperty:EnablePackageValidation,EnablePackageBaselineValidation,PackageValidationBaselineVersion,IsPackable,PackageVersion,PackageId')
$properties = (Get-Content (Join-Path $execution 'EvaluatePackageGate.log') -Raw | ConvertFrom-Json).Properties
if ($properties.EnablePackageValidation -cne 'true' -or $properties.IsPackable -cne 'true')
{
    throw 'The evaluated product package-validation gate differs.'
}
InvokeRecorded 'Pack' @('pack', $project, '-c', 'Release', '--no-build', '--no-restore', '-m:2', '-v:normal',
    "-bl:$(Join-Path $execution 'Pack.binlog');ProjectImports=None")
Get-Content (Join-Path $execution 'Pack.log') -Tail 35
