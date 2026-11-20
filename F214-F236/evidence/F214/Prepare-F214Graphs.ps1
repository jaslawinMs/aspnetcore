$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$native = Join-Path $PSScriptRoot 'Invoke-F214Native.ps1'
$git = (Get-Command git -CommandType Application).Source
$reserved = 'C:\src\aspnetcore'
$original = 'C:\src\ap-F214-o195'
$default = 'C:\src\ap-F214-d195'
$defaultPin = (Get-Content -LiteralPath 'upstream\default-commit.json' -Raw | ConvertFrom-Json).sha

if ((Test-Path -LiteralPath $original) -or (Test-Path -LiteralPath $default))
{
    throw 'At least one requested fresh F214 graph already exists; refusing reuse or overwrite.'
}

@('.git\HEAD', '.git\index', '.git\refs\heads\autoperf\F145-hoist-large-response-utf8-encoding') |
    ForEach-Object {
        $path = Join-Path $reserved $_
        if (Test-Path -LiteralPath $path)
        {
            [ordered]@{ path = $path; sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
        }
    } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath 'reserved-before.hashes.json' -Encoding utf8

& $native -Executable $git -Arguments @('--no-optional-locks', '--no-pager', '-C', $reserved, 'status', '--porcelain=v1', '--untracked-files=all') -WorkingDirectory $PSScriptRoot -ReceiptName '001-reserved-status-before'
& $native -Executable $git -Arguments @('--no-optional-locks', '--no-pager', '-C', $reserved, 'rev-parse', 'HEAD') -WorkingDirectory $PSScriptRoot -ReceiptName '002-reserved-head-before'
& $native -Executable $git -Arguments @('-c', 'core.longpaths=true', 'clone', '--quiet', '--shared', '--no-checkout', $reserved, $original) -WorkingDirectory $PSScriptRoot -ReceiptName '003-clone-original'
& $native -Executable $git -Arguments @('-c', 'core.longpaths=true', '-C', $original, 'checkout', '--quiet', '--detach', '37e809ead5824bc753a1c3d56f11615bdb1296c5') -WorkingDirectory $PSScriptRoot -ReceiptName '004-checkout-original'
& $native -Executable $git -Arguments @('-c', 'core.longpaths=true', 'clone', '--quiet', '--shared', '--no-checkout', $reserved, $default) -WorkingDirectory $PSScriptRoot -ReceiptName '005-clone-default'
& $native -Executable $git -Arguments @('-C', $default, 'cat-file', '-e', ($defaultPin + '^{commit}')) -WorkingDirectory $PSScriptRoot -ReceiptName '006-probe-default-object'
& $native -Executable $git -Arguments @('-c', 'core.longpaths=true', '-C', $default, 'checkout', '--quiet', '--detach', $defaultPin) -WorkingDirectory $PSScriptRoot -ReceiptName '007-checkout-default'

foreach ($graph in @($original, $default))
{
    if (Test-Path -LiteralPath (Join-Path $graph '.dotnet'))
    {
        throw 'Fresh source graph unexpectedly already contains .dotnet.'
    }
    New-Item -ItemType Junction -Path (Join-Path $graph '.dotnet') -Target (Join-Path $reserved '.dotnet') | Out-Null
}

[ordered]@{
    original = $original
    originalPin = '37e809ead5824bc753a1c3d56f11615bdb1296c5'
    default = $default
    defaultPin = $defaultPin
    sourceGraphIsolation = 'Independent .git directories and indexes; read-only object alternates, not reserved worktree registration.'
    sdkCache = 'Private .dotnet junctions reference the existing reserved SDK cache; no source/build/test output from another finding is reused.'
    comparisonAuthorizations = 0
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath 'private-graphs.json' -Encoding utf8
