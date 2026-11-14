// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using Microsoft.AspNetCore.Rewrite.IISUrlRewrite;
using Microsoft.AspNetCore.Rewrite.PatternSegments;
using Microsoft.AspNetCore.Rewrite.UrlMatches;

namespace Microsoft.AspNetCore.Rewrite.Tests.UrlRewrite;

public class ConditionCollectionTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(3)]
    public void Enumerate_PreservesOrderAcrossConcreteAndInterfacePaths(int count)
    {
        var collection = new ConditionCollection();
        var expected = Enumerable.Range(0, count).Select(_ => CreateCondition()).ToArray();
        collection.AddConditions(expected);
        var actual = new List<Condition>();

        foreach (var condition in collection)
        {
            actual.Add(condition);
        }

        Assert.Equal(expected, actual);
        Assert.Equal(expected, ((IEnumerable<Condition>)collection).ToArray());
        actual.Clear();

        foreach (Condition condition in (IEnumerable)collection)
        {
            actual.Add(condition);
        }

        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Enumerate_ThrowsWhenCollectionChanges()
    {
        var collection = new ConditionCollection();
        collection.Add(CreateCondition());
        var enumerator = collection.GetEnumerator();
        Assert.True(enumerator.MoveNext());

        collection.Add(CreateCondition());

        Assert.Throws<InvalidOperationException>(() => enumerator.MoveNext());
        enumerator.Dispose();
    }

    private static Condition CreateCondition()
    {
        return new Condition(new Pattern([new LiteralSegment("value")]),
            new StringMatch("value", StringOperationType.Equal, ignoreCase: false));
    }
}
