// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
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
    public async Task Process_DebugDisabled_DoesNotReadContentsForDiagnostics(int contentCount)
    {
        var contents = CreateTrackedContents(contentCount);
        int? readsAtFirstDebugCheck = null;
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(LogLevel.Debug)).Returns(() =>
        {
            readsAtFirstDebugCheck ??= contents.ReadCount;
            return false;
        });
        var pipeline = new BlockMappingPipeline(new UIAgentOptions(), logger.Object);
        var update = new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "diagnostic-response",
            Contents = contents
        };

        var blocks = await ProcessAsync(pipeline, update);
        pipeline.Finalize();

        Assert.NotNull(readsAtFirstDebugCheck);
        Assert.Equal(0, readsAtFirstDebugCheck.Value);
        Assert.Equal(string.Concat(Enumerable.Range(0, contentCount).Select(i => $"token-{i};")),
            string.Concat(blocks.Select(b => Assert.IsType<RichContentBlock>(b).RawText)));
        Assert.All(blocks, b => Assert.Equal(BlockLifecycleState.Inactive, b.LifecycleState));
        Assert.DoesNotContain(logger.Invocations, invocation =>
            invocation.Method.Name == nameof(ILogger.Log) && invocation.Arguments[1] is EventId { Id: 1 });

        var enabledContents = CreateTrackedContents(contentCount);
        var enabledLogger = new Mock<ILogger>();
        enabledLogger.Setup(l => l.IsEnabled(LogLevel.Debug)).Returns(true);
        var enabledPipeline = new BlockMappingPipeline(new UIAgentOptions(), enabledLogger.Object);
        var enabledBlocks = await ProcessAsync(enabledPipeline, new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "diagnostic-response",
            Contents = enabledContents
        });
        enabledPipeline.Finalize();

        Assert.Equal(contentCount, enabledContents.ReadCount - contents.ReadCount);
        Assert.Equal(string.Concat(Enumerable.Range(0, contentCount).Select(i => $"token-{i};")),
            string.Concat(enabledBlocks.Select(b => Assert.IsType<RichContentBlock>(b).RawText)));
        Assert.All(enabledBlocks, b => Assert.Equal(BlockLifecycleState.Inactive, b.LifecycleState));
    }

    [Theory]
    [InlineData("Text")]
    [InlineData("Mixed")]
    [InlineData("Empty")]
    public async Task Process_DebugEnabled_PreservesProcessingUpdateFields(string scenario)
    {
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
        var pipeline = new BlockMappingPipeline(new UIAgentOptions(), logger.Object);
        IList<AIContent> contents = scenario switch
        {
            "Text" => [new TextContent("answer")],
            "Mixed" => [new TextContent("answer"), new FunctionCallContent("diagnostic-call", "tool")],
            "Empty" => [],
            _ => throw new InvalidOperationException()
        };
        var update = new ChatResponseUpdate
        {
            Role = scenario == "Empty" ? null : ChatRole.Assistant,
            MessageId = "diagnostic-response",
            Contents = contents
        };

        var blocks = await ProcessAsync(pipeline, update);
        pipeline.Finalize();

        var invocation = Assert.Single(logger.Invocations.Where(i =>
            i.Method.Name == nameof(ILogger.Log) && i.Arguments[1] is EventId { Id: 1 }));
        Assert.Equal(LogLevel.Debug, invocation.Arguments[0]);
        var state = Assert.IsAssignableFrom<IReadOnlyList<KeyValuePair<string, object?>>>(invocation.Arguments[2]);
        Assert.Equal(update.Role?.Value, Assert.Single(state.Where(p => p.Key == "Role")).Value);
        Assert.Equal(contents.Count, Assert.Single(state.Where(p => p.Key == "ContentCount")).Value);
        Assert.Equal(scenario switch
        {
            "Text" => "TextContent",
            "Mixed" => "TextContent, FunctionCallContent",
            _ => string.Empty
        }, Assert.Single(state.Where(p => p.Key == "ContentTypes")).Value);
        Assert.Equal("Processing update: Role={Role}, ContentCount={ContentCount}, ContentTypes=[{ContentTypes}]",
            Assert.Single(state.Where(p => p.Key == "{OriginalFormat}")).Value);
        if (scenario == "Empty")
        {
            Assert.Empty(blocks);
        }
        else
        {
            Assert.Equal("answer", Assert.IsType<RichContentBlock>(
                Assert.Single(blocks.Where(b => b is RichContentBlock))).RawText);
            Assert.Equal(scenario == "Mixed" ? 2 : 1, blocks.Count);
        }
        Assert.All(blocks, b => Assert.Equal(BlockLifecycleState.Inactive, b.LifecycleState));
    }

    [Fact]
    public async Task Process_DebugEnabledAfterFirstUpdate_PreservesActiveBlockAndNotification()
    {
        var enabled = false;
        var logger = new Mock<ILogger>();
        logger.Setup(l => l.IsEnabled(It.IsAny<LogLevel>())).Returns(() => enabled);
        var pipeline = new BlockMappingPipeline(new UIAgentOptions(), logger.Object);
        var blocks = await ProcessAsync(pipeline, CreateTextUpdate("diagnostic-response", "first"));
        var block = Assert.IsType<RichContentBlock>(Assert.Single(blocks));
        var notifications = 0;
        using var subscription = block.OnChanged(() => notifications++);
        enabled = true;

        var more = await ProcessAsync(pipeline, CreateTextUpdate("diagnostic-response", "second"));

        Assert.Empty(more);
        Assert.Equal("firstsecond", block.RawText);
        Assert.Equal("diagnostic-response", block.Id);
        Assert.Equal(BlockLifecycleState.Active, block.LifecycleState);
        Assert.Equal(1, notifications);
        var invocation = Assert.Single(logger.Invocations.Where(i =>
            i.Method.Name == nameof(ILogger.Log) && i.Arguments[1] is EventId { Id: 1 }));
        var state = Assert.IsAssignableFrom<IReadOnlyList<KeyValuePair<string, object?>>>(invocation.Arguments[2]);
        Assert.Equal("assistant", Assert.Single(state.Where(p => p.Key == "Role")).Value);
        Assert.Equal(1, Assert.Single(state.Where(p => p.Key == "ContentCount")).Value);
        Assert.Equal("TextContent", Assert.Single(state.Where(p => p.Key == "ContentTypes")).Value);
        pipeline.Finalize();
        Assert.Equal(BlockLifecycleState.Inactive, block.LifecycleState);
        Assert.Equal(2, notifications);
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

    private static TrackingContents CreateTrackedContents(int count) => new(Enumerable.Range(0, count)
        .Select(i => (AIContent)new TextContent($"token-{i};")).ToList());

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
