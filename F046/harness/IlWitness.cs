// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Buffers.Binary;
using System.Reflection;
using System.Reflection.Emit;
using System.Reflection.Metadata;
using System.Reflection.Metadata.Ecma335;
using System.Reflection.PortableExecutable;

namespace AutoPerf;

internal static class IlWitness
{
    private static readonly Dictionary<short, OperandType> Operands = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
        .Where(field => field.FieldType == typeof(OpCode))
        .Select(field => (OpCode)field.GetValue(null)!).ToDictionary(opcode => opcode.Value, opcode => opcode.OperandType);

    internal static void Run(HeaderAccess access)
    {
        using var image = File.OpenRead(access.Owner.Location);
        using var pe = new PEReader(image);
        var metadata = pe.GetMetadataReader();
        var references = new List<object>();
        var actualComputeHeaderCalls = 0;
        var actualBodies = 0;
        foreach (var handle in metadata.MethodDefinitions)
        {
            var definition = metadata.GetMethodDefinition(handle);
            if (definition.RelativeVirtualAddress == 0)
            {
                continue;
            }
            actualBodies++;
            var body = pe.GetMethodBody(definition.RelativeVirtualAddress).GetILBytes()
                ?? throw new InvalidOperationException("Executable method has no IL.");
            var position = 0;
            while (position < body.Length)
            {
                var instruction = position;
                var prefix = body[position++];
                var code = prefix == 0xFE ? unchecked((short)(0xFE00 | body[position++])) : (short)prefix;
                var operand = Operands[code];
                var length = operand switch
                {
                    OperandType.InlineNone => 0,
                    OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar => 1,
                    OperandType.InlineVar => 2,
                    OperandType.InlineI8 or OperandType.InlineR => 8,
                    OperandType.InlineSwitch => checked(4 + 4 * BinaryPrimitives.ReadInt32LittleEndian(body.AsSpan(position, 4))),
                    _ => 4
                };
                Evidence.Require(position + length <= body.Length, "Invalid IL operand boundary.");
                if (operand is OperandType.InlineMethod)
                {
                    var token = BinaryPrimitives.ReadInt32LittleEndian(body.AsSpan(position, 4));
                    var target = MetadataTokens.EntityHandle(token);
                    var matches = token == access.AppendMethod.MetadataToken;
                    if (target.Kind is HandleKind.MemberReference)
                    {
                        var member = metadata.GetMemberReference((MemberReferenceHandle)target);
                        if (metadata.GetString(member.Name) == "Append" && member.Parent.Kind is HandleKind.TypeReference)
                        {
                            var type = metadata.GetTypeReference((TypeReferenceHandle)member.Parent);
                            matches = metadata.GetString(type.Namespace) + "." + metadata.GetString(type.Name) == access.HeaderType.FullName;
                        }
                    }
                    if (matches)
                    {
                        var declaring = metadata.GetTypeDefinition(definition.GetDeclaringType());
                        var callerType = metadata.GetString(declaring.Namespace) + "." + metadata.GetString(declaring.Name);
                        var callerMethod = metadata.GetString(definition.Name);
                        var actualCall = code == OpCodes.Call.Value || code == OpCodes.Callvirt.Value;
                        if (actualCall && callerType == "Microsoft.AspNetCore.Server.HttpSys.Response" && callerMethod == "ComputeHeaders")
                        {
                            actualComputeHeaderCalls++;
                        }
                        references.Add(new { callerType, callerMethod, actualCall, actualIlOffset = instruction, actualTargetToken = token });
                    }
                }
                position += length;
            }
        }
        var isHttpSys = access.Owner.GetName().Name == "Microsoft.AspNetCore.Server.HttpSys";
        Evidence.Require(isHttpSys ? actualComputeHeaderCalls == 1 && references.Count == 1 : references.Count == 0,
            "The actual compiled shipping-owner Append edges differ from the inspected source.");
        Evidence.Write("compiled-shipping-owner-append-references", new
        {
            actualOwner = access.Owner.GetName().Name,
            actualOwnerPath = access.Owner.Location,
            actualAllManagedMethodBodiesInspected = actualBodies,
            actualAppendDefinitionToken = access.AppendMethod.MetadataToken,
            actualComputeHeaderCalls,
            actualReferences = references,
            actualCrossAssemblyReflectionOrNativeDispatchCompletenessClaimed = false
        });
    }
}
