using System.Linq.Expressions;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace AutoPerf;

internal static class FirstUse
{
    public sealed record Observation(string Shape, string ActualName, string? ActualValueName, int Consumed);

    [MethodImpl(MethodImplOptions.NoInlining)]
    public static Observation Exercise(string shape)
    {
        var metadata = new EmptyModelMetadataProvider();
        var provider = new ModelExpressionProvider(metadata);
        if (shape == "Name.Member.Control")
        {
            Expression<Func<BenchModel, string>> expression = model => model.Name;
            var name = provider.GetExpressionText(expression);
            return new Observation(shape, name, null, name.Length);
        }
        if (shape == "Name.List.Constant")
        {
            Expression<Func<List<BenchModel>, string>> expression = model => model[1].Name;
            var name = provider.GetExpressionText(expression);
            return new Observation(shape, name, null, name.Length);
        }
        if (shape == "Model.Indexer.Value")
        {
            var models = new List<BenchModel> { new() { Name = "first" }, new() { Name = "second" } };
            var viewData = new ViewDataDictionary<List<BenchModel>>(metadata, new ModelStateDictionary()) { Model = models };
            Expression<Func<List<BenchModel>, BenchModel>> expression = model => model[1];
            var result = provider.CreateModelExpression(viewData, expression);
            var value = result.Model is BenchModel valueModel ? valueModel.Name
                : throw new InvalidOperationException("The real first public model accessor returned no model.");
            return new Observation(shape, result.Name, value, result.Name.Length + value.Length);
        }

        throw new ArgumentException("An explicit first-observed public profile is required.", nameof(shape));
    }

    public static void Validate(Observation observed)
    {
        var expectedName = observed.Shape switch
        {
            "Name.Member.Control" => "Name",
            "Name.List.Constant" => "[1].Name",
            "Model.Indexer.Value" => "[1]",
            _ => throw new InvalidOperationException("Unknown first-observed profile."),
        };
        Evidence.Require(observed.ActualName == expectedName, "The first public expression name changed.");
        Evidence.Require(observed.ActualValueName == (observed.Shape == "Model.Indexer.Value" ? "second" : null),
            "The first real public model accessor value changed.");
        Evidence.Require(observed.Consumed == expectedName.Length + (observed.ActualValueName?.Length ?? 0),
            "The first public wrapper did not consume the actual result.");
    }
}
