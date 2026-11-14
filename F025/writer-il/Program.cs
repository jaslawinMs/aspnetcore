using System.Reflection;
using System.Reflection.Emit;
using System.Text.Json;

var method = typeof(Stream).GetMethod(nameof(Stream.WriteByte), [typeof(byte)])!;
var il = method.GetMethodBody()!.GetILAsByteArray()!;
var opcodes = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
    .Where(field => field.FieldType == typeof(OpCode))
    .Select(field => (OpCode)field.GetValue(null)!)
    .ToDictionary(opcode => unchecked((ushort)opcode.Value));
var instructions = new List<object>();
var byteArrayFound = false;
for (var offset = 0; offset < il.Length;)
{
    var start = offset;
    ushort value = il[offset++];
    if (value == 0xfe)
    {
        value = (ushort)(0xfe00 | il[offset++]);
    }
    var opcode = opcodes[value];
    string? operand = null;
    var size = opcode.OperandType switch
    {
        OperandType.InlineNone => 0,
        OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar => 1,
        OperandType.InlineVar => 2,
        OperandType.InlineI8 or OperandType.InlineR => 8,
        OperandType.InlineSwitch => 4 + 4 * BitConverter.ToInt32(il, offset),
        _ => 4,
    };
    if (opcode == OpCodes.Newarr)
    {
        var type = method.Module.ResolveType(BitConverter.ToInt32(il, offset));
        operand = type.FullName;
        byteArrayFound |= type == typeof(byte);
    }
    instructions.Add(new { offset = start, opcode = opcode.Name, operand });
    offset += size;
}
Console.WriteLine(JsonSerializer.Serialize(new
{
    runtime = Environment.Version.ToString(),
    runtime_source_revision = "dfd6ac738610ea05f42e704be82b386e71052e12",
    runtime_source_public_lookup = "GitHub returned 404 for the installed revision; actual installed method IL inspected instead.",
    assembly = typeof(Stream).Assembly.GetName().Name,
    mvid = typeof(Stream).Module.ModuleVersionId,
    method = "System.IO.Stream.WriteByte(System.Byte)",
    allocates_byte_array_in_il = byteArrayFound,
    instructions,
    bson_version = "1.0.2",
    bson_writer_url = "https://github.com/JamesNK/Newtonsoft.Json.Bson/blob/1.0.2/Src/Newtonsoft.Json.Bson/BsonBinaryWriter.cs",
}));

return byteArrayFound ? 0 : 1;
