// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Microsoft.AspNetCore.Mvc.Microbenchmarks;

public class ModelStateDictionaryBenchmark
{
    private ModelStateDictionary _modelState;

    [Params(1, 10, 100, 1000)]
    public int ItemCount { get; set; }

    [Params(false, true)]
    public bool Nested { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _modelState = new ModelStateDictionary();
        for (var i = 0; i < ItemCount; i++)
        {
            var prefix = Nested ? $"Items[{i:D4}]." : $"Item{i:D4}_";
            _modelState.SetModelValue(prefix + "Id", "id", "id");
            _modelState.SetModelValue(prefix + "Name", "name", "name");
        }

        if (Enumerate() != ItemCount * 2)
        {
            throw new InvalidOperationException("The benchmark must enumerate every model-state entry.");
        }
    }

    [Benchmark]
    public int Enumerate()
    {
        var count = 0;
        foreach (var entry in _modelState)
        {
            count++;
        }

        return count;
    }
}
