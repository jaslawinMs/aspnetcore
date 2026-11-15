using System.Security.Claims;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

public class RequirementsLogBenchmark
{
    private RequirementsWorkload _workload = null!;
    public IEnumerable<string> Cases => RequirementsWorkload.Definitions.Select(definition => definition.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public async Task Setup()
    {
        _workload = new RequirementsWorkload(Case);
        await _workload.InitializeAsync();
    }

    [Benchmark]
    public Task<AuthorizationResult> AuthorizeAsync() => _workload.ExecuteAsync();

    [GlobalCleanup]
    public void Cleanup() => _workload.Dispose();
}

public sealed class RequirementsWorkload : IDisposable
{
    public static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    public static IReadOnlyList<RequirementsCase> Definitions { get; } =
    [
        new("Direct_Unmet_Disabled_0_0", "Disabled", "Unmet", 0, 0),
        new("Direct_Unmet_Disabled_1_0", "Disabled", "Unmet", 1, 0),
        new("Direct_Unmet_Disabled_1_16", "Disabled", "Unmet", 1, 16),
        new("Direct_Unmet_Disabled_4_16", "Disabled", "Unmet", 4, 16),
        new("Direct_Unmet_Disabled_16_16", "Disabled", "Unmet", 16, 16),
        new("Direct_Unmet_Disabled_64_16", "Disabled", "Unmet", 64, 16),
        new("Direct_Unmet_Disabled_1_128", "Disabled", "Unmet", 1, 128),
        new("Direct_Unmet_Disabled_16_128", "Disabled", "Unmet", 16, 128),
        new("Direct_Unmet_Disabled_1_1024", "Disabled", "Unmet", 1, 1024),
        new("Direct_Unmet_Disabled_16_1024", "Disabled", "Unmet", 16, 1024),
        new("Direct_Unmet_Null_0_0", "Null", "Unmet", 0, 0),
        new("Direct_Unmet_Null_1_16", "Null", "Unmet", 1, 16),
        new("Direct_Unmet_Null_4_16", "Null", "Unmet", 4, 16),
        new("Direct_Unmet_Null_16_16", "Null", "Unmet", 16, 16),
        new("Direct_Unmet_Null_1_128", "Null", "Unmet", 1, 128),
        new("Direct_Unmet_Null_16_128", "Null", "Unmet", 16, 128),
        new("Factory_Unmet_Filtered_0_0", "FactoryFiltered", "Unmet", 0, 0),
        new("Factory_Unmet_Filtered_1_16", "FactoryFiltered", "Unmet", 1, 16),
        new("Factory_Unmet_Filtered_16_16", "FactoryFiltered", "Unmet", 16, 16),
        new("Factory_Unmet_Filtered_16_128", "FactoryFiltered", "Unmet", 16, 128),
        new("Named_Unmet_Filtered_16_128", "FactoryFiltered", "Unmet", 16, 128, Named: true),
        new("Direct_Unmet_Enabled_0_0", "Enabled", "Unmet", 0, 0),
        new("Direct_Unmet_Enabled_1_16", "Enabled", "Unmet", 1, 16),
        new("Direct_Unmet_Enabled_16_16", "Enabled", "Unmet", 16, 16),
        new("Direct_Unmet_Enabled_16_128", "Enabled", "Unmet", 16, 128),
        new("Factory_Unmet_Enabled_0_0", "FactoryEnabled", "Unmet", 0, 0),
        new("Factory_Unmet_Enabled_1_16", "FactoryEnabled", "Unmet", 1, 16),
        new("Factory_Unmet_Enabled_16_16", "FactoryEnabled", "Unmet", 16, 16),
        new("Direct_Fail_Disabled_0_0", "Disabled", "Fail", 0, 0),
        new("Direct_Fail_Disabled_1_16", "Disabled", "Fail", 1, 16),
        new("Direct_Fail_Disabled_16_16", "Disabled", "Fail", 16, 16),
        new("Direct_Fail_Enabled_1_16", "Enabled", "Fail", 1, 16),
        new("Factory_Fail_Filtered_16_128", "FactoryFiltered", "Fail", 16, 128),
        new("Direct_Success_Disabled", "Disabled", "Success", 1, 0),
        new("Direct_Success_Enabled", "Enabled", "Success", 1, 0),
        new("Direct_Partial_Disabled_16_16", "Disabled", "Unmet", 16, 16, Partial: true),
        new("Direct_Partial_Enabled_16_16", "Enabled", "Unmet", 16, 16, Partial: true),
    ];

