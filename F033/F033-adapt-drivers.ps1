$ErrorActionPreference = 'Stop'
$run = Join-Path $PSScriptRoot 'autoperf-runs\F033'
$templates = Join-Path $run 'inherited-templates'
if (Test-Path -LiteralPath $templates)
{
    throw 'Do not overwrite inherited template provenance.'
}
New-Item -ItemType Directory -Path $templates | Out-Null
$rows = [Collections.Generic.List[object]]::new()
foreach ($suffix in @('test.ps1', 'prepare.ps1', 'run-profile.ps1', 'rebuild-owner.ps1'))
{
    $original = Join-Path $PSScriptRoot "F032-$suffix"
    $destination = Join-Path $PSScriptRoot "F033-$suffix"
    if (Test-Path -LiteralPath $destination)
    {
        throw 'Do not overwrite a previously adapted independent driver.'
    }
    Copy-Item -LiteralPath $original -Destination (Join-Path $templates "F032-$suffix")
    $text = [IO.File]::ReadAllText($original).Replace('F032', 'F033').
        Replace('httpsys-flush-start', 'httpsys-write-start').
        Replace('Flush completed-success guard', 'Write completed-success guard').
        Replace('preparation-original-003', 'preparation-original').
        Replace('HttpSysRendering.cs', 'HttpSysWriting.cs').
        Replace('$actualContracts.actualAdditionalProducerContracts -ne 12', '$actualContracts.actualAdditionalProducerContracts -ne 20')
    [IO.File]::WriteAllText($destination, $text, [Text.UTF8Encoding]::new($false))
    $tokens = $null
    $errors = $null
    [Management.Automation.Language.Parser]::ParseFile($destination, [ref]$tokens, [ref]$errors) | Out-Null
    if (@($errors).Count)
    {
        throw 'Adapted driver did not parse.'
    }
    $rows.Add([ordered]@{
        original = $original; destination = $destination
        originalSha256 = (Get-FileHash -LiteralPath $original).Hash
        actualAdaptedSha256 = (Get-FileHash -LiteralPath $destination).Hash; actualParseErrors = 0
    })
}
$harness = Join-Path $run 'harness'
New-Item -ItemType Directory -Path $harness | Out-Null
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'autoperf-runs\F032\harness') -File -Force)
{
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $templates $file.Name)
    $name = $file.Name.Replace('FlushContracts', 'WriteContracts').Replace('FlushBenchmarks', 'WriteBenchmarks').
        Replace('HttpSysRendering', 'HttpSysWriting')
    $destination = Join-Path $harness $name
    if ($file.Extension -ne '.cs' -or $file.Name -ceq 'SettingsPreservingEmitToolchain.cs')
    {
        Copy-Item -LiteralPath $file.FullName -Destination $destination
    }
    else
    {
        $text = [IO.File]::ReadAllText($file.FullName).Replace('F032', 'F033').
            Replace('FlushPlan', 'WritePlan').Replace('FlushContracts', 'WriteContracts').
            Replace('FlushBenchmarks', 'WriteBenchmarks').Replace('HttpSysRendering', 'HttpSysWriting')
        [IO.File]::WriteAllText($destination, $text, [Text.UTF8Encoding]::new($false))
    }
    $rows.Add([ordered]@{
        original = $file.FullName; destination = $destination
        originalSha256 = (Get-FileHash -LiteralPath $file.FullName).Hash
        actualAdaptedSha256 = (Get-FileHash -LiteralPath $destination).Hash
        adaptation = 'Mechanical identity-only seed;not yet a Write implementation or executed characterization.'
    })
}
[ordered]@{
    candidate = 'F033'; actualMechanicalAdaptation = $true; actualShippingCodeChanged = $false
    actualNativeTimingPerformed = $false; actualF032FilesModified = $false; actualInputs = $rows
    qualification = 'Historical raw templates retained byte-exact. Only labels/type/file identities and F033 predeclared contract count adapted;Write I/O and data/argument/lifecycle behavior still require explicit implementation and actual validation.'
} | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $run 'mechanical-template-adaptation.json') -Encoding utf8NoBOM
Write-Output 'F033:four independent parsed drivers and six harness seeds;all historical template bytes retained;no shipping edit or native timing.'
