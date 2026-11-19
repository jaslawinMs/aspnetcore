// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Net;
using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal static class HostedProducer
{
    internal static (IReadOnlyList<IValueProviderFactory> Source, List<IValueProviderFactory>? Copy)
        ReadStore(IList<IValueProviderFactory> factories)
    {
        var type = factories.GetType();
        Evidence.Require(type.Assembly == typeof(ControllerContext).Assembly
            && type.IsGenericType
            && type.GetGenericTypeDefinition().FullName == "Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteList`1",
            "Require the actual framework-produced collection, not a surrogate or property substitution.");
        var source = (IReadOnlyList<IValueProviderFactory>)type.GetField("_source", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(factories)!;
        var copy = (List<IValueProviderFactory>?)type.GetField("_copy", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(factories);
        Evidence.Require(source.GetType() == typeof(IValueProviderFactory[]), "Require the source-proven array cache.");

        return (source, copy);
    }

    internal static async Task<IList<IValueProviderFactory>> CaptureAsync(CollectionProfile profile, bool enableActionInvokers)
    {
        var state = new CaptureState();
        using var host = new HostBuilder()
            .ConfigureWebHost(web => web
                .UseTestServer()
                .UseSetting(WebHostDefaults.ApplicationKey, typeof(ProbeController).Assembly.GetName().Name)
                .ConfigureServices(services =>
                {
                    services.AddSingleton(state);
                    services.AddMvcCore(options =>
                    {
                        options.EnableActionInvokers = enableActionInvokers;
                        if (CollectionScenario.ConfiguredCount(profile) is int count)
                        {
                            options.ValueProviderFactories.Clear();
                            for (var index = 0; index < count; index++)
                            {
                                options.ValueProviderFactories.Add(new MarkerFactory("configured-" + index));
                            }
                        }
                    }).AddApplicationPart(typeof(ProbeController).Assembly);
                })
                .Configure(app =>
                {
                    app.UseRouting();
                    app.UseEndpoints(endpoints => endpoints.MapControllers());
                }))
            .Build();
        await host.StartAsync().ConfigureAwait(false);
        try
        {
            Evidence.Require(host.Services.GetRequiredService<IOptions<MvcOptions>>().Value.EnableActionInvokers == enableActionInvokers,
                "The requested real controller producer mode was not configured.");
            using var client = host.GetTestClient();
            var requests = new[] { CollectionScenario.RequiresCopy(profile), false };
            foreach (var copied in requests)
            {
                using var response = await client.GetAsync("/f122/capture?copy=" + (copied ? "true" : "false")).ConfigureAwait(false);
                var body = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
                Evidence.Require(response.StatusCode == HttpStatusCode.OK && body == "captured",
                    $"Actual MVC HTTP request failed: {(int)response.StatusCode}: {body}");
            }
            Evidence.Require(state.Captures.Count == 2 && state.Observations.Count == 2,
                "Both real parameterless controller actions must actually run.");
            var first = state.Captures[0];
            var second = state.Captures[1];
            var firstStore = ReadStore(first);
            var secondStore = ReadStore(second);
            var expectedCount = CollectionScenario.ConfiguredCount(profile) ?? 5;
            Evidence.Require(!ReferenceEquals(first, second)
                && ReferenceEquals(firstStore.Source, secondStore.Source)
                && secondStore.Copy is null
                && (firstStore.Copy is not null) == requests[0]
                && first.Count == expectedCount && second.Count == expectedCount
                && first.SequenceEqual(second, ReferenceEqualityComparer.Instance),
                "Public mutation must preserve the shared source and isolate the two actual per-request wrappers.");
            Evidence.Write("actual-mvc-producer", new
            {
                actualProfile = profile.ToString(),
                actualEnableActionInvokers = enableActionInvokers,
                actualHttpRequests = 2,
                actualDefaultFiveVerified = CollectionScenario.ConfiguredCount(profile) is null,
                actualConfiguredFactoryCount = expectedCount,
                actualDistinctPerRequestWrappers = true,
                actualSameUntouchedSourceArray = true,
                actualSecondRequestHasNoCopy = true,
                actualNoValueProviderFactoriesPropertyAssignment = true,
                actualReflectedFieldsObservedOnlyOutsideTiming = true,
                actualCompiledRazorPageRequestClaimed = false,
                observations = state.Observations
            });

            return first;
        }
        finally
        {
            await host.StopAsync().ConfigureAwait(false);
        }
    }
}

public sealed class CaptureState
{
    internal List<IList<IValueProviderFactory>> Captures { get; } = [];
    internal List<object> Observations { get; } = [];
}

[Route("f122")]
public sealed class ProbeController(CaptureState state) : ControllerBase
{
    [HttpGet("capture")]
    public IActionResult Capture()
    {
        var query = Request.Query["copy"].ToString();
        Evidence.Require(query is "true" or "false", "Require the explicit raw-query copy instruction.");
        var copied = query == "true";
        var factories = ControllerContext.ValueProviderFactories;
        var before = HostedProducer.ReadStore(factories);
        var sourceSnapshot = before.Source.ToArray();
        Evidence.Require(before.Copy is null, "A fresh actual MVC request must start without a copy.");
        if (copied)
        {
            var extra = new MarkerFactory("temporary-first-write");
            factories.Add(extra);
            Evidence.Require(factories.Count == sourceSnapshot.Length + 1 && factories.Contains(extra),
                "The public first write must execute and create the private copy.");
            factories.RemoveAt(factories.Count - 1);
        }
        var after = HostedProducer.ReadStore(factories);
        Evidence.Require((after.Copy is not null) == copied
            && after.Source.SequenceEqual(sourceSnapshot, ReferenceEqualityComparer.Instance)
            && factories.SequenceEqual(sourceSnapshot, ReferenceEqualityComparer.Instance),
            "Preparing the private store must not change its contents or shared source.");
        state.Captures.Add(factories);
        state.Observations.Add(new
        {
            actualRawQueryReadByParameterlessAction = query,
            actualInitialCopyNull = true,
            actualFinalCopied = after.Copy is not null,
            actualPrivateCopyIsExactList = after.Copy is not null && after.Copy.GetType() == typeof(List<IValueProviderFactory>),
            actualFactoryCount = factories.Count,
            actualFactoryTypes = factories.Select(factory => factory.GetType().FullName).ToArray(),
            actualSourceUnchanged = true
        });

        return Content("captured");
    }
}

internal sealed class MarkerFactory(string name) : IValueProviderFactory
{
    internal string Name { get; } = name;

    public Task CreateValueProviderAsync(ValueProviderFactoryContext context)
    {
        return Task.CompletedTask;
    }
}
