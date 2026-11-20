using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using AutoPerf.F142;

if (args.Length != 3)
{
    throw new ArgumentException("Expected role, immutable consumer inventory, and observation directory.");
}

var role = args[0];
var inventory = JsonSerializer.Deserialize<Inventory>(File.ReadAllText(args[1]))
    ?? throw new InvalidOperationException("The consumer inventory is empty.");
var output = Path.GetFullPath(args[2]);
if (Directory.Exists(output))
{
    throw new InvalidOperationException("Never overwrite an earlier observation directory.");
}
Directory.CreateDirectory(output);
var consumerRoot = AppContext.BaseDirectory;
foreach (var entry in inventory.Files)
{
    var file = Path.Combine(consumerRoot, entry.File);
    Require(File.Exists(file) && new FileInfo(file).Length == entry.Bytes, "Missing or length-mismatched consumer: " + entry.File);
    Require(Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(file))) == entry.Sha256, "Consumer hash mismatch: " + entry.File);
}
Require(Path.GetFileName(Path.GetDirectoryName(typeof(object).Assembly.Location)) == inventory.PlatformVersion, "The selected platform runtime differs from the frozen input.");
using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(90));
foreach (var profile in new[] { "Undocumented", "Zero", "One", "Four", "Aliased", "Ignored", "Body" })
{
    await using var fixture = await DocumentFixture.CreateAsync(profile, deadline.Token);
    var raw = await fixture.GenerateAsync().WaitAsync(deadline.Token);
    File.WriteAllText(Path.Combine(output, profile + ".json"), raw);
    using var document = JsonDocument.Parse(raw);
    var paths = document.RootElement.GetProperty("paths");
    Require(paths.EnumerateObject().Count() == 1, "The profile must produce exactly one real operation.");
    var route = "/" + profile.ToLowerInvariant();
    var operation = paths.GetProperty(route).GetProperty(profile == "Body" ? "post" : "get");
    var parameters = operation.TryGetProperty("parameters", out var items) ? items.EnumerateArray().ToArray() : [];
    var expectedCount = profile switch
    {
        "Undocumented" => 2,
        "Four" => 4,
        "One" or "Aliased" or "Ignored" => 1,
        _ => 0
    };
    Require(parameters.Length == expectedCount, "Real ApiExplorer parameter count mismatch: " + profile);
    if (profile == "Undocumented")
    {
        Require(!operation.TryGetProperty("summary", out _) && parameters.All(parameter => !parameter.TryGetProperty("description", out _)), "Undocumented metadata acquired XML text.");
    }
    else
    {
        Require(operation.GetProperty("summary").GetString() == "XML " + profile.ToLowerInvariant() + ".", "The real registered XML transformer did not apply the exact summary.");
    }

    var expected = profile switch
    {
        "One" => new[] { ("term", "XML one term.") },
        "Four" => [("term", "XML four term."), ("page", "XML four page."), ("pageSize", "XML four page size."), ("exact", "XML four exact.")],
        "Aliased" => [("search", "XML aliased search.")],
        "Ignored" => [("term", "XML ignored term.")],
        _ => []
    };
    foreach (var (name, description) in expected)
    {
        var matching = parameters.Where(parameter => parameter.GetProperty("name").GetString() == name).ToArray();
        Require(matching.Length == 1 && matching[0].GetProperty("description").GetString() == description, "Incorrect exact XML parameter result: " + profile + "/" + name);
    }
    if (profile == "Four")
    {
        Require(parameters.Single(parameter => parameter.GetProperty("name").GetString() == "page").GetProperty("example").GetInt32() == 2, "The integer example was not preserved.");
    }
    if (profile == "Body")
    {
        Require(operation.GetProperty("requestBody").GetProperty("description").GetString() == "XML body input.", "The actual body description was not applied.");
    }
    else
    {
        Require(!operation.TryGetProperty("requestBody", out _), "A non-body profile acquired a request body.");
    }
    Console.WriteLine(JsonSerializer.Serialize(new { role, profile, actualProducer = "source-generated AddOpenApi registration, real minimal endpoint/ApiExplorer, awaited actual IDocumentProvider serialization", expectedParameters = expectedCount, passed = true, timed = false }));
}
foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies().Where(assembly => !assembly.IsDynamic && assembly.Location.Length > 0).OrderBy(assembly => assembly.GetName().Name, StringComparer.Ordinal))
{
    var name = assembly.GetName().Name ?? throw new InvalidOperationException("Missing runtime assembly identity.");
    if (name.StartsWith("Microsoft.AspNetCore", StringComparison.Ordinal) || name.StartsWith("AutoPerf.F142", StringComparison.Ordinal))
    {
        Require(Path.GetFullPath(assembly.Location).StartsWith(Path.GetFullPath(consumerRoot), StringComparison.OrdinalIgnoreCase), "An ASP.NET or harness owner resolved outside the frozen consumer.");
        Console.WriteLine(JsonSerializer.Serialize(new { role, kind = "runtime-owner", name, assembly.Location, mvid = assembly.ManifestModule.ModuleVersionId, sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))) }));
    }
}

static void Require(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

internal sealed record Inventory(string PlatformVersion, InventoryFile[] Files);
internal sealed record InventoryFile(string File, long Bytes, string Sha256);
