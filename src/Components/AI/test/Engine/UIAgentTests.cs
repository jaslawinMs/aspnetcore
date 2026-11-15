// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using Microsoft.AspNetCore.Components.AI.Tests.TestHelpers;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Moq;

namespace Microsoft.AspNetCore.Components.AI.Tests.Engine;

public class UIAgentTests
{
    [Theory]
    [InlineData(1)]
    [InlineData(4)]
    [InlineData(16)]
    public async Task SendMessageAsync_DebugDisabled_DoesNotReadContentsBeforeFiltering(int contentCount)
    {
        var contents = new TrackingContents(Enumerable.Range(0, contentCount)
            .Select(i => (AIContent)new TextContent($"token-{i};")).ToList());
        var update = new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "logging-response",
            Contents = contents
        };
        var produced = false;
        int? readsAtFirstDebugCheck = null;
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(LogLevel.Debug)).Returns(() =>
        {
            if (produced)
            {
                readsAtFirstDebugCheck ??= contents.ReadCount;
            }
            return false;
        });
        var factory = new Mock<ILoggerFactory>();
        factory.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(logger.Object);
        var client = new Mock<IChatClient>();
        client.Setup(c => c.GetStreamingResponseAsync(
            It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .Callback(() => produced = true)
            .Returns(EmitUpdate(update));
        using var agent = new UIAgent(client.Object, configure: null, loggerFactory: factory.Object);

        var blocks = await CollectAsync(agent, "Hello");

        Assert.True(produced);
        Assert.NotNull(readsAtFirstDebugCheck);
        Assert.Equal(0, readsAtFirstDebugCheck.Value);
        Assert.Equal(string.Concat(Enumerable.Range(0, contentCount).Select(i => $"token-{i};")),
            string.Concat(blocks.Where(b => b.Role == ChatRole.Assistant)
                .Select(b => Assert.IsType<RichContentBlock>(b).RawText)));
        Assert.All(blocks, b => Assert.Equal(BlockLifecycleState.Inactive, b.LifecycleState));
        Assert.DoesNotContain(logger.Invocations, invocation =>
            invocation.Method.Name == nameof(ILogger.Log) && invocation.Arguments[1] is EventId { Id: 101 });
        client.Verify(c => c.GetStreamingResponseAsync(
            It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()), Times.Once);

        var enabledContents = new TrackingContents(Enumerable.Range(0, contentCount)
            .Select(i => (AIContent)new TextContent($"token-{i};")).ToList());
        var enabledLogger = new Mock<ILogger>();
        enabledLogger.Setup(l => l.IsEnabled(LogLevel.Debug)).Returns(true);
        factory.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(enabledLogger.Object);
        client.Setup(c => c.GetStreamingResponseAsync(
            It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .Returns(EmitUpdate(new ChatResponseUpdate
            {
                Role = ChatRole.Assistant,
                MessageId = "logging-response",
                Contents = enabledContents
            }));
        using var enabledAgent = new UIAgent(client.Object, configure: null, loggerFactory: factory.Object);

        var enabledBlocks = await CollectAsync(enabledAgent, "Hello");

        Assert.Equal(contentCount, enabledContents.ReadCount - contents.ReadCount);
        Assert.Equal(string.Concat(Enumerable.Range(0, contentCount).Select(i => $"token-{i};")),
            string.Concat(enabledBlocks.Where(b => b.Role == ChatRole.Assistant)
                .Select(b => Assert.IsType<RichContentBlock>(b).RawText)));
    }

    [Fact]
    public async Task SendMessageAsync_DebugEnabled_PreservesReceivedUpdateFields()
    {
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
        var factory = new Mock<ILoggerFactory>();
        factory.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(logger.Object);
        var update = new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "logging-response",
            Contents = [new TextContent("answer"), new FunctionCallContent("logging-call", "tool")]
        };
        var client = new Mock<IChatClient>();
        client.Setup(c => c.GetStreamingResponseAsync(
            It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .Returns(EmitUpdate(update));
        using var agent = new UIAgent(client.Object, configure: null, loggerFactory: factory.Object);

        var blocks = await CollectAsync(agent, "Hello");

        var invocation = Assert.Single(logger.Invocations.Where(i =>
            i.Method.Name == nameof(ILogger.Log) && i.Arguments[1] is EventId { Id: 101 }));
        Assert.Equal(LogLevel.Debug, invocation.Arguments[0]);
        var state = Assert.IsAssignableFrom<IReadOnlyList<KeyValuePair<string, object?>>>(invocation.Arguments[2]);
        Assert.Equal(0, Assert.Single(state.Where(p => p.Key == "Index")).Value);
        Assert.Equal("assistant", Assert.Single(state.Where(p => p.Key == "Role")).Value);
        Assert.Equal("TextContent, FunctionCallContent", Assert.Single(state.Where(p => p.Key == "ContentTypes")).Value);
        Assert.Equal("SendMessageAsync: Received update #{Index} Role={Role}, ContentTypes=[{ContentTypes}]",
            Assert.Single(state.Where(p => p.Key == "{OriginalFormat}")).Value);
        Assert.Equal("answer", Assert.IsType<RichContentBlock>(
            Assert.Single(blocks.Where(b => b.Role == ChatRole.Assistant && b is RichContentBlock))).RawText);
        Assert.Contains(blocks, b => b is FunctionInvocationContentBlock && b.Role == ChatRole.Assistant);
        Assert.All(blocks, b => Assert.Equal(BlockLifecycleState.Inactive, b.LifecycleState));
        factory.Verify(f => f.CreateLogger(typeof(BlockMappingPipeline).FullName!), Times.Once);
    }

    [Fact]
    public async Task SendMessageAsync_DebugEnabled_EmptyUpdatePreservesNullRoleAndContentTypes()
    {
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
        var factory = new Mock<ILoggerFactory>();
        factory.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(logger.Object);
        var client = new Mock<IChatClient>();
        client.Setup(c => c.GetStreamingResponseAsync(
            It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .Returns(EmitUpdate(new ChatResponseUpdate { Contents = [] }));
        using var agent = new UIAgent(client.Object, configure: null, loggerFactory: factory.Object);

        var blocks = await CollectAsync(agent, "Hello");

        var invocation = Assert.Single(logger.Invocations.Where(i =>
            i.Method.Name == nameof(ILogger.Log) && i.Arguments[1] is EventId { Id: 101 }));
        var state = Assert.IsAssignableFrom<IReadOnlyList<KeyValuePair<string, object?>>>(invocation.Arguments[2]);
        Assert.Equal(0, Assert.Single(state.Where(p => p.Key == "Index")).Value);
        Assert.Null(Assert.Single(state.Where(p => p.Key == "Role")).Value);
        Assert.Equal(string.Empty, Assert.Single(state.Where(p => p.Key == "ContentTypes")).Value);
        Assert.Equal(ChatRole.User, Assert.Single(blocks).Role);
        Assert.Equal(BlockLifecycleState.Inactive, blocks[0].LifecycleState);
    }

    [Fact]
    public async Task SendMessageAsync_DebugEnabledAfterFirstUpdate_PreservesUpdateIndex()
    {
        var enabled = false;
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns(() => enabled);
        var factory = new Mock<ILoggerFactory>();
        factory.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(logger.Object);
        var client = new Mock<IChatClient>();
        client.Setup(c => c.GetStreamingResponseAsync(
            It.IsAny<IEnumerable<ChatMessage>>(), It.IsAny<ChatOptions?>(), It.IsAny<CancellationToken>()))
            .Returns(EmitUpdates());
        using var agent = new UIAgent(client.Object, configure: null, loggerFactory: factory.Object);

        var blocks = await CollectAsync(agent, "Hello");

        var invocations = logger.Invocations.Where(i =>
            i.Method.Name == nameof(ILogger.Log) && i.Arguments[1] is EventId { Id: 101 }).ToArray();
        Assert.Collection(invocations, invocation => AssertIndex(invocation.Arguments[2], 1),
            invocation => AssertIndex(invocation.Arguments[2], 3));
        Assert.Equal("firstsecondthirdfourth", Assert.IsType<RichContentBlock>(
            Assert.Single(blocks.Where(b => b.Role == ChatRole.Assistant))).RawText);
        Assert.All(blocks, b => Assert.Equal(BlockLifecycleState.Inactive, b.LifecycleState));

        async IAsyncEnumerable<ChatResponseUpdate> EmitUpdates()
        {
            yield return new ChatResponseUpdate
            {
                Role = ChatRole.Assistant,
                MessageId = "logging-response",
                Contents = [new TextContent("first")]
            };
            enabled = true;
            yield return new ChatResponseUpdate
            {
                Role = ChatRole.Assistant,
                MessageId = "logging-response",
                Contents = [new TextContent("second")]
            };
            enabled = false;
            yield return new ChatResponseUpdate
            {
                Role = ChatRole.Assistant,
                MessageId = "logging-response",
                Contents = [new TextContent("third")]
            };
            enabled = true;
            yield return new ChatResponseUpdate
            {
                Role = ChatRole.Assistant,
                MessageId = "logging-response",
                Contents = [new TextContent("fourth")]
            };
            await Task.CompletedTask;
        }

        static void AssertIndex(object argument, int expected)
        {
            var state = Assert.IsAssignableFrom<IReadOnlyList<KeyValuePair<string, object?>>>(argument);
            Assert.Equal(expected, Assert.Single(state.Where(p => p.Key == "Index")).Value);
            Assert.Equal("TextContent", Assert.Single(state.Where(p => p.Key == "ContentTypes")).Value);
        }
    }

    [Fact]
    public async Task SendMessageAsync_TextResponse_YieldsUserThenAssistantBlocks()
    {
        var client = new DelegatingStreamingChatClient();
        client.SetHandler((msgs, opts, ct) => ResponseEmitters.EmitTextResponse("Hi there!"));
        var agent = new UIAgent(client);

        var blocks = await CollectAsync(agent, "Hello");

        var userBlock = Assert.IsType<RichContentBlock>(
            Assert.Single(blocks.Where(b => b.Role == ChatRole.User)));
        Assert.Equal("Hello", userBlock.RawText);

        var assistantBlock = Assert.IsType<RichContentBlock>(
            Assert.Single(blocks.Where(b => b.Role == ChatRole.Assistant)));
        Assert.Equal("Hi there!", assistantBlock.RawText);
    }

    [Fact]
    public async Task SendMessageAsync_MultiTokenStreaming_SingleBlockWithAccumulatedText()
    {
        var client = new DelegatingStreamingChatClient();
        client.SetHandler((msgs, opts, ct) =>
            ResponseEmitters.EmitMultiTokenTextResponse(ct, "Hello", " ", "world", "!"));
        var agent = new UIAgent(client);

        var blocks = await CollectAsync(agent, "Hi");

        var rich = Assert.IsType<RichContentBlock>(
            Assert.Single(blocks.Where(b => b.Role == ChatRole.Assistant)));
        Assert.Equal("Hello world!", rich.RawText);
        var paragraph = Assert.IsType<ParagraphNode>(Assert.Single(rich.Content));
        Assert.Equal("Hello world!", Assert.IsType<TextNode>(Assert.Single(paragraph.Children)).Text);
    }

    [Fact]
    public async Task SendMessageAsync_MultiTokenStreaming_OnChangedFiresPerToken()
    {
        var client = new DelegatingStreamingChatClient();
        client.SetHandler((msgs, opts, ct) =>
            ResponseEmitters.EmitMultiTokenTextResponse(ct, "A", "B", "C"));
        var agent = new UIAgent(client);

        var changeCount = 0;
        ContentBlock? firstBlock = null;

        await foreach (var block in agent.SendMessageAsync(new ChatMessage(ChatRole.User, "Hi")))
        {
            if (block.Role == ChatRole.Assistant && firstBlock is null)
            {
                firstBlock = block;
                block.OnChanged(() => changeCount++);
            }
        }

        // Two updates after the block was emitted, plus the notification from finalizing it.
        Assert.Equal(3, changeCount);
    }

    [Fact]
    public async Task SendMessageAsync_AllBlocksInactiveAfterIteration()
    {
        var client = new DelegatingStreamingChatClient();
        client.SetHandler((msgs, opts, ct) => ResponseEmitters.EmitTextResponse("Done"));
        var agent = new UIAgent(client);

        var blocks = await CollectAsync(agent, "Hi");

        Assert.All(blocks, block => Assert.Equal(BlockLifecycleState.Inactive, block.LifecycleState));
    }

    [Fact]
    public async Task SendMessageAsync_SecondTurn_SendsPreviousMessagesAsHistory()
    {
        var client = new DelegatingStreamingChatClient();
        List<ChatMessage>? secondRequest = null;
        var callCount = 0;
        client.SetHandler((msgs, opts, ct) =>
        {
            callCount++;
            if (callCount == 2)
            {
                secondRequest = msgs.ToList();
            }

            return ResponseEmitters.EmitTextResponse($"Answer {callCount}");
        });
        var agent = new UIAgent(client);

        await CollectAsync(agent, "First question");
        var secondTurn = await CollectAsync(agent, "Second question");

        Assert.NotNull(secondRequest);
        Assert.Equal(3, secondRequest!.Count);
        Assert.Equal("First question", secondRequest[0].Text);
        Assert.Equal("Answer 1", secondRequest[1].Text);
        Assert.Equal("Second question", secondRequest[2].Text);

        var assistantBlock = Assert.IsType<RichContentBlock>(
            Assert.Single(secondTurn.Where(b => b.Role == ChatRole.Assistant)));
        Assert.Equal("Answer 2", assistantBlock.RawText);
    }

    [Fact]
    public async Task SendMessageAsync_EmptyResponse_YieldsOnlyUserBlock()
    {
        var client = new DelegatingStreamingChatClient();
        client.SetHandler((msgs, opts, ct) => ResponseEmitters.EmitEmptyResponse(ct));
        var agent = new UIAgent(client);

        var blocks = await CollectAsync(agent, "Hi");

        Assert.Equal(ChatRole.User, Assert.Single(blocks).Role);
    }

    [Fact]
    public async Task SendMessageAsync_UsesConfiguredChatOptions()
    {
        var client = new DelegatingStreamingChatClient();
        ChatOptions? observed = null;
        client.SetHandler((msgs, opts, ct) =>
        {
            observed = opts;
            return ResponseEmitters.EmitTextResponse("ok");
        });
        var chatOptions = new ChatOptions { ModelId = "test-model" };
        var agent = new UIAgent(client, chatOptions);

        await CollectAsync(agent, "Hi");

        Assert.Same(chatOptions, observed);
    }

    [Fact]
    public void Constructor_NullChatClientThrows()
    {
        Assert.Throws<ArgumentNullException>(() => new UIAgent(null!));
    }

    [Fact]
    public async Task SendMessageAsync_AfterDispose_Throws()
    {
        var client = new DelegatingStreamingChatClient();
        client.SetHandler((msgs, opts, ct) => ResponseEmitters.EmitTextResponse("ok"));
        var agent = new UIAgent(client);
        agent.Dispose();

        await Assert.ThrowsAsync<ObjectDisposedException>(() => CollectAsync(agent, "Hi"));
    }

    private static async Task<List<ContentBlock>> CollectAsync(UIAgent agent, string text)
    {
        var blocks = new List<ContentBlock>();
        await foreach (var block in agent.SendMessageAsync(new ChatMessage(ChatRole.User, text)))
        {
            blocks.Add(block);
        }

        return blocks;
    }

    private static async IAsyncEnumerable<ChatResponseUpdate> EmitUpdate(ChatResponseUpdate update)
    {
        yield return update;
        await Task.CompletedTask;
    }

    private sealed class TrackingContents(List<AIContent> contents) : IList<AIContent>
    {
        public int ReadCount { get; private set; }
        public int Count => contents.Count;
        public bool IsReadOnly => false;
        public AIContent this[int index]
        {
            get
            {
                ReadCount++;
                return contents[index];
            }
            set => contents[index] = value;
        }

        public IEnumerator<AIContent> GetEnumerator()
        {
            for (var i = 0; i < Count; i++)
            {
                yield return this[i];
            }
        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
        public void Add(AIContent item) => contents.Add(item);
        public void Clear() => contents.Clear();
        public bool Contains(AIContent item) => contents.Contains(item);
        public void CopyTo(AIContent[] array, int arrayIndex) => contents.CopyTo(array, arrayIndex);
        public int IndexOf(AIContent item) => contents.IndexOf(item);
        public void Insert(int index, AIContent item) => contents.Insert(index, item);
        public bool Remove(AIContent item) => contents.Remove(item);
        public void RemoveAt(int index) => contents.RemoveAt(index);
    }
}
