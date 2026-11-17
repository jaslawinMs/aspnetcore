$ErrorActionPreference = 'Stop'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$count = [int](Get-Content (Join-Path $PSScriptRoot 'F014-immutable-file-count.txt') -Raw)
$copies = Get-Content (Join-Path $output 'F014\raw-file-copy-verification.json') -Raw | ConvertFrom-Json
if ($count -ne $copies.unique_authoritative_destinations + 4 -or
    $count -ne @(Get-ChildItem (Join-Path $output 'F014') -Recurse -Force -File).Count -or
    -not $copies.all_byte_identical -or -not $copies.copied_portable_audit_passed)
{
    throw 'Exact immutable count and copied-byte audit required.'
}
if ((git -C $output branch --show-current).Trim() -cne 'autoperf-results' -or
    @(git -C $output status --porcelain | Where-Object { -not $_.StartsWith('?? F014/') }))
{
    throw 'Only new F014 capsule permitted.'
}
if ((git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'Only user-fork writes permitted.'
}
git -C $output add -- F014
if ($LASTEXITCODE)
{
    throw 'Immutable staging failed.'
}
$pending = @(git -C $output diff --cached --name-only)
if ($pending.Count -ne $count -or @($pending | Where-Object { -not $_.StartsWith('F014/') }))
{
    throw 'Exact new F014 staging scope required.'
}
$authored = @('F014/README.md', 'F014/harness/*.cs', 'F014/harness/*.csproj', 'F014/reproduce-analysis.mjs',
    'F014/historical-*.ps1', 'F014/historical-*.mjs', 'F014/.gitattributes',
    'F014/authoritative-copy-manifest.json', 'F014/raw-file-copy-verification.json', 'F014/validation-commands.md')
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
if ($LASTEXITCODE)
{
    throw 'Authored whitespace failed; never normalize raw evidence to silence it.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F014 staged $count
if ($LASTEXITCODE)
{
    throw 'Actual staged bytes or scope differ.'
}
git -C $output commit -q -m 'Publish SignalR user-target snapshot rejection and original-only diagnostics' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE)
{
    throw 'Immutable evidence commit failed.'
}
git -C $output rev-parse HEAD | Set-Content (Join-Path $PSScriptRoot 'F014-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT = '0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if ($LASTEXITCODE)
{
    throw 'Immutable evidence push failed.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F014 remote $count
if ($LASTEXITCODE)
{
    throw 'Actual immutable remote blobs differ.'
}
if (@(git -C $output status --porcelain).Count)
{
    throw 'Dedicated results checkout must be clean.'
}
Write-Output "F014: $count immutable remote blobs verified; no shipping fix, performance PR or gain claim."
