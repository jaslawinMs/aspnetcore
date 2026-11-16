// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Diagnostics;
using System.Runtime.InteropServices;
using Microsoft.AspNetCore.Components.Routing;

namespace BlazorWebAssemblyStandalone;

internal static class HashOwnerMeasurements
{
    public static Report Run(IScrollToLocationHash owner, IReadOnlyDictionary<int, string> producedInputs, Configuration[]? configuration)
    {
        if (!OperatingSystem.IsBrowser())
        {
            throw new InvalidOperationException("These calipers must execute the actual browser owner in WebAssembly.");
        }

        if (producedInputs.Count != 11 || !Enumerable.Range(0, 11).All(producedInputs.ContainsKey))
        {
            throw new InvalidOperationException("Run all ten real navigation scenarios before measuring the owner.");
        }

        if (configuration is not null && (configuration.Length != 10 || !Enumerable.Range(1, 10).All(step => configuration.Count(item => item.Step == step) == 1)))
        {
            throw new InvalidOperationException("The selected phase must reuse all ten original measured cases.");
        }

        var allocatedBefore = GC.GetAllocatedBytesForCurrentThread();
        var accountingProbe = new byte[4096];
        var probeAllocatedBytes = GC.GetAllocatedBytesForCurrentThread() - allocatedBefore;
        GC.KeepAlive(accountingProbe);
        if (probeAllocatedBytes < accountingProbe.Length)
        {
            throw new InvalidOperationException("Native per-thread accounting did not observe a real untimed allocation.");
        }

        var cases = new List<Case>();
        foreach (var step in Enumerable.Range(1, 10))
        {
            var location = configuration is null
                ? producedInputs[step]
                : configuration.Single(item => item.Step == step).Location;
            var operations = configuration is null
                ? Calibrate(owner, location)
                : configuration.Single(item => item.Step == step).Operations;
            if (operations < 128 || operations > 16_777_216 || (operations & (operations - 1)) != 0)
            {
                throw new InvalidOperationException("Original calibrated operation counts must be bounded powers of two.");
            }

            var warmups = new List<Sample>();
            for (var index = 0; index < 3; index++)
            {
                warmups.Add(Measure(owner, location, operations, index));
            }

            var samples = new List<Sample>();
            for (var index = 0; index < 8; index++)
            {
                samples.Add(Measure(owner, location, operations, index));
            }

            cases.Add(new Case(step, location, operations, warmups, samples));
        }

        return new Report(
            owner.GetType().FullName ?? throw new InvalidOperationException("The actual browser owner must have a named type."),
            owner.GetType().Assembly.ManifestModule.ModuleVersionId,
            RuntimeInformation.FrameworkDescription,
            RuntimeInformation.ProcessArchitecture.ToString(),
            Stopwatch.Frequency,
            probeAllocatedBytes,
            cases);
    }

    private static int Calibrate(IScrollToLocationHash owner, string location)
    {
        for (var operations = 128; operations <= 16_777_216; operations *= 2)
        {
            var start = Stopwatch.GetTimestamp();
            Workload(owner, location, operations);
            if (Stopwatch.GetElapsedTime(start).TotalMilliseconds >= 100)
            {
                return operations;
            }
        }

        throw new InvalidOperationException("The native owner calibration never reached the declared iteration duration.");
    }

    private static Sample Measure(IScrollToLocationHash owner, string location, int operations, int index)
    {
        var allocatedBefore = GC.GetAllocatedBytesForCurrentThread();
        var start = Stopwatch.GetTimestamp();
        Workload(owner, location, operations);
        var end = Stopwatch.GetTimestamp();
        var allocated = GC.GetAllocatedBytesForCurrentThread() - allocatedBefore;
        if (allocated < 0 || end <= start)
        {
            throw new InvalidOperationException("Native calipers produced invalid elapsed time or allocation accounting.");
        }

        return new Sample(index, operations, end - start, allocated);
    }

    private static void Workload(IScrollToLocationHash owner, string location, int operations)
    {
        for (var index = 0; index < operations; index++)
        {
            var result = owner.RefreshScrollPositionForHash(location);
            if (!result.IsCompletedSuccessfully)
            {
                throw new InvalidOperationException("The real synchronous browser-import owner did not complete successfully.");
            }
        }
    }

    internal sealed record Configuration(int Step, string Location, int Operations);
    internal sealed record Sample(int Index, int Operations, long ElapsedTicks, long AllocatedBytes);
    internal sealed record Case(int Step, string Location, int Operations, IReadOnlyList<Sample> Warmups, IReadOnlyList<Sample> Samples);
    internal sealed record Report(string OwnerType, Guid OwnerMvid, string FrameworkDescription, string Architecture, long Frequency, long AccountingProbeAllocatedBytes, IReadOnlyList<Case> Cases);
}
