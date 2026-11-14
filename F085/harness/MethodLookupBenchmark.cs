using System.Buffers;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http;
using HttpMethod = Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http.HttpMethod;

namespace AutoPerf;

public sealed record SlotReceipt(int Index, ulong Mask, ulong Value, HttpMethod Method, int Length);
public sealed record MemberReceipt(string InputSha256, HttpMethod Method, int MethodLength, HttpVersion Version,
    int Calls, long Consumed, bool Complete, string CapturedTarget, long Checksum);
public sealed record CaseReceipt(string Name, string Kind, string InputSha256, int InputBytes, int Segments, long Checksum,
    HttpMethod Method, int MethodLength, HttpVersion Version, int Calls, int PathOffset, int PathLength,
    bool PathEncoded, long Consumed, bool Complete, string CapturedTarget, MemberReceipt[] Members);
public sealed record Oracle(SlotReceipt[] Slots, CaseReceipt[] Cases);
internal sealed record Scenario(string Name, string Kind, string Input, HttpMethod ExpectedMethod, int ExpectedLength,
    int Segments = 1, bool Complete = true, string Target = "/");

public class MethodLookupBenchmark
{
    private static readonly Scenario[] Scenarios = CreateScenarios();
    private static readonly Scenario[] MixedInputs = Scenarios.Where(scenario => scenario.Kind == "Lookup" && scenario.Name is not "Lookup_Empty" and not "Lookup_Short7").Take(12).ToArray();
    private readonly HttpParser<CaptureHandler> _parser = new(showErrorDetails: false);
    private readonly CaptureHandler _handler = new();
    private Scenario _scenario = null!;
    private byte[] _bytes = null!;
    private ReadOnlySequence<byte> _sequence;
    private byte[][] _mixedBytes = null!;
    private ReadOnlySequence<byte>[] _mixedSequences = null!;

