using System.Linq.Expressions;
using System.Reflection;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

namespace AutoPerf;

public sealed class BenchModel
{
    public string Name { get; init; } = "";
    public List<BenchModel> Children { get; init; } = [];
}

public sealed class LookupModel
{
    public BenchModel Lookup(int index) => new() { Name = "lookup-" + index };
}

internal sealed class ExpressionFixture
{
    private readonly string _case;
    private readonly Func<string>? _getName;
    private readonly Func<ModelExpression>? _createModel;
    private readonly bool _consumeModel;
    private readonly Func<Expression, bool>? _classify;
    private readonly Expression? _classifierArgument;
    private readonly Action<int> _setIndex;
    private readonly List<BenchModel> _models;
    private int _expectedIndex = 1;

    public ExpressionFixture(string name)
    {
        _case = name;
        var metadata = new EmptyModelMetadataProvider();
        var provider = new ModelExpressionProvider(metadata);
        _models = CreateModels();
        var array = _models.ToArray();
        var dictionary = new Dictionary<string, BenchModel>
        {
            ["a"] = _models[0], ["b"] = _models[1], ["c"] = _models[2],
        };
        var index = 1;
        var key = "b";
        _setIndex = value =>
        {
            index = value;
            key = value switch { 0 => "a", 1 => "b", 2 => "c", _ => throw new ArgumentOutOfRangeException(nameof(value)) };
            _expectedIndex = value;
        };
        Expression<Func<List<BenchModel>, string>> constant = model => model[1].Name;
        Expression<Func<List<BenchModel>, string>> captured = model => model[index].Name;
        Expression<Func<Dictionary<string, BenchModel>, string>> dictionaryCaptured = model => model[key].Name;
        Expression<Func<List<BenchModel>, string>> nested = model => model[index].Children[0].Name;
        Expression<Func<BenchModel, string>> member = model => model.Name;
        Expression<Func<BenchModel[], string>> arrayName = model => model[index].Name;
        Expression<Func<LookupModel, string>> unsupportedName = model => model.Lookup(1).Name;
        Expression<Func<List<BenchModel>, BenchModel>> listItem = model => model[index];
        Expression<Func<BenchModel[], BenchModel>> arrayItem = model => model[index];
        var listViewData = new ViewDataDictionary<List<BenchModel>>(metadata, new ModelStateDictionary()) { Model = _models };
        var memberViewData = new ViewDataDictionary<BenchModel>(metadata, new ModelStateDictionary()) { Model = _models[1] };
        var arrayViewData = new ViewDataDictionary<BenchModel[]>(metadata, new ModelStateDictionary()) { Model = array };
        switch (name)
        {
            case "Name.List.Constant":
                _getName = () => provider.GetExpressionText(constant);
                break;
            case "Name.List.Captured":
                _getName = () => provider.GetExpressionText(captured);
                break;
            case "Name.Dictionary.Captured":
                _getName = () => provider.GetExpressionText(dictionaryCaptured);
                break;
            case "Name.Nested.TwoIndexers":
                _getName = () => provider.GetExpressionText(nested);
                break;
            case "Name.List.NewExpression":
                _getName = () => provider.GetExpressionText((Expression<Func<List<BenchModel>, string>>)(model => model[index].Name));
                break;
            case "Name.Member.Control":
                _getName = () => provider.GetExpressionText(member);
                break;
            case "Name.Array.Control":
                _getName = () => provider.GetExpressionText(arrayName);
                break;
            case "Name.Method.Control":
                _getName = () => provider.GetExpressionText(unsupportedName);
                break;
            case "Model.Indexer.RuntimeType":
                _createModel = () => provider.CreateModelExpression(listViewData, listItem);
                break;
            case "Model.Indexer.Value":
                _createModel = () => provider.CreateModelExpression(listViewData, listItem);
                _consumeModel = true;
                break;
            case "Model.Member.Control":
                _createModel = () => provider.CreateModelExpression(memberViewData, member);
                _consumeModel = true;
                break;
            case "Model.Array.Control":
                _createModel = () => provider.CreateModelExpression(arrayViewData, arrayItem);
                _consumeModel = true;
                break;
            case "Classifier.Indexer.Helper":
            case "Classifier.Method.Control":
                var helper = typeof(ModelExpressionProvider).Assembly.GetType(
                    "Microsoft.AspNetCore.Mvc.ViewFeatures.ExpressionHelper", throwOnError: true)
                    ?? throw new InvalidOperationException("The actual helper is absent.");
                var classifier = helper.GetMethod("IsSingleArgumentIndexer", BindingFlags.Public | BindingFlags.Static)
                    ?? throw new InvalidOperationException("The actual classifier is absent.");
                _classify = classifier.CreateDelegate<Func<Expression, bool>>();
                Expression<Func<LookupModel, BenchModel>> unsupported = model => model.Lookup(1);
                _classifierArgument = name == "Classifier.Indexer.Helper" ? listItem.Body : unsupported.Body;
                break;
            default:
                throw new ArgumentException("Unknown explicit profile.", nameof(name));
        }
    }

