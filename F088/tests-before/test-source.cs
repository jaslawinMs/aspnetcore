// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Reflection;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Components.AI.Tests.TestFramework;
using Microsoft.AspNetCore.Components.AI.Tests.TestHelpers;
using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.Extensions.AI;

namespace Microsoft.AspNetCore.Components.AI.Tests.Components;

public class MessageListTests
{
    [Fact]
    public async Task RendersTurns_AfterMessageSent()
    {
        var cut = RenderMessageList(_ => ResponseEmitters.EmitTextResponse("Hello!"));
        var context = GetAgentContext(cut);

        await cut.InvokeAsync(() => context.SendMessageAsync("Hi"));

        var html = cut.GetHtml();
        Assert.Contains("sc-ai-turn", html);
        Assert.Contains("Hi", html);
        Assert.Contains("Hello!", html);
    }

    [Fact]
    public async Task MultipleTurns_AllRendered()
    {
        var callCount = 0;
        var cut = RenderMessageList(_ => ResponseEmitters.EmitTextResponse($"Response {++callCount}"));
        var context = GetAgentContext(cut);

        await cut.InvokeAsync(() => context.SendMessageAsync("First"));
        await cut.InvokeAsync(() => context.SendMessageAsync("Second"));

        var html = cut.GetHtml();
        Assert.Contains("Response 1", html);
        Assert.Contains("Response 2", html);
        Assert.Equal(2, CountOccurrences(html, "sc-ai-turn sc-ai-turn--user"));
    }

    [Fact]
    public async Task StreamingBlock_RendersStreamingModifierUntilComplete()
    {
        var gate = new TaskCompletionSource();
        var cut = RenderMessageList(ct => ResponseEmitters.EmitTokensWithGate(
            ["Partial", " complete"],
            async index =>
            {
                if (index == 1)
                {
                    await gate.Task;
                }
            },
            ct));
        var context = GetAgentContext(cut);

        var sendTask = cut.InvokeAsync(() => context.SendMessageAsync("Hi"));

        await WaitForHtmlAsync(cut, "Partial");
        Assert.Contains("sc-ai-message__content--streaming", cut.GetHtml());

        gate.SetResult();
        await sendTask;

        var html = cut.GetHtml();
        Assert.Contains("Partial complete", html);
        Assert.DoesNotContain("sc-ai-message__content--streaming", html);
    }

    [Fact]
    public async Task RichTextContent_RendersStructuredNodesAndEncodesUnsafeContent()
    {
        var cut = RenderMessageList(_ => EmitRichTextResponse());
        var context = GetAgentContext(cut);

        await cut.InvokeAsync(() => context.SendMessageAsync("Format this"));

        var html = cut.GetHtml();
        Assert.Contains("<h2", html);
        Assert.Contains("<strong>structured</strong>", html);
        Assert.Contains("<em>rich text</em>", html);
        Assert.Contains("<s>obsolete</s>", html);
        Assert.Contains("class=\"sc-ai-rich-text__inline-code\"", html);
        Assert.Contains("<blockquote", html);
        Assert.Contains("<ul", html);
        Assert.Contains("type=\"checkbox\"", html);
        Assert.Contains("<pre", html);
        Assert.Contains("<table", html);
        Assert.Contains("href=\"https://example.com/docs\"", html);
        Assert.DoesNotContain("href=\"javascript:", html);
        Assert.Contains("&lt;script&gt;alert(", html);
        Assert.Contains("&lt;/script&gt;", html);
        Assert.DoesNotContain("<script>", html);
    }

    [Fact]
    public async Task StreamingRichTextContent_ReplacesHeterogeneousSiblings()
    {
        var gate = new TaskCompletionSource();
        var cut = RenderMessageList(ct => EmitStreamingRichTextResponse(gate.Task, ct));
        var context = GetAgentContext(cut);

        var sendTask = cut.InvokeAsync(() => context.SendMessageAsync("Format this"));

        await WaitForHtmlAsync(cut, "Initial paragraph");
        var initialHtml = cut.GetHtml();
        Assert.Contains("<p", initialHtml);
        Assert.DoesNotContain("Final heading", initialHtml);

        gate.SetResult();
        await sendTask;

        var finalHtml = cut.GetHtml();
        Assert.Contains("<h3", finalHtml);
        Assert.Contains("Final heading", finalHtml);
        Assert.Contains("<ul", finalHtml);
        Assert.Contains("Final list item", finalHtml);
        Assert.DoesNotContain("Initial paragraph", finalHtml);
    }

