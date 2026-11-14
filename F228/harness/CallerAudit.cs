using System.Reflection;
using System.Reflection.Emit;
using System.Reflection.Metadata;
using System.Reflection.Metadata.Ecma335;
using System.Reflection.PortableExecutable;

internal static class CallerAudit
{
    public static object Scan(Assembly assembly)
    {
        const string targetName = "ResolveQueryParameterDescriptors";
        using var stream = File.OpenRead(assembly.Location);
        using var pe = new PEReader(stream);
        var reader = pe.GetMetadataReader();
        var opcodes = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field.FieldType == typeof(OpCode))
            .Select(field => (OpCode)field.GetValue(null)!)
            .ToDictionary(opcode => unchecked((ushort)opcode.Value));
        var references = new List<string>();
        var stringReferences = new List<string>();
        var bodies = 0;
        var bodylessMethods = 0;
        var methodOperands = 0;
        var methodTokens = 0;
        var stringOperands = 0;
        var targets = reader.MethodDefinitions.Where(handle =>
        {
            var definition = reader.GetMethodDefinition(handle);
            var type = reader.GetTypeDefinition(definition.GetDeclaringType());
            return reader.GetString(definition.Name) == targetName &&
                reader.GetString(type.Name) == "ServiceDescriptorHelpers" &&
                reader.GetString(type.Namespace) == "Grpc.Shared";
        }).ToArray();
        if (targets.Length != 1 || reader.GetGuid(reader.GetModuleDefinition().Mvid) != assembly.ManifestModule.ModuleVersionId)
        {
            throw new InvalidOperationException("The loaded owner and unique target metadata must match.");
        }

        string GetMethodName(EntityHandle handle)
        {
            return handle.Kind switch
            {
                HandleKind.MethodDefinition => reader.GetString(reader.GetMethodDefinition((MethodDefinitionHandle)handle).Name),
                HandleKind.MemberReference => reader.GetString(reader.GetMemberReference((MemberReferenceHandle)handle).Name),
                HandleKind.MethodSpecification => GetMethodName(reader.GetMethodSpecification((MethodSpecificationHandle)handle).Method),
                _ => throw new InvalidOperationException($"Unexpected method token kind: {handle.Kind}.")
            };
        }

        foreach (var handle in reader.MethodDefinitions)
        {
            var method = reader.GetMethodDefinition(handle);
            if (method.RelativeVirtualAddress == 0)
            {
                bodylessMethods++;
                continue;
            }
            var bytes = pe.GetMethodBody(method.RelativeVirtualAddress).GetILBytes()
                ?? throw new InvalidOperationException("A declared method body has no IL bytes.");
            bodies++;
            for (var position = 0; position < bytes.Length;)
            {
                var key = (ushort)bytes[position++];
                if (key == 0xfe)
                {
                    key = (ushort)(0xfe00 | bytes[position++]);
                }
                var opcode = opcodes[key];
                if (opcode.OperandType is OperandType.InlineMethod or OperandType.InlineTok)
                {
                    var tokenHandle = MetadataTokens.EntityHandle(BitConverter.ToInt32(bytes, position));
                    var isMethod = tokenHandle.Kind is HandleKind.MethodDefinition or HandleKind.MethodSpecification ||
                        (tokenHandle.Kind is HandleKind.MemberReference &&
                            reader.GetMemberReference((MemberReferenceHandle)tokenHandle).GetKind() is MemberReferenceKind.Method);
                    if (opcode.OperandType is OperandType.InlineMethod || isMethod)
                    {
                        if (opcode.OperandType is OperandType.InlineMethod)
                        {
                            methodOperands++;
                        }
                        else
                        {
                            methodTokens++;
                        }
                        if (GetMethodName(tokenHandle) == targetName)
                        {
                            references.Add($"{reader.GetString(method.Name)}:{opcode.Name}");
                        }
                    }
                }
                if (opcode.OperandType is OperandType.InlineString)
                {
                    stringOperands++;
                    var text = reader.GetUserString(MetadataTokens.UserStringHandle(BitConverter.ToInt32(bytes, position) & 0x00ffffff));
                    if (text.Contains(targetName, StringComparison.Ordinal))
                    {
                        stringReferences.Add($"{reader.GetString(method.Name)}:{text}");
                    }
                }
                position += opcode.OperandType switch
                {
                    OperandType.InlineNone => 0,
                    OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar => 1,
                    OperandType.InlineVar => 2,
                    OperandType.InlineI8 or OperandType.InlineR => 8,
                    OperandType.InlineSwitch => checked(4 + 4 * BitConverter.ToInt32(bytes, position)),
                    OperandType.InlineBrTarget or OperandType.InlineField or OperandType.InlineI or OperandType.InlineMethod or
                        OperandType.InlineSig or OperandType.InlineString or OperandType.InlineTok or OperandType.InlineType or
                        OperandType.ShortInlineR => 4,
                    _ => throw new InvalidOperationException($"Unexpected IL operand type: {opcode.OperandType}.")
                };
                if (position > bytes.Length)
                {
                    throw new InvalidOperationException("IL operand extends beyond the owning method body.");
                }
            }
        }
        if (references.Count != 0 || stringReferences.Count != 0)
        {
            throw new InvalidOperationException("Dormant-helper current owner references found; revisit the rejection.");
        }
        return new
        {
            Scope = assembly.FullName,
            Target = targetName,
            TargetMetadataToken = MetadataTokens.GetToken(targets.Single()),
            MethodDefinitions = reader.MethodDefinitions.Count,
            BodiesScanned = bodies,
            BodylessMethods = bodylessMethods,
            MetadataMethodOperandsRead = methodOperands,
            MetadataMethodTokenOperandsRead = methodTokens,
            MetadataStringOperandsRead = stringOperands,
            MethodOperandNameMatches = references,
            ExactNameStringReferences = stringReferences,
            UnresolvedMetadataOperands = 0,
            ExternalRuntimeDispatchValidated = false,
            ArbitraryExternalReflectionExcluded = false
        };
    }
}
