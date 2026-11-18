// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.HttpSys.Internal;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
using Moq;

namespace Microsoft.AspNetCore.Server.HttpSys.Tests;

public class HeaderCollectionTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Append_PreservesKeyAndValueOrder(bool existing)
    {
        var headers = new HeaderCollection();
        if (existing)
        {
            headers["cOnNeCtIoN"] = new[] { "keep-alive", "upgrade" };
        }

        headers.Append(HeaderNames.Connection, "close");

        var entry = Assert.Single(headers);
        Assert.Equal(existing ? "cOnNeCtIoN" : HeaderNames.Connection, entry.Key);
        Assert.Equal(existing ? new[] { "keep-alive", "upgrade", "close" } : new[] { "close" }, entry.Value.ToArray());
    }

    [Fact]
    public void Append_CustomStorePreservesInterfaceReadThenWrite()
    {
        var store = new Mock<IDictionary<string, StringValues>>(MockBehavior.Strict);
        var original = new StringValues(new[] { "keep-alive", "upgrade" });
        var sequence = new MockSequence();
        store.InSequence(sequence).Setup(dictionary => dictionary.TryGetValue(HeaderNames.Connection, out original)).Returns(true);
        store.InSequence(sequence).SetupSet(dictionary => dictionary[HeaderNames.Connection] =
            It.Is<StringValues>(value => value.SequenceEqual(new[] { "keep-alive", "upgrade", "close" })));
        var headers = new HeaderCollection(store.Object);

        headers.Append(HeaderNames.Connection, "close");

        store.Verify(dictionary => dictionary.TryGetValue(HeaderNames.Connection, out original), Times.Once);
        store.VerifySet(dictionary => dictionary[HeaderNames.Connection] =
            It.Is<StringValues>(value => value.SequenceEqual(new[] { "keep-alive", "upgrade", "close" })), Times.Once);
        store.VerifyNoOtherCalls();
    }

    [Fact]
    public void Append_DerivedStorePreservesInterfaceOperations()
    {
        var store = new InterfaceTrackingDictionary
        {
            ["cOnNeCtIoN"] = "keep-alive"
        };
        var headers = new HeaderCollection(store);

        headers.Append(HeaderNames.Connection, "close");

        Assert.Equal(1, store.Reads);
        Assert.Equal(1, store.Writes);
        var entry = Assert.Single(store);
        Assert.Equal("cOnNeCtIoN", entry.Key);
        Assert.Equal(new[] { "keep-alive", "close" }, entry.Value.ToArray());
    }

    [Theory]
    [InlineData(true, "Connection", "bad\rvalue")]
    [InlineData(false, "bad\rname", "close")]
    [InlineData(false, "Connection", "bad\rvalue")]
    public void Append_ValidationPrecedesStoreAccess(bool readOnly, string key, string value)
    {
        var store = new Mock<IDictionary<string, StringValues>>(MockBehavior.Strict);
        var headers = new HeaderCollection(store.Object) { IsReadOnly = readOnly };

        var error = Assert.Throws<InvalidOperationException>(() => headers.Append(key, value));

        Assert.Contains(readOnly ? "response headers cannot be modified" : "0x0D", error.Message);
        Assert.Empty(store.Invocations);
    }

    [Fact]
    public void Append_TrailerRestrictionPrecedesReadOnly()
    {
        var headers = new HeaderCollection(checkTrailers: true) { IsReadOnly = true };

        var error = Assert.Throws<InvalidOperationException>(() => headers.Append(HeaderNames.Connection, "close"));

        Assert.Equal("The 'Connection' header is not allowed in HTTP trailers.", error.Message);
        Assert.Empty(headers);
        Assert.True(headers.IsReadOnly);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Append_NullValuePreservesEntry(bool existing)
    {
        var headers = new HeaderCollection();
        if (existing)
        {
            headers[HeaderNames.Connection] = "keep-alive";
        }

        headers.Append(HeaderNames.Connection, null!);

        var entry = Assert.Single(headers);
        Assert.Equal(HeaderNames.Connection, entry.Key);
        Assert.True(headers.ContainsKey("connection"));
        Assert.Equal(existing ? new[] { "keep-alive" } : Array.Empty<string>(), entry.Value.ToArray());
    }

    private sealed class InterfaceTrackingDictionary() : Dictionary<string, StringValues>(StringComparer.OrdinalIgnoreCase),
        IDictionary<string, StringValues>
    {
        public int Reads { get; private set; }
        public int Writes { get; private set; }

        StringValues IDictionary<string, StringValues>.this[string key]
        {
            get => base[key];
            set
            {
                Writes++;
                base[key] = value;
            }
        }

        bool IDictionary<string, StringValues>.TryGetValue(string key, out StringValues value)
        {
            Reads++;

            return base.TryGetValue(key, out value);
        }
    }
}
