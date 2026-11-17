// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Microsoft.AspNetCore.Session;

public class DistributedSessionCommitTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task CommitAsync_InfiniteTimeoutAvoidsTimerAllocation(bool modified)
    {
        var cache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var seed = CreateSession(cache, TimeSpan.FromMinutes(1));
        seed.SetInt32("value", 42);
        await seed.CommitAsync();

        await MeasureCommitAllocations(cache, Timeout.InfiniteTimeSpan, modified);
        await MeasureCommitAllocations(cache, TimeSpan.FromMinutes(1), modified);
        var infiniteAllocation = await MeasureCommitAllocations(cache, Timeout.InfiniteTimeSpan, modified);
        var finiteAllocation = await MeasureCommitAllocations(cache, TimeSpan.FromMinutes(1), modified);

        Assert.True(infiniteAllocation < finiteAllocation,
            $"Infinite timeout commit allocation must be below finite timeout allocation. Modified:{modified};Infinite:{infiniteAllocation};finite:{finiteAllocation}.");
    }

    [Theory]
    [InlineData(true, true)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(false, false)]
    public async Task CommitAsync_InfiniteTimeoutPreservesCallerCancellation(bool modified, bool canceledBeforeCommit)
    {
        var backing = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var seed = CreateSession(backing, TimeSpan.FromMinutes(1));
        seed.SetInt32("value", 42);
        await seed.CommitAsync();
        var entered = new TaskCompletionSource<CancellationToken>(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var stores = 0;
        var refreshes = 0;
        var cache = new Mock<IDistributedCache>(MockBehavior.Strict);
        cache.Setup(cacheInstance => cacheInstance.Get(It.IsAny<string>()))
            .Returns((string key) => backing.Get(key));
        cache.Setup(cacheInstance => cacheInstance.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()))
            .Returns(async (string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token) =>
            {
                stores++;
                entered.TrySetResult(token);
                await release.Task.WaitAsync(token);
                await backing.SetAsync(key, value, options, token);
            });
        cache.Setup(cacheInstance => cacheInstance.RefreshAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(async (string key, CancellationToken token) =>
            {
                refreshes++;
                entered.TrySetResult(token);
                await release.Task.WaitAsync(token);
                await backing.RefreshAsync(key, token);
            });
        var session = CreateSession(cache.Object, Timeout.InfiniteTimeSpan);
        if (modified)
        {
            session.SetInt32("value", 43);
        }
        using var caller = new CancellationTokenSource();
        if (canceledBeforeCommit)
        {
            caller.Cancel();
        }

        var commit = session.CommitAsync(caller.Token);
        if (!canceledBeforeCommit)
        {
            var token = await entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
            Assert.True(token.CanBeCanceled);
            Assert.NotEqual(caller.Token, token);
            Assert.False(commit.IsCompleted);
            caller.Cancel();
        }

        var exception = await Assert.ThrowsAnyAsync<OperationCanceledException>(() => commit.WaitAsync(TimeSpan.FromSeconds(10)));
        Assert.NotEqual("Timed out committing the session.", exception.Message);
        Assert.NotEqual("Timed out refreshing the session.", exception.Message);
        Assert.True(exception.CancellationToken.IsCancellationRequested);
        Assert.NotEqual(caller.Token, exception.CancellationToken);
        Assert.Equal(modified && !canceledBeforeCommit ? 1 : 0, stores);
        Assert.Equal(modified ? 0 : 1, refreshes);
        Assert.Equal(42, CreateSession(backing, Timeout.InfiniteTimeSpan).GetInt32("value"));

        release.SetResult();
        await session.CommitAsync();
        Assert.Equal(modified ? 43 : 42, CreateSession(backing, Timeout.InfiniteTimeSpan).GetInt32("value"));
        Assert.Equal(modified ? (canceledBeforeCommit ? 1 : 2) : 0, stores);
        Assert.Equal(modified ? 0 : 2, refreshes);

        await session.CommitAsync();
        Assert.Equal(modified ? 1 : 3, refreshes);
        cache.Verify(cacheInstance => cacheInstance.SetAsync("session", It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()),
            Times.Exactly(modified ? (canceledBeforeCommit ? 1 : 2) : 0));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task CommitAsync_InfiniteTimeoutPreservesOwnedTokenLifetime(bool modified)
    {
        var backing = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var seed = CreateSession(backing, TimeSpan.FromMinutes(1));
        seed.SetInt32("value", 42);
        await seed.CommitAsync();
        var tokens = new List<CancellationToken>();
        var cache = new Mock<IDistributedCache>(MockBehavior.Strict);
        cache.Setup(cacheInstance => cacheInstance.Get(It.IsAny<string>()))
            .Returns((string key) => backing.Get(key));
        cache.Setup(cacheInstance => cacheInstance.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()))
            .Returns((string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token) =>
            {
                tokens.Add(token);
                return backing.SetAsync(key, value, options, token);
            });
        cache.Setup(cacheInstance => cacheInstance.RefreshAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns((string key, CancellationToken token) =>
            {
                tokens.Add(token);
                return backing.RefreshAsync(key, token);
            });
        using var caller = new CancellationTokenSource();
        for (var index = 0; index < 2; index++)
        {
            var session = CreateSession(cache.Object, Timeout.InfiniteTimeSpan);
            if (modified)
            {
                session.SetInt32("value", 42);
            }
            await session.CommitAsync(caller.Token);
            Assert.Equal(42, session.GetInt32("value"));
        }

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

    private static async Task<long> MeasureCommitAllocations(IDistributedCache cache, TimeSpan ioTimeout, bool modified)
    {
        var thread = Environment.CurrentManagedThreadId;
        var before = GC.GetAllocatedBytesForCurrentThread();
        for (var index = 0; index < 64; index++)
        {
            var session = CreateSession(cache, ioTimeout);
            if (modified)
            {
                session.SetInt32("value", 42);
            }
            var commit = session.CommitAsync();
            if (!commit.IsCompletedSuccessfully)
            {
                throw new InvalidOperationException("The real distributed-memory cache must complete synchronously for this thread-local allocation check.");
            }
            await commit;
            Assert.Equal(42, session.GetInt32("value"));
        }
        var allocation = GC.GetAllocatedBytesForCurrentThread() - before;
        Assert.Equal(thread, Environment.CurrentManagedThreadId);

        return allocation;
    }
}
