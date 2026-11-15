using System.Security.Claims;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

public class FailureLogBenchmark
{
    private FailureWorkload _workload = null!;
    public IEnumerable<string> Cases => FailureWorkload.Definitions.Select(definition => definition.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public async Task Setup()
    {
        _workload = new FailureWorkload(Case);
        await _workload.InitializeAsync();
    }

    [Benchmark]
    public Task<AuthorizationResult> AuthorizeAsync() => _workload.ExecuteAsync();

    [GlobalCleanup]
    public void Cleanup() => _workload.Dispose();
}

public sealed class FailureWorkload : IDisposable
{
    public static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    public static IReadOnlyList<FailureCase> Definitions { get; } =
    [
        new("Direct_Fail_Disabled_1_0", "Disabled", "Fail", 1, 0),
        new("Direct_Fail_Disabled_1_16", "Disabled", "Fail", 1, 16),
        new("Direct_Fail_Disabled_4_16", "Disabled", "Fail", 4, 16),
        new("Direct_Fail_Disabled_16_16", "Disabled", "Fail", 16, 16),
        new("Direct_Fail_Disabled_64_16", "Disabled", "Fail", 64, 16),
        new("Direct_Fail_Disabled_1_128", "Disabled", "Fail", 1, 128),
        new("Direct_Fail_Disabled_16_128", "Disabled", "Fail", 16, 128),
        new("Direct_Fail_Disabled_1_1024", "Disabled", "Fail", 1, 1024),
        new("Direct_Fail_Disabled_16_1024", "Disabled", "Fail", 16, 1024),
        new("Direct_Fail_Null_1_16", "Null", "Fail", 1, 16),
        new("Direct_Fail_Null_4_16", "Null", "Fail", 4, 16),
        new("Direct_Fail_Null_16_16", "Null", "Fail", 16, 16),
        new("Direct_Fail_Null_1_128", "Null", "Fail", 1, 128),
        new("Direct_Fail_Null_16_128", "Null", "Fail", 16, 128),
        new("Factory_Fail_Filtered_1_16", "FactoryFiltered", "Fail", 1, 16),
        new("Factory_Fail_Filtered_16_16", "FactoryFiltered", "Fail", 16, 16),
        new("Factory_Fail_Filtered_16_128", "FactoryFiltered", "Fail", 16, 128),
        new("Direct_Fail_Enabled_1_16", "Enabled", "Fail", 1, 16),
        new("Direct_Fail_Enabled_16_16", "Enabled", "Fail", 16, 16),
        new("Direct_Fail_Enabled_16_128", "Enabled", "Fail", 16, 128),
        new("Factory_Fail_Enabled_1_16", "FactoryEnabled", "Fail", 1, 16),
        new("Factory_Fail_Enabled_16_16", "FactoryEnabled", "Fail", 16, 16),
        new("Direct_Empty_Disabled", "Disabled", "Fail", 0, 0),
        new("Direct_Empty_Null", "Null", "Fail", 0, 0),
        new("Direct_Empty_Enabled", "Enabled", "Fail", 0, 0),
        new("Direct_Unmet_Disabled_1", "Disabled", "Unmet", 1, 0),
        new("Direct_Unmet_Disabled_16", "Disabled", "Unmet", 16, 0),
        new("Direct_Unmet_Enabled_16", "Enabled", "Unmet", 16, 0),
        new("Direct_Success_Disabled", "Disabled", "Success", 1, 0),
        new("Direct_Success_Enabled", "Enabled", "Success", 1, 0),
        new("Factory_Unmet_Filtered_16", "FactoryFiltered", "Unmet", 16, 0),
        new("Named_Fail_Filtered_16_128", "FactoryFiltered", "Fail", 16, 128, Named: true),
    ];

    private readonly FailureCase _definition;
    private readonly WorkloadLogger _logger;
    private readonly WorkloadHandler _handler;
    private readonly ServiceProvider _provider;
    private readonly IAuthorizationService _service;
    private readonly ClaimsPrincipal _user = new(new ClaimsIdentity());
    private readonly object _resource = new();
    private readonly IAuthorizationRequirement[] _requirements;
    private readonly ILogger<DefaultAuthorizationService> _actualLogger;

