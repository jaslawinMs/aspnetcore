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
    public const int Count = 24;

    public static async Task RunAsync()
    {
        var names = new HashSet<string>(StringComparer.Ordinal);
        void Record(string name, object observation)
        {
            Evidence.Require(names.Add(name), "Every additional producer contract must have a unique identity.");
            Evidence.Write("producer-contract", new { name, observation, actualOwningProducerExercised = true });
        }

        foreach (var modified in new[] { true, false })
        {
            var branch = modified ? "Set" : "Refresh";
            var target = modified ? CacheOperation.Store : CacheOperation.Refresh;
            var pendingCache = new GatedCache(target);
            var pendingSession = Create(pendingCache, Timeout.InfiniteTimeSpan, modified);
            var pending = pendingSession.CommitAsync();
            var pendingToken = await pendingCache.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            Evidence.Require(!pending.IsCompleted && pendingToken.CanBeCanceled && !pendingToken.IsCancellationRequested,
                "The infinite-timeout real cache operation must be pending with a fresh live owned token.");
            Evidence.Require(pendingCache.SyncGets == (modified ? 1 : 0), "Unloaded refresh unexpectedly loaded the session.");
            pendingCache.Release();
            await pending.WaitAsync(TimeSpan.FromSeconds(10));
            Evidence.Require(pendingCache.TargetCalls == 1 && pendingCache.ReadValue() == (modified ? 42 : 41),
                "The released real cache operation did not preserve the expected persisted value.");
            Record($"Infinite.{branch}.Pending.Success", new { pendingCache.TargetCalls, pendingCache.SyncGets, persisted = pendingCache.ReadValue() });

            foreach (var timeout in new[] { TimeSpan.FromSeconds(2), TimeSpan.Zero })
            {
                var cache = new GatedCache(target);
                using var logger = new RecordingLoggerFactory();
                var session = Create(cache, timeout, modified, logger);
                var operation = session.CommitAsync();
                if (timeout != TimeSpan.Zero)
                {
                    var token = await cache.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
                    Evidence.Require(token.CanBeCanceled && !operation.IsCompleted,
                        "A finite deadline must actually reach the pending cache producer before timer cancellation.");
                }
                var error = await ExpectCancellation(operation);
                var text = modified ? "Timed out committing the session." : "Timed out refreshing the session.";
                var warning = modified ? "Committing the session timed out." : "Refreshing the session timed out.";
                Evidence.Require(error.Message == text && error.InnerException is OperationCanceledException &&
                    error.CancellationToken.IsCancellationRequested, "Actual timeout exception enrichment differs.");
                Evidence.Require(cache.TargetCalls is 0 or 1 && (!modified || timeout != TimeSpan.Zero ? cache.TargetCalls == 1 : true),
                    "Positive or zero-timeout cache-entry behavior differs.");
                Evidence.Require(cache.Tokens.All(row => row.Token.IsCancellationRequested) &&
                    cache.ReadValue() == 41, "Timeout did not cancel its reached cache wait or mutated persisted state.");
                Evidence.Require(logger.Rows.Count == 1 && logger.Rows[0].Level == LogLevel.Warning &&
                    logger.Rows[0].Event == (modified ? 9 : 11) && logger.Rows[0].Message == warning,
                    "Actual commit/refresh timeout warning differs.");
                Record($"{(timeout == TimeSpan.Zero ? "Zero" : "Finite")}.{branch}.Pending.Timeout",
                    new { cache.TargetCalls, error.Message, actualReachedTokenCount = cache.Tokens.Count, warning = logger.Rows[0] });
            }

            foreach (var beforeEntry in new[] { true, false })
            {
                var cache = new GatedCache(target);
                using var logger = new RecordingLoggerFactory();
                using var caller = new CancellationTokenSource();
                var session = Create(cache, Timeout.InfiniteTimeSpan, modified, logger);
                if (beforeEntry)
                {
                    caller.Cancel();
                }
                var operation = session.CommitAsync(caller.Token);
                if (!beforeEntry)
                {
                    var token = await cache.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
                    Evidence.Require(!operation.IsCompleted && token != caller.Token && token.CanBeCanceled,
                        "The actual caller-linked infinite-timeout cache operation did not become pending.");
                    caller.Cancel();
                }
                var error = await ExpectCancellation(operation);
                var expectedCalls = modified && beforeEntry ? 0 : 1;
                Evidence.Require(cache.TargetCalls == expectedCalls && logger.Rows.Count == 0 &&
                    error.Message != "Timed out committing the session." && error.Message != "Timed out refreshing the session." &&
                    error.CancellationToken.IsCancellationRequested && error.CancellationToken != caller.Token &&
                    cache.ReadValue() == 41, "Caller cancellation changed entry,token,warning or persisted state.");
                cache.Release();
                await session.CommitAsync().WaitAsync(TimeSpan.FromSeconds(10));
                Evidence.Require(cache.TargetCalls == expectedCalls + 1 && cache.ReadValue() == (modified ? 42 : 41),
                    "The actual caller-canceled operation did not remain retryable.");
                await session.CommitAsync();
                Evidence.Require(cache.Stores == (modified ? expectedCalls + 1 : 0) &&
                    cache.Refreshes == (modified ? 1 : expectedCalls + 2), "Successful retry did not retain the transition to refresh.");
                Record($"Infinite.{branch}.Caller.{(beforeEntry ? "BeforeEntry" : "Pending")}",
                    new { cache.Stores, cache.Refreshes, persisted = cache.ReadValue(), warnings = logger.Rows.Count });
            }

            var faultCache = new GatedCache(target) { FailureOn = target, Failure = new InvalidOperationException("CACHE_WRITE_OR_REFRESH_FAILED") };
            faultCache.Release();
            var faultSession = Create(faultCache, Timeout.InfiniteTimeSpan, modified);
            try
            {
                await faultSession.CommitAsync();
                throw new InvalidOperationException("An actual cache failure was hidden.");
            }
            catch (InvalidOperationException exception) when (ReferenceEquals(exception, faultCache.Failure))
            {
                Evidence.Require(faultCache.TargetCalls == 1 && faultCache.ReadValue() == 41, "The real cache failure producer or persisted state differs.");
            }
            faultCache.Failure = null;
            await faultSession.CommitAsync();
            Evidence.Require(faultCache.TargetCalls == 2 && faultCache.ReadValue() == (modified ? 42 : 41),
                "Failed commit did not retain retryable modified/refresh state.");
            Record($"Infinite.{branch}.Cache.Fault.Retry", new { faultCache.TargetCalls, persisted = faultCache.ReadValue() });

            foreach (var timeout in new[] { TimeSpan.FromMilliseconds(-2), TimeSpan.MaxValue })
            {
                var cache = new GatedCache(target);
                using var logger = new RecordingLoggerFactory();
                var session = Create(cache, timeout, modified, logger);
                string parameter;
                try
                {
                    await session.CommitAsync();
                    throw new InvalidOperationException("An invalid timeout was silently accepted.");
                }
                catch (ArgumentOutOfRangeException exception)
                {
                    parameter = exception.ParamName ?? throw new InvalidOperationException("Actual BCL validation parameter absent.");
                }
                Evidence.Require(cache.TargetCalls == 0 && cache.Reads == 0 && logger.Rows.Count == 0 && cache.ReadValue() == 41,
                    "Invalid timeout reached async cache I/O,logged timeout or changed persisted state.");
                Record($"Invalid.{branch}.{(timeout == TimeSpan.MaxValue ? "TooLarge" : "Negative")}",
                    new { timeoutTicks = timeout.Ticks, parameter, cache.TargetCalls });
            }

            var lifetimeCache = new GatedCache(target);
            lifetimeCache.Release();
            using var retainedCaller = new CancellationTokenSource();
            for (var index = 0; index < 2; index++)
            {
                await Create(lifetimeCache, Timeout.InfiniteTimeSpan, modified).CommitAsync(retainedCaller.Token);
            }
            Evidence.Require(lifetimeCache.Tokens.Count == 2 && lifetimeCache.Tokens[0].Token != lifetimeCache.Tokens[1].Token &&
                lifetimeCache.Tokens.All(row => row.Token.CanBeCanceled && row.Token != retainedCaller.Token), "Owned per-commit token identity differs.");
            retainedCaller.Cancel();
            Evidence.Require(lifetimeCache.Tokens.All(row => !row.Token.IsCancellationRequested), "Completed commit retained its caller registration.");
            Record($"Infinite.{branch}.Owned.Source.Lifetime", new { distinctOwnedTokens = true, actualCompletedTokens = lifetimeCache.Tokens.Count, unregisteredAfterCompletion = true });

            var stateCache = new GatedCache(target);
            stateCache.Release();
            var stateSession = Create(stateCache, Timeout.InfiniteTimeSpan, modified);
            await stateSession.CommitAsync();
            await stateSession.CommitAsync();
            Evidence.Require(stateCache.Stores == (modified ? 1 : 0) && stateCache.Refreshes == (modified ? 1 : 2) &&
                stateCache.SyncGets == (modified ? 1 : 0) && stateCache.ReadValue() == (modified ? 42 : 41),
                "Successful commit did not transition to refresh,or unloaded refresh introduced a load.");
            Record($"Infinite.{branch}.Success.Then.Refresh", new { stateCache.Stores, stateCache.Refreshes, stateCache.SyncGets, persisted = stateCache.ReadValue() });
        }

        var infoCache = new GatedCache(CacheOperation.Read);
        infoCache.Release();
        using (var logger = new RecordingLoggerFactory(LogLevel.Information))
        using (var caller = new CancellationTokenSource())
        {
            await Create(infoCache, Timeout.InfiniteTimeSpan, modified: true, logger).CommitAsync(caller.Token);
            Evidence.Require(infoCache.Reads == 1 && infoCache.Stores == 1 && infoCache.Tokens.Count == 2 &&
                infoCache.Tokens[0].Token == infoCache.Tokens[1].Token && infoCache.Tokens[0].Token != caller.Token &&
                infoCache.ReadValue() == 42 && logger.Rows.Count == 0, "Information-enabled pre-store read did not share the owned write token.");
            caller.Cancel();
            Evidence.Require(infoCache.Tokens.All(row => !row.Token.IsCancellationRequested), "Information-enabled successful operation retained caller linkage.");
            Record("Infinite.Info.Get.Success", new { infoCache.Reads, infoCache.Stores, sameOwnedToken = true, persisted = infoCache.ReadValue() });
        }

        var infoFault = new GatedCache(CacheOperation.Read) { FailureOn = CacheOperation.Read, Failure = new InvalidOperationException("CACHE_DIAGNOSTIC_READ_FAILED") };
        infoFault.Release();
        using (var logger = new RecordingLoggerFactory(LogLevel.Information))
        {
            await Create(infoFault, Timeout.InfiniteTimeSpan, modified: true, logger).CommitAsync();
            Evidence.Require(infoFault.Reads == 1 && infoFault.Stores == 1 && infoFault.ReadValue() == 42 &&
                logger.Rows.Count == 1 && logger.Rows[0].Event == 6 && logger.Rows[0].Level == LogLevel.Error,
                "Existing best-effort information read failure no longer logs and proceeds to a real store.");
            Record("Infinite.Info.Get.Fault.Then.Store", new { infoFault.Reads, infoFault.Stores, persisted = infoFault.ReadValue(), actualLoggedReadFailure = logger.Rows[0] });
        }

        var infoCallerCache = new GatedCache(CacheOperation.Read);
        using (var logger = new RecordingLoggerFactory(LogLevel.Information))
        using (var caller = new CancellationTokenSource())
        {
            var session = Create(infoCallerCache, Timeout.InfiniteTimeSpan, modified: true, logger);
            var operation = session.CommitAsync(caller.Token);
            var token = await infoCallerCache.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            Evidence.Require(!operation.IsCompleted && token != caller.Token && token.CanBeCanceled, "Information read did not reach a real pending gate.");
            caller.Cancel();
            var error = await ExpectCancellation(operation);
            Evidence.Require(infoCallerCache.Reads == 1 && infoCallerCache.Stores == 0 && logger.Rows.Count == 0 &&
                error.Message != "Timed out committing the session." && infoCallerCache.ReadValue() == 41,
                "Caller cancellation in the information read changed commit state or became a timeout.");
            infoCallerCache.Release();
            await session.CommitAsync();
            Evidence.Require(infoCallerCache.Reads == 2 && infoCallerCache.Stores == 1 && infoCallerCache.ReadValue() == 42, "Information-read caller cancellation lost retryable modified state.");
            Record("Infinite.Info.Get.Caller.Pending", new { infoCallerCache.Reads, infoCallerCache.Stores, persisted = infoCallerCache.ReadValue(), warnings = logger.Rows.Count });
        }

        var infoTimeoutCache = new GatedCache(CacheOperation.Read);
        using (var logger = new RecordingLoggerFactory(LogLevel.Information))
        {
            var session = Create(infoTimeoutCache, TimeSpan.FromSeconds(2), modified: true, logger);
            var operation = session.CommitAsync();
            var token = await infoTimeoutCache.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            Evidence.Require(!operation.IsCompleted && token.CanBeCanceled, "Information-read finite deadline did not reach the pending producer.");
            var error = await ExpectCancellation(operation);
            Evidence.Require(error.Message == "Timed out committing the session." && error.InnerException is OperationCanceledException &&
                token.IsCancellationRequested && infoTimeoutCache.Reads == 1 && infoTimeoutCache.Stores == 0 &&
                logger.Rows.Count == 1 && logger.Rows[0].Event == 9 && logger.Rows[0].Level == LogLevel.Warning &&
                infoTimeoutCache.ReadValue() == 41, "The shared finite budget across diagnostic read and store changed.");
            infoTimeoutCache.Release();
            await session.CommitAsync();
            Evidence.Require(infoTimeoutCache.Reads == 2 && infoTimeoutCache.Stores == 1 && infoTimeoutCache.ReadValue() == 42, "Information-read timeout lost retryable modified state.");
            Record("Finite.Info.Get.Timeout.Then.Retry", new { infoTimeoutCache.Reads, infoTimeoutCache.Stores, persisted = infoTimeoutCache.ReadValue(), actualWarning = logger.Rows[0] });
        }
        Evidence.Require(names.Count == Count, "Every declared additional real producer contract must actually execute.");
    }

    private static DistributedSession Create(IDistributedCache cache, TimeSpan timeout, bool modified, ILoggerFactory? logger = null)
    {
        var session = new DistributedSession(cache, "stored", TimeSpan.FromMinutes(20), timeout, static () => true,
            logger ?? NullLoggerFactory.Instance, isNewSessionKey: true);
        if (modified)
        {
            session.SetInt32("value", 42);
        }

        return session;
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

        throw new InvalidOperationException("The real owning cancellation producer did not cancel its operation.");
    }

    private enum CacheOperation { Read, Store, Refresh }

    private sealed class GatedCache(CacheOperation target) : IDistributedCache
    {
        private readonly MemoryDistributedCache _inner = CreateSeed();
        private readonly TaskCompletionSource _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<CancellationToken> Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public List<(CacheOperation Operation, CancellationToken Token)> Tokens { get; } = [];
        public int SyncGets { get; private set; }
        public int Reads { get; private set; }
        public int Stores { get; private set; }
        public int Refreshes { get; private set; }
        public int TargetCalls => target switch { CacheOperation.Read => Reads, CacheOperation.Store => Stores, _ => Refreshes };
        public CacheOperation? FailureOn { get; init; }
        public InvalidOperationException? Failure { get; set; }

        private static MemoryDistributedCache CreateSeed()
        {
            var inner = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
            var seed = Create(inner, TimeSpan.FromMinutes(1), modified: false);
            seed.SetInt32("value", 41);
            var commit = seed.CommitAsync();
            Evidence.Require(commit.IsCompletedSuccessfully, "The actual diagnostic seed must commit synchronously.");
            commit.GetAwaiter().GetResult();

            return inner;
        }

        public int? ReadValue() => Create(_inner, Timeout.InfiniteTimeSpan, modified: false).GetInt32("value");
        public void Release() => _release.TrySetResult();
        public byte[]? Get(string key)
        {
            SyncGets++;

            return _inner.Get(key);
        }

        private async Task BeforeAsync(CacheOperation operation, CancellationToken token)
        {
            Tokens.Add((operation, token));
            if (operation == target)
            {
                Entered.TrySetResult(token);
                await _release.Task.WaitAsync(token);
            }
            if (FailureOn == operation && Failure is { } failure)
            {
                throw failure;
            }
        }

        public async Task<byte[]?> GetAsync(string key, CancellationToken token = default)
        {
            Reads++;
            await BeforeAsync(CacheOperation.Read, token);

            return await _inner.GetAsync(key, token);
        }

        public async Task RefreshAsync(string key, CancellationToken token = default)
        {
            Refreshes++;
            await BeforeAsync(CacheOperation.Refresh, token);
            await _inner.RefreshAsync(key, token);
        }

        public async Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default)
        {
            Stores++;
            await BeforeAsync(CacheOperation.Store, token);
            await _inner.SetAsync(key, value, options, token);
        }

        public void Refresh(string key) => _inner.Refresh(key);
        public void Remove(string key) => _inner.Remove(key);
        public Task RemoveAsync(string key, CancellationToken token = default) => _inner.RemoveAsync(key, token);
        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) => _inner.Set(key, value, options);
    }

    private sealed record LogRow(LogLevel Level, int Event, string Message);

    private sealed class RecordingLoggerFactory(LogLevel minimum = LogLevel.Warning) : ILoggerFactory
    {
        public List<LogRow> Rows { get; } = [];
        public ILogger CreateLogger(string categoryName) => new RecordingLogger(this, minimum);
        public void AddProvider(ILoggerProvider provider) => throw new NotSupportedException("This diagnostic logger does not accept providers.");
        public void Dispose() { }

        private sealed class RecordingLogger(RecordingLoggerFactory owner, LogLevel minimum) : ILogger
        {
            public bool IsEnabled(LogLevel logLevel) => logLevel >= minimum;
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            {
                if (IsEnabled(logLevel))
                {
                    owner.Rows.Add(new LogRow(logLevel, eventId.Id, formatter(state, exception)));
                }
            }
        }
    }
}
