using System.Net;
using System.Net.WebSockets;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SpaServices;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AutoPerf;

[MemoryDiagnoser]
public class ProxyRequestBenchmark
{
    [Params("Http200", "Http404", "EmptyHttp", "FaultedUri", "FactoryThrows", "Http200UncancelableRequest")]
    public string Recipe { get; set; } = "";

    private LoopbackServer _upstream = null!;
    private ProxyWorkload _workload = null!;

    [GlobalSetup]
    public void Setup()
    {
        OwnerProbe.Verify();
        _upstream = new LoopbackServer();
        _workload = new ProxyWorkload(_upstream.Uri, Recipe);
        _workload.VerifyOnce();
    }

    [Benchmark]
    public Task<int> ProxyCompletedRequest()
    {
        return _workload.InvokeAsync();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _workload.Dispose();
        _upstream.Dispose();
    }
}

[MemoryDiagnoser]
public class ProxyShutdownBenchmark
{
    [Params("Http200", "FaultedUri", "FactoryThrows")]
    public string Recipe { get; set; } = "";

    [Params(0, 1, 32, 1024)]
    public int CompletedRequests { get; set; }

    private LoopbackServer _upstream = null!;
    private ProxyWorkload _workload = null!;

    [GlobalSetup]
    public void SetupServer()
    {
        OwnerProbe.Verify();
        _upstream = new LoopbackServer();
    }

    [IterationSetup]
    public void PrepareCompletedRequests()
    {
        _workload = new ProxyWorkload(_upstream.Uri, Recipe);
        _workload.RunCompletedBatch(CompletedRequests);
    }

    [Benchmark]
    public void StopApplication()
    {
        _workload.Lifetime.StopApplication();
    }

    [IterationCleanup]
    public void CleanupLifetime()
    {
        _workload.Dispose();
    }

    [GlobalCleanup]
    public void CleanupServer()
    {
        _upstream.Dispose();
    }
}

internal sealed class ProxyWorkload : IDisposable
{
    private readonly IHost _host;
    private readonly RequestDelegate _proxy;
    private readonly string _recipe;
    private readonly InvalidOperationException _failure = new("target unavailable");
    private readonly bool _requestCanCancel;
    private readonly string _path;

    public IHostApplicationLifetime Lifetime { get; }

    public ProxyWorkload(Uri upstream, string recipe)
    {
        _recipe = recipe;
        _requestCanCancel = recipe != "Http200UncancelableRequest";
        _path = recipe switch
        {
            "Http200" or "Http200UncancelableRequest" => "/ok",
            "Http404" => "/not-found",
            "EmptyHttp" => "/empty",
            "FaultedUri" or "FactoryThrows" => "/ok",
            _ => throw new ArgumentOutOfRangeException(nameof(recipe))
        };
        _host = new HostBuilder().ConfigureLogging(logging => logging.ClearProviders()).Build();
        Lifetime = _host.Services.GetRequiredService<IHostApplicationLifetime>();
        var app = new ApplicationBuilder(_host.Services);
        new SpaAdapter(app).UseProxyToSpaDevelopmentServer(() => _recipe switch
        {
            "FaultedUri" => Task.FromException<Uri>(_failure),
            "FactoryThrows" => throw _failure,
            _ => Task.FromResult(upstream)
        });
        _proxy = app.Build();
    }

    public async Task<int> InvokeAsync(List<WeakReference<CancellationTokenSource>>? tracked = null)
    {
        using var requestAborted = new CancellationTokenSource();
        if (tracked is not null)
        {
            tracked.Add(new WeakReference<CancellationTokenSource>(requestAborted));
        }
        var context = new DefaultHttpContext();
        context.Request.Method = "GET";
        context.Request.Path = _path;
        context.Request.Protocol = "HTTP/1.1";
        context.RequestAborted = _requestCanCancel ? requestAborted.Token : CancellationToken.None;
        using var body = new MemoryStream();
        context.Response.Body = body;
        if (_recipe is "FaultedUri" or "FactoryThrows")
        {
            try
            {
                await _proxy(context);
            }
            catch (InvalidOperationException exception) when (ReferenceEquals(exception, _failure))
            {
                if (context.Response.StatusCode != 200 || body.Length != 0)
                {
                    throw new InvalidOperationException("Original failure response changed.");
                }

                return -1;
            }

            throw new InvalidOperationException("The original target failure did not escape.");
        }

        await _proxy(context);
        var expectedStatus = _recipe == "Http404" ? 404 : 200;
        var expectedBody = _recipe == "EmptyHttp" ? "" : "proxy-payload";
        if (context.Response.StatusCode != expectedStatus ||
            Encoding.UTF8.GetString(body.GetBuffer(), 0, (int)body.Length) != expectedBody ||
            context.Response.Headers["X-Upstream"] != "F062")
        {
            throw new InvalidOperationException("Actual public proxy result changed.");
        }

        return context.Response.StatusCode + (int)body.Length;
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    public void RunCompletedBatch(int count, List<WeakReference<CancellationTokenSource>>? tracked = null)
    {
        for (var index = 0; index < count; index++)
        {
            InvokeAsync(tracked).GetAwaiter().GetResult();
        }
    }

    public void VerifyOnce()
    {
        InvokeAsync().GetAwaiter().GetResult();
    }

    public void Dispose()
    {
        Lifetime.StopApplication();
        _host.Dispose();
    }
}

internal sealed class SpaAdapter(IApplicationBuilder applicationBuilder) : ISpaBuilder
{
    public IApplicationBuilder ApplicationBuilder { get; } = applicationBuilder;
    public SpaOptions Options { get; } = new();
}

internal sealed class LoopbackServer : IDisposable
{
    private readonly IHost _host;

