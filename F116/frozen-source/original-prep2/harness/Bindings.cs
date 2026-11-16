using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Linq.Expressions;
using System.Reflection;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.AspNetCore.SignalR;

namespace AutoPerf;

internal delegate void ContextTagWriter(ref TagList tags, BaseConnectionContext context);
internal delegate void FeatureTagWriter(ref List<KeyValuePair<string, object?>> tags, IFeatureCollection features);

internal sealed class OwnerBinding
{
    internal OwnerBinding(Assembly assembly)
    {
        Assembly = assembly;
        var type = assembly.GetType("Microsoft.AspNetCore.Shared.ConnectionEndpointTags", throwOnError: true)!;
        Get = type.GetMethod("GetBoxedPort", BindingFlags.Static | BindingFlags.NonPublic)!.CreateDelegate<Func<int, object>>();
        var methods = type.GetMethods(BindingFlags.Static | BindingFlags.Public).Where(method => method.Name == "AddConnectionEndpointTags").ToArray();
        ContextTags = methods.Single(method => method.GetParameters()[1].ParameterType == typeof(BaseConnectionContext))
            .MakeGenericMethod(typeof(TagList)).CreateDelegate<ContextTagWriter>();
        FeatureTags = methods.Single(method => method.GetParameters()[1].ParameterType == typeof(IFeatureCollection))
            .MakeGenericMethod(typeof(List<KeyValuePair<string, object?>>)).CreateDelegate<FeatureTagWriter>();
        CacheFields = type.GetFields(BindingFlags.Static | BindingFlags.NonPublic).Where(field => field.FieldType == typeof(object)).OrderBy(field => field.Name, StringComparer.Ordinal).ToArray();
    }

    internal Assembly Assembly { get; }
    internal Func<int, object> Get { get; }
    internal ContextTagWriter ContextTags { get; }
    internal FeatureTagWriter FeatureTags { get; }
    internal FieldInfo[] CacheFields { get; }
    internal object CacheSnapshot() => new
    {
        owner = Assembly.GetName().Name,
        slots = CacheFields.Select(field => new { name = field.Name, value = field.GetValue(null), valueType = field.GetValue(null)?.GetType().FullName })
    };
}

internal static class Bindings
{
    internal static readonly OwnerBinding Kestrel = new(typeof(KestrelServerOptions).Assembly);
    internal static readonly OwnerBinding SignalR = new(typeof(Hub).Assembly);
    internal static readonly OwnerBinding HttpConnections = new(typeof(HttpConnectionDispatcherOptions).Assembly);
    internal static readonly OwnerBinding[] Owners = [Kestrel, SignalR, HttpConnections];
    internal static readonly Type MetricsType = Kestrel.Assembly.GetType("Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.KestrelMetrics", true)!;
    internal static readonly Type MetricsContextType = Kestrel.Assembly.GetType("Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.ConnectionMetricsContext", true)!;
    internal static readonly Func<IMeterFactory, object> CreateMetrics = Constructor();
    internal static readonly Func<object, BaseConnectionContext, object> CreateContext = ContextFactory();
    internal static readonly Action<object, object, string> QueueStart = QueueMethod("RequestQueuedStart");
    internal static readonly Action<object, object, string> QueueStop = QueueMethod("RequestQueuedStop");

    private static Func<IMeterFactory, object> Constructor()
    {
        var factory = Expression.Parameter(typeof(IMeterFactory));

        return Expression.Lambda<Func<IMeterFactory, object>>(Expression.Convert(
            Expression.New(MetricsType.GetConstructor([typeof(IMeterFactory)])!, factory), typeof(object)), factory).Compile();
    }

    private static Func<object, BaseConnectionContext, object> ContextFactory()
    {
        var owner = Expression.Parameter(typeof(object));
        var context = Expression.Parameter(typeof(BaseConnectionContext));

        return Expression.Lambda<Func<object, BaseConnectionContext, object>>(Expression.Convert(
            Expression.Call(Expression.Convert(owner, MetricsType), MetricsType.GetMethod("CreateContext")!, context), typeof(object)), owner, context).Compile();
    }

    private static Action<object, object, string> QueueMethod(string name)
    {
        var owner = Expression.Parameter(typeof(object));
        var context = Expression.Parameter(typeof(object));
        var version = Expression.Parameter(typeof(string));

        return Expression.Lambda<Action<object, object, string>>(Expression.Call(Expression.Convert(owner, MetricsType),
            MetricsType.GetMethod(name)!, Expression.Convert(context, MetricsContextType), version), owner, context, version).Compile();
    }

    internal static void Prime(int[] ports)
    {
        foreach (var owner in Owners)
        {
            foreach (var port in ports.Take(2))
            {
                using var lifetime = new ContextLifetime(Workload.Context(port));
                var tags = new TagList();
                owner.ContextTags(ref tags, lifetime.Context);
                Evidence.Require(tags.Count == 4 && tags.Single(tag => tag.Key == "server.port").Value is int value && value == port,
                    "Warm through actual endpoint-tag producer,never by writing private cache fields.");
            }
        }
    }
}

internal sealed class ContextLifetime(DefaultConnectionContext context) : IDisposable
{
    internal DefaultConnectionContext Context { get; } = context;
    public void Dispose() => Context.DisposeAsync().GetAwaiter().GetResult();
}

internal sealed class LocalMeterFactory : IMeterFactory
{
    private readonly List<Meter> _meters = [];
    public Meter Create(MeterOptions options)
    {
        var meter = new Meter(new MeterOptions(options.Name) { Version = options.Version, Scope = this, Tags = options.Tags });
        _meters.Add(meter);

        return meter;
    }
    public void Dispose()
    {
        foreach (var meter in _meters)
        {
            meter.Dispose();
        }
    }
}
