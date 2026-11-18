// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Components;

namespace AutoPerf;

/// <summary>Prepared conditional-removal cases and unchanged string-key-removal control.</summary>
public enum TempDataWorkload
{
    Match,
    Different,
    Null,
    MissingNull,
    ControlRemoveKey,
}

/// <summary>Measures real removal plus timed restoration, not one removal followed by misses.</summary>
public class TempDataRemoveBenchmarks
{
    private TempDataScenario _scenario = null!;
    private ITempData _data = null!;
    private ICollection<KeyValuePair<string, object?>> _collection = null!;
    private KeyValuePair<string, object?> _item;
    private string _restoreKey = "";
    private object? _restoreValue;
    internal bool Expected => Count > 0 && Workload is TempDataWorkload.Match or TempDataWorkload.Null or TempDataWorkload.ControlRemoveKey;
    internal string Profile => $"{Workload}:{KeyLength}:{Count}";

    /// <summary>Gets or sets the entry count maintained by every complete round trip.</summary>
    [Params(0, 1, 8, 64)]
    public int Count { get; set; }

    /// <summary>Gets or sets the actual prepared key length.</summary>
    [Params(12, 128)]
    public int KeyLength { get; set; }

    /// <summary>Gets or sets the conditional-removal case or unchanged-member control.</summary>
    [Params(TempDataWorkload.Match, TempDataWorkload.Different, TempDataWorkload.Null,
        TempDataWorkload.MissingNull, TempDataWorkload.ControlRemoveKey)]
    public TempDataWorkload Workload { get; set; }

    /// <summary>Creates the publicly produced owner and all operation/restoration inputs outside timing.</summary>
    [GlobalSetup]
    public void Setup()
    {
        _scenario = TempDataScenario.CreateAsync().GetAwaiter().GetResult();
        _data = _scenario.Data;
        _collection = (ICollection<KeyValuePair<string, object?>>)_data;
        var target = Count / 2;
        var storedValue = new string('v', 8);
        _restoreKey = Key(target);
        _restoreValue = Workload is TempDataWorkload.Null ? null : storedValue;
        for (var index = 0; index < Count; index++)
        {
            _data[Key(index)] = index == target ? _restoreValue : "neighbor";
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
            Evidence.Require(!ReferenceEquals(_data.Peek(queryKey), queryValue), "Require distinct equal string objects.");
        }
        Validate();
        Evidence.Write("benchmark-setup", new { profile = Profile, actualCount = _data.Count,
            actualKeyLength = _item.Key.Length, actualExpected = Expected,
            actualProviderLoads = _scenario.Logs.LoadEvents, actualInputsPreparedOutsideTiming = true,
            actualNonemptyRestorationInsideTiming = true });
    }

    private string Key(int index) => new string('K', KeyLength - 8) + index.ToString("D8", CultureInfo.InvariantCulture);

    /// <summary>Removes through the real selected slot, then restores the prepared target inside timing.</summary>
    [Benchmark]
    public bool RemoveAndRestore()
    {
        var removed = Workload is TempDataWorkload.ControlRemoveKey
            ? _data.Remove(_item.Key)
            : _collection.Remove(_item);
        if (Count > 0)
        {
            _data[_restoreKey] = _restoreValue;
        }

        return removed;
    }

    internal void Validate()
    {
        Evidence.Require(RemoveAndRestore() == Expected, "Actual removal result mismatch: " + Profile);
        ValidateRestoredState();
    }

    internal void ValidateRestoredState()
    {
        Evidence.Require(_data.Count == Count, "Actual restored cardinality mismatch: " + Profile);
        Evidence.Require(_scenario.Logs.LoadEvents == 1 && _scenario.Logs.Warnings == 0,
            "Require one actual provider load and no hidden warning: " + Profile);
    }

    /// <summary>Checks restored state and disposes the untimed fixture.</summary>
    [GlobalCleanup]
    public void Cleanup()
    {
        Validate();
        Evidence.Write("benchmark-cleanup", new { profile = Profile, actualExpected = Expected,
            actualCount = _data.Count, actualProviderLoads = _scenario.Logs.LoadEvents,
            actualNonemptyRestorationInsideTiming = true });
        _scenario.DisposeAsync().AsTask().GetAwaiter().GetResult();
    }
}
