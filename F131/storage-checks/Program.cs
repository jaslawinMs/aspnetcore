using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Owin;

var assembly = typeof(OwinEnvironment).Assembly;
Console.WriteLine($"Owin assembly: {assembly.Location}");
Console.WriteLine($"Owin MVID: {assembly.ManifestModule.ModuleVersionId}");
var owner = typeof(OwinEnvironment).GetNestedType("OwinEntries", BindingFlags.NonPublic)
    ?? throw new InvalidOperationException("Missing actual entries owner.");
var legacyField = owner.GetField("_entries", BindingFlags.NonPublic | BindingFlags.Static)
    ?? throw new InvalidOperationException("Missing original ordering map.");
var indexField = owner.GetField("_lookupEntries", BindingFlags.NonPublic | BindingFlags.Static)
    ?? throw new InvalidOperationException("Missing private lookup index.");
var legacy = (IReadOnlyDictionary<string, OwinEnvironment.FeatureMap>)(legacyField.GetValue(null)
    ?? throw new InvalidOperationException("Missing original map value."));
if (indexField.GetValue(null) is not Dictionary<string, OwinEnvironment.FeatureMap> index ||
    indexField.FieldType != typeof(IReadOnlyDictionary<string, OwinEnvironment.FeatureMap>) ||
    !indexField.IsPrivate || !indexField.IsInitOnly ||
    legacy.Count != 25 || index.Count != legacy.Count || !index.Comparer.Equals(StringComparer.Ordinal))
{
    throw new InvalidOperationException("Tuned private read-only-interface index/count/comparer contract failed.");
}
foreach (var pair in legacy)
{
    if (!index.TryGetValue(pair.Key, out var actual) || !ReferenceEquals(actual, pair.Value))
    {
        throw new InvalidOperationException("Tuned index did not share all original FeatureMap objects.");
    }
}
using var body = new MemoryStream();
using var replacement = new MemoryStream();
var context = new DefaultHttpContext();
context.Request.Method = "GET";
context.Response.Body = body;
var wrapper = new OwinEnvironment(context);
var maps = wrapper.FeatureMaps;
if (ReferenceEquals(maps, index) || !maps.Keys.SequenceEqual(legacy.Keys.Append("owin.ResponseBody")))
{
    throw new InvalidOperationException("Public mutable map exposed the static index or changed original copy order.");
}
maps.Remove("owin.RequestMethod");
if (!index.ContainsKey("owin.RequestMethod") || ((IDictionary<string, object>)wrapper).ContainsKey("owin.RequestMethod"))
{
    throw new InvalidOperationException("Context customization altered static lookup state or was ignored.");
}
var nextContext = new DefaultHttpContext();
nextContext.Request.Method = "NEXT";
IDictionary<string, object> next = new OwinEnvironment(nextContext);
if ((string)next["owin.RequestMethod"] != "NEXT")
{
    throw new InvalidOperationException("A new request inherited another context's map customization.");
}
((IDictionary<string, object>)wrapper)["owin.ResponseBody"] = replacement;
if (!ReferenceEquals(context.Response.Body, replacement) ||
    !ReferenceEquals(next["owin.ResponseBody"], Stream.Null))
{
    throw new InvalidOperationException("Context-specific response-body mapping lost its owner.");
}
Console.WriteLine(JsonSerializer.Serialize(new
{
    legacy_map_count = legacy.Count,
    legacy_map_type = legacy.GetType().FullName,
    lookup_field_type = indexField.FieldType.FullName,
    lookup_runtime_type = index.GetType().FullName,
    lookup_count = index.Count,
    lookup_field_private_readonly = true,
    ordinal_comparer = true,
    all_original_feature_map_references_shared = true,
    public_copy_order_preserved = true,
    public_map_not_static_index = true,
    custom_map_isolation_preserved = true,
    context_body_isolation_preserved = true,
    timing_instrumentation_added = false,
    cold_initialization_performance_claimed = false,
}));
