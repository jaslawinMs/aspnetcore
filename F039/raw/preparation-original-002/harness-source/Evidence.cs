// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Components;

namespace AutoPerf;

internal static class Evidence
{
    private static int _sequence;
    public static string StateDirectory { get; set; } = "";
    public static string Variant { get; set; } = "";
    public static object InitialSettings { get; } = SettingsPreservingEmitToolchain.ReadSettings();
    public static string Hash(string file) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file)));
    public static string Compact(object value) => JsonSerializer.Serialize(value);

    public static void Require([DoesNotReturnIf(false)] bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    public static void Write(string name, object value)
    {
        File.AppendAllText(Path.Combine(StateDirectory, "events.jsonl"), Compact(new
        {
            sequence = Interlocked.Increment(ref _sequence),
            name,
            value,
        }) + Environment.NewLine);
    }

    public static void VerifyImage(string closurePath)
    {
        using var document = JsonDocument.Parse(File.ReadAllBytes(closurePath));
        var image = AppContext.BaseDirectory;
        var entries = document.RootElement.GetProperty("files").EnumerateArray().ToArray();
        foreach (var entry in entries)
        {
            var file = Path.GetFullPath(Path.Combine(image, entry.GetProperty("path").GetString()!));
            Require(file.StartsWith(image, StringComparison.OrdinalIgnoreCase), "Consumer entry escapes its frozen image.");
            Require(Hash(file) == entry.GetProperty("sha256").GetString(), "Frozen consumer entry changed: " + file);
        }
        Require(Directory.GetFiles(image, "*", SearchOption.AllDirectories).Length == entries.Length,
            "Frozen consumer file inventory changed.");
        var owner = typeof(ITempData).Assembly.Location;
        Require(owner.StartsWith(image, StringComparison.OrdinalIgnoreCase), "The actual source-built Endpoints owner must load from the frozen image.");
        Write("consumer-image", new { actualEntries = entries.Length, actualClosureSha256 = Hash(closurePath),
            actualOwnerPath = owner, actualOwnerSha256 = Hash(owner) });
    }

    public static void SourceWitness(string sourceDirectory)
    {
        var assembly = typeof(ITempData).Assembly.Location;
        var pdb = Path.ChangeExtension(assembly, ".pdb");
        using var pe = new PEReader(File.OpenRead(assembly));
        using var provider = MetadataReaderProvider.FromPortablePdbStream(File.OpenRead(pdb));
        var reader = provider.GetMetadataReader();
        var header = reader.DebugMetadataHeader ?? throw new InvalidOperationException("Actual portable PDB required.");
        var id = new BlobContentId(header.Id);
        var entry = pe.ReadDebugDirectory().Single(item => item.Type == DebugDirectoryEntryType.CodeView);
        var codeView = pe.ReadCodeViewDebugDirectoryData(entry);
        Require(codeView.Guid == id.Guid && entry.Stamp == id.Stamp, "Actual PE/PDB identity mismatch.");
        var records = Directory.GetFiles(sourceDirectory, "*.cs").Order(StringComparer.Ordinal).Select(source =>
        {
            var document = reader.Documents.Select(handle => reader.GetDocument(handle))
                .Single(item => reader.GetString(item.Name).Replace('\\', '/').EndsWith("/" + Path.GetFileName(source), StringComparison.Ordinal));
            var algorithm = reader.GetGuid(document.HashAlgorithm);
            var expected = reader.GetBlobBytes(document.Hash);
            var bytes = File.ReadAllBytes(source);
            var actual = algorithm == new Guid("8829d00f-11b8-4213-878b-770e8597ac16") ? SHA256.HashData(bytes)
                : algorithm == new Guid("ff1816ec-aa5e-4d10-87f7-6f4963833460") ? SHA1.HashData(bytes)
                : throw new InvalidOperationException("Unsupported actual PDB source checksum algorithm.");
            Require(actual.AsSpan().SequenceEqual(expected), "Actual selected source/PDB document mismatch: " + source);

            return new { source = Path.GetFileName(source), algorithm, checksum = Convert.ToHexString(expected), sha256 = Hash(source) };
        }).ToArray();
        Require(records.Length == 12, "Require all twelve selected real TempData producer/owner documents.");
        Write("source-pdb", new { actualAssemblySha256 = Hash(assembly), actualPdbSha256 = Hash(pdb),
            actualPePdbBindingMatched = true, documents = records, notCompleteCompilerProvenanceOrMethodCoverage = true });
    }

    public static void Runtime(string phase)
    {
        Require(Environment.Version.ToString() == "12.0.0" && Environment.Is64BitProcess && GCSettings.IsServerGC,
            "The pinned x64 .NET12 ServerGC runtime must be active.");
        Require(Compact(InitialSettings) == Compact(SettingsPreservingEmitToolchain.ReadSettings()),
            "Actual process/thread priority or affinity changed.");
        Write("runtime-" + phase, new
        {
            candidate = "F039",
            variant = Variant,
            actualProcessId = Environment.ProcessId,
            runtime = Environment.Version.ToString(),
            serverGc = GCSettings.IsServerGC,
            initialSettings = InitialSettings,
            sharedMachineNotIsolated = true,
            actualPublicResultAndRegisteredCascadingFactoryNoPrivateInvocationOrUnsafeAccessor = true,
            boundary = "Prepared loaded real TempData collection Contains; public RazorComponentResult plus registered actual cookie-provider factory used outside timing. Direct result execution does not invoke endpoint persistence; the separate canonical static-SSR browser probe does. No application-throughput/transport/DOM, session provider, WASM/Mono/AOT performance claim. Eighteen selected sources match current default; full current-default build/dependency equivalence not claimed.",
            assemblies = AppDomain.CurrentDomain.GetAssemblies().Where(assembly => !assembly.IsDynamic &&
                !string.IsNullOrEmpty(assembly.Location)).Select(assembly => new
                {
                    name = assembly.GetName().Name,
                    path = assembly.Location,
                    sha256 = Hash(assembly.Location),
                    informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
                    fileVersion = FileVersionInfo.GetVersionInfo(assembly.Location).FileVersion,
                }).OrderBy(assembly => assembly.name, StringComparer.Ordinal).ToArray(),
        });
    }
}
