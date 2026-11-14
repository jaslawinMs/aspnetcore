using System.Collections;
using System.Globalization;
using System.Security.Cryptography;
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

public class SelectMembershipBenchmark
{
    private ServiceProvider _services = null!;
    private DefaultHtmlGenerator _generator = null!;
    private ViewContext _context = null!;
    private ModelExplorer _model = null!;
    private IEnumerable<SelectListItem> _options = null!;
    private ICollection<string> _values = null!;
    private const string OptionLabel = "Pick <&>";

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var shape in new[] { "ListHit", "ListMiss" })
            {
                foreach (var (options, values) in new[] { (16, 16), (64, 32), (256, 128), (1024, 512), (1024, 1024) })
                {
                    yield return $"{shape}_{options}_{values}";
                }
            }

            foreach (var shape in new[] { "SetOrdinal", "SetIgnoreCase", "Bound", "Custom", "Derived", "Array" })
            {
                foreach (var (options, values) in new[] { (64, 32), (1024, 512) })
                {
                    yield return $"{shape}_{options}_{values}";
                }
            }

            yield return "ListHit_8_8";
            yield return "ListHit_16_1";
            yield return "ListHit_1_1024";
            yield return "Empty_0_0";
            yield return "Empty_64_0";
            yield return "Grouped_64_32";
            yield return "Grouped_1024_512";
            yield return "Fallback_32_32";
            yield return "Lazy_64_32";
            yield return "Indexer_64_32";
        }
    }

    public string VerifiedValuesType { get; private set; } = "";
    public int VerifiedOptionCount { get; private set; }
    public int VerifiedSelectedCount { get; private set; }
    public bool VerifiedBinder { get; private set; }
    public string VerifiedOptionProducer { get; private set; } = "";
    public string VerifiedHtmlHash { get; private set; } = "";
    public string VerifiedHtml { get; private set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        var parts = Case.Split('_');
        var shape = parts[0];
        var optionCount = int.Parse(parts[1], CultureInfo.InvariantCulture);
        var valueCount = int.Parse(parts[2], CultureInfo.InvariantCulture);
        var services = new ServiceCollection();
        services.AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance);
        services.AddSingleton(typeof(ILogger<>), typeof(NullLogger<>));
        services.AddMvcCore().AddDataAnnotations();
        _services = services.BuildServiceProvider();
        var metadata = _services.GetRequiredService<IModelMetadataProvider>();
        var action = new ActionContext(
            new DefaultHttpContext { RequestServices = _services }, new RouteData(), new ActionDescriptor());
        var viewData = new ViewDataDictionary(metadata, action.ModelState) { Model = new InputModel() };
        _context = new ViewContext(
            action, Mock.Of<IView>(), viewData, Mock.Of<ITempDataDictionary>(),
            TextWriter.Null, new HtmlHelperOptions()) { ClientValidationEnabled = false };
        _model = viewData.ModelExplorer.GetExplorerForProperty(nameof(InputModel.Values));
        _generator = new DefaultHtmlGenerator(
            Mock.Of<IAntiforgery>(), Options.Create(new MvcViewOptions()), metadata,
            Mock.Of<IUrlHelperFactory>(), HtmlEncoder.Default, Mock.Of<ValidationHtmlAttributeProvider>());

        var groups = Enumerable.Range(0, 4).Select(index => new SelectListGroup
        {
            Name = $"Group <&> {index}",
            Disabled = index == 2
        }).ToArray();
        var items = Enumerable.Range(0, optionCount).Select(index => new SelectListItem
        {
            Value = Value(index),
            Text = $"Text <&> {index}",
            Selected = index == optionCount - 1,
            Disabled = index % 17 == 0,
            Group = shape == "Grouped" ? groups[index * 4 / optionCount] : null
        }).ToList();
        if (shape == "Fallback")
        {
            items[0].Value = null;
            items[0].Text = Value(0);
            items[1].Value = null;
            items[1].Text = Value(1);
        }

        var miss = shape is "ListMiss" or "Lazy" or "Indexer";
        var incoming = Enumerable.Range(miss ? optionCount + 1 : 0, valueCount).Select(Value).ToArray();
        var ignoreCase = shape is "SetIgnoreCase" or "Bound" or "Custom" or "Derived";
        if (ignoreCase)
        {
            incoming = incoming.Select(value => value.ToUpperInvariant()).ToArray();
        }

        _values = shape switch
        {
            "SetOrdinal" => new HashSet<string>(incoming, StringComparer.Ordinal),
            "SetIgnoreCase" => new HashSet<string>(incoming, StringComparer.OrdinalIgnoreCase),
            "Custom" => new OpaqueValues(incoming),
            "Derived" => new DerivedValues(incoming),
            "Array" => incoming,
            _ => incoming.ToList()
        };
        if (shape == "Bound")
        {
            var property = metadata.GetMetadataForProperty(typeof(InputModel), nameof(InputModel.Values));
            var form = new FormCollection(new Dictionary<string, StringValues> { [nameof(InputModel.Values)] = incoming });
            var provider = new FormValueProvider(BindingSource.Form, form, CultureInfo.InvariantCulture);
            var binding = DefaultModelBindingContext.CreateBindingContext(
                action, provider, property, bindingInfo: null, modelName: nameof(InputModel.Values));
            var binder = new CollectionModelBinder<string>(
                new SimpleTypeModelBinder(typeof(string), NullLoggerFactory.Instance), NullLoggerFactory.Instance);
            binder.BindModelAsync(binding).GetAwaiter().GetResult();
            if (!binding.Result.IsModelSet || action.ModelState.Count != 1 || action.ModelState.ErrorCount != 0 ||
                binding.Result.Model is not List<string> bound || !bound.SequenceEqual(incoming))
            {
                throw new InvalidOperationException("The actual collection binder did not produce every value.");
            }

            _values = _generator.GetCurrentValues(_context, _model, nameof(InputModel.Values), allowMultiple: true);
            if (_values is not HashSet<string> set || !set.SetEquals(incoming) || !set.Contains(Value(0)))
            {
                throw new InvalidOperationException("The normal MVC current-values producer did not preserve case-insensitive matching.");
            }

            VerifiedBinder = true;
        }

        _options = items;
        if (shape == "Lazy")
        {
            _options = EnumerateAndUpdate(items);
        }
        else if (shape == "Indexer")
        {
            var mock = new Mock<IList<SelectListItem>>();
            mock.SetupGet(list => list.Count).Returns(items.Count);
            mock.Setup(list => list[It.IsAny<int>()]).Returns<int>(index =>
            {
                if (index == 0 && !_values.Contains(Value(3)))
                {
                    _values.Add(Value(3));
                }

                return items[index];
            });
            _options = mock.Object;
        }

        var selected = shape switch
        {
            "ListMiss" or "Empty" => new HashSet<int>(),
            "Lazy" or "Indexer" => new HashSet<int> { 3 },
            _ => Enumerable.Range(0, Math.Min(optionCount, valueCount)).ToHashSet()
        };
        var expected = ExpectedHtml(items, selected, shape == "Grouped");
        var actual = RenderSelect();
        if (!string.Equals(expected, actual, StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"Complete HTML differs for {Case}. Expected {expected}; actual {actual}.");
        }

        VerifiedValuesType = _values.GetType().FullName!;
        VerifiedOptionCount = items.Count;
        VerifiedSelectedCount = selected.Count;
        VerifiedOptionProducer = shape is "Lazy" or "Indexer" ? shape : "ConcreteList";
        VerifiedHtml = actual;
        VerifiedHtmlHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(actual)));
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _services?.Dispose();
    }

    [Benchmark]
    public string RenderSelect()
    {
        var result = _generator.GenerateSelect(
            _context, _model, OptionLabel, nameof(InputModel.Values),
            _options, _values, allowMultiple: true, htmlAttributes: null);
        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        result.WriteTo(writer, HtmlEncoder.Default);

        return writer.ToString();
    }

    private IEnumerable<SelectListItem> EnumerateAndUpdate(List<SelectListItem> items)
    {
        foreach (var item in items)
        {
            yield return item;
        }

        if (!_values.Contains(Value(3)))
        {
            _values.Add(Value(3));
        }
    }

    private static string Value(int index)
    {
        return "choice" + index.ToString("D8", CultureInfo.InvariantCulture);
    }

    private static string ExpectedHtml(List<SelectListItem> items, HashSet<int> selected, bool grouped)
    {
        var output = new StringBuilder("<select id=\"Values\" multiple=\"multiple\" name=\"Values\">");
        AppendOption(output, new SelectListItem { Value = "", Text = OptionLabel }, selected: false);
        SelectListGroup? previousGroup = null;
        for (var index = 0; index < items.Count; index++)
        {
            var item = items[index];
            if (grouped && !ReferenceEquals(previousGroup, item.Group))
            {
                if (previousGroup is not null)
                {
                    output.Append("</optgroup>").AppendLine();
                }

                var group = item.Group ?? throw new InvalidOperationException("The grouped option is missing its group.");
                output.Append("<optgroup");
                if (group.Disabled)
                {
                    output.Append(" disabled=\"disabled\"");
                }

                output.Append(" label=\"").Append(HtmlEncoder.Default.Encode(group.Name)).Append("\">").AppendLine();
                previousGroup = group;
            }

            AppendOption(output, item, selected.Contains(index));
        }

        if (previousGroup is not null)
        {
            output.Append("</optgroup>").AppendLine();
        }

        return output.Append("</select>").ToString();
    }

    private static void AppendOption(StringBuilder output, SelectListItem item, bool selected)
    {
        output.Append("<option");
        if (item.Disabled)
        {
            output.Append(" disabled=\"disabled\"");
        }

        if (selected)
        {
            output.Append(" selected=\"selected\"");
        }

        if (item.Value is not null)
        {
            output.Append(" value=\"").Append(HtmlEncoder.Default.Encode(item.Value)).Append('"');
        }

        output.Append('>').Append(HtmlEncoder.Default.Encode(item.Text)).Append("</option>").AppendLine();
    }

    public class InputModel
    {
        public List<string> Values { get; set; } = [];
    }

    private class OpaqueValues(IEnumerable<string> values) : ICollection<string>
    {
        private readonly HashSet<string> _values = new(values, StringComparer.OrdinalIgnoreCase);
        public int Count => _values.Count;
        public bool IsReadOnly => false;
        public void Add(string item) => _values.Add(item);
        public void Clear() => _values.Clear();
        public bool Contains(string item) => _values.Contains(item);
        public void CopyTo(string[] array, int arrayIndex) => _values.CopyTo(array, arrayIndex);
        public bool Remove(string item) => _values.Remove(item);
        public IEnumerator<string> GetEnumerator() => _values.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    private class DerivedValues(IEnumerable<string> values) : List<string>(values), ICollection<string>
    {
        private readonly HashSet<string> _members = new(values, StringComparer.OrdinalIgnoreCase);
        bool ICollection<string>.Contains(string value) => _members.Contains(value);
    }
}
