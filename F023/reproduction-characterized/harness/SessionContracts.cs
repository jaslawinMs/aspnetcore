using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Session;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal static class SessionContracts
{
    public const int Count = 10;

    public static async Task RunAsync()
    {
        var records = 0;
        void Record(string name, object observation)
        {
            Evidence.Write("producer-contract", new { name, observation, actualOwningProducerExercised = true });
            records++;
        }

        var pendingCache = new GatedCache();
        var pendingSession = Create(pendingCache, Timeout.InfiniteTimeSpan);
        var pending = pendingSession.LoadAsync();
        var pendingToken = await pendingCache.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        Evidence.Require(!pending.IsCompleted && pendingToken.CanBeCanceled && !pendingToken.IsCancellationRequested,
            "The actual infinite-timeout cache operation did not become pending with an owned live token.");
        pendingCache.Release();
        await pending.WaitAsync(TimeSpan.FromSeconds(10));
        Evidence.Require(pendingSession.GetInt32("value") == 42 && pendingCache.GetCalls == 1, "The released actual cache payload was not loaded.");
        Record("Infinite.Pending.Success", new { pendingCache.GetCalls, observed = pendingSession.GetInt32("value") });

        foreach (var timeout in new[] { TimeSpan.FromSeconds(2), TimeSpan.Zero })
        {
            var cache = new GatedCache();
            using var logger = new RecordingLoggerFactory();
            var session = Create(cache, timeout, logger);
            var operation = session.LoadAsync();
            if (timeout != TimeSpan.Zero)
            {
                var token = await cache.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
                Evidence.Require(token.CanBeCanceled && !operation.IsCompleted,
                    "The finite-timeout contract must include a real pending cache operation before cancellation.");
            }
            var error = await ExpectCancellation(operation);
            Evidence.Require(error.Message == "Timed out loading the session." && error.InnerException is OperationCanceledException &&
                error.CancellationToken.IsCancellationRequested, "Actual timeout exception enrichment differs.");
            Evidence.Require(cache.GetCalls is 0 or 1 && (timeout == TimeSpan.Zero || cache.GetCalls == 1),
                "Actual zero/positive timeout cache entry differs.");
            Evidence.Require(cache.Tokens.All(token => token.IsCancellationRequested), "The underlying pending cache was not canceled.");
            Evidence.Require(logger.Rows.Count == 1 && logger.Rows[0].level == LogLevel.Warning &&
                logger.Rows[0].message == "Loading the session timed out.", "Actual timeout warning differs.");
            Record(timeout == TimeSpan.Zero ? "Zero.Pending.Timeout" : "Finite.Pending.Timeout",
                new { cache.GetCalls, error.Message, underlyingTokenCanceled = cache.Tokens.All(token => token.IsCancellationRequested), warnings = logger.Rows.Count });
        }

        foreach (var beforeEntry in new[] { true, false })
        {
            var cache = new GatedCache();
            using var logger = new RecordingLoggerFactory();
            using var caller = new CancellationTokenSource();
            var session = Create(cache, Timeout.InfiniteTimeSpan, logger);
            if (beforeEntry)
            {
                caller.Cancel();
            }
            var operation = session.LoadAsync(caller.Token);
            if (!beforeEntry)
            {
                var token = await cache.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
                Evidence.Require(!operation.IsCompleted && token != caller.Token && token.CanBeCanceled,
                    "The actual caller-linked infinite-timeout operation did not become pending.");
                caller.Cancel();
            }
            var error = await ExpectCancellation(operation);
            Evidence.Require(error.Message != "Timed out loading the session." && logger.Rows.Count == 0 &&
                cache.GetCalls == (beforeEntry ? 0 : 1), "Caller cancellation was converted into a timeout or changed cache entry.");
            cache.Release();
            await session.LoadAsync().WaitAsync(TimeSpan.FromSeconds(10));
            Evidence.Require(session.GetInt32("value") == 42 && cache.GetCalls == (beforeEntry ? 1 : 2),
                "Actual caller-canceled load did not remain retryable.");
            Record(beforeEntry ? "Infinite.Caller.BeforeEntry" : "Infinite.Caller.Pending",
                new { cache.GetCalls, retryValue = session.GetInt32("value"), warnings = logger.Rows.Count });
        }

        var faultCache = new GatedCache { Failure = new InvalidOperationException("CACHE_READ_FAILED") };
        faultCache.Release();
        var faultSession = Create(faultCache, Timeout.InfiniteTimeSpan);
        try
        {
            await faultSession.LoadAsync();
            throw new InvalidOperationException("An actual cache failure was hidden.");
        }
        catch (InvalidOperationException exception) when (ReferenceEquals(exception, faultCache.Failure))
        {
            Evidence.Require(faultCache.GetCalls == 1, "The cache failure producer did not run exactly once.");
        }
        faultCache.Failure = null;
        await faultSession.LoadAsync();
        Evidence.Require(faultSession.GetInt32("value") == 42 && faultCache.GetCalls == 2, "Actual cache failure did not remain retryable.");
        Record("Infinite.Cache.Fault.Retry", new { faultCache.GetCalls, observed = faultSession.GetInt32("value") });

        foreach (var timeout in new[] { TimeSpan.FromMilliseconds(-2), TimeSpan.MaxValue })
        {
            var cache = new GatedCache();
            using var logger = new RecordingLoggerFactory();
            var session = Create(cache, timeout, logger);
            string parameter;
            try
            {
                await session.LoadAsync();
                throw new InvalidOperationException("An invalid timeout was silently accepted.");
            }
            catch (ArgumentOutOfRangeException exception)
            {
                parameter = exception.ParamName ?? throw new InvalidOperationException("The actual BCL validation parameter is absent.");
            }
            Evidence.Require(cache.GetCalls == 0 && logger.Rows.Count == 0, "Invalid timeout reached the cache or produced a timeout warning.");
            Record(timeout == TimeSpan.MaxValue ? "Invalid.TooLarge" : "Invalid.Negative",
                new { timeoutTicks = timeout.Ticks, parameter, cache.GetCalls });
        }

        var retainedCache = new GatedCache();
        retainedCache.Release();
        using var retainedCaller = new CancellationTokenSource();
        var first = Create(retainedCache, Timeout.InfiniteTimeSpan);
        var second = Create(retainedCache, Timeout.InfiniteTimeSpan);
        await first.LoadAsync(retainedCaller.Token);
        await second.LoadAsync(retainedCaller.Token);
        Evidence.Require(retainedCache.Tokens.Count == 2 && retainedCache.Tokens[0] != retainedCache.Tokens[1] &&
            retainedCache.Tokens.All(token => token.CanBeCanceled && token != retainedCaller.Token), "Owned per-load token identity differs.");
        retainedCaller.Cancel();
        Evidence.Require(retainedCache.Tokens.All(token => !token.IsCancellationRequested), "Completed load retained its caller registration.");
        Record("Infinite.Owned.Source.Lifetime", new { distinctOwnedTokens = true, actualCompletedTokens = retainedCache.Tokens.Count, unregisteredAfterCompletion = true });

        await first.LoadAsync(retainedCaller.Token);
        Evidence.Require(retainedCache.GetCalls == 2 && first.GetInt32("value") == 42,
            "Already-loaded behavior changed under an already-canceled caller.");
        Record("Loaded.Canceled.Caller.NoOp", new { retainedCache.GetCalls, observed = first.GetInt32("value") });
        Evidence.Require(records == Count, "Every declared additional producer contract must actually execute.");
    }

    private static DistributedSession Create(IDistributedCache cache, TimeSpan timeout, ILoggerFactory? logger = null)
    {
        return new DistributedSession(cache, "stored", TimeSpan.FromMinutes(20), timeout, static () => true,
            logger ?? NullLoggerFactory.Instance, isNewSessionKey: true);
    }

    private static async Task<OperationCanceledException> ExpectCancellation(Task operation)
    {
        try
        {
            await operation.WaitAsync(TimeSpan.FromSeconds(10));
        }
        catch (OperationCanceledException exception)
        {
            return exception;
        }

        throw new InvalidOperationException("The actual owning cancellation producer did not cancel its operation.");
    }

    private sealed class GatedCache : IDistributedCache
    {
        private readonly MemoryDistributedCache _inner = new(Options.Create(new MemoryDistributedCacheOptions()));
        private readonly TaskCompletionSource _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<CancellationToken> Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public List<CancellationToken> Tokens { get; } = [];
        public int GetCalls { get; private set; }
        public Exception? Failure { get; set; }

        public GatedCache()
        {
            var seed = Create(_inner, TimeSpan.FromMinutes(1));
            seed.SetInt32("value", 42);
            var commit = seed.CommitAsync();
            Evidence.Require(commit.IsCompletedSuccessfully, "The actual gated-cache seed must commit synchronously.");
            commit.GetAwaiter().GetResult();
        }

        public void Release() => _release.TrySetResult();
        public byte[]? Get(string key) => _inner.Get(key);

        public async Task<byte[]?> GetAsync(string key, CancellationToken token = default)
        {
            GetCalls++;
            Tokens.Add(token);
            Entered.TrySetResult(token);
            await _release.Task.WaitAsync(token);
            if (Failure is { } failure)
            {
                throw failure;
            }

            return await _inner.GetAsync(key, token);
        }

        public void Refresh(string key) => _inner.Refresh(key);
        public Task RefreshAsync(string key, CancellationToken token = default) => _inner.RefreshAsync(key, token);
        public void Remove(string key) => _inner.Remove(key);
        public Task RemoveAsync(string key, CancellationToken token = default) => _inner.RemoveAsync(key, token);
        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) => _inner.Set(key, value, options);
        public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default) => _inner.SetAsync(key, value, options, token);
    }

    private sealed class RecordingLoggerFactory : ILoggerFactory
    {
        public List<(LogLevel level, string message)> Rows { get; } = [];
        public ILogger CreateLogger(string categoryName) => new RecordingLogger(this);
        public void AddProvider(ILoggerProvider provider) => throw new NotSupportedException("This diagnostic logger does not accept providers.");
        public void Dispose() { }

        private sealed class RecordingLogger(RecordingLoggerFactory owner) : ILogger
        {
            public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Warning;
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            {
                if (IsEnabled(logLevel))
                {
                    owner.Rows.Add((logLevel, formatter(state, exception)));
                }
            }
        }
    }
}
