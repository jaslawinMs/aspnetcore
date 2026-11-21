$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'capture-library-009.ps1')
$pins = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'source-role-pins-007.json')) | ConvertFrom-Json
$null = Invoke-SourceRoot 'r003-reserved-tracked-status-before' 'git' @('--no-pager','status','--porcelain=v1','-z','--untracked-files=no')
$paths = @('src/ProjectTemplates','.github/instructions/project-templates.instructions.md','.github/instructions/cross-cutting-guidance.instructions.md','AGENTS.md','.github/AGENTS.md','.github/copilot-instructions.md')
$all = @()
foreach ($role in @('Original','ObservedDefault'))
{
    $commit = $pins.$role
    $label = if ($role -ceq 'Original') { 'r004-original-tree-metadata' } else { 'r005-default-tree-metadata' }
    $raw = Invoke-SourceRoot $label 'git' (@('--no-pager','-c','core.quotepath=false','ls-tree','-r','-z',$commit,'--') + $paths)
    $rows = @()
    foreach ($record in [Text.Encoding]::UTF8.GetString($raw).Split([char]0))
    {
        if ($record.Length -eq 0) { continue }
        if ($record -notmatch '(?s)^(?<mode>[0-7]{6}) (?<type>\S+) (?<oid>[0-9a-f]{40})\t(?<path>.+)$') { throw 'Unexpected full raw ls-tree record framing' }
        $rows += [ordered]@{ role = $role; commit = $commit; mode = $Matches.mode; type = $Matches.type; blob = $Matches.oid; path = $Matches.path; provenanceRoot = $label }
    }
    Save-NewJson ($role + '.tree-metadata-011.json') $rows
    $all += $rows
}
Save-NewJson 'all-tree-metadata-011.json' $all
$selectedNames = @($all | Where-Object { $_.path -match '(?i)AGENTS|instructions|Baseline|TemplatePackage|ProjectFactory|TemplateInvoker|\.csproj$|Directory\.Build|TemplateTestBase|TemplateManager|TemplateTest' })
Save-NewJson 'selected-filename-discovery-011.json' $selectedNames
[Console]::WriteLine(($selectedNames | ConvertTo-Json -Depth 8))
