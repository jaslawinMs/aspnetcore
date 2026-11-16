using System.IO.Pipelines;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.TestHost;

internal sealed class LiveResponse : IDisposable
{
    private readonly TaskCompletionSource<HttpContext> _ready = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly TaskCompletionSource _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly TaskCompletionSource _finished = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly TestServer _server;
    private readonly HttpClient _client;
    private readonly PipeWriter _writer;

    public LiveResponse(byte[] payload)
    {
        Payload = payload;
        _server = new TestServer(new WebHostBuilder().Configure(app => app.Run(async context =>
        {
            context.Features.GetRequiredFeature<IHttpResponseTrailersFeature>().Trailers["X-Autoperf-F092"] = "complete";
            if (context.Request.Path == "/prepared")
            {
                context.Response.OnCompleted(() =>
                {
                    _finished.TrySetResult();
                    return Task.CompletedTask;
                });
                await context.Response.BodyWriter.FlushAsync();
                _ready.SetResult(context);
                await _release.Task;
            }
            else
            {
                await context.Response.BodyWriter.WriteAsync(Payload);
            }
        })));
        _client = _server.CreateClient();
        var clientContext = _server.SendAsync(context =>
        {
            context.Request.Method = HttpMethods.Get;
            context.Request.Path = "/prepared";
        }).WaitAsync(TimeSpan.FromSeconds(10)).GetAwaiter().GetResult();
        Stream = clientContext.Response.Body;
        Context = _ready.Task.WaitAsync(TimeSpan.FromSeconds(10)).GetAwaiter().GetResult();
        _writer = Context.Response.BodyWriter;
        if (Stream.GetType().FullName != "Microsoft.AspNetCore.TestHost.ResponseBodyReaderStream")
        {
            throw new InvalidOperationException($"Unexpected real response owner: {Stream.GetType().AssemblyQualifiedName}");
        }
    }

    public byte[] Payload { get; }

    public Stream Stream { get; }

    public HttpContext Context { get; }

    public string? ProducerType => _writer.GetType().FullName;

    public void Produce()
    {
        var flush = _writer.WriteAsync(Payload);
        if (!flush.IsCompletedSuccessfully)
        {
            throw new InvalidOperationException("The prepared response producer did not flush synchronously.");
        }
        var result = flush.Result;
        if (result.IsCanceled || result.IsCompleted)
        {
            throw new InvalidOperationException("The prepared response producer was canceled or completed.");
        }
    }

    public async Task<int> ReadPublic(byte[] buffer, int offset, int count)
    {
        using var response = await _client.GetAsync("/once", HttpCompletionOption.ResponseHeadersRead);
        using var stream = await response.Content.ReadAsStreamAsync();
        if (stream.GetType().FullName != "System.Net.Http.StreamContent+ReadOnlyStream")
        {
            throw new InvalidOperationException($"Unexpected actual public HTTP wrapper: {stream.GetType().AssemblyQualifiedName}");
        }
        var read = stream.Read(buffer, offset, count);
        if (read != Payload.Length || stream.Read(buffer, offset + read, 1) != 0)
        {
            throw new InvalidOperationException("Public synchronous response bytes or EOF differ.");
        }
        RequireTrailer(response);
        return read;
    }

    public void Finish()
    {
        _release.TrySetResult();
        _finished.Task.WaitAsync(TimeSpan.FromSeconds(10)).GetAwaiter().GetResult();
    }

    public static void RequireTrailer(HttpResponseMessage response)
    {
        if (!response.TrailingHeaders.TryGetValues("X-Autoperf-F092", out var values) ||
            !values.SequenceEqual(new[] { "complete" }))
        {
            throw new InvalidOperationException("Actual EOF did not copy the exact completion trailer.");
        }
    }

    public void Dispose()
    {
        Finish();
        Stream.Dispose();
        _client.Dispose();
        _server.Dispose();
    }
}
