using System.Collections;
using System.Linq.Expressions;
using System.Net.Security;
using System.Reflection;
using System.Security.Authentication;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.Server.Kestrel.Https;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

internal sealed record CaseSpec(string Name, int Count, string? ServerName, string Kind)
{
    public static CaseSpec[] All { get; } = Create();

    private static CaseSpec[] Create()
    {
        var values = new List<CaseSpec>();
        foreach (var count in new[] { 1, 2, 8, 64, 512 })
        {
            values.Add(new($"Patterns{count}_First", count, "client.p000.sni.test", "ordinary"));
            values.Add(new($"Patterns{count}_Last", count, $"client.p{count - 1:000}.sni.test", "ordinary"));
            values.Add(new($"Patterns{count}_Miss", count, "client.absent.sni.test", "ordinary"));
        }
        values.Add(new("Exact1_Control", 1, "exact.sni.test", "exact"));
        values.Add(new("Exact512_Control", 512, "exact.sni.test", "exact"));
        values.Add(new("Null_Control", 0, null, "ordinary"));
        values.Add(new("Empty_Control", 0, "", "ordinary"));
        values.Add(new("Overlap2", 0, "client.deep.sni.test", "overlap"));
        values.Add(new("Overlap64", 62, "client.deep.sni.test", "overlap"));
        values.Add(new("UnicodeSuffix", 1, "client.M\u00dcNCHEN.sni.test", "unicode"));
        values.Add(new("RawALabelDistinct", 1, "client.xn--mnchen-3ya.sni.test", "unicode"));
        values.Add(new("TrailingDot_Control", 64, "client.p000.sni.test.", "ordinary"));
        values.Add(new("OnAuthenticate512", 512, "client.p511.sni.test", "authenticate"));
        values.Add(new("CertificateSelector512", 512, "client.p511.sni.test", "selector"));
        var deepPrefix = string.Concat(Enumerable.Range(0, 12).Select(index => $"label{index}."));
        values.Add(new("Patterns1_Deep_Last", 1, deepPrefix + "client.p000.sni.test", "ordinary"));
        values.Add(new("Patterns2_Deep_Last", 2, deepPrefix + "client.p001.sni.test", "ordinary"));
        values.Add(new("Patterns512_Deep_Miss", 512, deepPrefix + "client.absent.sni.test", "ordinary"));
        return values.ToArray();
    }
}

internal sealed class SniFixture : IDisposable
{
    private static readonly Type SelectorType = typeof(KestrelServerOptions).Assembly.GetType(
        "Microsoft.AspNetCore.Server.Kestrel.Core.Internal.SniOptionsSelector", throwOnError: true)!;
    private static readonly ConstructorInfo Constructor = SelectorType.GetConstructors().Single();
    private static readonly ParameterInfo[] Parameters = Constructor.GetParameters();
    private static readonly Type DictionaryType = Parameters[1].ParameterType;
    private static readonly Type ConfigType = DictionaryType.GenericTypeArguments[1];
    private static readonly Type LoaderType = Parameters[2].ParameterType;
    private static readonly Type CertificateLoaderType = typeof(KestrelServerOptions).Assembly.GetType(
        "Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Certificates.CertificateConfigLoader", throwOnError: true)!;
    private static readonly PropertyInfo ProtocolsProperty = ConfigType.GetProperty("Protocols")!;
    private static readonly Type FeatureType = typeof(KestrelServerOptions).Assembly.GetType(
        "Microsoft.AspNetCore.Server.Kestrel.Core.Internal.HttpProtocolsFeature", throwOnError: true)!;
    private static readonly PropertyInfo FeatureProtocols = FeatureType.GetProperty("HttpProtocols")!;
    public static Func<TlsHandshakeCallbackContext, ValueTask<SslServerAuthenticationOptions>> OptionsCallback { get; } =
        SelectorType.GetMethod("OptionsCallback")!.CreateDelegate<Func<TlsHandshakeCallbackContext, ValueTask<SslServerAuthenticationOptions>>>();

    private readonly Func<ConnectionContext, string?, (SslServerAuthenticationOptions, ClientCertificateMode)> _select;
    private readonly CaseSpec _spec;
    private readonly DefaultConnectionContext _connection = new();
    private readonly Func<object, object> _construct;
    private readonly object _dictionary;
    private readonly int _wildcardCount;
    private int _authenticateCalls;
    private int _selectorCalls;

    public object Selector { get; }
    public ConnectionContext Connection => _connection;

