using System.Collections;
using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

[MemoryDiagnoser]
public class DfaLiteralBuildBenchmark
{
    private static readonly Scenario[] Scenarios =
    [
        new("Empty", 0, Complex: 0),
        new("LiteralOnly_1", 1, Complex: 0),
        new("LiteralOnly_32", 32, Complex: 0),
        new("LiteralOnly_256", 256, Complex: 0),
        new("SimpleConstraint_32_2", 32, Complex: 2, Kind: Mode.Simple),
        new("NoSiblingLiterals_8", 0, Complex: 8),
        new("Match_1_1", 1),
        new("Match_8_1", 8),
        new("Match_32_1", 32),
        new("Match_128_1", 128),
        new("Match_512_1", 512),
        new("Match_32_8", 32, Complex: 8),
        new("Match_128_8", 128, Complex: 8),
        new("Match_512_8", 512, Complex: 8),
        new("Miss_32_1", 32, Kind: Mode.Miss),
        new("Miss_128_8", 128, Complex: 8, Kind: Mode.Miss),
        new("IntMixed_32_4", 32, Complex: 4, Kind: Mode.IntMixed),
        new("IntMixed_128_4", 128, Complex: 4, Kind: Mode.IntMixed),
        new("IntMixed_512_4", 512, Complex: 4, Kind: Mode.IntMixed),
        new("IntReject_128_4", 128, Complex: 4, Kind: Mode.IntReject),
        new("OptionalMixed_128_4", 128, Complex: 4, Kind: Mode.OptionalMixed),
        new("Unicode_128_4", 128, Complex: 4, Kind: Mode.Unicode),
        new("LongPrefix_128_4", 128, Complex: 4, PrefixLength: 128),
        new("Grouped_32_8", 32, Complex: 4, Groups: 8)
    ];

    public static IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private ServiceProvider _services = null!;
    private Type _builderType = null!;
    private RouteEndpoint[] _endpoints = [];
    private Probe[] _probes = [];
    private Action<object, RouteEndpoint> _add = null!;
    private Func<object, object> _build = null!;
    private Func<object, bool, object> _buildTree = null!;
    private Func<object, HttpContext, Task> _match = null!;
    private FieldInfo _states = null!;

