using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

internal sealed class UnionFixture : IDisposable
{
    public static readonly string[] Cases =
    [
        "ImplicitInt", "ImplicitValid", "ImplicitInvalid", "ExplicitValid", "ExplicitInvalid",
        "NamesakeCaseInvalid", "NamesakePropertyInvalid", "InheritedInvalid", "OverrideInvalid",
        "ImplicitArray8Valid", "ImplicitArray64Valid", "ImplicitArray8Invalid", "ImplicitArray64Invalid",
        "InterfaceMixed8", "InterfaceMixed64", "Depth4", "Depth16", "Depth64Valid",
        "Wide8", "Wide32", "DecoratedImplicitInvalid", "DecoratedNamesakeInvalid",
        "SuppressedUnion", "SuppressedValue", "CustomStrategy", "PlainObject",
        "PlainCheckedCase", "TopLevelValueInvalid", "FilterEnabled", "FilterSuppressed",
    ];
    private readonly ServiceProvider _services;
    private readonly IObjectModelValidator _validator;
    private readonly ActionContext _context = new() { HttpContext = new DefaultHttpContext() };
    private readonly object _model;
    private readonly List<Counter> _counters = [];
    private readonly List<Error> _expectedErrors = [];
    private ValidationStateDictionary? _validationState;
    private ModelMetadata? _topLevelMetadata;
    private string? _seedKey;

    public UnionFixture(string name)
    {
        Name = name;
        _services = CreateServices(name.StartsWith("Decorated", StringComparison.Ordinal));
        _validator = _services.GetRequiredService<IObjectModelValidator>();
        _context.ModelState.MaxAllowedErrors = 2048;
        _model = name switch
        {
            "ImplicitInt" => Implicit(42),
            "ImplicitValid" => Implicit(CaseValue(false)),
            "ImplicitInvalid" or "DecoratedImplicitInvalid" => Implicit(CaseValue(true, "model.Value")),
            "ExplicitValid" => Explicit(CaseValue(false)),
            "ExplicitInvalid" => Explicit(CaseValue(true, "model.Value")),
            "NamesakeCaseInvalid" or "DecoratedNamesakeInvalid" => Namesake(false),
            "NamesakePropertyInvalid" => Namesake(true),
            "InheritedInvalid" => Derived(false),
            "OverrideInvalid" => Derived(true),
            "ImplicitArray8Valid" => Array(8, false),
            "ImplicitArray64Valid" => Array(64, false),
            "ImplicitArray8Invalid" => Array(8, true),
            "ImplicitArray64Invalid" => Array(64, true),
            "InterfaceMixed8" => Mixed(8),
            "InterfaceMixed64" => Mixed(64),
            "Depth4" => Depth(4),
            "Depth16" => Depth(16),
            "Depth64Valid" => Depth(64, invalid: false),
            "Wide8" => Wide(false),
            "Wide32" => Wide(true),
            "SuppressedUnion" => Suppressed(true),
            "SuppressedValue" => Suppressed(false),
            "CustomStrategy" => Custom(),
            "PlainObject" => new PlainEnvelope { Value = CaseValue(true, expectedCalls: 0) },
            "PlainCheckedCase" => CaseValue(true, "model"),
            "TopLevelValueInvalid" => TopLevel(),
            "FilterEnabled" => Filter(false),
            "FilterSuppressed" => Filter(true),
            _ => throw new ArgumentOutOfRangeException(nameof(name), name, "Unknown actual MVC validation profile."),
        };
    }

    public string Name { get; }

