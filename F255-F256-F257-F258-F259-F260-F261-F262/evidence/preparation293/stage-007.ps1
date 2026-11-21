$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'capture-library-006.ps1')
$original = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
$query = 'query { repository(owner: "dotnet", name: "aspnetcore") { nameWithOwner defaultBranchRef { name target { ... on Commit { oid committedDate tree { oid } } } } } }'
$pinBytes = Invoke-SourceRoot 'r001-gh-upstream-default' 'gh' @('api', 'graphql', '-f', ('query=' + $query))
$pin = [Text.Encoding]::UTF8.GetString($pinBytes) | ConvertFrom-Json -Depth 20
if ($pin.data.repository.nameWithOwner -cne 'dotnet/aspnetcore') { throw 'Unexpected upstream repository' }
$default = $pin.data.repository.defaultBranchRef.target.oid
if ($default -notmatch '^[0-9a-f]{40}$' -or $default -ceq '24875ef5dabb55567870b39f6eb0002170435e2f') { throw 'Fresh default invalid or confused with reserved HEAD' }
Save-NewJson 'source-role-pins-007.json' ([ordered]@{ Original = $original; ObservedDefault = $default; defaultBranch = $pin.data.repository.defaultBranchRef.name; committedDate = $pin.data.repository.defaultBranchRef.target.committedDate; defaultTree = $pin.data.repository.defaultBranchRef.target.tree.oid; freshPinRoot = 'r001-gh-upstream-default'; reservedHeadNotDefault = '24875ef5dabb55567870b39f6eb0002170435e2f'; immutablePointPinNotFutureHeadClaim = $true })
$null = Invoke-SourceRoot 'r002-reserved-repository-identity' 'git' @('--no-pager','rev-parse','--show-toplevel','--absolute-git-dir','HEAD','--symbolic-full-name','HEAD')
$null = Invoke-SourceRoot 'r003-reserved-tracked-status-before' 'git' @('--no-pager','status','--porcelain=v1','-z','--untracked-files=no')
$paths = @('src/ProjectTemplates','.github/instructions/project-templates.instructions.md','.github/instructions/cross-cutting-guidance.instructions.md','AGENTS.md','.github/AGENTS.md','.github/copilot-instructions.md')
$all = @()
foreach ($role in @('Original','ObservedDefault'))
{
    $commit = if ($role -ceq 'Original') { $original } else { $default }
    $label = if ($role -ceq 'Original') { 'r004-original-tree-metadata' } else { 'r005-default-tree-metadata' }
    $raw = Invoke-SourceRoot $label 'git' (@('--no-pager','-c','core.quotepath=false','ls-tree','-r','-z',$commit,'--') + $paths)
    $rows = @()
    foreach ($record in [Text.Encoding]::UTF8.GetString($raw).Split([char]0))
    {
        if ($record.Length -eq 0) { continue }
        if ($record -notmatch '(?s)^(?<mode>[0-7]{6}) (?<type>\S+) (?<oid>[0-9a-f]{40})\t(?<path>.+)$') { throw 'Unexpected full raw ls-tree record framing' }
        $rows += [ordered]@{ role = $role; commit = $commit; mode = $Matches.mode; type = $Matches.type; blob = $Matches.oid; path = $Matches.path; provenanceRoot = $label }
    }
    Save-NewJson ($role + '.tree-metadata-007.json') $rows
    $all += $rows
}
Save-NewJson 'all-tree-metadata-007.json' $all
$selectedNames = @($all | Where-Object { $_.path -match '(?i)AGENTS|instructions|Baseline|TemplatePackage|ProjectFactory|TemplateInvoker|\.csproj$|Directory\.Build|TemplateTestBase|TemplateManager|TemplateTest' } | Select-Object role,mode,blob,path)
Save-NewJson 'selected-filename-discovery-007.json' $selectedNames
[Console]::WriteLine(($selectedNames | ConvertTo-Json -Depth 8))