    [Theory]
    [InlineData(TableColumnAlignment.Left, "sc-ai-rich-text__table-cell--left")]
    [InlineData(TableColumnAlignment.Center, "sc-ai-rich-text__table-cell--center")]
    [InlineData(TableColumnAlignment.Right, "sc-ai-rich-text__table-cell--right")]
    public async Task RichTextTable_ReusesDefinedAlignmentClasses(
        TableColumnAlignment alignment, string expectedClass)
    {
        var table = CreateTable(
            [alignment, alignment, alignment],
            ["r1c1", "r1c2", "r1c3"],
            ["r2c1", "r2c2", "r2c3"]);
        var cut = RenderMessageList(_ => EmitTableResponse(table));
        var context = GetAgentContext(cut);

        await cut.InvokeAsync(() => context.SendMessageAsync("Render the table"));

        var cells = GetTableCells(cut);
        Assert.Equal(["r1c1", "r1c2", "r1c3", "r2c1", "r2c2", "r2c3"],
            cells.Select(cell => cell.Text));
        Assert.All(cells, cell => Assert.Equal(expectedClass, cell.ClassName));
        for (var index = 1; index < cells.Length; index++)
        {
            Assert.Same(cells[0].ClassName, cells[index].ClassName);
        }
    }

    [Fact]
    public async Task RichTextTable_PreservesNoneMissingAndUndefinedAlignments()
    {
        var table = CreateTable(
            [TableColumnAlignment.None, (TableColumnAlignment)(-1), (TableColumnAlignment)42],
            ["none", "negative", "positive", "missing"]);
        table.AddChild(new TextNode("Ignored non-row"));
        ((TableRowNode)table.Children[0]).AddChild(new TextNode("Ignored non-cell"));
        var cut = RenderMessageList(_ => EmitTableResponse(table));
        var context = GetAgentContext(cut);

        await cut.InvokeAsync(() => context.SendMessageAsync("Render the table"));

        (string Text, string? ClassName)[] expected =
        [
            ("none", null),
            ("negative", "sc-ai-rich-text__table-cell---1"),
            ("positive", "sc-ai-rich-text__table-cell--42"),
            ("missing", null),
        ];
        Assert.Equal(expected, GetTableCells(cut));
        Assert.DoesNotContain("Ignored", cut.GetHtml());
    }

    [Theory]
    [InlineData(TableColumnAlignment.None, "sc-ai-rich-text__table-cell--none")]
    [InlineData((TableColumnAlignment)42, "sc-ai-rich-text__table-cell--42")]
    public async Task RichTextTable_FormatsTheSecondAlignmentRead(
        TableColumnAlignment secondAlignment, string expectedClass)
    {
        var alignment = new ChangingTableAlignment(secondAlignment);
        var table = CreateTable(alignment, ["cell"]);
        var cut = RenderMessageList(_ => EmitTableResponse(table));
        var context = GetAgentContext(cut);

        await cut.InvokeAsync(() => context.SendMessageAsync("Render the table"));

        var cell = Assert.Single(GetTableCells(cut));
        Assert.Equal("cell", cell.Text);
        Assert.Equal(expectedClass, cell.ClassName);
        Assert.Equal(2 * alignment.CountReads, alignment.ValueReads);
    }

    [Fact]
    public void EmptyConversation_RendersEmptyContent()
    {
        var cut = RenderMessageList(
            _ => ResponseEmitters.EmitTextResponse("unused"),
            emptyContent: builder => builder.AddMarkupContent(0, "<p>Nothing here yet</p>"));

        Assert.Contains("Nothing here yet", cut.GetHtml());
    }

    [Fact]
    public async Task Error_RendersRetryAffordance()
    {
        var cut = RenderMessageList(_ =>
            ResponseEmitters.EmitErrorAfterTokens([], new InvalidOperationException("boom")));
        var context = GetAgentContext(cut);

        await cut.InvokeAsync(() => context.SendMessageAsync("Hi"));

        var html = cut.GetHtml();
        Assert.Contains("sc-ai-error", html);
        Assert.Contains("type=\"button\"", html);
        Assert.Contains("Retry", html);
    }

