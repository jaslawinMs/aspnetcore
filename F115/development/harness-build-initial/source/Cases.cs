namespace AutoPerf;

internal enum Mode
{
    Direct, Get, Traverse, Patch
}
internal enum Target
{
    Int, Long, Decimal, Guid, Struct, NullableValue, NullableNull, String, Reference, Preboxed, JsonValue, JsonNull, Model
}
internal sealed record Spec(string Label, Mode Mode, Target Target, int Index = 0, string Patch = "");

internal static class Cases
{
    internal static readonly Spec[] All =
    [
        new("ReadInt", Mode.Direct, Target.Int),
        new("ReadLong", Mode.Direct, Target.Long),
        new("ReadDecimal", Mode.Direct, Target.Decimal),
        new("ReadGuid", Mode.Direct, Target.Guid),
        new("ReadMutableStruct", Mode.Direct, Target.Struct),
        new("ReadNullableValue", Mode.Direct, Target.NullableValue),
        new("ReadNullableNull", Mode.Direct, Target.NullableNull, 1),
        new("ReadString", Mode.Direct, Target.String),
        new("ReadReference", Mode.Direct, Target.Reference),
        new("ReadPreboxedObject", Mode.Direct, Target.Preboxed),
        new("ReadJsonArrayValue", Mode.Direct, Target.JsonValue),
        new("ReadJsonArrayNull", Mode.Direct, Target.JsonNull, 1),
        new("GetInt", Mode.Get, Target.Int),
        new("GetNullableValue", Mode.Get, Target.NullableValue),
        new("GetNullableNull", Mode.Get, Target.NullableNull, 1),
        new("GetString", Mode.Get, Target.String),
        new("GetJsonArray", Mode.Get, Target.JsonValue),
        new("TraverseStruct", Mode.Traverse, Target.Struct),
        Patch("PatchTestInt", """[{"op":"test","path":"/Ints/0","value":731}]"""),
        Patch("PatchTestInt8", "[" + string.Join(',', Enumerable.Repeat("""{"op":"test","path":"/Ints/0","value":731}""", 8)) + "]"),
        Patch("PatchCopyInt", """[{"op":"copy","from":"/Ints/0","path":"/CopiedInt"}]"""),
        Patch("PatchTestNullableValue", """[{"op":"test","path":"/Nullable/0","value":731}]"""),
        Patch("PatchTestNullableNull", """[{"op":"test","path":"/Nullable/1","value":null}]"""),
        Patch("PatchTestStructMember", """[{"op":"test","path":"/Structs/0/Value","value":731}]"""),
        Patch("PatchTestReferenceMember", """[{"op":"test","path":"/References/0/Value","value":731}]"""),
        Patch("PatchTestJsonArrayMember", """[{"op":"test","path":"/Nodes/0/Value","value":731}]"""),
        Patch("PatchTestScalar", """[{"op":"test","path":"/Scalar","value":731}]"""),
        Patch("PatchCopyString", """[{"op":"copy","from":"/Strings/0","path":"/CopiedString"}]""")
    ];

    private static Spec Patch(string label, string json) => new(label, Mode.Patch, Target.Model, Patch: json);
}
