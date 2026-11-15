// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.SpaServices.Extensions.Proxy;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using System.Threading.Tasks;
using System;
using System.Net.Http;
using System.Net;
using System.Threading;
using Moq.Protected;
using System.IO;
using System.Runtime.CompilerServices;
using System.Text;

namespace Microsoft.AspNetCore.SpaServices.Extensions.Tests;

public class SpaProxyTests
{
    private static (HttpContext, HttpClient) GetHttpContextAndClient(string path, string queryString, Action<HttpRequestMessage> callback)
    {
        var messageHandler = new Mock<HttpMessageHandler>();
        messageHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                                        ItExpr.IsAny<HttpRequestMessage>(),
                                        ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, c) => callback(req))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("Test")
            });

        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.QueryString = new QueryString(queryString);
        context.Request.Method = "GET";

        return (context, new HttpClient(messageHandler.Object));
    }

    [Theory]
    [InlineData("http://localhost:3000", "", "", "http://localhost:3000/")]
    [InlineData("http://localhost:3000", "", "?a=b", "http://localhost:3000/?a=b")]
    [InlineData("http://localhost:3000/", "", "?a=b", "http://localhost:3000/?a=b")]
    [InlineData("http://localhost:3000", "/test", "?a=b", "http://localhost:3000/test?a=b")]
    [InlineData("http://localhost:3000/", "/test", "?a=b", "http://localhost:3000/test?a=b")]
    [InlineData("http://localhost:3000/spa", "/test", "?a=b", "http://localhost:3000/spa/test?a=b")]
    [InlineData("http://localhost:3000/spa/", "/test", "?a=b", "http://localhost:3000/spa/test?a=b")]
    [InlineData("http://localhost:3000", "///test", "?a=b", "http://localhost:3000///test?a=b")]
    [InlineData("http://localhost:3000/", "///test", "?a=b", "http://localhost:3000///test?a=b")]
    [InlineData("http://localhost:3000/spa", "///test", "?a=b", "http://localhost:3000/spa///test?a=b")]
    [InlineData("http://localhost:3000/spa/", "///test", "?a=b", "http://localhost:3000/spa///test?a=b")]
    public async Task PerformProxyRequest_TestUrlCombination(string baseUrl, string path, string queryString, string expected)
    {
        HttpRequestMessage forwardedRequestMessage = null;
        var (context, httpClient) = GetHttpContextAndClient(path, queryString, (req) => forwardedRequestMessage = req);
        var baseUriTask = Task.FromResult(new Uri(baseUrl));
        var res = await SpaProxy.PerformProxyRequest(context, httpClient, baseUriTask, CancellationToken.None, true);
        Assert.Equal(expected, forwardedRequestMessage.RequestUri.ToString());
    }

    [Theory]
    [InlineData("Http200")]
    [InlineData("Skipped404")]
    [InlineData("Proxied404")]
    [InlineData("BaseUriFailure")]
    [InlineData("SendCanceled")]
    [InlineData("SendIOException")]
    [InlineData("SendHttpRequestException")]
    [InlineData("CopyIOException")]
    public void PerformProxyRequest_DoesNotRetainRequestCancellationSource(string outcome)
    {
        using var applicationStopping = new CancellationTokenSource();
        var requestSource = CompleteProxyRequest(outcome, applicationStopping.Token);

        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();

        Assert.False(requestSource.TryGetTarget(out _));
        GC.KeepAlive(applicationStopping);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PerformProxyRequest_KeepsCancellationLinkedUntilResponseCopyCompletes(bool failCopy)
    {
        using var applicationStopping = new CancellationTokenSource();
        using var requestAborted = new CancellationTokenSource();
        var (context, httpClient) = GetHttpContextAndClient("/test", "", static _ => { });
        using (httpClient)
        using (var responseBody = new ResponseCopyStream(failCopy))
        {
            context.RequestAborted = requestAborted.Token;
            context.Response.Body = responseBody;
            var proxyTask = SpaProxy.PerformProxyRequest(context, httpClient,
                Task.FromResult(new Uri("http://localhost:3000")), applicationStopping.Token, proxy404s: true);

            await responseBody.Started.Task.WaitAsync(TimeSpan.FromSeconds(30));
            Assert.False(proxyTask.IsCompleted);
            Assert.True(responseBody.Token.CanBeCanceled);
            using (var registration = responseBody.Token.Register(static () => { }))
            {
                Assert.NotEqual(default(CancellationTokenRegistration), registration);
            }

            responseBody.Release.SetResult();
            Assert.True(await proxyTask.WaitAsync(TimeSpan.FromSeconds(30)));
            Assert.Equal(failCopy ? "" : "Test", Encoding.UTF8.GetString(responseBody.ToArray()));
            using (var registration = responseBody.Token.Register(static () => { }))
            {
                Assert.Equal(default(CancellationTokenRegistration), registration);
            }

            applicationStopping.Cancel();
            requestAborted.Cancel();
            Assert.False(responseBody.Token.IsCancellationRequested);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task PerformProxyRequest_CancelsPendingResponseCopyFromEitherParent(bool stopApplication)
    {
        using var applicationStopping = new CancellationTokenSource();
        using var requestAborted = new CancellationTokenSource();
        var (context, httpClient) = GetHttpContextAndClient("/test", "", static _ => { });
        using (httpClient)
        using (var responseBody = new ResponseCopyStream())
        {
            context.RequestAborted = requestAborted.Token;
            context.Response.Body = responseBody;
            var proxyTask = SpaProxy.PerformProxyRequest(context, httpClient,
                Task.FromResult(new Uri("http://localhost:3000")), applicationStopping.Token, proxy404s: true);

            await responseBody.Started.Task.WaitAsync(TimeSpan.FromSeconds(30));
            Assert.False(proxyTask.IsCompleted);
            Assert.False(responseBody.Token.IsCancellationRequested);
            (stopApplication ? applicationStopping : requestAborted).Cancel();

            Assert.True(await proxyTask.WaitAsync(TimeSpan.FromSeconds(30)));
            Assert.True(responseBody.Token.IsCancellationRequested);
            Assert.Empty(responseBody.ToArray());
            Assert.False((stopApplication ? requestAborted : applicationStopping).IsCancellationRequested);
        }
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static WeakReference<CancellationTokenSource> CompleteProxyRequest(string outcome, CancellationToken applicationStopping)
    {
        using var requestAborted = new CancellationTokenSource();
        var requestSource = new WeakReference<CancellationTokenSource>(requestAborted);
        var context = new DefaultHttpContext();
        context.Request.Method = "GET";
        context.Request.Path = "/test";
        context.RequestAborted = requestAborted.Token;
        using var responseBody = new ResponseCopyStream(outcome == "CopyIOException");
        context.Response.Body = responseBody;
        responseBody.Release.SetResult();

        var messageHandler = new Mock<HttpMessageHandler>();
        var send = messageHandler.Protected().Setup<Task<HttpResponseMessage>>("SendAsync",
            ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
        var sendFailure = new HttpRequestException("send failed");
        switch (outcome)
        {
            case "SendCanceled":
                send.ThrowsAsync(new OperationCanceledException("send canceled"));
                break;
            case "SendIOException":
                send.ThrowsAsync(new IOException("send interrupted"));
                break;
            case "SendHttpRequestException":
                send.ThrowsAsync(sendFailure);
                break;
            default:
                send.ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = outcome is "Skipped404" or "Proxied404" ? HttpStatusCode.NotFound : HttpStatusCode.OK,
                    Content = new StringContent("Test")
                });
                break;
        }

        using var httpClient = new HttpClient(messageHandler.Object);
        var uriFailure = new InvalidOperationException("target unavailable");
        var baseUriTask = outcome == "BaseUriFailure"
            ? Task.FromException<Uri>(uriFailure)
            : Task.FromResult(new Uri("http://localhost:3000"));
        if (outcome == "BaseUriFailure")
        {
            var exception = Assert.Throws<InvalidOperationException>(() =>
                SpaProxy.PerformProxyRequest(context, httpClient, baseUriTask, applicationStopping, proxy404s: true)
                    .GetAwaiter().GetResult());
            Assert.Same(uriFailure, exception);
        }
        else if (outcome == "SendHttpRequestException")
        {
            var exception = Assert.Throws<HttpRequestException>(() =>
                SpaProxy.PerformProxyRequest(context, httpClient, baseUriTask, applicationStopping, proxy404s: true)
                    .GetAwaiter().GetResult());
            Assert.Same(sendFailure, exception.InnerException);
            Assert.Contains("http://localhost:3000/test", exception.Message);
        }
        else
        {
            var result = SpaProxy.PerformProxyRequest(context, httpClient, baseUriTask, applicationStopping,
                proxy404s: outcome != "Skipped404").GetAwaiter().GetResult();
            Assert.Equal(outcome != "Skipped404", result);
            Assert.Equal(outcome == "Proxied404" ? 404 : 200, context.Response.StatusCode);
            Assert.Equal(outcome is "Http200" or "Proxied404" ? "Test" : "",
                Encoding.UTF8.GetString(responseBody.ToArray()));
        }

        return requestSource;
    }

    private sealed class ResponseCopyStream(bool failCopy = false) : Stream
    {
        private readonly MemoryStream _written = new();

        public TaskCompletionSource Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public CancellationToken Token { get; private set; }
        public override bool CanRead => false;
        public override bool CanSeek => false;
        public override bool CanWrite => true;
        public override long Length => _written.Length;
        public override long Position
        {
            get => _written.Position;
            set => throw new NotSupportedException();
        }

        public byte[] ToArray() => _written.ToArray();
        public override void Flush() => _written.Flush();
        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        public override Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        {
            return WriteCoreAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();
        }

        public override ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default)
        {
            return WriteCoreAsync(buffer, cancellationToken);
        }

        private async ValueTask WriteCoreAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken)
        {
            Token = cancellationToken;
            Started.TrySetResult();
            await Release.Task.WaitAsync(cancellationToken);
            if (failCopy)
            {
                throw new IOException("copy interrupted");
            }

            _written.Write(buffer.Span);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _written.Dispose();
            }

            base.Dispose(disposing);
        }
    }
}
