// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Net.WebSockets;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Moq;
using AppFunc = System.Func<System.Collections.Generic.IDictionary<string, object>, System.Threading.Tasks.Task>;
using OwinAccept = System.Action<System.Collections.Generic.IDictionary<string, object>, System.Func<System.Collections.Generic.IDictionary<string, object>, System.Threading.Tasks.Task>>;

namespace Microsoft.AspNetCore.Owin;

public class WebSocketAcceptAdapterTests
{
    [Theory]
    [InlineData("Missing")]
    [InlineData("Null")]
    [InlineData("WrongObject")]
    [InlineData("StandardAccept")]
    public async Task AdaptWebSockets_PreservesNonAlternateEntries(string scenario)
    {
        var sentinel = new object();
        var environment = new Dictionary<string, object>
        {
            ["owin.ResponseStatusCode"] = 200,
            ["websocket.Accept"] = sentinel,
        };
        if (scenario != "Missing")
        {
            environment["websocket.AcceptAlt"] = scenario switch
            {
                "Null" => null,
                "WrongObject" => new WebSocketAcceptContext(),
                "StandardAccept" => new OwinAccept((options, callback) => throw new InvalidOperationException("Wrong delegate invoked.")),
                _ => throw new ArgumentException("Unknown scenario.", nameof(scenario)),
            };
        }
        var calls = 0;
        var app = WebSocketAcceptAdapter.AdaptWebSockets(env =>
        {
            calls++;
            Assert.Same(environment, env);
            Assert.Same(sentinel, env["websocket.Accept"]);
            env["owin.ResponseStatusCode"] = 202;
            return Task.CompletedTask;
        });

        await app(environment);

        Assert.Equal(1, calls);
        Assert.Equal(202, environment["owin.ResponseStatusCode"]);
        Assert.Same(sentinel, environment["websocket.Accept"]);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AdaptWebSockets_PreservesNonUpgradeWithActualProducer(bool isWebSocketRequest)
    {
        var feature = CreateFeature(isWebSocketRequest);
        var environment = CreateEnvironment(feature);
        var calls = 0;
        var app = WebSocketAcceptAdapter.AdaptWebSockets(env =>
        {
            calls++;
            Assert.Same(environment, env);
            Assert.Equal(isWebSocketRequest, env.TryGetValue("websocket.Accept", out var accept));
            if (isWebSocketRequest)
            {
                Assert.IsType<OwinAccept>(accept);
            }
            env["owin.ResponseStatusCode"] = 202;
            return Task.CompletedTask;
        });

        await app(environment);

        Assert.Equal(1, calls);
        Assert.Equal(202, environment["owin.ResponseStatusCode"]);
        feature.Verify(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>()), Times.Never);
    }

