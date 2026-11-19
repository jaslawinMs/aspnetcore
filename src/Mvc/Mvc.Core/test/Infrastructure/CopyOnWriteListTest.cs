// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

#nullable enable

using System.Collections;
using Moq;

namespace Microsoft.AspNetCore.Mvc.Infrastructure;

public class CopyOnWriteListTest
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void GetEnumerator_PreservesItemsAndStoreIsolation(bool copied)
    {
        var first = new object();
        var last = new object();
        var replacement = new object();
        object?[] source = [first, null, last];
        var collection = CreateCollection(source, copied);
        source[0] = replacement;
        var values = new List<object?>();

        using (var enumerator = collection.GetEnumerator())
        {
            while (enumerator.MoveNext())
            {
                values.Add(enumerator.Current);
            }
        }

        Assert.Collection(values,
            item => Assert.Same(copied ? first : replacement, item),
            item => Assert.Null(item),
            item => Assert.Same(last, item));
        var nonGenericValues = new List<object?>();
        foreach (var item in (IEnumerable)collection)
        {
            nonGenericValues.Add(item);
        }

        Assert.Equal<object?>(values, nonGenericValues);
        Assert.Same(replacement, source[0]);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void GetEnumerator_PreservesCursorResetAndNonGenericCurrent(bool copied)
    {
        var collection = CreateCollection(["first", "last"], copied);
        using var enumerator = collection.GetEnumerator();
        var nonGeneric = (IEnumerator)enumerator;

        Assert.Throws<InvalidOperationException>(() => nonGeneric.Current);
        Assert.True(enumerator.MoveNext());
        Assert.Equal("first", enumerator.Current);
        Assert.Equal("first", nonGeneric.Current);
        Assert.True(enumerator.MoveNext());
        Assert.Equal("last", enumerator.Current);
        Assert.False(enumerator.MoveNext());
        Assert.Throws<InvalidOperationException>(() => nonGeneric.Current);

        enumerator.Reset();

        Assert.Throws<InvalidOperationException>(() => nonGeneric.Current);
        Assert.True(enumerator.MoveNext());
        Assert.Equal("first", enumerator.Current);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void GetEnumerator_KeepsCapturedStoreWhenCopyIsCreated(bool nonGeneric)
    {
        var collection = new CopyOnWriteList<string>(["first", "last"]);
        var enumerator = nonGeneric
            ? ((IEnumerable)collection).GetEnumerator()
            : ((IEnumerable<string>)collection).GetEnumerator();

        collection.Add("added");

        Assert.True(enumerator.MoveNext());
        Assert.Equal("first", enumerator.Current);
        Assert.True(enumerator.MoveNext());
        Assert.Equal("last", enumerator.Current);
        Assert.False(enumerator.MoveNext());
        ((IDisposable)enumerator).Dispose();
        Assert.Equal(["first", "last", "added"], collection);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void GetEnumerator_CopiedStoreDetectsMutation(bool nonGeneric)
    {
        var collection = CreateCollection(["first", "last"], copied: true);
        var enumerator = nonGeneric
            ? ((IEnumerable)collection).GetEnumerator()
            : ((IEnumerable<string>)collection).GetEnumerator();
        Assert.True(enumerator.MoveNext());

        collection.Add("added");

        Assert.Throws<InvalidOperationException>(() => enumerator.MoveNext());
        Assert.Throws<InvalidOperationException>(() => enumerator.Reset());
        ((IDisposable)enumerator).Dispose();
        Assert.Equal(["first", "last", "added"], collection);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void GetEnumerator_ForwardsArbitrarySourceWithoutIndexing(bool nonGeneric)
    {
        var sourceEnumerator = new Mock<IEnumerator<string>>(MockBehavior.Strict);
        sourceEnumerator.Setup(value => value.Dispose());
        var source = new Mock<IReadOnlyList<string>>(MockBehavior.Strict);
        source.Setup(value => value.GetEnumerator()).Returns(sourceEnumerator.Object);
        var collection = new CopyOnWriteList<string>(source.Object);

        var enumerator = nonGeneric
            ? ((IEnumerable)collection).GetEnumerator()
            : ((IEnumerable<string>)collection).GetEnumerator();

        Assert.Same(sourceEnumerator.Object, enumerator);
        ((IDisposable)enumerator).Dispose();
        sourceEnumerator.Verify(value => value.Dispose(), Times.Once);
        sourceEnumerator.VerifyNoOtherCalls();
        source.Verify(value => value.GetEnumerator(), Times.Once);
        source.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Foreach_DisposesSourceOnBreakOrFailure(bool throwFromBody)
    {
        var sourceEnumerator = new Mock<IEnumerator<string>>(MockBehavior.Strict);
        sourceEnumerator.Setup(value => value.MoveNext()).Returns(true);
        sourceEnumerator.SetupGet(value => value.Current).Returns("value");
        sourceEnumerator.Setup(value => value.Dispose());
        var source = new Mock<IReadOnlyList<string>>(MockBehavior.Strict);
        source.Setup(value => value.GetEnumerator()).Returns(sourceEnumerator.Object);
        var collection = new CopyOnWriteList<string>(source.Object);

        if (throwFromBody)
        {
            Assert.Throws<ConsumerException>(Enumerate);
        }
        else
        {
            Enumerate();
        }

        sourceEnumerator.Verify(value => value.MoveNext(), Times.Once);
        sourceEnumerator.VerifyGet(value => value.Current, Times.Once);
        sourceEnumerator.Verify(value => value.Dispose(), Times.Once);
        sourceEnumerator.VerifyNoOtherCalls();
        source.Verify(value => value.GetEnumerator(), Times.Once);
        source.VerifyNoOtherCalls();

        void Enumerate()
        {
            foreach (var item in (IEnumerable<string>)collection)
            {
                Assert.Equal("value", item);
                if (throwFromBody)
                {
                    throw new ConsumerException();
                }

                break;
            }
        }
    }

    private static CopyOnWriteList<T> CreateCollection<T>(T[] source, bool copied)
    {
        var collection = new CopyOnWriteList<T>(source);
        if (copied)
        {
            collection[0] = source[0];
        }

        return collection;
    }

    private sealed class ConsumerException : Exception
    {
    }
}
