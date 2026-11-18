// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;
using System.Runtime.ExceptionServices;
using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

public enum BoundaryProfile
{
    PrerenderScalar1,
    NonPrerenderScalar1,
    PrerenderEmpty,
    PrerenderScalar4,
    PrerenderFragment1,
    PrerenderMixed4,
    PrerenderFragments8,
    NonPrerenderScalar4,
}

internal sealed class BoundaryScenario : IDisposable
{
    private readonly ServiceProvider _services;
    private readonly ProbeRenderer _renderer;
    private readonly DefaultHttpContext _context;
    private readonly IComponentRenderMode _mode;
    private readonly ParameterView _parameters;
    private readonly Func<int> _operation;
    private readonly bool _prerender;
    private long _operations;

    internal Dictionary<string, object?> Inputs { get; }
    internal long Created => _renderer.Created;
    internal long Disposed => _renderer.Disposed;

    internal BoundaryScenario(BoundaryProfile profile, string mode = "server", Dictionary<string, object?>? inputs = null)
    {
        _prerender = profile is not (BoundaryProfile.NonPrerenderScalar1 or BoundaryProfile.NonPrerenderScalar4);
        _mode = Mode(mode, _prerender);
        _services = new ServiceCollection().AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance)
            .AddSingleton<LifetimeCounter>().BuildServiceProvider();
        _context = new DefaultHttpContext { RequestServices = _services };
        _renderer = new ProbeRenderer(_services);
        Inputs = inputs ?? CreateInputs(profile);
        _parameters = ParameterView.FromDictionary(Inputs);
        _operation = RunCore;
    }

    internal static IComponentRenderMode Mode(string mode, bool prerender) => mode switch
    {
        "server" => new InteractiveServerRenderMode(prerender),
        "wasm" => new InteractiveWebAssemblyRenderMode(prerender),
        "auto" => new InteractiveAutoRenderMode(prerender),
        _ => throw new ArgumentException("Unknown characterization mode.", nameof(mode)),
    };

    internal static RenderFragment Fragment(int index, bool nested = false) => builder =>
    {
        builder.OpenElement(0, "b");
        builder.AddContent(1, "fragment-" + index.ToString(CultureInfo.InvariantCulture));
        if (nested)
        {
            builder.AddContent(2, Nested);
        }
        builder.CloseElement();
    };

    private static readonly RenderFragment Nested = builder =>
    {
        builder.OpenElement(0, "i");
        builder.AddContent(1, "nested-fragment");
        builder.CloseElement();
    };

    internal static Dictionary<string, object?> CreateInputs(BoundaryProfile profile) => profile switch
    {
        BoundaryProfile.PrerenderScalar1 or BoundaryProfile.NonPrerenderScalar1 => new()
        {
            [nameof(PayloadComponent.Label)] = "Scalar",
        },
        BoundaryProfile.PrerenderEmpty => new(),
        BoundaryProfile.PrerenderScalar4 or BoundaryProfile.NonPrerenderScalar4 => new()
        {
            [nameof(PayloadComponent.Label)] = "Scalar",
            [nameof(PayloadComponent.Number)] = 47,
            [nameof(PayloadComponent.Optional)] = null,
            [nameof(PayloadComponent.Enabled)] = true,
        },
        BoundaryProfile.PrerenderFragment1 => new()
        {
            [nameof(PayloadComponent.First)] = Fragment(0),
        },
        BoundaryProfile.PrerenderMixed4 => new()
        {
            [nameof(PayloadComponent.Label)] = "Scalar",
            [nameof(PayloadComponent.First)] = Fragment(0),
            [nameof(PayloadComponent.Optional)] = null,
            [nameof(PayloadComponent.Second)] = Fragment(1),
        },
        BoundaryProfile.PrerenderFragments8 => new()
        {
            [nameof(PayloadComponent.First)] = Fragment(0),
            [nameof(PayloadComponent.Second)] = Fragment(1),
            [nameof(PayloadComponent.Third)] = Fragment(2),
            [nameof(PayloadComponent.Fourth)] = Fragment(3),
            [nameof(PayloadComponent.Fifth)] = Fragment(4),
            [nameof(PayloadComponent.Sixth)] = Fragment(5),
            [nameof(PayloadComponent.Seventh)] = Fragment(6),
            [nameof(PayloadComponent.Eighth)] = Fragment(7),
        },
        _ => throw new ArgumentOutOfRangeException(nameof(profile)),
    };

    internal int Run() => _renderer.Dispatcher.InvokeAsync(_operation).GetAwaiter().GetResult();

    private int RunCore()
    {
        var boundary = BoundaryAccess.Create(_context, typeof(PayloadComponent), _mode);
        var root = _renderer.Attach(boundary);
        try
        {
            _renderer.Render(root, _parameters).GetAwaiter().GetResult();
            _operations++;

            return _renderer.Frames(root).Count;
        }
        finally
        {
            _renderer.Remove(root);
        }
    }

    internal Task<object> ObserveAsync(bool serialize) => _renderer.Dispatcher.InvokeAsync<object>(() =>
    {
        var beforeCreated = Created;
        var beforeDisposed = Disposed;
        var boundary = BoundaryAccess.Create(_context, typeof(PayloadComponent), _mode);
        var root = _renderer.Attach(boundary);
        object observation;
        try
        {
            _renderer.Render(root, _parameters).GetAwaiter().GetResult();
            _operations++;
            var snapshot = BoundaryAccess.Snapshot(boundary);
            Evidence.Require(snapshot.GetType() == typeof(Dictionary<string, object?>)
                && snapshot.Keys.SequenceEqual(Inputs.Keys), "Require the actual owned canonical snapshot and unchanged name order.");
            var wrappers = new HashSet<object>();
            foreach (var (name, value) in Inputs)
            {
                if (_prerender && value is RenderFragment)
                {
                    Evidence.Require(snapshot[name] is RenderFragment, "Every fragment must have a wrapper.");
                    var wrapper = (RenderFragment)snapshot[name]!;
                    Evidence.Require(!ReferenceEquals(wrapper, value) && wrapper.Target is not null
                        && wrapper.Target.GetType().Name == "RenderFragmentCapture" && wrappers.Add(wrapper.Target),
                        "Every top-level fragment must have its own actual capture.");
                }
                else
                {
                    Evidence.Require(ReferenceEquals(snapshot[name], value), "Scalar/null identity changed.");
                }
            }
            var frames = _renderer.Frames(root);
            var texts = new List<string>();
            if (_prerender)
            {
                Evidence.Require(frames.Count == Inputs.Count + 1
                    && frames.Array[0].FrameType == RenderTreeFrameType.Component
                    && frames.Array[0].Component is PayloadComponent, "Actual boundary must render its child with all parameters.");
                var child = (PayloadComponent)frames.Array[0].Component;
                Evidence.Require(child.Label == (Inputs.GetValueOrDefault(nameof(PayloadComponent.Label)) as string)
                    && child.Number == (Inputs.GetValueOrDefault(nameof(PayloadComponent.Number)) is int number ? number : 0)
                    && child.Optional is null
                    && child.Enabled == (Inputs.GetValueOrDefault(nameof(PayloadComponent.Enabled)) is true),
                    "Actual child parameter binding changed scalar/null values.");
                var childFrames = _renderer.Frames(frames.Array[0].ComponentId);
                for (var index = 0; index < childFrames.Count; index++)
                {
                    if (childFrames.Array[index].FrameType == RenderTreeFrameType.Text)
                    {
                        texts.Add(childFrames.Array[index].TextContent);
                    }
                }
                var fragments = Inputs.Values.OfType<RenderFragment>().Count();
                for (var index = 0; index < fragments; index++)
                {
                    Evidence.Require(texts.Contains("fragment-" + index.ToString(CultureInfo.InvariantCulture)),
                        "The real renderer must execute every supplied capture.");
                }
            }
            else
            {
                Evidence.Require(frames.Count == 0 && wrappers.Count == 0, "No-prerender is the unchanged non-rendering control.");
            }
            JsonElement? marker = null;
            if (serialize)
            {
                Evidence.Require(_mode is InteractiveWebAssemblyRenderMode, "This untimed marker adapter is for WebAssembly only.");
                var value = BoundaryAccess.Marker(boundary, _context);
                marker = JsonSerializer.SerializeToElement(value, value.GetType());
                Evidence.Require(marker.Value.GetProperty("Type").GetString() == "webassembly"
                    && (marker.Value.GetProperty("PrerenderId").ValueKind == JsonValueKind.String) == _prerender,
                    "Actual marker kind/prerender identity differs.");
                var definitions = JsonDocument.Parse(Convert.FromBase64String(marker.Value.GetProperty("ParameterDefinitions").GetString()!));
                using var values = JsonDocument.Parse(Convert.FromBase64String(marker.Value.GetProperty("ParameterValues").GetString()!));
                using (definitions)
                {
                    Evidence.Require(definitions.RootElement.GetArrayLength() == Inputs.Count
                        && values.RootElement.GetArrayLength() == Inputs.Count, "Every actual marker parameter must serialize.");
                }
            }
            observation = new { actualSnapshotNames = snapshot.Keys.ToArray(), actualDistinctCaptures = wrappers.Count,
                actualBoundaryFrames = frames.Count, actualRenderedTexts = texts, actualMarker = marker };
        }
        finally
        {
            _renderer.Remove(root);
        }
        Evidence.Require(Created - beforeCreated == (_prerender ? 1 : 0)
            && Disposed - beforeDisposed == (_prerender ? 1 : 0), "Every fresh real child must be removed and disposed.");

        return observation;
    });

    public void Dispose()
    {
        _renderer.Dispatcher.InvokeAsync(_renderer.Dispose).GetAwaiter().GetResult();
        _services.Dispose();
        Evidence.Require(Created == Disposed && Created == (_prerender ? _operations : 0),
            "The benchmark must not retain or accumulate renderer roots/children.");
    }

    public sealed class PayloadComponent : ComponentBase, IDisposable
    {
        [Inject] public LifetimeCounter Counter { get; set; } = null!;
        [Parameter] public string? Label { get; set; }
        [Parameter] public int Number { get; set; }
        [Parameter] public string? Optional { get; set; }
        [Parameter] public bool Enabled { get; set; }
        [Parameter] public RenderFragment? First { get; set; }
        [Parameter] public RenderFragment? Second { get; set; }
        [Parameter] public RenderFragment? Third { get; set; }
        [Parameter] public RenderFragment? Fourth { get; set; }
        [Parameter] public RenderFragment? Fifth { get; set; }
        [Parameter] public RenderFragment? Sixth { get; set; }
        [Parameter] public RenderFragment? Seventh { get; set; }
        [Parameter] public RenderFragment? Eighth { get; set; }

        protected override void OnInitialized() => Counter.Created++;

        protected override void BuildRenderTree(RenderTreeBuilder builder)
        {
            builder.OpenElement(0, "output");
            builder.AddContent(1, Label);
            builder.AddContent(2, Number);
            builder.AddContent(3, Optional ?? "<null>");
            builder.AddContent(4, Enabled);
            builder.AddContent(5, First);
            builder.AddContent(6, Second);
            builder.AddContent(7, Third);
            builder.AddContent(8, Fourth);
            builder.AddContent(9, Fifth);
            builder.AddContent(10, Sixth);
            builder.AddContent(11, Seventh);
            builder.AddContent(12, Eighth);
            builder.CloseElement();
        }

        public void Dispose() => Counter.Disposed++;
    }

    public sealed class LifetimeCounter
    {
        public long Created;
        public long Disposed;
    }

    private sealed class ProbeRenderer : Renderer
    {
        private readonly LifetimeCounter _counter;
        public override Dispatcher Dispatcher { get; } = Dispatcher.CreateDefault();
        internal long Created => _counter.Created;
        internal long Disposed => _counter.Disposed;

        internal ProbeRenderer(ServiceProvider services) : base(services, NullLoggerFactory.Instance)
        {
            _counter = services.GetRequiredService<LifetimeCounter>();
        }

        internal int Attach(IComponent component) => AssignRootComponentId(component);
        internal Task Render(int root, ParameterView parameters) => RenderRootComponentAsync(root, parameters);
        internal ArrayRange<RenderTreeFrame> Frames(int root) => GetCurrentRenderTreeFrames(root);
        internal void Remove(int root) => RemoveRootComponent(root);
        protected override void HandleException(Exception exception) => ExceptionDispatchInfo.Capture(exception).Throw();
        protected override Task UpdateDisplayAsync(in RenderBatch renderBatch) => Task.CompletedTask;
    }
}
