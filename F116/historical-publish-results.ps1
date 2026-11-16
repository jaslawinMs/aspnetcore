$ErrorActionPreference='Stop'
$output=Join-Path $PSScriptRoot 'autoperf-published-results'
$count=[int](Get-Content (Join-Path $PSScriptRoot 'F116-immutable-file-count.txt') -Raw)
if ($count -ne @(Get-ChildItem (Join-Path $output 'F116') -Recurse -Force -File).Count) {throw 'Actual immutable capsule count changed.'}
if ((git -C $output branch --show-current).Trim() -cne 'autoperf-results' -or
    @(git -C $output status --porcelain|Where-Object {-not $_.StartsWith('?? F116/')})) {throw 'Only new F116 capsule permitted.'}
if ((git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$') {throw 'Only user fork permitted.'}
git -C $output add -- F116
if ($LASTEXITCODE) {throw 'Actual immutable staging failed.'}
$pending=@(git -C $output diff --cached --name-only)
if ($pending.Count -ne $count -or @($pending|Where-Object {-not $_.StartsWith('F116/')})) {throw 'Exact new F116 immutable scope required.'}
$authored=@('F116/README.md','F116/comparison-outcomes.md','F116/acceptance.json','F116/harness/*.cs','F116/harness/*.csproj',
    'F116/cold-probe/*.cs','F116/cold-probe/*.csproj','F116/cold-capture-amendment.json',
    'F116/reproduce-analysis.mjs','F116/verify-live-closure.mjs','F116/historical-*.ps1','F116/historical-*.mjs',
    'F116/.gitattributes','F116/authoritative-copy-manifest.json','F116/raw-file-copy-verification.json','F116/validation-commands.md')
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
if ($LASTEXITCODE) {throw 'Authored whitespace failed;never normalize raw evidence to silence it.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F116 staged $count
if ($LASTEXITCODE) {throw 'Actual staged bytes/scope differ.'}
git -C $output commit -q -m 'Publish bounded endpoint-port cache allocation evidence and all three comparisons' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE) {throw 'Actual immutable evidence commit failed.'}
git -C $output rev-parse HEAD|Set-Content (Join-Path $PSScriptRoot 'F116-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT='0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if ($LASTEXITCODE) {throw 'Actual immutable evidence push failed.'}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F116 remote $count
if ($LASTEXITCODE) {throw 'Actual remote immutable blobs differ.'}
if (@(git -C $output status --porcelain).Count) {throw 'Dedicated results checkout must be clean.'}
Write-Output "F116:$count immutable remote blobs verified;all controls/variation/preparation and cold-capture failures retained."
