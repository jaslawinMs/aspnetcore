using System.Runtime.ExceptionServices;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal sealed record FixtureUser(string Id, string Stamp);
internal sealed record TokenCase(string Label, string? Token, string UserId, string Stamp, bool SupportsStamp,
    string Purpose, bool LogEnabled, long LifespanTicks, bool ExpectedResult, int? ProviderEvent,
    int IdCalls, int StampCalls, int UnprotectCalls, bool MalformedBase64, int ReaderFormatExceptions, string Origin);
internal sealed record LogEntry(int Level, int Id, string? Name, string Message,
    KeyValuePair<string, string?>[] Fields, string? ExceptionType);

internal sealed class Workload : IDisposable
{
    private readonly ServiceProvider _services;
    private readonly UserManager<FixtureUser> _manager;
    private readonly FixtureUser _user;
    private readonly CountingStore _store;
    private readonly CountingProtector _protector;
    private readonly RecordingLogger<DataProtectorTokenProvider<FixtureUser>> _providerLogger;
    private readonly RecordingLogger<UserManager<FixtureUser>> _managerLogger;
    internal TokenCase Input { get; }
    internal string ActualProtectorType => _protector.InnerType;

    internal Workload(TokenCase input, string fixtureDirectory, bool allowKeyGeneration = false)
    {
        Input = input;
        var keys = new DirectoryInfo(Path.Combine(fixtureDirectory, "keys"));
        Evidence.Require(allowKeyGeneration || (keys.Exists && keys.GetFiles("*.xml").Length > 0),
            "The paired synthetic fixture's isolated existing keys are required.");
        var services = new ServiceCollection();
        var builder = services.AddDataProtection().PersistKeysToFileSystem(keys)
            .SetApplicationName(TokenFixture.ApplicationName);
        if (!allowKeyGeneration)
        {
            builder.DisableAutomaticKeyGeneration();
        }
        _services = services.BuildServiceProvider(validateScopes: true);
        var inner = _services.GetRequiredService<IDataProtectionProvider>();
        _protector = new CountingProtector(inner.CreateProtector(TokenFixture.ProtectorName));
        _providerLogger = new() { Enabled = input.LogEnabled };
        _managerLogger = new() { Enabled = input.LogEnabled };
        _store = input.SupportsStamp ? new StampStore() : new CountingStore();
        _user = new FixtureUser(input.UserId, input.Stamp);
        _manager = new UserManager<FixtureUser>(_store, Options.Create(new IdentityOptions()),
            new PasswordHasher<FixtureUser>(), [], [], new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(), _services, _managerLogger);
        var provider = new DataProtectorTokenProvider<FixtureUser>(new SingleProtectorProvider(_protector),
            Options.Create(new DataProtectionTokenProviderOptions
            {
                Name = TokenFixture.ProtectorName,
                TokenLifespan = TimeSpan.FromTicks(input.LifespanTicks)
            }), _providerLogger);
        _manager.RegisterTokenProvider(TokenFixture.ProviderName, provider);
        Evidence.Require(_manager.SupportsUserSecurityStamp == input.SupportsStamp,
            "The real public store capability differs from the declared input.");
    }

    internal Task<bool> Run() =>
        _manager.VerifyUserTokenAsync(_user, TokenFixture.ProviderName, Input.Purpose, Input.Token!);

    internal string Generate() => _manager.GenerateUserTokenAsync(_user, TokenFixture.ProviderName, Input.Purpose)
        .GetAwaiter().GetResult();

    internal byte[] UnprotectForFixture(string token) => _protector.Unprotect(Convert.FromBase64String(token));
    internal string ProtectForFixture(byte[] payload) => Convert.ToBase64String(_protector.Protect(payload));

    internal object Capture()
    {
        var configured = CapturePass(Input.LogEnabled, "configured");
        var enabled = CapturePass(enabled: true, "enabled");
        _providerLogger.Enabled = Input.LogEnabled;
        _managerLogger.Enabled = Input.LogEnabled;
        _providerLogger.CaptureDetails = false;
        _managerLogger.CaptureDetails = false;

        return new
        {
            Input.Label, configured, enabled,
            actualProtectorType = ActualProtectorType,
            actualManagerType = _manager.GetType().FullName,
            actualStoreType = _store.GetType().FullName,
            publicProviderName = TokenFixture.ProviderName,
            completeRunsCheckedOutsideTiming = 2,
            noFirstChanceListenerOrLogFormattingInsideBenchmark = true
        };
    }

