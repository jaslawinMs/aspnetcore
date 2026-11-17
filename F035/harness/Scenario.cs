// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

internal sealed class BindingScenario
{
    private readonly DefaultHttpContext _http = new();
    private readonly RouteData _route = new();
    private readonly ActionDescriptor _descriptor = new();
    private readonly ModelMetadata _metadata = new EmptyModelMetadataProvider().GetMetadataForType(typeof(List<string>));
    private readonly CollectionModelBinder<string> _binder = new(
        new SimpleTypeModelBinder(typeof(string), NullLoggerFactory.Instance), NullLoggerFactory.Instance);

    public BindingScenario(string[] values)
    {
        Expected = values;
        _http.Request.QueryString = new QueryString("?other=untouched" +
            string.Concat(values.Select(value => "&items=" + Uri.EscapeDataString(value))));
        var factoryContext = new ValueProviderFactoryContext(CreateActionContext());
        var factoryTask = new QueryStringValueProviderFactory().CreateValueProviderAsync(factoryContext);
        Evidence.Require(factoryTask.IsCompletedSuccessfully, "Actual query factory must finish before this synchronous benchmark setup.");
        factoryTask.GetAwaiter().GetResult();
        Evidence.Require(factoryContext.ValueProviders.Count == 1 &&
            factoryContext.ValueProviders[0] is QueryStringValueProvider, "Require the actual public query value-provider factory.");
        Provider = (QueryStringValueProvider)factoryContext.ValueProviders[0];
        Result = Provider.GetValue("items");
        Evidence.Require(Result.Values.SequenceEqual(values) &&
            ReferenceEquals(Result.Culture, CultureInfo.InvariantCulture), "Actual parsed query producer returned unexpected values/culture.");
    }

    public string[] Expected { get; }
    public QueryStringValueProvider Provider { get; }
    public ValueProviderResult Result { get; }
    public string ActualQueryString => _http.Request.QueryString.Value ?? throw new InvalidOperationException("Actual query text required.");

    private ActionContext CreateActionContext()
    {
        return new ActionContext(_http, _route, _descriptor);
    }

    public ModelBindingContext CreateBindingContext()
    {
        return CreateBindingContext(_metadata);
    }

    public ModelBindingContext CreateBindingContext(ModelMetadata metadata)
    {
        return DefaultModelBindingContext.CreateBindingContext(
            CreateActionContext(), Provider, metadata, bindingInfo: null, modelName: "items");
    }

    public async Task<ModelBindingContext> BindAsync()
    {
        var context = CreateBindingContext();
        await _binder.BindModelAsync(context).ConfigureAwait(false);
        Evidence.Require(context.Result.IsModelSet && context.Result.Model is List<string>,
            "The actual public collection binder must return its model.");

        return context;
    }

    public async Task<int> BindAndConsumeAsync()
    {
        var context = await BindAsync().ConfigureAwait(false);
        var model = (List<string>)context.Result.Model!;
        Evidence.Require(model.Count == Expected.Length && context.ModelState.ErrorCount == 0,
            "Actual binding output/error count differs.");
        var score = 17;
        foreach (var value in model)
        {
            score = unchecked(score * 31 + (value?.Length ?? -1));
        }

        return score;
    }
}
