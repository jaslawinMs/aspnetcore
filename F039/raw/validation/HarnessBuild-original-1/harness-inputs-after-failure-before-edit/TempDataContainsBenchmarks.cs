// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Components;

namespace AutoPerf;

/// <summary>Prepared real TempData containment and unchanged ContainsKey control profiles.</summary>
public enum TempDataWorkload
{
    Match,
    Different,
    Null,
    MissingNull,
    ControlContainsKey,
}

/// <summary>Measures the actual collection slot on the publicly produced source-built owner.</summary>
public sealed class TempDataContainsBenchmarks
{
    private TempDataScenario _scenario = null!;
    private ITempData _data = null!;
    private ICollection<KeyValuePair<string, object?>> _collection = null!;
    private KeyValuePair<string, object?> _item;
    internal bool Expected => Count > 0 && Workload is TempDataWorkload.Match or TempDataWorkload.Null or TempDataWorkload.ControlContainsKey;
    internal string Profile => $"{Workload}:{KeyLength}:{Count}";

    /// <summary>Gets or sets the prepared dictionary entry count; zero is explicitly a miss.</summary>
    [Params(0, 1, 8, 64)]
    public int Count { get; set; }

    /// <summary>Gets or sets the actual prepared key length.</summary>
    [Params(12, 128)]
    public int KeyLength { get; set; }

    /// <summary>Gets or sets the actual lookup case or unchanged-member control.</summary>
    [Params(TempDataWorkload.Match, TempDataWorkload.Different, TempDataWorkload.Null,
        TempDataWorkload.MissingNull, TempDataWorkload.ControlContainsKey)]
    public TempDataWorkload Workload { get; set; }

    /// <summary>Creates the real owner and all lookup inputs outside timing.</summary>
    [GlobalSetup]
    public void Setup()
    {
        _scenario = TempDataScenario.CreateAsync().GetAwaiter().GetResult();
        _data = _scenario.Data;
        _collection = (ICollection<KeyValuePair<string, object?>>)_data;
        var target = Count / 2;
        var storedValue = new string('v', 8);
        for (var index = 0; index < Count; index++)
        {
            _data[Key(index)] = index == target && Workload is TempDataWorkload.Null
                ? null : index == target ? storedValue : "neighbor";
        }
        var queryKey = Key(Workload is TempDataWorkload.MissingNull ? Count + 100 : target).ToLowerInvariant();
        object? queryValue = Workload switch
        {
            TempDataWorkload.Null or TempDataWorkload.MissingNull => null,
            TempDataWorkload.Different => new string('x', 8),
            _ => new string(storedValue.AsSpan()),
        };
        _item = new(queryKey, queryValue);
        _ = _data.ContainsKey(queryKey);
        Evidence.Require(queryKey.Length == KeyLength && _data.Count == Count, "Actual prepared cardinality/key length mismatch.");
        if (Count > 0 && Workload is TempDataWorkload.Match)
        {
            Evidence.Require(!ReferenceEquals(_data.Peek(queryKey), queryValue), "Use distinct equal string objects, not a reference-equality shortcut.");
        }
        Validate();
        Evidence.Write("benchmark-setup", new { profile = Profile, actualCount = _data.Count,
            actualKeyLength = _item.Key.Length, actualExpected = Expected,
            actualProviderLoads = _scenario.Logs.LoadEvents, actualPairPreparedOutsideTiming = true });
    }

    private string Key(int index) => new string('K', KeyLength - 8) + index.ToString("D8", CultureInfo.InvariantCulture);

    /// <summary>Invokes the actual prepared collection slot or the explicitly named unchanged control.</summary>
    [Benchmark]
    public bool Contains() => Workload is TempDataWorkload.ControlContainsKey
        ? _data.ContainsKey(_item.Key)
        : _collection.Contains(_item);

    internal void Validate()
    {
        Evidence.Require(Contains() == Expected && _data.Count == Count, "Actual lookup result/cardinality mismatch: " + Profile);
        Evidence.Require(_scenario.Logs.LoadEvents == 1 && _scenario.Logs.Warnings == 0,
            "Require exactly one real provider load and no hidden warning for prepared lookup: " + Profile);
    }

    /// <summary>Verifies final lookup/producer state and disposes the untimed fixture.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        Validate();
        Evidence.Write("benchmark-cleanup", new { profile = Profile, actualExpected = Expected,
            actualCount = _data.Count, actualProviderLoads = _scenario.Logs.LoadEvents });
        _scenario.DisposeAsync().AsTask().GetAwaiter().GetResult();
    }
}