    private object CapturePass(bool enabled, string passName)
    {
        _providerLogger.Reset(enabled);
        _managerLogger.Reset(enabled);
        _store.IdCalls = 0;
        _store.StampCalls = 0;
        _protector.UnprotectCalls = 0;
        var exceptions = new List<object>();
        var formatExceptions = 0;
        var callerThread = Environment.CurrentManagedThreadId;
        void Observe(object? sender, FirstChanceExceptionEventArgs args)
        {
            if (Environment.CurrentManagedThreadId == callerThread)
            {
                if (args.Exception is FormatException)
                {
                    formatExceptions++;
                }
                exceptions.Add(new
                {
                    type = args.Exception.GetType().FullName,
                    targetType = args.Exception.TargetSite?.DeclaringType?.FullName,
                    targetMethod = args.Exception.TargetSite?.Name,
                    thread = Environment.CurrentManagedThreadId
                });
            }
        }
        bool result;
        AppDomain.CurrentDomain.FirstChanceException += Observe;
        try
        {
            result = Run().GetAwaiter().GetResult();
        }
        finally
        {
            AppDomain.CurrentDomain.FirstChanceException -= Observe;
        }
        var expectedFormatExceptions = Input.ReaderFormatExceptions +
            (Input.MalformedBase64 && !Evidence.IsCandidate ? 1 : 0);
        var observation = new
        {
            result, expectedResult = Input.ExpectedResult, enabled, callerThread,
            actualIdCalls = _store.IdCalls, actualStampCalls = _store.StampCalls,
            actualUnprotectCalls = _protector.UnprotectCalls,
            formatExceptions, expectedFormatExceptions, firstChanceExceptions = exceptions,
            providerIsEnabledCalls = _providerLogger.IsEnabledCalls,
            managerIsEnabledCalls = _managerLogger.IsEnabledCalls,
            providerLogs = _providerLogger.Entries.ToArray(), managerLogs = _managerLogger.Entries.ToArray()
        };
        Evidence.Write("observed-" + Input.Label + "-" + passName, observation);
        Evidence.Require(result == Input.ExpectedResult && _store.IdCalls == Input.IdCalls &&
            _store.StampCalls == Input.StampCalls && _protector.UnprotectCalls == Input.UnprotectCalls &&
            formatExceptions == expectedFormatExceptions, "Actual producer/return/store/protector/exception contract differs:" + Input.Label);
        VerifyLogs(enabled);

        return new { observation, allExactContractsPassed = true };
    }

    private void VerifyLogs(bool enabled)
    {
        var providerExpected = enabled && Input.ProviderEvent.HasValue ? 1 : 0;
        Evidence.Require(_providerLogger.Entries.Count == providerExpected, "Actual provider log count differs:" + Input.Label);
        if (providerExpected == 1)
        {
            var (name, template) = Input.ProviderEvent switch
            {
                0 => ("InvalidExpirationTime", "ValidateAsync failed: the expiration time is invalid."),
                1 => ("UserIdsNotEquals", "ValidateAsync failed: did not find expected UserId."),
                2 => ("PurposeNotEquals", "ValidateAsync failed: did not find expected purpose. '{ActualPurpose}' does not match the expected purpose '{ExpectedPurpose}'."),
                3 => ("UnexpectedEndOfInput", "ValidateAsync failed: unexpected end of input."),
                4 => ("SecurityStampNotEquals", "ValidateAsync failed: did not find expected security stamp."),
                5 => ("SecurityStampIsNotEmpty", "ValidateAsync failed: the expected stamp is not empty."),
                6 => ("UnhandledException", "ValidateAsync failed: unhandled exception was thrown."),
                _ => throw new InvalidOperationException("Unknown source-defined expected provider event.")
            };
            var entry = _providerLogger.Entries[0];
            var expectedMessage = Input.ProviderEvent == 2
                ? $"ValidateAsync failed: did not find expected purpose. '{Input.Purpose}' does not match the expected purpose '{TokenFixture.Purpose}'."
                : template;
            var expectedFields = new List<KeyValuePair<string, string?>>();
            if (Input.ProviderEvent == 2)
            {
                expectedFields.Add(new("ActualPurpose", Input.Purpose));
                expectedFields.Add(new("ExpectedPurpose", TokenFixture.Purpose));
            }
            expectedFields.Add(new("{OriginalFormat}", template));
            Evidence.Require(entry.Level == (int)LogLevel.Debug && entry.Id == Input.ProviderEvent &&
                entry.Name == name && entry.Message == expectedMessage && entry.ExceptionType is null &&
                entry.Fields.SequenceEqual(expectedFields), "Exact source-defined provider log event/message/fields differ:" + Input.Label);
        }
        var managerExpected = enabled && !Input.ExpectedResult ? 1 : 0;
        Evidence.Require(_managerLogger.Entries.Count == managerExpected, "Actual public manager log count differs:" + Input.Label);
        if (managerExpected == 1)
        {
            var entry = _managerLogger.Entries[0];
            KeyValuePair<string, string?>[] fields =
            [
                new("purpose", Input.Purpose),
                new("{OriginalFormat}", "VerifyUserTokenAsync() failed with purpose: {purpose} for user.")
            ];
            Evidence.Require(entry.Level == (int)LogLevel.Debug && entry.Id == 9 &&
                entry.Name == "VerifyUserTokenFailed" && entry.ExceptionType is null &&
                entry.Message == $"VerifyUserTokenAsync() failed with purpose: {Input.Purpose} for user." &&
                entry.Fields.SequenceEqual(fields), "Exact source-defined public manager log contract differs:" + Input.Label);
        }
    }

