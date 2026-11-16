using System.Collections;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal enum Traversal
{
    Concrete,
    Generic,
    NonGeneric,
    Retained,
    Validation
}

internal sealed class Workload : IDisposable
{
    internal static readonly string[] Labels =
    [
        "Concrete0", "Concrete1", "Concrete16", "Concrete128",
        "Generic0", "Generic1", "Generic16", "Generic128",
        "NonGeneric0", "NonGeneric1", "NonGeneric16", "NonGeneric128",
        "Retained0", "Retained1", "Retained16", "Retained128",
        "ValidateNull", "ValidateEmpty", "ValidateSuppressed", "ValidateRemapped",
        "ValidateExtra16", "ValidateExtra128", "ValidateMetadata", "ValidateStrategy"
    ];

    private readonly Traversal _traversal;
    private readonly ValidationStateDictionary _state;
    private readonly ProbeKey[] _keys = [];
    private readonly ValidationStateEntry[] _values = [];
    private readonly ServiceProvider? _services;
    private readonly IObjectModelValidator? _validator;
    private readonly RequiredModel? _model;
    private readonly ActionContext? _context;
    private readonly EmptyChildrenStrategy? _strategy;
    private IEnumerator<KeyValuePair<object, ValidationStateEntry>>? _retained;
    private readonly string[] _providerTypes = [];

    internal string Label { get; }
    internal int ExpectedChecksum { get; }

    internal Workload(string label)
    {
        Evidence.Require(Labels.Contains(label, StringComparer.Ordinal), "Unknown faithful F105 input:" + label);
        Label = label;
        if (!label.StartsWith("Validate", StringComparison.Ordinal))
        {
            var split = label.IndexOfAny(['0', '1']);
            _traversal = Enum.Parse<Traversal>(label[..split]);
            var count = int.Parse(label[split..], CultureInfo.InvariantCulture);
            _state = new ValidationStateDictionary();
            _keys = new ProbeKey[count];
            _values = new ValidationStateEntry[count];
            for (var index = 0; index < count; index++)
            {
                var key = new ProbeKey(index + 1);
                var entry = new ValidationStateEntry { Key = "entry-" + (index + 1) };
                _keys[index] = key;
                _values[index] = entry;
                _state.Add(key, entry);
                ExpectedChecksum += index + 1 + entry.Key.Length;
            }

            return;
        }
        _traversal = Traversal.Validation;
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMvcCore().AddDataAnnotations();
        _services = services.BuildServiceProvider(validateScopes: true);
        _validator = _services.GetRequiredService<IObjectModelValidator>();
        Evidence.Require(_validator.GetType().FullName ==
            "Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultObjectValidator", "Actual public-DI validation owner is required.");
        _providerTypes = _services.GetRequiredService<IOptions<MvcOptions>>().Value.ModelValidatorProviders
            .Select(provider => provider.GetType().FullName ?? throw new InvalidOperationException("Provider type is unnamed.")).ToArray();
        Evidence.Require(_providerTypes.Contains("Microsoft.AspNetCore.Mvc.DataAnnotations.DataAnnotationsModelValidatorProvider", StringComparer.Ordinal),
            "Real DataAnnotations options/provider registration was not reached.");
        _model = new RequiredModel();
        _context = new ActionContext(new DefaultHttpContext { RequestServices = _services }, new RouteData(),
            new ActionDescriptor(), new ModelStateDictionary());
        var metadata = _services.GetRequiredService<IModelMetadataProvider>();
        var binding = DefaultModelBindingContext.CreateBindingContext(_context, new CompositeValueProvider(),
            metadata.GetMetadataForType(typeof(RequiredModel)), bindingInfo: null, modelName: "input");
        _state = binding.ValidationState;
        if (label is not "ValidateNull" and not "ValidateEmpty")
        {
            var entry = new ValidationStateEntry
            {
                Key = label is "ValidateRemapped" ? "renamed" : "input",
                SuppressValidation = label is "ValidateSuppressed"
            };
            if (label is "ValidateMetadata")
            {
                entry.Metadata = metadata.GetMetadataForType(typeof(object));
            }
            if (label is "ValidateStrategy")
            {
                _strategy = new EmptyChildrenStrategy();
                entry.Strategy = _strategy;
            }
            _state.Add(_model, entry);
        }
        var extra = label switch { "ValidateExtra16" => 16, "ValidateExtra128" => 128, _ => 0 };
        for (var index = 0; index < extra; index++)
        {
            _state.Add(new ProbeKey(index + 1), new ValidationStateEntry { Key = "unrelated-" + index });
        }
        ExpectedChecksum = label switch
        {
            "ValidateSuppressed" or "ValidateMetadata" => 0,
            "ValidateStrategy" => 1000,
            _ => 10101
        };
    }

