using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Https;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace AutoPerf;

internal static class TlsProbe
{
    public static async Task<object[]> VerifyAsync()
    {
        var values = new List<object>();
        var specs = new[]
        {
            "Patterns1_First", "Patterns2_Last", "Patterns8_Miss", "Patterns64_Last", "Patterns512_Last",
            "Exact512_Control", "Overlap2", "Overlap64", "UnicodeSuffix", "RawALabelDistinct", "OnAuthenticate512",
            "CertificateSelector512", "Patterns1_Deep_Last", "Patterns2_Deep_Last", "Patterns512_Deep_Miss"
        }.Select(recipe => CaseSpec.All.Single(value => value.Name == recipe)).Append(
            new CaseSpec("NativeDelay", 2, "client.p001.sni.test", "delay")).Append(
            new CaseSpec("NativeNoSni", 0, "", "ordinary"));
        foreach (var spec in specs)
        {
            var recipe = spec.Name;
            using var fixture = new SniFixture(spec);
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            string? actualServerName = null;
            SslApplicationProtocol selectedProtocol = default;
            var callbackCount = 0;
            var delayed = false;
            using var host = new HostBuilder().ConfigureWebHost(web => web.UseKestrel(options =>
            {
                options.Listen(IPAddress.Loopback, 0, listen => listen.UseHttps(new TlsHandshakeCallbackOptions
                {
                    OnConnectionState = fixture.Selector,
                    HandshakeTimeout = TimeSpan.FromSeconds(30),
                    OnConnection = async context =>
                    {
                        callbackCount++;
                        actualServerName = context.ClientHelloInfo.ServerName;
                        var selected = await SniFixture.OptionsCallback(context);
                        delayed = context.AllowDelayedClientCertificateNegotation;
                        selectedProtocol = selected.ApplicationProtocols!.Single();
                        return selected;
                    }
                }));
            }).ConfigureLogging(logging => logging.ClearProviders().SetMinimumLevel(LogLevel.Debug).AddProvider(new ProbeLogProvider())).Configure(app =>
            {
                app.Run(context => context.Response.WriteAsync("F069|" + context.Request.Protocol, context.RequestAborted));
            })).Build();
            try
            {
                Console.WriteLine("AUTOPERF_TLS_BEGIN " + recipe);
                await host.StartAsync(timeout.Token);
                var address = new Uri(host.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single());
                using var handler = new SocketsHttpHandler
                {
                    SslOptions = new SslClientAuthenticationOptions
                    {
                        RemoteCertificateValidationCallback = static (_, _, _, _) => true
                    },
                    ConnectCallback = async (_, token) =>
                    {
                        var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
                        var transferred = false;
                        try
                        {
                            await socket.ConnectAsync(IPAddress.Loopback, address.Port, token);
                            var stream = new NetworkStream(socket, ownsSocket: true);
                            transferred = true;
                            return stream;
                        }
                        finally
                        {
                            if (!transferred)
                            {
                                socket.Dispose();
                            }
                        }
                    }
                };
                using var client = new HttpClient(handler);
                var targetHost = spec.ServerName!.Length == 0 ? "127.0.0.1" : spec.ServerName;
                using var request = new HttpRequestMessage(HttpMethod.Get, $"https://{targetHost}:{address.Port}/")
                {
                    Version = HttpVersion.Version20,
                    VersionPolicy = HttpVersionPolicy.RequestVersionOrLower
                };
                using var response = await client.SendAsync(request, timeout.Token);
                response.EnsureSuccessStatusCode();
                var body = await response.Content.ReadAsStringAsync(timeout.Token);
                var negotiatedProtocol = response.Version == HttpVersion.Version20 ? SslApplicationProtocol.Http2 : SslApplicationProtocol.Http11;
                var expectedProtocol = recipe.EndsWith("_Miss", StringComparison.Ordinal) || recipe == "NativeNoSni"
                    ? SslApplicationProtocol.Http2 : SslApplicationProtocol.Http11;
                if (callbackCount != 1 || (spec.ServerName!.Length > 0 && actualServerName is null) ||
                    delayed != (spec.Kind == "delay") ||
                    (spec.Kind != "unicode" && selectedProtocol != expectedProtocol) ||
                    selectedProtocol != negotiatedProtocol ||
                    (recipe == "NativeNoSni" && !string.IsNullOrEmpty(actualServerName)) ||
                    body != (response.Version == HttpVersion.Version20 ? "F069|HTTP/2" : "F069|HTTP/1.1"))
                {
                    throw new InvalidOperationException("Actual ClientHello/owner callback/ALPN/data contract failed.");
                }
                var value = new
                {
                    recipe, supplied_client_target_host = spec.ServerName,
                    actual_runtime_clienthello_server_name = actualServerName,
                    real_clienthello_callback_count = callbackCount,
                    actual_http_response_version = response.Version.ToString(),
                    actual_tls_application_data = body,
                    delayed_client_certificate_flag = delayed,
                    actual_kestrel_sslstream_clienthello_to_shipping_sni_optionscallback = true,
                    tls_and_http_completed_with_actual_selected_options_and_feature = true,
                    full_handshake_or_application_throughput_measured = false
                };
                values.Add(value);
                Console.WriteLine("AUTOPERF_TLS " + JsonSerializer.Serialize(value));
            }
            finally
            {
                using var stopTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                await host.StopAsync(stopTimeout.Token);
            }
        }
        return values.ToArray();
    }

    private sealed class ProbeLogProvider : ILoggerProvider
    {
        public ILogger CreateLogger(string categoryName)
        {
            return new ProbeLogger(categoryName);
        }

        public void Dispose()
        {
        }

        private sealed class ProbeLogger(string category) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull
            {
                return null;
            }

            public bool IsEnabled(LogLevel logLevel)
            {
                return logLevel >= LogLevel.Debug;
            }

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            {
                if (IsEnabled(logLevel))
                {
                    Console.Error.WriteLine($"AUTOPERF_SERVER {category} {eventId}: {formatter(state, exception)} {exception}");
                }
            }
        }
    }
}