    public SniFixture(CaseSpec spec, bool constructorProfile = false)
    {
        _spec = spec;
        var entries = (IDictionary)Activator.CreateInstance(DictionaryType)!;
        for (var index = 0; index < spec.Count; index++)
        {
            Add(entries, $"*.p{index:000}.sni.test", HttpProtocols.Http1);
        }
        Add(entries, "*", HttpProtocols.Http2);
        if (spec.Kind == "exact")
        {
            Add(entries, "exact.sni.test", HttpProtocols.Http1);
        }
        if (spec.Kind == "overlap")
        {
            Add(entries, "*.sni.test", HttpProtocols.Http2);
            Add(entries, "*.deep.sni.test", HttpProtocols.Http1);
        }
        if (spec.Kind == "unicode")
        {
            Add(entries, "*.m\u00fcnchen.sni.test", HttpProtocols.Http1);
        }
        _dictionary = entries;
        _wildcardCount = entries.Keys.Cast<string>().Count(name => name.StartsWith("*.", StringComparison.Ordinal));
        var loader = Activator.CreateInstance(CertificateLoaderType, new BenchmarkEnvironment(), NullLogger<KestrelServer>.Instance)!;
        var fallback = new HttpsConnectionAdapterOptions
        {
            ServerCertificate = CertificateSource.Current,
            SslProtocols = SslProtocols.Tls12
        };
        if (spec.Kind == "delay")
        {
            fallback.ClientCertificateMode = ClientCertificateMode.DelayCertificate;
        }
        if (spec.Kind == "authenticate")
        {
            fallback.OnAuthenticate = (_, options) =>
            {
                _authenticateCalls++;
                options.AllowRenegotiation = false;
            };
        }
        if (spec.Kind == "selector" || constructorProfile)
        {
            fallback.ServerCertificateSelector = (_, _) =>
            {
                _selectorCalls++;
                return CertificateSource.Current;
            };
        }
        var loggerType = Parameters[5].ParameterType.GenericTypeArguments[0];
        var logger = typeof(NullLogger<>).MakeGenericType(loggerType).GetField(nameof(NullLogger<object>.Instance))!.GetValue(null)!;
        var parameter = Expression.Parameter(typeof(object), "configuration");
        var create = Expression.New(Constructor, Expression.Constant("F069"),
            Expression.Convert(parameter, DictionaryType), Expression.Constant(loader, LoaderType),
            Expression.Constant(fallback), Expression.Constant(HttpProtocols.Http1), Expression.Constant(logger, Parameters[5].ParameterType));
        _construct = Expression.Lambda<Func<object, object>>(Expression.Convert(create, typeof(object)), parameter).Compile();
        Selector = _construct(_dictionary);
        _select = SelectorType.GetMethod("GetOptions")!.CreateDelegate<Func<ConnectionContext, string?, (SslServerAuthenticationOptions, ClientCertificateMode)>>(Selector);
    }

    private static void Add(IDictionary dictionary, string name, HttpProtocols protocols)
    {
        var config = Activator.CreateInstance(ConfigType)!;
        ProtocolsProperty.SetValue(config, protocols);
        dictionary.Add(name, config);
    }

    public SslServerAuthenticationOptions Select()
    {
        return _select(_connection, _spec.ServerName).Item1;
    }

    public object Construct()
    {
        return _construct(_dictionary);
    }

    public object Verify()
    {
        var first = _select(_connection, _spec.ServerName);
        var second = _select(_connection, _spec.ServerName);
        var protocol = (HttpProtocols)FeatureProtocols.GetValue(_connection.Features[FeatureType])!;
        var expectFirst = _spec.Kind is "exact" or "overlap" or "authenticate" or "selector" ||
            _spec.Name == "UnicodeSuffix" || _spec.Name.EndsWith("_First", StringComparison.Ordinal) ||
            _spec.Name.EndsWith("_Last", StringComparison.Ordinal);
        var expected = expectFirst ? HttpProtocols.Http1 : HttpProtocols.Http2;
        var cloned = _spec.Kind is "authenticate" or "selector";
        if (protocol != expected || !ReferenceEquals(first.Item1.ServerCertificate, CertificateSource.Current) ||
            !ReferenceEquals(second.Item1.ServerCertificate, CertificateSource.Current) ||
            first.Item2 != (_spec.Kind == "delay" ? ClientCertificateMode.DelayCertificate : ClientCertificateMode.NoCertificate) ||
            ReferenceEquals(first.Item1, second.Item1) == cloned ||
            first.Item1.EnabledSslProtocols != SslProtocols.Tls12 ||
            first.Item1.ApplicationProtocols?.Single() != (expectFirst ? SslApplicationProtocol.Http11 : SslApplicationProtocol.Http2) ||
            (_spec.Kind == "authenticate" && (_authenticateCalls != 2 || first.Item1.AllowRenegotiation)) ||
            (_spec.Kind == "selector" && _selectorCalls != 2))
        {
            throw new InvalidOperationException($"Original complete option contract failed:{_spec.Name}");
        }
        return new
        {
            _spec.Name, _spec.ServerName, _spec.Kind,
            configured_wildcards = _wildcardCount,
            selected_protocols = protocol.ToString(), selected_client_mode = first.Item2.ToString(),
            ssl_protocols = first.Item1.EnabledSslProtocols.ToString(),
            alpn = first.Item1.ApplicationProtocols!.Select(value => Convert.ToHexString(value.Protocol.Span)).ToArray(),
            cached_same_options = ReferenceEquals(first.Item1, second.Item1),
            certificate_is_actual_generated_server_certificate = true,
            allow_renegotiation = first.Item1.AllowRenegotiation,
            authenticate_calls = _authenticateCalls, selector_calls = _selectorCalls,
            actual_shipping_constructor_and_getoptions = true,
            prepared_connection_selection_not_full_tls_throughput = true
        };
    }

    public void Dispose()
    {
        _connection.DisposeAsync().GetAwaiter().GetResult();
    }

    private sealed class BenchmarkEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "AutoPerf.F069";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
