$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$sourcePath = Join-Path $base 'analyze_captures_269_v1.ps1'
$raw = [IO.File]::ReadAllBytes($sourcePath)
$text = [Text.Encoding]::UTF8.GetString($raw)
$changes = @(
    @('''analysis-observation''', '''analysis-v2-observation'''),
    @('[DateTime]::Parse($outer.childCreationUtc).ToUniversalTime().ToFileTimeUtc()', '([DateTime]$outer.childCreationUtc).ToUniversalTime().ToFileTimeUtc()'),
    @('''whole-source-bindings.json''', '''whole-source-bindings-v2.json'''),
    @('''all-git-object-bindings.json''', '''all-git-object-bindings-v2.json'''),
    @('''role-byte-comparison.json''', '''role-byte-comparison-v2.json'''),
    @('''source-test-inventory.json''', '''source-test-inventory-v2.json'''),
    @('''source-process-summary.json''', '''source-process-summary-v2.json'''),
    @('''analysis-result.json''', '''analysis-result-v2.json'''),
    @('@($sources)', '$sources.ToArray()'),
    @('@($objects)', '$objects.ToArray()'),
    @('@($pairs)', '$pairs.ToArray()'),
    @('@($checksumRows)', '$checksumRows.ToArray()'),
    @('@($runRows)', '$runRows.ToArray()'),
    @('@($commands)', '$commands.ToArray()')
)
$applied = @()
foreach ($change in $changes)
{
    $count = [regex]::Matches($text, [regex]::Escape($change[0])).Count
    if ($count -ne 1)
    {
        throw "Expected one exact derivation seam, found $count"
    }
    $text = $text.Replace($change[0], $change[1])
    $applied += @{old = $change[0]; replacement = $change[1]; exactOccurrences = $count}
}
$generated = Join-Path $base 'analyze_captures_269_v2.executed.ps1'
$bytes = [Text.Encoding]::UTF8.GetBytes($text)
$stream = [IO.File]::Open($generated, [IO.FileMode]::CreateNew)
try { $stream.Write($bytes) } finally { $stream.Dispose() }
$tokens = $null
$errors = $null
$null = [Management.Automation.Language.Parser]::ParseFile($generated, [ref]$tokens, [ref]$errors)
$receipt = @{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    preservedFailedInput = 'analyze_captures_269_v1.ps1'
    inputSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($raw))
    generatedExecutedHelper = 'analyze_captures_269_v2.executed.ps1'
    generatedSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
    changes = $applied
    parserErrors = @($errors | ForEach-Object { $_.ToString() })
    correction = 'ConvertFrom-Json already creates a DateTime. Direct DateTime casting preserves its UTC creation identity and 100ns precision; reparsing its culture-formatted string had changed timezone and discarded fractional seconds. All nine existing source root identities were independently shown to match by direct casting. Only artifact analysis is resumed; no source command is replayed.'
    listMaterialization = 'Use explicit generic-list ToArray calls for deterministic artifact serialization.'
    previousFailurePreserved = @('analysis-observation', 'analysis.outer.stdout.raw.bin', 'analysis.outer.stderr.raw.bin', 'analysis.outer-wait.json')
}
$receiptBytes = [Text.Encoding]::UTF8.GetBytes(($receipt | ConvertTo-Json -Depth 20) + "`n")
$stream = [IO.File]::Open((Join-Path $base 'analysis-v2-derivation.json'), [IO.FileMode]::CreateNew)
try { $stream.Write($receiptBytes) } finally { $stream.Dispose() }
if ($errors.Count -ne 0)
{
    throw 'Derived artifact analyzer has parse errors; retained and not executed'
}
& $generated
exit $LASTEXITCODE
