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
    public void IndexOf_PreservesFirstMatchNullsAndSourceIsolation(bool copied)
    {
        var first = new object();
        var last = new object();
        var replacement = new object();
        object?[] source = [first, null, last, first];
        var collection = CreateCollection(source, copied);

        Assert.Equal(0, collection.IndexOf(first));
        Assert.Equal(1, collection.IndexOf(null));
        Assert.Equal(2, collection.IndexOf(last));
        Assert.Equal(-1, collection.IndexOf(new object()));
        Assert.Equal(-1, CreateCollection(Array.Empty<object?>(), copied).IndexOf(null));

        source[0] = replacement;

        Assert.Equal(copied ? 0 : 3, collection.IndexOf(first));
        Assert.Equal(copied ? -1 : 0, collection.IndexOf(replacement));
        Assert.Equal(1, collection.IndexOf(null));
        Assert.Equal(4, collection.Count);
        Assert.Collection(source,
            item => Assert.Same(replacement, item),
            item => Assert.Null(item),
            item => Assert.Same(last, item),
            item => Assert.Same(first, item));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IndexOf_UsesLegacyObjectEquality(bool copied)
    {
        var references = CreateCollection<ObjectEquality>([new(0), new(1)], copied);
        var values = CreateCollection<ValueEquality>([new(0), new(1)], copied);

        Assert.Equal(1, references.IndexOf(new ObjectEquality(1)));
        Assert.Equal(-1, references.IndexOf(new ObjectEquality(2)));
        Assert.Equal(1, values.IndexOf(new ValueEquality(1)));
        Assert.Equal(-1, values.IndexOf(new ValueEquality(2)));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IndexOf_PreservesStoredLeftEqualityOrderAndShortCircuit(bool copied)
    {
        var probe = new ObservedEquality();
        var calls = new List<int>();
        var first = new ObservedEquality
        {
            OnEquals = value =>
            {
                Assert.Same(probe, value);
                calls.Add(1);
                return false;
            }
        };
        var matching = new ObservedEquality
        {
            OnEquals = value =>
            {
                Assert.Same(probe, value);
                calls.Add(2);
                return true;
            }
        };
        var collection = CreateCollection([first, matching, new ObservedEquality()], copied);

        Assert.Equal(1, collection.IndexOf(probe));
        Assert.Equal([1, 2], calls);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IndexOf_CopiedStorePreservesMutationDetection(bool match)
    {
        var first = new ObservedEquality();
        var later = new ObservedEquality();
        ObservedEquality[] source = [first, later];
        var collection = CreateCollection(source, copied: true);
        var comparisons = 0;
        first.OnEquals = _ =>
        {
            comparisons++;
            collection.Add(later);
            return match;
        };

        if (match)
        {
            Assert.Equal(0, collection.IndexOf(new ObservedEquality()));
        }
        else
        {
            Assert.Throws<InvalidOperationException>(() => collection.IndexOf(new ObservedEquality()));
        }

        Assert.Equal(1, comparisons);
        Assert.Equal(3, collection.Count);
        Assert.Collection(source,
            item => Assert.Same(first, item),
            item => Assert.Same(later, item));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IndexOf_ArbitrarySourceDisposesOnMatchOrCompletion(bool match)
    {
        var enumerator = new Mock<IEnumerator<string>>(MockBehavior.Strict);
        enumerator.SetupSequence(value => value.MoveNext()).Returns(true).Returns(true).Returns(false);
        enumerator.SetupSequence(value => value.Current).Returns("first").Returns("second");
        enumerator.Setup(value => value.Dispose());
        var source = new Mock<IReadOnlyList<string>>(MockBehavior.Strict);
        source.Setup(value => value.GetEnumerator()).Returns(enumerator.Object);
        var collection = new CopyOnWriteList<string>(source.Object);

        Assert.Equal(match ? 1 : -1, collection.IndexOf(match ? "second" : "missing"));

        enumerator.Verify(value => value.MoveNext(), Times.Exactly(match ? 2 : 3));
        enumerator.VerifyGet(value => value.Current, Times.Exactly(2));
        enumerator.Verify(value => value.Dispose(), Times.Once);
        enumerator.VerifyNoOtherCalls();
        source.Verify(value => value.GetEnumerator(), Times.Once);
        source.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void IndexOf_ArbitrarySourceDisposesOnCurrentOrEqualityFailure(bool equalityFailure)
    {
        var failure = new ProbeException();
        var enumerator = new Mock<IEnumerator<ObservedEquality>>(MockBehavior.Strict);
        enumerator.Setup(value => value.MoveNext()).Returns(true);
        enumerator.Setup(value => value.Dispose());
        if (equalityFailure)
        {
            enumerator.SetupGet(value => value.Current).Returns(new ObservedEquality { OnEquals = _ => throw failure });
        }
        else
        {
            enumerator.SetupGet(value => value.Current).Throws(failure);
        }
        var source = new Mock<IReadOnlyList<ObservedEquality>>(MockBehavior.Strict);
        source.Setup(value => value.GetEnumerator()).Returns(enumerator.Object);
        var collection = new CopyOnWriteList<ObservedEquality>(source.Object);

        Assert.Same(failure, Assert.Throws<ProbeException>(() => collection.IndexOf(new ObservedEquality())));

        enumerator.Verify(value => value.MoveNext(), Times.Once);
        enumerator.VerifyGet(value => value.Current, Times.Once);
        enumerator.Verify(value => value.Dispose(), Times.Once);
        enumerator.VerifyNoOtherCalls();
        source.Verify(value => value.GetEnumerator(), Times.Once);
        source.VerifyNoOtherCalls();
    }

    private static CopyOnWriteList<T> CreateCollection<T>(T[] source, bool copied)
    {
        var collection = new CopyOnWriteList<T>(source);
        if (copied)
        {
            if (source.Length == 0)
            {
                collection.Clear();
            }
            else
            {
                collection[0] = source[0];
            }
        }

        return collection;
    }

    private sealed class ObjectEquality(int value) : IEquatable<ObjectEquality>
    {
        private readonly int _value = value;

        public bool Equals(ObjectEquality? other) => throw new ProbeException();

        public override bool Equals(object? obj) => obj is ObjectEquality other && _value == other._value;

        public override int GetHashCode() => _value;
    }

    private readonly struct ValueEquality(int value) : IEquatable<ValueEquality>
    {
        private readonly int _value = value;

        public bool Equals(ValueEquality other) => throw new ProbeException();

        public override bool Equals(object? obj) => obj is ValueEquality other && _value == other._value;

        public override int GetHashCode() => _value;
    }

    private sealed class ObservedEquality
    {
        public Func<object?, bool> OnEquals { get; set; } = _ => throw new ProbeException();

        public override bool Equals(object? obj) => OnEquals(obj);

        public override int GetHashCode() => 0;
    }

    private sealed class ProbeException : Exception
    {
    }
}
