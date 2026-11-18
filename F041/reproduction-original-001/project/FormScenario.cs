// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Linq.Expressions;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AutoPerf;

/// <summary>Owns the original-only diagnostic form inputs and public validation-provider observer.</summary>
public sealed class FormScenario : IAsyncDisposable
{
    private readonly ServiceProvider _services;
    private readonly object _propertyKey = new();
    private readonly object _propertyValue = new();
    private readonly object _model = new();

    internal FormScenario(int count, string prefix)
    {
        Bindings = Enumerable.Range(0, count).Select(index => new Binding(index, prefix)).ToArray();
        Provider = new ObservingProvider(count);
        _services = new ServiceCollection().AddLogging().AddSingleton<ClientValidationProvider>(Provider).BuildServiceProvider();
    }

    internal Binding[] Bindings { get; }
    internal ObservingProvider Provider { get; }

    internal EditContext CreateContext()
    {
        var context = new EditContext(_model);
        context.Properties[_propertyKey] = _propertyValue;

        return context;
    }

    internal void VerifyContext(EditContext context)
    {
        Evidence.Require(ReferenceEquals(context.Model, _model) &&
            context.Properties.TryGetValue(_propertyKey, out var value) && ReferenceEquals(value, _propertyValue),
            "The actual form must preserve model and unrelated application property identity.");
    }

    internal async Task<string> RenderAsync(EditContext context)
    {
        await using var renderer = new HtmlRenderer(_services, _services.GetRequiredService<ILoggerFactory>());

        return await renderer.Dispatcher.InvokeAsync(async () =>
        {
            var parameters = ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(FormRoot.Context)] = context,
                [nameof(FormRoot.Scenario)] = this
            });
            var rendered = await renderer.RenderComponentAsync<FormRoot>(parameters);

            return rendered.ToHtmlString();
        });
    }

    internal async Task<object> VerifyRenderAsync(EditContext context)
    {
        var before = Provider.Calls;
        var html = await RenderAsync(context);
        VerifyContext(context);
        var expectedCalls = Bindings.Length == 0 ? 0 : 1;
        Evidence.Require(Provider.Calls == before + expectedCalls, "Require the actual framework field-consumer callback, not an injected map.");
        var observations = new List<object>();
        if (Bindings.Length > 0)
        {
            Evidence.Require(ReferenceEquals(Provider.Context, context) && Provider.Fields is not null,
                "The framework consumer must receive the actual surrounding EditContext.");
            var fields = Provider.Fields!;
            Evidence.Require(fields.Count == Bindings.Length, "Do not replace an existing registry or lose earlier input registrations.");
            foreach (var binding in Bindings)
            {
                var identifier = new FieldIdentifier(binding.Cell, nameof(FieldCell.Value));
                Evidence.Require(fields.TryGetValue(identifier, out var name) && name == binding.Name,
                    "Require each actual model-reference/field/rendered-name association.");
                Evidence.Require(html.Contains($"name=\"{binding.Name}\"", StringComparison.Ordinal) &&
                    html.Contains($"value=\"{binding.Cell.Value}\"", StringComparison.Ordinal),
                    "The actual inputs must render the independently prepared names and values.");
                observations.Add(new { fieldName = nameof(FieldCell.Value), renderedName = binding.Name,
                    value = binding.Cell.Value, actualModelReferenceMatched = true });
            }
            Evidence.Require(html.Contains($"<f041-observation data-fields=\"{Bindings.Length}\"></f041-observation>", StringComparison.Ordinal),
                "Require output from the actual ClientValidationData/public-provider path.");
        }
        else
        {
            Evidence.Require(!html.Contains("f041-observation", StringComparison.Ordinal) &&
                !html.Contains("<input", StringComparison.Ordinal), "An empty form must not fabricate fields or a carrier.");
        }

        return new { actualInputCount = Bindings.Length, actualProviderCalls = expectedCalls,
            actualApplicationPropertyPreserved = true, fields = observations, html };
    }

    public ValueTask DisposeAsync() => _services.DisposeAsync();

    internal sealed class Binding
    {
        internal Binding(int index, string prefix)
        {
            Cell = new FieldCell { Value = $"{prefix}-value-{index}" };
            Expression = () => Cell.Value;
            Name = $"{prefix}[{index}].Value";
            Attributes = new Dictionary<string, object> { ["name"] = Name };
        }

        internal FieldCell Cell { get; }
        internal Expression<Func<string?>> Expression { get; }
        internal string Name { get; }
        internal Dictionary<string, object> Attributes { get; }
    }

    internal sealed class FieldCell
    {
        public string? Value { get; set; }
    }

    internal sealed class ObservingProvider(int expectedFields) : ClientValidationProvider
    {
        internal int Calls { get; private set; }
        internal EditContext? Context { get; private set; }
        internal IReadOnlyDictionary<FieldIdentifier, string>? Fields { get; private set; }

        public override RenderFragment RenderClientValidationRules(EditContext editContext, IReadOnlyDictionary<FieldIdentifier, string> renderedFields)
        {
            Evidence.Require(renderedFields.Count == expectedFields, "The production registry must deliver every expected field on every observed render.");
            Calls++;
            Context = editContext;
            Fields = renderedFields;

            return builder =>
            {
                builder.OpenElement(0, "f041-observation");
                builder.AddAttribute(1, "data-fields", renderedFields.Count);
                builder.CloseElement();
            };
        }
    }
}

/// <summary>Renders original framework form components through the public static HTML renderer.</summary>
public sealed class FormRoot : ComponentBase
{
    [Parameter] public EditContext Context { get; set; } = default!;
    [Parameter] public FormScenario Scenario { get; set; } = default!;

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        builder.OpenComponent<EditForm>(0);
        builder.AddComponentParameter(1, nameof(EditForm.EditContext), Context);
        builder.AddComponentParameter(2, nameof(EditForm.ChildContent), (RenderFragment<EditContext>)(_ => child =>
        {
            child.OpenComponent<DataAnnotationsValidator>(0);
            child.CloseComponent();
            foreach (var binding in Scenario.Bindings)
            {
                child.OpenComponent<InputText>(1);
                child.AddComponentParameter(2, nameof(InputText.Value), binding.Cell.Value);
                child.AddComponentParameter(3, nameof(InputText.ValueExpression), binding.Expression);
                child.AddComponentParameter(4, nameof(InputText.AdditionalAttributes), binding.Attributes);
                child.CloseComponent();
            }
        }));
        builder.CloseComponent();
    }
}
