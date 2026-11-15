// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Moq;

namespace Microsoft.AspNetCore.Components.AI.Tests.Pipeline;

public class BlockMappingPipelineTests
{
    [Theory]
    [InlineData(1)]
    [InlineData(4)]
    [InlineData(16)]
    public async Task Process_DebugDisabled_ActiveResultDoesNotAllocateDiagnostics(int contentCount)
    {
        var logger = new AllocationCheckpointLogger();
        var options = new UIAgentOptions();
        options.AddBlockHandler(new AllocationTrackingTextHandler(logger));
        for (var warmup = 0; warmup < 16; warmup++)
        {
            foreach (var enabled in new[] { false, true })
            {
                logger.Enabled = enabled;
                var warmPipeline = new BlockMappingPipeline(options, logger);
                await ProcessAsync(warmPipeline, CreateTextUpdate("allocation-response", "first"));
                await ProcessAsync(warmPipeline, CreateTextUpdate("allocation-response", "second"));
                warmPipeline.Finalize();
            }
        }
        logger.Enabled = false;
        logger.AllocatedAtFilter = null;
        var pipeline = new BlockMappingPipeline(options, logger);
        var first = await ProcessAsync(pipeline, CreateTextUpdate("allocation-response", "first"));
        var update = new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "allocation-response",
            Contents = Enumerable.Range(0, contentCount).Select(i => (AIContent)new TextContent($"token-{i};")).ToList()
        };
        var disabledStart = GC.GetAllocatedBytesForCurrentThread();
        var more = await ProcessAsync(pipeline, update);
        var disabledAllocated = GC.GetAllocatedBytesForCurrentThread() - disabledStart;
        pipeline.Finalize();

        Assert.NotNull(logger.AllocatedAtFilter);
        Assert.Equal(0, logger.AllocatedAtFilter.Value);
        Assert.Equal("first" + string.Concat(Enumerable.Range(0, contentCount).Select(i => $"token-{i};")),
            string.Concat(first.Concat(more).Select(b => Assert.IsType<RichContentBlock>(b).RawText)));
        Assert.All(first.Concat(more), b => Assert.Equal(BlockLifecycleState.Inactive, b.LifecycleState));

        logger.Enabled = true;
        var enabledPipeline = new BlockMappingPipeline(options, logger);
        var enabledFirst = await ProcessAsync(enabledPipeline, CreateTextUpdate("allocation-response", "first"));
        var enabledStart = GC.GetAllocatedBytesForCurrentThread();
        var enabledMore = await ProcessAsync(enabledPipeline, update);
        var enabledAllocated = GC.GetAllocatedBytesForCurrentThread() - enabledStart;
        enabledPipeline.Finalize();

