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
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Moq;

public class EnumSelectionBenchmark
{
    private ServiceProvider _services = null!;
    private DefaultHtmlGenerator _generator = null!;
    private ViewContext _viewContext = null!;
    private ModelExplorer _modelExplorer = null!;
    private string _propertyName = null!;
    private bool _allowMultiple;

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var shape in new[] { "Names", "Numbers", "Lowercase", "Invalid", "Combined", "Alias" })
            {
                foreach (var count in new[] { 1, 8, 64 })
                {
                    yield return $"{shape}_{count}";
                }
            }

            yield return "Typed_1";
            yield return "Typed_64";
            yield return "String_1";
            yield return "String_64";
            yield return "Empty_1";
        }
    }

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        var services = new ServiceCollection();
        services.AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance);
        services.AddSingleton(typeof(ILogger<>), typeof(NullLogger<>));
        services.AddMvcCore().AddDataAnnotations();
        _services = services.BuildServiceProvider();
        var metadataProvider = _services.GetRequiredService<IModelMetadataProvider>();
        var parts = Case.Split('_');
        var shape = parts[0];
        var count = int.Parse(parts[1], CultureInfo.InvariantCulture);
        _allowMultiple = shape != "Empty";
        _propertyName = shape switch
        {
            "Combined" => nameof(InputModel.FlagValues),
            "String" => nameof(InputModel.TextValues),
            "Empty" => nameof(InputModel.Optional),
            _ => nameof(InputModel.Values),
        };
        var model = new InputModel();
        var context = new ActionContext(
            new DefaultHttpContext { RequestServices = _services },
            new RouteData(),
            new ActionDescriptor());
        var viewData = new ViewDataDictionary(metadataProvider, context.ModelState) { Model = model };
        var propertyMetadata = metadataProvider.GetMetadataForProperty(typeof(InputModel), _propertyName);
        var elementMetadata = _allowMultiple ? propertyMetadata.ElementMetadata! : propertyMetadata;
        if (shape != "String" && !elementMetadata.IsEnum)
        {
            throw new InvalidOperationException("The actual MVC enum metadata provider did not run.");
        }

        if (shape == "Typed")
        {
            model.Values = Enumerable.Range(0, count).Select(index => index % 2 == 0 ? Choice.One : Choice.Two).ToList();
        }
        else if (shape == "String")
        {
            model.TextValues = Enumerable.Range(0, count).Select(index => index % 2 == 0 ? "One" : "Two").ToList();
        }
        else
        {
            var submitted = Enumerable.Range(0, count).Select(index => shape switch
            {
                "Names" => index % 2 == 0 ? nameof(Choice.One) : nameof(Choice.Two),
                "Numbers" => index % 2 == 0 ? "1" : "2",
                "Lowercase" => index % 2 == 0 ? "one" : "two",
                "Invalid" => "not-an-enum",
                "Combined" => "One, Two",
                "Alias" => nameof(Choice.TwoAlias),
                "Empty" => string.Empty,
                _ => throw new InvalidOperationException("Unknown benchmark case."),
            }).ToArray();
            var form = new FormCollection(new Dictionary<string, StringValues> { [_propertyName] = submitted });
            var valueProvider = new FormValueProvider(BindingSource.Form, form, CultureInfo.InvariantCulture);
            var bindingContext = DefaultModelBindingContext.CreateBindingContext(
                context, valueProvider, propertyMetadata, bindingInfo: null, modelName: _propertyName);
            var enumBinder = new EnumTypeModelBinder(
                suppressBindingUndefinedValueToEnumType: true,
                modelType: elementMetadata.UnderlyingOrModelType,
                loggerFactory: NullLoggerFactory.Instance);
            IModelBinder binder = shape switch
            {
                "Combined" => new CollectionModelBinder<FlagChoice>(enumBinder, NullLoggerFactory.Instance),
                "Empty" => enumBinder,
                _ => new CollectionModelBinder<Choice>(enumBinder, NullLoggerFactory.Instance),
            };
            binder.BindModelAsync(bindingContext).GetAwaiter().GetResult();
            var expectedErrors = shape == "Invalid" ? count : 0;
            if (!bindingContext.Result.IsModelSet || context.ModelState.Count != 1 ||
                context.ModelState.ErrorCount != expectedErrors ||
                context.ModelState[_propertyName]!.AttemptedValue != string.Join(",", submitted))
            {
                throw new InvalidOperationException("Actual binding did not produce the complete expected state.");
            }

            if (_allowMultiple)
            {
                var boundCount = shape == "Combined"
                    ? ((List<FlagChoice>)bindingContext.Result.Model!).Count
                    : ((List<Choice>)bindingContext.Result.Model!).Count;
                if (boundCount != (shape == "Invalid" ? 0 : count))
                {
                    throw new InvalidOperationException("The real collection binder did not reach every input.");
                }
            }
        }

        _viewContext = new ViewContext(
            context, Mock.Of<IView>(), viewData, Mock.Of<ITempDataDictionary>(),
            TextWriter.Null, new HtmlHelperOptions());
        _modelExplorer = viewData.ModelExplorer.GetExplorerForProperty(_propertyName);
        _generator = new DefaultHtmlGenerator(
            Mock.Of<IAntiforgery>(),
            Options.Create(new MvcViewOptions()),
            metadataProvider,
            Mock.Of<IUrlHelperFactory>(),
            HtmlEncoder.Default,
            Mock.Of<ValidationHtmlAttributeProvider>());
        string[] expected = shape switch
        {
            "Names" or "Numbers" or "Typed" when count == 1 => ["1", "One"],
            "Names" or "Numbers" or "Typed" => ["1", "One", "2", "Two", "TwoAlias"],
            "Alias" => ["2", "Two", "TwoAlias"],
            "Lowercase" when count == 1 => ["one"],
            "Lowercase" => ["one", "two"],
            "Invalid" => ["not-an-enum"],
            "Combined" => ["One, Two", "3"],
            "Empty" => [string.Empty],
            "String" when count == 1 => ["One"],
            "String" => ["One", "Two"],
            _ => throw new InvalidOperationException("Unknown expected output."),
        };
        if (!new HashSet<string>(expected, StringComparer.OrdinalIgnoreCase).SetEquals(GetCurrentValues()))
        {
            throw new InvalidOperationException("Actual generator current values differ from the expected contract.");
        }
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _services.Dispose();
    }

    [Benchmark]
    public ICollection<string> GetCurrentValues()
    {
        return _generator.GetCurrentValues(_viewContext, _modelExplorer, _propertyName, _allowMultiple)!;
    }

    public sealed class InputModel
    {
        public List<Choice> Values { get; set; } = [];

        public List<FlagChoice> FlagValues { get; set; } = [];

        public List<string> TextValues { get; set; } = [];

        public Choice? Optional { get; set; }
    }

    public enum Choice
    {
        Zero,
        One,
        Two,
        TwoAlias = Two,
        Three,
    }

    [Flags]
    public enum FlagChoice
    {
        None = 0,
        One = 1,
        Two = 2,
        Four = 4,
        All = -1,
    }
}
