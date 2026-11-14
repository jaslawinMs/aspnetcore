using System.Globalization;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Constraints;
using Microsoft.AspNetCore.Routing.Matching;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.DependencyInjection;

public class MaxRouteConstraintBenchmark
{
    private MaxRouteConstraint _constraint = null!;
    private RouteValueDictionary _values = null!;
    private Mode _mode;
    private string _literal = "";
    private LinkGenerator _linkGenerator = null!;
    private ServiceProvider? _services;

    public IEnumerable<string> Cases =>
    [
        "Int32_Hit", "Int32_Miss", "Int32_Min", "Int32_Max", "Int32_Negative",
        "Int64_Hit", "Int64_Miss", "Int64_Min", "Int64_Max", "Int64_MaxRejected",
        "Int64_Large", "Int64_Negative",
        "String_Hit", "String_Miss", "String_Max", "String_Padded", "String_Fraction",
        "String_Overflow", "Decimal_Integral", "Decimal_Scaled", "Double_Integral",
        "Double_Scientific", "UInt64_Max", "UInt64_Overflow", "Enum_Named",
        "Enum_Unnamed", "Formattable", "Missing", "Null",
        "Literal_Max", "Literal_Miss",
        "Link_Int32_Hit", "Link_Int32_Miss", "Link_Int64_Hit", "Link_Int64_Miss",
    ];

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    public string VerifiedProducer { get; private set; } = "";
    public string? VerifiedValueType { get; private set; }
    public bool VerifiedResult { get; private set; }
    public bool VerifiedInputPreserved { get; private set; }
    public string? VerifiedPath { get; private set; }
    public bool? VerifiedInvariantProvider { get; private set; }

