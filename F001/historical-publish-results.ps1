$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F001-immutable-file-count.txt') -Raw)
if($count -ne @(Get-ChildItem (Join-Path $output 'F001') -Recurse -Force -File).Count){throw 'Actual immutable count changed.'}
if((git -C $output branch --show-current).Trim() -cne 'autoperf-results' -or
    @(git -C $output status --porcelain|Where-Object {-not $_.StartsWith('?? F001/')})){throw 'Only new F001 capsule permitted.'}
if((git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user fork permitted.'}
git -C $output add -- F001
if($LASTEXITCODE){throw 'Actual immutable staging failed.'}
$pending=@(git -C $output diff --cached --name-only)
if($pending.Count -ne $count -or @($pending|Where-Object {-not $_.StartsWith('F001/')})){throw 'Exact new immutable F001 scope required.'}
$authored=@('F001/README.md','F001/final-evaluation.json','F001/harness/*.cs','F001/harness/*.csproj','F001/reproduce-analysis.mjs',
    'F001/historical-*.ps1','F001/historical-*.mjs','F001/.gitattributes','F001/authoritative-copy-manifest.json',
    'F001/raw-file-copy-verification.json','F001/validation-commands.md')
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
if($LASTEXITCODE){throw 'Authored whitespace failed;never normalize raw evidence to silence it.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F001 staged $count
if($LASTEXITCODE){throw 'Actual staged bytes/scope differ.'}
git -C $output commit -q -m 'Publish original WebTransport shutdown evidence without a speculative optimization' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Actual immutable evidence commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F001-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Actual immutable evidence push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F001 remote $count
if($LASTEXITCODE){throw 'Actual remote immutable blobs differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F001:$count immutable remote blobs verified;rejected/unestablished proposal,no performance PR."