    [Fact]
    public async Task AdaptWebSockets_AwaitsNextWithActualProducer()
    {
        var feature = CreateFeature(true);
        var environment = CreateEnvironment(feature);
        var completion = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var calls = 0;
        var app = WebSocketAcceptAdapter.AdaptWebSockets(env =>
        {
            calls++;
            Assert.Same(environment, env);
            return completion.Task;
        });

        var pending = app(environment);
        Assert.False(pending.IsCompleted);
        Assert.Equal(1, calls);
        completion.SetResult();
        await pending;

        feature.Verify(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>()), Times.Never);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task AdaptWebSockets_PreservesNextExceptionIdentity(bool synchronous)
    {
        var feature = CreateFeature(true);
        var environment = CreateEnvironment(feature);
        var exception = new InvalidOperationException("Next failed.");
        var calls = 0;
        var app = WebSocketAcceptAdapter.AdaptWebSockets(env =>
        {
            calls++;
            if (synchronous)
            {
                throw exception;
            }
            return Task.FromException(exception);
        });

        Assert.Same(exception, await Assert.ThrowsAsync<InvalidOperationException>(() => app(environment)));
        Assert.Equal(1, calls);
        feature.Verify(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>()), Times.Never);
    }

    [Theory]
    [InlineData("NullOptions")]
    [InlineData("OwinOptions")]
    [InlineData("NativeContext")]
    public async Task AdaptWebSockets_PreservesUpgradeContextFramesAndCleanup(string scenario)
    {
        var feature = CreateFeature(true);
        var context = new DefaultHttpContext();
        using var cancellation = new CancellationTokenSource();
        context.RequestAborted = cancellation.Token;
        context.Features.Set<IHttpWebSocketFeature>(feature.Object);
        IDictionary<string, object> environment = new OwinEnvironment(context);
        var nativeContext = new WebSocketAcceptContext { SubProtocol = "chat" };
        IDictionary<string, object> options = scenario switch
        {
            "NullOptions" => null,
            "OwinOptions" => new Dictionary<string, object> { ["websocket.SubProtocol"] = "chat" },
            "NativeContext" => new Dictionary<string, object> { [typeof(WebSocketAcceptContext).FullName] = nativeContext },
            _ => throw new ArgumentException("Unknown scenario.", nameof(scenario)),
        };
        using var transport = new MemoryStream();
        WebSocket server = null;
        WebSocketAcceptContext acceptedContext = null;
        feature.Setup(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>())).Returns((WebSocketAcceptContext acceptContext) =>
        {
            acceptedContext = acceptContext;
            server = WebSocket.CreateFromStream(transport, isServer: true,
                subProtocol: acceptContext?.SubProtocol, keepAliveInterval: Timeout.InfiniteTimeSpan);
            return Task.FromResult(server);
        });
        var nextCalls = 0;
        var callbackCalls = 0;
        byte[] payload = [0x10, 0x20, 0x30];
        var app = WebSocketAcceptAdapter.AdaptWebSockets(env =>
        {
            nextCalls++;
            Assert.Same(environment, env);
            var accept = Assert.IsType<OwinAccept>(env["websocket.Accept"]);
            accept(options, async socketEnvironment =>
            {
                callbackCalls++;
                Assert.Same(server, socketEnvironment[typeof(WebSocket).FullName]);
                Assert.Equal(cancellation.Token, socketEnvironment["websocket.CallCancelled"]);
                Assert.Equal("1.0", socketEnvironment["websocket.Version"]);
                var send = Assert.IsType<Func<ArraySegment<byte>, int, bool, CancellationToken, Task>>(socketEnvironment["websocket.SendAsync"]);
                await send(new ArraySegment<byte>(payload), 2, true, CancellationToken.None);
            });
            Assert.Equal(101, env["owin.ResponseStatusCode"]);
            return Task.CompletedTask;
        });

        await app(environment);

        Assert.Equal(1, nextCalls);
        Assert.Equal(1, callbackCalls);
        feature.Verify(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>()), Times.Once);
        if (scenario == "NullOptions")
        {
            Assert.Null(acceptedContext);
        }
        else if (scenario == "NativeContext")
        {
            Assert.Same(nativeContext, acceptedContext);
        }
        else
        {
            var owinContext = Assert.IsType<OwinWebSocketAcceptContext>(acceptedContext);
            Assert.Same(options, owinContext.Options);
            Assert.Equal("chat", owinContext.SubProtocol);
        }
        Assert.Equal(WebSocketState.Aborted, server.State);
        using var frames = new MemoryStream(transport.ToArray());
        using var client = WebSocket.CreateFromStream(frames, isServer: false,
            subProtocol: acceptedContext?.SubProtocol, keepAliveInterval: Timeout.InfiniteTimeSpan);
        var received = new byte[16];
        var result = await client.ReceiveAsync(new ArraySegment<byte>(received), CancellationToken.None);
        Assert.Equal(WebSocketMessageType.Binary, result.MessageType);
        Assert.True(result.EndOfMessage);
        Assert.Equal(payload.Length, result.Count);
        Assert.Equal(payload, received[..result.Count]);
        server.Dispose();
    }

    [Fact]
    public async Task AdaptWebSockets_PreservesAcceptExceptionIdentity()
    {
        var feature = CreateFeature(true);
        var environment = CreateEnvironment(feature);
        var exception = new InvalidOperationException("Accept failed.");
        feature.Setup(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>())).Returns(Task.FromException<WebSocket>(exception));
        var callbackCalls = 0;
        var app = WebSocketAcceptAdapter.AdaptWebSockets(env =>
        {
            Assert.IsType<OwinAccept>(env["websocket.Accept"])(null, socketEnvironment =>
            {
                callbackCalls++;
                return Task.CompletedTask;
            });
            return Task.CompletedTask;
        });

        Assert.Same(exception, await Assert.ThrowsAsync<InvalidOperationException>(() => app(environment)));
        Assert.Equal(0, callbackCalls);
        Assert.Equal(101, environment["owin.ResponseStatusCode"]);
        feature.Verify(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>()), Times.Once);
    }

    [Fact]
    public async Task AdaptWebSockets_PreservesCallbackExceptionIdentity()
    {
        var feature = CreateFeature(true);
        var environment = CreateEnvironment(feature);
        using var transport = new MemoryStream();
        using var server = WebSocket.CreateFromStream(transport, isServer: true,
            subProtocol: null, keepAliveInterval: Timeout.InfiniteTimeSpan);
        feature.Setup(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>())).Returns(Task.FromResult(server));
        var exception = new InvalidOperationException("Callback failed.");
        var callbackCalls = 0;
        var app = WebSocketAcceptAdapter.AdaptWebSockets(env =>
        {
            Assert.IsType<OwinAccept>(env["websocket.Accept"])(null, socketEnvironment =>
            {
                callbackCalls++;
                return Task.FromException(exception);
            });
            return Task.CompletedTask;
        });

        Assert.Same(exception, await Assert.ThrowsAsync<InvalidOperationException>(() => app(environment)));
        Assert.Equal(1, callbackCalls);
        feature.Verify(f => f.AcceptAsync(It.IsAny<WebSocketAcceptContext>()), Times.Once);
    }

    private static Mock<IHttpWebSocketFeature> CreateFeature(bool isWebSocketRequest)
    {
        var feature = new Mock<IHttpWebSocketFeature>(MockBehavior.Strict);
        feature.SetupGet(f => f.IsWebSocketRequest).Returns(isWebSocketRequest);
        return feature;
    }

    private static IDictionary<string, object> CreateEnvironment(Mock<IHttpWebSocketFeature> feature)
    {
        var context = new DefaultHttpContext();
        context.Features.Set<IHttpWebSocketFeature>(feature.Object);
        context.Response.StatusCode = 200;
        return new OwinEnvironment(context);
    }
}
