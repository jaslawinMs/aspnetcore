using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Session;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal static class SessionProfiles
{
    public static readonly string[] All =
    [
        "Commit.Infinite.Set.None",
        "Commit.Infinite.Set.Caller",
        "Commit.Infinite.Refresh.None",
        "Commit.Infinite.Refresh.Caller",
        "Commit.Default.Set.None",
        "Commit.Default.Refresh.Caller",
        "Load.Infinite.Hit.None",
        "Load.Default.Hit.None",
    ];

    public static readonly string[] FirstObserved = ["Commit.Infinite.Set.None", "Commit.Default.Refresh.Caller"];
}

internal sealed class SessionFixture : IDisposable
{
    private readonly string _profile;
    private readonly DistributedSessionStore _store;
    private readonly CancellationTokenSource _caller = new();
    private readonly CancellationToken _token;
    private readonly TimeSpan _timeout;
    private readonly bool _modified;
    private readonly bool _loadControl;
    private long _operations;

    public SessionFixture(string profile)
    {
        Evidence.Require(SessionProfiles.All.Contains(profile, StringComparer.Ordinal), "Unknown actual public Session wrapper.");
        _profile = profile;
        var cache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        _store = new DistributedSessionStore(cache, NullLoggerFactory.Instance);
        _timeout = profile.Contains(".Infinite.", StringComparison.Ordinal) ? Timeout.InfiniteTimeSpan : TimeSpan.FromMinutes(1);
        _token = profile.EndsWith(".Caller", StringComparison.Ordinal) ? _caller.Token : CancellationToken.None;
        _modified = profile.Contains(".Set.", StringComparison.Ordinal);
        _loadControl = profile.StartsWith("Load.", StringComparison.Ordinal);
        var seed = Create(TimeSpan.FromMinutes(1));
        seed.SetInt32("value", _modified ? 41 : 42);
        var commit = seed.CommitAsync();
        Evidence.Require(commit.IsCompletedSuccessfully, "The actual distributed-memory cache seed must commit synchronously.");
        commit.GetAwaiter().GetResult();
    }

    private ISession Create(TimeSpan timeout)
    {
        return _store.Create("stored", TimeSpan.FromMinutes(20), timeout, static () => true, isNewSessionKey: true);
    }

    public async Task<int> ExerciseAsync()
    {
        var session = Create(_timeout);
        if (_loadControl)
        {
            await session.LoadAsync(_token);
        }
        else
        {
            if (_modified)
            {
                session.SetInt32("value", 42);
            }
            await session.CommitAsync(_token);
        }
        var value = session.GetInt32("value") ?? (session.IsAvailable ? -1 : -2);
        _operations++;

        return value;
    }

    public void CaptureContract(string phase)
    {
        var operation = ExerciseAsync();
        Evidence.Require(operation.IsCompletedSuccessfully, "This synchronous distributed-memory-cache profile unexpectedly became pending.");
        var observed = operation.GetAwaiter().GetResult();
        var independentlyPersisted = Create(Timeout.InfiniteTimeSpan).GetInt32("value");
        Evidence.Require(observed == 42 && independentlyPersisted == 42, "Actual public or independently reloaded persisted Session payload differs.");
        Evidence.Write("public-profile-contract", new
        {
            profile = _profile, phase, observed, expected = 42, independentlyPersisted,
            actualOwner = nameof(DistributedSession), actualProducer = nameof(DistributedSessionStore),
            actualCache = nameof(MemoryDistributedCache), freshSessionConstructedInTimedWrapper = true,
            actualIoTimeoutTicks = _timeout.Ticks, actualSuppliedCallerCanBeCanceled = _token.CanBeCanceled,
            actualStoredPayloadConsumedInTimedWrapper = true, actualCompletedPublicWrapper = true,
            actualOperationsObserved = _operations, actualModifiedSetWrapper = _modified, actualUnchangedLoadControl = _loadControl,
            actualPersistedReloadOutsideTimedWrapper = true,
            boundary = "One public create/(sync set when modified)/commit-or-refresh/value-consumer wrapper,or explicit unchanged async-load control. Separate fresh-reader persistence check outside timing. No HTTP,remote I/O or production-frequency claim.",
        });
    }

    public void Dispose()
    {
        _caller.Dispose();
    }
}