    public FailureWorkload(string name)
    {
        _definition = Definitions.Single(definition => definition.Name == name);
        _logger = new WorkloadLogger(_definition.Mode is "Enabled" or "FactoryEnabled");
        _handler = new WorkloadHandler(_definition);
        _requirements = _definition.Outcome == "Success"
            ? [new AssertionRequirement(_ => true)]
            : Enumerable.Range(0, _definition.Outcome == "Unmet" ? _definition.Count : 1)
                .Select(index => (IAuthorizationRequirement)new WorkloadRequirement($"requirement-{index}")).ToArray();
        var services = new ServiceCollection();
        services.AddAuthorizationCore(options =>
        {
            if (_definition.Named)
            {
                options.AddPolicy("benchmark", policy => policy.AddRequirements(_requirements));
            }
        });
        if (_definition.Mode.StartsWith("Factory", StringComparison.Ordinal))
        {
            services.AddLogging(builder => builder
                .SetMinimumLevel(_logger.InformationEnabled ? LogLevel.Debug : LogLevel.Warning)
                .AddProvider(new WorkloadLoggerProvider(_logger)));
        }
        else
        {
            services.AddLogging();
            services.AddSingleton<ILogger<DefaultAuthorizationService>>(_definition.Mode == "Null"
                ? NullLogger<DefaultAuthorizationService>.Instance
                : _logger);
        }
        services.AddSingleton<IAuthorizationHandler>(_handler);
        _provider = services.BuildServiceProvider();
        _service = _provider.GetRequiredService<IAuthorizationService>();
        _actualLogger = _provider.GetRequiredService<ILogger<DefaultAuthorizationService>>();
    }

    public Task<AuthorizationResult> ExecuteAsync(bool capture = false)
    {
        _logger.Capture = capture;
        _logger.Reset();
        _handler.Invocations = 0;

        return _definition.Named
            ? _service.AuthorizeAsync(_user, _resource, "benchmark")
            : _service.AuthorizeAsync(_user, _resource, _requirements);
    }

    public async Task<FailureReceipt> CaptureAsync()
    {
        var result = await ExecuteAsync(capture: true);
        if (_handler.Invocations != 1 || !ReferenceEquals(_handler.User, _user) || !ReferenceEquals(_handler.Resource, _resource))
        {
            throw new InvalidOperationException("Real handler/context identity or invocation differs.");
        }
        if (_definition.Outcome == "Success")
        {
            if (!result.Succeeded || result.Failure is not null)
            {
                throw new InvalidOperationException("Actual success result differs.");
            }
        }
        else if (result.Succeeded || result.Failure is null ||
            result.Failure.FailCalled != (_definition.Outcome == "Fail"))
        {
            throw new InvalidOperationException("Actual failure discriminator differs.");
        }
        var reasons = result.Failure?.FailureReasons.ToArray() ?? [];
        if (reasons.Length != _handler.Reasons.Length ||
            reasons.Where((reason, index) => !ReferenceEquals(reason, _handler.Reasons[index]) || !ReferenceEquals(reason.Handler, _handler)).Any())
        {
            throw new InvalidOperationException("Original reason/handler identity/order differs.");
        }
        var failedRequirements = result.Failure?.FailedRequirements.ToArray() ?? [];
        var expectedFailed = _definition.Outcome == "Unmet" ? _requirements : [];
        if (!failedRequirements.SequenceEqual(expectedFailed, ReferenceEqualityComparer.Instance))
        {
            throw new InvalidOperationException("Original failed-requirement identity/order differs.");
        }
        var logs = _logger.Entries.ToArray();
        var expectedLevel = _definition.Outcome == "Success" ? LogLevel.Debug : LogLevel.Information;
        var shouldLog = _definition.Mode != "Null" && (expectedLevel == LogLevel.Debug || _logger.InformationEnabled);
        if (_logger.LogCount != (shouldLog ? 1 : 0) || logs.Length != _logger.LogCount)
        {
            throw new InvalidOperationException("Actual emitted log count differs.");
        }
        if (shouldLog)
        {
            var reasonText = _definition.Outcome == "Unmet"
                ? "These requirements were not met:" + Environment.NewLine + string.Join(Environment.NewLine, expectedFailed.Select(requirement => requirement.ToString()))
                : reasons.Length == 0
                    ? "Fail() was explicitly called."
                    : "Fail() was explicitly called. Authorization failed due to:" + Environment.NewLine + string.Join(Environment.NewLine, reasons.Select(reason => reason.Message));
            var expectedText = _definition.Outcome == "Success" ? "Authorization was successful." : "Authorization failed. " + reasonText;
            if (logs[0].Level != expectedLevel || logs[0].Id != (_definition.Outcome == "Success" ? 1 : 2) ||
                logs[0].Name != (_definition.Outcome == "Success" ? "UserAuthorizationSucceeded" : "UserAuthorizationFailed") ||
                logs[0].Text != expectedText || logs[0].ExceptionType is not null)
            {
                throw new InvalidOperationException("Actual event, level or formatted log differs.");
            }
            var expectedFields = _definition.Outcome == "Success"
                ? new[] { new LogField("{OriginalFormat}", "Authorization was successful.") }
                : [new LogField("Reason", reasonText), new LogField("{OriginalFormat}", "Authorization failed. {Reason}")];
            if (!logs[0].Fields.SequenceEqual(expectedFields))
            {
                throw new InvalidOperationException("Actual structured fields differ.");
            }
        }

        return new(_definition.Name, _definition.Mode, _definition.Outcome, _definition.Named,
            _service.GetType().FullName!, _actualLogger.GetType().FullName!, _logger.Category,
            result.Succeeded, result.Failure?.FailCalled ?? false,
            reasons.Select(reason => reason.Message).ToArray(), failedRequirements.Select(requirement => requirement.ToString()!).ToArray(), logs);
    }

