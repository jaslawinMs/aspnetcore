using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text.Json;
using AutoPerf.HotReload;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

var control = Environment.GetEnvironmentVariable("AUTOPERF_WATCH_CONTROL");
ArgumentException.ThrowIfNullOrEmpty(control);
Directory.CreateDirectory(control);
var services = new ServiceCollection();
services.AddLogging();
services.AddControllers();
using var provider = services.BuildServiceProvider();
_ = provider.GetRequiredService<IActionDescriptorCollectionProvider>().ActionDescriptors;
var validator = provider.GetRequiredService<IObjectModelValidator>();
var owner = typeof(ObjectModelValidator).Assembly;
var ownerHash = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(owner.Location)));
var strategy = owner.GetType("Microsoft.AspNetCore.Mvc.ModelBinding.Validation.DefaultUnionValidationStrategy", throwOnError: true)!;
var cacheField = strategy.GetField("_unionValueGetters", BindingFlags.Static | BindingFlags.NonPublic)
    ?? throw new InvalidOperationException("Actual owning cache field is missing.");
var observation = new CacheObservation();
Console.WriteLine($"AUTOPERF_WATCH_START={Environment.ProcessId};owner={ownerHash}");
var trigger = Path.Combine(control, "request.txt");
while (true)
{
    if (File.Exists(trigger))
    {
        var request = File.ReadAllText(trigger).Trim();
        File.Delete(trigger);
        var model = new ChangingUnion();
        var context = new ActionContext { HttpContext = new DefaultHttpContext() };
        validator.Validate(context, null, "model", model);
        if (cacheField.GetValue(null) is not ConditionalWeakTable<Type, MethodInfo> cache ||
            !cache.TryGetValue(typeof(ChangingUnion), out var getter))
        {
            throw new InvalidOperationException("Public validation did not produce the actual interface-map cache entry.");
        }
        var attribute = typeof(ChangingUnion).GetProperty(nameof(ChangingUnion.Value))!
            .GetCustomAttribute<MaxLengthAttribute>()
            ?? throw new InvalidOperationException("Actual edited validation attribute is missing.");
        var state = new
        {
            request,
            pid = Environment.ProcessId,
            owner_sha256 = ownerHash,
            valid = context.ModelState.IsValid,
            errors = context.ModelState.SelectMany(entry =>
            {
                if (entry.Value is not { } value)
                {
                    throw new InvalidOperationException("Actual ModelState entry is missing.");
                }
                return value.Errors.Select(error => new { key = entry.Key, message = error.ErrorMessage });
            }).ToArray(),
            getter_calls = model.ReadCalls(),
            max_length = attribute.Length,
            cache_generation = observation.Observe(cache),
            cached_method = getter.Name,
            provider = validator.GetType().FullName,
            boundary = "Actual DI-created MVC validator and default metadata/case/property validation under a real runtime delta; private cache observed after its real producer,never seeded or directly cleared."
        };
        var output = Path.Combine(control, request + ".json");
        File.WriteAllText(output + ".tmp", JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true }));
        File.Move(output + ".tmp", output);
        Console.WriteLine($"AUTOPERF_WATCH_RESPONSE={request};pid={state.pid};valid={state.valid};generation={state.cache_generation}");
    }
    await Task.Delay(100);
}

internal sealed class CacheObservation
{
    private object? _previous;
    private int _generation;

    public int Observe(object cache)
    {
        if (!ReferenceEquals(_previous, cache))
        {
            _previous = cache;
            _generation++;
        }

        return _generation;
    }
}
