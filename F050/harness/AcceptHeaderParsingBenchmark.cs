using System.Globalization;
using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace AutoPerf;

public class AcceptHeaderParsingBenchmark
{
    private AcceptWorkload _workload = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    public IEnumerable<string> Cases => AcceptWorkload.Definitions.Select(definition => definition.Name);

    [GlobalSetup]
    public void Setup()
    {
        _workload = new AcceptWorkload(Case);
        _workload.Verify();
    }

    [Benchmark]
    public int Run()
    {
        return _workload.Run();
    }
}

public enum WorkloadKind
{
    Accept,
    Selector,
    PublicFactory
}

public sealed record CaseDefinition(string Name, string[] Headers, WorkloadKind Kind,
    bool RespectBrowser = false, bool Return406 = false);
public sealed record MediaReceipt(int BufferIndex, int Offset, int Length, string Value, long QualityBits);
public sealed record CaseReceipt(string Name, string[] Headers, WorkloadKind Kind, MediaReceipt[] MediaTypes,
    string? Formatter, string? ContentType, bool ContentTypeIsServerDefined, string? PublicException,
    string? PublicExceptionParameter, int Checksum, int FormatExceptions, string[] OtherExceptions);
public sealed record ContractOracle(string OwnerSha256, CaseReceipt[] Receipts);

public sealed class AcceptWorkload
{
    private static readonly Func<IList<string>, IList<MediaTypeSegmentWithQuality>> Parse = CreateParserDelegate();
    private static readonly IList<IOutputFormatter> NoFormatters = Array.Empty<IOutputFormatter>();
    private static readonly MediaTypeCollection NoContentTypes = new();
    private readonly CaseDefinition _definition;
    private readonly DefaultOutputFormatterSelector _selector;

    public static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    public static string OwnerHash { get; } = Convert.ToHexString(
        SHA256.HashData(File.ReadAllBytes(typeof(MediaType).Assembly.Location)));

    public static readonly CaseDefinition[] Definitions =
    [
        Accept("Parse_Invalid_1", "application/json;q=bad,text/plain"),
        Accept("Parse_Invalid_8", InvalidPrefix(8) + "text/plain"),
        Accept("Parse_Invalid_32", InvalidPrefix(32) + "text/plain"),
        Accept("Parse_Mixed_8", Mixed(8)),
        Accept("Parse_AllInvalid_8", InvalidPrefix(8).TrimEnd(',')),
        Accept("Parse_InvalidEnd", "application/json;q=bad"),
        Accept("Parse_EmptyQuality_Comma", "application/json;q=,text/plain"),
        Accept("Parse_EmptyQuality_End", "application/json;q="),
        Accept("Parse_DuplicateInvalidFirst", "application/json;q=bad;q=0.8,text/plain"),
        Accept("Parse_DuplicateInvalidLast", "application/json;q=0.8;q=bad,text/plain"),
        Accept("Parse_QuotedInvalid", "application/json;q=\"bad\",text/plain"),
        Accept("Parse_Valid_1", "application/json"),
        Accept("Parse_Valid_8", string.Join(",", Enumerable.Repeat("application/json;q=0.8", 8))),
        Accept("Parse_QuotedValid", "application/json;q=\"0.8\""),
        Accept("Parse_DuplicateValid", "application/json;q=0.1;q=0.9"),
        Accept("Parse_OutOfRange", "application/json;q=1.2"),
        Accept("Parse_Nonfinite", "application/json;q=NaN,text/plain;q=Infinity"),
        new("Parse_MultipleHeaders", ["application/json;q=bad", "", "text/plain;q=0.8"], WorkloadKind.Accept),
        Public("Public_ValidPlain", "application/json"),
        Public("Public_ValidQuality", "application/json;q=0.8"),
        Public("Public_QuotedQuality", "application/json;q=\"0.8\""),
        Public("Public_DuplicateQuality", "application/json;q=0.1;q=0.9"),
        Public("Public_OutOfRange", "application/json;q=1.2"),
        Public("Public_InvalidQuality", "application/json;q=bad"),
        Public("Public_EmptyQualityEnd", "application/json;q="),
        Selector("Selector_Invalid_1", "application/json;q=bad,text/plain"),
        Selector("Selector_Invalid_8", InvalidPrefix(8) + "text/plain"),
        Selector("Selector_Invalid_32", InvalidPrefix(32) + "text/plain"),
        Selector("Selector_Mixed_8", Mixed(8)),
        Selector("Selector_AllInvalid_8", InvalidPrefix(8).TrimEnd(',')),
        Selector("Selector_ValidJson", "application/json"),
        Selector("Selector_ValidText", "text/plain"),
        Selector("Selector_ValidQuality", "text/plain;q=0.2,application/json;q=0.9"),
        Selector("Selector_BrowserIgnore", "application/json;q=0.9,*/*;q=0.8"),
        new("Selector_BrowserRespect", ["application/json;q=0.9,*/*;q=0.8"], WorkloadKind.Selector, RespectBrowser: true),
        new("Selector_UnsupportedReturn406", ["application/unknown"], WorkloadKind.Selector, Return406: true),
        Selector("Selector_EmptyQualityEnd", "application/json;q="),
        new("Selector_MultipleHeaders", ["application/json;q=bad", "", "text/plain;q=0.8"], WorkloadKind.Selector),
        Selector("Selector_ZeroQuality", "application/json;q=0")
    ];

