using System.Reflection;
using System.Reflection.Emit;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.ViewComponents;

[MemoryDiagnoser]
public class ViewComponentDiscoveryBenchmark
{
    private static readonly Scenario[] Scenarios =
    [
        new("Empty", 0),
        new("NoComponents_1024", 0, Invalid: 1024),
        new("NoComponents_Prepop64_1024", 0, Prepop: 64, Invalid: 1024),
        new("Runtime_1", 1),
        new("Runtime_8", 8),
        new("Runtime_31", 31),
        new("Runtime_32", 32),
        new("Runtime_33", 33),
        new("Runtime_64", 64),
        new("Runtime_256", 256),
        new("Runtime_1024", 1024),
        new("Repeated_32_3", 32, Parts: 3),
        new("Repeated_64_3", 64, Parts: 3),
        new("Repeated_256_3", 256, Parts: 3),
        new("Repeated_1024_3", 1024, Parts: 3),
        new("PrepopAll_64", 64, Prepop: -1),
        new("PrepopAll_256", 256, Prepop: -1),
        new("PrepopAll_1024", 1024, Prepop: -1),
        new("PrepopDuplicate32_64_2", 64, Parts: 2, Prepop: 32, RepeatFirst: true),
        new("Array_64_2", 64, Parts: 2, Kind: PartKind.Array),
        new("Custom_64_2", 64, Parts: 2, Kind: PartKind.Custom),
        new("Derived_64_2", 64, Parts: 2, Kind: PartKind.Derived),
        new("LazyParts_64_2", 64, Parts: 2, Kind: PartKind.Lazy),
        new("MixedNonTypeParts_64_2", 64, Parts: 2, Kind: PartKind.Mixed),
        new("Filtered_64_64", 64, Invalid: 64)
    ];

