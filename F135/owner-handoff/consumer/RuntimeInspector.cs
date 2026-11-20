using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;

var method = typeof(Enumerable).GetMethods(BindingFlags.Public | BindingFlags.Static)
    .Single(method => method.Name == nameof(Enumerable.Any) && method.GetParameters().Length == 1)
    .MakeGenericMethod(typeof(KeyValuePair<string, string>));
var il = method.GetMethodBody()!.GetILAsByteArray()!;
var opcodes = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
    .Where(field => field.FieldType == typeof(OpCode))
    .Select(field => (OpCode)field.GetValue(null)!)
    .ToDictionary(code => unchecked((ushort)code.Value));
var instructions = new List<object>();
for (var index = 0; index < il.Length;)
{
    var offset = index;
    ushort value = il[index++];
    if (value == 0xfe)
    {
        value = (ushort)(0xfe00 | il[index++]);
    }
    var opcode = opcodes[value];
    object? operand = null;
    switch (opcode.OperandType)
    {
        case OperandType.InlineNone:
            break;
        case OperandType.ShortInlineBrTarget:
            operand = index + 1 + (sbyte)il[index];
            index++;
            break;
        case OperandType.ShortInlineI:
        case OperandType.ShortInlineVar:
            operand = il[index++];
            break;
        case OperandType.InlineVar:
            operand = BitConverter.ToUInt16(il, index);
            index += 2;
            break;
        case OperandType.InlineBrTarget:
            operand = index + 4 + BitConverter.ToInt32(il, index);
            index += 4;
            break;
        case OperandType.InlineI:
            operand = BitConverter.ToInt32(il, index);
            index += 4;
            break;
        case OperandType.InlineI8:
            operand = BitConverter.ToInt64(il, index);
            index += 8;
            break;
        case OperandType.ShortInlineR:
            operand = BitConverter.ToSingle(il, index);
            index += 4;
            break;
        case OperandType.InlineR:
            operand = BitConverter.ToDouble(il, index);
            index += 8;
            break;
        case OperandType.InlineString:
            operand = method.Module.ResolveString(BitConverter.ToInt32(il, index));
            index += 4;
            break;
        case OperandType.InlineMethod:
        case OperandType.InlineField:
        case OperandType.InlineType:
        case OperandType.InlineTok:
            var token = BitConverter.ToInt32(il, index);
            var member = method.Module.ResolveMember(token, null, method.GetGenericArguments())!;
            operand = new { token = token.ToString("X8"), declaringType = member.DeclaringType?.ToString(), member = member.ToString() };
            index += 4;
            break;
        default:
            throw new InvalidOperationException("Unexpected bounded Any IL operand: " + opcode.OperandType);
    }
    instructions.Add(new { offset, opcode = opcode.Name, operand });
}
var assembly = method.Module.Assembly;
using var stream = File.OpenRead(assembly.Location);
var result = new
{
    runtime = RuntimeInformation.FrameworkDescription,
    systemLinq = new
    {
        path = assembly.Location,
        informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion,
        mvid = assembly.ManifestModule.ModuleVersionId,
        sha256 = Convert.ToHexString(SHA256.HashData(stream))
    },
    method = method.ToString(),
    dictionaryImplementsGenericCollection = typeof(ICollection<KeyValuePair<string, string>>).IsAssignableFrom(typeof(Dictionary<string, string>)),
    ilSha256 = Convert.ToHexString(SHA256.HashData(il)),
    ilHex = Convert.ToHexString(il),
    instructions,
    interpretationBoundary = "Inspection of the actually selected runtime IL, not JIT disassembly, execution of Any, an enumeration/allocation count, a latency measurement, or a performance verdict."
};
File.WriteAllText(args[0], JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine(JsonSerializer.Serialize(new { result.runtime, result.dictionaryImplementsGenericCollection, instructions = instructions.Count, instrumentation = "none" }));
