using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

var assembly = typeof(FormFileCollection).Assembly;
Console.WriteLine($"Http assembly: {assembly.Location}");
Console.WriteLine($"Http MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--verify-empty-convention"])
{
    var collection = new FormFileCollection();
    var first = collection.GetFiles("absent");
    var repeated = collection.GetFiles("absent");
    var another = new FormFileCollection().GetFiles("absent");
    if (first.Count != 0 || repeated.Count != 0 || another.Count != 0 || collection.Count != 0)
    {
        throw new InvalidOperationException("Empty result convention probe did not reach an empty result.");
    }
    Console.WriteLine(JsonSerializer.Serialize(new
    {
        declared_return = "IReadOnlyList<IFormFile>",
        runtime_type = first.GetType().FullName,
        repeated_identity_equal = ReferenceEquals(first, repeated),
        different_source_identity_equal = ReferenceEquals(first, another),
        collection_interface_available = first is ICollection<IFormFile>,
        collection_interface_is_read_only = first is ICollection<IFormFile> mutable && mutable.IsReadOnly,
        count = first.Count,
        source_count = collection.Count,
    }));
    return;
}
if (args is ["--verify-setups"])
{
    foreach (var scenario in FormFileCollectionBenchmark.Cases)
    {
        var benchmark = new FormFileCollectionBenchmark { Case = scenario };
        try
        {
            benchmark.Setup();
        }
        finally
        {
            benchmark.Cleanup();
        }
    }
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
