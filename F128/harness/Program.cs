using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Owin;

var assembly = typeof(WebSocketAcceptAdapter).Assembly;
Console.WriteLine($"Owin assembly: {assembly.Location}");
Console.WriteLine($"Owin MVID: {assembly.ManifestModule.ModuleVersionId}");
if (args is ["--verify-lowering"])
{
    var stateMachine = assembly.GetTypes().Single(type =>
        type.FullName!.StartsWith("Microsoft.AspNetCore.Owin.WebSocketAcceptAdapter+", StringComparison.Ordinal) &&
        type.Name.Contains("AdaptWebSockets", StringComparison.Ordinal) &&
        typeof(IAsyncStateMachine).IsAssignableFrom(type));
    var moveNext = stateMachine.GetMethod("MoveNext", BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
        ?? throw new InvalidOperationException("Missing actual adapter async state machine.");
    var bytes = moveNext.GetMethodBody()?.GetILAsByteArray()
        ?? throw new InvalidOperationException("Missing actual adapter IL.");
    Console.WriteLine(JsonSerializer.Serialize(new
    {
        type = stateMachine.FullName,
        method = moveNext.Name,
        metadata_token = moveNext.MetadataToken,
        il_bytes = bytes.Length,
        il_hex = Convert.ToHexString(bytes),
        native_work_or_jit_equivalence_claimed = false,
    }));
    return;
}
if (args is ["--verify-setups"])
{
    foreach (var scenario in WebSocketAcceptAdapterBenchmark.Cases)
    {
        var benchmark = new WebSocketAcceptAdapterBenchmark { Case = scenario };
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
