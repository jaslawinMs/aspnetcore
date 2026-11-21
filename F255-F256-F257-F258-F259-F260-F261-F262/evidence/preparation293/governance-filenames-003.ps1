$ErrorActionPreference = 'Stop'
$parent = [IO.Directory]::GetParent((Get-Location).Path).FullName
$sessionFiles = [IO.Directory]::GetParent($parent).FullName
$result = [ordered]@{
    observedUtc = [DateTime]::UtcNow.ToString('o')
    operation = 'Nonrecursive governance directory/filename discovery only'
    sessionDirectoryNames = @([IO.Directory]::EnumerateDirectories($sessionFiles) | ForEach-Object { [IO.Path]::GetFileName($_) } | Where-Object { $_ -match '(?i)lease|ledger|campaign|handoff|registry|control|autoperf|timing|lock' } | Sort-Object)
    parentFileNames = @([IO.Directory]::EnumerateFiles($parent) | ForEach-Object { [IO.Path]::GetFileName($_) } | Where-Object { $_ -match '(?i)outer|pending|progress|ledger|state|handoff|protocol|readme|coordin|gateway|lease|registry' } | Sort-Object)
    parentDirectoryNames = @([IO.Directory]::EnumerateDirectories($parent) | ForEach-Object { [IO.Path]::GetFileName($_) } | Where-Object { $_ -match '(?i)lease|ledger|campaign|registry|control|timing|lock' } | Sort-Object)
}
$text = $result | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path (Get-Location) 'governance-filenames-003.output.json'), $text, [Text.UTF8Encoding]::new($false))
[Console]::WriteLine($text)