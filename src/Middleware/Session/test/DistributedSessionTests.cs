// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Moq;

namespace Microsoft.AspNetCore.Session;

public class DistributedSessionTests
{
    [Fact]
    public async Task LoadAsync_InfiniteTimeoutAvoidsTimerAllocation()
    {
        var cache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var seed = CreateSession(cache, TimeSpan.FromMinutes(1));
        seed.SetInt32("value", 42);
        await seed.CommitAsync();

        await MeasureLoadAllocations(cache, Timeout.InfiniteTimeSpan);
        await MeasureLoadAllocations(cache, TimeSpan.FromMinutes(1));
        var infiniteAllocation = await MeasureLoadAllocations(cache, Timeout.InfiniteTimeSpan);
        var finiteAllocation = await MeasureLoadAllocations(cache, TimeSpan.FromMinutes(1));

        Assert.True(infiniteAllocation < finiteAllocation,
            $"Infinite timeout allocation must be below finite timeout allocation. Infinite:{infiniteAllocation};finite:{finiteAllocation}.");
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LoadAsync_InfiniteTimeoutPreservesCallerCancellation(bool canceledBeforeLoad)
    {
        var backing = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var entered = new TaskCompletionSource<CancellationToken>(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var cache = new Mock<IDistributedCache>(MockBehavior.Strict);
        cache.Setup(cacheInstance => cacheInstance.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(async (string key, CancellationToken token) =>
            {
                entered.TrySetResult(token);
                await release.Task.WaitAsync(token);
                return await backing.GetAsync(key, token);
            });
        var sink = new TestSink();
        using var loggerFactory = new TestLoggerFactory(sink, enabled: true);
        var session = new DistributedSession(cache.Object, "session", TimeSpan.FromMinutes(20),
            Timeout.InfiniteTimeSpan, static () => true, loggerFactory, isNewSessionKey: true);
        using var caller = new CancellationTokenSource();
        if (canceledBeforeLoad)
        {
            caller.Cancel();
        }

        var load = session.LoadAsync(caller.Token);
        if (!canceledBeforeLoad)
        {
            var token = await entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            Assert.True(token.CanBeCanceled);
            Assert.NotEqual(caller.Token, token);
            Assert.False(load.IsCompleted);
            caller.Cancel();
        }

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => load.WaitAsync(TimeSpan.FromSeconds(10)));
        cache.Verify(cacheInstance => cacheInstance.GetAsync("session", It.IsAny<CancellationToken>()),
            Times.Exactly(canceledBeforeLoad ? 0 : 1));
        Assert.Empty(sink.Writes);

        release.SetResult();
        await session.LoadAsync();
        Assert.True(session.IsAvailable);
        cache.Verify(cacheInstance => cacheInstance.GetAsync("session", It.IsAny<CancellationToken>()),
            Times.Exactly(canceledBeforeLoad ? 1 : 2));
    }

    [Fact]
    public async Task LoadAsync_InfiniteTimeoutPreservesOwnedTokenLifetime()
    {
        var backing = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var seed = CreateSession(backing, TimeSpan.FromMinutes(1));
        seed.SetInt32("value", 42);
        await seed.CommitAsync();
        var tokens = new List<CancellationToken>();
        var cache = new Mock<IDistributedCache>(MockBehavior.Strict);
        cache.Setup(cacheInstance => cacheInstance.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns((string key, CancellationToken token) =>
            {
                tokens.Add(token);
                return backing.GetAsync(key, token);
            });
        using var caller = new CancellationTokenSource();
        var first = CreateSession(cache.Object, Timeout.InfiniteTimeSpan);
        await first.LoadAsync(caller.Token);
        using var canceled = new CancellationTokenSource();
        canceled.Cancel();
        await first.LoadAsync(canceled.Token);
        var second = CreateSession(cache.Object, Timeout.InfiniteTimeSpan);
        await second.LoadAsync(caller.Token);

        Assert.Equal(42, first.GetInt32("value"));
        Assert.Equal(42, second.GetInt32("value"));
        Assert.Equal(2, tokens.Count);
        Assert.NotEqual(tokens[0], tokens[1]);
        Assert.All(tokens, token =>
        {
            Assert.True(token.CanBeCanceled);
            Assert.NotEqual(caller.Token, token);
        });

        caller.Cancel();
        Assert.All(tokens, token => Assert.False(token.IsCancellationRequested));
    }

    private static DistributedSession CreateSession(IDistributedCache cache, TimeSpan ioTimeout)
    {
        return new DistributedSession(cache, "session", TimeSpan.FromMinutes(20), ioTimeout,
            static () => true, NullLoggerFactory.Instance, isNewSessionKey: true);
    }

    private static async Task<long> MeasureLoadAllocations(IDistributedCache cache, TimeSpan ioTimeout)
    {
        var thread = Environment.CurrentManagedThreadId;
        var before = GC.GetAllocatedBytesForCurrentThread();
        for (var index = 0; index < 64; index++)
        {
            var session = CreateSession(cache, ioTimeout);
            var load = session.LoadAsync();
            if (!load.IsCompletedSuccessfully)
            {
                throw new InvalidOperationException("The real distributed-memory cache must complete synchronously for this thread-local allocation check.");
            }
            await load;
            Assert.Equal(42, session.GetInt32("value"));
        }
        var allocation = GC.GetAllocatedBytesForCurrentThread() - before;
        Assert.Equal(thread, Environment.CurrentManagedThreadId);

        return allocation;
    }
}
