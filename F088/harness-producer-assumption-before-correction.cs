using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.AI;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

public class TableClassBenchmark
{
    private TableFixture _fixture = null!;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    public IEnumerable<string> Cases => TableFixture.Definitions.Select(definition => definition.Name);

    [GlobalSetup]
    public async Task Setup()
    {
        _fixture = new TableFixture(Case);
        await _fixture.InitializeAsync();
    }

    [Benchmark]
    public int PreparedRenderBlock() => _fixture.RenderPrepared();

    [Benchmark]
    public Task<int> ProviderComponentHtml() => _fixture.RunComponentAsync(custom: false);

    [Benchmark]
    public Task<int> CustomProviderComponentHtml() => _fixture.RunComponentAsync(custom: true);

    [GlobalCleanup]
    public void Cleanup() => _fixture.Dispose();
}

public sealed record TableDefinition(
    string Name, int Rows, int Columns, TableColumnAlignment[] Alignment, bool Plain = false);
public sealed record CellState(string Text, string? ClassName);
public sealed record PreparedState(
    int Calls, int Updates, int Blocks, string BlockType, string Lifecycle,
    int Frames, CellState[] Cells, int CountReads, int ValueReads);
public sealed record ComponentState(
    int Calls, int Updates, string HtmlSha256, int Rows, int Cells, int Classes,
    bool Complete, bool UserPresent, bool CustomPresent, int CountReads, int ValueReads);
public sealed record CaseState(
    string Case, PreparedState Prepared, ComponentState DefaultComponent, ComponentState CustomComponent);

public sealed class TableFixture : IDisposable
{
    public static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    public static readonly TableDefinition[] Definitions =
    [
        new("Left2x3", 2, 3, [TableColumnAlignment.Left, TableColumnAlignment.Left, TableColumnAlignment.Left]),
        new("Center2x3", 2, 3, [TableColumnAlignment.Center, TableColumnAlignment.Center, TableColumnAlignment.Center]),
        new("Right2x3", 2, 3, [TableColumnAlignment.Right, TableColumnAlignment.Right, TableColumnAlignment.Right]),
        new("Mixed8x3", 8, 3, [TableColumnAlignment.Left, TableColumnAlignment.Center, TableColumnAlignment.Right]),
        new("Mixed32x8", 32, 8,
            [TableColumnAlignment.Left, TableColumnAlignment.Center, TableColumnAlignment.Right, TableColumnAlignment.Left,
             TableColumnAlignment.Center, TableColumnAlignment.Right, TableColumnAlignment.Left, TableColumnAlignment.Right]),
        new("SparseMixed8x7", 8, 7,
            [TableColumnAlignment.None, TableColumnAlignment.Left, TableColumnAlignment.Center,
             TableColumnAlignment.Right, (TableColumnAlignment)(-1), (TableColumnAlignment)42]),
        new("None8x3", 8, 3, [TableColumnAlignment.None, TableColumnAlignment.None, TableColumnAlignment.None]),
        new("Missing8x3", 8, 3, []),
        new("Negative8x3", 8, 3,
            [(TableColumnAlignment)(-1), (TableColumnAlignment)(-1), (TableColumnAlignment)(-1)]),
        new("Positive8x3", 8, 3,
            [(TableColumnAlignment)42, (TableColumnAlignment)42, (TableColumnAlignment)42]),
        new("PlainParagraph", 0, 0, [], Plain: true),
    ];

    private readonly TableDefinition _definition;
    private readonly ServiceProvider _services = new ServiceCollection().BuildServiceProvider();
    private readonly MessageListContext _context = new();
    private readonly RenderTreeBuilder _builder = new();
    private readonly AIContent _content;
    private ContentBlock _prepared = null!;

    public TableFixture(string name)
    {
        _definition = Definitions.Single(definition => definition.Name == name);
        _content = CreateContent(observe: false, out _);
    }

