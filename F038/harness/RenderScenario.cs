// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;
using System.Runtime.ExceptionServices;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

/// <summary>Prepared key families; no instrumented key participates in timing.</summary>
public enum KeyKind { Integer, String }

/// <summary>Complete actual-renderer workloads and the unchanged unkeyed control.</summary>
public enum WorkloadKind { KeyedStable, KeyedReorder, KeyedReplace, MixedKeyedUnkeyed, UnkeyedStable }

internal sealed record Item(int Id, string IdText, string Label, object? Key);
internal sealed record FrameRecord(int Index, int Sequence, string Type, string? Name, string? Key, string? Value, int SubtreeLength);
internal sealed record EditRecord(string Type, int SiblingIndex, int? ReferenceFrameIndex, int? MoveToSiblingIndex, string? RemovedAttributeName);
internal sealed record ComponentDiffRecord(int ComponentId, EditRecord[] Edits);
internal sealed record BatchRecord(ComponentDiffRecord[] UpdatedComponents, FrameRecord[] ReferenceFrames, int[] DisposedComponents, ulong[] DisposedEvents);

internal sealed class RenderScenario : IDisposable
{
    private readonly ProbeRenderer _renderer;
    private readonly ListComponent _component;
    private readonly Item[][] _versions;
    private readonly Action _advance;
    private int _version;

    public static readonly int[] Counts = [0, 1, 16, 256];
    public static readonly KeyKind[] KeyKinds = [KeyKind.Integer, KeyKind.String];
    public static readonly WorkloadKind[] Workloads = Enum.GetValues<WorkloadKind>();
    public string Profile { get; }
    public long Batches => _renderer.Batches;
    public IReadOnlyList<BatchRecord> History => _renderer.History;
    public Item[] CurrentItems => _component.Items;

    public RenderScenario(int count, KeyKind keys, WorkloadKind workload, bool capture)
        : this(CreateItems(count, 0, keys, workload), CreateRight(count, keys, workload), capture,
            $"{workload}:{keys}:{count}")
    {
    }

    public RenderScenario(Item[] left, Item[] right, bool capture, string profile)
    {
        Profile = profile;
        _versions = [left, right];
        _component = new ListComponent { Items = left };
        _renderer = new ProbeRenderer(capture);
        _advance = Advance;
        Evidence.Complete(_renderer.InitializeAsync(_component));
        Validate();
    }

    public static Item[] CreateItems(int count, int start, KeyKind keys, WorkloadKind workload)
        => Enumerable.Range(start, count).Select(id =>
        {
            var text = id.ToString(CultureInfo.InvariantCulture);
            var keyed = workload != WorkloadKind.UnkeyedStable &&
                (workload != WorkloadKind.MixedKeyedUnkeyed || id % 2 == 0);
            object? key = !keyed ? null : keys == KeyKind.Integer ? id : "row-key-" + text.PadLeft(8, '0');

            return new Item(id, text, "Row " + text, key);
        }).ToArray();

    private static Item[] CreateRight(int count, KeyKind keys, WorkloadKind workload)
    {
        var original = CreateItems(count, 0, keys, workload);

        return workload switch
        {
            WorkloadKind.KeyedReorder or WorkloadKind.MixedKeyedUnkeyed => original.Reverse().ToArray(),
            WorkloadKind.KeyedReplace => CreateItems(count, count + 17, keys, workload),
            _ => original,
        };
    }

    public Task RenderNextAsync() => _renderer.Dispatcher.InvokeAsync(_advance);

    public void RenderItems(Item[] items)
    {
        Evidence.Complete(_renderer.Dispatcher.InvokeAsync(() =>
        {
            _component.Items = items;
            _component.Render();
        }));
    }

    private void Advance()
    {
        _version ^= 1;
        _component.Items = _versions[_version];
        _component.Render();
    }

    public FrameRecord[] Snapshot() => CaptureFrames(_renderer.CurrentFrames());

    public void Validate()
    {
        var frames = _renderer.CurrentFrames();
        var items = _component.Items;
        Evidence.Require(frames.Count == 1 + items.Length * 3 && frames.Array[0].ElementName == "ul" &&
            frames.Array[0].ElementSubtreeLength == frames.Count, "Actual root frame extent differs: " + Profile);
        for (var index = 0; index < items.Length; index++)
        {
            var offset = 1 + 3 * index;
            ref var element = ref frames.Array[offset];
            ref var attribute = ref frames.Array[offset + 1];
            ref var text = ref frames.Array[offset + 2];
            var expected = items[index];
            Evidence.Require(element.FrameType == RenderTreeFrameType.Element && element.ElementName == "li" &&
                element.ElementSubtreeLength == 3 && Equals(element.ElementKey, expected.Key) &&
                attribute.FrameType == RenderTreeFrameType.Attribute && attribute.AttributeName == "data-id" &&
                Equals(attribute.AttributeValue, expected.IdText) && text.FrameType == RenderTreeFrameType.Text &&
                text.TextContent == expected.Label, "Actual complete rendered order/key/data differs: " + Profile + ":" + index);
        }
    }

