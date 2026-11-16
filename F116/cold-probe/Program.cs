using System.Diagnostics;
using System.Linq.Expressions;
using System.Net;
using System.Reflection;
using System.Runtime.Loader;
using System.Security.Cryptography;
using System.Text.Json;

if (args.Length != 4)
{
    throw new ArgumentException("Expected exact frozen image,ports fixture,new output file,variant.");
}
var image = Path.GetFullPath(args[0]);
var output = Path.GetFullPath(args[2]);
var variant = args[3];
Require(variant is "original" or "candidate1", "Explicit actual variant required.");
AssemblyLoadContext.Default.Resolving += (context, name) =>
{
    var file = Path.Combine(image, name.Name + ".dll");

    return File.Exists(file) ? context.LoadFromAssemblyPath(file) : null;
};
var ports = JsonSerializer.Deserialize<int[]>(File.ReadAllText(args[1]))!;
var names = new[] { "Microsoft.AspNetCore.Server.Kestrel.Core", "Microsoft.AspNetCore.SignalR.Core", "Microsoft.AspNetCore.Http.Connections" };
var owners = names.Select(name => AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(image, name + ".dll"))).ToArray();
var helpers = owners.Select(owner => owner.GetType("Microsoft.AspNetCore.Shared.ConnectionEndpointTags", true)!).ToArray();
var fields = helpers.Select(type => type.GetFields(BindingFlags.Static | BindingFlags.NonPublic)
    .Where(field => field.FieldType == typeof(object)).OrderBy(field => field.Name, StringComparer.Ordinal).ToArray()).ToArray();
var writers = helpers.Select(type =>
{
    var method = type.GetMethods(BindingFlags.Public | BindingFlags.Static).Single(method =>
        method.Name == "AddConnectionEndpointTags" && method.GetParameters()[1].ParameterType.FullName == "Microsoft.AspNetCore.Connections.BaseConnectionContext")
        .MakeGenericMethod(typeof(TagList));
    var tags = Expression.Parameter(typeof(TagList).MakeByRefType());
    var context = Expression.Parameter(typeof(object));

    return Expression.Lambda<TagWriter>(Expression.Call(method, tags, Expression.Convert(context, method.GetParameters()[1].ParameterType)), tags, context).Compile();
}).ToArray();
var abstractions = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(image, "Microsoft.AspNetCore.Connections.Abstractions.dll"));
var contextType = abstractions.GetType("Microsoft.AspNetCore.Connections.DefaultConnectionContext", true)!;
object Context(int port)
{
    var context = contextType.GetConstructor([typeof(string)])!.Invoke(["F116-independent-cold-probe"]);
    contextType.GetProperty("LocalEndPoint")!.SetValue(context, new IPEndPoint(IPAddress.Loopback, port));

    return context;
}
OwnerSnapshot[] Snapshot() => owners.Select((owner, index) => new OwnerSnapshot(owner.GetName().Name!,
    fields[index].Select(field =>
    {
        var value = field.GetValue(null);

        return new Slot(field.Name, value is null ? null : (int)value, value?.GetType().FullName);
    }).ToArray())).ToArray();
