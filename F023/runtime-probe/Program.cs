using System.Diagnostics;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;

const int Operations = 64;
var rows = new List<object>();
foreach (var name in new[] { "FreshLinkedSourceOnly", "FreshLinkedSourceInfinite", "FreshLinkedSourceFinite" })
{
    for (var index = 0; index < 4096; index++)
    {
        Exercise(name);
    }

    var before = GC.GetAllocatedBytesForCurrentThread();
    for (var index = 0; index < Operations; index++)
    {
        Exercise(name);
    }
    var allocated = GC.GetAllocatedBytesForCurrentThread() - before;
    rows.Add(new { name, operations = Operations, allocatedBytes = allocated, bytesPerOperation = allocated / (double)Operations });
}

var core = typeof(CancellationTokenSource).Assembly;
using var process = Process.GetCurrentProcess();
Console.WriteLine(JsonSerializer.Serialize(new
{
    role = "Untimed original-runtime resource characterization,not a public-session before/after comparison",
    actualRuntime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
    actualCoreLibrary = core.Location,
    actualCoreLibraryVersion = core.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
    actualCoreLibrarySha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(core.Location))),
    actualProcessPriority = process.PriorityClass.ToString(),
    actualAffinity = process.ProcessorAffinity.ToInt64(),
    settingsMutated = false,
    rows,
}, new JsonSerializerOptions { WriteIndented = true }));

static void Exercise(string name)
{
    using var source = CancellationTokenSource.CreateLinkedTokenSource(CancellationToken.None);
    if (name == "FreshLinkedSourceInfinite")
    {
        source.CancelAfter(Timeout.InfiniteTimeSpan);
    }
    else if (name == "FreshLinkedSourceFinite")
    {
        source.CancelAfter(TimeSpan.FromMinutes(1));
    }
    if (!source.Token.CanBeCanceled || source.Token.IsCancellationRequested)
    {
        throw new InvalidOperationException("The actual fresh owned token state differs.");
    }
}
