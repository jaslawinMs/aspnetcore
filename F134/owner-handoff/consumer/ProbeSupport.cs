using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AutoPerf.Characterization;

internal sealed class ProbeSupport
{
    private readonly PayloadManifest _manifest;
    private readonly HashSet<string> _reported = new(StringComparer.OrdinalIgnoreCase);

    private ProbeSupport(PayloadManifest manifest)
    {
        _manifest = manifest;
    }

    internal static ProbeSupport Load(string[] args, string findingId, params string[] requiredAssemblies)
    {
        Require(args.Length == 1, "Supply the coordinator-created payload.json path as the only argument.");
        var manifest = JsonSerializer.Deserialize<PayloadManifest>(
            File.ReadAllText(args[0]),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("The payload manifest is missing.");

        Require(manifest.FindingId == findingId, "The payload belongs to a different finding.");
        Require(Regex.IsMatch(manifest.SourceRevision, "^[0-9a-fA-F]{40}$"), "A full source revision is required.");
        Require(manifest.SourceBuildAttestation == "coordinator-attests-source-built", "Source-built provenance must be explicitly attested.");
        Require(Path.IsPathFullyQualified(manifest.AssembliesDirectory), "The source-built assembly directory must be absolute.");
        Require(Path.IsPathFullyQualified(manifest.SourceSnapshotPath), "The frozen source snapshot path must be absolute.");
        Require(HashFile(manifest.SourceSnapshotPath).Equals(manifest.SourceSha256, StringComparison.OrdinalIgnoreCase), "The frozen source snapshot hash changed.");

        var support = new ProbeSupport(manifest);
        foreach (var name in requiredAssemblies)
        {
            support.VerifyAssembly(Assembly.Load(new AssemblyName(name)));
        }

        Write(new
        {
            findingId,
            kind = "input-provenance",
            manifest.SourceRevision,
            manifest.SourceVariant,
            manifest.SourceFileRelativePath,
            manifest.SourceSha256,
            limitation = "Hashes prevent silent binary substitution; source-build origin is coordinator-attested, not proven by a file path or a binary hash.",
            execution = "untimed characterization; no elapsed-time or allocation measurements"
        });

        return support;
    }

    internal void VerifyLoadedSourceOwners()
    {
        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
        {
            var name = assembly.GetName().Name;
            if (name is not null &&
                (name == "Microsoft.AspNetCore" ||
                 name.StartsWith("Microsoft.AspNetCore.", StringComparison.Ordinal) ||
                 name.StartsWith("Microsoft.Extensions.", StringComparison.Ordinal) ||
                 name == "Microsoft.OpenApi" ||
                 name == "Microsoft.Net.Http.Headers"))
            {
                VerifyAssembly(assembly);
            }
        }
    }

    internal static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    internal static void Write(object value)
    {
        Console.WriteLine(JsonSerializer.Serialize(value));
    }

    internal static string HashFile(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream));
    }

    private void VerifyAssembly(Assembly assembly)
    {
        var name = assembly.GetName().Name ?? throw new InvalidOperationException("Unnamed assembly.");
        var fileName = name + ".dll";
        Require(_manifest.AssemblySha256.TryGetValue(fileName, out var expectedHash), "Assembly missing from payload manifest: " + fileName);
        Require(expectedHash is not null && Regex.IsMatch(expectedHash, "^[0-9a-fA-F]{64}$"), "Invalid expected assembly hash: " + fileName);
        var sourceFile = Path.Combine(_manifest.AssembliesDirectory, fileName);
        var loadedFile = assembly.Location;
        Require(loadedFile.Length != 0, "A physical source-built binary is required: " + fileName);
        var expected = expectedHash ?? throw new InvalidOperationException("Missing expected hash.");
        Require(HashFile(sourceFile).Equals(expected, StringComparison.OrdinalIgnoreCase), "Input binary changed: " + fileName);
        Require(HashFile(loadedFile).Equals(expected, StringComparison.OrdinalIgnoreCase), "Loaded binary does not match the source-built payload: " + fileName);

        if (_reported.Add(name))
        {
            Write(new
            {
                kind = "assembly-provenance",
                name,
                loadedFile,
                sourceFile,
                sha256 = expected,
                moduleVersionId = assembly.ManifestModule.ModuleVersionId,
                informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
            });
        }
    }

    private sealed record PayloadManifest(
        string FindingId,
        string SourceRevision,
        string SourceVariant,
        string SourceBuildAttestation,
        string SourceFileRelativePath,
        string SourceSnapshotPath,
        string SourceSha256,
        string AssembliesDirectory,
        Dictionary<string, string> AssemblySha256);
}
