$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F010-immutable-file-count.txt') -Raw)
if($count-ne@(Get-ChildItem (Join-Path $output 'F010') -Recurse -Force -File).Count){throw 'Exact immutable count changed.'}
if((git -C $output branch --show-current).Trim()-cne'autoperf-results' -or
    @(git -C $output status --porcelain|Where-Object {-not$_.StartsWith('?? F010/')})){throw 'Only new F010 capsule permitted.'}
if((git -C $output remote get-url origin).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user-fork writes permitted.'}
git -C $output add -- F010
if($LASTEXITCODE){throw 'Immutable staging failed.'}
$pending=@(git -C $output diff --cached --name-only)
if($pending.Count-ne$count -or @($pending|Where-Object {-not$_.StartsWith('F010/')})){throw 'Exact new F010 scope required.'}
$authored=@('F010/README.md','F010/harness/*.cs','F010/harness/*.csproj','F010/shared/*.cs','F010/compatibility/*.cs','F010/compatibility/*.csproj',
    'F010/reproduce-analysis.mjs','F010/historical-*.ps1','F010/historical-*.mjs','F010/issue-template.md','F010/pr-detail-template.md','F010/.gitattributes',
    'F010/authoritative-copy-manifest.json','F010/raw-file-copy-verification.json','F010/validation-commands.md')
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
if($LASTEXITCODE){throw 'Authored whitespace failed;never normalize raw evidence to silence it.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F010 staged $count
if($LASTEXITCODE){throw 'Actual staged bytes/scope differ.'}
git -C $output commit -q -m 'Publish qualified existing-set claim-membership CPU tradeoff' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Immutable evidence commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F010-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Immutable evidence push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F010 remote $count
if($LASTEXITCODE){throw 'Actual immutable remote blobs differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F010:$count immutable remote blobs verified;all favorable/adverse results and failed preparation/readers retained."