        Assert.True(enabledAllocated > disabledAllocated,
            $"Actual active diagnostics must allocate only when enabled; enabled={enabledAllocated}, disabled={disabledAllocated}.");
        Assert.Equal("first" + string.Concat(Enumerable.Range(0, contentCount).Select(i => $"token-{i};")),
            string.Concat(enabledFirst.Concat(enabledMore).Select(b => Assert.IsType<RichContentBlock>(b).RawText)));
        Assert.All(enabledFirst.Concat(enabledMore), b => Assert.Equal(BlockLifecycleState.Inactive, b.LifecycleState));
    }

    [Theory]
    [InlineData("Pass")]
    [InlineData("Update")]
    [InlineData("Complete")]
    public async Task Process_DebugEnabled_PreservesActiveResultFieldsAndLifecycle(string kind)
    {
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
        var options = new UIAgentOptions();
        options.AddBlockHandler(new PassOnUsageTextHandler());
        var pipeline = new BlockMappingPipeline(options, logger.Object);
        var first = await ProcessAsync(pipeline, CreateTextUpdate("logging-response", "first"));
        var block = Assert.IsType<RichContentBlock>(Assert.Single(first));
        var notifications = 0;
        using var subscription = block.OnChanged(() => notifications++);
        var update = new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "logging-response",
            Contents = kind switch
            {
                "Pass" => [new UsageContent(new UsageDetails())],
                "Update" => [new TextContent("second")],
                "Complete" => [],
                _ => throw new InvalidOperationException()
            }
        };

        var more = await ProcessAsync(pipeline, update);

        Assert.Empty(more);
        Assert.Equal(kind == "Update" ? "firstsecond" : "first", block.RawText);
        Assert.Equal(kind == "Complete" ? BlockLifecycleState.Inactive : BlockLifecycleState.Active, block.LifecycleState);
        Assert.Equal(kind == "Pass" ? 0 : 1, notifications);
        var invocation = Assert.Single(logger.Invocations.Where(i =>
            i.Method.Name == nameof(ILogger.Log) && i.Arguments[1] is EventId { Id: 2 }));
        Assert.Equal(LogLevel.Debug, invocation.Arguments[0]);
        var state = Assert.IsAssignableFrom<IReadOnlyList<KeyValuePair<string, object?>>>(invocation.Arguments[2]);
        Assert.Equal(nameof(RichContentBlock), Assert.Single(state.Where(p => p.Key == "HandlerType")).Value);
        Assert.Equal(kind, Assert.Single(state.Where(p => p.Key == "ResultKind")).Value);
        Assert.Equal("logging-response", Assert.Single(state.Where(p => p.Key == "BlockId")).Value);
        Assert.Equal("Active handler {HandlerType} returned {ResultKind} for block {BlockId}",
            Assert.Single(state.Where(p => p.Key == "{OriginalFormat}")).Value);
        pipeline.Finalize();
        Assert.Equal(BlockLifecycleState.Inactive, block.LifecycleState);
        Assert.Equal(kind == "Update" ? 2 : 1, notifications);
    }

    [Fact]
    public async Task Process_DebugDisabled_FunctionCatchUpStillFiltersActiveResult()
    {
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns((LogLevel level) => level >= LogLevel.Information);
        var pipeline = new BlockMappingPipeline(new UIAgentOptions(), logger.Object);

        var blocks = await ProcessAsync(pipeline, new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "catch-up-response",
            Contents = [new FunctionCallContent("catch-up-call", "tool")]
        });
        pipeline.Finalize();

        Assert.IsType<FunctionInvocationContentBlock>(Assert.Single(blocks));
        Assert.DoesNotContain(logger.Invocations, i =>
            i.Method.Name == nameof(ILogger.Log) && i.Arguments[1] is EventId { Id: 2 });
        Assert.All(blocks, b => Assert.Equal(BlockLifecycleState.Inactive, b.LifecycleState));
    }

    [Fact]
    public async Task Process_SingleTextUpdate_EmitsOneRichContentBlock()
    {
        var pipeline = CreatePipeline();
        var update = CreateTextUpdate("msg-1", "Hello");

        var blocks = await ProcessAsync(pipeline, update);

        var block = Assert.IsType<RichContentBlock>(Assert.Single(blocks));
        Assert.Equal("Hello", block.RawText);
        Assert.Equal("msg-1", block.Id);
        Assert.Equal(ChatRole.Assistant, block.Role);
        Assert.Equal(BlockLifecycleState.Active, block.LifecycleState);
    }

    [Fact]
    public async Task Process_MultipleTextUpdates_SingleBlockAccumulates()
    {
        var pipeline = CreatePipeline();

        var blocks = await ProcessAsync(pipeline, CreateTextUpdate("msg-1", "Hello"));
        var moreBlocks = await ProcessAsync(pipeline, CreateTextUpdate("msg-1", " world"));

        Assert.Empty(moreBlocks);
        var block = Assert.IsType<RichContentBlock>(Assert.Single(blocks));
        Assert.Equal("Hello world", block.RawText);
    }

    [Fact]
    public async Task Process_SubsequentUpdate_NotifiesSubscribers()
    {
        var pipeline = CreatePipeline();
        var blocks = await ProcessAsync(pipeline, CreateTextUpdate("msg-1", "Hello"));
        var changeCount = 0;
        using var subscription = blocks[0].OnChanged(() => changeCount++);

        await ProcessAsync(pipeline, CreateTextUpdate("msg-1", " world"));

        Assert.Equal(1, changeCount);
    }

    [Fact]
    public async Task Process_RichTextSnapshots_ReplaceTreeOnSameBlock()
    {
        var pipeline = CreatePipeline();
        var firstNodes = new RichTextNode[]
        {
            CreateNode<HeadingNode>(new TextNode("Partial")),
        };
        var finalNodes = new RichTextNode[]
        {
            CreateNode<HeadingNode>(new TextNode("Complete")),
            CreateNode<ParagraphNode>(new TextNode("Formatted response")),
        };

        var blocks = await ProcessAsync(
            pipeline,
            CreateRichTextUpdate("msg-1", "Partial", firstNodes));
        var moreBlocks = await ProcessAsync(
            pipeline,
            CreateRichTextUpdate("msg-1", "Complete\n\nFormatted response", finalNodes));

        Assert.Empty(moreBlocks);
        var block = Assert.IsType<RichContentBlock>(Assert.Single(blocks));
        Assert.Equal("Complete\n\nFormatted response", block.RawText);
        Assert.Equal(finalNodes, block.Content);
        Assert.Equal("Partial", Assert.IsType<TextNode>(Assert.Single(firstNodes[0].Children)).Text);
    }

    [Fact]
    public async Task Process_RichTextSnapshot_NotifiesSubscribers()
    {
        var pipeline = CreatePipeline();
        var blocks = await ProcessAsync(
            pipeline,
            CreateRichTextUpdate(
                "msg-1",
                "Partial",
                [CreateNode<ParagraphNode>(new TextNode("Partial"))]));
        var changeCount = 0;
        using var subscription = blocks[0].OnChanged(() => changeCount++);

        await ProcessAsync(
            pipeline,
            CreateRichTextUpdate(
                "msg-1",
                "Complete",
                [CreateNode<ParagraphNode>(new TextNode("Complete"))]));

        Assert.Equal(1, changeCount);
    }

    [Fact]
    public async Task Process_RichTextSnapshotsWithDifferentMessageIds_EmitSeparateBlocks()
    {
        var pipeline = CreatePipeline();

        var firstBlocks = await ProcessAsync(
            pipeline,
            CreateRichTextUpdate(
                "msg-1",
                "First",
                [CreateNode<ParagraphNode>(new TextNode("First"))]));
        var secondBlocks = await ProcessAsync(
            pipeline,
            CreateRichTextUpdate(
                "msg-2",
                "Second",
                [CreateNode<ParagraphNode>(new TextNode("Second"))]));

        var firstBlock = Assert.IsType<RichContentBlock>(Assert.Single(firstBlocks));
        var secondBlock = Assert.IsType<RichContentBlock>(Assert.Single(secondBlocks));
        Assert.Equal("msg-1", firstBlock.Id);
        Assert.Equal("First", firstBlock.RawText);
        Assert.Equal(BlockLifecycleState.Inactive, firstBlock.LifecycleState);
        Assert.Equal("msg-2", secondBlock.Id);
        Assert.Equal("Second", secondBlock.RawText);
    }

    [Fact]
    public async Task Process_RichTextSnapshotWithTextFallback_EmitsSingleBlock()
    {
        var pipeline = CreatePipeline();
        var update = new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "msg-1",
            Contents =
            [
                new RichTextContent(
                    "Formatted",
                    [CreateNode<ParagraphNode>(new TextNode("Formatted"))]),
                new TextContent("Formatted"),
            ],
        };

        var blocks = await ProcessAsync(pipeline, update);

        var block = Assert.IsType<RichContentBlock>(Assert.Single(blocks));
        Assert.Equal("Formatted", block.RawText);
        Assert.IsType<ParagraphNode>(Assert.Single(block.Content));
    }

    [Fact]
    public async Task Process_UpdateWithoutText_CompletesActiveBlock()
    {
        var pipeline = CreatePipeline();
        var blocks = await ProcessAsync(pipeline, CreateTextUpdate("msg-1", "Hello"));

        await ProcessAsync(pipeline, new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "msg-1",
            Contents = [],
        });

        Assert.Equal(BlockLifecycleState.Inactive, blocks[0].LifecycleState);
    }

    [Fact]
    public async Task Finalize_DeactivatesAndNotifiesActiveBlocks()
    {
        var pipeline = CreatePipeline();
        var blocks = await ProcessAsync(pipeline, CreateTextUpdate("msg-1", "Hello"));
        var changeCount = 0;
        using var subscription = blocks[0].OnChanged(() => changeCount++);

        pipeline.Finalize();

        Assert.Equal(BlockLifecycleState.Inactive, blocks[0].LifecycleState);
        Assert.Equal(1, changeCount);
    }

    [Fact]
    public async Task Process_RegisteredHandler_ClaimsContentBeforeTextHandler()
    {
        var options = new UIAgentOptions();
        options.AddBlockHandler(new UppercaseTextHandler());
        var pipeline = new BlockMappingPipeline(options);

        var blocks = await ProcessAsync(pipeline, CreateTextUpdate("msg-1", "Hello"));

        var block = Assert.IsType<UppercaseTextBlock>(Assert.Single(blocks));
        Assert.Equal("HELLO", block.Text);
    }

    [Fact]
    public void AddBlockHandler_NullHandlerThrows()
    {
        var options = new UIAgentOptions();

        Assert.Throws<ArgumentNullException>(() => options.AddBlockHandler<RichContentBlock>(null!));
    }

    private static BlockMappingPipeline CreatePipeline() => new(new UIAgentOptions());

    private static ChatResponseUpdate CreateTextUpdate(string messageId, string text) => new()
    {
        Role = ChatRole.Assistant,
        MessageId = messageId,
        Contents = [new TextContent(text)],
    };

    private static ChatResponseUpdate CreateRichTextUpdate(
        string messageId,
        string text,
        IReadOnlyList<RichTextNode> nodes) => new()
        {
            Role = ChatRole.Assistant,
            MessageId = messageId,
            Contents = [new RichTextContent(text, nodes)],
        };

    private static TNode CreateNode<TNode>(params RichTextNode[] children)
        where TNode : RichTextNode, new()
    {
        var node = new TNode();
        foreach (var child in children)
        {
            node.AddChild(child);
        }

        return node;
    }

    private static async Task<List<ContentBlock>> ProcessAsync(
        BlockMappingPipeline pipeline, ChatResponseUpdate update)
    {
        var blocks = new List<ContentBlock>();
        await foreach (var block in pipeline.Process(update))
        {
            blocks.Add(block);
        }

        return blocks;
    }

    private sealed class UppercaseTextBlock : ContentBlock
    {
        public string Text { get; set; } = "";
    }

    private sealed class AllocationTrackingTextHandler(AllocationCheckpointLogger logger) : ContentBlockHandler<RichContentBlock>
    {
        private readonly TextBlockHandler _handler = new();

        public override BlockMappingResult<RichContentBlock> Handle(BlockMappingContext context, RichContentBlock state)
        {
            var active = state.Id.Length > 0;
            var result = _handler.Handle(context, state);
            if (active)
            {
                logger.MarkHandlerReturn();
            }

            return result;
        }
    }

    private sealed class AllocationCheckpointLogger : ILogger
    {
        private long _handlerReturnedAt;
        private bool _armed;
        public bool Enabled { get; set; }
        public long? AllocatedAtFilter { get; set; }

        public void MarkHandlerReturn()
        {
            _armed = true;
            _handlerReturnedAt = GC.GetAllocatedBytesForCurrentThread();
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            if (logLevel == LogLevel.Debug && _armed)
            {
                AllocatedAtFilter = GC.GetAllocatedBytesForCurrentThread() - _handlerReturnedAt;
                _armed = false;
            }

            return Enabled;
        }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (!Enabled)
            {
                throw new InvalidOperationException("Disabled diagnostic sink invoked.");
            }
        }
    }

    private sealed class PassOnUsageTextHandler : ContentBlockHandler<RichContentBlock>
    {
        private readonly TextBlockHandler _handler = new();

        public override BlockMappingResult<RichContentBlock> Handle(BlockMappingContext context, RichContentBlock state)
        {
            foreach (var content in context.UnhandledContents)
            {
                if (content is UsageContent)
                {
                    return BlockMappingResult<RichContentBlock>.Pass();
                }
            }

            return _handler.Handle(context, state);
        }
    }

    private sealed class UppercaseTextHandler : ContentBlockHandler<UppercaseTextBlock>
    {
        public override BlockMappingResult<UppercaseTextBlock> Handle(
            BlockMappingContext context, UppercaseTextBlock state)
        {
            foreach (var content in context.UnhandledContents)
            {
                if (content is TextContent text)
                {
                    context.MarkHandled(text);
                    state.Text = (text.Text ?? "").ToUpperInvariant();
                    state.Id = context.Update.MessageId ?? Guid.NewGuid().ToString("N");
                    return BlockMappingResult<UppercaseTextBlock>.Emit(state, state);
                }
            }

            return state.Text.Length > 0
                ? BlockMappingResult<UppercaseTextBlock>.Complete()
                : BlockMappingResult<UppercaseTextBlock>.Pass();
        }
    }
}