    private readonly RequirementsCase _definition;
    private readonly WorkloadLogger _logger;
    private readonly WorkloadHandler _handler;
    private readonly ServiceProvider _provider;
    private readonly IAuthorizationService _service;
    private readonly ClaimsPrincipal _user = new(new ClaimsIdentity());
    private readonly object _resource = new();
    private readonly IAuthorizationRequirement[] _requirements;
    private readonly WorkloadRequirement[] _plainRequirements;
    private readonly IAuthorizationRequirement[] _expectedFailed;
    private readonly ILogger<DefaultAuthorizationService> _actualLogger;

    public RequirementsWorkload(string name)
    {
        _definition = Definitions.Single(definition => definition.Name == name);
        _logger = new WorkloadLogger(_definition.Mode is "Enabled" or "FactoryEnabled");
        _plainRequirements = _definition.Outcome == "Success"
            ? []
            : Enumerable.Range(0, _definition.Outcome == "Unmet" ? _definition.Count : 1)
                .Select(index => new WorkloadRequirement(new string((char)('a' + index % 26), _definition.Length))).ToArray();
        _requirements = _definition.Outcome == "Success"
            ? [new AssertionRequirement(_ => true)]
            : _definition.Partial
                ? _plainRequirements.Concat(_plainRequirements.Take(3)).ToArray()
                : _plainRequirements;
        var satisfied = _definition.Partial
            ? _plainRequirements.Where((_, index) => index % 2 == 0).ToArray()
            : [];
        _expectedFailed = _definition.Outcome != "Unmet" ? [] :
            _definition.Partial ? _plainRequirements.Where((_, index) => index % 2 != 0).ToArray() : _plainRequirements;
        _handler = new WorkloadHandler(_definition, satisfied);
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

    public Task<AuthorizationResult> ExecuteAsync()
    {
        _logger.Reset();
        _handler.Invocations = 0;

        return _definition.Named
            ? _service.AuthorizeAsync(_user, _resource, "benchmark")
            : _service.AuthorizeAsync(_user, _resource, _requirements);
    }

    public async Task<RequirementsReceipt> CaptureAsync(bool printDiagnostics = false)
    {
        _logger.Capture = true;
        foreach (var requirement in _plainRequirements)
        {
            requirement.Capture = true;
            requirement.ToStringCalls = 0;
        }
        var result = await ExecuteAsync();
        if (_handler.Invocations != 1 || !ReferenceEquals(_handler.Context.User, _user) || !ReferenceEquals(_handler.Context.Resource, _resource))
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
        else if (result.Succeeded || result.Failure is null || result.Failure.FailCalled != (_definition.Outcome == "Fail"))
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
        if (!failedRequirements.SequenceEqual(_expectedFailed, ReferenceEqualityComparer.Instance))
        {
            throw new InvalidOperationException("Actual pending-requirement identity/order differs.");
        }
        var logs = _logger.Entries.ToArray();
        var expectedLevel = _definition.Outcome == "Success" ? LogLevel.Debug : LogLevel.Information;
        var shouldLog = _definition.Mode != "Null" &&
            (expectedLevel == LogLevel.Information ? _logger.InformationEnabled : _definition.Mode != "FactoryFiltered");
        if (_logger.LogCount != (shouldLog ? 1 : 0) || logs.Length != _logger.LogCount)
        {
            throw new InvalidOperationException("Actual emitted log count differs.");
        }
        if (shouldLog)
        {
            var reasonText = _definition.Outcome == "Unmet"
                ? "These requirements were not met:" + Environment.NewLine +
                    string.Join(Environment.NewLine, _expectedFailed.Cast<WorkloadRequirement>().Select(requirement => requirement.Text))
                : reasons.Length == 0
                    ? "Fail() was explicitly called."
                    : "Fail() was explicitly called. Authorization failed due to:" + Environment.NewLine +
                        string.Join(Environment.NewLine, reasons.Select(reason => reason.Message));
            var expectedText = _definition.Outcome == "Success" ? "Authorization was successful." : "Authorization failed. " + reasonText;
            if (logs[0].Level != expectedLevel || logs[0].Id != (_definition.Outcome == "Success" ? 1 : 2) ||
                logs[0].Name != (_definition.Outcome == "Success" ? "UserAuthorizationSucceeded" : "UserAuthorizationFailed") ||
                logs[0].Text != expectedText || logs[0].ExceptionType is not null)
            {
                throw new InvalidOperationException("Actual event, level or formatted output differs.");
            }
            var expectedFields = _definition.Outcome == "Success"
                ? new[] { new LogField("{OriginalFormat}", "Authorization was successful.") }
                : [new LogField("Reason", reasonText), new LogField("{OriginalFormat}", "Authorization failed. {Reason}")];
            if (!logs[0].Fields.SequenceEqual(expectedFields))
            {
                throw new InvalidOperationException("Actual structured fields differ.");
            }
        }
        if (printDiagnostics)
        {
            Console.WriteLine("AUTOPERF_DIAGNOSTIC " + JsonSerializer.Serialize(new
            {
                Case = _definition.Name,
                _definition.Mode,
                _definition.Outcome,
                ActualPendingCount = failedRequirements.Length,
                OriginalUniqueRequirements = _plainRequirements.Length,
                ActualToStringCalls = _plainRequirements.Select(requirement => requirement.ToStringCalls).ToArray(),
                PendingIndices = failedRequirements.Select(requirement => Array.IndexOf(_plainRequirements, requirement)).ToArray()
            }));
        }

        return new(_definition.Name, _definition.Mode, _definition.Outcome, _definition.Named, _definition.Partial,
            _service.GetType().FullName!, _actualLogger.GetType().FullName!, _logger.Category, _requirements.Length,
            _plainRequirements.Length, result.Succeeded, result.Failure?.FailCalled ?? false,
            reasons.Select(reason => reason.Message).ToArray(),
            failedRequirements.Select(requirement => Array.IndexOf(_plainRequirements, requirement)).ToArray(),
            failedRequirements.Cast<WorkloadRequirement>().Select(requirement => requirement.Text).ToArray(), logs);
    }

    public async Task VerifyTwiceAsync(RequirementsReceipt original)
    {
        for (var repeat = 0; repeat < 2; repeat++)
        {
            var actual = await CaptureAsync(printDiagnostics: true);
            if (JsonSerializer.Serialize(actual, JsonOptions) != JsonSerializer.Serialize(original, JsonOptions))
            {
                throw new InvalidOperationException("Actual complete workload differs from original oracle: " + _definition.Name);
            }
        }
        _logger.Capture = false;
        _logger.Reset();
        foreach (var requirement in _plainRequirements)
        {
            requirement.Capture = false;
        }
    }

    public async Task InitializeAsync()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (!File.Exists(Path.Combine(directory.FullName, "contract-oracles.json")))
        {
            directory = directory.Parent ?? throw new InvalidOperationException("Missing original contracts.");
        }
        var oracles = JsonSerializer.Deserialize<RequirementsReceipt[]>(File.ReadAllText(Path.Combine(directory.FullName, "contract-oracles.json")), JsonOptions)
            ?? throw new InvalidOperationException("Empty original contracts.");
        await VerifyTwiceAsync(oracles.Single(receipt => receipt.Case == _definition.Name));
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(oracles.Single(receipt => receipt.Case == _definition.Name)));
    }

