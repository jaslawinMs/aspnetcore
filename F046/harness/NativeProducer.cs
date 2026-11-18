// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections.Concurrent;
using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.HttpSys;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Net.Http.Headers;

namespace AutoPerf;

internal static class NativeProducer
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(30);
    private sealed record Snapshot(string Protocol, string HeaderType, string HeaderOwner, string[] Before,
        string?[] After, bool BeforeReadOnly, bool AfterReadOnly, int AfterCount);
    private sealed record Plan(string Name, Version RequestVersion, bool RequestClose, string[] Initial, bool MixedCase, bool WillAppend)
    {
        internal TaskCompletionSource<Snapshot> Completed { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
    }

    internal static async Task RunAsync()
    {
        var plans = new[]
        {
            new Plan("HTTP10.Missing", HttpVersion.Version10, false, [], false, true),
            new Plan("HTTP10.MixedCaseExisting", HttpVersion.Version10, false, ["keep-alive", "upgrade"], true, true),
            new Plan("HTTP11.RequestClose", HttpVersion.Version11, true, [], false, true),
            new Plan("HTTP11.RequestCloseWithKeepAlive", HttpVersion.Version11, true, ["keep-alive"], false, true),
            new Plan("HTTP11.KeepAliveControl", HttpVersion.Version11, false, [], false, false),
            new Plan("HTTP11.AlreadyCloseControl", HttpVersion.Version11, false, ["close"], false, false)
        };
        var pending = new ConcurrentDictionary<string, Plan>();
        var host = new HostBuilder().ConfigureWebHost(web => web.UseHttpSys(options =>
        {
            options.UrlPrefixes.Add(UrlPrefix.Create("http", "localhost", "0", string.Empty));
            options.MaxAccepts = 1;
        }).Configure(app => app.Run(context =>
        {
            var route = context.Request.Path.Value ?? throw new InvalidOperationException("Actual request path absent.");
            Evidence.Require(pending.TryGetValue(route, out var selected), "An undeclared request reached the owned listener.");
            var plan = selected ?? throw new InvalidOperationException("Actual request plan absent.");
            var headers = context.Response.Headers;
            Evidence.Require(headers.GetType() == HeaderAccess.HttpSys.HeaderType,
                "The actual host must create the source-built HeaderCollection.");
            Evidence.Require(!headers.IsReadOnly && headers.Count == 0, "Require a genuinely fresh native response header collection.");
            if (plan.Initial.Length > 0)
            {
                headers[plan.MixedCase ? "cOnNeCtIoN" : HeaderNames.Connection] = plan.Initial;
            }
            var protocol = context.Request.Protocol;
            var beforeReadOnly = headers.IsReadOnly;
            context.Response.OnCompleted(() =>
            {
                plan.Completed.TrySetResult(new Snapshot(protocol, headers.GetType().FullName!,
                    headers.GetType().Assembly.Location, plan.Initial, headers[HeaderNames.Connection].ToArray(),
                    beforeReadOnly, headers.IsReadOnly, headers.Count));

                return Task.CompletedTask;
            });

            return Task.CompletedTask;
        }))).Build();
        using var client = new HttpClient(new SocketsHttpHandler { UseProxy = false, MaxConnectionsPerServer = 1 })
        {
            Timeout = Timeout,
            DefaultVersionPolicy = HttpVersionPolicy.RequestVersionExact
        };
        try
        {
            await host.StartAsync().ConfigureAwait(false);
            var address = new Uri(host.Services.GetRequiredService<IServer>().Features
                .GetRequiredFeature<IServerAddressesFeature>().Addresses.Single());
            Evidence.Require(address.IsLoopback && address.Port != 0, "Own only a unique actual ephemeral loopback listener.");
            Evidence.Write("actual-listener-started", new
            {
                actualAddress = address.ToString(),
                actualNativeHttpSys = true,
                actualMaxAccepts = 1,
                actualUrlAclFirewallOrOsSettingsChanged = false
            });
            for (var index = 0; index < plans.Length; index++)
            {
                var plan = plans[index];
                var route = "/" + index;
                Evidence.Require(pending.TryAdd(route, plan), "Fresh native request identity required.");
                using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(address, route))
                {
                    Version = plan.RequestVersion,
                    VersionPolicy = HttpVersionPolicy.RequestVersionExact
                };
                if (plan.RequestClose)
                {
                    request.Headers.ConnectionClose = true;
                }
                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead).ConfigureAwait(false);
                var body = await response.Content.ReadAsByteArrayAsync().ConfigureAwait(false);
                var actual = await plan.Completed.Task.WaitAsync(Timeout).ConfigureAwait(false);
                var expected = plan.WillAppend ? plan.Initial.Concat(["close"]).ToArray() : plan.Initial;
                Evidence.Require(actual.Protocol == (plan.RequestVersion == HttpVersion.Version10 ? "HTTP/1.0" : "HTTP/1.1"),
                    "The native producer did not observe the requested protocol.");
                Evidence.Require(actual.After.SequenceEqual(expected), "Actual native managed append order/state differs.");
                Evidence.Require(!actual.BeforeReadOnly && actual.AfterReadOnly, "The real producer must lock the completed response headers.");
                Evidence.Require(actual.AfterCount == (expected.Length > 0 ? 2 : 1), "Actual producer header shape differs from its suffix fixture.");
                Evidence.Require(response.StatusCode == HttpStatusCode.OK && response.Version == HttpVersion.Version11
                    && body.Length == 0 && response.Content.Headers.ContentLength == 0, "Actual complete native wire response differs.");
                Evidence.Require((response.Headers.ConnectionClose == true) == (expected.Length > 0),
                    "Actual client connection-close material effect differs.");
                Evidence.Write("actual-native-connection-producer", new
                {
                    profile = plan.Name,
                    actualRequestVersion = plan.RequestVersion.ToString(),
                    actualRequestClose = plan.RequestClose,
                    actualExpectedInstanceAppend = plan.WillAppend,
                    actualManaged = actual,
                    actualClientStatus = (int)response.StatusCode,
                    actualClientVersion = response.Version.ToString(),
                    actualClientConnection = response.Headers.Connection.ToArray(),
                    actualClientBodyBytes = body.Length,
                    actualClientContentLength = response.Content.Headers.ContentLength,
                    actualProducerOrHeaderCollectionSubstituted = false,
                    actualApplicationDidNotSetContentLengthOrAppendClose = true,
                    actualIsThroughputMeasurement = false
                });
                Evidence.Require(pending.TryRemove(route, out var removed) && ReferenceEquals(removed, plan),
                    "Remove only the completed owned native plan.");
            }
        }
        finally
        {
            using var timeout = new CancellationTokenSource(Timeout);
            try
            {
                await host.StopAsync(timeout.Token).ConfigureAwait(false);
            }
            finally
            {
                host.Dispose();
            }
        }
        Evidence.Write("actual-listener-disposed", new { actualHostStoppedAndDisposed = true, actualRemainingRequests = pending.Count });
    }
}
