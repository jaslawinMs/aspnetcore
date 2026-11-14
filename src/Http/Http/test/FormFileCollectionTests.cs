// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Moq;

namespace Microsoft.AspNetCore.Http;

public class FormFileCollectionTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(16)]
    public void GetFiles_PreservesEmptySnapshots(int count)
    {
        var collection = new FormFileCollection();
        for (var i = 0; i < count; i++)
        {
            collection.Add(CreateFile("other", $"file-{i}.txt"));
        }

        var empty = collection.GetFiles("missing");
        Assert.Empty(empty);

        var added = CreateFile("missing", "added.txt");
        collection.Add(added);

        Assert.Empty(empty);
        Assert.Same(added, Assert.Single(collection.GetFiles("missing")));
        Assert.Equal(count + 1, collection.Count);
    }

    [Theory]
    [InlineData("upload")]
    [InlineData("UPLOAD")]
    public void GetFiles_PreservesOrderIdentityAndIndependentResults(string name)
    {
        var first = CreateFile("upload", "first.txt");
        var unrelated = CreateFile("other", "other.txt");
        var second = CreateFile("UPLOAD", "second.txt");
        var third = CreateFile("Upload", "third.txt");
        var collection = new FormFileCollection { first, unrelated, second, third };

        var result = collection.GetFiles(name);
        var repeated = collection.GetFiles(name);

        Assert.Collection(result,
            file => Assert.Same(first, file),
            file => Assert.Same(second, file),
            file => Assert.Same(third, file));
        Assert.NotSame(result, repeated);
        var mutable = Assert.IsType<List<IFormFile>>(result);
        mutable.RemoveAt(1);

        Assert.Equal(4, collection.Count);
        Assert.Collection(repeated,
            file => Assert.Same(first, file),
            file => Assert.Same(second, file),
            file => Assert.Same(third, file));
        collection.Clear();
        Assert.Empty(collection.GetFiles(name));
        Assert.Collection(result,
            file => Assert.Same(first, file),
            file => Assert.Same(third, file));
    }

    [Theory]
    [InlineData("Empty")]
    [InlineData("TurkishI")]
    [InlineData("SharpS")]
    public void GetFiles_PreservesOrdinalNameMatching(string scenario)
    {
        var (name, match, nonmatch) = scenario switch
        {
            "Empty" => ("", "", "upload"),
            "TurkishI" => ("i", "I", "\u0131"),
            "SharpS" => ("SS", "ss", "\u00df"),
            _ => throw new ArgumentException("Unknown scenario.", nameof(scenario)),
        };
        var first = CreateFile(nonmatch, "nonmatch.txt");
        var second = CreateFile(match, "match.txt");
        var collection = new FormFileCollection { first, second };

        Assert.Same(second, Assert.Single(collection.GetFiles(name)));
    }

    [Fact]
    public void GetFiles_VisitsEachNameOnceInOrder()
    {
        var visits = new List<int>();
        var collection = new FormFileCollection();
        var mocks = new List<Mock<IFormFile>>();
        for (var i = 0; i < 3; i++)
        {
            var index = i;
            var file = new Mock<IFormFile>(MockBehavior.Strict);
            file.SetupGet(f => f.Name).Returns(() =>
            {
                visits.Add(index);
                return index is 0 or 2 ? "upload" : "other";
            });
            mocks.Add(file);
            collection.Add(file.Object);
        }

        var result = collection.GetFiles("upload");

        Assert.Equal(new[] { 0, 1, 2 }, visits);
        Assert.Collection(result,
            file => Assert.Same(mocks[0].Object, file),
            file => Assert.Same(mocks[2].Object, file));
        foreach (var file in mocks)
        {
            file.VerifyGet(f => f.Name, Times.Once);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void GetFiles_PreservesNameGetterExceptions(bool afterMatch)
    {
        var exception = new InvalidOperationException("Name getter failure.");
        var file = new Mock<IFormFile>(MockBehavior.Strict);
        file.SetupGet(f => f.Name).Throws(exception);
        var collection = new FormFileCollection();
        if (afterMatch)
        {
            collection.Add(CreateFile("upload", "first.txt"));
        }
        collection.Add(file.Object);

        Assert.Same(exception, Assert.Throws<InvalidOperationException>(() => collection.GetFiles("upload")));
        file.VerifyGet(f => f.Name, Times.Once);
        Assert.Equal(afterMatch ? 2 : 1, collection.Count);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void GetFiles_PreservesMutationDetectionDuringNameLookup(bool matches)
    {
        var collection = new FormFileCollection();
        var added = CreateFile("upload", "added.txt");
        var file = new Mock<IFormFile>(MockBehavior.Strict);
        file.SetupGet(f => f.Name).Returns(() =>
        {
            collection.Add(added);
            return matches ? "upload" : "other";
        });
        collection.Add(file.Object);

        Assert.Throws<InvalidOperationException>(() => collection.GetFiles("upload"));
        Assert.Equal(2, collection.Count);
        Assert.Same(added, collection[1]);
        file.VerifyGet(f => f.Name, Times.Once);
    }

    private static FormFile CreateFile(string name, string fileName)
    {
        return new FormFile(Stream.Null, 0, 0, name, fileName);
    }
}