    public static ServiceProvider CreateServices(bool decorated = false)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddControllers(options => options.MaxValidationDepth = 256);
        if (decorated)
        {
            services.AddSingleton<IModelMetadataProvider>(provider =>
                new MetadataDecorator(ActivatorUtilities.CreateInstance<DefaultModelMetadataProvider>(provider)));
        }
        return services.BuildServiceProvider();
    }

    public int Validate()
    {
        _context.ModelState.Clear();
        if (_seedKey is not null)
        {
            _context.ModelState.SetModelValue(_seedKey, "ignored", "ignored");
        }
        if (_topLevelMetadata is not null)
        {
            ((ObjectModelValidator)_validator).Validate(_context, null, "model.Value",
                ((LengthUnion)_model).Value, _topLevelMetadata, container: _model);
        }
        else
        {
            _validator.Validate(_context, _validationState, "model", _model);
        }
        return _context.ModelState.ErrorCount;
    }

    public UnionContract Capture()
    {
        string state = "";
        long[] deltas = [];
        for (var repeat = 0; repeat < 2; repeat++)
        {
            var before = _counters.Select(counter => counter.Read()).ToArray();
            Validate();
            deltas = _counters.Select((counter, index) => counter.Read() - before[index]).ToArray();
            var errors = ReadErrors(_context);
            var expected = _expectedErrors.OrderBy(error => error.Key, StringComparer.Ordinal)
                .ThenBy(error => error.Message, StringComparer.Ordinal).ToArray();
            if (!errors.SequenceEqual(expected) || _context.ModelState.IsValid != (expected.Length is 0) ||
                !deltas.SequenceEqual(_counters.Select(counter => counter.Expected)))
            {
                throw new InvalidOperationException($"Actual MVC state/getter/validator/filter contract failed: {Name};" +
                    $" errors={JsonSerializer.Serialize(errors)},counts={JsonSerializer.Serialize(deltas)}," +
                    $"expected={JsonSerializer.Serialize(_counters.Select(counter => counter.Expected))}.");
            }
            if (_seedKey is not null && _context.ModelState[_seedKey]!.ValidationState != ModelValidationState.Skipped)
            {
                throw new InvalidOperationException($"Actual MVC suppression did not mark the seeded state: {Name}.");
            }
            state = JsonSerializer.Serialize(new
            {
                errors,
                entries = _context.ModelState.OrderBy(entry => entry.Key, StringComparer.Ordinal).Select(entry =>
                {
                    if (entry.Value is not { } value)
                    {
                        throw new InvalidOperationException("Actual ModelState entry is missing.");
                    }
                    return new { key = entry.Key, state = value.ValidationState.ToString() };
                }),
                counters = _counters.Select((counter, index) => new { kind = counter.Kind, count = deltas[index] }),
            });
        }
        return new UnionContract(Name, state, _context.ModelState.ErrorCount,
            Sum("getter", deltas), Sum("validator", deltas), Sum("filter", deltas));
    }

    public static Error[] ReadErrors(ActionContext context)
    {
        return context.ModelState.SelectMany(entry =>
        {
            if (entry.Value is not { } value)
            {
                throw new InvalidOperationException("Actual ModelState entry is missing.");
            }
            return value.Errors.Select(error => new Error(entry.Key, error.ErrorMessage));
        })
            .OrderBy(error => error.Key, StringComparer.Ordinal).ThenBy(error => error.Message, StringComparer.Ordinal).ToArray();
    }

    private long Sum(string kind, long[] counts)
    {
        return _counters.Select((counter, index) => counter.Kind == kind ? counts[index] : 0).Sum();
    }

    private CheckedCase CaseValue(bool invalid, string? errorKey = null, long expectedCalls = 1)
    {
        var value = new CheckedCase(invalid ? "invalid" : "valid");
        _counters.Add(new Counter("validator", value.ReadCalls, expectedCalls));
        if (invalid && errorKey is not null)
        {
            _expectedErrors.Add(new Error(errorKey, "Invalid case."));
        }
        return value;
    }

    private ProbeUnion Implicit(object? value, long expectedCalls = 1)
    {
        var model = new ProbeUnion(value);
        _counters.Add(new Counter("getter", model.ReadCalls, expectedCalls));
        return model;
    }

    private ExplicitUnion Explicit(object? value, long expectedCalls = 1)
    {
        var model = new ExplicitUnion(value);
        _counters.Add(new Counter("getter", model.ReadCalls, expectedCalls));
        return model;
    }

    private NamesakeUnion Namesake(bool invalidProperty)
    {
        var model = new NamesakeUnion(invalidProperty ? null : "public",
            CaseValue(!invalidProperty, invalidProperty ? null : "model.Value", invalidProperty ? 0 : 1));
        _counters.Add(new Counter("getter", model.ReadPublicCalls, 1));
        _counters.Add(new Counter("getter", model.ReadCaseCalls, 1));
        if (invalidProperty)
        {
            _expectedErrors.Add(new Error("model.Value", "The Value field is required."));
        }
        return model;
    }

    private ProbeUnion Derived(bool overridden)
    {
        var value = CaseValue(true, "model.Value");
        ProbeUnion model = overridden ? new OverrideUnion(value) : new InheritedUnion(value);
        _counters.Add(new Counter("getter", model.ReadCalls, 1));
        return model;
    }

    private ProbeUnion[] Array(int count, bool invalid)
    {
        return Enumerable.Range(0, count)
            .Select(index => Implicit(CaseValue(invalid, invalid ? $"model[{index}].Value" : null))).ToArray();
    }

    private IUnion[] Mixed(int count)
    {
        return Enumerable.Range(0, count).Select(index =>
        {
            var value = CaseValue(true, $"model[{index}].Value");
            return index % 2 is 0 ? (IUnion)Implicit(value) : Explicit(value);
        }).ToArray();
    }

    private object Depth(int depth, bool invalid = true)
    {
        object model = CaseValue(invalid, invalid ? "model" + string.Concat(Enumerable.Repeat(".Value", depth)) : null);
        for (var index = 0; index < depth; index++)
        {
            model = Implicit(model);
        }
        return model;
    }

    private ProbeUnion Wide(bool large)
    {
        var value = CaseValue(true, "model.Value");
        ProbeUnion model = large ? new Wide32Union(value) : new Wide8Union(value);
        _counters.Add(new Counter("getter", model.ReadCalls, 1));
        return model;
    }

    private object Suppressed(bool wholeUnion)
    {
        _seedKey = wholeUnion ? "model.Value.Name" : "model.Value";
        return wholeUnion ? new SuppressedUnion() : new SuppressedValueUnion();
    }

    private object Custom()
    {
        var model = Implicit(CaseValue(true, expectedCalls: 0), expectedCalls: 0);
        _validationState = new ValidationStateDictionary
        {
            [model] = new ValidationStateEntry { Strategy = new EmptyStrategy() },
        };
        return model;
    }

    private object TopLevel()
    {
        var model = new LengthUnion("long");
        _counters.Add(new Counter("getter", model.ReadCalls, 1));
        _expectedErrors.Add(new Error("model.Value", "The field Value must be a string or array type with a maximum length of '3'."));
        _topLevelMetadata = _services.GetRequiredService<IModelMetadataProvider>()
            .GetMetadataForProperties(typeof(LengthUnion)).Single(property => property.PropertyName == nameof(IUnion.Value));
        return model;
    }

    private object Filter(bool suppress)
    {
        var model = new FilterUnion(CaseValue(true, suppress ? null : "model.Value", suppress ? 0 : 1), suppress);
        _counters.Add(new Counter("getter", model.ReadGetterCalls, suppress ? 0 : 1));
        _counters.Add(new Counter("filter", model.ReadFilterCalls, 1));
        if (suppress)
        {
            _seedKey = "model.Value";
        }
        return model;
    }

    public void Dispose()
    {
        _services.Dispose();
    }

    private sealed record Counter(string Kind, Func<long> Read, long Expected);

    private sealed class MetadataDecorator(IModelMetadataProvider inner) : IModelMetadataProvider
    {
        public ModelMetadata GetMetadataForType(Type modelType) => inner.GetMetadataForType(modelType);
        public IEnumerable<ModelMetadata> GetMetadataForProperties(Type modelType) => inner.GetMetadataForProperties(modelType);
    }

    private sealed class ExplicitUnion(object? value) : IUnion
    {
        private long _calls;
        object? IUnion.Value
        {
            get
            {
                _calls++;
                return value;
            }
        }
        public long ReadCalls() => _calls;
    }

    private sealed class NamesakeUnion(object? publicValue, object? caseValue) : IUnion
    {
        private long _publicCalls;
        private long _caseCalls;
        [Required]
        public object? Value
        {
            get
            {
                _publicCalls++;
                return publicValue;
            }
        }
        object? IUnion.Value
        {
            get
            {
                _caseCalls++;
                return caseValue;
            }
        }
        public long ReadPublicCalls() => _publicCalls;
        public long ReadCaseCalls() => _caseCalls;
    }

    private sealed class InheritedUnion(object? value) : ProbeUnion(value);
    private sealed class OverrideUnion(object? value) : ProbeUnion(value)
    {
        public override object? Value => base.Value;
    }

    private class Wide8Union(object? value) : ProbeUnion(value)
    {
        public int P0 => 0;
        public int P1 => 0;
        public int P2 => 0;
        public int P3 => 0;
        public int P4 => 0;
        public int P5 => 0;
        public int P6 => 0;
        public int P7 => 0;
    }

    private sealed class Wide32Union(object? value) : Wide8Union(value)
    {
        public int P8 => 0;
        public int P9 => 0;
        public int P10 => 0;
        public int P11 => 0;
        public int P12 => 0;
        public int P13 => 0;
        public int P14 => 0;
        public int P15 => 0;
        public int P16 => 0;
        public int P17 => 0;
        public int P18 => 0;
        public int P19 => 0;
        public int P20 => 0;
        public int P21 => 0;
        public int P22 => 0;
        public int P23 => 0;
        public int P24 => 0;
        public int P25 => 0;
        public int P26 => 0;
        public int P27 => 0;
        public int P28 => 0;
        public int P29 => 0;
        public int P30 => 0;
        public int P31 => 0;
    }

    [ValidateNever]
    private sealed class SuppressedUnion : IUnion
    {
        object? IUnion.Value => throw new InvalidOperationException("Suppressed union getter was invoked.");
    }

    private sealed class SuppressedValueUnion : IUnion
    {
        [ValidateNever]
        public object? Value => throw new InvalidOperationException("Suppressed Value getter was invoked.");
    }

    private sealed class EmptyStrategy : IValidationStrategy
    {
        public IEnumerator<ValidationEntry> GetChildren(ModelMetadata metadata, string key, object model)
            => Enumerable.Empty<ValidationEntry>().GetEnumerator();
    }

    private sealed class PlainEnvelope
    {
        public object? Value { get; set; }
    }

    private sealed class LengthUnion(string value) : IUnion
    {
        private long _calls;
        [MaxLength(3)]
        public object? Value
        {
            get
            {
                _calls++;
                return value;
            }
        }
        public long ReadCalls() => _calls;
    }

    private sealed class FilterUnion(object? value, bool suppress) : IUnion
    {
        private long _getterCalls;
        private long _filterCalls;
        [FilterValidation]
        public object? Value
        {
            get
            {
                _getterCalls++;
                return value;
            }
        }
        public long ReadGetterCalls() => _getterCalls;
        public long ReadFilterCalls() => _filterCalls;
        public bool Filter()
        {
            _filterCalls++;
            return !suppress;
        }
    }

    [AttributeUsage(AttributeTargets.Property)]
    private sealed class FilterValidationAttribute : Attribute, IPropertyValidationFilter
    {
        public bool ShouldValidateEntry(ValidationEntry entry, ValidationEntry parentEntry)
        {
            if (parentEntry.Model is not FilterUnion model)
            {
                throw new InvalidOperationException("Actual validation filter parent is missing.");
            }
            return model.Filter();
        }
    }
}