    [GlobalSetup]
    public void Setup()
    {
        (object? Input, long Maximum, bool Expected, Mode Mode, string? Path) scenario = Case switch
        {
            "Int32_Hit" => (42, 42L, true, Mode.Match, null),
            "Int32_Miss" => (43, 42L, false, Mode.Match, null),
            "Int32_Min" => (int.MinValue, (long)int.MinValue, true, Mode.Match, null),
            "Int32_Max" => (int.MaxValue, (long)int.MaxValue, true, Mode.Match, null),
            "Int32_Negative" => (-100, -99L, true, Mode.Match, null),
            "Int64_Hit" => (42L, 42L, true, Mode.Match, null),
            "Int64_Miss" => (43L, 42L, false, Mode.Match, null),
            "Int64_Min" => (long.MinValue, long.MinValue, true, Mode.Match, null),
            "Int64_Max" => (long.MaxValue, long.MaxValue, true, Mode.Match, null),
            "Int64_MaxRejected" => (long.MaxValue, long.MaxValue - 1, false, Mode.Match, null),
            "Int64_Large" => (1234567890123456789L, long.MaxValue, true, Mode.Match, null),
            "Int64_Negative" => (-1234567890123456789L, -1L, true, Mode.Match, null),
            "String_Hit" => ("42", 42L, true, Mode.Match, null),
            "String_Miss" => ("43", 42L, false, Mode.Match, null),
            "String_Max" => ("9223372036854775807", long.MaxValue, true, Mode.Match, null),
            "String_Padded" => (" +0042 ", 42L, true, Mode.Match, null),
            "String_Fraction" => ("42.0", 42L, false, Mode.Match, null),
            "String_Overflow" => ("9223372036854775808", long.MaxValue, false, Mode.Match, null),
            "Decimal_Integral" => (42m, 42L, true, Mode.Match, null),
            "Decimal_Scaled" => (42.0m, 42L, false, Mode.Match, null),
            "Double_Integral" => (42d, 42L, true, Mode.Match, null),
            "Double_Scientific" => (1e18, long.MaxValue, false, Mode.Match, null),
            "UInt64_Max" => ((ulong)long.MaxValue, long.MaxValue, true, Mode.Match, null),
            "UInt64_Overflow" => (ulong.MaxValue, long.MaxValue, false, Mode.Match, null),
            "Enum_Named" => (SampleEnum.Answer, 42L, false, Mode.Match, null),
            "Enum_Unnamed" => ((SampleEnum)41, 42L, true, Mode.Match, null),
            "Formattable" => (new InvariantFormattable(), 42L, true, Mode.Match, null),
            "Missing" => (null, 42L, false, Mode.Match, null),
            "Null" => (null, 42L, false, Mode.Match, null),
            "Literal_Max" => ("9223372036854775807", long.MaxValue, true, Mode.Literal, null),
            "Literal_Miss" => ("43", 42L, false, Mode.Literal, null),
            "Link_Int32_Hit" => (42, 42L, true, Mode.Link, "/bounded/42"),
            "Link_Int32_Miss" => (43, 42L, false, Mode.Link, null),
            "Link_Int64_Hit" => (42L, 42L, true, Mode.Link, "/bounded/42"),
            "Link_Int64_Miss" => (43L, 42L, false, Mode.Link, null),
            _ => throw new InvalidOperationException($"Unknown case: {Case}"),
        };
        var (input, maximum, expected, mode, path) = scenario;
        if ((Case.StartsWith("Int32_", StringComparison.Ordinal) || Case.StartsWith("Link_Int32_", StringComparison.Ordinal))
            && input is not int)
        {
            throw new InvalidOperationException($"Int32 producer type mismatch: {Case}");
        }
        if ((Case.StartsWith("Int64_", StringComparison.Ordinal) || Case.StartsWith("Link_Int64_", StringComparison.Ordinal))
            && input is not long)
        {
            throw new InvalidOperationException($"Int64 producer type mismatch: {Case}");
        }

        _constraint = new MaxRouteConstraint(maximum);
        _values = new RouteValueDictionary();
        if (Case != "Missing")
        {
            _values["id"] = input;
        }

        _mode = mode;
        if (mode == Mode.Literal)
        {
            _literal = input as string ?? throw new InvalidOperationException("Literal must be text.");
        }
        else if (mode == Mode.Link)
        {
            var endpoint = new RouteEndpoint(
                context => Task.CompletedTask,
                RoutePatternFactory.Parse("/bounded/{id:max(42)}"),
                0,
                new EndpointMetadataCollection(new EndpointNameMetadata("bounded")),
                "bounded");
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddRouting();
            services.AddSingleton<EndpointDataSource>(new DefaultEndpointDataSource(endpoint));
            _services = services.BuildServiceProvider();
            _linkGenerator = _services.GetRequiredService<LinkGenerator>();
            VerifiedPath = _linkGenerator.GetPathByName("bounded", _values);
            if (VerifiedPath != path)
            {
                throw new InvalidOperationException($"Complete link output mismatch: {Case}");
            }
        }

        var actual = Match();
        if (actual != expected)
        {
            throw new InvalidOperationException($"Boolean contract mismatch: {Case}");
        }
        VerifiedInputPreserved = Case == "Missing"
            ? _values.Count == 0
            : _values.Count == 1 && ReferenceEquals(input, _values["id"]);
        if (!VerifiedInputPreserved)
        {
            throw new InvalidOperationException($"Route value changed: {Case}");
        }

        if (input is InvariantFormattable formattable)
        {
            VerifiedInvariantProvider = formattable.Calls == 1 && formattable.ReceivedInvariantProvider;
            if (VerifiedInvariantProvider != true)
            {
                throw new InvalidOperationException("Actual conversion did not use the invariant provider.");
            }
        }

        VerifiedResult = actual;
        VerifiedValueType = input?.GetType().FullName;
        VerifiedProducer = mode switch
        {
            Mode.Match => "RouteValueDictionary -> public MaxRouteConstraint.Match (UrlGeneration)",
            Mode.Literal => "IParameterLiteralNodeMatchingPolicy.MatchesLiteral",
            Mode.Link => "Parsed max(42) endpoint -> DI-resolved LinkGenerator.GetPathByName",
            _ => throw new InvalidOperationException("Unknown producer."),
        };
    }

    [Benchmark]
    public bool Match()
    {
        return _mode switch
        {
            Mode.Match => _constraint.Match(null, null, "id", _values, RouteDirection.UrlGeneration),
            Mode.Literal => ((IParameterLiteralNodeMatchingPolicy)_constraint).MatchesLiteral("id", _literal),
            Mode.Link => _linkGenerator.GetPathByName("bounded", _values) is not null,
            _ => throw new InvalidOperationException("Unknown operation."),
        };
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _services?.Dispose();
    }

    private enum Mode
    {
        Match,
        Literal,
        Link,
    }

    private enum SampleEnum
    {
        Answer = 42,
    }

    private sealed class InvariantFormattable : IFormattable
    {
        public int Calls { get; private set; }
        public bool ReceivedInvariantProvider { get; private set; }

        public string ToString(string? format, IFormatProvider? formatProvider)
        {
            Calls++;
            ReceivedInvariantProvider = format is null && ReferenceEquals(formatProvider, CultureInfo.InvariantCulture);

            return "42";
        }
    }
}