    public AcceptWorkload(string name)
    {
        _definition = Definitions.Single(definition => definition.Name == name);
        var options = new MvcOptions
        {
            RespectBrowserAcceptHeader = _definition.RespectBrowser,
            ReturnHttpNotAcceptable = _definition.Return406
        };
        options.OutputFormatters.Add(new StringOutputFormatter());
        options.OutputFormatters.Add(new SystemTextJsonOutputFormatter(new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            TypeInfoResolver = new DefaultJsonTypeInfoResolver()
        }));
        _selector = new DefaultOutputFormatterSelector(Options.Create(options), NullLoggerFactory.Instance);
    }

    public int Run()
    {
        if (_definition.Kind == WorkloadKind.Accept)
        {
            return Checksum(Parse(_definition.Headers));
        }
        if (_definition.Kind == WorkloadKind.Selector)
        {
            var context = CreateContext();
            var formatter = _selector.SelectFormatter(context, NoFormatters, NoContentTypes);

            return SelectorChecksum(formatter, context);
        }
        try
        {
            var result = MediaType.CreateMediaTypeSegmentWithQuality(_definition.Headers[0], start: 0);

            return MediaChecksum(result);
        }
        catch (FormatException)
        {
            return -1;
        }
        catch (ArgumentOutOfRangeException)
        {
            return -2;
        }
    }

    public CaseReceipt Capture()
    {
        MediaReceipt[] media = [];
        string? formatterName = null;
        string? contentType = null;
        var serverDefined = false;
        string? publicException = null;
        string? publicParameter = null;
        var formatExceptions = 0;
        var otherExceptions = new List<string>();
        var thread = Environment.CurrentManagedThreadId;
        var checksum = 0;
        void Observe(object? sender, FirstChanceExceptionEventArgs args)
        {
            if (Environment.CurrentManagedThreadId != thread)
            {
                return;
            }
            if (args.Exception is FormatException)
            {
                formatExceptions++;
            }
            else
            {
                otherExceptions.Add(args.Exception.GetType().FullName ?? args.Exception.GetType().Name);
            }
        }
        AppDomain.CurrentDomain.FirstChanceException += Observe;
        try
        {
            if (_definition.Kind == WorkloadKind.Accept)
            {
                var parsed = Parse(_definition.Headers);
                media = parsed.Select(ToReceipt).ToArray();
                checksum = Checksum(parsed);
            }
            else if (_definition.Kind == WorkloadKind.Selector)
            {
                var context = CreateContext();
                var formatter = _selector.SelectFormatter(context, NoFormatters, NoContentTypes);
                formatterName = formatter?.GetType().FullName;
                contentType = context.ContentType.Value;
                serverDefined = context.ContentTypeIsServerDefined;
                checksum = SelectorChecksum(formatter, context);
            }
            else
            {
                try
                {
                    var result = MediaType.CreateMediaTypeSegmentWithQuality(_definition.Headers[0], start: 0);
                    media = [ToReceipt(result)];
                    checksum = MediaChecksum(result);
                }
                catch (FormatException exception)
                {
                    publicException = exception.GetType().FullName;
                    checksum = -1;
                }
                catch (ArgumentOutOfRangeException exception)
                {
                    publicException = exception.GetType().FullName;
                    publicParameter = exception.ParamName;
                    checksum = -2;
                }
            }
        }
        finally
        {
            AppDomain.CurrentDomain.FirstChanceException -= Observe;
        }

        return new CaseReceipt(_definition.Name, _definition.Headers, _definition.Kind, media, formatterName,
            contentType, serverDefined, publicException, publicParameter, checksum, formatExceptions, otherExceptions.ToArray());
    }

    public void Verify()
    {
        // Warm construction/runtime infrastructure before observing the actual parser call.
        Run();
        var oracle = JsonSerializer.Deserialize<ContractOracle>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "contract-oracles.json")), JsonOptions)
            ?? throw new InvalidOperationException("Missing original contract oracle.");
        var expected = oracle.Receipts.Single(receipt => receipt.Name == _definition.Name);
        var actual = Capture();
        var expectedFormats = _definition.Kind == WorkloadKind.PublicFactory || oracle.OwnerSha256 == OwnerHash
            ? expected.FormatExceptions : 0;
        if (actual.FormatExceptions != expectedFormats ||
            JsonSerializer.Serialize(actual with { FormatExceptions = expected.FormatExceptions }, JsonOptions) !=
                JsonSerializer.Serialize(expected, JsonOptions) ||
            Run() != expected.Checksum)
        {
            throw new InvalidOperationException("Producer/consumer contract differs for " + _definition.Name +
                Environment.NewLine + JsonSerializer.Serialize(actual, JsonOptions));
        }
        Console.WriteLine("Verified producer receipt: " + JsonSerializer.Serialize(actual));
    }

    private OutputFormatterWriteContext CreateContext()
    {
        var http = new DefaultHttpContext();
        http.Request.Headers.Accept = new StringValues(_definition.Headers);

        return new OutputFormatterWriteContext(http,
            static (stream, encoding) => new StreamWriter(stream, encoding), typeof(string), "payload");
    }

    private MediaReceipt ToReceipt(MediaTypeSegmentWithQuality result)
    {
        var bufferIndex = Array.FindIndex(_definition.Headers, header => ReferenceEquals(header, result.MediaType.Buffer));
        if (result.MediaType.HasValue && bufferIndex < 0)
        {
            throw new InvalidOperationException("Actual parser copied or replaced the original header buffer.");
        }

        return new MediaReceipt(bufferIndex, result.MediaType.Offset, result.MediaType.Length,
            result.MediaType.Value ?? "", BitConverter.DoubleToInt64Bits(result.Quality));
    }

    private static int Checksum(IList<MediaTypeSegmentWithQuality> parsed)
    {
        var checksum = parsed.Count;
        foreach (var value in parsed)
        {
            checksum = unchecked(checksum * 31 + MediaChecksum(value));
        }

        return checksum;
    }

    private static int MediaChecksum(MediaTypeSegmentWithQuality value)
    {
        return unchecked(TextChecksum(value.MediaType.AsSpan()) * 31 + value.Quality.GetHashCode());
    }

    private static int SelectorChecksum(IOutputFormatter? formatter, OutputFormatterWriteContext context)
    {
        var identity = formatter is StringOutputFormatter ? 1 : formatter is SystemTextJsonOutputFormatter ? 2 : 0;

        return unchecked(identity * 31 + TextChecksum(context.ContentType.AsSpan()));
    }

    private static int TextChecksum(ReadOnlySpan<char> value)
    {
        var checksum = 17;
        foreach (var character in value)
        {
            checksum = unchecked(checksum * 31 + character);
        }

        return checksum;
    }

    private static Func<IList<string>, IList<MediaTypeSegmentWithQuality>> CreateParserDelegate()
    {
        var owner = typeof(MediaType).Assembly.GetType(
            "Microsoft.AspNetCore.Mvc.Formatters.AcceptHeaderParser", throwOnError: true)
            ?? throw new InvalidOperationException("Actual internal Accept parser is missing.");
        var method = owner.GetMethod("ParseAcceptHeader", BindingFlags.Public | BindingFlags.Static, binder: null,
            types: [typeof(IList<string>)], modifiers: null)
            ?? throw new InvalidOperationException("Actual internal Accept parser overload is missing.");

        return method.CreateDelegate<Func<IList<string>, IList<MediaTypeSegmentWithQuality>>>();
    }

    private static CaseDefinition Accept(string name, string header)
    {
        return new CaseDefinition(name, [header], WorkloadKind.Accept);
    }

    private static CaseDefinition Public(string name, string header)
    {
        return new CaseDefinition(name, [header], WorkloadKind.PublicFactory);
    }

    private static CaseDefinition Selector(string name, string header)
    {
        return new CaseDefinition(name, [header], WorkloadKind.Selector);
    }

    private static string InvalidPrefix(int count)
    {
        return string.Concat(Enumerable.Repeat("application/json;q=bad,", count));
    }

    private static string Mixed(int count)
    {
        return string.Join(",", Enumerable.Range(0, count).Select(index =>
            index % 2 == 0 ? "application/json;q=bad" : "text/plain;q=0.8"));
    }
}
