$ErrorActionPreference = 'Stop'
$receipt = Join-Path $PSScriptRoot 'F035-publication-whitespace.json'
if (Test-Path -LiteralPath $receipt)
{
    throw 'Do not overwrite an actual authoring-check receipt.'
}
$files = @(Get-ChildItem -LiteralPath $PSScriptRoot -File |
    Where-Object { $_.Name -like 'F035-*' -and $_.Extension -in '.ps1','.mjs','.md' })
$observations = [Collections.Generic.List[object]]::new()
foreach ($file in $files)
{
    $content = [IO.File]::ReadAllText($file.FullName)
    if (!$content.EndsWith("`n") -or $content -match '(?m)[ \t]+(?=\r?$)')
    {
        throw "Authored whitespace/end-of-file check failed:$($file.Name)"
    }
    if ($file.Extension -ceq '.ps1')
    {
        $tokens = $null
        $errors = $null
        $null = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors)
        if ($errors.Count)
        {
            $errors | ForEach-Object { Write-Error $_.Message }
            throw "Authored PowerShell parsing failed:$($file.Name)"
        }
    }
    elseif ($file.Extension -ceq '.mjs')
    {
        & node --check $file.FullName
        if ($LASTEXITCODE -ne 0)
        {
            throw "Authored Node syntax check failed:$($file.Name)"
        }
    }
    $observations.Add([ordered]@{
        file=$file.Name;sha256=(Get-FileHash -LiteralPath $file.FullName).Hash
        actualWhitespacePassed=$true;actualRequiredSyntaxCheckPassed=($file.Extension -in '.ps1','.mjs')
    })
}
$status = @(& git -C 'C:\src\aspnetcore' status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0 -or $status.Count)
{
    throw 'Source checkout must retain no tracked shipping change.'
}
[ordered]@{
    candidate='F035';actualAuthoredPublicationWhitespaceExit=0
    actualAuthoredFiles=$observations.Count;actualAuthoredWhitespaceAndSyntaxObservations=$observations
    actualSourceTrackedUnchanged=$true;actualNativeTimingRerun=$false
    scope='Authored session PS/Node/Markdown whitespace and PS/Node parsing;not rewriting raw sources/logs/native evidence.'
} | ConvertTo-Json -Depth 9 | Set-Content $receipt -Encoding utf8NoBOM
Write-Output "F035:$($observations.Count)authored files pass whitespace/required syntax checks;shipping tracked tree unchanged."
