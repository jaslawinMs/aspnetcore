$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F006-immutable-file-count.txt') -Raw)
if($count-ne@(Get-ChildItem (Join-Path $output 'F006') -Recurse -Force -File).Count){throw 'Exact immutable count changed.'}
if((git -C $output branch --show-current).Trim()-cne'autoperf-results' -or
    @(git -C $output status --porcelain|Where-Object {-not$_.StartsWith('?? F006/')})){throw 'Only fresh F006 capsule permitted.'}
if((git -C $output remote get-url origin).Trim()-inotmatch'^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user-fork writes permitted.'}
git -C $output add -- F006
if($LASTEXITCODE){throw 'Immutable staging failed.'}
$pending=@(git -C $output diff --cached --name-only)
if($pending.Count-ne$count -or @($pending|Where-Object {-not$_.StartsWith('F006/')})){throw 'Exact new F006 scope required.'}
$authored=@('F006/README.md','F006/post-audit-decision.json','F006/harness/*.cs','F006/harness/*.csproj','F006/reproduce-analysis.mjs',
    'F006/historical-*.ps1','F006/historical-*.mjs','F006/.gitattributes','F006/authoritative-copy-manifest.json','F006/raw-file-copy-verification.json','F006/validation-commands.md')
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
if($LASTEXITCODE){throw 'Authored whitespace failed;never normalize raw evidence to silence it.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F006 staged $count
if($LASTEXITCODE){throw 'Actual staged bytes/scope differ.'}
git -C $output commit -q -m 'Publish for-variable membership trade-offs and conservative no-gain evidence' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Immutable evidence commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F006-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Immutable evidence push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F006 remote $count
if($LASTEXITCODE){throw 'Actual remote immutable blobs differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F006:$count actual immutable remote blobs verified;all local wins/contrary cases retained,source restored,no PR."
