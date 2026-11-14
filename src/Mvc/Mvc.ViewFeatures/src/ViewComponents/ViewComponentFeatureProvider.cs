// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Linq;
using System.Reflection;
using Microsoft.AspNetCore.Mvc.ApplicationParts;

namespace Microsoft.AspNetCore.Mvc.ViewComponents;

/// <summary>
/// Discovers view components from a list of <see cref="ApplicationPart"/> instances.
/// </summary>
public class ViewComponentFeatureProvider : IApplicationFeatureProvider<ViewComponentFeature>
{
    /// <inheritdoc />
    public void PopulateFeature(IEnumerable<ApplicationPart> parts, ViewComponentFeature feature)
    {
        ArgumentNullException.ThrowIfNull(parts);
        ArgumentNullException.ThrowIfNull(feature);

        // Custom type enumerators can change the exposed feature list while yielding.
        var canIndex = parts is List<ApplicationPart> applicationParts &&
            applicationParts.GetType() == typeof(List<ApplicationPart>) &&
            applicationParts.All(static part => part is not IApplicationPartTypeProvider ||
                part is AssemblyPart assemblyPart && assemblyPart.GetType() == typeof(AssemblyPart) &&
                assemblyPart.Assembly.GetType() == typeof(ViewComponentFeatureProvider).Assembly.GetType());
        HashSet<TypeInfo> componentTypes = null;

        foreach (var type in parts.OfType<IApplicationPartTypeProvider>().SelectMany(p => p.Types))
        {
            if (ViewComponentConventions.IsComponent(type))
            {
                if (canIndex && componentTypes is null && feature.ViewComponents.Count >= 256)
                {
                    componentTypes = new HashSet<TypeInfo>(feature.ViewComponents);
                }

                if (!(componentTypes?.Contains(type) ?? feature.ViewComponents.Contains(type)))
                {
                    feature.ViewComponents.Add(type);
                    componentTypes?.Add(type);
                }
            }
        }
    }
}
