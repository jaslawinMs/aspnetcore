// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class HeaderAppendBenchmarks
{
    private Func<int> _native = null!;
    private Func<int> _control = null!;

    [ParamsAllValues]
    public ConnectionProfileKey ProfileKey { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _native = HeaderAccess.HttpSys.CompileFreshOperation(ProfileKey, publicControl: false);
        _control = HeaderAccess.HttpSys.CompileFreshOperation(ProfileKey, publicControl: true);
    }

    [Benchmark]
    public int FreshNativeAppend() => _native();

    [Benchmark]
    public int FreshPublicExtensionControl() => _control();
}
