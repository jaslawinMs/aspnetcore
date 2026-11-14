using System.Linq.Expressions;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using CodeGenerator;

namespace AutoPerf;

public sealed record GenerationReceipt(string Name, string Producer, int OutputCharacters, string OutputSha256, bool OriginalHeaderStateReset, string[] FileSha256);

public class HeaderGenerationBenchmark : IDisposable
{
    private static readonly string[] GeneratedNames =
    [
        "HttpHeaders.Generated.cs", "HttpProtocol.Generated.cs", "HttpUtilities.Generated.cs",
        "TransportMultiplexedConnection.Generated.cs", "TransportConnection.Generated.cs"
    ];
    private static readonly HeaderState[] InitialHeaderState = KnownHeaders.ResponseHeaders
        .Concat(KnownHeaders.ResponseTrailers)
        .Select(header => new HeaderState(header, header.BytesOffset, header.BytesCount))
        .ToArray();
    private string? _temporaryDirectory;
    private string[]? _warmFiles;
    private int _warmOutputCharacters;

    public IEnumerable<string> Cases =>
    [
        "HeadersFull", "ProgramWarm", "HeaderLookup",
        "RequestSwitch", "ResponseSwitch", "TrailersSwitch",
        "HPackRequest", "HPackResponse", "QPackRequest", "QPackResponse", "QPackMatch",
        "EmptySwitch", "OneSwitch", "UtilityControl", "ProtocolControl"
    ];

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        var actual = Capture();
        var oraclePath = Path.Combine(AppContext.BaseDirectory, "contract-oracles.json");
        var oracles = JsonSerializer.Deserialize<GenerationReceipt[]>(File.ReadAllText(oraclePath))
            ?? throw new InvalidOperationException("Original generation oracles were not loaded.");
        var expected = oracles.Single(receipt => receipt.Name == Case);
        if (actual.Name != expected.Name || actual.Producer != expected.Producer ||
            actual.OutputCharacters != expected.OutputCharacters || actual.OutputSha256 != expected.OutputSha256 ||
            actual.OriginalHeaderStateReset != expected.OriginalHeaderStateReset ||
            !actual.FileSha256.SequenceEqual(expected.FileSha256))
        {
            throw new InvalidOperationException($"Complete generation output differs for {Case}.");
        }
        Console.WriteLine("Contract receipt: " + JsonSerializer.Serialize(actual));
    }

    public GenerationReceipt Capture()
    {
        if (Case == "ProgramWarm")
        {
            CreateWarmFiles();
            var warmFiles = _warmFiles ?? throw new InvalidOperationException("Warm output files were not initialized.");
            _warmOutputCharacters = warmFiles.Sum(path => File.ReadAllText(path).Length);
            var expectedHashes = GeneratedNames.Select(name =>
                Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "golden", name))))).ToArray();
            for (var repeat = 0; repeat < 3; repeat++)
            {
                Execute();
                var actualHashes = warmFiles.Select(path => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)))).ToArray();
                if (!actualHashes.SequenceEqual(expectedHashes))
                {
                    throw new InvalidOperationException("Actual repeated CodeGenerator.Program.Run changed the original five files.");
                }
            }

            return new GenerationReceipt(Case, "Actual CodeGenerator.Program.Run; warm existing files; stdout suppressed", _warmOutputCharacters,
                Hash(string.Join("\n", expectedHashes)), true, expectedHashes);
        }

        var output = Generate();
        for (var repeat = 0; repeat < 2; repeat++)
        {
            if (Generate() != output)
            {
                throw new InvalidOperationException($"Repeated generation changed the complete output for {Case}.");
            }
        }
        if (Case == "HeadersFull" && output != File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "golden", GeneratedNames[0])))
        {
            throw new InvalidOperationException("Complete header generation differs from real fresh CLI output.");
        }

        return new GenerationReceipt(Case, Case switch
        {
            "HeadersFull" => "Actual complete KnownHeaders.GeneratedFile",
            "UtilityControl" => "Untouched complete HttpUtilities.GeneratedFile",
            "ProtocolControl" => "Untouched complete HttpProtocolFeatureCollection.GenerateFile",
            _ => "Actual private header generation partition"
        }, output.Length, Hash(output), true, []);
    }

    [Benchmark]
    public int Execute()
    {
        if (Case == "ProgramWarm")
        {
            ResetHeaderState();
            var warmFiles = _warmFiles ?? throw new InvalidOperationException("Warm output files were not initialized.");
            var writer = Console.Out;
            try
            {
                Console.SetOut(TextWriter.Null);
                CodeGenerator.Program.Run(warmFiles[0], warmFiles[1], warmFiles[2], warmFiles[3], warmFiles[4]);
            }
            finally
            {
                Console.SetOut(writer);
            }

            return _warmOutputCharacters;
        }

        return Generate().Length;
    }

    [GlobalCleanup]
    public void Dispose()
    {
        if (_warmFiles is not null)
        {
            foreach (var file in _warmFiles)
            {
                File.Delete(file);
            }
            _warmFiles = null;
        }
        if (_temporaryDirectory is not null)
        {
            Directory.Delete(_temporaryDirectory, recursive: false);
            _temporaryDirectory = null;
        }
    }

    private string Generate()
    {
        ResetHeaderState();

        return Case switch
        {
            "HeadersFull" => KnownHeaders.GeneratedFile(),
            "HeaderLookup" => GenerationAccess.HeaderLookup(),
            "RequestSwitch" => GenerationAccess.AppendSwitch(KnownHeaders.RequestHeaders.GroupBy(header => header.Name.Length)),
            "ResponseSwitch" => GenerationAccess.AppendSwitch(KnownHeaders.ResponseHeaders.GroupBy(header => header.Name.Length)),
            "TrailersSwitch" => GenerationAccess.AppendSwitch(KnownHeaders.ResponseTrailers.GroupBy(header => header.Name.Length)),
            "HPackRequest" => GenerationAccess.HPack(KnownHeaders.RequestHeaders),
            "HPackResponse" => GenerationAccess.HPack(KnownHeaders.ResponseHeaders),
            "QPackRequest" => GenerationAccess.QPack(KnownHeaders.RequestHeaders),
            "QPackResponse" => GenerationAccess.QPack(KnownHeaders.ResponseHeaders),
            "QPackMatch" => GenerationAccess.QPackMatch(),
            "EmptySwitch" => GenerationAccess.AppendSwitch(Array.Empty<KnownHeaders.KnownHeader>().GroupBy(header => header.Name.Length)),
            "OneSwitch" => GenerationAccess.AppendSwitch(KnownHeaders.RequestHeaders.Take(1).GroupBy(header => header.Name.Length)),
            "UtilityControl" => CodeGenerator.HttpUtilities.HttpUtilities.GeneratedFile(),
            "ProtocolControl" => HttpProtocolFeatureCollection.GenerateFile(),
            _ => throw new InvalidOperationException($"Unknown generation case {Case}.")
        };
    }

    private void CreateWarmFiles()
    {
        if (_warmFiles is not null)
        {
            return;
        }
        _temporaryDirectory = Path.Combine(Path.GetTempPath(), $"aspnetcore-autoperf-F301-{Environment.ProcessId}-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_temporaryDirectory);
        _warmFiles = GeneratedNames.Select(name => Path.Combine(_temporaryDirectory, name)).ToArray();
        for (var index = 0; index < GeneratedNames.Length; index++)
        {
            File.Copy(Path.Combine(AppContext.BaseDirectory, "golden", GeneratedNames[index]), _warmFiles[index], overwrite: false);
        }
    }

    private static void ResetHeaderState()
    {
        foreach (var state in InitialHeaderState)
        {
            state.Header.BytesOffset = state.BytesOffset;
            state.Header.BytesCount = state.BytesCount;
        }
    }

    private static string Hash(string text)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)));
    }

    private sealed record HeaderState(KnownHeaders.KnownHeader Header, int BytesOffset, int BytesCount);
}

