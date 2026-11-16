using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Security.Cryptography;
using System.Text.Json;

var before = Capture(args[0]);
var after = Capture(args[1]);
var differences = before.Where(row =>
    !after.TryGetValue(row.Key, out var value) || value != row.Value).Select(row => row.Key).ToArray();
if (!before.Keys.SequenceEqual(after.Keys))
{
    throw new InvalidOperationException("Sample method inventories differ.");
}

var measuredMethods = before.Keys.Where(key => key.Contains("HashOwnerMeasurements.", StringComparison.Ordinal)).ToArray();
if (measuredMethods.Length < 4 || differences.Length != 0)
{
    throw new InvalidOperationException("The actual native caliper method bodies or referenced signatures differ.");
}

File.WriteAllText(args[2], JsonSerializer.Serialize(new
{
    methodCount = before.Keys.Count(key => !key.StartsWith("Metadata:", StringComparison.Ordinal)),
    metadataEntryCount = before.Keys.Count(key => key.StartsWith("Metadata:", StringComparison.Ordinal)),
    measuredMethodCount = measuredMethods.Length,
    measuredMethods,
    changedMethods = differences,
    before,
    after,
    boundary = "Actual PE method body IL, local signatures and exception regions. Whole sample PE/PDB identity may differ because the compiler incorporates changed owner reference identity; this is not a literal byte-identical native harness assertion.",
}, new JsonSerializerOptions { WriteIndented = true }));

Console.WriteLine($"Native PE evidence: {before.Count} methods; {measuredMethods.Length} caliper bodies identical; {differences.Length} other method changes.");

static SortedDictionary<string, string> Capture(string assemblyPath)
{
    using var stream = File.OpenRead(assemblyPath);
    using var pe = new PEReader(stream);
    var reader = pe.GetMetadataReader();
    var result = new SortedDictionary<string, string>(StringComparer.Ordinal);
    foreach (var handle in reader.AssemblyReferences)
    {
        var reference = reader.GetAssemblyReference(handle);
        result.Add($"Metadata:AssemblyRef:{System.Reflection.Metadata.Ecma335.MetadataTokens.GetToken(handle)}",
            JsonSerializer.Serialize(new
            {
                name = reader.GetString(reference.Name),
                reference.Version,
                culture = reader.GetString(reference.Culture),
                key = Convert.ToHexString(reader.GetBlobBytes(reference.PublicKeyOrToken)),
            }));
    }
    foreach (var handle in reader.TypeReferences)
    {
        var reference = reader.GetTypeReference(handle);
        result.Add($"Metadata:TypeRef:{System.Reflection.Metadata.Ecma335.MetadataTokens.GetToken(handle)}",
            JsonSerializer.Serialize(new
            {
                name = reader.GetString(reference.Name),
                space = reader.GetString(reference.Namespace),
                scope = System.Reflection.Metadata.Ecma335.MetadataTokens.GetToken(reference.ResolutionScope),
            }));
    }
    foreach (var handle in reader.MemberReferences)
    {
        var reference = reader.GetMemberReference(handle);
        result.Add($"Metadata:MemberRef:{System.Reflection.Metadata.Ecma335.MetadataTokens.GetToken(handle)}",
            JsonSerializer.Serialize(new
            {
                name = reader.GetString(reference.Name),
                parent = System.Reflection.Metadata.Ecma335.MetadataTokens.GetToken(reference.Parent),
                signature = Convert.ToHexString(reader.GetBlobBytes(reference.Signature)),
            }));
    }
    foreach (var typeHandle in reader.TypeDefinitions)
    {
        var type = reader.GetTypeDefinition(typeHandle);
        var name = TypeName(reader, typeHandle);
        foreach (var handle in type.GetFields())
        {
            var field = reader.GetFieldDefinition(handle);
            result.Add($"Metadata:Field:{name}.{reader.GetString(field.Name)}",
                JsonSerializer.Serialize(new
                {
                    attributes = field.Attributes.ToString(),
                    signature = Convert.ToHexString(reader.GetBlobBytes(field.Signature)),
                }));
        }
        foreach (var methodHandle in type.GetMethods())
        {
            var method = reader.GetMethodDefinition(methodHandle);
            var key = $"{name}.{reader.GetString(method.Name)}:{Convert.ToHexString(reader.GetBlobBytes(method.Signature))}";
            if (method.RelativeVirtualAddress == 0)
            {
                result.Add(key, "NoBody");
                continue;
            }

            var body = pe.GetMethodBody(method.RelativeVirtualAddress);
            var localSignature = body.LocalSignature.IsNil
                ? string.Empty
                : Convert.ToHexString(reader.GetBlobBytes(reader.GetStandaloneSignature(body.LocalSignature).Signature));
            var descriptor = JsonSerializer.Serialize(new
            {
                il = Convert.ToHexString(body.GetILBytes() ?? throw new InvalidOperationException("A present method body has no IL.")),
                body.MaxStack,
                body.LocalVariablesInitialized,
                localSignature,
                exceptions = body.ExceptionRegions.Select(region => new
                {
                    kind = region.Kind.ToString(),
                    region.TryOffset,
                    region.TryLength,
                    region.HandlerOffset,
                    region.HandlerLength,
                    region.FilterOffset,
                    catchToken = System.Reflection.Metadata.Ecma335.MetadataTokens.GetToken(region.CatchType),
                }),
            });
            result.Add(key, Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(descriptor))));
        }
    }

    return result;
}

static string TypeName(MetadataReader reader, TypeDefinitionHandle handle)
{
    var type = reader.GetTypeDefinition(handle);
    var owner = type.GetDeclaringType();

    return owner.IsNil
        ? $"{reader.GetString(type.Namespace)}.{reader.GetString(type.Name)}"
        : $"{TypeName(reader, owner)}+{reader.GetString(type.Name)}";
}
