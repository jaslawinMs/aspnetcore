using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Encodings.Web;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

public class InputTypeBenchmark
{
    private ServiceProvider _services = null!;
    private DefaultHtmlGenerator _generator = null!;
    private ViewContext _viewContext = null!;
    private ModelExplorer _modelExplorer = null!;
    private object? _attributes;
    private string _value = null!;
    private bool _expectsLength;
    private bool _expectsPlaceholder;

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var model in new[] { "Plain", "Attributed" })
            {
                foreach (var kind in new[]
                {
                    "Default", "Text", "Search", "Url", "Tel", "Email", "Password", "Number",
                    "Hidden", "Date", "Checkbox", "Radio", "Range", "File", "Image",
                    "UpperText", "MixedEmail", "Empty", "Null",
                })
                {
                    yield return $"{model}_{kind}";
                }
            }

            yield return "Attributed_Text_Override";
            yield return "Attributed_Number_Override";
        }
    }

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        var parts = Case.Split('_');
        var attributed = parts[0] == "Attributed";
        var kind = parts[1];
        var callerOverride = parts.Length == 3;
        var services = new ServiceCollection();
        services.AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance);
        services.AddSingleton(typeof(ILogger<>), typeof(NullLogger<>));
        services.AddMvcCore().AddDataAnnotations();
        _services = services.BuildServiceProvider();
        var metadataProvider = _services.GetRequiredService<IModelMetadataProvider>();
        var context = new ActionContext(
            new DefaultHttpContext { RequestServices = _services }, new RouteData(), new ActionDescriptor());
        var viewData = new ViewDataDictionary(metadataProvider, context.ModelState)
        {
            Model = attributed ? new AttributedInput() : new PlainInput(),
        };
        _viewContext = new ViewContext(
            context, Mock.Of<IView>(), viewData, Mock.Of<ITempDataDictionary>(),
            TextWriter.Null, new HtmlHelperOptions())
        {
            ClientValidationEnabled = false,
        };
        _modelExplorer = viewData.ModelExplorer.GetExplorerForProperty(nameof(PlainInput.Value));
        var metadata = _modelExplorer.Metadata;
        if (metadata.Placeholder != (attributed ? "<prompt>" : null) ||
            metadata.ValidatorMetadata.OfType<MaxLengthAttribute>().Count() != (attributed ? 1 : 0) ||
            metadata.ValidatorMetadata.OfType<StringLengthAttribute>().Count() != (attributed ? 1 : 0))
        {
            throw new InvalidOperationException("The real MVC DataAnnotations metadata producer did not run.");
        }

        string? inputType = kind switch
        {
            "Default" => null,
            "Text" => "text",
            "Search" => "search",
            "Url" => "url",
            "Tel" => "tel",
            "Email" => "email",
            "Password" => "password",
            "Number" => "number",
            "Hidden" => "hidden",
            "Date" => "date",
            "Checkbox" => "checkbox",
            "Radio" => "radio",
            "Range" => "range",
            "File" => "file",
            "Image" => "image",
            "UpperText" => "TEXT",
            "MixedEmail" => "Email",
            "Empty" => string.Empty,
            "Null" => null,
            _ => throw new InvalidOperationException("Unknown input kind."),
        };
        var attributes = new Dictionary<string, object?>();
        if (kind != "Default")
        {
            attributes.Add("type", inputType);
        }

        if (callerOverride)
        {
            attributes.Add("placeholder", "<caller>");
            attributes.Add("maxlength", "5");
        }

        _attributes = attributes;
        _value = kind == "Date" ? "2026-11-13" : "42";
        _generator = new DefaultHtmlGenerator(
            Mock.Of<IAntiforgery>(), Options.Create(new MvcViewOptions()), metadataProvider,
            Mock.Of<IUrlHelperFactory>(), HtmlEncoder.Default, Mock.Of<ValidationHtmlAttributeProvider>());
        _expectsLength = kind is "Default" or "Text" or "Search" or "Url" or "Tel" or "Email" or "Password";
        _expectsPlaceholder = _expectsLength || kind == "Number";
        var hasLength = attributed && _expectsLength;
        var hasPlaceholder = attributed && _expectsPlaceholder;
        var expectedType = kind == "Default" ? "text" : inputType ?? string.Empty;
        var expected = "<input id=\"Value\"" +
            (callerOverride ? " maxlength=\"5\"" : hasLength ? " maxlength=\"16\"" : string.Empty) +
            " name=\"Value\"" +
            (callerOverride ? " placeholder=\"&lt;caller&gt;\"" : hasPlaceholder ? " placeholder=\"&lt;prompt&gt;\"" : string.Empty) +
            $" type=\"{expectedType}\"" +
            (kind is "File" or "Image" ? string.Empty : $" value=\"{_value}\"") +
            " />";
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        GenerateTextBox().WriteTo(writer, HtmlEncoder.Default);
        if (writer.ToString() != expected)
        {
            throw new InvalidOperationException($"Actual input HTML differs for {Case}: {writer}");
        }
    }

    public void VerifyHookDispatch()
    {
        var verifier = new HookCountingGenerator(_services.GetRequiredService<IModelMetadataProvider>());
        verifier.GenerateTextBox(
            _viewContext, _modelExplorer, nameof(PlainInput.Value), _value, format: null, htmlAttributes: _attributes);
        if (verifier.LengthCalls != (_expectsLength ? 1 : 0) ||
            verifier.PlaceholderCalls != (_expectsPlaceholder ? 1 : 0))
        {
            throw new InvalidOperationException($"Actual protected hook dispatch differs for {Case}.");
        }
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _services.Dispose();
    }

    [Benchmark]
    public TagBuilder GenerateTextBox()
    {
        return _generator.GenerateTextBox(
            _viewContext, _modelExplorer, nameof(PlainInput.Value), _value, format: null, htmlAttributes: _attributes);
    }

    public sealed class PlainInput
    {
        public string Value { get; set; } = "42";
    }

    public sealed class AttributedInput
    {
        [Display(Prompt = "<prompt>")]
        [MaxLength(32)]
        [StringLength(16)]
        public string Value { get; set; } = "42";
    }

    private sealed class HookCountingGenerator(IModelMetadataProvider metadataProvider) : DefaultHtmlGenerator(
        Mock.Of<IAntiforgery>(), Options.Create(new MvcViewOptions()), metadataProvider,
        Mock.Of<IUrlHelperFactory>(), HtmlEncoder.Default, Mock.Of<ValidationHtmlAttributeProvider>())
    {
        public int LengthCalls { get; private set; }

        public int PlaceholderCalls { get; private set; }

        protected override void AddMaxLengthAttribute(
            ViewDataDictionary viewData, TagBuilder tagBuilder, ModelExplorer modelExplorer, string expression)
        {
            LengthCalls++;
            base.AddMaxLengthAttribute(viewData, tagBuilder, modelExplorer, expression);
        }

        protected override void AddPlaceholderAttribute(
            ViewDataDictionary viewData, TagBuilder tagBuilder, ModelExplorer modelExplorer, string expression)
        {
            PlaceholderCalls++;
            base.AddPlaceholderAttribute(viewData, tagBuilder, modelExplorer, expression);
        }
    }
}
