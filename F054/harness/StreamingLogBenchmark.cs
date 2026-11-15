using System.Runtime.CompilerServices;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Components.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;

namespace AutoPerf;

public class StreamingLogBenchmark
{
    private StreamingWorkload _workload = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    public IEnumerable<string> Cases => StreamingWorkload.Definitions.Select(d => d.Name);

    [GlobalSetup]
    public async Task Setup()
    {
        _workload = new StreamingWorkload(Case);
        await _workload.InitializeAsync();
    }

    [Benchmark]
    public Task<int> Run() => _workload.RunAsync();
}

public sealed record CaseDefinition(string Name, string Mode, int Updates, int Contents, int Turns = 1, string Kind = "Text");
public sealed record MessageReceipt(string Role, string Text, string[] ContentTypes, string[] ContentValues);
public sealed record FunctionReceipt(string Call, string? Result);
public sealed record BlockReceipt(string Kind, string? Role, string Id, string? Text, string Lifecycle, FunctionReceipt? Function);
public sealed record LogReceipt(int Id, string Level, Dictionary<string, object?> Fields);
public sealed record CaseReceipt(string Name, string Mode, int Calls, int Updates, List<List<MessageReceipt>> Requests,
    List<List<BlockReceipt>> Turns, List<LogReceipt> Logs);

public sealed class StreamingWorkload
{
    public static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    public static readonly CaseDefinition[] Definitions = CreateDefinitions();
    private readonly CaseDefinition _definition;
    private readonly CounterLogger _logger = new();
    private readonly CounterLoggerFactory _factory;
    private readonly StreamingClient _client;

    public StreamingWorkload(string name)
    {
        _definition = Definitions.Single(d => d.Name == name);
        _factory = new CounterLoggerFactory(_logger);
        _client = new StreamingClient(_definition, _logger);
    }

    public async Task InitializeAsync()
    {
        var oracles = JsonSerializer.Deserialize<CaseReceipt[]>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "contract-oracles.json")), JsonOptions)
            ?? throw new InvalidOperationException("Original oracles are missing.");
        var oracle = oracles.Single(r => r.Name == _definition.Name);
        await VerifyRepeatedAsync(oracle);
        Console.WriteLine("Verified producer receipt: " + JsonSerializer.Serialize(oracle));
    }

    public async Task VerifyRepeatedAsync(CaseReceipt expected)
    {
        for (var i = 0; i < 2; i++)
        {
            var actual = await CaptureAsync();
            if (JsonSerializer.Serialize(actual) != JsonSerializer.Serialize(expected))
            {
                Console.Error.WriteLine("Expected: " + JsonSerializer.Serialize(expected));
                Console.Error.WriteLine("Actual: " + JsonSerializer.Serialize(actual));
                throw new InvalidOperationException($"Actual complete streamed blocks/logs/history differ: {_definition.Name}.");
            }
        }
    }

    public Task<int> RunAsync() => ExecuteAsync(capture: false, blocks: null);

    public async Task<CaseReceipt> CaptureAsync()
    {
        var blocks = new List<List<BlockReceipt>>();
        await ExecuteAsync(capture: true, blocks);

        return new CaseReceipt(_definition.Name, _definition.Mode, _client.Calls, _client.Updates,
            [.. _client.Requests], blocks, [.. _logger.Records]);
    }

    private async Task<int> ExecuteAsync(bool capture, List<List<BlockReceipt>>? blocks)
    {
        _logger.Reset(_definition.Mode, capture);
        _client.Reset(capture);
        var checksum = 0;
        using var agent = new UIAgent(_client, configure: null,
            loggerFactory: _definition.Mode == "Null" ? null : _factory);
        for (var turn = 0; turn < _definition.Turns; turn++)
        {
            List<ContentBlock>? observed = capture ? [] : null;
            await foreach (var block in agent.SendMessageAsync(new ChatMessage(ChatRole.User, $"question-{turn}")))
            {
                checksum = unchecked(checksum * 31 + block.Id.Length +
                    (block is RichContentBlock rich ? rich.RawText.Length : 1));
                observed?.Add(block);
            }
            if (observed is not null)
            {
                blocks!.Add(observed.Select(b => new BlockReceipt(b.GetType().Name, b.Role?.Value,
                    _logger.NormalizeId(b.Id),
                    b is RichContentBlock rich ? rich.RawText : null, b.LifecycleState.ToString(),
                    DescribeFunction(b))).ToList());
                if (observed.Any(b => b.Id.Length == 0 || b.LifecycleState != BlockLifecycleState.Inactive))
                {
                    throw new InvalidOperationException("Actual fully consumed blocks must be named and inactive.");
                }
            }
        }

        return unchecked(checksum + _client.Updates + _logger.Count);
    }

    private static CaseDefinition[] CreateDefinitions()
    {
        var cases = new List<CaseDefinition>();
        foreach (var count in new[] { 1, 4, 16 })
        {
            foreach (var updates in new[] { 1, 8 })
            {
                cases.Add(new($"Calls_Disabled_{updates}_{count}", "Disabled", updates, count, Kind: "Calls"));
            }
        }
        foreach (var pair in new[] { (1, 1), (8, 1), (8, 16) })
        {
            cases.Add(new($"Calls_Null_{pair.Item1}_{pair.Item2}", "Null", pair.Item1, pair.Item2, Kind: "Calls"));
        }
        foreach (var count in new[] { 1, 4, 16 })
        {
            cases.Add(new($"SameUpdate_Disabled_1_{count}", "Disabled", 1, count, Kind: "SameUpdate"));
        }
        cases.Add(new("ResultFirst_Disabled_1_4", "Disabled", 1, 4, Kind: "ResultFirst"));
        cases.Add(new("SameUpdate_Null_1_4", "Null", 1, 4, Kind: "SameUpdate"));
        cases.Add(new("Mixed_Disabled_8", "Disabled", 8, 2, Kind: "Mixed"));
        cases.Add(new("TwoTurns_Calls_Disabled_8_1", "Disabled", 8, 1, Turns: 2, Kind: "Calls"));
        foreach (var pair in new[] { (1, 1), (1, 16), (8, 1), (8, 16) })
        {
            cases.Add(new($"Calls_Enabled_{pair.Item1}_{pair.Item2}", "Enabled", pair.Item1, pair.Item2, Kind: "Calls"));
        }
        cases.Add(new("SameUpdate_Enabled_1_4", "Enabled", 1, 4, Kind: "SameUpdate"));
        cases.Add(new("ResultFirst_Enabled_1_4", "Enabled", 1, 4, Kind: "ResultFirst"));
        cases.Add(new("Mixed_Enabled_8", "Enabled", 8, 2, Kind: "Mixed"));
        cases.Add(new("Calls_Flip_8_1", "Flip", 8, 1, Kind: "Calls"));
        cases.Add(new("Text_Disabled_8_1", "Disabled", 8, 1));
        cases.Add(new("Text_Null_8_16", "Null", 8, 16));
        cases.Add(new("Empty_Disabled_8_0", "Disabled", 8, 0));
        cases.Add(new("NoResponse_Disabled", "Disabled", 0, 1));
        cases.Add(new("Recorded_Disabled", "Disabled", 0, 0, Kind: "Recorded"));
        cases.Add(new("Recorded_Enabled", "Enabled", 0, 0, Kind: "Recorded"));
        cases.Add(new("RecordedTwo_Disabled", "Disabled", 0, 0, Turns: 2, Kind: "RecordedTwo"));

        return cases.ToArray();
    }

    private static FunctionReceipt? DescribeFunction(ContentBlock block)
    {
        if (block is not FunctionInvocationContentBlock invocation)
        {
            return null;
        }
        var call = invocation.Call ?? throw new InvalidOperationException("Actual function block has no call.");

        return new FunctionReceipt(JsonSerializer.Serialize(call, AIJsonUtilities.DefaultOptions),
            invocation.Result is { } result ? JsonSerializer.Serialize(result, AIJsonUtilities.DefaultOptions) : null);
    }
}

