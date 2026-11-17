// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Diagnostics;
using System.Globalization;
using System.Reflection;
using System.Reflection.Emit;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Diagnosers;
using BenchmarkDotNet.Engines;
using BenchmarkDotNet.Exporters.Csv;
using BenchmarkDotNet.Exporters.Json;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using Microsoft.Extensions.Primitives;
using Perfolizer.Horology;
using Perfolizer.Mathematics.OutlierDetection;

[assembly: SupportedOSPlatform("windows")]

namespace AutoPerf;

internal static class Evidence
{
    private static int _sequence;
    public static string StateDirectory { get; set; } = "";
    public static string ClosurePath { get; set; } = "";
    public static string Variant { get; set; } = "";
    public static object InitialSettings { get; } = SettingsPreservingEmitToolchain.ReadSettings();
    public static string Hash(string file) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file)));
    public static string Compact(object value) => JsonSerializer.Serialize(value);

    public static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    public static void Write(string name, object value)
    {
        var index = Interlocked.Increment(ref _sequence);
        File.WriteAllText(Path.Combine(StateDirectory, $"{index:D4}-{name}.json"),
            JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static void SourceWitness(string assembly, params string[] sources)
    {
        var pdb = Path.ChangeExtension(assembly, ".pdb");
        using var pe = new PEReader(File.OpenRead(assembly));
        using var provider = MetadataReaderProvider.FromPortablePdbStream(File.OpenRead(pdb));
        var reader = provider.GetMetadataReader();
        var header = reader.DebugMetadataHeader ?? throw new InvalidOperationException("Actual portable-PDB header required.");
        var id = new BlobContentId(header.Id);
        var entry = pe.ReadDebugDirectory().Single(item => item.Type == DebugDirectoryEntryType.CodeView);
        var codeView = pe.ReadCodeViewDebugDirectoryData(entry);
        Require(codeView.Guid == id.Guid && entry.Stamp == id.Stamp, "Actual PE/portable-PDB content identities differ.");
        var documents = sources.Select(source =>
        {
            var document = reader.Documents.Select(handle => reader.GetDocument(handle))
                .Single(item => reader.GetString(item.Name).Replace('\\', '/').EndsWith("/" + Path.GetFileName(source), StringComparison.Ordinal));
            var expected = reader.GetBlobBytes(document.Hash);
            var algorithm = reader.GetGuid(document.HashAlgorithm);
            var bytes = File.ReadAllBytes(source);
            var observed = algorithm == new Guid("8829d00f-11b8-4213-878b-770e8597ac16") ? SHA256.HashData(bytes)
                : algorithm == new Guid("ff1816ec-aa5e-4d10-87f7-6f4963833460") ? SHA1.HashData(bytes)
                : throw new InvalidOperationException("Unsupported actual portable-PDB document checksum.");
            Require(expected.AsSpan().SequenceEqual(observed), "Actual source/PDB document differs: " + source);

            return new { source, algorithm, checksum = Convert.ToHexString(expected), sha256 = Hash(source) };
        }).ToArray();
        Write("source-pdb-" + Path.GetFileNameWithoutExtension(assembly), new
        {
            assemblySha256 = Hash(assembly),
            pdbSha256 = Hash(pdb),
            codeViewGuid = codeView.Guid,
            pdbGuid = id.Guid,
            stamp = id.Stamp,
            actualPePdbBindingMatched = true,
            documents,
            notCompleteBuildProvenanceOrMethodCoverage = true,
        });
    }

    public static void Runtime(string mode)
    {
        Write("runtime-" + mode, new
        {
            candidate = "F035",
            mode,
            variant = Variant,
            processId = Environment.ProcessId,
            runtime = Environment.Version.ToString(),
            serverGc = GCSettings.IsServerGC,
            initialSettings = InitialSettings,
            actualX64Process = Environment.Is64BitProcess,
            actualClosureSha256 = Hash(ClosurePath),
            sharedMachineNotIsolated = true,
            boundary = "Actual prebuilt MVC.Abstractions public GetEnumerator and pinned StringValues. Prepared concrete/preboxed generic enumeration,unchanged direct Values control,actual request-query provider GetValue,and real CollectionModelBinder/SimpleTypeModelBinder with fresh action/model-state/binding contexts. Query parsing/factory/metadata/binders prepared before timing. Empty binding bypasses GetEnumerator. Complete score/model count/error checks included. No hosted HTTP,application frequency/throughput or claim that IL boxing necessarily survives the JIT.",
            runtimeAssemblies = AppDomain.CurrentDomain.GetAssemblies().Where(assembly => !assembly.IsDynamic &&
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

    public static void ActualMethods()
    {
        var opcodes = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field.FieldType == typeof(OpCode))
            .Select(field => (OpCode)(field.GetValue(null) ?? throw new InvalidOperationException("Missing opcode.")))
            .ToDictionary(opcode => opcode.Value);
        object Read(MethodInfo method)
        {
            var bytes = method.GetMethodBody()?.GetILAsByteArray() ?? throw new InvalidOperationException("Actual IL body required.");
            var instructions = new List<object>();
            using var stream = new MemoryStream(bytes);
            using var reader = new BinaryReader(stream);
            while (stream.Position < stream.Length)
            {
                var offset = stream.Position;
                var first = reader.ReadByte();
                var number = first == 0xFE ? unchecked((short)(0xFE00 | reader.ReadByte())) : (short)first;
                var opcode = opcodes[number];
                object? operand = opcode.OperandType switch
                {
                    OperandType.InlineNone => null,
                    OperandType.ShortInlineI or OperandType.ShortInlineBrTarget => reader.ReadSByte(),
                    OperandType.InlineI or OperandType.InlineBrTarget or OperandType.InlineSig => reader.ReadInt32(),
                    OperandType.InlineI8 => reader.ReadInt64(),
                    OperandType.ShortInlineR => reader.ReadSingle(),
                    OperandType.InlineR => reader.ReadDouble(),
                    OperandType.ShortInlineVar => reader.ReadByte(),
                    OperandType.InlineVar => reader.ReadUInt16(),
                    OperandType.InlineString => method.Module.ResolveString(reader.ReadInt32()),
                    OperandType.InlineSwitch => Enumerable.Range(0, reader.ReadInt32()).Select(_ => reader.ReadInt32()).ToArray(),
                    OperandType.InlineField or OperandType.InlineMethod or OperandType.InlineTok or OperandType.InlineType =>
                        Describe(method.Module.ResolveMember(reader.ReadInt32(), method.DeclaringType?.GenericTypeArguments, method.GetGenericArguments())
                            ?? throw new InvalidOperationException("IL token could not resolve.")),
                    _ => throw new InvalidOperationException("Unsupported IL operand."),
                };
                instructions.Add(new { offset, opcode = opcode.Name, operand });
            }

            return new
            {
                declaringType = method.DeclaringType?.FullName,
                method = method.ToString(),
                moduleMvid = method.Module.ModuleVersionId,
                ilBytes = Convert.ToHexString(bytes),
                instructions,
            };
        }
        static object Describe(MemberInfo member)
        {
            return new { declaringType = member.DeclaringType?.FullName, name = member.Name, signature = member.ToString() };
        }
        var owner = typeof(ValueProviderResult).GetMethod(nameof(ValueProviderResult.GetEnumerator))
            ?? throw new InvalidOperationException("Shipped enumeration member absent.");
        Require(owner.ReturnType == typeof(IEnumerator<string>) && owner.GetParameters().Length == 0,
            "Preserve the exact shipped GetEnumerator return signature.");
        var direct = typeof(StringValues).GetMethod(nameof(StringValues.GetEnumerator))
            ?? throw new InvalidOperationException("Actual concrete StringValues enumerator absent.");
        var indirect = typeof(StringValues).GetInterfaceMap(typeof(IEnumerable<string>)).TargetMethods.Single();
        var consumer = typeof(CollectionModelBinder<string>).GetMethod("BindSimpleCollection", BindingFlags.NonPublic | BindingFlags.Instance)
            ?? throw new InvalidOperationException("Actual collection-binding implementation absent.");
        Require(consumer.GetMethodImplementationFlags().ToString() == "Async",
            "Require the observed runtime-async consumer,not an assumed compiler-generated state machine.");
        var consumerBody = Read(consumer);
        var actualCall = JsonSerializer.SerializeToElement(consumerBody).GetProperty("instructions").EnumerateArray().Any(instruction =>
            instruction.GetProperty("opcode").GetString() is "call" or "callvirt" &&
            instruction.GetProperty("operand") is { ValueKind: JsonValueKind.Object } operand &&
            operand.GetProperty("declaringType").GetString() == typeof(ValueProviderResult).FullName &&
            operand.GetProperty("name").GetString() == nameof(ValueProviderResult.GetEnumerator));
        Require(actualCall, "Actual compiled collection consumer must call the shipped ValueProviderResult enumerator.");
        Write("actual-methods", new
        {
            actualShippedReturnTypePreserved = true,
            actualOwner = Read(owner),
            actualStringValuesDirect = Read(direct),
            actualStringValuesInterface = Read(indirect),
            actualCollectionBinderAsyncBody = consumerBody,
            actualCollectionBinderMethodImplementation = consumer.GetMethodImplementationFlags().ToString(),
            actualCollectionBinderCallsShippedEnumerator = actualCall,
            aNominalIlBoxIsNotProofOfNativeHeapCost = true,
            reflectionMetadataReadOnlyNoPrivateInvocationOrUnsafeAccessor = true,
        });
    }
}

internal static class Program
{
    public static async Task<int> Main(string[] args)
    {
        var arguments = args.ToList();
        string RemoveOption(string option)
        {
            var index = arguments.IndexOf(option);
            Evidence.Require(index >= 0 && index + 1 < arguments.Count, "Explicit option required: " + option);
            var value = arguments[index + 1];
            arguments.RemoveRange(index, 2);

            return value;
        }
        var sources = RemoveOption("--sources");
        var mode = RemoveOption("--mode");
        Evidence.ClosurePath = RemoveOption("--closure");
        Evidence.Require(mode is "characterize" or "measure", "Require untimed contracts or a budgeted comparison member.");
        var artifactIndex = arguments.IndexOf("--artifacts");
        Evidence.Require(artifactIndex >= 0 && artifactIndex + 1 < arguments.Count && Path.IsPathRooted(arguments[artifactIndex + 1]),
            "Explicit absolute artifact directory required.");
        Evidence.StateDirectory = Path.Combine(arguments[artifactIndex + 1], "states");
        Evidence.Require(!Directory.Exists(Evidence.StateDirectory), "Do not overwrite existing actual evidence.");
        Directory.CreateDirectory(Evidence.StateDirectory);
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;
        using var closure = JsonDocument.Parse(File.ReadAllBytes(Evidence.ClosurePath));
        Evidence.Require(closure.RootElement.GetProperty("candidate").GetString() == "F035", "Require actual F035 closure.");
        Evidence.Variant = closure.RootElement.GetProperty("variant").GetString() ?? throw new InvalidOperationException("Actual variant absent.");
        Evidence.Require(Evidence.Variant is "original" or "candidate", "Require explicit actual source variant.");
        var output = Path.GetDirectoryName(typeof(Program).Assembly.Location) ?? throw new InvalidOperationException("Actual harness directory required.");
        var declared = closure.RootElement.GetProperty("files").EnumerateArray().Select(file =>
        {
            var relative = file.GetProperty("path").GetString() ?? throw new InvalidOperationException("Closure path absent.");
            var actual = Path.GetFullPath(Path.Combine(output, relative));
            Evidence.Require(actual.StartsWith(output + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase),
                "A declared closure file escapes actual consumer directory.");
            Evidence.Require(Evidence.Hash(actual) == file.GetProperty("sha256").GetString(), "Actual consumer closure differs: " + relative);

            return relative;
        }).Order(StringComparer.Ordinal).ToArray();
        var discovered = Directory.EnumerateFiles(output, "*", SearchOption.AllDirectories)
            .Select(file => Path.GetRelativePath(output, file)).Order(StringComparer.Ordinal).ToArray();
        Evidence.Require(declared.SequenceEqual(discovered, StringComparer.Ordinal), "Actual consumer closure file set differs.");
        Evidence.Require(OperatingSystem.IsWindows() && Environment.Is64BitProcess && Environment.Version.Major == 12 &&
            Evidence.Hash(typeof(object).Assembly.Location) == "0CEBA028A838AFF170CFF9D03570B34F9F044D6A9597974088E58B9834DF74E4",
            "Require pinned actual Windows/net12/x64 runtime.");
        var owner = typeof(ValueProviderResult).Assembly;
        Evidence.Require(owner.GetCustomAttribute<TargetFrameworkAttribute>()?.FrameworkName == ".NETCoreApp,Version=v12.0" &&
            Path.GetDirectoryName(owner.Location) == output &&
            Path.GetDirectoryName(typeof(QueryStringValueProvider).Assembly.Location) == output,
            "Load actual MVC owner/producer/consumer from frozen output,not shared framework.");
        Evidence.SourceWitness(owner.Location, Path.Combine(sources, "owner", "ValueProviderResult.cs"));
        Evidence.SourceWitness(typeof(QueryStringValueProvider).Assembly.Location, new[]
        {
            "QueryStringValueProvider.cs", "QueryStringValueProviderFactory.cs", "CollectionModelBinder.cs", "SimpleTypeModelBinder.cs",
        }.Select(name => Path.Combine(sources, "core", name)).ToArray());
        Evidence.SourceWitness(typeof(Program).Assembly.Location, new[]
        {
            "Program.cs", "Scenario.cs", "Contracts.cs", "EnumerationBenchmarks.cs", "SettingsPreservingEmitToolchain.cs",
        }.Select(name => Path.Combine(sources, "harness", name)).ToArray());
        Evidence.Runtime(mode + "-before");
        Evidence.ActualMethods();
        if (mode == "characterize")
        {
            await Contracts.RunAsync().ConfigureAwait(false);
            await Contracts.RunBenchmarkLifecyclesAsync().ConfigureAwait(false);
            Evidence.Write("characterization-completed", new
            {
                actualConcreteSemanticObservations = Contracts.Observations,
                actualBenchmarkLifecycleProfiles = Contracts.BenchmarkLifecycles,
                actualAllSuccessful = true,
                actualPublicRequestQueryFactoryAndCollectionBinder = true,
                actualOwnedNativeOrExternalResources = 0,
                timing = false,
            });
            Evidence.Runtime(mode + "-after");
            Console.WriteLine($"F035:{Contracts.Observations}concrete semantic observations and{Contracts.BenchmarkLifecycles}actual benchmark lifecycles passed.");

            return 0;
        }
        var job = Job.Default.WithId("SettingsPreserving-F035")
            .WithToolchain(new SettingsPreservingEmitToolchain()).WithStrategy(RunStrategy.Throughput)
            .WithIterationTime(TimeInterval.FromMilliseconds(100)).WithWarmupCount(3).WithIterationCount(8)
            .WithUnrollFactor(1).WithOutlierMode(OutlierMode.DontRemove).WithPowerPlan(Guid.Empty);
        var config = ManualConfig.Create(DefaultConfig.Instance).AddJob(job).AddDiagnoser(MemoryDiagnoser.Default)
            .AddExporter(JsonExporter.Full, CsvExporter.Default).WithOption(ConfigOptions.StopOnFirstError, true);
        var summaries = BenchmarkSwitcher.FromTypes([typeof(EnumerationBenchmarks)]).Run(arguments.ToArray(), config).ToArray();
        var expectedReports = Contracts.Counts.Length * Contracts.Methods.Length;
        Evidence.Require(summaries.Length == 1 && summaries[0].Reports.Length == expectedReports &&
            summaries[0].Reports.All(report => report.Success), "Every predeclared comparison profile must succeed.");
        Evidence.Write("completed", new { actualReports = expectedReports, actualAllSuccessful = true, variant = Evidence.Variant });
        Evidence.Runtime(mode + "-after");

        return 0;
    }
}