public class ProbeUnion(object? value) : IUnion
{
    private long _calls;
    public virtual object? Value
    {
        get
        {
            _calls++;
            return value;
        }
    }
    public long ReadCalls() => _calls;
}

internal sealed class CheckedCase(string name) : IValidatableObject
{
    private long _calls;
    public string Name { get; } = name;
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        _calls++;
        if (Name == "invalid")
        {
            yield return new ValidationResult("Invalid case.");
        }
    }
    public long ReadCalls() => _calls;
}

internal sealed record Error(string Key, string Message);
internal sealed record UnionContract(string Name, string State, int Errors, long GetterCalls, long CaseValidations, long FilterCalls);

internal sealed class UnionColdFixture : IDisposable
{
    public const int BatchSize = 64;
    public static readonly string[] Cases = ["FreshDerived64", "FreshDeclared64"];
    private readonly ServiceProvider _services;
    private readonly IObjectModelValidator _validator;
    private readonly ActionContext _context = new() { HttpContext = new DefaultHttpContext() };
    private readonly object[] _models;
    private readonly CheckedCase[] _values;

    public UnionColdFixture(string name)
    {
        Name = name;
        if (!Cases.Contains(name, StringComparer.Ordinal))
        {
            throw new ArgumentOutOfRangeException(nameof(name));
        }
        _services = UnionFixture.CreateServices();
        _validator = _services.GetRequiredService<IObjectModelValidator>();
        var metadataProvider = _services.GetRequiredService<IModelMetadataProvider>();
        var generation = Guid.NewGuid().ToString("N");
        var assembly = AssemblyBuilder.DefineDynamicAssembly(
            new AssemblyName("F087Cold_" + generation), AssemblyBuilderAccess.RunAndCollect);
        var module = assembly.DefineDynamicModule("Union");
        _models = new object[BatchSize];
        _values = new CheckedCase[BatchSize];
        for (var index = 0; index < BatchSize; index++)
        {
            var type = name == "FreshDerived64" ? Derived(module, index) : Declared(module, index);
            _values[index] = new CheckedCase("invalid");
            _models[index] = Activator.CreateInstance(type, _values[index])!;
            var metadata = metadataProvider.GetMetadataForType(type);
            _ = metadata.Properties.Count;
            _ = metadata.HasValidators;
            foreach (var property in metadata.Properties)
            {
                _ = property.PropertyGetter;
            }
        }
        if (_models.Select(model => model.GetType()).Distinct().Count() != BatchSize)
        {
            throw new InvalidOperationException("Cold MVC batch must contain64 distinct actual runtime union Types.");
        }
        Console.WriteLine($"AUTOPERF_UNION_COLD={name};generation={generation};types={BatchSize}");
    }

