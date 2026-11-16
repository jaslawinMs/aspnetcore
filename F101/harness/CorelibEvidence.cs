using System.Reflection;
using System.Reflection.Emit;
using System.Security.Cryptography;

namespace AutoPerf;

internal static class CorelibEvidence
{
    private static readonly Dictionary<short, OpCode> Codes = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
        .Where(field => field.FieldType == typeof(OpCode))
        .Select(field => (OpCode)(field.GetValue(null) ?? throw new InvalidDataException("Missing opcode.")))
        .ToDictionary(code => code.Value);

    public static object Capture()
    {
        var reset = typeof(CancellationTokenSource).GetMethod(nameof(CancellationTokenSource.TryReset), Type.EmptyTypes)
            ?? throw new MissingMethodException(nameof(CancellationTokenSource.TryReset));
        var constructor = typeof(CancellationTokenSource).GetConstructor([typeof(TimeSpan), typeof(TimeProvider)])
            ?? throw new MissingMethodException("Public CTS TimeSpan/TimeProvider constructor.");
        var resetRows = Read(reset);
        var constructorRows = Read(constructor);
        var initializationCall = constructorRows.Where(row => row.Member is MethodBase method
            && method.DeclaringType == typeof(CancellationTokenSource) && method.Name == "InitializeWithTimer").ToArray();
        RuntimeBoundary.Require(initializationCall.Length == 1, "Actual public constructor timer initializer must resolve uniquely.");
        var initialization = (MethodBase)(initializationCall[0].Member
            ?? throw new InvalidDataException("Missing resolved timer initializer."));
        var initializationRows = Read(initialization);
        RuntimeBoundary.Require(resetRows.Any(row => row.Member is FieldInfo field && field.Name == "_everQueued")
            && resetRows.Any(row => row.Member is MethodBase method && method.Name == "Change"
                && method.DeclaringType?.Name == "TimerQueueTimer")
            && resetRows.Any(row => row.Member is MethodBase method && method.Name == "UnregisterAll"),
            "Actual measured reset timer/queued/registration implementation differs from the inspected rule.");
        RuntimeBoundary.Require(initializationRows.Any(row => row.Member is FieldInfo field
            && field.DeclaringType == typeof(TimeSpan) && field.Name == nameof(TimeSpan.Zero))
            && initializationRows.Any(row => row.Member is MethodBase method && method.DeclaringType == typeof(TimeSpan)
                && method.Name == "op_Equality"),
            "Actual measured constructor's exact-zero branch differs.");

        return new
        {
            corelib = typeof(object).Assembly.Location,
            sha256 = Evidence.Hash(typeof(object).Assembly.Location),
            informationalVersion = typeof(object).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
            reset = Describe(reset, resetRows),
            publicConstructor = Describe(constructor, constructorRows),
            constructorInitializer = Describe(initialization, initializationRows),
            boundary = "Read-only compiled method/operand metadata. No private object state read and no private method execution."
        };
    }

    private sealed record Instruction(int Offset, string Opcode, string Operand, MemberInfo? Member);

    private static object Describe(MethodBase method, List<Instruction> rows) => new
    {
        method = method.DeclaringType?.FullName + "::" + method,
        methodBodySha256 = Convert.ToHexString(SHA256.HashData(method.GetMethodBody()?.GetILAsByteArray()
            ?? throw new InvalidDataException("Missing actual managed method body."))),
        rows = rows.Select(row => new { row.Offset, row.Opcode, row.Operand }).ToArray()
    };

    private static List<Instruction> Read(MethodBase method)
    {
        var bytes = method.GetMethodBody()?.GetILAsByteArray()
            ?? throw new InvalidDataException("Missing actual managed IL.");
        var rows = new List<Instruction>();
        var cursor = 0;
        while (cursor < bytes.Length)
        {
            var offset = cursor;
            short value = bytes[cursor++];
            if (value == 0xfe)
            {
                value = unchecked((short)(0xfe00 | bytes[cursor++]));
            }
            var code = Codes[value];
            var operand = string.Empty;
            MemberInfo? member = null;
            var length = code.OperandType switch
            {
                OperandType.InlineNone => 0,
                OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar => 1,
                OperandType.InlineVar => 2,
                OperandType.InlineI8 or OperandType.InlineR => 8,
                OperandType.InlineSwitch => checked(4 + 4 * BitConverter.ToInt32(bytes, cursor)),
                _ => 4
            };
            if (length != 0)
            {
                RuntimeBoundary.Require(cursor + length <= bytes.Length, "Actual IL operand exceeds body.");
                operand = Convert.ToHexString(bytes.AsSpan(cursor, length));
                if (code.OperandType is OperandType.InlineMethod or OperandType.InlineField
                    or OperandType.InlineType or OperandType.InlineTok)
                {
                    member = method.Module.ResolveMember(BitConverter.ToInt32(bytes, cursor),
                        method.DeclaringType?.GetGenericArguments(), method.IsGenericMethod ? method.GetGenericArguments() : null);
                    operand = member?.DeclaringType?.FullName + "::" + member;
                }
            }
            rows.Add(new Instruction(offset, code.Name ?? throw new InvalidDataException("Missing opcode name."), operand, member));
            cursor += length;
        }

        return rows;
    }
}