var contexts = Enumerable.Range(0, 12).Select(index => Context(ports[index % 4])).ToArray();
var before = Snapshot();
Require(before.All(owner => owner.Slots.All(slot => slot.Value is null)), "Materialized actual before snapshot must contain only empty slots.");
using var gate = new Barrier(13);
var threads = new Thread[12];
var values = new int[12];
var initial = new object?[12];
var final = new object?[12];
var errors = new Exception?[12];
for (var index = 0; index < threads.Length; index++)
{
    var worker = index;
    threads[index] = new Thread(() =>
    {
        try
        {
            initial[worker] = Settings();
            Require(gate.SignalAndWait(TimeSpan.FromSeconds(60)), "Independent cold worker gate timed out.");
            var tags = new TagList();
            writers[0](ref tags, contexts[worker]);
            Require(tags.Count == 4 && tags[1].Key == "server.port" && tags[1].Value is int value && value == ports[worker % 4],
                "Actual independent cold producer returned wrong typed endpoint.");
            values[worker] = (int)tags[1].Value!;
            final[worker] = Settings();
            Require(JsonSerializer.Serialize(initial[worker]) == JsonSerializer.Serialize(final[worker]), "Independent worker settings changed.");
        }
        catch (Exception error)
        {
            errors[worker] = error;
        }
    }) { IsBackground = true, Name = "F116-independent-cold-" + index };
    threads[index].Start();
}
Require(gate.SignalAndWait(TimeSpan.FromSeconds(60)), "Independent cold controller gate timed out.");
foreach (var thread in threads)
{
    Require(thread.Join(TimeSpan.FromSeconds(60)), "Owned independent cold worker did not stop.");
}
if (errors.Any(error => error is not null))
{
    throw new AggregateException(errors.OfType<Exception>());
}
var cold = Snapshot();
for (var owner = 0; owner < owners.Length; owner++)
{
    foreach (var port in ports)
    {
        var context = Context(port);
        var tags = new TagList();
        writers[owner](ref tags, context);
        Require(tags[1].Value is int value && value == port, "Actual independent warm producer returned wrong port.");
        ((IAsyncDisposable)context).DisposeAsync().GetAwaiter().GetResult();
    }
}
var warm = Snapshot();
for (var owner = 0; owner < owners.Length; owner++)
{
    var expected = variant == "original" ? 1 : 2;
    Require(warm[owner].Slots.Length == expected && warm[owner].Slots.All(slot => slot.Value is not null && ports.Contains(slot.Value.Value)) &&
        warm[owner].Slots.Select(slot => slot.Value).Distinct().Count() == expected, "Materialized warmed slots must be distinct and bounded.");
    foreach (var slot in cold[owner].Slots.Where(slot => slot.Value is not null))
    {
        Require(warm[owner].Slots.Single(value => value.Name == slot.Name).Value == slot.Value, "A published cold slot changed during subsequent real producer calls.");
    }
}
foreach (var context in contexts)
{
    ((IAsyncDisposable)context).DisposeAsync().GetAwaiter().GetResult();
}
using var destination = new FileStream(output, FileMode.CreateNew);
JsonSerializer.Serialize(destination, new
{
    candidate = "F116", variant, processId = Environment.ProcessId, runtime = Environment.Version.ToString(),
    owners = owners.Select(owner => new { assembly = owner.GetName().Name, file = owner.Location, sha256 = Hash(owner.Location) }).ToArray(),
    probe = new { file = typeof(TagWriter).Assembly.Location, sha256 = Hash(typeof(TagWriter).Assembly.Location) },
    before, cold, warm, values, initialSettings = initial, finalSettings = final, controllerSettings = Settings(),
    snapshotsMaterializedAtCapture = true, shippingCacheFieldsWrittenByProbe = false, actualTimingRerun = false,
    limitation = "Independent cold-only diagnostic using exact measured owner images. No timing/allocation speedup inferred and no claim that12 workers explore all schedules."
}, new JsonSerializerOptions { WriteIndented = true });
Console.WriteLine("F116:independent materialized cold/before/warm snapshots,12 correct actual producer outputs,stable bounded publication verified.");

static void Require(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}
static string Hash(string file) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file)));
static object Settings()
{
    using var process = Process.GetCurrentProcess();

    return new { processPriority = process.PriorityClass.ToString(), threadPriority = Thread.CurrentThread.Priority.ToString(), affinity = process.ProcessorAffinity.ToInt64() };
}
internal delegate void TagWriter(ref TagList tags, object context);
internal sealed record Slot(string Name, int? Value, string? ValueType);
internal sealed record OwnerSnapshot(string Owner, Slot[] Slots);
