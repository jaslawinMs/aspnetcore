// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;
using Microsoft.AspNetCore.InternalTesting;
using Microsoft.AspNetCore.Routing.Constraints;
using Microsoft.AspNetCore.Routing.Matching;
using Moq;

namespace Microsoft.AspNetCore.Routing.Tests;

public class MaxRouteConstraintTests
{
    [Theory]
    [InlineData(3, 2, true)]
    [InlineData(3, 3, true)]
    [InlineData(3, 4, false)]
    public void MaxRouteConstraint_ApplyConstraint(long max, int parameterValue, bool expected)
    {
        // Arrange
        var constraint = new MaxRouteConstraint(max);

        // Act
        var actual = ConstraintsTestHelper.TestConstraint(constraint, parameterValue);

        // Assert
        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData("Int32Below", 42L, 41, true)]
    [InlineData("Int32Equal", 42L, 42, true)]
    [InlineData("Int32Above", 42L, 43, false)]
    [InlineData("Int32Minimum", (long)int.MinValue, int.MinValue, true)]
    [InlineData("Int32MinimumAbove", (long)int.MinValue - 1, int.MinValue, false)]
    [InlineData("Int32Maximum", (long)int.MaxValue, int.MaxValue, true)]
    [InlineData("Int32MaximumAbove", (long)int.MaxValue - 1, int.MaxValue, false)]
    [InlineData("Int32NegativeBelow", -42L, -43, true)]
    [InlineData("Int32NegativeAbove", -42L, -41, false)]
    [InlineData("Int32WideMaximum", long.MaxValue, int.MaxValue, true)]
    [InlineData("Int64Below", 42L, 41L, true)]
    [InlineData("Int64Equal", 42L, 42L, true)]
    [InlineData("Int64Above", 42L, 43L, false)]
    [InlineData("Int64Minimum", long.MinValue, long.MinValue, true)]
    [InlineData("Int64MinimumAbove", long.MinValue, long.MinValue + 1, false)]
    [InlineData("Int64Maximum", long.MaxValue, long.MaxValue, true)]
    [InlineData("Int64MaximumAbove", long.MaxValue - 1, long.MaxValue, false)]
    [InlineData("Int64NegativeBelow", -42L, -43L, true)]
    [InlineData("Int64NegativeAbove", -42L, -41L, false)]
    public void MaxRouteConstraint_PreservesIntegerBoundaries(string caseName, long max, object parameterValue, bool expected)
    {
        var constraint = new MaxRouteConstraint(max);
        var values = new RouteValueDictionary { [caseName] = parameterValue };

        var actual = constraint.Match(null, null, caseName, values, RouteDirection.UrlGeneration);

        Assert.Equal(expected, actual);
        Assert.Same(parameterValue, values[caseName]);
    }

    public static IEnumerable<object[]> OtherValueCases => new object[][]
    {
        new object[] { "PaddedString", " +0042 ", true },
        new object[] { "NegativeString", "-42", true },
        new object[] { "AboveString", "43", false },
        new object[] { "FractionString", "42.0", false },
        new object[] { "ScientificString", "4.2E1", false },
        new object[] { "OverflowString", "9223372036854775808", false },
        new object[] { "EmptyString", "", false },
        new object[] { "SignedByte", (sbyte)-42, true },
        new object[] { "Byte", (byte)42, true },
        new object[] { "SignedShort", (short)-42, true },
        new object[] { "UnsignedShort", (ushort)42, true },
        new object[] { "UnsignedInt", (uint)42, true },
        new object[] { "UnsignedLong", (ulong)42, true },
        new object[] { "UnsignedOverflow", ulong.MaxValue, false },
        new object[] { "DecimalIntegral", 42m, true },
        new object[] { "DecimalScaled", 42.0m, false },
        new object[] { "DoubleIntegral", 42d, true },
        new object[] { "DoubleScientific", 1e18, false },
        new object[] { "FloatIntegral", 42f, true },
        new object[] { "FloatScientific", 1e18f, false },
        new object[] { "NamedEnum", SampleEnum.Answer, false },
        new object[] { "UnnamedEnum", (SampleEnum)41, true },
        new object[] { "Boolean", true, false },
    };