internal static class GenerationAccess
{
    private static readonly Type Owner = typeof(KnownHeaders);
    internal static Func<string> HeaderLookup { get; } = GetMethod("GetHeaderLookup").CreateDelegate<Func<string>>();
    internal static Func<string> QPackMatch { get; } = GetMethod("GetQPackStaticTableMatch").CreateDelegate<Func<string>>();
    internal static Func<IEnumerable<IGrouping<int, KnownHeaders.KnownHeader>>, string> AppendSwitch { get; } =
        GetMethod("AppendSwitch").CreateDelegate<Func<IEnumerable<IGrouping<int, KnownHeaders.KnownHeader>>, string>>();
    internal static Func<KnownHeaders.KnownHeader[], string> HPack { get; } = CreateGroupedSwitch("GroupHPack", "AppendHPackSwitch");
    internal static Func<KnownHeaders.KnownHeader[], string> QPack { get; } = CreateGroupedSwitch("GroupQPack", "AppendQPackSwitch");

    private static MethodInfo GetMethod(string name)
    {
        return Owner.GetMethods(BindingFlags.Static | BindingFlags.NonPublic).Single(method => method.Name == name);
    }

    private static Func<KnownHeaders.KnownHeader[], string> CreateGroupedSwitch(string groupName, string switchName)
    {
        var group = GetMethod(groupName);
        var append = Owner.GetMethods(BindingFlags.Static | BindingFlags.NonPublic)
            .Single(method => method.Name == switchName && method.GetParameters()[0].ParameterType == group.ReturnType);
        var input = Expression.Parameter(typeof(KnownHeaders.KnownHeader[]), "headers");
        var body = Expression.Call(append, Expression.Call(group, input));

        return Expression.Lambda<Func<KnownHeaders.KnownHeader[], string>>(body, input).Compile();
    }
}
