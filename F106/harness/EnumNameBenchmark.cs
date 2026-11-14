using System.Collections;
using System.Globalization;
using System.Text;
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

public class EnumNameBenchmark
{
    private ServiceProvider _services = null!;
    private DefaultHtmlGenerator _generator = null!;
    private ViewContext _viewContext = null!;
    private ModelExplorer _modelExplorer = null!;
    private string _propertyName = null!;

    public string[] VerifiedCurrentValues { get; private set; } = [];

    public string VerifiedHtml { get; private set; } = string.Empty;

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var size in new[] { "Small", "Large" })
            {
                foreach (var shape in new[] { "Names", "Numbers", "Typed" })
                {
                    foreach (var count in new[] { 1, 2, 8, 64 })
                    {
                        yield return $"{size}_{shape}_{count}";
                    }
                }

                foreach (var shape in new[] { "Iterator", "Invalid", "Lowercase", "Mixed", "Unknown" })
                {
                    yield return $"{size}_{shape}_64";
                }
            }

            yield return "Large_TwoValid_64";
            yield return "Alias_Names_16";
            yield return "Alias_Numbers_16";
            yield return "Alias_Typed_16";
            yield return "Flags_Combined_16";
            yield return "String_Typed_64";
            yield return "Small_Empty_0";
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
        var size = parts[0];
        var shape = parts[1];
        var count = int.Parse(parts[2], CultureInfo.InvariantCulture);
        var members = size == "Large" ? 64 : 8;
        _propertyName = size switch
        {
            "Small" when shape == "Iterator" => nameof(InputModel.SmallIterator),
            "Small" => nameof(InputModel.Small),
            "Large" when shape == "Iterator" => nameof(InputModel.LargeIterator),
            "Large" => nameof(InputModel.Large),
            "Alias" => nameof(InputModel.Aliases),
            "Flags" => nameof(InputModel.Flags),
            "String" => nameof(InputModel.Strings),
            _ => throw new InvalidOperationException("Unknown benchmark size."),
        };
        var model = new InputModel();
        var context = new ActionContext(
            new DefaultHttpContext { RequestServices = _services },
            new RouteData(),
            new ActionDescriptor());
        var viewData = new ViewDataDictionary(metadataProvider, context.ModelState) { Model = model };
        var propertyMetadata = metadataProvider.GetMetadataForProperty(typeof(InputModel), _propertyName);
        var elementMetadata = propertyMetadata.ElementMetadata!;
        var expectedMembers = size switch { "Alias" => 3, "Flags" => 4, _ => members };
        if (size != "String" &&
            (!elementMetadata.IsEnum || elementMetadata.EnumNamesAndValues!.Count != expectedMembers))
        {
            throw new InvalidOperationException("Actual MVC metadata did not produce every enum name.");
        }

        var errors = 0;
        if (shape is "Typed" or "Iterator" or "Empty")
        {
            switch (size)
            {
                case "Small":
                    if (shape == "Iterator")
                    {
                        model.SmallIterator = IterateSmall(count);
                    }
                    else
                    {
                        model.Small = Enumerable.Range(0, count).Select(i => (SmallChoice)(i % members)).ToList();
                    }
                    break;
                case "Large":
                    if (shape == "Iterator")
                    {
                        model.LargeIterator = IterateLarge(count);
                    }
                    else
                    {
                        model.Large = Enumerable.Range(0, count).Select(i => (LargeChoice)(i % members)).ToList();
                    }
                    break;
                case "Alias":
                    model.Aliases = Enumerable.Repeat(AliasChoice.First, count).ToList();
                    break;
                case "String":
                    model.Strings = Enumerable.Range(0, count).Select(i => i.ToString(CultureInfo.InvariantCulture)).ToList();
                    break;
                default:
                    throw new InvalidOperationException("Unknown typed input.");
            }
        }
        else
        {
            var submitted = Enumerable.Range(0, count).Select(i => shape switch
            {
                "Names" when size == "Alias" => nameof(AliasChoice.Alias),
                "Numbers" when size == "Alias" => "1",
                "Names" => $"V{i % members:D2}",
                "Numbers" => (i % members).ToString(CultureInfo.InvariantCulture),
                "Lowercase" => $"v{i % members:D2}",
                "Invalid" => "not-an-enum",
                "Unknown" => "500",
                "Mixed" when i == 0 => "V00",
                "TwoValid" when i < 2 => $"V{i:D2}",
                "Mixed" or "TwoValid" => "not-an-enum",
                "Combined" => "One, Two",
                _ => throw new InvalidOperationException("Unknown submitted input."),
            }).ToArray();
            var form = new FormCollection(new Dictionary<string, StringValues> { [_propertyName] = submitted });
            var valueProvider = new FormValueProvider(BindingSource.Form, form, CultureInfo.InvariantCulture);
            var bindingContext = DefaultModelBindingContext.CreateBindingContext(
                context, valueProvider, propertyMetadata, bindingInfo: null, modelName: _propertyName);
            var enumBinder = new EnumTypeModelBinder(
                suppressBindingUndefinedValueToEnumType: true,
                modelType: elementMetadata.UnderlyingOrModelType,
                loggerFactory: NullLoggerFactory.Instance);
            IModelBinder binder = size switch
            {
                "Small" => new CollectionModelBinder<SmallChoice>(enumBinder, NullLoggerFactory.Instance),
                "Large" => new CollectionModelBinder<LargeChoice>(enumBinder, NullLoggerFactory.Instance),
                "Alias" => new CollectionModelBinder<AliasChoice>(enumBinder, NullLoggerFactory.Instance),
                "Flags" => new CollectionModelBinder<FlagChoice>(enumBinder, NullLoggerFactory.Instance),
                _ => throw new InvalidOperationException("Unknown binding target."),
            };
            binder.BindModelAsync(bindingContext).GetAwaiter().GetResult();
            errors = shape switch
            {
                "Invalid" or "Unknown" => count,
                "Mixed" => count - 1,
                "TwoValid" => count - 2,
                _ => 0,
            };
            if (!bindingContext.Result.IsModelSet || context.ModelState.Count != 1 ||
                context.ModelState.ErrorCount != errors ||
                context.ModelState[_propertyName]!.AttemptedValue != string.Join(",", submitted) ||
                bindingContext.Result.Model is not ICollection bound || bound.Count != count - errors)
            {
                throw new InvalidOperationException("The real binder did not reach every posted value.");
            }
        }

        _viewContext = new ViewContext(
            context, Mock.Of<IView>(), viewData, Mock.Of<ITempDataDictionary>(),
            TextWriter.Null, new HtmlHelperOptions())
        {
            ClientValidationEnabled = false,
        };
        _modelExplorer = viewData.ModelExplorer.GetExplorerForProperty(_propertyName);
        if (shape == "Iterator" && _modelExplorer.Model is ICollection)
        {
            throw new InvalidOperationException("The iterator control unexpectedly exposes a collection count.");
        }
        _generator = new DefaultHtmlGenerator(
            Mock.Of<IAntiforgery>(),
            Options.Create(new MvcViewOptions()),
            metadataProvider,
            Mock.Of<IUrlHelperFactory>(),
            HtmlEncoder.Default,
            Mock.Of<ValidationHtmlAttributeProvider>());
        var expected = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (size == "Alias")
        {
            expected.UnionWith(["1", "First", "Alias"]);
        }
        else if (shape == "Combined")
        {
            expected.UnionWith(["One, Two", "3"]);
        }
        else if (shape == "Unknown")
        {
            expected.Add("500");
        }
        else if (shape == "Invalid")
        {
            expected.Add("not-an-enum");
        }
        else if (shape == "Lowercase")
        {
            for (var i = 0; i < Math.Min(count, members); i++)
            {
                expected.Add($"v{i:D2}");
            }
        }
        else if (shape is "Mixed" or "TwoValid")
        {
            expected.UnionWith(["0", "V00", "not-an-enum"]);
            if (shape == "TwoValid")
            {
                expected.UnionWith(["1", "V01"]);
            }
        }
        else
        {
            for (var i = 0; i < Math.Min(count, size == "String" ? count : members); i++)
            {
                expected.Add(i.ToString(CultureInfo.InvariantCulture));
                if (size != "String")
                {
                    expected.Add($"V{i:D2}");
                }
            }
        }

        var values = GetCurrentValues();
        if (!expected.SetEquals(values) || values.Count != expected.Count)
        {
            throw new InvalidOperationException("The complete current-value contract differs.");
        }
        VerifiedCurrentValues = values.ToArray();

        var options = size switch
        {
            "Alias" => new List<SelectListItem>
            {
                new() { Value = "1", Text = "First" },
                new() { Value = "1", Text = "Alias" },
                new() { Value = "2", Text = "Second" },
            },
            "Flags" => new List<SelectListItem>
            {
                new() { Value = "1", Text = "One" },
                new() { Value = "2", Text = "Two" },
                new() { Value = "3", Text = "Combined" },
            },
            _ => Enumerable.Range(0, size == "String" ? count : members)
                .Select(i => new SelectListItem { Value = i.ToString(CultureInfo.InvariantCulture), Text = $"V{i:D2}" })
                .ToList(),
        };
        var expectedHtml = new StringBuilder("<select");
        if (errors != 0)
        {
            expectedHtml.Append(" class=\"input-validation-error\"");
        }
        expectedHtml.Append($" id=\"{_propertyName}\" multiple=\"multiple\" name=\"{_propertyName}\">");
        foreach (var option in options)
        {
            expectedHtml.Append("<option");
            if (expected.Contains(option.Value!))
            {
                expectedHtml.Append(" selected=\"selected\"");
            }
            expectedHtml.Append($" value=\"{option.Value}\">{option.Text}</option>");
            expectedHtml.AppendLine();
        }
        expectedHtml.Append("</select>");
        var tag = _generator.GenerateSelect(
            _viewContext, _modelExplorer, optionLabel: null, expression: _propertyName,
            selectList: options, currentValues: values, allowMultiple: true, htmlAttributes: null);
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        tag.WriteTo(writer, HtmlEncoder.Default);
        VerifiedHtml = writer.ToString();
        if (VerifiedHtml != expectedHtml.ToString())
        {
            throw new InvalidOperationException($"Full select HTML differs for {Case}:\n{VerifiedHtml}");
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
        return _generator.GetCurrentValues(_viewContext, _modelExplorer, _propertyName, allowMultiple: true);
    }

    private static IEnumerable<SmallChoice> IterateSmall(int count)
    {
        for (var i = 0; i < count; i++)
        {
            yield return (SmallChoice)(i % 8);
        }
    }

    private static IEnumerable<LargeChoice> IterateLarge(int count)
    {
        for (var i = 0; i < count; i++)
        {
            yield return (LargeChoice)(i % 64);
        }
    }

    public sealed class InputModel
    {
        public List<SmallChoice> Small { get; set; } = [];
        public List<LargeChoice> Large { get; set; } = [];
        public IEnumerable<SmallChoice> SmallIterator { get; set; } = [];
        public IEnumerable<LargeChoice> LargeIterator { get; set; } = [];
        public List<AliasChoice> Aliases { get; set; } = [];
        public List<FlagChoice> Flags { get; set; } = [];
        public List<string> Strings { get; set; } = [];
    }

    public enum SmallChoice
    {
        V00, V01, V02, V03, V04, V05, V06, V07,
    }

    public enum LargeChoice
    {
        V00, V01, V02, V03, V04, V05, V06, V07,
        V08, V09, V10, V11, V12, V13, V14, V15,
        V16, V17, V18, V19, V20, V21, V22, V23,
        V24, V25, V26, V27, V28, V29, V30, V31,
        V32, V33, V34, V35, V36, V37, V38, V39,
        V40, V41, V42, V43, V44, V45, V46, V47,
        V48, V49, V50, V51, V52, V53, V54, V55,
        V56, V57, V58, V59, V60, V61, V62, V63,
    }

    public enum AliasChoice
    {
        First = 1,
        Alias = First,
        Second = 2,
    }

    [Flags]
    public enum FlagChoice
    {
        None = 0,
        One = 1,
        Two = 2,
        Four = 4,
    }
}