    internal int Run() => _traversal switch
    {
        Traversal.Concrete => Concrete(),
        Traversal.Generic => Generic(),
        Traversal.NonGeneric => NonGeneric(),
        Traversal.Retained => Retained(),
        Traversal.Validation => Validate(),
        _ => throw new InvalidOperationException("Unknown traversal mode.")
    };

    private static int Score(KeyValuePair<object, ValidationStateEntry> pair) => ((ProbeKey)pair.Key).Id + pair.Value.Key.Length;

    private int Concrete()
    {
        var checksum = 0;
        foreach (var pair in _state)
        {
            checksum += Score(pair);
        }

        return checksum;
    }

    private int Generic()
    {
        var checksum = 0;
        foreach (var pair in (IEnumerable<KeyValuePair<object, ValidationStateEntry>>)_state)
        {
            checksum += Score(pair);
        }

        return checksum;
    }

    private int NonGeneric()
    {
        var checksum = 0;
        foreach (KeyValuePair<object, ValidationStateEntry> pair in (IEnumerable)_state)
        {
            checksum += Score(pair);
        }

        return checksum;
    }

    private int Retained()
    {
        var checksum = 0;
        using var iterator = _state.GetEnumerator();
        _retained = iterator;
        while (iterator.MoveNext())
        {
            checksum += Score(iterator.Current);
        }

        return checksum;
    }

    private int Validate()
    {
        var model = _model ?? throw new InvalidOperationException("Real validation model is missing.");
        var context = _context ?? throw new InvalidOperationException("Real validation context is missing.");
        var validator = _validator ?? throw new InvalidOperationException("Public-DI validation owner is missing.");
        model.GetterCount = 0;
        context.ModelState.Clear();
        _strategy?.Reset();
        validator.Validate(context, Label is "ValidateNull" ? null : _state, "input", model);

        return model.GetterCount * 10000 + context.ModelState.ErrorCount * 100 + context.ModelState.Count + (_strategy?.Calls ?? 0) * 1000;
    }

    internal object Input() => new
    {
        label = Label,
        traversal = _traversal.ToString(),
        stateCount = _state.Count,
        expectedChecksum = ExpectedChecksum,
        stateSuppliedToValidator = _traversal is Traversal.Validation && Label is not "ValidateNull",
        dictionaryProducer = _traversal is Traversal.Validation ?
            "Actual DefaultModelBindingContext.CreateBindingContext(...).ValidationState;caller populates overrides;no model binding is executed." :
            "Actual public ValidationStateDictionary constructor;caller inserts reference-distinct value-equal keys.",
        inputRootType = _model?.GetType().FullName,
        requiredErrorMessage = _model is null ? null : RequiredModel.ErrorMessage,
        modelNameValue = (string?)null,
        providers = _providerTypes,
        entries = _state.Select(pair => new
        {
            keyToken = ReferenceEquals(pair.Key, _model) ? "root" :
                pair.Key is ProbeKey key ? "key-" + key.Id : throw new InvalidOperationException("Unexpected real key."),
            entryKey = pair.Value.Key,
            pair.Value.SuppressValidation,
            metadataType = pair.Value.Metadata?.ModelType.FullName,
            strategyType = pair.Value.Strategy?.GetType().FullName
        }).ToArray()
    };

