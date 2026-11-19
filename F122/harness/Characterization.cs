// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using System.Reflection;
using System.Reflection.Emit;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AutoPerf;

internal static class Characterization
{
    internal static void AuditProducerAndConsumers()
    {
        const string definitionName = "Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteList`1";
        var definition = typeof(ControllerContext).Assembly.GetType(definitionName, throwOnError: true)!;
        var target = definition.GetMethod(nameof(IEnumerable.GetEnumerator), BindingFlags.Instance | BindingFlags.Public)!;
        Evidence.Require(definition.IsNotPublic && target.ReturnType.IsInterface,
            "Require the actual internal owner and original interface-returning concrete member.");
        var closed = definition.MakeGenericType(typeof(IValueProviderFactory));
        var genericTarget = closed.GetInterfaceMap(typeof(IEnumerable<IValueProviderFactory>)).TargetMethods.Single();
        var nonGenericTarget = closed.GetInterfaceMap(typeof(IEnumerable)).TargetMethods.Single();
        Evidence.Require(genericTarget == closed.GetMethod(nameof(IEnumerable.GetEnumerator))
            && nonGenericTarget.Name == "System.Collections.IEnumerable.GetEnumerator",
            "The actual interface maps no longer match the inspected original dispatch boundary.");
        foreach (var context in new[] { typeof(ControllerContext), typeof(PageContext) })
        {
            var property = context.GetProperty(nameof(ControllerContext.ValueProviderFactories))!;
            Evidence.Require(property.PropertyType == typeof(IList<IValueProviderFactory>),
                "The actual public producer property no longer has the inspected interface boundary.");
            Evidence.Write("actual-public-consumer-static-type", new
            {
                actualContext = context.FullName, actualProperty = property.Name,
                actualDeclaredType = property.PropertyType.ToString(),
                actualConcretePatternSelectableThroughProperty = false,
                actualOwnerLocation = context.Assembly.Location
            });
        }
        var opcodes = typeof(OpCodes).GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field.FieldType == typeof(OpCode))
            .Select(field => (OpCode)field.GetValue(null)!).ToDictionary(opcode => opcode.Value);
        var modules = new List<object>();
        var matching = new List<(string CallerType, string CallerMethod, string Target, object Record)>();
        var methodOperands = 0;
        var bodies = 0;
        foreach (var filename in Directory.GetFiles(AppContext.BaseDirectory, "Microsoft.AspNetCore.Mvc*.dll").Order())
        {
            var assembly = Assembly.Load(AssemblyName.GetAssemblyName(filename));
            Evidence.Require(string.Equals(Path.GetFullPath(assembly.Location), Path.GetFullPath(filename), StringComparison.OrdinalIgnoreCase),
                "Every inspected MVC module must be the exact frozen image entry.");
            var moduleBodies = 0;
            var moduleOperands = 0;
            foreach (var type in assembly.GetTypes().OrderBy(type => type.FullName))
            {
                const BindingFlags flags = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance | BindingFlags.DeclaredOnly;
                var methods = type.GetMethods(flags).Cast<MethodBase>().Concat(type.GetConstructors(flags))
                    .Concat(type.TypeInitializer is { } initializer ? [initializer] : [])
                    .DistinctBy(method => method.MetadataToken);
                foreach (var method in methods)
                {
                    if (method.GetMethodBody()?.GetILAsByteArray() is not { } il)
                    {
                        continue;
                    }
                    moduleBodies++;
                    var position = 0;
                    while (position < il.Length)
                    {
                        var offset = position;
                        var first = il[position++];
                        var value = first == 0xFE ? unchecked((short)(0xFE00 | il[position++])) : (short)first;
                        Evidence.Require(opcodes.TryGetValue(value, out var opcode), "Unknown IL opcode in the bounded caller audit.");
                        if (opcode.OperandType == OperandType.InlineMethod)
                        {
                            var token = BitConverter.ToInt32(il, position);
                            var called = method.Module.ResolveMethod(token,
                                type.IsGenericType ? type.GetGenericArguments() : null,
                                method.IsGenericMethod ? method.GetGenericArguments() : null)!;
                            moduleOperands++;
                            if (called.DeclaringType is { IsGenericType: true } owner
                                && owner.GetGenericTypeDefinition().FullName == definitionName)
                            {
                                var record = new
                                {
                                    actualCallerAssembly = assembly.GetName().Name, actualCallerType = type.FullName,
                                    actualCallerMethod = method.Name, actualCallerMetadataToken = method.MetadataToken,
                                    actualIlOffset = offset, actualOpcode = opcode.Name,
                                    actualTargetAssembly = owner.Assembly.GetName().Name,
                                    actualTargetType = owner.ToString(), actualTargetMethod = called.Name,
                                    actualTargetSignature = called.ToString()
                                };
                                matching.Add((type.FullName!, method.Name, called.Name, record));
                            }
                        }
                        position += opcode.OperandType switch
                        {
                            OperandType.InlineNone => 0,
                            OperandType.ShortInlineBrTarget or OperandType.ShortInlineI or OperandType.ShortInlineVar => 1,
                            OperandType.InlineVar => 2,
                            OperandType.InlineBrTarget or OperandType.InlineField or OperandType.InlineI
                                or OperandType.InlineMethod or OperandType.InlineSig or OperandType.InlineString
                                or OperandType.InlineTok or OperandType.InlineType or OperandType.ShortInlineR => 4,
                            OperandType.InlineI8 or OperandType.InlineR => 8,
                            OperandType.InlineSwitch => checked(4 + BitConverter.ToInt32(il, position) * 4),
                            _ => throw new InvalidOperationException("Unsupported IL operand: " + opcode.OperandType)
                        };
                        Evidence.Require(position <= il.Length, "IL operand crossed the method body boundary.");
                    }
                }
            }
            bodies += moduleBodies;
            methodOperands += moduleOperands;
            modules.Add(new
            {
                actualAssembly = assembly.GetName().Name, actualPath = filename,
                actualSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(filename))),
                actualIlBodies = moduleBodies, actualMethodOperands = moduleOperands
            });
        }
        var enumeration = matching.Where(item => item.Target == nameof(IEnumerable.GetEnumerator)).ToArray();
        var forwarding = enumeration.Where(item => item.CallerType == definitionName
            && item.CallerMethod == "System.Collections.IEnumerable.GetEnumerator").ToArray();
        Evidence.Require(bodies > 0 && methodOperands > 0 && matching.Count(item => item.Target == ".ctor") >= 4
            && forwarding.Length == 1, "The bounded IL audit must actually reach the known producers and non-generic forwarder.");
        Evidence.Write("bounded-shipping-il-audit", new
        {
            actualModules = modules.Count, actualIlBodies = bodies, actualDecodedMethodOperands = methodOperands,
            actualMatchingConstructorSites = matching.Count(item => item.Target == ".ctor"),
            actualConcreteGetEnumeratorMethodOperands = enumeration.Length,
            actualNonGenericForwardingOperands = forwarding.Length,
            actualOtherConcreteGetEnumeratorOperands = enumeration.Length - forwarding.Length,
            actualCandidateConcretePatternProductionFitDemonstrated = enumeration.Length > forwarding.Length,
            actualGenericInterfaceTargetsOriginalPublicMember = true,
            actualNonGenericInterfaceTargetsForwarder = true,
            actualConcreteReturnType = target.ReturnType.ToString(),
            actualGenericTargetMetadataToken = genericTarget.MetadataToken,
            actualNonGenericTargetMetadataToken = nonGenericTarget.MetadataToken,
            actualFullRepositoryOrExternalDynamicCallerAbsenceClaimed = false,
            modules, matches = matching.Select(item => item.Record).ToArray()
        });
    }

    internal static async Task RunAsync()
    {
        foreach (var profile in Enum.GetValues<CollectionProfile>())
        {
            foreach (var enabled in new[] { false, true })
            {
                var scenario = await CollectionScenario.CreateAsync(profile, enabled).ConfigureAwait(false);
                scenario.Validate();
                var benchmark = new CollectionBenchmarks { Profile = profile };
                benchmark.Setup();
                var generic = benchmark.EnumerateGeneric();
                var nonGeneric = benchmark.EnumerateNonGeneric();
                using var retained = benchmark.RetainGenericEnumerator();
                Evidence.Require(generic == nonGeneric
                    && generic == CollectionScenario.GetPreparedBenchmark(profile).ExpectedChecksum
                    && benchmark.UnchangedIndexOf() == -1,
                    "Every public benchmark method must consume its actual prepared collection.");
                Evidence.Write("actual-prepared-public-contract", new
                {
                    actualProfile = profile.ToString(), actualEnableActionInvokers = enabled,
                    actualCount = scenario.Factories.Count, actualGenericAndNonGenericReferencesAndOrderVerified = true,
                    actualPreparedBenchmarkChecksumVerified = true, actualRetainedEnumeratorAcquiredAndDisposed = true,
                    actualPassed = true
                });
            }
        }
        foreach (var copied in new[] { false, true })
        {
            var first = new object();
            var last = new object();
            var later = new object();
            var source = new List<object?> { first, null, last };
            var list = Create<object?>(source, copied);
            source.Add(later);
            object?[] expected = copied ? [first, null, last] : [first, null, last, later];
            Evidence.Require(list.SequenceEqual(expected, ReferenceEqualityComparer.Instance)
                && Consume(list).SequenceEqual(expected, ReferenceEqualityComparer.Instance),
                "Generic/non-generic null references, order or store isolation changed.");
            Evidence.Write("actual-enumeration-reference-isolation-contract", new { actualCopied = copied, actualPassed = true });

            var cursorList = Create<object>([first, last], copied);
            using var cursor = cursorList.GetEnumerator();
            var nonGeneric = (IEnumerator)cursor;
            RequireFailure<InvalidOperationException>(() => _ = nonGeneric.Current);
            Evidence.Require(cursor.MoveNext() && ReferenceEquals(cursor.Current, first)
                && cursor.MoveNext() && ReferenceEquals(cursor.Current, last) && !cursor.MoveNext(),
                "The original enumerator cursor changed.");
            RequireFailure<InvalidOperationException>(() => _ = nonGeneric.Current);
            cursor.Reset();
            RequireFailure<InvalidOperationException>(() => _ = nonGeneric.Current);
            Evidence.Require(cursor.MoveNext() && ReferenceEquals(cursor.Current, first), "Reset did not restart the actual enumerator.");
            Evidence.Write("actual-enumeration-cursor-contract", new { actualCopied = copied, actualPassed = true });
        }
        foreach (var nonGeneric in new[] { false, true })
        {
            var first = new object();
            var last = new object();
            var added = new object();
            var list = Create<object>([first, last], copied: false);
            var captured = GetEnumerator(list, nonGeneric);
            list.Add(added);
            Evidence.Require(captured.MoveNext() && ReferenceEquals(captured.Current, first)
                && captured.MoveNext() && ReferenceEquals(captured.Current, last) && !captured.MoveNext() && list.Count == 3,
                "The enumerator must eagerly capture the original store before the first write.");
            ((IDisposable)captured).Dispose();
            var copied = Create<object>([first, last], copied: true);
            var versioned = GetEnumerator(copied, nonGeneric);
            Evidence.Require(versioned.MoveNext(), "The versioned-list producer must reach its first element.");
            copied.Add(added);
            RequireFailure<InvalidOperationException>(() => versioned.MoveNext());
            RequireFailure<InvalidOperationException>(() => versioned.Reset());
            ((IDisposable)versioned).Dispose();
            Evidence.Write("actual-enumeration-capture-mutation-contract", new { actualNonGeneric = nonGeneric, actualPassed = true });

            var source = new EnumerableOnlyList();
            var supplied = Create<object>(source, copied: false);
            var forwarded = GetEnumerator(supplied, nonGeneric);
            Evidence.Require(source.Enumerations == 1 && ReferenceEquals(forwarded, source.LastEnumerator),
                "The actual interface member must eagerly forward the arbitrary source enumerator without wrapping.");
            Evidence.Require(forwarded.MoveNext() && ReferenceEquals(forwarded.Current, source.Value) && !forwarded.MoveNext(),
                "The supplied enumerator was not consumed faithfully.");
            ((IDisposable)forwarded).Dispose();
            Evidence.Require(source.Disposals == 1, "The actual returned source enumerator was not disposed.");
            Evidence.Write("actual-enumeration-source-forwarding-contract", new
            {
                actualNonGeneric = nonGeneric, actualEnumerations = source.Enumerations,
                actualDisposals = source.Disposals, actualIndexerUsed = false, actualCountUsed = false,
                actualOriginalEnumeratorIdentityPreserved = true, actualPassed = true
            });
        }
        foreach (var throwFromBody in new[] { false, true })
        {
            var source = new EnumerableOnlyList();
            var list = Create<object>(source, copied: false);
            void ConsumeWithEarlyExit()
            {
                foreach (var item in list)
                {
                    Evidence.Require(ReferenceEquals(item, source.Value), "The loop did not observe the supplied reference.");
                    if (throwFromBody)
                    {
                        throw new ConsumerFailure();
                    }
                    break;
                }
            }
            if (throwFromBody)
            {
                RequireFailure<ConsumerFailure>(ConsumeWithEarlyExit);
            }
            else
            {
                ConsumeWithEarlyExit();
            }
            Evidence.Require(source.Enumerations == 1 && source.Disposals == 1,
                "Early consumer exit must dispose the actual forwarded enumerator.");
            Evidence.Write("actual-enumeration-early-disposal-contract", new { actualThrowFromBody = throwFromBody, actualPassed = true });
        }
        foreach (var profile in Enum.GetValues<CollectionProfile>())
        {
            var benchmark = new CollectionBenchmarks { Profile = profile };
            benchmark.Setup();
            Evidence.Require(benchmark.EnumerateGeneric() == CollectionScenario.GetPreparedBenchmark(profile).ExpectedChecksum
                && benchmark.EnumerateNonGeneric() == CollectionScenario.GetPreparedBenchmark(profile).ExpectedChecksum
                && benchmark.UnchangedIndexOf() == -1, "Every benchmark lifecycle must execute its actual prepared profile.");
            using var retained = benchmark.RetainGenericEnumerator();
            benchmark.Cleanup();
        }
        Evidence.Write("characterization-completed", new
        {
            actualProfiles = 8, actualControllerProducerModes = 2, actualHttpRequests = 48,
            actualPreparedPublicContracts = 16, actualAdditionalEnumerationContracts = 10,
            actualPublicBenchmarkLifecycles = 8, actualAllPassed = true, actualTimingRun = false
        });
    }

    private static object?[] Consume(IEnumerable source)
    {
        var values = new List<object?>();
        foreach (var item in source)
        {
            values.Add(item);
        }

        return values.ToArray();
    }

    private static IEnumerator GetEnumerator<T>(IList<T> list, bool nonGeneric) =>
        nonGeneric ? ((IEnumerable)list).GetEnumerator() : list.GetEnumerator();

    private static IList<T> Create<T>(IReadOnlyList<T> source, bool copied)
    {
        var type = typeof(ControllerContext).Assembly
            .GetType("Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteList`1", throwOnError: true)!
            .MakeGenericType(typeof(T));
        var list = (IList<T>)Activator.CreateInstance(type, [source])!;
        if (copied)
        {
            list.Clear();
            foreach (var item in source)
            {
                list.Add(item);
            }
        }

        return list;
    }

    private static void RequireFailure<TException>(Action action) where TException : Exception
    {
        try
        {
            action();
        }
        catch (TException exception) when (exception.GetType() == typeof(TException))
        {
            return;
        }

        throw new InvalidOperationException("The exact expected exception was not thrown: " + typeof(TException).Name);
    }

    private sealed class ConsumerFailure : Exception
    {
    }

    private sealed class EnumerableOnlyList : IReadOnlyList<object>
    {
        internal object Value { get; } = new();
        internal int Enumerations { get; private set; }
        internal int Disposals { get; private set; }
        internal IEnumerator<object>? LastEnumerator { get; private set; }
        public int Count => throw new InvalidOperationException("Do not inspect the arbitrary source Count.");
        public object this[int index] => throw new InvalidOperationException("Do not index the arbitrary source.");

        public IEnumerator<object> GetEnumerator()
        {
            Enumerations++;
            LastEnumerator = Enumerate();

            return LastEnumerator;
        }

        private IEnumerator<object> Enumerate()
        {
            try
            {
                yield return Value;
            }
            finally
            {
                Disposals++;
            }
        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}
