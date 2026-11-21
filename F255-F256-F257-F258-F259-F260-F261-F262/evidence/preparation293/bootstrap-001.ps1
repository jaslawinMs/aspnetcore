$ErrorActionPreference = 'Stop'
$parent = [IO.Directory]::GetParent((Get-Location).Path).FullName
$names = [IO.Directory]::EnumerateFiles($parent) | ForEach-Object { [IO.Path]::GetFileName($_) } | Where-Object { $_ -match '(?i)policy|lease|ledger|hold|quiesc|registration-293' } | Sort-Object
$result = [ordered]@{ observedUtc = [DateTime]::UtcNow.ToString('o'); operation = 'Top-level governance filename discovery only; no recursion or source content'; names = @($names) }
$text = $result | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path (Get-Location) 'bootstrap-001.output.json'), $text, [Text.UTF8Encoding]::new($false))
[Console]::WriteLine($text)