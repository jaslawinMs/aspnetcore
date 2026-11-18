// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Linq.Expressions;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Http;

namespace AutoPerf;

internal static class BoundaryAccess
{
    internal static readonly Assembly Owner = typeof(RazorComponentsEndpointRouteBuilderExtensions).Assembly;
    internal static readonly Type BoundaryType = Owner.GetType("Microsoft.AspNetCore.Components.Endpoints.SSRRenderModeBoundary", throwOnError: true)!;
    internal static readonly Func<HttpContext, Type, IComponentRenderMode, IComponent> Create = CompileFactory();
    internal static readonly Func<IComponent, IReadOnlyDictionary<string, object?>> Snapshot = CompileSnapshot();
    internal static readonly Func<IComponent, HttpContext, object> Marker = CompileMarker();

    private static Func<HttpContext, Type, IComponentRenderMode, IComponent> CompileFactory()
    {
        var context = Expression.Parameter(typeof(HttpContext));
        var component = Expression.Parameter(typeof(Type));
        var mode = Expression.Parameter(typeof(IComponentRenderMode));
        var constructor = BoundaryType.GetConstructor([typeof(HttpContext), typeof(Type), typeof(IComponentRenderMode)])
            ?? throw new MissingMethodException(BoundaryType.FullName, ".ctor");

        return Expression.Lambda<Func<HttpContext, Type, IComponentRenderMode, IComponent>>(
            Expression.Convert(Expression.New(constructor, context, component, mode), typeof(IComponent)),
            context, component, mode).Compile();
    }

    private static Func<IComponent, IReadOnlyDictionary<string, object?>> CompileSnapshot()
    {
        var component = Expression.Parameter(typeof(IComponent));
        var field = BoundaryType.GetField("_latestParameters", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new MissingFieldException(BoundaryType.FullName, "_latestParameters");

        return Expression.Lambda<Func<IComponent, IReadOnlyDictionary<string, object?>>>(
            Expression.Field(Expression.Convert(component, BoundaryType), field), component).Compile();
    }

    private static Func<IComponent, HttpContext, object> CompileMarker()
    {
        var component = Expression.Parameter(typeof(IComponent));
        var context = Expression.Parameter(typeof(HttpContext));
        var method = BoundaryType.GetMethod("ToMarker", [typeof(HttpContext), typeof(int), typeof(object)])
            ?? throw new MissingMethodException(BoundaryType.FullName, "ToMarker");

        return Expression.Lambda<Func<IComponent, HttpContext, object>>(
            Expression.Convert(Expression.Call(Expression.Convert(component, BoundaryType), method,
                context, Expression.Constant(0), Expression.Constant(null, typeof(object))), typeof(object)),
            component, context).Compile();
    }
}
