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
        "Load.Infinite.Miss.None",
        "Load.Infinite.Miss.Caller",
        "Load.Infinite.Hit.None",
        "Load.Infinite.Hit.Caller",
        "Load.Default.Miss.None",
        "Load.Default.Hit.Caller",
        "Loaded.Infinite.Hit.None",
        "Loaded.Default.Hit.None",
    ];

    public static readonly string[] FirstObserved = ["Load.Infinite.Hit.None", "Load.Default.Hit.Caller"];
}

internal sealed class SessionFixture : IDisposable
{
    private readonly string _profile;
    private readonly DistributedSessionStore _store;
    private readonly CancellationTokenSource _caller = new();
    private readonly CancellationToken _token;
    private readonly TimeSpan _timeout;
    private readonly string _key;
    private readonly ISession? _retained;
    private readonly int _expected;
    private long _operations;

    public SessionFixture(string profile)
    {
        Evidence.Require(SessionProfiles.All.Contains(profile, StringComparer.Ordinal), "Unknown actual public Session wrapper.");
        _profile = profile;
        var cache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        _store = new DistributedSessionStore(cache, NullLoggerFactory.Instance);
        _timeout = profile.Contains(".Infinite.", StringComparison.Ordinal) ? Timeout.InfiniteTimeSpan : TimeSpan.FromMinutes(1);
        _token = profile.EndsWith(".Caller", StringComparison.Ordinal) ? _caller.Token : CancellationToken.None;
        _key = profile.Contains(".Hit.", StringComparison.Ordinal) ? "stored" : "missing";
        _expected = _key == "stored" ? 42 : -1;
        var seed = _store.Create("stored", TimeSpan.FromMinutes(20), TimeSpan.FromMinutes(1),
            static () => true, isNewSessionKey: true);
        seed.SetInt32("value", 42);
        var commit = seed.CommitAsync();
        Evidence.Require(commit.IsCompletedSuccessfully, "The actual distributed-memory cache seed must commit synchronously.");
        commit.GetAwaiter().GetResult();
        if (profile.StartsWith("Loaded.", StringComparison.Ordinal))
        {
            _retained = Create();
            var load = _retained.LoadAsync();
            Evidence.Require(load.IsCompletedSuccessfully, "The actual retained session must load synchronously during setup.");
            load.GetAwaiter().GetResult();
            Evidence.Require(_retained.GetInt32("value") == 42, "Actual stored payload was not produced and loaded.");
        }
    }

    private ISession Create()
    {
        return _store.Create(_key, TimeSpan.FromMinutes(20), _timeout, static () => true, isNewSessionKey: true);
    }

    public async Task<int> ExerciseAsync()
    {
        var session = _retained ?? Create();
        await session.LoadAsync(_token);
        var value = session.GetInt32("value") ?? (session.IsAvailable ? -1 : -2);
        _operations++;

        return value;
    }

    public void CaptureContract(string phase)
    {
        var operation = ExerciseAsync();
        Evidence.Require(operation.IsCompletedSuccessfully, "This synchronous distributed-memory-cache profile unexpectedly became pending.");
        var observed = operation.GetAwaiter().GetResult();
        Evidence.Require(observed == _expected, "The actual loaded public Session payload differs.");
        Evidence.Write("public-profile-contract", new
        {
            profile = _profile, phase, observed, expected = _expected, actualOwner = nameof(DistributedSession),
            actualProducer = nameof(DistributedSessionStore), actualCache = nameof(MemoryDistributedCache),
            freshSessionConstructedInTimedWrapper = _retained is null,
            actualIoTimeoutTicks = _timeout.Ticks, actualSuppliedCallerCanBeCanceled = _token.CanBeCanceled,
            actualStoredPayloadConsumedInTimedWrapper = true, actualCompletedPublicWrapper = true,
            actualOperationsObserved = _operations,
            boundary = "One real public session creation/load/value-consumer wrapper,or explicitly retained already-loaded control. Not HTTP,middleware commit,remote cache I/O or production frequency.",
        });
    }

    public void Dispose()
    {
        _caller.Dispose();
    }
}
