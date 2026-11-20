using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.AspNetCore.Internal;

Console.WriteLine(JsonSerializer.Serialize(new
{
    Diagnostic = "Untimed single-pass actual-source guard diagnostic; synthetic keys are not production producers.",
    Framework = RuntimeInformation.FrameworkDescription,
    Architecture = RuntimeInformation.ProcessArchitecture.ToString(),
    CoreLib = typeof(object).Assembly.Location,
    RuntimeProductVersion = FileVersionInfo.GetVersionInfo(typeof(object).Assembly.Location).ProductVersion,
    ModuleVersionId = typeof(object).Module.ModuleVersionId,
}));

var referenceKeys = new AdaptiveCapacityDictionary<string, string>();
if (referenceKeys.ContainsKey("key") || !referenceKeys.TryAdd("key", "value"))
{
    throw new InvalidOperationException("Reference-key diagnostic failed.");
}

var valueKeys = new AdaptiveCapacityDictionary<int, string>();
if (valueKeys.ContainsKey(0) || !valueKeys.TryAdd(0, "zero"))
{
    throw new InvalidOperationException("Non-nullable value-key diagnostic failed.");
}

// Nullable keys deliberately exercise behavior outside the notnull annotation contract.
#pragma warning disable CS8714
var nullableKeys = new AdaptiveCapacityDictionary<int?, string>();
#pragma warning restore CS8714
if (nullableKeys.ContainsKey(0) || !nullableKeys.TryAdd(0, "present zero"))
{
    throw new InvalidOperationException("Present nullable-key diagnostic failed.");
}

try
{
    nullableKeys.ContainsKey(null);
    throw new InvalidOperationException("Empty nullable key was accepted.");
}
catch (ArgumentNullException exception) when (exception.ParamName is "key")
{
    Console.WriteLine("PASS empty nullable key rejected; normal runtime optimization/tiering settings unchanged.");
}

Console.WriteLine("PASS reference, int, and nullable-int source methods executed once without counters, warmup, or timing.");