    public Uri Uri { get; }

    public LoopbackServer()
    {
        _host = new HostBuilder().ConfigureWebHost(builder => builder
            .UseKestrel(options => options.Listen(IPAddress.Loopback, 0))
            .ConfigureLogging(logging => logging.ClearProviders())
            .Configure(app =>
            {
                app.UseWebSockets();
                app.Run(async context =>
                {
                    if (context.Request.Path == "/ws")
                    {
                        using var socket = await context.WebSockets.AcceptWebSocketAsync();
                        var buffer = new byte[4096];
                        while (true)
                        {
                            var message = await socket.ReceiveAsync(buffer.AsMemory(), context.RequestAborted);
                            if (message.MessageType == WebSocketMessageType.Close)
                            {
                                await socket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "completed", context.RequestAborted);
                                return;
                            }

                            await socket.SendAsync(buffer.AsMemory(0, message.Count), message.MessageType,
                                message.EndOfMessage, context.RequestAborted);
                        }
                    }

                    context.Response.StatusCode = context.Request.Path == "/not-found" ? 404 : 200;
                    context.Response.Headers["X-Upstream"] = "F062";
                    await context.Response.WriteAsync(context.Request.Path == "/empty" ? "" : "proxy-payload",
                        context.RequestAborted);
                });
            })).Build();
        _host.Start();
        Uri = new Uri(_host.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single());
    }

    public void Dispose()
    {
        _host.Dispose();
    }
}

internal static class OwnerProbe
{
    public static void Verify()
    {
        var owner = typeof(SpaProxyingExtensions).Assembly;
        var expected = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "Microsoft.AspNetCore.SpaServices.Extensions.dll"));
        if (!string.Equals(Path.GetFullPath(owner.Location), expected, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("The actual SPA shipping owner must be loaded beside the frozen harness.");
        }

        Console.WriteLine("AUTOPERF_OWNER " + JsonSerializer.Serialize(new
        {
            assembly = owner.FullName,
            sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(owner.Location))),
            actual_public_owner_beside_harness = true,
            host_lifetime_type = typeof(IHostApplicationLifetime).FullName,
            installed_aspnet_framework_fallback = false
        }));
    }
}

internal static class RetentionProbe
{
    public static void Verify(string output)
    {
        using var upstream = new LoopbackServer();
        var outcomes = new List<object>();
        foreach (var recipe in new[] { "Http200", "Http404", "EmptyHttp", "FaultedUri", "FactoryThrows", "Http200UncancelableRequest" })
        {
            foreach (var count in new[] { 0, 1, 32, 1024 })
            {
                using var workload = new ProxyWorkload(upstream.Uri, recipe);
                var tracked = new List<WeakReference<CancellationTokenSource>>(count);
                var memoryBefore = GC.GetTotalMemory(forceFullCollection: true);
                workload.RunCompletedBatch(count, tracked);
                var memoryAfter = GC.GetTotalMemory(forceFullCollection: true);
                var retainedBeforeStop = CountAlive(tracked);
                workload.Lifetime.StopApplication();
                GC.Collect();
                GC.WaitForPendingFinalizers();
                GC.Collect();
                var retainedAfterStop = CountAlive(tracked);
                var outcome = new
                {
                    recipe, completed_requests = count, request_sources_tracked = tracked.Count,
                    request_sources_retained_before_real_host_stop = retainedBeforeStop,
                    request_sources_retained_after_real_host_stop = retainedAfterStop,
                    total_managed_heap_before = memoryBefore, total_managed_heap_after = memoryAfter,
                    total_managed_heap_change = memoryAfter - memoryBefore,
                    heap_delta_includes_transport_caches_and_weak_references = true,
                    host_lifetime_type = workload.Lifetime.GetType().FullName
                };
                outcomes.Add(outcome);
                Console.WriteLine("AUTOPERF_RETENTION " + JsonSerializer.Serialize(outcome));
                GC.KeepAlive(workload);
            }
        }

        File.WriteAllText(output, JsonSerializer.Serialize(outcomes));
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static int CountAlive(List<WeakReference<CancellationTokenSource>> sources)
    {
        return sources.Count(source => source.TryGetTarget(out _));
    }
}
