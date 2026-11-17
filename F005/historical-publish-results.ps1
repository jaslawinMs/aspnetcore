$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F005-immutable-file-count.txt') -Raw)
if($count-ne@(Get-ChildItem (Join-Path $output 'F005') -Recurse -Force -File).Count){throw 'Exact immutable count changed.'}
if((git -C $output branch --show-current).Trim()-cne'autoperf-results' -or
    @(git -C $output status --porcelain|Where-Object {-not $_.StartsWith('?? F005/')})){throw 'Only new F005 capsule permitted.'}
if((git -C $output remote get-url origin).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only the user fork is permitted.'}
git -C $output add -- F005
if($LASTEXITCODE){throw 'Immutable staging failed.'}
$pending=@(git -C $output diff --cached --name-only)
if($pending.Count-ne$count -or @($pending|Where-Object {-not $_.StartsWith('F005/')})){throw 'Exact new F005 scope required.'}
$authored=@('F005/README.md','F005/post-audit-decision.json','F005/harness/*.cs','F005/harness/*.csproj',
    'F005/harness-small-controls/*.cs','F005/harness-small-controls/*.csproj','F005/reproduce-analysis.mjs',
    'F005/historical-*.ps1','F005/historical-*.mjs','F005/issue-template.md','F005/pr-detail-template.md','F005/.gitattributes',
    'F005/authoritative-copy-manifest.json','F005/raw-file-copy-verification.json','F005/validation-commands.md')
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
if($LASTEXITCODE){throw 'Authored whitespace failed;never normalize raw evidence to silence it.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F005 staged $count
if($LASTEXITCODE){throw 'Actual staged bytes/scope differ.'}
git -C $output commit -q -m 'Publish qualified potential-iterator allocation evidence and all control costs' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Immutable evidence commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F005-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Immutable evidence push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F005 remote $count
if($LASTEXITCODE){throw 'Actual remote immutable blobs differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F005:$count actual immutable remote blobs verified;two controlled/one exploratory comparison,not a general speedup claim."