    public string Name { get; }

    public int ValidateBatch()
    {
        var errors = 0;
        foreach (var model in _models)
        {
            _context.ModelState.Clear();
            _validator.Validate(_context, null, "model", model);
            errors += _context.ModelState.ErrorCount;
        }
        return errors;
    }

    public UnionContract Capture()
    {
        var states = new List<object>();
        for (var index = 0; index < _models.Length; index++)
        {
            _context.ModelState.Clear();
            _validator.Validate(_context, null, "model", _models[index]);
            var errors = UnionFixture.ReadErrors(_context);
            if (_context.ModelState.IsValid || errors.Length != 1 ||
                errors[0] != new Error("model.Value", "Invalid case.") || _values[index].ReadCalls() != 1)
            {
                throw new InvalidOperationException("Actual first-use union case validation was not reached.");
            }
            states.Add(new { errors, validations = _values[index].ReadCalls() });
        }
        return new UnionContract(Name, JsonSerializer.Serialize(states), BatchSize, BatchSize, BatchSize, 0);
    }

    private static Type Derived(ModuleBuilder module, int index)
    {
        var builder = module.DefineType("Derived" + index, TypeAttributes.Public, typeof(ProbeUnion));
        var constructor = builder.DefineConstructor(MethodAttributes.Public, CallingConventions.Standard, [typeof(object)]);
        var il = constructor.GetILGenerator();
        il.Emit(OpCodes.Ldarg_0);
        il.Emit(OpCodes.Ldarg_1);
        il.Emit(OpCodes.Call, typeof(ProbeUnion).GetConstructor([typeof(object)])!);
        il.Emit(OpCodes.Ret);
        return builder.CreateType()!;
    }