    public IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        var actual = Capture();
        var oracle = JsonSerializer.Deserialize<Oracle>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "contract-oracles.json")))
            ?? throw new InvalidOperationException("Original method/parser oracles were not loaded.");
        var expected = oracle.Cases.Single(receipt => receipt.Name == Case);
        if (JsonSerializer.Serialize(actual) != JsonSerializer.Serialize(expected) ||
            JsonSerializer.Serialize(MethodAccess.CaptureSlots()) != JsonSerializer.Serialize(oracle.Slots))
        {
            throw new InvalidOperationException($"Actual method table/producer contract differs for {Case}.");
        }
        Console.WriteLine("Contract receipt: " + JsonSerializer.Serialize(actual));
    }

    public CaseReceipt Capture()
    {
        _scenario = Scenarios.Single(scenario => scenario.Name == Case);
        _bytes = Encoding.ASCII.GetBytes(_scenario.Input);
        _sequence = CreateSequence(_bytes, _scenario.Segments);
        _mixedBytes = MixedInputs.Select(scenario => Encoding.ASCII.GetBytes(scenario.Input)).ToArray();
        _mixedSequences = _mixedBytes.Select(bytes => new ReadOnlySequence<byte>(bytes)).ToArray();
        var lookupMethod = HttpMethod.None;
        var lookupLength = 0;
        var consumed = 0L;
        var complete = false;
        var checksum = 0L;
        var members = new List<MemberReceipt>();
        _handler.Reset(capture: true);
        if (_scenario.Kind == "Lookup")
        {
            lookupMethod = MethodAccess.Lookup(_bytes, out lookupLength);
            if (lookupMethod != _scenario.ExpectedMethod || lookupLength != _scenario.ExpectedLength)
            {
                throw new InvalidOperationException($"Actual lookup differs for {Case}.");
            }
            checksum = Pack(lookupMethod, lookupLength);
        }
        else if (_scenario.Kind == "Parser")
        {
            var reader = new SequenceReader<byte>(_sequence);
            complete = _parser.ParseRequestLine(_handler, ref reader);
            consumed = reader.Consumed;
            if (complete != _scenario.Complete || _handler.Calls != (complete ? 1 : 0) ||
                (complete && (_handler.Method != _scenario.ExpectedMethod || _handler.MethodLength != _scenario.ExpectedLength ||
                _handler.Version != HttpVersion.Http11 || _handler.CapturedTarget != _scenario.Target || consumed != _bytes.Length)) ||
                (!complete && consumed != 0))
            {
                throw new InvalidOperationException($"Actual parser-produced start-line effect differs for {Case}.");
            }
            checksum = ParserChecksum(consumed, complete);
        }
        else if (_scenario.Kind == "String")
        {
            lookupMethod = MethodAccess.StringLookup(_scenario.Input);
            if (lookupMethod != _scenario.ExpectedMethod)
            {
                throw new InvalidOperationException($"Untouched string lookup differs for {Case}.");
            }
            checksum = (int)lookupMethod;
        }
        else if (_scenario.Kind == "Version")
        {
            checksum = (int)MethodAccess.VersionLookup(_bytes);
            if (checksum != (_scenario.Complete ? (int)HttpVersion.Http11 : (int)HttpVersion.Unknown))
            {
                throw new InvalidOperationException($"Untouched version lookup differs for {Case}.");
            }
        }
        else
        {
            for (var index = 0; index < MixedInputs.Length; index++)
            {
                var input = MixedInputs[index];
                _handler.Reset(capture: true);
                var memberComplete = false;
                var memberConsumed = 0L;
                var memberLength = 0;
                var memberMethod = MethodAccess.Lookup(_mixedBytes[index], out memberLength);
                long memberChecksum;
                if (_scenario.Kind == "MixedLookup")
                {
                    if (memberMethod != input.ExpectedMethod || memberLength != input.ExpectedLength)
                    {
                        throw new InvalidOperationException($"Actual mixed lookup differs for {input.Name}.");
                    }
                    memberChecksum = Pack(memberMethod, memberLength);
                }
                else
                {
                    var memberReader = new SequenceReader<byte>(_mixedSequences[index]);
                    memberComplete = _parser.ParseRequestLine(_handler, ref memberReader);
                    memberConsumed = memberReader.Consumed;
                    memberMethod = _handler.Method;
                    memberLength = _handler.MethodLength;
                    if (!memberComplete || _handler.Calls != 1 || memberMethod != input.ExpectedMethod ||
                        memberLength != input.Input.IndexOf(' ') || _handler.Version != HttpVersion.Http11 ||
                        _handler.CapturedTarget != "/" || memberConsumed != _mixedBytes[index].Length)
                    {
                        throw new InvalidOperationException($"Actual mixed parser-produced start line differs for {input.Name}.");
                    }
                    memberChecksum = ParserChecksum(memberConsumed, memberComplete);
                }
                checksum += memberChecksum;
                members.Add(new MemberReceipt(Convert.ToHexString(SHA256.HashData(_mixedBytes[index])), memberMethod,
                    memberLength, _handler.Version, _handler.Calls, memberConsumed, memberComplete,
                    _handler.CapturedTarget, memberChecksum));
            }
        }
        var receiptBytes = _scenario.Kind == "String" ? Encoding.UTF8.GetBytes(_scenario.Input) : _bytes;
        var receipt = new CaseReceipt(Case, _scenario.Kind, Convert.ToHexString(SHA256.HashData(receiptBytes)), receiptBytes.Length,
            _scenario.Segments, checksum, _scenario.Kind == "Parser" ? _handler.Method : lookupMethod,
            _scenario.Kind == "Parser" ? _handler.MethodLength : lookupLength, _handler.Version, _handler.Calls,
            _handler.PathOffset, _handler.PathLength, _handler.PathEncoded, consumed, complete, _handler.CapturedTarget,
            members.ToArray());
        if (Execute() != checksum)
        {
            throw new InvalidOperationException($"Measured operation differs from its setup checksum for {Case}.");
        }

        return receipt;
    }

    [Benchmark]
    public long Execute()
    {
        switch (_scenario.Kind)
        {
            case "Lookup":
                return Pack(MethodAccess.Lookup(_bytes, out var length), length);
            case "Parser":
                _handler.Reset(capture: false);
                var reader = new SequenceReader<byte>(_sequence);
                var complete = _parser.ParseRequestLine(_handler, ref reader);
                return ParserChecksum(reader.Consumed, complete);
            case "String":
                return (int)MethodAccess.StringLookup(_scenario.Input);
            case "Version":
                return (int)MethodAccess.VersionLookup(_bytes);
            case "MixedLookup":
                var lookupSum = 0L;
                for (var index = 0; index < _mixedBytes.Length; index++)
                {
                    lookupSum += Pack(MethodAccess.Lookup(_mixedBytes[index], out var methodLength), methodLength);
                }
                return lookupSum;
            case "MixedParser":
                var parserSum = 0L;
                for (var index = 0; index < _mixedSequences.Length; index++)
                {
                    _handler.Reset(capture: false);
                    var mixedReader = new SequenceReader<byte>(_mixedSequences[index]);
                    var parsed = _parser.ParseRequestLine(_handler, ref mixedReader);
                    parserSum += ParserChecksum(mixedReader.Consumed, parsed);
                }
                return parserSum;
            default:
                throw new InvalidOperationException($"Unknown producer kind {_scenario.Kind}.");
        }
    }

    private long ParserChecksum(long consumed, bool complete)
    {
        return Pack(_handler.Method, _handler.MethodLength) + ((long)_handler.Version << 24) +
            consumed + _handler.PathLength + _handler.Calls + (complete ? 1 : 0);
    }

    private static long Pack(HttpMethod method, int length) => ((long)method << 32) | (uint)length;

    private static Scenario[] CreateScenarios()
    {
        var result = new List<Scenario>();
        var methods = new (string Name, HttpMethod Method)[]
        {
            ("CONNECT", HttpMethod.Connect), ("DELETE", HttpMethod.Delete), ("GET", HttpMethod.Get),
            ("HEAD", HttpMethod.Head), ("PATCH", HttpMethod.Patch), ("POST", HttpMethod.Post),
            ("PUT", HttpMethod.Put), ("OPTIONS", HttpMethod.Options), ("TRACE", HttpMethod.Trace)
        };
        foreach (var (name, method) in methods)
        {
            result.Add(new Scenario("Lookup_" + name, "Lookup", name + " / HTTP/1.1\r\n", method, name.Length));
            result.Add(new Scenario("Parser_" + name, "Parser", name + " / HTTP/1.1\r\n", method, name.Length));
        }
        result.Add(new("Lookup_PropFind", "Lookup", "PROPFIND / HTTP/1.1\r\n", HttpMethod.Custom, 0));
        result.Add(new("Lookup_Collision", "Lookup", "MZZGZZZZ / HTTP/1.1\r\n", HttpMethod.Custom, 0));
        result.Add(new("Lookup_Lowercase", "Lookup", "post / HTTP/1.1\r\n", HttpMethod.Custom, 0));
        result.Add(new("Lookup_ExtraSuffix", "Lookup", "POSTX / HTTP/1.1\r\n", HttpMethod.Custom, 0));
        result.Add(new("Lookup_Empty", "Lookup", "", HttpMethod.Custom, 0));
        result.Add(new("Lookup_Short7", "Lookup", "CONNECT", HttpMethod.Custom, 0));
        result.Add(new("Parser_PropFind", "Parser", "PROPFIND / HTTP/1.1\r\n", HttpMethod.Custom, 8));
        result.Add(new("Parser_PostLongPath", "Parser", "POST /" + new string('a', 256) + "?x=1 HTTP/1.1\r\n", HttpMethod.Post, 4, Target: "/" + new string('a', 256) + "?x=1"));
        result.Add(new("Parser_SegmentedPost", "Parser", "POST / HTTP/1.1\r\n", HttpMethod.Post, 4, Segments: 3));
        result.Add(new("Parser_SegmentedCustom", "Parser", "PROPFIND / HTTP/1.1\r\n", HttpMethod.Custom, 8, Segments: 3));
        result.Add(new("Parser_Incomplete", "Parser", "POST / HTTP/1.1\r", HttpMethod.None, 0, Complete: false));
        result.Add(new("String_Get_Control", "String", "GET", HttpMethod.Get, 0));
        result.Add(new("String_Post_Control", "String", "POST", HttpMethod.Post, 0));
        result.Add(new("String_Custom_Control", "String", "PROPFIND", HttpMethod.Custom, 0));
        result.Add(new("String_NonAscii_Control", "String", "\u0100AA", HttpMethod.Custom, 0));
        result.Add(new("Version_11_Control", "Version", "HTTP/1.1\r", HttpMethod.None, 0));
        result.Add(new("Version_Unknown_Control", "Version", "HTTP/9.9\r", HttpMethod.None, 0, Complete: false));
        result.Add(new("MixedLookup12", "MixedLookup", "actual first twelve nonempty lookup inputs", HttpMethod.None, 0));
        result.Add(new("MixedParser12", "MixedParser", "actual first twelve nonempty lookup inputs", HttpMethod.None, 0));

        return result.ToArray();
    }

    private static ReadOnlySequence<byte> CreateSequence(byte[] bytes, int segments)
    {
        if (segments == 1)
        {
            return new ReadOnlySequence<byte>(bytes);
        }
        var first = new Segment(bytes.AsMemory(0, 2)).Initialize();
        var second = first.Append(bytes.AsMemory(2, 5));
        var last = second.Append(bytes.AsMemory(7));

        return new ReadOnlySequence<byte>(first, 0, last, last.Memory.Length);
    }

    private sealed class Segment(ReadOnlyMemory<byte> memory) : ReadOnlySequenceSegment<byte>
    {
        public Segment Initialize()
        {
            Memory = memory;

            return this;
        }

        public Segment Append(ReadOnlyMemory<byte> next)
        {
            var segment = new Segment(next).Initialize();
            segment.RunningIndex = RunningIndex + Memory.Length;
            Next = segment;

            return segment;
        }
    }

    public sealed class CaptureHandler : IHttpRequestLineHandler, IHttpHeadersHandler
    {
        private bool _capture;
        public HttpMethod Method;
        public int MethodLength;
        public HttpVersion Version;
        public int Calls;
        public int PathOffset;
        public int PathLength;
        public bool PathEncoded;
        public string CapturedTarget = "";

        public void Reset(bool capture)
        {
            _capture = capture;
            Method = HttpMethod.None;
            MethodLength = 0;
            Version = HttpVersion.Unknown;
            Calls = 0;
            PathOffset = 0;
            PathLength = 0;
            PathEncoded = false;
            CapturedTarget = "";
        }

        public void OnStartLine(HttpVersionAndMethod versionAndMethod, TargetOffsetPathLength targetPath, Span<byte> startLine)
        {
            Calls++;
            Method = versionAndMethod.Method;
            MethodLength = versionAndMethod.MethodEnd;
            Version = versionAndMethod.Version;
            PathOffset = targetPath.Offset;
            PathLength = targetPath.Length;
            PathEncoded = targetPath.IsEncoded;
            if (_capture)
            {
                CapturedTarget = Encoding.ASCII.GetString(startLine[targetPath.Offset..]);
            }
        }

        public void OnStaticIndexedHeader(int index) => throw new InvalidOperationException("Request-line parsing must not produce headers.");
        public void OnStaticIndexedHeader(int index, ReadOnlySpan<byte> value) => throw new InvalidOperationException("Request-line parsing must not produce headers.");
        public void OnHeader(ReadOnlySpan<byte> name, ReadOnlySpan<byte> value) => throw new InvalidOperationException("Request-line parsing must not produce headers.");
        public void OnHeadersComplete(bool endStream) => throw new InvalidOperationException("Request-line parsing must not produce headers.");
    }
}

