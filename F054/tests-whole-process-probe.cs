// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Moq;

namespace Microsoft.AspNetCore.Components.AI.Tests.Pipeline;

public class BlockMappingPipelineTests
{
    [Theory]
    [InlineData(1, false)]
    [InlineData(4, false)]
    [InlineData(16, false)]
    [InlineData(1, true)]
    [InlineData(4, true)]
    [InlineData(16, true)]
    public async Task Process_DebugDisabled_CatchUpDoesNotAllocateDiagnostics(int callCount, bool completed)
    {
        var logger = new CatchUpAllocationLogger();
        var options = new UIAgentOptions();
        options.AddBlockHandler(new AllocationTrackingFunctionHandler(logger));
        for (var warmup = 0; warmup < 16; warmup++)
        {
            foreach (var enabled in new[] { false, true })
            {
                logger.Reset(enabled);
                var warmPipeline = new BlockMappingPipeline(options, logger);
                await ProcessAsync(warmPipeline, CreateFunctionUpdate(1, completed));
                warmPipeline.Finalize();
            }
        }

        logger.Reset(enabled: false);
        var pipeline = new BlockMappingPipeline(options, logger);
        var update = CreateFunctionUpdate(callCount, completed);
        var disabledStart = GC.GetAllocatedBytesForCurrentThread();
        var blocks = await ProcessAsync(pipeline, update);
        var disabledAllocated = GC.GetAllocatedBytesForCurrentThread() - disabledStart;
        pipeline.Finalize();

        Assert.Equal(callCount, logger.CheckpointCount);
        Assert.Equal(0, logger.DiagnosticAllocated);
        AssertFunctionBlocks(blocks, update, callCount, completed);

        logger.Reset(enabled: true);
        var enabledPipeline = new BlockMappingPipeline(options, logger);
        var enabledStart = GC.GetAllocatedBytesForCurrentThread();
        var enabledBlocks = await ProcessAsync(enabledPipeline, update);
        var enabledAllocated = GC.GetAllocatedBytesForCurrentThread() - enabledStart;
        enabledPipeline.Finalize();

        Assert.Equal(callCount, logger.CheckpointCount);
        Assert.True(enabledAllocated > disabledAllocated,
            $"Complete catch-up diagnostics must allocate only when enabled; enabled={enabledAllocated}, disabled={disabledAllocated}.");
        AssertFunctionBlocks(enabledBlocks, update, callCount, completed);
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task Process_DebugEnabled_PreservesCatchUpFieldsAndFunctionState(bool completed, bool resultFirst)
    {
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
        var pipeline = new BlockMappingPipeline(new UIAgentOptions(), logger.Object);
        var call = new FunctionCallContent("catch-up-call", "tool",
            new Dictionary<string, object?> { ["index"] = 0 });
        var result = new FunctionResultContent("catch-up-call", "result");
        var update = new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            AuthorName = "provider",
            Contents = completed ? resultFirst ? [result, call] : [call, result] : [call]
        };

        var blocks = await ProcessAsync(pipeline, update);

        var block = Assert.IsType<FunctionInvocationContentBlock>(Assert.Single(blocks));
        Assert.Same(call, block.Call);
        Assert.Same(call.Arguments, block.Arguments);
        Assert.Equal("tool", block.ToolName);
        Assert.Equal(ChatRole.Assistant, block.Role);
        Assert.Equal("provider", block.AuthorName);
        Assert.Equal(completed, block.HasResult);
        Assert.Same(completed ? result : null, block.Result);
        Assert.Equal(completed ? BlockLifecycleState.Inactive : BlockLifecycleState.Active, block.LifecycleState);
        AssertCatchUpLog(logger, block, completed ? "Complete" : "Pass");
        var notifications = 0;
        using var subscription = block.OnChanged(() => notifications++);
        pipeline.Finalize();
        Assert.Equal(BlockLifecycleState.Inactive, block.LifecycleState);
        Assert.Equal(completed ? 0 : 1, notifications);
    }

    [Fact]
    public async Task Process_DebugEnabled_RegisteredCatchUpUpdatePreservesFieldsAndLifecycle()
    {
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
        var options = new UIAgentOptions();
        options.AddBlockHandler(new CatchUpUpdateFunctionHandler());
        var pipeline = new BlockMappingPipeline(options, logger.Object);
        var update = CreateFunctionUpdate(1, completed: false);

        var blocks = await ProcessAsync(pipeline, update);

        var block = Assert.IsType<FunctionInvocationContentBlock>(Assert.Single(blocks));
        Assert.Same(update.Contents[0], block.Call);
        Assert.False(block.HasResult);
        Assert.Equal(BlockLifecycleState.Active, block.LifecycleState);
        AssertCatchUpLog(logger, block, "Update");
        var notifications = 0;
        using var subscription = block.OnChanged(() => notifications++);
        pipeline.Finalize();
        Assert.Equal(BlockLifecycleState.Inactive, block.LifecycleState);
        Assert.Equal(1, notifications);
    }