    private static Type Declared(ModuleBuilder module, int index)
    {
        var builder = module.DefineType("Declared" + index, TypeAttributes.Public, typeof(object), [typeof(IUnion)]);
        var field = builder.DefineField("_value", typeof(object), FieldAttributes.Private);
        var constructor = builder.DefineConstructor(MethodAttributes.Public, CallingConventions.Standard, [typeof(object)]);
        var il = constructor.GetILGenerator();
        il.Emit(OpCodes.Ldarg_0);
        il.Emit(OpCodes.Call, typeof(object).GetConstructor(Type.EmptyTypes)!);
        il.Emit(OpCodes.Ldarg_0);
        il.Emit(OpCodes.Ldarg_1);
        il.Emit(OpCodes.Stfld, field);
        il.Emit(OpCodes.Ret);
        var getter = builder.DefineMethod("get_Value",
            MethodAttributes.Public | MethodAttributes.Virtual | MethodAttributes.Final | MethodAttributes.NewSlot |
            MethodAttributes.HideBySig | MethodAttributes.SpecialName, typeof(object), Type.EmptyTypes);
        il = getter.GetILGenerator();
        il.Emit(OpCodes.Ldarg_0);
        il.Emit(OpCodes.Ldfld, field);
        il.Emit(OpCodes.Ret);
        var property = builder.DefineProperty(nameof(IUnion.Value), PropertyAttributes.None, typeof(object), Type.EmptyTypes);
        property.SetGetMethod(getter);
        builder.DefineMethodOverride(getter, typeof(IUnion).GetProperty(nameof(IUnion.Value))!.GetMethod!);
        return builder.CreateType()!;
    }

    public void Dispose()
    {
        _services.Dispose();
    }
}
