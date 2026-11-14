using System.Globalization;
using System.Text.Encodings.Web;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Moq;

public class ValidationMessageBenchmark
{
    private DefaultHtmlGenerator _generator = null!;
    private ViewContext _viewContext = null!;
    private ModelExplorer _modelExplorer = null!;
    private string? _message;
    private object? _attributes;

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var client in new[] { "ClientOn", "ClientOff" })
            {
                foreach (var state in new[] { "Valid", "Invalid" })
                {
                    foreach (var message in new[] { "Null", "Empty", "Custom" })
                    {
                        yield return $"{client}_{state}_{message}";
                    }
                }
            }

            yield return "Override_Invalid_Null";
            yield return "Override_Invalid_Custom";
        }
    }

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        var parts = Case.Split('_');
        var client = parts[0] != "ClientOff";
        var invalid = parts[1] == "Invalid";
        _message = parts[2] switch
        {
            "Null" => null,
            "Empty" => string.Empty,
            "Custom" => "<custom>",
            _ => throw new InvalidOperationException("Unknown message case."),
        };
        _attributes = parts[0] == "Override"
            ? new Dictionary<string, object> { ["data-valmsg-replace"] = "preserved" }
            : null;
        var metadataProvider = new EmptyModelMetadataProvider();
        var metadata = metadataProvider.GetMetadataForProperty(typeof(InputModel), nameof(InputModel.Value));
        var context = new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
        var submitted = invalid ? "not-an-integer" : "42";
        var form = new FormCollection(new Dictionary<string, StringValues> { [nameof(InputModel.Value)] = submitted });
        var valueProvider = new FormValueProvider(BindingSource.Form, form, CultureInfo.InvariantCulture);
        var bindingContext = DefaultModelBindingContext.CreateBindingContext(
            context, valueProvider, metadata, bindingInfo: null, modelName: nameof(InputModel.Value));
        var binder = new SimpleTypeModelBinder(typeof(int), NullLoggerFactory.Instance);
        binder.BindModelAsync(bindingContext).GetAwaiter().GetResult();
        var entry = context.ModelState[nameof(InputModel.Value)]!;
        if (context.ModelState.Count != 1 || context.ModelState.ErrorCount != (invalid ? 1 : 0) ||
            bindingContext.Result.IsModelSet == invalid || entry.AttemptedValue != submitted)
        {
            throw new InvalidOperationException("The real binder did not produce the expected complete state.");
        }

        var viewData = new ViewDataDictionary(metadataProvider, context.ModelState) { Model = new InputModel() };
        _viewContext = new ViewContext(
            context, Mock.Of<IView>(), viewData, Mock.Of<ITempDataDictionary>(),
            TextWriter.Null, new HtmlHelperOptions())
        {
            ClientValidationEnabled = client,
        };
        _modelExplorer = viewData.ModelExplorer.GetExplorerForProperty(nameof(InputModel.Value));
        _generator = new DefaultHtmlGenerator(
            Mock.Of<IAntiforgery>(),
            Options.Create(new MvcViewOptions()),
            metadataProvider,
            Mock.Of<IUrlHelperFactory>(),
            HtmlEncoder.Default,
            Mock.Of<ValidationHtmlAttributeProvider>());
        var actual = GenerateValidationMessage();
        if (!client && !invalid)
        {
            if (actual is not null)
            {
                throw new InvalidOperationException("Client-disabled valid state must not render a validation message.");
            }

            return;
        }

        var body = _message == "<custom>"
            ? "&lt;custom&gt;"
            : invalid ? HtmlEncoder.Default.Encode(entry.Errors.Single().ErrorMessage) : string.Empty;
        var replacement = _attributes is not null ? "preserved" : _message == "<custom>" ? "false" : "true";
        var expected = $"<span class=\"field-validation-{(invalid ? "error" : "valid")}\"" +
            (client ? $" data-valmsg-for=\"Value\" data-valmsg-replace=\"{replacement}\"" : string.Empty) +
            $">{body}</span>";
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        actual?.WriteTo(writer, HtmlEncoder.Default);
        if (writer.ToString() != expected)
        {
            throw new InvalidOperationException($"Actual validation HTML differs for {Case}: {writer}");
        }
    }

    [Benchmark]
    public TagBuilder? GenerateValidationMessage()
    {
        return _generator.GenerateValidationMessage(
            _viewContext, _modelExplorer, nameof(InputModel.Value), _message,
            tag: null, htmlAttributes: _attributes);
    }

    public sealed class InputModel
    {
        public int Value { get; set; }
    }
}