    public void Dispose() => _provider.Dispose();

    private sealed class WorkloadRequirement(string text) : IAuthorizationRequirement
    {
        public string Text => text;
        public bool Capture { get; set; }
        public int ToStringCalls { get; set; }

        public override string ToString()
        {
            if (Capture)
            {
                ToStringCalls++;
            }

            return text;
        }
    }

    private sealed class WorkloadHandler : IAuthorizationHandler
    {
        private readonly RequirementsCase _definition;
        private readonly IAuthorizationRequirement[] _satisfied;
        public AuthorizationFailureReason[] Reasons { get; }
        public int Invocations { get; set; }
        public AuthorizationHandlerContext Context { get; private set; } = null!;

        public WorkloadHandler(RequirementsCase definition, IAuthorizationRequirement[] satisfied)
        {
            _definition = definition;
            _satisfied = satisfied;
            Reasons = definition.Outcome == "Fail"
                ? Enumerable.Range(0, definition.Count).Select(index =>
                    new AuthorizationFailureReason(this, new string((char)('a' + index % 26), definition.Length))).ToArray()
                : [];
        }

        public Task HandleAsync(AuthorizationHandlerContext context)
        {
            Invocations++;
            Context = context;
            foreach (var requirement in _satisfied)
            {
                context.Succeed(requirement);
            }
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

public sealed record RequirementsCase(string Name, string Mode, string Outcome, int Count, int Length, bool Named = false, bool Partial = false);
public sealed record LogField(string Key, string? Value);
public sealed record LogReceipt(LogLevel Level, int Id, string? Name, string Text, string? ExceptionType, LogField[] Fields);
public sealed record RequirementsReceipt(string Case, string Mode, string Outcome, bool Named, bool Partial, string ServiceType,
    string LoggerType, string? FactoryCategory, int SubmittedRequirements, int OriginalUniqueRequirements, bool Succeeded,
    bool FailCalled, string[] Reasons, int[] PendingIndices, string[] FailedRequirements, LogReceipt[] Logs);
