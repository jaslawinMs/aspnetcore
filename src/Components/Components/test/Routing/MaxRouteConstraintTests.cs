// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Routing.Constraints;

namespace Microsoft.AspNetCore.Components.Routing;

public class MaxRouteConstraintTests
{
    [Theory]
    [InlineData("Int32Equal", 42L, 42, true)]
    [InlineData("Int32Above", 42L, 43, false)]
    [InlineData("Int32Minimum", (long)int.MinValue, int.MinValue, true)]
    [InlineData("Int32MaximumAbove", (long)int.MaxValue - 1, int.MaxValue, false)]
    [InlineData("Int64Equal", 42L, 42L, true)]
    [InlineData("Int64Above", 42L, 43L, false)]
    [InlineData("Int64Minimum", long.MinValue, long.MinValue, true)]
    [InlineData("Int64MinimumAbove", long.MinValue, long.MinValue + 1, false)]
    [InlineData("Int64Maximum", long.MaxValue, long.MaxValue, true)]
    [InlineData("Int64MaximumAbove", long.MaxValue - 1, long.MaxValue, false)]
    [InlineData("NegativeBelow", -42L, -43L, true)]
    [InlineData("NegativeAbove", -42L, -41L, false)]
    [InlineData("PaddedString", 42L, " +0042 ", true)]
    [InlineData("AboveString", 42L, "43", false)]
    [InlineData("FractionString", 42L, "42.0", false)]
    [InlineData("Null", 42L, null, false)]
    public void MatchPreservesTypedAndStringValues(string caseName, long max, object value, bool expected)
    {
        var constraint = new MaxRouteConstraint(max);
        var values = new RouteValueDictionary { [caseName] = value };

        Assert.Equal(expected, constraint.Match(caseName, values));
        Assert.Same(value, values[caseName]);
    }
}