    [GlobalSetup]
    public void Setup()
    {
        var scenario = Scenarios.Single(scenario => scenario.Name == Case);
        var services = new ServiceCollection();
        services.AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance);
        services.AddRouting();
        _services = services.BuildServiceProvider();
        var owner = typeof(RouteEndpoint).Assembly;
        _builderType = owner.GetType("Microsoft.AspNetCore.Routing.Matching.DfaMatcherBuilder", throwOnError: true)!;
        var matcherType = owner.GetType("Microsoft.AspNetCore.Routing.Matching.Matcher", throwOnError: true)!;
        var dfaMatcherType = owner.GetType("Microsoft.AspNetCore.Routing.Matching.DfaMatcher", throwOnError: true)!;
        _states = dfaMatcherType.GetField("_states", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new InvalidOperationException("Missing actual matcher state table.");
        BindCalls(matcherType);
        CreateEndpoints(scenario);
        var matcher = Build();
        if (matcher.GetType() != dfaMatcherType || matcher.GetType().Assembly != owner)
        {
            throw new InvalidOperationException("The actual complete owning matcher was not built.");
        }
        var probeReceipt = VerifyMatcher(matcher);
        var tree = _buildTree(CreatePopulatedBuilder(), true);
        var firstTree = DescribeTree(tree);
        var secondTree = DescribeTree(_buildTree(CreatePopulatedBuilder(), true));
        var secondMatcher = Build();
        if (firstTree != secondTree || VerifyMatcher(secondMatcher) != probeReceipt ||
            ((Array)_states.GetValue(matcher)!).Length != ((Array)_states.GetValue(secondMatcher)!).Length)
        {
            throw new InvalidOperationException("Complete repeated build/graph/selection results changed.");
        }
        var traversesComplexLiteralSiblings = scenario.Literals > 0 && scenario.Complex > 0 && scenario.Kind is not Mode.Simple;
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            Case,
            EndpointCount = _endpoints.Length,
            LiteralSiblingsPerParent = scenario.Literals,
            ComplexRoutesPerParent = scenario.Complex,
            ParentGroups = scenario.Groups,
            TraversesComplexLiteralSiblings = traversesComplexLiteralSiblings,
            SuccessfulLiteralMembership = traversesComplexLiteralSiblings && scenario.Kind is not (Mode.Miss or Mode.IntReject),
            StateCount = ((Array)_states.GetValue(matcher)!).Length,
            CompleteOrderedTreeHash = Hash(firstTree),
            ProbeCount = _probes.Length,
            CompleteSelectionHash = Hash(probeReceipt),
            ActualBuilderType = _builderType.FullName,
            ActualMatcherType = matcher.GetType().FullName,
            CachedReflectionBridgesOutsideTiming = true
        }));
    }

    [Benchmark]
    public object Build()
    {
        return _build(CreatePopulatedBuilder());
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _services.Dispose();
    }

    private object CreatePopulatedBuilder()
    {
        var builder = _services.GetRequiredService(_builderType);
        foreach (var endpoint in _endpoints)
        {
            _add(builder, endpoint);
        }
        return builder;
    }

    private void BindCalls(Type matcherType)
    {
        var builder = Expression.Parameter(typeof(object));
        var endpoint = Expression.Parameter(typeof(RouteEndpoint));
        var includeLabel = Expression.Parameter(typeof(bool));
        var matcher = Expression.Parameter(typeof(object));
        var context = Expression.Parameter(typeof(HttpContext));
        var add = RequiredMethod(_builderType, "AddEndpoint", typeof(RouteEndpoint));
        var build = RequiredMethod(_builderType, nameof(Build));
        var tree = RequiredMethod(_builderType, "BuildDfaTree", typeof(bool));
        var match = RequiredMethod(matcherType, "MatchAsync", typeof(HttpContext));
        _add = Expression.Lambda<Action<object, RouteEndpoint>>(
            Expression.Call(Expression.Convert(builder, _builderType), add, endpoint), builder, endpoint).Compile();
        _build = Expression.Lambda<Func<object, object>>(
            Expression.Convert(Expression.Call(Expression.Convert(builder, _builderType), build), typeof(object)), builder).Compile();
        _buildTree = Expression.Lambda<Func<object, bool, object>>(
            Expression.Convert(Expression.Call(Expression.Convert(builder, _builderType), tree, includeLabel), typeof(object)),
            builder, includeLabel).Compile();
        _match = Expression.Lambda<Func<object, HttpContext, Task>>(
            Expression.Call(Expression.Convert(matcher, matcherType), match, context), matcher, context).Compile();
    }

    private void CreateEndpoints(Scenario scenario)
    {
        var endpoints = new List<RouteEndpoint>();
        var probes = new List<Probe>();
        for (var group = 0; group < scenario.Groups; group++)
        {
            var groupPrefix = scenario.Groups > 1 ? $"group{group}/" : string.Empty;
            var literals = Enumerable.Range(0, scenario.Literals).Select(index => CreateLiteral(scenario, index)).ToArray();
            foreach (var literal in literals)
            {
                var endpoint = CreateEndpoint($"{groupPrefix}{literal.Key}/literal", $"literal:{group}:{literal.Key}");
                endpoints.Add(endpoint);
                probes.Add(new Probe($"/{groupPrefix}{literal.Key}/literal", endpoint, []));
            }
            if (literals.Length > 0)
            {
                probes.Add(new Probe($"/{groupPrefix}{literals[0].Key.ToLowerInvariant()}/literal", endpoints[^literals.Length], []));
            }
            for (var complex = 0; complex < scenario.Complex; complex++)
            {
                var parameter = scenario.Kind switch
                {
                    Mode.Simple => "{number:int}",
                    Mode.IntMixed or Mode.IntReject => "{prefix}-{number:int}.{extension?}",
                    _ => "{prefix}-{number}.{extension?}"
                };
                var endpoint = CreateEndpoint($"{groupPrefix}{parameter}/next{complex}", $"complex:{group}:{complex}");
                endpoints.Add(endpoint);
                foreach (var literal in literals)
                {
                    probes.Add(new Probe($"/{groupPrefix}{literal.Key}/next{complex}",
                        literal.MatchesComplex ? endpoint : null,
                        literal.MatchesComplex ? Values(scenario.Kind, literal) : []));
                }
                var fallback = scenario.Kind is Mode.Simple
                    ? new Literal("42", string.Empty, "42", null, true)
                    : new Literal("Fallback-42.txt", "Fallback", "42", "txt", true);
                probes.Add(new Probe($"/{groupPrefix}{fallback.Key}/next{complex}", endpoint, Values(scenario.Kind, fallback)));
            }
        }
        probes.Add(new Probe("/unregistered/path", null, []));
        _endpoints = endpoints.ToArray();
        _probes = probes.ToArray();
    }

    private static Literal CreateLiteral(Scenario scenario, int index)
    {
        if (scenario.Kind is Mode.Simple)
        {
            var value = (10_000 + index).ToString(CultureInfo.InvariantCulture);
            return new Literal(value, string.Empty, value, null, true);
        }
        var prefix = new string('L', scenario.PrefixLength) +
            (scenario.Kind is Mode.Unicode ? "\u03b1\u03bb\u03c6\u03b1" : "Item") + index.ToString("D4", CultureInfo.InvariantCulture);
        if (scenario.Kind is Mode.Miss)
        {
            return new Literal(prefix, prefix, string.Empty, null, false);
        }
        var rejects = scenario.Kind is Mode.IntReject || scenario.Kind is Mode.IntMixed && index % 2 != 0;
        var number = rejects ? "invalid" : index.ToString("D4", CultureInfo.InvariantCulture);
        var extension = scenario.Kind is Mode.OptionalMixed && index % 2 != 0 ? null : "txt";
        var key = prefix + "-" + number + (extension is null ? string.Empty : "." + extension);
        return new Literal(key, prefix, number, extension, !rejects);
    }

    private static KeyValuePair<string, string>[] Values(Mode mode, Literal literal)
    {
        if (mode is Mode.Simple)
        {
            return [new("number", literal.Number)];
        }
        return literal.Extension is null
            ? [new("prefix", literal.Prefix), new("number", literal.Number)]
            : [new("prefix", literal.Prefix), new("number", literal.Number), new("extension", literal.Extension)];
    }

    private string VerifyMatcher(object matcher)
    {
        var receipt = new StringBuilder();
        foreach (var probe in _probes)
        {
            var context = new DefaultHttpContext();
            context.Request.Path = probe.Path;
            _match(matcher, context).GetAwaiter().GetResult();
            if (!ReferenceEquals(probe.Endpoint, context.GetEndpoint()) ||
                context.Request.RouteValues.Count != probe.Values.Length ||
                probe.Values.Any(pair => !context.Request.RouteValues.TryGetValue(pair.Key, out var actual) ||
                    actual is not string value || value != pair.Value))
            {
                throw new InvalidOperationException($"Actual matcher endpoint/values mismatch: {Case} {probe.Path}");
            }
            receipt.Append(probe.Path).Append('|').Append(context.GetEndpoint()?.DisplayName).Append('|');
            foreach (var pair in context.Request.RouteValues)
            {
                receipt.Append(pair.Key).Append('=').Append(pair.Value).Append(';');
            }
            receipt.AppendLine();
        }
        return receipt.ToString();
    }

    private static string DescribeTree(object root)
    {
        var ids = new Dictionary<object, int>(ReferenceEqualityComparer.Instance);
        var pending = new Queue<object>();
        var text = new StringBuilder();
        Add(root);
        while (pending.TryDequeue(out var node))
        {
            text.Append(ids[node]).Append(':').Append(Read(node, "PathDepth")).Append(':').Append(Read(node, "Label")).Append('|');
            if (Read(node, "Matches") is IEnumerable<Endpoint> matches)
            {
                foreach (var endpoint in matches)
                {
                    text.Append(endpoint.DisplayName).Append(';');
                }
            }
            foreach (var property in new[] { "Literals", "PolicyEdges" })
            {
                if (Read(node, property) is IDictionary edges)
                {
                    foreach (DictionaryEntry entry in edges)
                    {
                        text.Append('|').Append(property).Append(':').Append(entry.Key).Append("->").Append(Add(entry.Value!));
                    }
                }
            }
            foreach (var property in new[] { "Parameters", "CatchAll" })
            {
                if (Read(node, property) is object child)
                {
                    text.Append('|').Append(property).Append("->").Append(Add(child));
                }
            }
            text.AppendLine();
        }
        return text.ToString();

        int Add(object node)
        {
            if (!ids.TryGetValue(node, out var id))
            {
                id = ids.Count;
                ids.Add(node, id);
                pending.Enqueue(node);
            }
            return id;
        }
    }

    private static object? Read(object node, string property)
    {
        var member = node.GetType().GetProperty(property, BindingFlags.Instance | BindingFlags.Public)
            ?? throw new InvalidOperationException($"Missing actual DFA property {property}.");
        return member.GetValue(node);
    }

    private static MethodInfo RequiredMethod(Type type, string name, params Type[] parameters)
    {
        return type.GetMethod(name, BindingFlags.Instance | BindingFlags.Public, parameters)
            ?? throw new InvalidOperationException($"Missing actual owner method {name}.");
    }

    private static RouteEndpoint CreateEndpoint(string pattern, string name)
    {
        return new RouteEndpoint(static _ => Task.CompletedTask, RoutePatternFactory.Parse(pattern), 0,
            new EndpointMetadataCollection(), name);
    }

    private static string Hash(string value)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }

    private sealed record Scenario(string Name, int Literals, int Complex = 1, Mode Kind = Mode.Match,
        int Groups = 1, int PrefixLength = 0);
    private sealed record Literal(string Key, string Prefix, string Number, string? Extension, bool MatchesComplex);
    private sealed record Probe(string Path, RouteEndpoint? Endpoint, KeyValuePair<string, string>[] Values);
    private enum Mode
    {
        Match,
        Miss,
        Simple,
        IntMixed,
        IntReject,
        OptionalMixed,
        Unicode
    }
}
