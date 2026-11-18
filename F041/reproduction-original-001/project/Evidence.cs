// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Reflection;
using System.Reflection.Metadata;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Components.Forms;

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
        var file = Path.Combine(StateDirectory, $"{Interlocked.Increment(ref _sequence):D4}-{kind}.json");
        using var stream = new FileStream(file, FileMode.CreateNew);
        JsonSerializer.Serialize(stream, value, Options);
    }

    internal static void VerifyImage(string manifestPath)
    {
        using var document = JsonDocument.Parse(File.ReadAllBytes(manifestPath));
        var files = document.RootElement.GetProperty("files").EnumerateArray().ToArray();
        Require(files.Length > 10, "Require the complete frozen consumer manifest.");
        foreach (var file in files)
        {
            var relative = file.GetProperty("path").GetString()!;
            var bytes = File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, relative));
            Require(Convert.ToHexString(SHA256.HashData(bytes)) == file.GetProperty("sha256").GetString(),
                $"Frozen image mismatch: {relative}");
        }
        Write("verified-image", new { actualEntries = files.Length, actualEveryEntryVerified = true });
    }

    internal static void VerifySources(string manifestPath, string sourceRoot)
    {
        using var document = JsonDocument.Parse(File.ReadAllBytes(manifestPath));
        var selected = document.RootElement.GetProperty("sourceFiles").EnumerateArray().ToArray();
        Require(selected.Length == 13, "Require all thirteen predeclared selected source inputs.");
        var proofs = new List<object>();
        foreach (var file in selected)
        {
            var relative = file.GetProperty("path").GetString()!;
            var bytes = File.ReadAllBytes(Path.Combine(sourceRoot, relative));
            var hash = Convert.ToHexString(SHA256.HashData(bytes));
            Require(hash == file.GetProperty("sha256").GetString(), $"Source changed: {relative}");
            Assembly? owner = relative.Contains(@"\src\", StringComparison.Ordinal) && relative.EndsWith(".cs", StringComparison.Ordinal)
                ? relative.Contains(@"\Components\Forms\", StringComparison.Ordinal)
                    ? typeof(EditContext).Assembly : typeof(InputText).Assembly
                : null;
            if (owner is not null)
            {
                var location = owner.Location;
                Require(Path.GetFullPath(Path.GetDirectoryName(location)!) == Path.GetFullPath(AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar)),
                    $"Owner must load from the frozen image: {owner.GetName().Name}");
                using var pdb = File.OpenRead(Path.ChangeExtension(location, ".pdb"));
                using var provider = MetadataReaderProvider.FromPortablePdbStream(pdb);
                var reader = provider.GetMetadataReader();
                var matches = reader.Documents.Select(handle => reader.GetDocument(handle))
                    .Where(item => reader.GetString(item.Name).Replace('\\', '/')
                        .EndsWith("/" + relative.Replace('\\', '/'), StringComparison.OrdinalIgnoreCase)).ToArray();
                Require(matches.Length == 1, $"Require one selected portable-PDB document: {relative}");
                Require(Convert.ToHexString(reader.GetBlobBytes(matches[0].Hash)) == hash, $"Source/PDB mismatch: {relative}");
                proofs.Add(new { source = relative, sha256 = hash, owner = owner.GetName().Name,
                    actualOwnerSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(location))),
                    actualPdbSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.ChangeExtension(location, ".pdb")))) });
            }
        }
        Require(proofs.Count == 8, "Require all eight actual owner/producer/consumer source documents.");
        Write("selected-source-pdb-associations", new { actualSelectedInputs = selected.Length,
            actualSelectedDocuments = proofs.Count, actualCompleteCompilerProvenanceClaimed = false, proofs });
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
                    name = assembly.GetName().Name, location = assembly.Location,
                    sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location)))
                }).ToArray()
        });
    }
}
