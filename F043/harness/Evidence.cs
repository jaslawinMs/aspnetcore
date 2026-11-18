// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Buffers.Binary;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Razor;

namespace AutoPerf;

internal static class Evidence
{
    private static readonly JsonSerializerOptions Options = new() { WriteIndented = true };
    private static int _sequence;
    internal static readonly object InitialSettings = SettingsPreservingEmitToolchain.ReadSettings();
    internal static string StateDirectory { get; set; } = string.Empty;

    internal static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    internal static string Compact(object value) => JsonSerializer.Serialize(value);

    internal static void Write(string kind, object value)
    {
        using var stream = new FileStream(Path.Combine(StateDirectory, $"{Interlocked.Increment(ref _sequence):D4}-{kind}.json"), FileMode.CreateNew);
        JsonSerializer.Serialize(stream, value, Options);
    }

    internal static void VerifyImage(string manifestPath)
    {
        using var document = JsonDocument.Parse(File.ReadAllBytes(manifestPath));
        var files = document.RootElement.GetProperty("files").EnumerateArray().ToArray();
        var actual = Directory.GetFiles(AppContext.BaseDirectory, "*", SearchOption.AllDirectories)
            .Select(path => Path.GetRelativePath(AppContext.BaseDirectory, path).Replace('\\', '/')).Order().ToArray();
        Require(files.Length > 10 && actual.SequenceEqual(files.Select(file => file.GetProperty("path").GetString()!).Order()),
            "Require exactly the complete frozen consumer image.");
        foreach (var file in files)
        {
            var relative = file.GetProperty("path").GetString()!;
            Require(Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, relative))))
                == file.GetProperty("sha256").GetString(), $"Frozen image mismatch: {relative}");
        }
        Write("verified-image", new { actualEntries = files.Length, actualEveryEntryVerified = true });
    }

    internal static void VerifySources(string manifestPath, string sourceRoot)
    {
        using var document = JsonDocument.Parse(File.ReadAllBytes(manifestPath));
        var selected = document.RootElement.GetProperty("sourceFiles").EnumerateArray().ToArray();
        Require(selected.Length == 7, "Require all seven predeclared selected owner/test/project inputs.");
        var owner = typeof(RazorPage).Assembly;
        var location = owner.Location;
        Require(Path.GetFullPath(Path.GetDirectoryName(location)!) == Path.GetFullPath(AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar)),
            "The actual Razor owner must load from the frozen source-built image.");
        using var pdb = File.OpenRead(Path.ChangeExtension(location, ".pdb"));
        using var provider = MetadataReaderProvider.FromPortablePdbStream(pdb);
        var reader = provider.GetMetadataReader();
        using var image = File.OpenRead(location);
        using var pe = new PEReader(image);
        var entry = pe.ReadDebugDirectory().Single(item => item.Type == DebugDirectoryEntryType.CodeView);
        var codeView = pe.ReadCodeViewDebugDirectoryData(entry);
        var id = reader.DebugMetadataHeader!.Id.ToArray();
        Require(codeView.Guid == new Guid(id.AsSpan(0, 16)) && entry.Stamp == BinaryPrimitives.ReadUInt32LittleEndian(id.AsSpan(16, 4))
            && codeView.Age == 1, "The selected portable PDB must actually match the loaded owner PE.");
        var proofs = new List<object>();
        foreach (var file in selected)
        {
            var relative = file.GetProperty("path").GetString()!;
            var hash = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(sourceRoot, relative))));
            Require(hash == file.GetProperty("sha256").GetString(), $"Selected source changed: {relative}");
            if (!file.GetProperty("pdbDocumentRequired").GetBoolean())
            {
                continue;
            }
            var matches = reader.Documents.Select(handle => reader.GetDocument(handle))
                .Where(item => reader.GetString(item.Name).Replace('\\', '/')
                    .EndsWith("/" + relative.Replace('\\', '/'), StringComparison.OrdinalIgnoreCase)).ToArray();
            Require(matches.Length == 1, $"Require one selected portable-PDB document: {relative}");
            Require(reader.GetGuid(matches[0].HashAlgorithm) == new Guid("8829d00f-11b8-4213-878b-770e8597ac16")
                && Convert.ToHexString(reader.GetBlobBytes(matches[0].Hash)) == hash, $"Source/PDB mismatch: {relative}");
            proofs.Add(new { source = relative, sha256 = hash, actualPdbDocument = reader.GetString(matches[0].Name) });
        }
        Require(proofs.Count == 3, "Require the actual RazorPage, RazorPageBase and RazorView executable documents.");
        var sourceLinks = reader.CustomDebugInformation.Select(handle => reader.GetCustomDebugInformation(handle))
            .Where(item => reader.GetGuid(item.Kind) == new Guid("cc110556-a091-4d38-9fec-25ab9a351a6a"))
            .Select(item => Encoding.UTF8.GetString(reader.GetBlobBytes(item.Value))).ToArray();
        Write("selected-source-pdb-associations", new
        {
            actualSelectedInputs = selected.Length,
            actualSelectedDocuments = proofs.Count,
            actualCompleteCompilerProvenanceClaimed = false,
            actualPeAndPdbMatch = true,
            actualOwnerSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(location))),
            actualPdbSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.ChangeExtension(location, ".pdb")))),
            actualSourceLinks = sourceLinks,
            proofs
        });
    }

    internal static void Runtime(string phase)
    {
        Require(Environment.Version.Major == 12 && Environment.Is64BitProcess, "Require the pinned x64 .NET 12 runtime.");
        Write("runtime-" + phase, new
        {
            pid = Environment.ProcessId,
            framework = RuntimeInformation.FrameworkDescription,
            version = Environment.Version.ToString(),
            os = RuntimeInformation.OSDescription,
            settings = SettingsPreservingEmitToolchain.ReadSettings(),
            assemblies = AppDomain.CurrentDomain.GetAssemblies().Where(assembly => !assembly.IsDynamic && assembly.Location.Length > 0)
                .OrderBy(assembly => assembly.GetName().Name).Select(assembly => new
                {
                    name = assembly.GetName().Name,
                    location = assembly.Location,
                    sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location)))
                }).ToArray()
        });
    }
}