    public async Task VerifyTwiceAsync(FailureReceipt original)
    {
        for (var repeat = 0; repeat < 2; repeat++)
        {
            var actual = await CaptureAsync();
            if (JsonSerializer.Serialize(actual, JsonOptions) != JsonSerializer.Serialize(original, JsonOptions))
            {
                throw new InvalidOperationException("Actual complete workload differs from original oracle: " + _definition.Name);
            }
        }
        _logger.Capture = false;
        _logger.Reset();
    }

    public async Task InitializeAsync()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (!File.Exists(Path.Combine(directory.FullName, "contract-oracles.json")))
        {
            directory = directory.Parent ?? throw new InvalidOperationException("Missing original contracts.");
        }
        var oracles = JsonSerializer.Deserialize<FailureReceipt[]>(File.ReadAllText(Path.Combine(directory.FullName, "contract-oracles.json")), JsonOptions)
            ?? throw new InvalidOperationException("Empty original contracts.");
        var original = oracles.Single(receipt => receipt.Case == _definition.Name);
        await VerifyTwiceAsync(original);
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(original));
    }

    public void Dispose() => _provider.Dispose();

    private sealed class WorkloadRequirement(string text) : IAuthorizationRequirement
    {
        public override string ToString() => text;
    }

    private sealed class WorkloadHandler : IAuthorizationHandler
    {
        private readonly FailureCase _definition;
        public AuthorizationFailureReason[] Reasons { get; }
        public int Invocations { get; set; }
        public ClaimsPrincipal? User { get; private set; }
        public object? Resource { get; private set; }

        public WorkloadHandler(FailureCase definition)
        {
            _definition = definition;
            Reasons = definition.Outcome == "Fail"
                ? Enumerable.Range(0, definition.Count).Select(index =>
                    new AuthorizationFailureReason(this, new string((char)('a' + index % 26), definition.Length))).ToArray()
                : [];
        }

        public Task HandleAsync(AuthorizationHandlerContext context)
        {
            Invocations++;
            User = context.User;
            Resource = context.Resource;
            if (_definition.Outcome == "Fail")
            {
                if (Reasons.Length == 0)
                {
                    context.Fail();
                }
                else
                {
                    foreach (var reason in Reasons)
                    {
                        context.Fail(reason);
                    }
                }
            }

            return Task.CompletedTask;
        }
    }

    private sealed class WorkloadLoggerProvider(WorkloadLogger logger) : ILoggerProvider
    {
        public ILogger CreateLogger(string categoryName)
        {
            if (categoryName != typeof(DefaultAuthorizationService).FullName)
            {
                throw new InvalidOperationException("Unexpected logging category: " + categoryName);
            }
            logger.Category = categoryName;

            return logger;
        }

        public void Dispose() { }
    }

    private sealed class WorkloadLogger(bool informationEnabled) : ILogger<DefaultAuthorizationService>
    {
        public bool InformationEnabled => informationEnabled;
        public bool Capture { get; set; }
        public string? Category { get; set; }
        public int LogCount { get; private set; }
        public List<LogReceipt> Entries { get; } = [];

        public void Reset()
        {
            LogCount = 0;
            Entries.Clear();
        }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel level) => level == LogLevel.Debug || (level == LogLevel.Information && informationEnabled);

        public void Log<TState>(LogLevel level, EventId id, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            LogCount++;
            if (Capture)
            {
                if (state is not IReadOnlyList<KeyValuePair<string, object?>> fields)
                {
                    throw new InvalidOperationException("Unexpected structured log state.");
                }
                Entries.Add(new(level, id.Id, id.Name, formatter(state, exception), exception?.GetType().FullName,
                    fields.Select(field => new LogField(field.Key, field.Value?.ToString())).ToArray()));
            }
        }
    }
}

public sealed record FailureCase(string Name, string Mode, string Outcome, int Count, int Length, bool Named = false);
public sealed record LogField(string Key, string? Value);
public sealed record LogReceipt(LogLevel Level, int Id, string? Name, string Text, string? ExceptionType, LogField[] Fields);
public sealed record FailureReceipt(string Case, string Mode, string Outcome, bool Named, string ServiceType, string LoggerType,
    string? FactoryCategory, bool Succeeded, bool FailCalled, string[] Reasons, string[] FailedRequirements, LogReceipt[] Logs);
