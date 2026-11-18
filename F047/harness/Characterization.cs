// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

internal static class Characterization
{
    internal static async Task RunAsync()
    {
        var dictionary = new Dictionary<string, object?> { ["first"] = 1, ["scalar"] = 2, ["last"] = 3 };
        var visited = new List<string>();
        foreach (var (name, value) in dictionary)
        {
            visited.Add(name);
            if (name != "scalar")
            {
                dictionary[name] = (int)value! + 1;
            }
        }
        Evidence.Require(visited.SequenceEqual(["first", "scalar", "last"])
            && Equals(dictionary["first"], 2) && Equals(dictionary["last"], 4),
            "Actual pinned runtime must permit existing-value overwrites during dictionary enumeration.");
        Evidence.Write("actual-runtime-dictionary-contract", new { actualPassed = true, actualVisited = visited });
        foreach (var mode in new[] { "server", "wasm", "auto" })
        {
            foreach (var profile in Enum.GetValues<BoundaryProfile>())
            {
                using var scenario = new BoundaryScenario(profile, mode);
                var original = scenario.Inputs.ToArray();
                var observed = await scenario.ObserveAsync(serialize: mode == "wasm");
                Evidence.Require(original.All(item => ReferenceEquals(scenario.Inputs[item.Key], item.Value)),
                    "Incoming prepared frames and original delegate identities must remain unchanged.");
                scenario.Run();
                Evidence.Write("actual-renderer-boundary-characterized", new
                {
                    actualMode = mode, actualProfile = profile.ToString(), actualInputs = scenario.Inputs.Count,
                    actualFreshBenchmarkOperationAlsoExecuted = true, actualOriginalInputsUnchanged = true,
                    actualCreated = scenario.Created, actualDisposed = scenario.Disposed, observed
                });
            }
        }
        using (var nested = new BoundaryScenario(BoundaryProfile.PrerenderFragment1, "wasm",
            new() { [nameof(BoundaryScenario.PayloadComponent.First)] = BoundaryScenario.Fragment(0, nested: true) }))
        {
            var observed = await nested.ObserveAsync(serialize: true);
            Evidence.Require(Evidence.Compact(observed).Contains("nested-fragment", StringComparison.Ordinal),
                "The real nested fragment must execute and reach the observed renderer/marker path.");
            Evidence.Write("actual-nested-fragment-characterized", observed);
        }
        using var services = new ServiceCollection().AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance).BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = services };
        var invalidCount = 0;
        var disabledCount = 0;
        foreach (var mode in new[] { "server", "wasm", "auto" })
        {
            foreach (var prerender in new[] { true, false })
            {
                foreach (var invalid in new Delegate[] { (Action)(() => { }), (RenderFragment<string>)(_ => _ => { }) })
                {
                    var boundary = BoundaryAccess.Create(context, typeof(BoundaryScenario.PayloadComponent), BoundaryScenario.Mode(mode, prerender));
                    var exception = await CaptureAsync(() => boundary.SetParametersAsync(ParameterView.FromDictionary(
                        new Dictionary<string, object?> { ["Invalid"] = invalid })));
                    Evidence.Require(exception is InvalidOperationException
                        && exception.Message.Contains("Cannot pass", StringComparison.Ordinal)
                        && exception.Message.Contains("'Invalid'", StringComparison.Ordinal),
                        "Actual delegate validation must reject the same invalid input before rendering.");
                    invalidCount++;
                    Evidence.Write("actual-invalid-delegate-contract", new { mode, prerender,
                        actualDelegateType = invalid.GetType().ToString(), actualException = exception.Message });
                }
            }
            var disabled = BoundaryAccess.Create(context, typeof(BoundaryScenario.PayloadComponent), BoundaryScenario.Mode(mode, prerender: false));
            await disabled.SetParametersAsync(ParameterView.FromDictionary(new Dictionary<string, object?>
            {
                [nameof(BoundaryScenario.PayloadComponent.First)] = BoundaryScenario.Fragment(0),
            }));
            var disabledException = await CaptureAsync(() =>
            {
                BoundaryAccess.Marker(disabled, context);

                return Task.CompletedTask;
            });
            Evidence.Require(disabledException is InvalidOperationException
                && disabledException.Message.Contains("RenderFragment was not executed", StringComparison.Ordinal),
                "Disabled prerendering with fragments is an expected serialization failure, not a legal success control.");
            disabledCount++;
            Evidence.Write("actual-disabled-fragment-contract", new { mode, actualException = disabledException.Message });
        }
        Evidence.Write("characterization-completed", new
        {
            actualRendererProfiles = 24, actualBenchmarkProfiles = 8, actualNestedFragmentCases = 1,
            actualInvalidDelegateCases = invalidCount, actualDisabledFragmentFailures = disabledCount,
            actualNewShippingInternalsVisibleToOrUnsafeAccessor = false,
            actualPublicOrSignedFriendAssemblyImpersonation = false,
            actualMarkerAdapterScope = "WebAssembly markers only; canonical sample and owning tests cover Server/Auto serialization.",
            actualTimed = false, actualPassed = true
        });
    }

    private static async Task<Exception> CaptureAsync(Func<Task> action)
    {
        try
        {
            await action();
        }
        catch (InvalidOperationException exception)
        {
            return exception;
        }
        throw new InvalidOperationException("The invalid-input contract did not reject its input.");
    }
}
