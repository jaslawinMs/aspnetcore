using System.Linq.Expressions;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Primitives;

namespace AutoPerf;

public class CookieMergeBenchmark
{
    private IHeaderDictionary _headers = null!;
    private StringValues _original;
    private byte[][] _encodedValues = null!;
    private byte[] _headerName = null!;
    private bool _append;
    private bool _accept;

    public IEnumerable<string> Cases =>
    [
        "Merge2x8", "Merge3x8", "Merge8x8", "Merge32x8",
        "Merge3x128", "Merge8x128", "Merge2x4096", "Merge8x2048",
        "MergeEmpty", "MergeNulls",
        "Append2x8", "Append8x8", "Append3x128", "Append8x2048",
        "NoCookieControl", "EmptyControl", "SingleControl", "AcceptControl"
    ];

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        _headers = HeaderAccess.Create();
        _append = Case.StartsWith("Append", StringComparison.Ordinal);
        _accept = Case == "AcceptControl";
        _append |= _accept;
        _headerName = Encoding.ASCII.GetBytes(_accept ? "Accept" : "Cookie");
        string?[] values = Case switch
        {
            "MergeEmpty" => ["", "b=1", ""],
            "MergeNulls" => [null, "b=1", null],
            "NoCookieControl" or "EmptyControl" => [],
            "SingleControl" => ["a=0"],
            "AcceptControl" => ["application/json"],
            _ => CreateValues(Case)
        };
        _original = new StringValues(values);
        _encodedValues = values.Select(value => Encoding.ASCII.GetBytes(value ?? "")).ToArray();
        if (Case == "NoCookieControl")
        {
            _headers.Host = "example.test";
        }

        Prepare();
        var produced = _accept ? _headers.Accept : _headers.Cookie;
        if (!produced.SequenceEqual(values))
        {
            throw new InvalidOperationException($"Header producer values differ for {Case}.");
        }

        bool? originalArrayReused = null;
        if (!_accept && produced.Count > 1)
        {
            originalArrayReused = ReferenceEquals(produced.ToArray(), produced.ToArray());
            if (originalArrayReused != true)
            {
                throw new InvalidOperationException($"Unexpected copy by actual StringValues.ToArray for {Case}.");
            }
        }

        var expected = BuildExpected(values);
        var output = Execute();
        if (!string.Equals(output, expected, StringComparison.Ordinal) ||
            (!_accept && values.Length > 1 && _headers.Cookie.Count != 1) ||
            !produced.SequenceEqual(values))
        {
            throw new InvalidOperationException($"Merged cookie contract differs for {Case}.");
        }

        Console.WriteLine("Contract receipt: " + JsonSerializer.Serialize(new
        {
            name = Case,
            producer = _append ? "Actual Kestrel Append/OnHeadersComplete/MergeCookies" : "Prebuilt StringValues reset / actual Kestrel MergeCookies",
            input_value_count = values.Length,
            original_array_reused = originalArrayReused,
            header = _accept ? "Accept" : "Cookie",
            complete_header = output,
            complete_header_sha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(output))),
            input_values_retained = produced.SequenceEqual(values),
            merged_value_count = (_accept ? _headers.Accept : _headers.Cookie).Count,
            primitives_mvid = typeof(StringValues).Module.ModuleVersionId
        }));
    }

    [Benchmark]
    public string Execute()
    {
        Prepare();
        HeaderAccess.Merge(_headers);

        return (_accept ? _headers.Accept : _headers.Cookie).ToString();
    }

    private void Prepare()
    {
        if (_append)
        {
            _headers.Clear();
            foreach (var bytes in _encodedValues)
            {
                HeaderAccess.Append(_headers, _headerName, bytes, checkForNewlineChars: false);
            }
            HeaderAccess.Complete(_headers);
        }
        else if (Case != "NoCookieControl")
        {
            _headers.Cookie = _original;
        }
    }

    private static string?[] CreateValues(string name)
    {
        var shape = name.AsSpan(name.StartsWith("Merge", StringComparison.Ordinal) ? 5 : 6);
        var separator = shape.IndexOf('x');
        if (separator < 0)
        {
            throw new InvalidOperationException($"Unknown case {name}.");
        }
        var count = int.Parse(shape[..separator]);
        var length = int.Parse(shape[(separator + 1)..]);

        return Enumerable.Range(0, count).Select(index => $"c{index}=" + new string('x', length)).ToArray();
    }

    private static string BuildExpected(string?[] values)
    {
        var expected = new StringBuilder();
        for (var index = 0; index < values.Length; index++)
        {
            if (index != 0)
            {
                expected.Append("; ");
            }
            expected.Append(values[index]);
        }

        return expected.ToString();
    }
}

internal static class HeaderAccess
{
    internal delegate void AppendDelegate(IHeaderDictionary headers, ReadOnlySpan<byte> name, ReadOnlySpan<byte> value, bool checkForNewlineChars);

    internal static Assembly Owner { get; } = typeof(KestrelServerOptions).Assembly;
    internal static Type Type { get; } = Owner.GetType("Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http.HttpRequestHeaders", throwOnError: true)!;
    internal static Func<IHeaderDictionary> Create { get; } = CreateConstructor();
    internal static Action<IHeaderDictionary> Merge { get; } = CreateAction("MergeCookies");
    internal static Action<IHeaderDictionary> Complete { get; } = CreateAction("OnHeadersComplete");
    internal static AppendDelegate Append { get; } = CreateAppend();

    private static Func<IHeaderDictionary> CreateConstructor()
    {
        var constructor = Type.GetConstructor([typeof(bool), typeof(Func<string, Encoding?>)])
            ?? throw new InvalidOperationException("Actual Kestrel header constructor not found.");
        var body = Expression.Convert(Expression.New(constructor, Expression.Constant(true), Expression.Constant(null, typeof(Func<string, Encoding?>))), typeof(IHeaderDictionary));

        return Expression.Lambda<Func<IHeaderDictionary>>(body).Compile();
    }

    private static Action<IHeaderDictionary> CreateAction(string name)
    {
        var method = Type.GetMethod(name, BindingFlags.Instance | BindingFlags.Public)
            ?? throw new InvalidOperationException($"Actual Kestrel header method {name} not found.");
        var headers = Expression.Parameter(typeof(IHeaderDictionary), "headers");
        var body = Expression.Call(Expression.Convert(headers, Type), method);

        return Expression.Lambda<Action<IHeaderDictionary>>(body, headers).Compile();
    }

    private static AppendDelegate CreateAppend()
    {
        var method = Type.GetMethod("Append", [typeof(ReadOnlySpan<byte>), typeof(ReadOnlySpan<byte>), typeof(bool)])
            ?? throw new InvalidOperationException("Actual Kestrel Append method not found.");
        var headers = Expression.Parameter(typeof(IHeaderDictionary), "headers");
        var name = Expression.Parameter(typeof(ReadOnlySpan<byte>), "name");
        var value = Expression.Parameter(typeof(ReadOnlySpan<byte>), "value");
        var check = Expression.Parameter(typeof(bool), "checkForNewlineChars");
        var body = Expression.Call(Expression.Convert(headers, Type), method, name, value, check);

        return Expression.Lambda<AppendDelegate>(body, headers, name, value, check).Compile();
    }
}
