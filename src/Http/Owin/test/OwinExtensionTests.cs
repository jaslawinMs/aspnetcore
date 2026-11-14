// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Net.WebSockets;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Microsoft.AspNetCore.Owin;

using AddMiddleware = Action<Func<
      Func<IDictionary<string, object>, Task>,
      Func<IDictionary<string, object>, Task>
    >>;
using AppFunc = Func<IDictionary<string, object>, Task>;
using CreateMiddleware = Func<
      Func<IDictionary<string, object>, Task>,
      Func<IDictionary<string, object>, Task>
    >;

public class OwinExtensionTests
{
    static readonly AppFunc notFound = env => new Task(() => { env["owin.ResponseStatusCode"] = 404; });

    [Fact]
    public async Task OwinConfigureServiceProviderAddsServices()
    {
        var list = new List<CreateMiddleware>();
        AddMiddleware build = list.Add;
        IServiceProvider serviceProvider = null;
        FakeService fakeService = null;

        var builder = build.UseBuilder(applicationBuilder =>
        {
            serviceProvider = applicationBuilder.ApplicationServices;
            applicationBuilder.Run(context =>
            {
                fakeService = context.RequestServices.GetService<FakeService>();
                return Task.FromResult(0);
            });
        },
        new ServiceCollection().AddSingleton(new FakeService()).BuildServiceProvider());

        list.Reverse();
        await list
            .Aggregate(notFound, (next, middleware) => middleware(next))
            .Invoke(new Dictionary<string, object>());

        Assert.NotNull(serviceProvider);
        Assert.NotNull(serviceProvider.GetService<FakeService>());
        Assert.NotNull(fakeService);
    }

    [Fact]
    public async Task OwinDefaultNoServices()
    {
        var list = new List<CreateMiddleware>();
        AddMiddleware build = list.Add;
        IServiceProvider expectedServiceProvider = new ServiceCollection().BuildServiceProvider();
        IServiceProvider serviceProvider = null;
        FakeService fakeService = null;
        bool builderExecuted = false;
        bool applicationExecuted = false;

        var builder = build.UseBuilder(applicationBuilder =>
        {
            builderExecuted = true;
            serviceProvider = applicationBuilder.ApplicationServices;
            applicationBuilder.Run(context =>
            {
                applicationExecuted = true;
                fakeService = context.RequestServices.GetService<FakeService>();
                return Task.FromResult(0);
            });
        },
        expectedServiceProvider);

        list.Reverse();
        await list
            .Aggregate(notFound, (next, middleware) => middleware(next))
            .Invoke(new Dictionary<string, object>());

        Assert.True(builderExecuted);
        Assert.Equal(expectedServiceProvider, serviceProvider);
        Assert.True(applicationExecuted);
        Assert.Null(fakeService);
    }

    [Fact]
    public async Task OwinDefaultNullServiceProvider()
    {
        var list = new List<CreateMiddleware>();
        AddMiddleware build = list.Add;
        IServiceProvider serviceProvider = null;
        FakeService fakeService = null;
        bool builderExecuted = false;
        bool applicationExecuted = false;

        var builder = build.UseBuilder(applicationBuilder =>
        {
            builderExecuted = true;
            serviceProvider = applicationBuilder.ApplicationServices;
            applicationBuilder.Run(context =>
            {
                applicationExecuted = true;
                fakeService = context.RequestServices.GetService<FakeService>();
                return Task.FromResult(0);
            });
        });

        list.Reverse();
        await list
            .Aggregate(notFound, (next, middleware) => middleware(next))
            .Invoke(new Dictionary<string, object>());

        Assert.True(builderExecuted);
        Assert.NotNull(serviceProvider);
        Assert.True(applicationExecuted);
        Assert.Null(fakeService);
    }

    [Fact]
    public async Task UseOwin()
    {
        var serviceProvider = new ServiceCollection().BuildServiceProvider();
        var builder = new ApplicationBuilder(serviceProvider);
        IDictionary<string, object> environment = null;
        var context = new DefaultHttpContext();

        builder.UseOwin(addToPipeline =>
        {
            addToPipeline(next =>
            {
                Assert.NotNull(next);
                return async env =>
                {
                    environment = env;
                    await next(env);
                };
            });
        });
        await builder.Build().Invoke(context);

        // Dictionary contains context but does not contain "websocket.Accept" or "websocket.AcceptAlt" keys.
        Assert.NotNull(environment);
        var value = Assert.Single(
                environment,
                kvp => string.Equals(typeof(HttpContext).FullName, kvp.Key, StringComparison.Ordinal))
            .Value;
        Assert.Equal(context, value);
        Assert.False(environment.ContainsKey("websocket.Accept"));
        Assert.False(environment.ContainsKey("websocket.AcceptAlt"));
    }

    [Fact]
    public async Task UseOwin_PreservesDefaultWebSocketAdaptationAndFrames()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var builder = new ApplicationBuilder(services);
        var context = new DefaultHttpContext();
        using var transport = new MemoryStream();
        using var server = WebSocket.CreateFromStream(transport, isServer: true,
            subProtocol: null, keepAliveInterval: Timeout.InfiniteTimeSpan);
        var feature = new Mock<IHttpWebSocketFeature>(MockBehavior.Strict);
        feature.SetupGet(f => f.IsWebSocketRequest).Returns(true);
        feature.Setup(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>())).Returns(Task.FromResult(server));
        context.Features.Set<IHttpWebSocketFeature>(feature.Object);
        byte[] payload = [1, 2, 3];
        var callbackCalls = 0;
        builder.UseOwin(add =>
        {
            add(next => environment =>
            {
                var accept = Assert.IsType<Action<IDictionary<string, object>, AppFunc>>(environment["websocket.Accept"]);
                accept(null, async socketEnvironment =>
                {
                    callbackCalls++;
                    Assert.Same(server, socketEnvironment[typeof(WebSocket).FullName]);
                    var send = Assert.IsType<Func<ArraySegment<byte>, int, bool, CancellationToken, Task>>(socketEnvironment["websocket.SendAsync"]);
                    await send(new ArraySegment<byte>(payload), 2, true, CancellationToken.None);
                });
                return Task.CompletedTask;
            });
        });

        await builder.Build().Invoke(context);

        Assert.Equal(101, context.Response.StatusCode);
        Assert.Equal(1, callbackCalls);
        Assert.Equal(WebSocketState.Aborted, server.State);
        feature.Verify(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>()), Times.Once);
        using var frames = new MemoryStream(transport.ToArray());
        using var client = WebSocket.CreateFromStream(frames, isServer: false,
            subProtocol: null, keepAliveInterval: Timeout.InfiniteTimeSpan);
        var received = new byte[16];
        var result = await client.ReceiveAsync(new ArraySegment<byte>(received), CancellationToken.None);
        Assert.Equal(WebSocketMessageType.Binary, result.MessageType);
        Assert.True(result.EndOfMessage);
        Assert.Equal(payload.Length, result.Count);
        Assert.Equal(payload, received[..result.Count]);
    }

    private class FakeService
    {
    }
}
