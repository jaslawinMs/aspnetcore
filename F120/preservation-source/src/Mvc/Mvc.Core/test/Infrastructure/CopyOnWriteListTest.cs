// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

#nullable enable

using Moq;

namespace Microsoft.AspNetCore.Mvc.Infrastructure;

public class CopyOnWriteListTest
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Contains_PreservesSourceAndCopiedStoreContents(bool copied)
    {
        var present = new object();
        var source = new List<object?> { null, present };
        var collection = new CopyOnWriteList<object?>(source);
        if (copied)
        {
            collection.Add(new object());
            collection.RemoveAt(2);
        }

        var containsNull = collection.Contains(null);
        var containsPresent = collection.Contains(present);
        var containsMissing = collection.Contains(new object());

        Assert.True(containsNull);
        Assert.True(containsPresent);
        Assert.False(containsMissing);
        Assert.Equal(2, source.Count);
        Assert.Null(source[0]);
        Assert.Same(present, source[1]);

        var addedToSource = new object();
        source.Add(addedToSource);

        Assert.Equal(!copied, collection.Contains(addedToSource));
        Assert.Equal(copied ? 2 : 3, collection.Count);
    }

    [Fact]
    public void Contains_CopiedStoreUsesObjectEqualsInsteadOfEquatableEquals()
    {
        var collection = new CopyOnWriteList<ConflictingValue>([new(7)]);
        collection.Add(new(8));
        collection.RemoveAt(1);

        var containsPresent = collection.Contains(new(7));
        var containsMissing = collection.Contains(new(9));

        Assert.True(containsPresent);
        Assert.False(containsMissing);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Contains_PreservesReentrantMutationAndEarlySuccess(bool matches)
    {
        var first = new CallbackValue();
        var collection = new CopyOnWriteList<CallbackValue>([first]);
        collection.Add(new CallbackValue());
        collection.RemoveAt(1);
        var equalityCalls = 0;
        first.Callback = () =>
        {
            equalityCalls++;
            collection.Add(new CallbackValue());

            return matches;
        };

        if (matches)
        {
            var contains = collection.Contains(new CallbackValue());

            Assert.True(contains);
        }
        else
        {
            Assert.Throws<InvalidOperationException>(() => collection.Contains(new CallbackValue()));
        }

        Assert.Equal(1, equalityCalls);
        Assert.Equal(2, collection.Count);
    }

    [Fact]
    public void Contains_UnmodifiedStoreEnumeratesAndDisposesSource()
    {
        var item = new object();
        var enumerator = new Mock<IEnumerator<object>>(MockBehavior.Strict);
        enumerator.Setup(value => value.MoveNext()).Returns(true);
        enumerator.SetupGet(value => value.Current).Returns(item);
        enumerator.Setup(value => value.Dispose());
        var source = new Mock<IReadOnlyList<object>>(MockBehavior.Strict);
        source.Setup(value => value.GetEnumerator()).Returns(enumerator.Object);
        var collection = new CopyOnWriteList<object>(source.Object);

        var contains = collection.Contains(item);

        Assert.True(contains);
        source.Verify(value => value.GetEnumerator(), Times.Once);
        enumerator.Verify(value => value.MoveNext(), Times.Once);
        enumerator.VerifyGet(value => value.Current, Times.Once);
        enumerator.Verify(value => value.Dispose(), Times.Once);
        source.VerifyNoOtherCalls();
    }

    [Fact]
    public void Contains_UnmodifiedListSubclassPreservesInterfaceEnumerationOrder()
    {
        var equalityOrder = new List<string>();
        var first = new CallbackValue
        {
            Callback = () =>
            {
                equalityOrder.Add("first");

                return false;
            }
        };
        var last = new CallbackValue
        {
            Callback = () =>
            {
                equalityOrder.Add("last");

                return false;
            }
        };
        var source = new ReverseEnumerableList { first, last };
        var collection = new CopyOnWriteList<CallbackValue>(source);

        var contains = collection.Contains(new CallbackValue());

        Assert.False(contains);
        Assert.Equal(new[] { "last", "first" }, equalityOrder);
    }

    private readonly struct ConflictingValue(int value) : IEquatable<ConflictingValue>
    {
        private int Value { get; } = value;

        public bool Equals(ConflictingValue other) => false;
        public override bool Equals(object? obj) => obj is ConflictingValue other && Value == other.Value;
        public override int GetHashCode() => Value;
    }

    private sealed class CallbackValue
    {
        internal Func<bool> Callback { get; set; } = () => false;

        public override bool Equals(object? obj) => Callback();
        public override int GetHashCode() => 0;
    }

    private sealed class ReverseEnumerableList : List<CallbackValue>, IEnumerable<CallbackValue>
    {
        IEnumerator<CallbackValue> IEnumerable<CallbackValue>.GetEnumerator()
        {
            for (var index = Count - 1; index >= 0; index--)
            {
                yield return this[index];
            }
        }
    }
}
