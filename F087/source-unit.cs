// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System;
using System.Reflection;
using System.Reflection.Emit;
using System.Runtime.CompilerServices;

namespace Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

public class DefaultUnionValidationStrategyTest
{
    [Fact]
    public void IsUnionValueProperty_DoesNotRetainCollectibleUnionType()
    {
        var reference = InspectCollectibleUnion();
        for (var attempt = 0; attempt < 10 && IsAlive(reference); attempt++)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();
        }

        Assert.False(IsAlive(reference));
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static WeakReference<Type> InspectCollectibleUnion()
    {
        var assembly = AssemblyBuilder.DefineDynamicAssembly(
            new AssemblyName($"CollectibleUnion_{Guid.NewGuid():N}"), AssemblyBuilderAccess.RunAndCollect);
        var module = assembly.DefineDynamicModule("Union");
        var builder = module.DefineType("Union", TypeAttributes.Public, typeof(object), [typeof(IUnion)]);
        var getter = builder.DefineMethod("get_Value",
            MethodAttributes.Public | MethodAttributes.Virtual | MethodAttributes.Final |
            MethodAttributes.NewSlot | MethodAttributes.HideBySig | MethodAttributes.SpecialName,
            typeof(object), Type.EmptyTypes);
        var il = getter.GetILGenerator();
        il.Emit(OpCodes.Ldnull);
        il.Emit(OpCodes.Ret);
        var property = builder.DefineProperty(nameof(IUnion.Value), PropertyAttributes.None, typeof(object), Type.EmptyTypes);
        property.SetGetMethod(getter);
        builder.DefineMethodOverride(getter, typeof(IUnion).GetProperty(nameof(IUnion.Value))!.GetMethod!);
        var type = builder.CreateType()!;
        var metadata = new EmptyModelMetadataProvider().GetMetadataForProperty(typeof(IUnion), nameof(IUnion.Value));

        Assert.True(DefaultUnionValidationStrategy.IsUnionValueProperty(metadata, type));

        return new WeakReference<Type>(type);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static bool IsAlive(WeakReference<Type> reference) => reference.TryGetTarget(out _);
}