internal static class MethodAccess
{
    internal delegate HttpMethod LookupDelegate(ReadOnlySpan<byte> input, out int length);
    internal delegate HttpVersion VersionDelegate(ReadOnlySpan<byte> input);
    private static readonly Type Owner = typeof(KestrelServerOptions).Assembly.GetType("Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.HttpUtilities", throwOnError: true)!;
    internal static LookupDelegate Lookup { get; } = Owner.GetMethod("GetKnownMethod", [typeof(ReadOnlySpan<byte>), typeof(int).MakeByRefType()])!.CreateDelegate<LookupDelegate>();
    internal static Func<string, HttpMethod> StringLookup { get; } = Owner.GetMethod("GetKnownMethod", [typeof(string)])!.CreateDelegate<Func<string, HttpMethod>>();
    internal static VersionDelegate VersionLookup { get; } = Owner.GetMethod("GetKnownVersion", BindingFlags.Static | BindingFlags.NonPublic, [typeof(ReadOnlySpan<byte>)])!.CreateDelegate<VersionDelegate>();

    internal static SlotReceipt[] CaptureSlots()
    {
        var table = Owner.GetField("_knownMethods", BindingFlags.Static | BindingFlags.NonPublic)!.GetValue(null) as Array
            ?? throw new InvalidOperationException("Actual method table was not loaded.");
        var rows = new List<SlotReceipt>();
        for (var index = 0; index < table.Length; index++)
        {
            if (table.GetValue(index) is not ITuple tuple || tuple.Length != 4 ||
                tuple[0] is not ulong mask || tuple[1] is not ulong value || tuple[2] is not HttpMethod method || tuple[3] is not int length)
            {
                throw new InvalidOperationException($"Invalid actual initialized method table slot {index}.");
            }
            rows.Add(new SlotReceipt(index, mask, value, method, length));
        }
        Console.WriteLine($"Actual method table element: {table.GetType().GetElementType()}; inline value type={table.GetType().GetElementType()!.IsValueType}; slots={rows.Count}");

        return rows.ToArray();
    }
}
