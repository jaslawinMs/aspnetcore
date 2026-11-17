$ErrorActionPreference = 'Stop'
$output = Join-Path $PSScriptRoot 'autoperf-published-results'
$count = [int](Get-Content (Join-Path $PSScriptRoot 'F013-immutable-file-count.txt') -Raw)
$copies = Get-Content (Join-Path $output 'F013\raw-file-copy-verification.json') -Raw | ConvertFrom-Json
if ($count -ne $copies.unique_authoritative_destinations + 4 -or
    $count -ne @(Get-ChildItem (Join-Path $output 'F013') -Recurse -Force -File).Count -or
    -not $copies.all_byte_identical -or -not $copies.copied_portable_audit_passed)
{
    throw 'Exact immutable count and copied-byte audit required.'
}
if ((git -C $output branch --show-current).Trim() -cne 'autoperf-results' -or
    @(git -C $output status --porcelain | Where-Object { -not $_.StartsWith('?? F013/') }))
{
    throw 'Only new F013 capsule permitted.'
}
if ((git -C $output remote get-url origin).Trim() -inotmatch '^https://github\.com/jaslawinms/aspnetcore(?:\.git)?$')
{
    throw 'Only user-fork writes permitted.'
}
git -C $output add -- F013
if ($LASTEXITCODE)
{
    throw 'Immutable staging failed.'
}
$pending = @(git -C $output diff --cached --name-only)
if ($pending.Count -ne $count -or @($pending | Where-Object { -not $_.StartsWith('F013/') }))
{
    throw 'Exact new F013 staging scope required.'
}
$authored = @('F013/README.md', 'F013/harness/*.cs', 'F013/harness/*.csproj', 'F013/reproduce-analysis.mjs',
    'F013/historical-*.ps1', 'F013/historical-*.mjs', 'F013/.gitattributes',
    'F013/authoritative-copy-manifest.json', 'F013/raw-file-copy-verification.json', 'F013/validation-commands.md')
git -C $output -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol --no-pager diff --cached --check -- @authored
if ($LASTEXITCODE)
{
    throw 'Authored whitespace failed; never normalize raw evidence to silence it.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F013 staged $count
if ($LASTEXITCODE)
{
    throw 'Actual staged bytes or scope differ.'
}
git -C $output commit -q -m 'Publish targeted SignalR membership no-gain comparisons and native contract evidence' `
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`nCopilot-Session: a24edcfd-1bb9-4160-afce-6ba54b1b7f00"
if ($LASTEXITCODE)
{
    throw 'Immutable evidence commit failed.'
}
git -C $output rev-parse HEAD | Set-Content (Join-Path $PSScriptRoot 'F013-results-commit.txt') -Encoding ascii
$env:GIT_TERMINAL_PROMPT = '0'
git -C $output -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin autoperf-results
if ($LASTEXITCODE)
{
    throw 'Immutable evidence push failed.'
}
node (Join-Path $PSScriptRoot 'autoperf-verify-publication.mjs') F013 remote $count
if ($LASTEXITCODE)
{
    throw 'Actual immutable remote blobs differ.'
}
if (@(git -C $output status --porcelain).Count)
{
    throw 'Dedicated results checkout must be clean.'
}
Write-Output "F013: $count immutable remote blobs verified; two tested variants, three comparisons, no shipping fix or performance-win PR."
