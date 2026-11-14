using System.Globalization;
using System.Reflection;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Primitives;

public class ValidationSummaryBenchmark
{
    private Func<ViewDataDictionary, bool, IList<ModelStateEntry>> _collect = null!;
    private ViewDataDictionary _viewData = null!;
    private bool _excludePropertyErrors;

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var shape in new[] { "AllUnmatched", "Mixed", "Aligned", "Excluded" })
            {
                foreach (var count in new[] { 1, 16, 128, 1000 })
                {
                    yield return $"{shape}_{count}";
                }
            }

            yield return "Empty_0";
        }
    }

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        var method = typeof(ViewDataDictionary).Assembly
            .GetType("Microsoft.AspNetCore.Mvc.ViewFeatures.ValidationHelpers", throwOnError: true)!
            .GetMethod("GetModelStateList", BindingFlags.Public | BindingFlags.Static)
            ?? throw new InvalidOperationException("The production collection helper was not found.");
        _collect = method.CreateDelegate<Func<ViewDataDictionary, bool, IList<ModelStateEntry>>>();

        var parts = Case.Split('_');
        var count = int.Parse(parts[1], CultureInfo.InvariantCulture);
        var metadataProvider = new EmptyModelMetadataProvider();
        var actionContext = new ActionContext { HttpContext = new DefaultHttpContext() };
        var form = new Dictionary<string, StringValues>();
        if (count != 0)
        {
            form[nameof(BoundInput.Z)] = "invalid-z";
            for (var index = 0; index < count; index++)
            {
                form[$"{nameof(BoundInput.Items)}[{index}]"] = index.ToString(CultureInfo.InvariantCulture);
            }
        }

        var valueProvider = new FormValueProvider(
            BindingSource.Form,
            new FormCollection(form),
            CultureInfo.InvariantCulture);
        var elementBinder = new SimpleTypeModelBinder(typeof(int), NullLoggerFactory.Instance);
        List<int> items = [];
        if (count != 0)
        {
            var scalarContext = DefaultModelBindingContext.CreateBindingContext(
                actionContext,
                valueProvider,
                metadataProvider.GetMetadataForType(typeof(int)),
                bindingInfo: null,
                modelName: nameof(BoundInput.Z));
            elementBinder.BindModelAsync(scalarContext).GetAwaiter().GetResult();
            if (scalarContext.Result.IsModelSet)
            {
                throw new InvalidOperationException("The actual scalar conversion failure did not run.");
            }

            var collectionContext = DefaultModelBindingContext.CreateBindingContext(
                actionContext,
                valueProvider,
                metadataProvider.GetMetadataForType(typeof(List<int>)),
                bindingInfo: null,
                modelName: nameof(BoundInput.Items));
            var collectionBinder = new CollectionModelBinder<int>(elementBinder, NullLoggerFactory.Instance);
            collectionBinder.BindModelAsync(collectionContext).GetAwaiter().GetResult();
            if (!collectionContext.Result.IsModelSet ||
                collectionContext.Result.Model is not List<int> boundItems ||
                !boundItems.SequenceEqual(Enumerable.Range(0, count)) ||
                actionContext.ModelState.Count != count + 1 ||
                actionContext.ModelState.ErrorCount != 1)
            {
                throw new InvalidOperationException("Actual binding did not produce the complete expected state.");
            }

            items = boundItems;
        }

        _viewData = new ViewDataDictionary(metadataProvider, actionContext.ModelState);
        _excludePropertyErrors = parts[0] == "Excluded";
        if (parts[0] == "Aligned")
        {
            _viewData.Model = new BoundInput { Items = items };
        }
        else if (parts[0] is "Mixed" or "Excluded")
        {
            _viewData.Model = new SummaryProjection();
        }

        if (_excludePropertyErrors)
        {
            _viewData.TemplateInfo.HtmlFieldPrefix = nameof(BoundInput.Z);
        }

        var expected = _excludePropertyErrors
            ? new[] { actionContext.ModelState[nameof(BoundInput.Z)]! }
            : actionContext.ModelState.Values.ToArray();
        var actual = CollectEntries();
        if (actual.Count != expected.Length ||
            actual.Where((entry, index) => !ReferenceEquals(entry, expected[index])).Any())
        {
            throw new InvalidOperationException("The production helper changed entry identity, order or uniqueness.");
        }
    }

    [Benchmark]
    public IList<ModelStateEntry> CollectEntries()
    {
        return _collect(_viewData, _excludePropertyErrors);
    }

    public sealed class BoundInput
    {
        public int Z { get; set; }

        public List<int> Items { get; set; } = [];
    }

    public sealed class SummaryProjection
    {
        public int Z { get; set; }
    }
}