    public static List<BenchModel> CreateModels()
    {
        return Enumerable.Range(0, 3).Select(index => new BenchModel
        {
            Name = "model-" + index,
            Children = [new BenchModel { Name = "child-" + index }],
        }).ToList();
    }

    public int Exercise()
    {
        if (_getName is not null)
        {
            return _getName().Length;
        }
        if (_createModel is not null)
        {
            var result = _createModel();
            return result.Name.Length + (_consumeModel ? ValueName(result.Model).Length : result.ModelExplorer.ModelType.Name.Length);
        }
        if (_classify is not null && _classifierArgument is not null)
        {
            return _classify(_classifierArgument) ? 1 : 0;
        }

        throw new InvalidOperationException("An actual public producer or classifier operation is required.");
    }

    public void SetIndex(int value)
    {
        _setIndex(value);
    }

    public void CaptureContract(string phase)
    {
        string? actualName = null;
        string? actualValueName = null;
        string? modelType = null;
        bool? actualClassification = null;
        int expectedChecksum;
        if (_classify is not null && _classifierArgument is not null)
        {
            actualClassification = _classify(_classifierArgument);
            var expected = _case == "Classifier.Indexer.Helper";
            Evidence.Require(actualClassification == expected, "The real classifier result changed.");
            expectedChecksum = expected ? 1 : 0;
        }
        else
        {
            var modelExpression = _createModel?.Invoke();
            actualName = modelExpression?.Name ?? (_getName ?? throw new InvalidOperationException("Name producer absent."))();
            var index = _expectedIndex;
            var key = index switch { 0 => "a", 1 => "b", 2 => "c", _ => throw new InvalidOperationException("Invalid fixture index.") };
            var expectedName = _case switch
            {
                "Name.List.Constant" => "[1].Name",
                "Name.List.Captured" or "Name.List.NewExpression" or "Name.Array.Control" => $"[{index}].Name",
                "Name.Dictionary.Captured" => $"[{key}].Name",
                "Name.Nested.TwoIndexers" => $"[{index}].Children[0].Name",
                "Name.Member.Control" or "Name.Method.Control" or "Model.Member.Control" => "Name",
                "Model.Indexer.RuntimeType" or "Model.Indexer.Value" or "Model.Array.Control" => $"[{index}]",
                _ => throw new InvalidOperationException("Unknown public profile."),
            };
            Evidence.Require(actualName == expectedName, "The actual public expression name changed.");
            expectedChecksum = actualName.Length;
            if (modelExpression is not null)
            {
                var actualValue = modelExpression.Model;
                var expectedValue = _case == "Model.Member.Control" ? (object)_models[1].Name : _models[index];
                Evidence.Require(actualValue is string text && expectedValue is string expectedText ? text == expectedText
                    : ReferenceEquals(actualValue, expectedValue), "The actual lazy model accessor observed a stale index/value.");
                actualValueName = ValueName(actualValue);
                modelType = modelExpression.ModelExplorer.ModelType.FullName;
                expectedChecksum += _consumeModel ? actualValueName.Length : modelExpression.ModelExplorer.ModelType.Name.Length;
            }
        }
        var observedChecksum = Exercise();
        Evidence.Require(observedChecksum == expectedChecksum, "The actual timed wrapper result changed.");
        Evidence.Write("profile-contract", new
        {
            shape = _case, phase, actualName, actualValueName, modelType, actualClassification,
            observedChecksum, expectedChecksum, actualCapturedIndex = _expectedIndex,
            modelConsumedInTimedWrapper = _createModel is not null,
            modelNameConsumedInTimedWrapper = _consumeModel,
            runtimeModelTypeResolvedInTimedWrapper = _createModel is not null && !_consumeModel,
            modelObservedDuringUntimedContract = _createModel is not null,
            boundary = _case.StartsWith("Classifier.", StringComparison.Ordinal) ? "Internal actual-owner helper only;not a primary public benefit."
                : "Actual ModelExpressionProvider public producer;no synthetic metadata callback.",
        });
    }

    private static string ValueName(object? value)
    {
        return value switch
        {
            BenchModel model => model.Name,
            string text => text,
            _ => throw new InvalidOperationException("The actual public model value has the wrong type or is null."),
        };
    }
}
