$ErrorActionPreference = 'Stop'
$checks = [Collections.Generic.List[object]]::new()
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter 'F036-*' -File | Where-Object Extension -In '.ps1','.mjs')
{
    if ($file.Extension -ceq '.ps1')
    {
        $tokens = $null
        $errors = $null
        $null = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors)
        if ($errors.Count)
        {
            throw "$($file.Name):$($errors.Message -join '; ')"
        }
    }
    else
    {
        & node --check $file.FullName
        if ($LASTEXITCODE -ne 0)
        {
            throw "JavaScript authoring syntax check failed:$($file.Name)"
        }
    }
    $checks.Add([ordered]@{
        file=$file.Name;actualSha256=(Get-FileHash -LiteralPath $file.FullName).Hash;actualSyntaxCheckPassed=$true
    })
}
$docs = @(foreach ($name in 'F036-results-readme.md','F036-issue-template.md')
{
    $file = Join-Path $PSScriptRoot $name
    $text = [IO.File]::ReadAllText($file)
    if ($text -match '(?m)[ \t]+(?=\r?$)' -or !$text.EndsWith("`n") -or $text -match '[^\x00-\x7F]')
    {
        throw "Authored Markdown whitespace/encoding check failed:$name"
    }
    [ordered]@{file=$name;actualSha256=(Get-FileHash -LiteralPath $file).Hash;actualWhitespaceErrors=0}
})
[ordered]@{
    candidate='F036';actualAuthoredPublicationWhitespaceExit=0
    actualLogicalSpaceTabTrailingWhitespaceChecked=$true;actualFinalNewlineChecked=$true
    actualAuthoredMarkdownAsciiChecked=$true;actualCommandScopedGitCrAtEolCheckRequiredWhenStaged=$true
    actualDriverSyntaxChecks=$checks;actualMarkdownChecks=$docs
    actualDotnetRerun=$false;actualHarnessOrShippingSourceChanged=$false
} | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $PSScriptRoot 'F036-publication-whitespace.json') -Encoding utf8NoBOM
Write-Output "F036:$($checks.Count)driver syntax checks and2authored Markdown checks passed."