    [Theory]
    [MemberData(nameof(OtherValueCases))]
    public void MaxRouteConstraint_PreservesOtherValueConversions(string caseName, object parameterValue, bool expected)
    {
        var constraint = new MaxRouteConstraint(42);
        var values = new RouteValueDictionary { [caseName] = parameterValue };

        Assert.Equal(expected, constraint.Match(null, null, caseName, values, RouteDirection.IncomingRequest));
    }

    [Fact]
    public void MaxRouteConstraint_PreservesInvariantConvertibleProvider()
    {
        var value = new Mock<IConvertible>(MockBehavior.Strict);
        value.Setup(v => v.ToString(CultureInfo.InvariantCulture)).Returns(" +0042 ");
        var constraint = new MaxRouteConstraint(42);

        Assert.True(ConstraintsTestHelper.TestConstraint(constraint, value.Object));
        value.Verify(v => v.ToString(CultureInfo.InvariantCulture), Times.Once);
    }

    [Fact]
    public void MaxRouteConstraint_PreservesInvariantFormattableProvider()
    {
        var value = new Mock<IFormattable>(MockBehavior.Strict);
        value.Setup(v => v.ToString(null, CultureInfo.InvariantCulture)).Returns(" +0042 ");
        var constraint = new MaxRouteConstraint(42);

        Assert.True(ConstraintsTestHelper.TestConstraint(constraint, value.Object));
        value.Verify(v => v.ToString(null, CultureInfo.InvariantCulture), Times.Once);
    }

    [Fact]
    public void MaxRouteConstraint_PreservesConversionException()
    {
        var exception = new InvalidOperationException("Cannot convert route value.");
        var value = new Mock<IConvertible>(MockBehavior.Strict);
        value.Setup(v => v.ToString(CultureInfo.InvariantCulture)).Throws(exception);
        var constraint = new MaxRouteConstraint(42);

        Assert.Same(exception, Assert.Throws<InvalidOperationException>(
            () => ConstraintsTestHelper.TestConstraint(constraint, value.Object)));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void MaxRouteConstraint_PreservesMissingAndNullValues(bool includeNull)
    {
        var constraint = new MaxRouteConstraint(42);
        var values = new RouteValueDictionary();
        if (includeNull)
        {
            values["value"] = null;
        }

        Assert.False(constraint.Match(null, null, "value", values, RouteDirection.IncomingRequest));
    }

    [Theory]
    [InlineData(" +0042 ", true)]
    [InlineData("43", false)]
    [InlineData("42.0", false)]
    [InlineData("9223372036854775808", false)]
    public void MaxRouteConstraint_PreservesLiteralMatching(string value, bool expected)
    {
        var constraint = (IParameterLiteralNodeMatchingPolicy)new MaxRouteConstraint(42);

        Assert.Equal(expected, constraint.MatchesLiteral("value", value));
    }

    [Theory]
    [InlineData("en-US")]
    [InlineData("fr-FR")]
    public void MaxRouteConstraint_PreservesInvariantCulture(string culture)
    {
        using var cultureReplacer = new CultureReplacer(culture);
        var constraint = new MaxRouteConstraint(-42);

        Assert.True(ConstraintsTestHelper.TestConstraint(constraint, -42));
        Assert.True(ConstraintsTestHelper.TestConstraint(constraint, -42L));
        Assert.True(ConstraintsTestHelper.TestConstraint(constraint, " -0042 "));
        Assert.False(ConstraintsTestHelper.TestConstraint(constraint, -41));
    }

    [Fact]
    public void MaxRouteConstraint_PreservesArgumentGuards()
    {
        var constraint = new MaxRouteConstraint(42);
        var routeKey = "value";
        var values = new RouteValueDictionary();

        Assert.Throws<ArgumentNullException>(nameof(routeKey),
            () => constraint.Match(null, null, null!, values, RouteDirection.IncomingRequest));
        Assert.Throws<ArgumentNullException>(nameof(values),
            () => constraint.Match(null, null, routeKey, null!, RouteDirection.IncomingRequest));
    }

    private enum SampleEnum
    {
        Answer = 42,
    }
}