    public static IEnumerable<string> Cases => Scenarios.Select(scenario => scenario.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = string.Empty;

    private ApplicationPartManager _manager = null!;
    private ViewComponentFeatureProvider _provider = null!;
    private IEnumerable<ApplicationPart> _parts = null!;
    private TypeInfo[] _preexisting = [];
    private Scenario _scenario = null!;
    private bool _direct;

    [GlobalSetup]
    public void Setup()
    {
        _scenario = Scenarios.Single(scenario => scenario.Name == Case);
        _provider = new ViewComponentFeatureProvider();
        _manager = new ApplicationPartManager();
        _manager.FeatureProviders.Add(_provider);
        var assembly = CreateAssembly(_scenario.Valid, _scenario.Invalid);
        var types = assembly.DefinedTypes.ToArray();
        var valid = types.Take(_scenario.Valid).ToArray();
        var prepopCount = _scenario.Prepop < 0 ? valid.Length : _scenario.Prepop;
        _preexisting = _scenario.RepeatFirst
            ? Enumerable.Repeat(valid[0], prepopCount).ToArray()
            : prepopCount > valid.Length
                ? CreateAssembly(prepopCount, 0).DefinedTypes.ToArray()
                : valid.Take(prepopCount).ToArray();
        for (var i = 0; i < _scenario.Parts; i++)
        {
            ApplicationPart part = _scenario.Kind switch
            {
                PartKind.Custom => new CustomPart(types),
                PartKind.Derived => new DerivedPart(assembly, types),
                _ => new AssemblyPart(assembly)
            };
            _manager.ApplicationParts.Add(part);
        }
        if (_scenario.Kind is PartKind.Mixed)
        {
            _manager.ApplicationParts.Insert(0, new NoTypesPart());
            _manager.ApplicationParts.Add(new NoTypesPart());
        }
        _parts = _scenario.Kind switch
        {
            PartKind.Array => _manager.ApplicationParts.ToArray(),
            PartKind.Lazy => EnumerateParts(_manager.ApplicationParts),
            _ => _manager.ApplicationParts
        };
        _direct = _scenario.Kind is PartKind.Array or PartKind.Lazy;
        var expected = _preexisting.Concat(valid.Except(_preexisting)).ToArray();
        var feature = Populate();
        if (!feature.ViewComponents.SequenceEqual(expected))
        {
            throw new InvalidOperationException($"Complete ordered discovery mismatch for {Case}.");
        }
        foreach (var type in valid)
        {
            if (!type.IsClass || !type.IsPublic || type.GetMethod(nameof(ComponentShape.Invoke)) is null)
            {
                throw new InvalidOperationException("Fixtures must be real public invokable CLR component metadata.");
            }
        }
        var canIndex = _parts is List<ApplicationPart> applicationParts &&
            applicationParts.GetType() == typeof(List<ApplicationPart>) &&
            applicationParts.All(static part => part is not IApplicationPartTypeProvider ||
                part is AssemblyPart assemblyPart && assemblyPart.GetType() == typeof(AssemblyPart) &&
                assemblyPart.Assembly.GetType() == typeof(ViewComponentFeatureProvider).Assembly.GetType());
        var expectedTrusted = _scenario.Kind is PartKind.Runtime or PartKind.Mixed;
        if (canIndex != expectedTrusted || assembly.GetType() != typeof(ViewComponentFeatureProvider).Assembly.GetType())
        {
            throw new InvalidOperationException("The actual runtime producer did not reach its claimed indexing/fallback preconditions.");
        }
        var checksum = Consume(feature);
        if (Discover() != checksum || Discover() != checksum)
        {
            throw new InvalidOperationException("Repeated complete discovery changed result/state.");
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            Case,
            InputTypes = types.Length,
            ValidTypes = valid.Length,
            Prepopulated = _preexisting.Length,
            ResultCount = feature.ViewComponents.Count,
            CompleteOrderedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
                string.Join("\n", feature.ViewComponents.Select(type => type.FullName))))),
            Checksum = checksum,
            ActualPartsRuntimeType = _parts.GetType().FullName,
            ActualAssemblyRuntimeType = assembly.GetType().FullName,
            TrustedProducerPreconditions = canIndex,
            IndexThresholdReachable = canIndex && valid.Length != 0 &&
                (_preexisting.Length >= 32 || feature.ViewComponents.Count > 32 ||
                    _scenario.Parts > 1 && feature.ViewComponents.Count >= 32),
            DirectProvider = _direct
        }));
    }

    [Benchmark]
    public int Discover()
    {
        return Consume(Populate());
    }

    private ViewComponentFeature Populate()
    {
        var feature = new ViewComponentFeature();
        foreach (var type in _preexisting)
        {
            feature.ViewComponents.Add(type);
        }
        if (_direct)
        {
            _provider.PopulateFeature(_parts, feature);
        }
        else
        {
            _manager.PopulateFeature(feature);
        }
        return feature;
    }

    private static int Consume(ViewComponentFeature feature)
    {
        var count = feature.ViewComponents.Count;
        return count == 0 ? 0 : count + feature.ViewComponents[0].Name.Length +
            feature.ViewComponents[count - 1].Name.Length;
    }

    private static Assembly CreateAssembly(int valid, int invalid)
    {
        var builder = new PersistedAssemblyBuilder(
            new AssemblyName($"AutoPerf_F241_{Guid.NewGuid():N}"), typeof(object).Assembly);
        var module = builder.DefineDynamicModule("Components");
        for (var i = 0; i < valid + invalid; i++)
        {
            var isValid = i < valid;
            var attributed = isValid && i % 2 != 0;
            var name = $"Fixtures.Component{i:D4}" + (attributed || !isValid ? "Candidate" : "ViewComponent");
            var type = module.DefineType(name, TypeAttributes.Public | TypeAttributes.Sealed);
            if (attributed)
            {
                var constructor = typeof(ViewComponentAttribute).GetConstructor(Type.EmptyTypes)
                    ?? throw new InvalidOperationException("Missing actual ViewComponentAttribute constructor.");
                type.SetCustomAttribute(new CustomAttributeBuilder(constructor, []));
            }
            var invoke = type.DefineMethod(
                nameof(ComponentShape.Invoke), MethodAttributes.Public, typeof(string), Type.EmptyTypes);
            var il = invoke.GetILGenerator();
            il.Emit(OpCodes.Ldstr, string.Empty);
            il.Emit(OpCodes.Ret);
            type.CreateTypeInfo();
        }
        using var stream = new MemoryStream();
        builder.Save(stream);
        return Assembly.Load(stream.ToArray());
    }

    private static IEnumerable<ApplicationPart> EnumerateParts(IList<ApplicationPart> parts)
    {
        foreach (var part in parts)
        {
            yield return part;
        }
    }

    private sealed record Scenario(string Name, int Valid, int Parts = 1, int Prepop = 0,
        bool RepeatFirst = false, PartKind Kind = PartKind.Runtime, int Invalid = 0);

    private enum PartKind
    {
        Runtime,
        Array,
        Custom,
        Derived,
        Lazy,
        Mixed
    }

    private sealed class CustomPart(IEnumerable<TypeInfo> types) : ApplicationPart, IApplicationPartTypeProvider
    {
        public override string Name => "Custom";
        public IEnumerable<TypeInfo> Types { get; } = types;
    }

    private sealed class DerivedPart(Assembly assembly, IEnumerable<TypeInfo> types)
        : AssemblyPart(assembly), IApplicationPartTypeProvider
    {
        IEnumerable<TypeInfo> IApplicationPartTypeProvider.Types => types;
    }

    private sealed class NoTypesPart : ApplicationPart
    {
        public override string Name => "Non-type part";
    }

    private sealed class ComponentShape
    {
        public string Invoke() => string.Empty;
    }
}
