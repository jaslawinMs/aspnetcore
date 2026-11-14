using System.Reflection;
using System.Reflection.Emit;

internal static class ActivationIL
{
    public static object Inspect(MethodInfo method)
    {
        var bytes = method.GetMethodBody()!.GetILAsByteArray()!;
        var opcodes = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field.FieldType == typeof(OpCode))
            .Select(field => (OpCode)field.GetValue(null)!)
            .ToDictionary(opcode => unchecked((ushort)opcode.Value));
        var calls = new List<object>();
        for (var position = 0; position < bytes.Length;)
        {
            var offset = position;
            var key = (ushort)bytes[position++];
            if (key == 0xfe)
            {
                key = (ushort)(0xfe00 | bytes[position++]);
            }
            var opcode = opcodes[key];
            if (opcode.OperandType is OperandType.InlineMethod)
            {
                var called = method.Module.ResolveMethod(BitConverter.ToInt32(bytes, position),
                    method.DeclaringType!.GetGenericArguments(), null)!;
                calls.Add(new
                {
                    Offset = offset,
                    OpCode = opcode.Name,
                    Type = called.DeclaringType!.FullName,
                    called.Name
                });
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
                throw new InvalidOperationException("IL operand extends beyond the target body.");
            }
        }
        return new
        {
            Type = method.DeclaringType!.FullName,
            method.Name,
            ILBytes = bytes.Length,
            ILHex = Convert.ToHexString(bytes),
            Calls = calls,
            Note = "Resolved closed ListValue Read IL, not native code, timing or whole-repository graph coverage."
        };
    }
}
