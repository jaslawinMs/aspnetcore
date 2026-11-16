$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F118-immutable-file-count.txt') -Raw)
if($count -ne @(Get-ChildItem (Join-Path $output 'F118') -Recurse -Force -File).Count){throw 'Actual immutable capsule count changed.'}
if((git -C $output branch --show-current).Trim() -cne 'autoperf-results' -or
    @(git -C $output status --porcelain|Where-Object {-not $_.StartsWith('?? F118/')})){throw 'Only new F118 capsule permitted.'}
if((git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$'){throw 'Only user fork permitted.'}
git -C $output add -- F118
if($LASTEXITCODE){throw 'Actual immutable staging failed.'}
$pending=@(git -C $output diff --cached --name-only)
if($pending.Count -ne $count -or @($pending|Where-Object {-not $_.StartsWith('F118/')})){throw 'Exact new F118 immutable scope required.'}
$authored=@('F118/README.md','F118/comparison-outcomes.md','F118/acceptance.json','F118/harness/*.cs','F118/harness/*.csproj',
    'F118/reproduce-analysis.mjs','F118/verify-live-closure.mjs','F118/historical-*.ps1','F118/historical-*.mjs',
    'F118/.gitattributes','F118/authoritative-copy-manifest.json','F118/raw-file-copy-verification.json','F118/validation-commands.md')
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
if($LASTEXITCODE){throw 'Authored whitespace failed;never normalize raw evidence to silence it.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F118 staged $count
if($LASTEXITCODE){throw 'Actual staged bytes/scope differ.'}
git -C $output commit -q -m 'Publish URL content builder allocation evidence and all three comparisons' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if($LASTEXITCODE){throw 'Actual immutable evidence commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F118-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if($LASTEXITCODE){throw 'Actual immutable evidence push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F118 remote $count
if($LASTEXITCODE){throw 'Actual remote immutable blobs differ.'}
if(@(git -C $output status --porcelain).Count){throw 'Dedicated results checkout must be clean.'}
Write-Output "F118:$count immutable remote blobs verified;all controls/variation/preparation failures retained."