internal sealed class StreamingClient : IChatClient
{
    private readonly CaseDefinition _definition;
    private readonly CounterLogger _logger;
    private readonly List<List<ChatResponseUpdate>>? _recordings;
    private bool _capture;
    public int Calls { get; private set; }
    public int Updates { get; private set; }
    public List<List<MessageReceipt>> Requests { get; } = [];

    public StreamingClient(CaseDefinition definition, CounterLogger logger)
    {
        _definition = definition;
        _logger = logger;
        if (definition.Kind.StartsWith("Recorded", StringComparison.Ordinal))
        {
            var name = definition.Kind == "Recorded" ? "recordings-single.json" : "recordings-multi.json";
            _recordings = JsonSerializer.Deserialize<List<List<ChatResponseUpdate>>>(
                File.ReadAllText(Path.Combine(AppContext.BaseDirectory, name)), AIJsonUtilities.DefaultOptions)
                ?? throw new InvalidOperationException("Actual provider recording was null.");
        }
    }

    public void Reset(bool capture)
    {
        _capture = capture;
        Calls = 0;
        Updates = 0;
        Requests.Clear();
    }

    public IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
        IEnumerable<ChatMessage> messages, ChatOptions? options = null, CancellationToken cancellationToken = default)
    {
        if (_capture)
        {
            Requests.Add(messages.Select(m => new MessageReceipt(m.Role.Value, m.Text,
                m.Contents.Select(c => c.GetType().Name).ToArray(),
                m.Contents.Select(c => JsonSerializer.Serialize(c, AIJsonUtilities.DefaultOptions)).ToArray())).ToList());
        }
        var turn = Calls++;

        return ProduceAsync(turn, cancellationToken);
    }

    private async IAsyncEnumerable<ChatResponseUpdate> ProduceAsync(
        int turn, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var count = _recordings is null ? _definition.Updates : _recordings[turn].Count;
        for (var i = 0; i < count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _logger.DebugEnabled = _definition.Mode == "Enabled" || _definition.Mode == "Flip" && i % 2 == 1;
            ChatResponseUpdate update;
            if (_recordings is not null)
            {
                var source = _recordings[turn][i];
                update = new ChatResponseUpdate
                {
                    Role = source.Role,
                    AuthorName = source.AuthorName,
                    MessageId = source.MessageId,
                    ResponseId = source.ResponseId,
                    CreatedAt = source.CreatedAt,
                    ModelId = source.ModelId,
                    FinishReason = source.FinishReason,
                    Contents = source.Contents.Select(CloneContent).ToList()
                };
            }
            else
            {
                var contents = new List<AIContent>(_definition.Contents);
                if (_definition.Kind == "Mixed")
                {
                    contents.Add(new TextContent("x"));
                    contents.Add(new FunctionCallContent($"call-{turn}-{i}", "tool"));
                }
                else if (_definition.Kind is "Calls" or "SameUpdate" or "ResultFirst")
                {
                    for (var content = 0; content < _definition.Contents; content++)
                    {
                        var id = $"call-{turn}-{i}-{content}";
                        var call = new FunctionCallContent(id, "tool",
                            new Dictionary<string, object?> { ["index"] = content });
                        if (_definition.Kind == "ResultFirst")
                        {
                            contents.Add(new FunctionResultContent(id, $"result-{content}"));
                        }
                        contents.Add(call);
                        if (_definition.Kind == "SameUpdate")
                        {
                            contents.Add(new FunctionResultContent(id, $"result-{content}"));
                        }
                    }
                }
                else
                {
                    for (var content = 0; content < _definition.Contents; content++)
                    {
                        contents.Add(new TextContent("x"));
                    }
                }
                update = new ChatResponseUpdate
                {
                    Role = _definition.Contents == 0 ? null : ChatRole.Assistant,
                    MessageId = $"response-{turn}",
                    Contents = contents
                };
            }
            Updates++;
            yield return update;
        }
        await Task.CompletedTask;
    }

    private static AIContent CloneContent(AIContent content) => content switch
    {
        TextContent text => new TextContent(text.Text ?? string.Empty),
        FunctionCallContent call => new FunctionCallContent(call.CallId, call.Name, call.Arguments),
        UsageContent usage => new UsageContent(usage.Details),
        _ => throw new InvalidOperationException($"Unexpected actual recording content: {content.GetType().Name}.")
    };

    public Task<ChatResponse> GetResponseAsync(IEnumerable<ChatMessage> messages, ChatOptions? options = null,
        CancellationToken cancellationToken = default) => throw new NotSupportedException("Streaming benchmark provider.");
    public object? GetService(Type serviceType, object? serviceKey = null) => serviceType == typeof(IChatClient) ? this : null;
    public void Dispose() { }
}

