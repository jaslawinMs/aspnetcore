$ErrorActionPreference = 'Stop'
$phasePath286 = $PSCommandPath
. (Join-Path $PSScriptRoot 'source-support-286.ps1')
$commit = 'd3483989953ae3cccd773aea5ea04cb0c7198531'
$pattern = 'class UserManagerSpecificationTestBase'
$arguments = @('grep', '-l', '-z', '--fixed-strings', '-e', $pattern, $commit, '--', 'src/Identity')
$result = Invoke-ReadOnlyGit286 11 $arguments ([byte[]]::new(0)) $phasePath286 'GO286 sole exact-class-identifier filenames-only discovery in observed268Default Identity; no body output'
if ($result.receipt.exitCode -ne 0)
{
    throw 'The sole filename discovery did not succeed; no retry or raw source request.'
}
$raw = $result.stdoutBytes
if ($raw.Length -eq 0 -or $raw[$raw.Length - 1] -ne 0)
{
    throw 'Filename discovery was empty or lacked exact NUL framing; stop.'
}
$names = @([Text.UTF8Encoding]::new($false, $true).GetString($raw).Split([char]0) | Where-Object { $_.Length -gt 0 })
$prefix = $commit + ':'
$paths = @(
    foreach ($name in $names)
    {
        if (-not $name.StartsWith($prefix, [StringComparison]::Ordinal))
        {
            throw 'Unexpected immutable commit prefix in filenames-only output.'
        }
        $path = $name.Substring($prefix.Length)
        if (-not $path.StartsWith('src/Identity/', [StringComparison]::Ordinal) -or
            -not $path.EndsWith('.cs', [StringComparison]::Ordinal) -or
            $path -match '[:\\\r\n]' -or $path.Contains('/../'))
        {
            throw 'Unexpected filename outside the approved Identity C# scope.'
        }
        $path
    }
)
$unique = @($paths | Sort-Object -Unique)
$prior = [IO.File]::ReadAllText((Join-Path (Join-Path $Par286 'finding-F234-F235-279') 'ROLE-BINDINGS-279.json')) | ConvertFrom-Json
if ($paths.Count -ne 1 -or $unique.Count -ne 1 -or
    @($prior.cumulativeBodyInventory | Where-Object { $_.path -ceq $unique[0] }).Count -ne 0)
{
    Write-FreshJson286 (Join-Path $Out286 'DISCOVERY-NOT-UNIQUE-286-001.json') @{
        rawFilenames = $names
        parsedPaths = $paths
        uniquePaths = $unique
        priorBodyAlreadyPresent = @($prior.cumulativeBodyInventory | Where-Object { $_.path -cin $unique }).Count
        noBodyRequestAuthorized = $true
    }
    throw 'Unique NEW actual source path was not established; stop with honest gap.'
}
Write-FreshJson286 (Join-Path $Out286 'DISCOVERY-286-001.json') ([ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    role = 'observed268Default'
    commit = $commit
    scope = 'src/Identity'
    exactLiteral = $pattern
    outputMode = 'git grep -l -z --fixed-strings; filenames only, no source lines/snippets'
    exactNulFraming = $true
    rawFilenames = $names
    uniqueActualNewPath = $unique[0]
    root = $result.root
    rawStdoutSha256 = Get-BytesHash286 $raw
    uniqueFilenameIsNotFactoryBehaviorProof = $true
    allowedNextRequest = 'One whole file at this same exact path in each existing pinned role, in one two-member raw batch; no alternative path or retry.'
})
Write-Host ('DISCOVERY286_UNIQUE_NEW_PATH=' + $unique[0])
Write-Host 'DISCOVERY286_BOUNDARY=metadata only;1new/11aggregate roots;one2member batch remains'
