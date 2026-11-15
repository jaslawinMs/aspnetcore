using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AutoPerf;

internal static class PublicContracts
{
    public static async Task Verify(string output)
    {
        using var upstream = new LoopbackServer();
        var outcomes = new List<object>();
        foreach (var recipe in new[] { "Http200", "Http404", "EmptyHttp", "FaultedUri", "FactoryThrows", "Http200UncancelableRequest" })
        {
            using var workload = new ProxyWorkload(upstream.Uri, recipe);
            var first = await workload.InvokeAsync();
            var second = await workload.InvokeAsync();
            if (first != second)
            {
                throw new InvalidOperationException("Repeated actual public-owner contract changed.");
            }

            var contract = new { id = recipe, boundary = "public proxy delegate and real TCP upstream", first, second };
            outcomes.Add(contract);
            Console.WriteLine("AUTOPERF_PUBLIC_CONTRACT " + JsonSerializer.Serialize(contract));
        }

        foreach (var path in new[] { "/ok", "/not-found", "/empty" })
        {
            for (var repetition = 1; repetition <= 2; repetition++)
            {
                using var front = new ProxyFrontServer(upstream.Uri);
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
                using var response = await client.GetAsync(new Uri(front.Uri, path));
                var body = await response.Content.ReadAsStringAsync();
                var expectedStatus = path == "/not-found" ? HttpStatusCode.NotFound : HttpStatusCode.OK;
                var expectedBody = path == "/empty" ? "" : "proxy-payload";
                if (response.StatusCode != expectedStatus || body != expectedBody ||
                    response.Headers.GetValues("X-Upstream").Single() != "F062")
                {
                    throw new InvalidOperationException("Actual two-server TCP HTTP exchange changed.");
                }
                var proxyOperation = await front.ProxyOperation.Task.WaitAsync(TimeSpan.FromSeconds(30));
                await proxyOperation.WaitAsync(TimeSpan.FromSeconds(30));
                var contract = new
                {
                    id = "TcpHttp" + path.Replace("/", "_"), repetition, status = (int)response.StatusCode,
                    body, upstream_header = "F062", actual_proxy_task_completed = true,
                    boundary = "real caller HttpClient, Kestrel SPA host, public proxy, Kestrel upstream"
                };
                outcomes.Add(contract);
                Console.WriteLine("AUTOPERF_PUBLIC_CONTRACT " + JsonSerializer.Serialize(contract));
            }
        }

        foreach (var completion in new[] { "CloseHandshake", "HostStopping", "CallerAbort" })
        {
            for (var repetition = 1; repetition <= 2; repetition++)
            {
                using var front = new ProxyFrontServer(upstream.Uri);
                using var socket = new ClientWebSocket();
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                var target = new UriBuilder(front.Uri) { Scheme = "ws", Path = "/ws" }.Uri;
                await socket.ConnectAsync(target, timeout.Token);
                var proxyOperation = await front.ProxyOperation.Task.WaitAsync(timeout.Token);
                var input = Encoding.UTF8.GetBytes("hello-F062");
                await socket.SendAsync(input.AsMemory(), WebSocketMessageType.Text, true, timeout.Token);
                var buffer = new byte[4096];
                var received = await socket.ReceiveAsync(buffer.AsMemory(), timeout.Token);
                var echo = Encoding.UTF8.GetString(buffer, 0, received.Count);
                if (received.MessageType != WebSocketMessageType.Text || !received.EndOfMessage || echo != "hello-F062" ||
                    proxyOperation.IsCompleted)
                {
                    throw new InvalidOperationException("Actual WebSocket echo/pending lifetime changed.");
                }

                if (completion == "CloseHandshake")
                {
                    await socket.CloseOutputAsync(WebSocketCloseStatus.NormalClosure, "completed", timeout.Token);
                    var close = await socket.ReceiveAsync(buffer.AsMemory(), timeout.Token);
                    if (close.MessageType != WebSocketMessageType.Close)
                    {
                        throw new InvalidOperationException("Actual proxied WebSocket close handshake changed.");
                    }
                }
                else if (completion == "HostStopping")
                {
                    front.Lifetime.StopApplication();
                }
                else
                {
                    socket.Abort();
                }

                await proxyOperation.WaitAsync(timeout.Token);
                var contract = new
                {
                    id = "TcpWebSocket_" + completion, repetition, echo,
                    echo_message_type = "Text", echo_end_of_message = true,
                    actual_proxy_task_pending_after_echo = true, actual_proxy_task_completed_after_producer = true,
                    boundary = "real caller ClientWebSocket, Kestrel SPA host, public proxy ClientWebSocket, Kestrel echo server"
                };
                outcomes.Add(contract);
                Console.WriteLine("AUTOPERF_PUBLIC_CONTRACT " + JsonSerializer.Serialize(contract));
            }
        }

        File.WriteAllText(output, JsonSerializer.Serialize(outcomes));
    }
}

internal sealed class ProxyFrontServer : IDisposable
{
    private readonly IHost _host;

    public Uri Uri { get; }
    public IHostApplicationLifetime Lifetime { get; }
    public TaskCompletionSource<Task> ProxyOperation { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public ProxyFrontServer(Uri upstream)
    {
        _host = new HostBuilder().ConfigureWebHost(builder => builder
            .UseKestrel(options => options.Listen(IPAddress.Loopback, 0))
            .ConfigureLogging(logging => logging.ClearProviders())
            .Configure(app =>
            {
                app.Use(next => context =>
                {
                    var operation = next(context);
                    ProxyOperation.TrySetResult(operation);

                    return operation;
                });
                new SpaAdapter(app).UseProxyToSpaDevelopmentServer(upstream);
            })).Build();
        Lifetime = _host.Services.GetRequiredService<IHostApplicationLifetime>();
        _host.Start();
        Uri = new Uri(_host.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single());
    }

    public void Dispose()
    {
        Lifetime.StopApplication();
        _host.Dispose();
    }
}