    [Fact]
    public void MostRecentlyRegisteredBlockRenderer_Wins()
    {
        var context = new MessageListContext();
        RenderFragment first = _ => { };
        RenderFragment second = _ => { };
        context.AddRegistration(new BlockRendererRegistration
        {
            BlockType = typeof(RichContentBlock),
            When = null,
            Render = _ => first,
        });
        context.AddRegistration(new BlockRendererRegistration
        {
            BlockType = typeof(RichContentBlock),
            When = null,
            Render = _ => second,
        });

        var result = context.RenderBlock(new RichContentBlock());

        Assert.Same(second, result);
    }

    [Fact]
    public void BlockRenderer_WithoutChildContent_Throws()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            RenderMessageList(
                _ => ResponseEmitters.EmitTextResponse("unused"),
                childContent: builder =>
                {
                    builder.OpenComponent<BlockRenderer<RichContentBlock>>(0);
                    builder.CloseComponent();
                }));

        Assert.Equal("BlockRenderer requires child content.", exception.Message);
    }

    private static RenderedComponent<AgentBoundary> RenderMessageList(
        Func<CancellationToken, IAsyncEnumerable<ChatResponseUpdate>> respond,
        RenderFragment? emptyContent = null,
        RenderFragment? childContent = null)
    {
        var client = new DelegatingStreamingChatClient();
        client.SetHandler((msgs, opts, ct) => respond(ct));
        var agent = new UIAgent(client);

        var renderer = new TestRenderer();
        return renderer.RenderComponent<AgentBoundary>(p =>
        {
            p["Agent"] = agent;
            p["ChildContent"] = (RenderFragment)(builder =>
            {
                builder.OpenComponent<MessageList>(0);
                if (emptyContent is not null)
                {
                    builder.AddComponentParameter(1, "EmptyContent", emptyContent);
                }
                if (childContent is not null)
                {
                    builder.AddComponentParameter(2, "ChildContent", childContent);
                }
                builder.CloseComponent();
            });
        });
    }

    private static async IAsyncEnumerable<ChatResponseUpdate> EmitRichTextResponse()
    {
        var heading = Node<HeadingNode>(new TextNode("Components.AI"));
        heading.Level = 2;
        var paragraph = Node<ParagraphNode>(
            new TextNode("Render "),
            Node<StrongNode>(new TextNode("structured")),
            new TextNode(" "),
            Node<EmphasisNode>(new TextNode("rich text")),
            new TextNode(" and "),
            Node<StrikethroughNode>(new TextNode("obsolete")),
            new TextNode(" markup with "),
            new InlineCodeNode("C#"),
            new TextNode("."));
        var safeLink = new LinkNode("https://example.com/docs");
        safeLink.AddChild(new TextNode("Documentation"));
        var unsafeLink = new LinkNode("javascript:alert('unsafe')");
        unsafeLink.AddChild(new TextNode("Unsafe"));
        var list = new ListNode();
        list.AddChild(Node<ListItemNode>(Node<ParagraphNode>(new TextNode("First item"))));
        var checkedItem = Node<ListItemNode>(Node<ParagraphNode>(new TextNode("Completed item")));
        checkedItem.Checked = true;
        list.AddChild(checkedItem);
        var table = new TableNode
        {
            Alignment = [TableColumnAlignment.Left, TableColumnAlignment.Right],
        };
        table.AddChild(Node<TableRowNode>(
            Node<TableCellNode>(new TextNode("Feature")),
            Node<TableCellNode>(new TextNode("Status"))));

        yield return new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "rich-text",
            Contents =
            [
                new RichTextContent(
                    "Components.AI structured rich text",
                    [
                        heading,
                        paragraph,
                        Node<BlockQuoteNode>(
                            Node<ParagraphNode>(new TextNode("Streaming snapshot"))),
                        list,
                        new CodeBlockNode("Console.WriteLine(\"Hello\");", "csharp"),
                        safeLink,
                        unsafeLink,
                        table,
                        new HtmlNode("<script>alert('unsafe')</script>"),
                    ]),
            ],
        };

        await Task.CompletedTask;
    }

    private static async IAsyncEnumerable<ChatResponseUpdate> EmitStreamingRichTextResponse(
        Task gate,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        yield return new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "streaming-rich-text",
            Contents =
            [
                new RichTextContent(
                    "Initial paragraph",
                    [Node<ParagraphNode>(new TextNode("Initial paragraph"))]),
            ],
        };

        await gate.WaitAsync(cancellationToken);

        var heading = Node<HeadingNode>(new TextNode("Final heading"));
        heading.Level = 3;
        yield return new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "streaming-rich-text",
            Contents =
            [
                new RichTextContent(
                    "Final heading\n\nFinal list item",
                    [
                        heading,
                        Node<ListNode>(
                            Node<ListItemNode>(
                                Node<ParagraphNode>(new TextNode("Final list item")))),
                    ]),
            ],
        };
    }

    private static async IAsyncEnumerable<ChatResponseUpdate> EmitTableResponse(TableNode table)
    {
        yield return new ChatResponseUpdate
        {
            Role = ChatRole.Assistant,
            MessageId = "table-alignment",
            Contents = [new RichTextContent("Structured table", [table])],
        };

        await Task.CompletedTask;
    }

    private static TableNode CreateTable(
        IReadOnlyList<TableColumnAlignment> alignment, params string[][] rows)
    {
        var table = new TableNode { Alignment = alignment };
        foreach (var row in rows)
        {
            table.AddChild(Node<TableRowNode>(
                row.Select(text => Node<TableCellNode>(new TextNode(text))).ToArray()));
        }

        return table;
    }

    private static (string Text, string? ClassName)[] GetTableCells(
        RenderedComponent<AgentBoundary> cut)
    {
        var frames = cut.FindComponent<MessageList>()
            .FindComponent<CascadingValue<MessageListContext>>().GetFrames();
        var cells = new List<(string Text, string? ClassName)>();
        for (var index = 0; index < frames.Count; index++)
        {
            var frame = frames.Array[index];
            if (frame.FrameType is not RenderTreeFrameType.Element || frame.ElementName != "td")
            {
                continue;
            }

            var text = string.Empty;
            string? className = null;
            for (var childIndex = index + 1; childIndex < index + frame.ElementSubtreeLength; childIndex++)
            {
                var child = frames.Array[childIndex];
                if (child.FrameType is RenderTreeFrameType.Attribute && child.AttributeName == "class")
                {
                    className = Assert.IsType<string>(child.AttributeValue);
                }
                else if (child.FrameType is RenderTreeFrameType.Text)
                {
                    text += child.TextContent;
                }
            }
            cells.Add((text, className));
        }

        return [.. cells];
    }

    private sealed class ChangingTableAlignment(TableColumnAlignment secondAlignment)
        : IReadOnlyList<TableColumnAlignment>
    {
        public int CountReads { get; private set; }
        public int ValueReads { get; private set; }

        public int Count
        {
            get
            {
                CountReads++;
                return 1;
            }
        }

        public TableColumnAlignment this[int index]
        {
            get
            {
                if (index != 0)
                {
                    throw new ArgumentOutOfRangeException(nameof(index));
                }

                ValueReads++;
                return ValueReads % 2 == 1 ? TableColumnAlignment.Left : secondAlignment;
            }
        }

        public IEnumerator<TableColumnAlignment> GetEnumerator()
        {
            yield return this[0];
        }

        System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
    }

    private static TNode Node<TNode>(params RichTextNode[] children)
        where TNode : RichTextNode, new()
    {
        var node = new TNode();
        foreach (var child in children)
        {
            node.AddChild(child);
        }

        return node;
    }

    private static async Task WaitForHtmlAsync(
        RenderedComponent<AgentBoundary> cut, string expected)
    {
        for (var i = 0; i < 100; i++)
        {
            if (cut.GetHtml().Contains(expected, StringComparison.Ordinal))
            {
                return;
            }

            await Task.Delay(20);
        }

        Assert.Fail($"Timed out waiting for '{expected}' to render. Current markup: {cut.GetHtml()}");
    }

    private static AgentContext GetAgentContext(RenderedComponent<AgentBoundary> cut)
    {
        return (AgentContext)typeof(AgentBoundary)
            .GetField("_context", BindingFlags.NonPublic | BindingFlags.Instance)!
            .GetValue(cut.Instance)!;
    }

    private static int CountOccurrences(string text, string pattern)
    {
        var count = 0;
        var index = 0;
        while ((index = text.IndexOf(pattern, index, StringComparison.Ordinal)) >= 0)
        {
            count++;
            index += pattern.Length;
        }

        return count;
    }
}
