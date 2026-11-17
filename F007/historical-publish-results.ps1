$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F007-immutable-file-count.txt') -Raw)
if($count-ne@(Get-ChildItem (Join-Path $output 'F007') -Recurse -Force -File).Count){throw 'Exact immutable count changed.'}
if((git -C $output branch --show-current).Trim()-cne'autoperf-results' -or
    @(git -C $output status --porcelain|Where-Object {-not$_.StartsWith('?? F007/')})){throw 'Only new F007 capsule permitted.'}
if((git -C $output remote get-url origin).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user-fork writes permitted.'}
git -C $output add -- F007
if($LASTEXITCODE){throw 'Immutable staging failed.'}
$pending=@(git -C $output diff --cached --name-only)
if($pending.Count-ne$count -or @($pending|Where-Object {-not$_.StartsWith('F007/')})){throw 'Exact new F007 scope required.'}
$authored=@('F007/README.md','F007/post-audit-decision.json','F007/harness/*.cs','F007/harness/*.csproj','F007/reproduce-analysis.mjs',
    'F007/historical-*.ps1','F007/historical-*.mjs','F007/issue-template.md','F007/pr-detail-template.md','F007/.gitattributes',
    'F007/authoritative-copy-manifest.json','F007/raw-file-copy-verification.json','F007/validation-commands.md')
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
if($LASTEXITCODE){throw 'Authored whitespace failed;never normalize raw evidence to silence it.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F007 staged $count
if($LASTEXITCODE){throw 'Actual staged bytes/scope differ.'}
git -C $output commit -q -m 'Publish qualified root-batch scaling trade-off and failed setup evidence' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Immutable evidence commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F007-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Immutable evidence push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F007 remote $count
if($LASTEXITCODE){throw 'Actual immutable remote blobs differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F007:$count immutable remote blobs verified;all favorable/adverse results and failed slot retained,no general app-speedup claim."