internal sealed class CounterLogger : ILogger
{
    private string _mode = string.Empty;
    private bool _capture;
    private readonly Dictionary<string, string> _dynamicIds = new(StringComparer.Ordinal);
    public bool DebugEnabled { get; set; }
    public int Count { get; private set; }
    public List<LogReceipt> Records { get; } = [];

    public void Reset(string mode, bool capture)
    {
        _mode = mode;
        _capture = capture;
        DebugEnabled = mode == "Enabled";
        Count = 0;
        Records.Clear();
        _dynamicIds.Clear();
    }

    public bool IsEnabled(LogLevel level) => level != LogLevel.None && _mode != "Null" &&
        (level >= LogLevel.Information || level == LogLevel.Debug && DebugEnabled);

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        Count++;
        if (_capture)
        {
            if (state is not IReadOnlyList<KeyValuePair<string, object?>> fields || exception is not null)
            {
                throw new InvalidOperationException("Unexpected actual generated log state or stream exception.");
            }
            Records.Add(new LogReceipt(eventId.Id, logLevel.ToString(),
                fields.ToDictionary(p => p.Key, p => p.Key == "BlockId" && p.Value is string id ? NormalizeId(id) : p.Value)));
        }
    }

    public string NormalizeId(string id)
    {
        if (!Guid.TryParse(id, out _))
        {
            return id;
        }
        if (!_dynamicIds.TryGetValue(id, out var normalized))
        {
            normalized = $"<dynamic-id-{_dynamicIds.Count}>";
            _dynamicIds.Add(id, normalized);
        }

        return normalized;
    }

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
}

internal sealed class CounterLoggerFactory(CounterLogger logger) : ILoggerFactory
{
    public ILogger CreateLogger(string categoryName)
    {
        if (categoryName != "Microsoft.AspNetCore.Components.AI.BlockMappingPipeline")
        {
            throw new InvalidOperationException("Actual owner logger category changed.");
        }

        return logger;
    }

    public void AddProvider(ILoggerProvider provider) => throw new NotSupportedException();
    public void Dispose() { }
}
