// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Globalization;
using Microsoft.AspNetCore.Components.Routing;

namespace BlazorWebAssemblyStandalone;

internal sealed class HashScrollDiagnostics(IScrollToLocationHash owner) : IScrollToLocationHash
{
    private string _location = string.Empty;
    private int _hashIndex = -1;
    private string? _identifier;
    private bool _completed;
    private int _calls;
    private readonly Dictionary<int, string> _inputs = [];

    public Task RefreshScrollPositionForHash(string locationAbsolute)
    {
        var originalIndex = locationAbsolute.IndexOf("#", StringComparison.Ordinal);
        var proposedIndex = locationAbsolute.IndexOf('#');
        if (originalIndex != proposedIndex)
        {
            throw new InvalidOperationException("The prototype changed first-delimiter semantics.");
        }

        _location = locationAbsolute;
        _hashIndex = originalIndex;
        _identifier = originalIndex >= 0 && originalIndex < locationAbsolute.Length - 1
            ? locationAbsolute[(originalIndex + 1)..]
            : null;
        _calls++;

        var result = owner.RefreshScrollPositionForHash(locationAbsolute);
        _completed = result.IsCompletedSuccessfully;
        var step = int.Parse(new Uri(locationAbsolute).Segments[^1], CultureInfo.InvariantCulture);
        _inputs[step] = locationAbsolute;

        return result;
    }

    public HashOwnerMeasurements.Report Measure(HashOwnerMeasurements.Configuration[]? configuration)
    {
        return HashOwnerMeasurements.Run(owner, _inputs, configuration);
    }

    public Snapshot GetSnapshot()
    {
        return new Snapshot(
            _calls,
            _location,
            _hashIndex,
            _identifier,
            _completed,
            owner.GetType().FullName ?? throw new InvalidOperationException("The actual owner must have a named type."),
            owner.GetType().Assembly.ManifestModule.ModuleVersionId);
    }

    internal sealed record Snapshot(int Calls, string Location, int HashIndex, string? Identifier, bool Completed, string OwnerType, Guid OwnerMvid);
}
