using Microsoft.AspNetCore.Internal;

namespace F214.Qualification.Tests;

public class F214NullGuardQualificationTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public void ReferenceNullKeysAreRejectedByEveryGuard(int capacity)
    {
        var dictionary = new AdaptiveCapacityDictionary<string, string>(capacity);
        var key = (string)null!;
        Assert.Equal(capacity > 10, dictionary._dictionaryStorage is not null);
        Assert.Equal(capacity <= 10, dictionary._arrayStorage is not null);

        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary[key]);
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary[key] = "value");
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.Add(key, "value"));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.ContainsKey(key));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.Remove(key));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.Remove(key, out _));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.TryAdd(key, "value"));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.TryGetValue(key, out _));
        Assert.Empty(dictionary);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public void NonNullableValueKeysAcceptDefaultAcrossGuardedOperations(int capacity)
    {
        var dictionary = new AdaptiveCapacityDictionary<int, string>(capacity);
        Assert.Equal(capacity > 10, dictionary._dictionaryStorage is not null);
        Assert.Equal(capacity <= 10, dictionary._arrayStorage is not null);

        Assert.True(dictionary.TryAdd(0, "zero"));
        Assert.False(dictionary.TryAdd(0, "replacement"));
        Assert.Equal("zero", dictionary[0]);
        dictionary[0] = "updated";
        Assert.True(dictionary.TryGetValue(0, out var value));
        Assert.Equal("updated", value);
        Assert.True(dictionary.ContainsKey(0));
        Assert.True(dictionary.Remove(0, out var removed));
        Assert.Equal("updated", removed);
        dictionary.Add(0, "again");
        Assert.True(dictionary.Remove(0));
        Assert.False(dictionary.Remove(0));
        Assert.Empty(dictionary);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public void NullableValueKeysRejectEmptyAndAcceptPresentDefault(int capacity)
    {
        // This intentionally probes the runtime behavior outside the notnull annotation contract.
#pragma warning disable CS8714
        var dictionary = new AdaptiveCapacityDictionary<int?, string>(capacity);
#pragma warning restore CS8714
        int? key = null;
        Assert.Equal(capacity > 10, dictionary._dictionaryStorage is not null);
        Assert.Equal(capacity <= 10, dictionary._arrayStorage is not null);

        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary[key]);
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary[key] = "value");
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.Add(key, "value"));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.ContainsKey(key));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.Remove(key));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.Remove(key, out _));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.TryAdd(key, "value"));
        Assert.Throws<ArgumentNullException>(nameof(key), () => dictionary.TryGetValue(key, out _));
        Assert.Empty(dictionary);

        Assert.True(dictionary.TryAdd(0, "present zero"));
        Assert.False(dictionary.TryAdd(0, "replacement"));
        Assert.Equal("present zero", dictionary[0]);
        Assert.True(dictionary.ContainsKey(0));
        Assert.True(dictionary.Remove(0, out var removed));
        Assert.Equal("present zero", removed);
        Assert.Empty(dictionary);
    }
}