    public void Dispose()
    {
        _manager.Dispose();
        _services.Dispose();
    }

    private class CountingStore : IUserStore<FixtureUser>
    {
        internal int IdCalls;
        internal int StampCalls;
        public Task<string> GetUserIdAsync(FixtureUser user, CancellationToken cancellationToken)
        {
            IdCalls++;

            return Task.FromResult(user.Id);
        }
        public Task<string?> GetUserNameAsync(FixtureUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task SetUserNameAsync(FixtureUser user, string? userName, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<string?> GetNormalizedUserNameAsync(FixtureUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task SetNormalizedUserNameAsync(FixtureUser user, string? normalizedName, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<IdentityResult> CreateAsync(FixtureUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<IdentityResult> UpdateAsync(FixtureUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<IdentityResult> DeleteAsync(FixtureUser user, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<FixtureUser?> FindByIdAsync(string userId, CancellationToken cancellationToken) => throw new NotSupportedException();
        public Task<FixtureUser?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken) => throw new NotSupportedException();
        public void Dispose()
        {
        }
    }

    private sealed class StampStore : CountingStore, IUserSecurityStampStore<FixtureUser>
    {
        public Task<string?> GetSecurityStampAsync(FixtureUser user, CancellationToken cancellationToken)
        {
            StampCalls++;

            return Task.FromResult<string?>(user.Stamp);
        }
        public Task SetSecurityStampAsync(FixtureUser user, string stamp, CancellationToken cancellationToken) => throw new NotSupportedException();
    }

    private sealed class SingleProtectorProvider(CountingProtector protector) : IDataProtectionProvider
    {
        public IDataProtector CreateProtector(string purpose)
        {
            Evidence.Require(purpose == TokenFixture.ProtectorName, "The actual provider purpose differs.");

            return protector;
        }
    }

    private sealed class CountingProtector(IDataProtector inner) : IDataProtector
    {
        internal int UnprotectCalls;
        internal string InnerType => inner.GetType().FullName ?? throw new InvalidOperationException("Unnamed actual protector.");
        public IDataProtector CreateProtector(string purpose) => new CountingProtector(inner.CreateProtector(purpose));
        public byte[] Protect(byte[] plaintext) => inner.Protect(plaintext);
        public byte[] Unprotect(byte[] protectedData)
        {
            UnprotectCalls++;

            return inner.Unprotect(protectedData);
        }
    }

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        internal bool Enabled;
        internal bool CaptureDetails;
        internal int IsEnabledCalls;
        internal List<LogEntry> Entries { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel)
        {
            IsEnabledCalls++;

            return Enabled && logLevel == LogLevel.Debug;
        }
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (CaptureDetails)
            {
                var fields = state is IEnumerable<KeyValuePair<string, object?>> values
                    ? values.Select(p => new KeyValuePair<string, string?>(p.Key, p.Value?.ToString())).ToArray()
                    : throw new InvalidOperationException("The actual log state lost its structured fields.");
                Entries.Add(new((int)logLevel, eventId.Id, eventId.Name, formatter(state, exception), fields,
                    exception?.GetType().FullName));
            }
        }
        internal void Reset(bool enabled)
        {
            Enabled = enabled;
            CaptureDetails = true;
            IsEnabledCalls = 0;
            Entries.Clear();
        }
    }
}
