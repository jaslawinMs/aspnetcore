using System.Reflection;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Google.Protobuf.WellKnownTypes;

var assembly = Assembly.Load("Microsoft.AspNetCore.Grpc.JsonTranscoding");
Console.WriteLine($"Transcoding assembly: {assembly.Location}");
Console.WriteLine($"Transcoding MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--verify-setups"])
{
    foreach (var scenario in ListValueActivationBenchmark.Cases)
    {
        new ListValueActivationBenchmark { Case = scenario }.Setup();
    }
    return;
}
if (args is ["--inspect-activation"])
{
    var converter = assembly.GetType("Microsoft.AspNetCore.Grpc.JsonTranscoding.Internal.Json.ListValueConverter`1", throwOnError: true)!
        .MakeGenericType(typeof(ListValue));
    Console.WriteLine(JsonSerializer.Serialize(ActivationIL.Inspect(converter.GetMethod("Read")!),
        new JsonSerializerOptions { WriteIndented = true }));
    return;
}

BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
