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
    public void CopyTo_PreservesItemsOffsetAndStoreIsolation(bool copied)
    {
        var present = new object();
        var later = new object();
        var sentinel = new object();
        var source = new List<object?> { null, present };
        var collection = CreateCollection(source, copied);
        source.Add(later);
        object?[] destination = [sentinel, sentinel, sentinel, sentinel, sentinel];

        collection.CopyTo(destination, 1);

        Assert.Equal<object?>([sentinel, null, present, copied ? sentinel : later, sentinel], destination);
        Assert.Equal<object?>([null, present, later], source);
        Assert.Equal(copied ? 2 : 3, collection.Count);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CopyTo_EmptyStoreDoesNotValidateDestination(bool copied)
    {
        var collection = CreateCollection([], copied);

        collection.CopyTo(null!, int.MinValue);
        collection.CopyTo([], int.MaxValue);

        Assert.Empty(collection);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CopyTo_PreservesPartialWritesBeforeBoundsFailure(bool copied)
    {
        var first = new object();
        var second = new object();
        var sentinel = new object();
        var collection = CreateCollection([first, second], copied);
        object?[] destination = [sentinel, sentinel];

        Assert.Throws<IndexOutOfRangeException>(() => collection.CopyTo(destination, 1));

        Assert.Equal<object?>([sentinel, first], destination);
        Assert.Equal<object?>([first, second], collection);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CopyTo_PreservesNullAndNegativeIndexFailures(bool copied)
    {
        var sentinel = new object();
        var collection = CreateCollection([new object()], copied);
        object?[] destination = [sentinel];

        Assert.Throws<NullReferenceException>(() => collection.CopyTo(null!, 0));
        Assert.Throws<IndexOutOfRangeException>(() => collection.CopyTo(destination, -1));

        Assert.Same(sentinel, destination[0]);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CopyTo_PreservesCovariantArrayPartialWrites(bool copied)
    {
        var collection = CreateCollection(["first", new object()], copied);
        string[] destination = ["prefix", "unchanged", "suffix"];

        Assert.Throws<ArrayTypeMismatchException>(() => collection.CopyTo(destination, 1));

        Assert.Equal(["prefix", "first", "suffix"], destination);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CopyTo_UnmodifiedStoreEnumeratesAndDisposesSource(bool destinationTooSmall)
    {
        var first = new object();
        var last = new object();
        var sentinel = new object();
        var enumerator = new Mock<IEnumerator<object?>>(MockBehavior.Strict);
        enumerator.SetupSequence(value => value.MoveNext()).Returns(true).Returns(true).Returns(false);
        enumerator.SetupSequence(value => value.Current).Returns(first).Returns(last);
        enumerator.Setup(value => value.Dispose());
        var source = new Mock<IReadOnlyList<object?>>(MockBehavior.Strict);
        source.Setup(value => value.GetEnumerator()).Returns(enumerator.Object);
        var collection = new CopyOnWriteList<object?>(source.Object);
        object?[] destination = destinationTooSmall ? [sentinel] : [sentinel, sentinel, sentinel];

        if (destinationTooSmall)
        {
            Assert.Throws<IndexOutOfRangeException>(() => collection.CopyTo(destination, 0));
            Assert.Equal<object?>([first], destination);
        }
        else
        {
            collection.CopyTo(destination, 0);

            Assert.Equal<object?>([first, last, sentinel], destination);
        }

        source.Verify(value => value.GetEnumerator(), Times.Once);
        enumerator.Verify(value => value.MoveNext(), Times.Exactly(destinationTooSmall ? 2 : 3));
        enumerator.VerifyGet(value => value.Current, Times.Exactly(2));
        enumerator.Verify(value => value.Dispose(), Times.Once);
        source.VerifyNoOtherCalls();
    }

    private static CopyOnWriteList<object?> CreateCollection(IReadOnlyList<object?> source, bool copied)
    {
        var collection = new CopyOnWriteList<object?>(source);
        if (copied)
        {
            collection.Add(new object());
            collection.RemoveAt(collection.Count - 1);
        }

        return collection;
    }
}
