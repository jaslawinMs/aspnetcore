// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Diagnostics;
using Microsoft.AspNetCore.Components.Rendering;

namespace Microsoft.AspNetCore.Components.Infrastructure;

[DebuggerDisplay("{GetDebuggerDisplay(),nq}")]
internal readonly struct ComponentSubscriptionKey(ComponentState subscriber, in CascadingParameterInfo parameterInfo) : IEquatable<ComponentSubscriptionKey>
{
    private readonly int _propertyNameHashCode = parameterInfo.PropertyNameHashCode;

    public ComponentState Subscriber { get; } = subscriber;

    public string PropertyName { get; } = parameterInfo.PropertyName;

    public bool Equals(ComponentSubscriptionKey other)
        => Subscriber == other.Subscriber && PropertyName == other.PropertyName;

    public override bool Equals(object? obj)
        => obj is ComponentSubscriptionKey other && Equals(other);

    public override int GetHashCode()
        => HashCode.Combine(Subscriber, _propertyNameHashCode);

    private string GetDebuggerDisplay()
        => $"{Subscriber.Component.GetType().Name}.{PropertyName}";
}