    internal object Capture()
    {
        var first = Run();
        var second = Run();
        Evidence.Require(first == ExpectedChecksum && second == ExpectedChecksum, "Actual complete workload checksum differs:" + Label);
        object outcome;
        if (_traversal is Traversal.Validation)
        {
            var context = _context ?? throw new InvalidOperationException("Missing actual context.");
            var model = _model ?? throw new InvalidOperationException("Missing actual model.");
            var noErrors = Label is "ValidateSuppressed" or "ValidateMetadata" or "ValidateStrategy";
            var expectedKey = Label is "ValidateRemapped" ? "renamed." + nameof(RequiredModel.Name) : "input." + nameof(RequiredModel.Name);
            var errors = context.ModelState.SelectMany(pair =>
            {
                var entry = pair.Value ?? throw new InvalidOperationException("Actual model-state entry is null.");

                return entry.Errors.Select(error => new
                {
                    key = pair.Key,
                    error = error.ErrorMessage,
                    exception = error.Exception?.GetType().FullName,
                    validationState = entry.ValidationState.ToString()
                });
            }).OrderBy(error => error.key, StringComparer.Ordinal).ToArray();
            Evidence.Require(noErrors ? errors.Length == 0 && context.ModelState.Count == 0 && model.GetterCount == 0 :
                errors.Length == 1 && errors[0].key == expectedKey && errors[0].error == RequiredModel.ErrorMessage &&
                errors[0].exception is null && errors[0].validationState == "Invalid" && model.GetterCount == 1 &&
                context.ModelState.Count == 1, "Real Required/override/getter producer outcome differs:" + Label);
            Evidence.Require((_strategy?.Calls ?? 0) == (Label is "ValidateStrategy" ? 1 : 0), "Actual strategy producer was not reached exactly.");
            outcome = new { model.GetterCount, modelStateCount = context.ModelState.Count, errors,
                strategyCalls = _strategy?.Calls ?? 0, actualValidatorType = _validator?.GetType().FullName };
        }
        else
        {
            using var enumerator = _state.GetEnumerator();
            using var other = _state.GetEnumerator();
            var actualIds = new List<int>();
            while (enumerator.MoveNext())
            {
                var pair = enumerator.Current;
                var key = pair.Key as ProbeKey ?? throw new InvalidOperationException("Actual original key type changed.");
                Evidence.Require(key.Id >= 1 && key.Id <= _keys.Length && ReferenceEquals(pair.Key, _keys[key.Id - 1]) &&
                    ReferenceEquals(pair.Value, _values[key.Id - 1]), "Exact inserted key/value identities were not preserved.");
                actualIds.Add(key.Id);
            }
            Evidence.Require(actualIds.SequenceEqual(Enumerable.Range(1, _keys.Length)), "Complete actual insertion-order observation differs.");
            Evidence.Require(_traversal is not Traversal.Retained || _retained is not null, "Explicit retained-interface consumer was bypassed.");
            outcome = new { actualIds, exactInsertedReferences = true, enumeratorType = enumerator.GetType().FullName,
                enumeratorIsValueType = enumerator.GetType().IsValueType,
                independentGetsReturnSameReference = ReferenceEquals(enumerator, other),
                retainedInterfaceType = _traversal is Traversal.Retained ? _retained?.GetType().FullName : null,
                representationProbeOutsideTimingAndNotAllocationProof = true };
        }

        return new { label = Label, expectedChecksum = ExpectedChecksum, first, second, stateCount = _state.Count, outcome };
    }

    public void Dispose()
    {
        _retained = null;
        _services?.Dispose();
    }
}

internal sealed class ProbeKey(int id)
{
    internal int Id { get; } = id;
    internal static int EqualsCalls;
    internal static int HashCalls;

    public override bool Equals(object? other)
    {
        EqualsCalls++;

        return other is ProbeKey;
    }

    public override int GetHashCode()
    {
        HashCalls++;

        return 1;
    }
}

internal sealed class RequiredModel
{
    internal const string ErrorMessage = "F105 required value.";
    internal int GetterCount;

    [Required(ErrorMessage = ErrorMessage)]
    public string? Name
    {
        get
        {
            GetterCount++;

            return null;
        }
    }
}

internal sealed class EmptyChildrenStrategy : IValidationStrategy
{
    internal int Calls { get; private set; }
    internal void Reset() => Calls = 0;

    public IEnumerator<ValidationEntry> GetChildren(ModelMetadata metadata, string key, object model)
    {
        Calls++;

        return Enumerable.Empty<ValidationEntry>().GetEnumerator();
    }
}