    internal static FrameRecord[] CaptureFrames(ArrayRange<RenderTreeFrame> range)
        => Enumerable.Range(0, range.Count).Select(index =>
        {
            ref var frame = ref range.Array[index];

            return frame.FrameType switch
            {
                RenderTreeFrameType.Element => new FrameRecord(index, frame.Sequence, frame.FrameType.ToString(),
                    frame.ElementName, KeyText(frame.ElementKey), null, frame.ElementSubtreeLength),
                RenderTreeFrameType.Attribute => new FrameRecord(index, frame.Sequence, frame.FrameType.ToString(),
                    frame.AttributeName, null, Convert.ToString(frame.AttributeValue, CultureInfo.InvariantCulture), 0),
                RenderTreeFrameType.Text => new FrameRecord(index, frame.Sequence, frame.FrameType.ToString(),
                    null, null, frame.TextContent, 0),
                _ => throw new InvalidOperationException("Unexpected actual fixture frame type: " + frame.FrameType),
            };
        }).ToArray();

    private static string? KeyText(object? key) => key switch
    {
        null => null,
        int value => "int:" + value.ToString(CultureInfo.InvariantCulture),
        string value => "string:" + value,
        ProbeKey value => "probe:" + value.Id.ToString(CultureInfo.InvariantCulture),
        _ => throw new InvalidOperationException("Unexpected actual fixture key type."),
    };

    public void Dispose()
    {
        Evidence.Complete(_renderer.Dispatcher.InvokeAsync(_renderer.Dispose));
    }

    private sealed class ListComponent : IComponent
    {
        private RenderHandle _handle;
        private readonly RenderFragment _fragment;
        public Item[] Items { get; set; } = [];

        public ListComponent()
        {
            _fragment = Build;
        }

        public void Attach(RenderHandle renderHandle) => _handle = renderHandle;
        public Task SetParametersAsync(ParameterView parameters)
        {
            foreach (var parameter in parameters)
            {
                throw new InvalidOperationException("Unexpected prepared fixture parameter: " + parameter.Name);
            }
            Render();

            return Task.CompletedTask;
        }

        public void Render() => _handle.Render(_fragment);

        private void Build(RenderTreeBuilder builder)
        {
            builder.OpenElement(0, "ul");
            foreach (var item in Items)
            {
                builder.OpenElement(1, "li");
                if (item.Key is not null)
                {
                    builder.SetKey(item.Key);
                }
                builder.AddAttribute(2, "data-id", item.IdText);
                builder.AddContent(3, item.Label);
                builder.CloseElement();
            }
            builder.CloseElement();
        }
    }

    private sealed class ProbeRenderer(bool capture) : Renderer(EmptyServices.Instance, NullLoggerFactory.Instance)
    {
        private int _rootId;
        public override Dispatcher Dispatcher { get; } = Dispatcher.CreateDefault();
        public long Batches { get; private set; }
        public List<BatchRecord> History { get; } = [];
        public ArrayRange<RenderTreeFrame> CurrentFrames() => GetCurrentRenderTreeFrames(_rootId);

        public Task InitializeAsync(IComponent component) => Dispatcher.InvokeAsync(() =>
        {
            _rootId = AssignRootComponentId(component);

            return RenderRootComponentAsync(_rootId);
        });

        protected override void HandleException(Exception exception) => ExceptionDispatchInfo.Capture(exception).Throw();

        protected override Task UpdateDisplayAsync(in RenderBatch renderBatch)
        {
            Batches++;
            if (capture)
            {
                var diffs = new List<ComponentDiffRecord>();
                for (var index = 0; index < renderBatch.UpdatedComponents.Count; index++)
                {
                    var diff = renderBatch.UpdatedComponents.Array[index];
                    var edits = new List<EditRecord>();
                    for (var editIndex = 0; editIndex < diff.Edits.Count; editIndex++)
                    {
                        var edit = diff.Edits.Array[diff.Edits.Offset + editIndex];
                        edits.Add(new(edit.Type.ToString(), edit.SiblingIndex,
                            edit.Type is RenderTreeEditType.PrependFrame or RenderTreeEditType.UpdateText or
                                RenderTreeEditType.UpdateMarkup or RenderTreeEditType.SetAttribute ? edit.ReferenceFrameIndex : null,
                            edit.Type == RenderTreeEditType.PermutationListEntry ? edit.MoveToSiblingIndex : null,
                            edit.Type == RenderTreeEditType.RemoveAttribute ? edit.RemovedAttributeName : null));
                    }
                    diffs.Add(new(diff.ComponentId, edits.ToArray()));
                }
                History.Add(new(diffs.ToArray(), CaptureFrames(renderBatch.ReferenceFrames),
                    renderBatch.DisposedComponentIDs.Array.Take(renderBatch.DisposedComponentIDs.Count).ToArray(),
                    renderBatch.DisposedEventHandlerIDs.Array.Take(renderBatch.DisposedEventHandlerIDs.Count).ToArray()));
            }

            return Task.CompletedTask;
        }
    }

    private sealed class EmptyServices : IServiceProvider
    {
        public static EmptyServices Instance { get; } = new();
        public object? GetService(Type serviceType) => null;
    }
}

internal sealed class ProbeCounter
{
    public long HashCalls;
}

internal sealed class ProbeKey(int id, bool collide, ProbeCounter counter)
{
    public int Id { get; } = id;
    public override int GetHashCode()
    {
        counter.HashCalls++;

        return collide ? 0 : Id;
    }

    public override bool Equals(object? obj) => obj is ProbeKey key && key.Id == Id;
    public override string ToString() => "probe-key-" + Id.ToString(CultureInfo.InvariantCulture);
}