    public async Task InitializeAsync()
    {
        var client = new SnapshotClient(_content);
        using (var agent = new UIAgent(client))
        {
            var blocks = await ProduceAsync(agent);
            if (blocks.Length != 1 || blocks[0] is not RichContentBlock ||
                blocks[0].LifecycleState != BlockLifecycleState.Inactive || string.IsNullOrEmpty(blocks[0].Id) ||
                client.Calls != 1 || client.Updates != 1)
            {
                throw new InvalidOperationException(
                    $"Actual prepared producer did not supply one complete block: {_definition.Name}; " +
                    JsonSerializer.Serialize(new { client.Calls, client.Updates, blocks = blocks.Select(block => new
                    {
                        type = block.GetType().Name, block.Id, lifecycle = block.LifecycleState.ToString(),
                    }) }));
            }
            _prepared = blocks[0];
        }
        RenderPrepared();

        var oracles = JsonSerializer.Deserialize<CaseState[]>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "contract-oracles.json")))
            ?? throw new InvalidOperationException("Original producer/render oracles are absent.");
        var expected = oracles.Single(state => state.Case == _definition.Name);
        var actual = await CaptureAsync();
        if (JsonSerializer.Serialize(actual) != JsonSerializer.Serialize(expected))
        {
            Console.Error.WriteLine("Expected: " + JsonSerializer.Serialize(expected));
            Console.Error.WriteLine("Actual: " + JsonSerializer.Serialize(actual));
            throw new InvalidOperationException($"Actual producer/render contract changed: {_definition.Name}");
        }

        var owner = Convert.ToHexString(SHA256.HashData(
            File.ReadAllBytes(typeof(MessageListContext).Assembly.Location)));
        Console.WriteLine("F088 state: " + JsonSerializer.Serialize(new { owner_sha256 = owner, state = actual }));
        var stateDirectory = Environment.GetEnvironmentVariable("AUTOPERF_STATE_DIRECTORY");
        if (stateDirectory is not null)
        {
            Directory.CreateDirectory(stateDirectory);
            File.WriteAllText(
                Path.Combine(stateDirectory, $"{_definition.Name}-{Environment.ProcessId}-{Guid.NewGuid():N}.json"),
                JsonSerializer.Serialize(new { owner_sha256 = owner, state = actual }, JsonOptions));
        }
    }

    public int RenderPrepared()
    {
        _builder.Clear();
        _context.RenderBlock(_prepared)(_builder);

        return _builder.GetFrames().Count;
    }

    public async Task<int> RunComponentAsync(bool custom)
    {
        var client = new SnapshotClient(_content);
        var html = await RenderComponentAsync(client, custom);

        return html.Length;
    }

    public async Task<CaseState> CaptureAsync()
    {
        var content = CreateContent(observe: true, out var preparedReads);
        var client = new SnapshotClient(content);
        using var agent = new UIAgent(client);
        var blocks = await ProduceAsync(agent);
        if (blocks.Length != 1 || blocks[0] is not RichContentBlock rich ||
            rich.LifecycleState != BlockLifecycleState.Inactive || string.IsNullOrEmpty(rich.Id) ||
            client.Calls != 1 || client.Updates != 1)
        {
            throw new InvalidOperationException(
                $"Actual provider/default mapping did not produce the expected block: {_definition.Name}; " +
                JsonSerializer.Serialize(new { client.Calls, client.Updates, blocks = blocks.Select(block => new
                {
                    type = block.GetType().Name, block.Id, lifecycle = block.LifecycleState.ToString(),
                }) }));
        }
        using var builder = new RenderTreeBuilder();
        new MessageListContext().RenderBlock(rich)(builder);
        var frames = builder.GetFrames();
        var cells = ReadCells(frames);
        VerifyCells(cells);
        if (!_definition.Plain && preparedReads?.CountReads != _definition.Rows * _definition.Columns)
        {
            throw new InvalidOperationException("Prepared timing owner did not traverse every actual table cell exactly once.");
        }
        var prepared = new PreparedState(
            client.Calls, client.Updates, blocks.Length, rich.GetType().Name, rich.LifecycleState.ToString(),
            frames.Count, cells, preparedReads?.CountReads ?? 0, preparedReads?.ValueReads ?? 0);
        var normal = await CaptureComponentAsync(custom: false);
        var custom = await CaptureComponentAsync(custom: true);

        return new CaseState(_definition.Name, prepared, normal, custom);
    }

    private async Task<ComponentState> CaptureComponentAsync(bool custom)
    {
        var content = CreateContent(observe: true, out var reads);
        var client = new SnapshotClient(content);
        var html = await RenderComponentAsync(client, custom);
        var rowCount = Regex.Matches(html, "<tr>").Count;
        var cellCount = Regex.Matches(html, "<td(?:>|\\s)").Count;
        var classCount = Regex.Matches(html, "class=\"sc-ai-rich-text__table-cell--").Count;
        var customPresent = html.Contains("f088-custom-block", StringComparison.Ordinal);
        var complete = !html.Contains("sc-ai-message__content--streaming", StringComparison.Ordinal);
        var userPresent = html.Contains(custom ? "f088-custom-block" : "render table", StringComparison.Ordinal);
        var expectedCells = custom || _definition.Plain ? 0 : _definition.Rows * _definition.Columns;
        if (client.Calls != 1 || client.Updates != 1 || !complete || !userPresent ||
            rowCount != (custom || _definition.Plain ? 0 : _definition.Rows) || cellCount != expectedCells ||
            classCount != (custom ? 0 : ExpectedCells().Count(cell => cell.ClassName is not null)) ||
            customPresent != custom || (custom && reads is { CountReads: not 0 }))
        {
            throw new InvalidOperationException(
                $"Actual component/registration producer did not reach the expected material boundary: {_definition.Name}/{custom}");
        }
        if (!custom && !_definition.Plain &&
            (reads is null || reads.CountReads == 0 || reads.CountReads % expectedCells != 0))
        {
            throw new InvalidOperationException("Actual MessageList did not invoke the table owner for complete cell passes.");
        }
        if (!custom && _definition.Plain && !html.Contains("plain response", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("The real plain-text control did not reach its paragraph output.");
        }

        return new ComponentState(
            client.Calls, client.Updates, Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(html))),
            rowCount, cellCount, classCount, complete, userPresent, customPresent,
            reads?.CountReads ?? 0, reads?.ValueReads ?? 0);
    }

    private async Task<string> RenderComponentAsync(SnapshotClient client, bool custom)
    {
        using var agent = new UIAgent(client);
        await using var renderer = new HtmlRenderer(_services, NullLoggerFactory.Instance);

        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var root = await renderer.RenderComponentAsync<ConversationRoot>(
                ParameterView.FromDictionary(new Dictionary<string, object?>
                {
                    [nameof(ConversationRoot.Agent)] = agent,
                    [nameof(ConversationRoot.Custom)] = custom,
                }));

            return root.ToHtmlString();
        });
    }

    private AIContent CreateContent(bool observe, out AlignmentReads? reads)
    {
        reads = null;
        if (_definition.Plain)
        {
            return new TextContent("plain response");
        }
        IReadOnlyList<TableColumnAlignment> alignment = _definition.Alignment;
        if (observe)
        {
            reads = new AlignmentReads(_definition.Alignment);
            alignment = reads;
        }
        var table = new TableNode { Alignment = alignment };
        for (var rowIndex = 0; rowIndex < _definition.Rows; rowIndex++)
        {
            var row = new TableRowNode();
            for (var columnIndex = 0; columnIndex < _definition.Columns; columnIndex++)
            {
                var cell = new TableCellNode();
                cell.AddChild(new TextNode($"r{rowIndex + 1}c{columnIndex + 1}"));
                row.AddChild(cell);
            }
            table.AddChild(row);
        }

        return new RichTextContent("Structured table", [table]);
    }

    private CellState[] ExpectedCells()
    {
        var cells = new List<CellState>();
        for (var rowIndex = 0; rowIndex < _definition.Rows; rowIndex++)
        {
            for (var columnIndex = 0; columnIndex < _definition.Columns; columnIndex++)
            {
                string? css = null;
                if (columnIndex < _definition.Alignment.Length)
                {
                    css = _definition.Alignment[columnIndex] switch
                    {
                        TableColumnAlignment.None => null,
                        TableColumnAlignment.Left => "sc-ai-rich-text__table-cell--left",
                        TableColumnAlignment.Center => "sc-ai-rich-text__table-cell--center",
                        TableColumnAlignment.Right => "sc-ai-rich-text__table-cell--right",
                        (TableColumnAlignment)(-1) => "sc-ai-rich-text__table-cell---1",
                        (TableColumnAlignment)42 => "sc-ai-rich-text__table-cell--42",
                        _ => throw new InvalidOperationException("No independent literal oracle for this fixture alignment."),
                    };
                }
                cells.Add(new CellState($"r{rowIndex + 1}c{columnIndex + 1}", css));
            }
        }

        return [.. cells];
    }

    private void VerifyCells(CellState[] actual)
    {
        if (!actual.SequenceEqual(ExpectedCells()))
        {
            throw new InvalidOperationException($"Exact cell text/classes differ from the independent fixture oracle: {_definition.Name}");
        }
    }

    private static CellState[] ReadCells(ArrayRange<RenderTreeFrame> frames)
    {
        var cells = new List<CellState>();
        for (var index = 0; index < frames.Count; index++)
        {
            var frame = frames.Array[index];
            if (frame.FrameType is not RenderTreeFrameType.Element || frame.ElementName != "td")
            {
                continue;
            }
            var text = string.Empty;
            string? css = null;
            for (var childIndex = index + 1; childIndex < index + frame.ElementSubtreeLength; childIndex++)
            {
                var child = frames.Array[childIndex];
                if (child.FrameType is RenderTreeFrameType.Attribute && child.AttributeName == "class")
                {
                    css = child.AttributeValue is string value
                        ? value : throw new InvalidOperationException("Actual cell class is not a string.");
                }
                else if (child.FrameType is RenderTreeFrameType.Text)
                {
                    text += child.TextContent;
                }
            }
            cells.Add(new CellState(text, css));
        }

        return [.. cells];
    }

    private static async Task<ContentBlock[]> ProduceAsync(UIAgent agent)
    {
        var blocks = new List<ContentBlock>();
        await foreach (var block in agent.SendMessageAsync(new ChatMessage(ChatRole.User, "render table")))
        {
            blocks.Add(block);
        }

        return [.. blocks];
    }

    public void Dispose()
    {
        _builder.Dispose();
        _services.Dispose();
    }
}

internal sealed class AlignmentReads(IReadOnlyList<TableColumnAlignment> values)
    : IReadOnlyList<TableColumnAlignment>
{
    public int CountReads { get; private set; }
    public int ValueReads { get; private set; }

    public int Count
    {
        get
        {
            CountReads++;
            return values.Count;
        }
    }

    public TableColumnAlignment this[int index]
    {
        get
        {
            ValueReads++;
            return values[index];
        }
    }

    public IEnumerator<TableColumnAlignment> GetEnumerator() => values.GetEnumerator();
    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}
