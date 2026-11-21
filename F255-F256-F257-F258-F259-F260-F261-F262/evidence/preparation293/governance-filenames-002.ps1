$ErrorActionPreference = 'Stop'
$sessionFiles = [IO.Directory]::GetParent([IO.Directory]::GetParent((Get-Location).Path).FullName).FullName
$runs = Join-Path $sessionFiles 'autoperf-runs'
$result = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    operation = 'Nonrecursive governance filename discovery in the explicit session files/runs roots only'
    sessionFileNames = @([IO.Directory]::EnumerateFiles($sessionFiles) | ForEach-Object { [IO.Path]::GetFileName($_) } | Where-Object { $_ -match '(?i)ledger|remaining|findings|results|lease|queue|state|finaliz' } | Sort-Object)
    runsFileNames = @([IO.Directory]::EnumerateFiles($runs) | ForEach-Object { [IO.Path]::GetFileName($_) } | Sort-Object)
    runsDirectoryNames = @([IO.Directory]::EnumerateDirectories($runs) | ForEach-Object { [IO.Path]::GetFileName($_) } | Where-Object { $_ -match '(?i)lease|lock' } | Sort-Object)
}
$text = $result | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path (Get-Location) 'governance-filenames-002.output.json'), $text, [Text.UTF8Encoding]::new($false))
[Console]::WriteLine($text)