    [Fact]
    public async Task Process_DebugDisabled_ActiveHandlerStillFiltersResult()
    {
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns((LogLevel level) => level >= LogLevel.Information);
        var pipeline = new BlockMappingPipeline(new UIAgentOptions(), logger.Object);
        var first = await ProcessAsync(pipeline, CreateTextUpdate("active-response", "first"));

        var more = await ProcessAsync(pipeline, CreateTextUpdate("active-response", "second"));
        pipeline.Finalize();

        Assert.Empty(more);
        var block = Assert.IsType<RichContentBlock>(Assert.Single(first));
        Assert.Equal("firstsecond", block.RawText);
        Assert.Equal(BlockLifecycleState.Inactive, block.LifecycleState);
        Assert.DoesNotContain(logger.Invocations, i =>
            i.Method.Name == nameof(ILogger.Log) && i.Arguments[1] is EventId { Id: 2 });
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

    private static ChatResponseUpdate CreateFunctionUpdate(int callCount, bool completed)
    {
        var update = new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            AuthorName = "provider",
            Contents = []
        };
        for (var i = 0; i < callCount; i++)
        {
            var id = $"catch-up-{i}";
            update.Contents.Add(new FunctionCallContent(id, "tool", new Dictionary<string, object?> { ["index"] = i }));
            if (completed)
            {
                update.Contents.Add(new FunctionResultContent(id, $"result-{i}"));
            }
        }

        return update;
    }

    private static void AssertFunctionBlocks(IReadOnlyList<ContentBlock> blocks, ChatResponseUpdate update, int callCount, bool completed)
    {
        var calls = update.Contents.OfType<FunctionCallContent>().ToArray();
        var results = update.Contents.OfType<FunctionResultContent>().ToArray();
        Assert.Equal(callCount, blocks.Count);
        for (var i = 0; i < callCount; i++)
        {
            var block = Assert.IsType<FunctionInvocationContentBlock>(blocks[i]);
            Assert.Same(calls[i], block.Call);
            Assert.Same(calls[i].Arguments, block.Arguments);
            Assert.Equal(calls[i].CallId, block.Id);
            Assert.Equal("tool", block.ToolName);
            Assert.Equal(update.Role, block.Role);
            Assert.Equal(update.AuthorName, block.AuthorName);
            Assert.Equal(completed, block.HasResult);
            Assert.Same(completed ? results[i] : null, block.Result);
            Assert.Equal(BlockLifecycleState.Inactive, block.LifecycleState);
        }
    }

    private static void AssertCatchUpLog(Mock<ILogger> logger, FunctionInvocationContentBlock block, string kind)
    {
        var invocation = Assert.Single(logger.Invocations.Where(i =>
            i.Method.Name == nameof(ILogger.Log) && i.Arguments[1] is EventId { Id: 2 }));
        Assert.Equal(LogLevel.Debug, invocation.Arguments[0]);
        var state = Assert.IsAssignableFrom<IReadOnlyList<KeyValuePair<string, object?>>>(invocation.Arguments[2]);
        Assert.Equal(nameof(FunctionInvocationContentBlock), Assert.Single(state.Where(p => p.Key == "HandlerType")).Value);
        Assert.Equal(kind, Assert.Single(state.Where(p => p.Key == "ResultKind")).Value);
        Assert.Equal(block.Id, Assert.Single(state.Where(p => p.Key == "BlockId")).Value);
        Assert.Equal("Active handler {HandlerType} returned {ResultKind} for block {BlockId}",
            Assert.Single(state.Where(p => p.Key == "{OriginalFormat}")).Value);
    }

    private sealed class AllocationTrackingFunctionHandler(CatchUpAllocationLogger logger) : ContentBlockHandler<FunctionInvocationContentBlock>
    {
        private readonly FunctionInvocationHandler _handler = new();

        public override BlockMappingResult<FunctionInvocationContentBlock> Handle(BlockMappingContext context, FunctionInvocationContentBlock state)
        {
            var catchUp = state.Call is not null;
            var result = _handler.Handle(context, state);
            if (catchUp)
            {
                logger.MarkCatchUpReturn();
            }

            return result;
        }
    }

    private sealed class CatchUpAllocationLogger : ILogger
    {
        private long _returnedAt;
        private bool _armed;
        private bool _enabled;
        public int CheckpointCount { get; private set; }
        public long DiagnosticAllocated { get; private set; }

        public void Reset(bool enabled)
        {
            _enabled = enabled;
            _armed = false;
            CheckpointCount = 0;
            DiagnosticAllocated = 0;
        }

        public void MarkCatchUpReturn()
        {
            _armed = true;
            _returnedAt = GC.GetAllocatedBytesForCurrentThread();
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            if (logLevel == LogLevel.Debug && _armed)
            {
                DiagnosticAllocated += GC.GetAllocatedBytesForCurrentThread() - _returnedAt;
                CheckpointCount++;
                _armed = false;
            }

            return logLevel != LogLevel.None && (logLevel >= LogLevel.Information || logLevel == LogLevel.Debug && _enabled);
        }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (logLevel == LogLevel.Debug && !_enabled)
            {
                throw new InvalidOperationException("Disabled diagnostic sink invoked.");
            }
        }
    }

    private sealed class CatchUpUpdateFunctionHandler : ContentBlockHandler<FunctionInvocationContentBlock>
    {
        private readonly FunctionInvocationHandler _handler = new();

        public override BlockMappingResult<FunctionInvocationContentBlock> Handle(BlockMappingContext context, FunctionInvocationContentBlock state)
        {
            var catchUp = state.Call is not null;
            var result = _handler.Handle(context, state);

            return catchUp && result.Kind == BlockMappingResult<FunctionInvocationContentBlock>.ResultKind.Pass
                ? BlockMappingResult<FunctionInvocationContentBlock>.Update(state)
                : result;
        }
    }

    private sealed class UppercaseTextBlock : ContentBlock
    {
        public string Text { get; set; } = "";
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
