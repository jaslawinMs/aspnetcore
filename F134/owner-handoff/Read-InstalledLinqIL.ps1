$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$file = 'C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26565.104\System.Linq.dll'
$stream = [IO.File]::OpenRead($file)
$pe = [System.Reflection.PortableExecutable.PEReader]::new($stream)
try
{
    $reader = [System.Reflection.Metadata.PEReaderExtensions]::GetMetadataReader($pe)
    function Resolve-MetadataToken
    {
        param([int] $Token)
        $row = $Token -band 0xffffff
        switch (($Token -shr 24) -band 0xff)
        {
            1
            {
                $type = $reader.GetTypeReference([System.Reflection.Metadata.Ecma335.MetadataTokens]::TypeReferenceHandle($row))
                return $reader.GetString($type.Namespace) + '.' + $reader.GetString($type.Name)
            }
            2
            {
                $type = $reader.GetTypeDefinition([System.Reflection.Metadata.Ecma335.MetadataTokens]::TypeDefinitionHandle($row))
                return $reader.GetString($type.Namespace) + '.' + $reader.GetString($type.Name)
            }
            6
            {
                $method = $reader.GetMethodDefinition([System.Reflection.Metadata.Ecma335.MetadataTokens]::MethodDefinitionHandle($row))
                return $reader.GetString($method.Name)
            }
            10
            {
                $member = $reader.GetMemberReference([System.Reflection.Metadata.Ecma335.MetadataTokens]::MemberReferenceHandle($row))
                $parent = Resolve-MetadataToken ([System.Reflection.Metadata.Ecma335.MetadataTokens]::GetToken($member.Parent))
                return $parent + '::' + $reader.GetString($member.Name)
            }
            27
            {
                $type = $reader.GetTypeSpecification([System.Reflection.Metadata.Ecma335.MetadataTokens]::TypeSpecificationHandle($row))
                $blob = $reader.GetBlobReader($type.Signature)
                $shape = $blob.ReadByte()
                if ($shape -eq 0x15)
                {
                    $null = $blob.ReadByte()
                    $coded = $blob.ReadCompressedInteger()
                    $table = switch ($coded -band 3) { 0 { 0x02000000 } 1 { 0x01000000 } 2 { 0x1b000000 } }
                    return (Resolve-MetadataToken ($table -bor ($coded -shr 2))) + '<generic>'
                }
                return 'TypeSpec:' + [Convert]::ToHexString($reader.GetBlobBytes($type.Signature))
            }
            43
            {
                $method = $reader.GetMethodSpecification([System.Reflection.Metadata.Ecma335.MetadataTokens]::MethodSpecificationHandle($row))
                return Resolve-MetadataToken ([System.Reflection.Metadata.Ecma335.MetadataTokens]::GetToken($method.Method))
            }
            default { return ('token:0x{0:x8}' -f $Token) }
        }
    }
    $enumerable = @($reader.TypeDefinitions | Where-Object {
        $definition = $reader.GetTypeDefinition($_)
        $reader.GetString($definition.Name) -eq 'Enumerable' -and $reader.GetString($definition.Namespace) -eq 'System.Linq'
    })
    if ($enumerable.Count -ne 1)
    {
        throw 'Ambiguous Enumerable definition.'
    }
    $methods = @($reader.GetTypeDefinition($enumerable[0]).GetMethods() | Where-Object {
        $definition = $reader.GetMethodDefinition($_)
        $parameters = @($definition.GetParameters() | Where-Object { $reader.GetParameter($_).SequenceNumber -gt 0 })
        $reader.GetString($definition.Name) -eq 'Any' -and $parameters.Count -eq 1
    })
    if ($methods.Count -ne 1)
    {
        throw 'Ambiguous one-parameter Enumerable.Any method.'
    }
    $method = $reader.GetMethodDefinition($methods[0])
    $body = [System.Reflection.Metadata.PEReaderExtensions]::GetMethodBody($pe, $method.RelativeVirtualAddress)
    $bytes = $body.GetILBytes()
    $opcodes = @{}
    foreach ($field in [Reflection.Emit.OpCodes].GetFields([Reflection.BindingFlags]'Public,Static'))
    {
        if ($field.FieldType -eq [Reflection.Emit.OpCode])
        {
            $code = $field.GetValue($null)
            $opcodes[([int]$code.Value -band 0xffff)] = $code
        }
    }
    $instructions = [Collections.Generic.List[object]]::new()
    $index = 0
    while ($index -lt $bytes.Length)
    {
        $offset = $index
        $value = [int]$bytes[$index++]
        if ($value -eq 0xfe)
        {
            $value = 0xfe00 -bor $bytes[$index++]
        }
        $code = $opcodes[$value]
        $operandType = $code.OperandType.ToString()
        $size = switch ($operandType)
        {
            'InlineNone' { 0 }
            { $_ -in @('ShortInlineBrTarget', 'ShortInlineI', 'ShortInlineVar') } { 1 }
            'InlineVar' { 2 }
            { $_ -in @('InlineI8', 'InlineR') } { 8 }
            'InlineSwitch' { 4 + 4 * [BitConverter]::ToInt32($bytes, $index) }
            default { 4 }
        }
        $member = $null
        $branchTarget = $null
        if ($operandType -in @('InlineMethod', 'InlineType', 'InlineField', 'InlineTok'))
        {
            $member = Resolve-MetadataToken ([BitConverter]::ToInt32($bytes, $index))
        }
        elseif ($operandType -eq 'ShortInlineBrTarget')
        {
            $delta = [int]$bytes[$index]
            if ($delta -ge 128) { $delta -= 256 }
            $branchTarget = $index + $size + $delta
        }
        elseif ($operandType -eq 'InlineBrTarget')
        {
            $branchTarget = $index + $size + [BitConverter]::ToInt32($bytes, $index)
        }
        $instructions.Add([ordered]@{ offset = $offset; opcode = $code.Name; member = $member; branchTarget = $branchTarget })
        $index += $size
    }
    [ordered]@{
        recordedUtc = [DateTime]::UtcNow.ToString('O')
        kind = 'static-installed-platform-PE-metadata-only'
        file = $file
        sha256 = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
        productVersion = [Diagnostics.FileVersionInfo]::GetVersionInfo($file).ProductVersion
        method = 'System.Linq.Enumerable.Any<TSource>(IEnumerable<TSource>)'
        methodRelativeVirtualAddress = $method.RelativeVirtualAddress
        ilHex = [Convert]::ToHexString($bytes)
        instructions = @($instructions)
        executedEnumerableAny = $false
        startedBuildTestOrHost = $false
        interpretationBoundary = 'PE metadata/IL inspection of the selected installed file only. No CLR load of this file, JIT, functional producer execution, timing or allocation observation is claimed.'
    } | ConvertTo-Json -Depth 9 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'evidence\installed-linq-static-il.json') -Encoding utf8
    $instructions | Select-Object -First 17 | Format-Table -AutoSize
}
finally
{
    $pe.Dispose()
    $stream.Dispose()
}
