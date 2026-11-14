using System.Collections;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;

var snapshot = Path.GetFullPath(args.Single());
AssemblyLoadContext.Default.Resolving += (_, name) =>
{
    var path = Path.Combine(snapshot, name.Name + ".dll");

    return File.Exists(path) ? AssemblyLoadContext.Default.LoadFromAssemblyPath(path) : null;
};

var assembly = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(snapshot, "AutoPerf.Benchmarks.dll"));
var type = assembly.GetType("SelectMembershipBenchmark", throwOnError: true)!;
var benchmark = Activator.CreateInstance(type)!;
type.GetProperty("Case")!.SetValue(benchmark, "Indexer_64_32");
try
{
    type.GetMethod("Setup")!.Invoke(benchmark, null);
    var options = type.GetField("_options", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(benchmark)!;
    var optionInterface = options.GetType().GetInterfaces().Single(candidate =>
        candidate.IsGenericType && candidate.GetGenericTypeDefinition() == typeof(IList<>));
    var moq = AssemblyLoadContext.Default.LoadFromAssemblyPath(Path.Combine(snapshot, "Moq.dll"));
    var getMock = moq.GetType("Moq.Mock", throwOnError: true)!.GetMethods()
        .Single(method => method.Name == "Get" && method.IsGenericMethodDefinition && method.GetParameters().Length == 1)
        .MakeGenericMethod(optionInterface);
    var mock = getMock.Invoke(null, [options])!;
    var invocations = mock.GetType().GetProperty("Invocations")!.GetValue(mock)!;
    var fields = invocations.GetType().GetFields(BindingFlags.Instance | BindingFlags.NonPublic);
    var arrays = fields.Where(field => field.FieldType.IsArray).ToArray();
    if (arrays.Length != 1)
    {
        throw new InvalidOperationException("Expected one concrete invocation-storage array; do not infer a capacity.");
    }

    var countProperty = invocations.GetType().GetProperty("Count")!;
    var render = type.GetMethod("RenderSelect")!;
    var expected = (string)type.GetProperty("VerifiedHtml")!.GetValue(benchmark)!;
    var initialCount = (int)countProperty.GetValue(invocations)!;
    var previousCount = initialCount;
    var growths = 0;
    for (var iteration = 0; iteration < 65; iteration++)
    {
        var beforeArray = (Array)arrays[0].GetValue(invocations)!;
        var beforeCapacity = beforeArray.Length;
        if (iteration != 0)
        {
            var html = (string)render.Invoke(benchmark, null)!;
            if (!string.Equals(expected, html, StringComparison.Ordinal))
            {
                throw new InvalidOperationException("The actual public render changed its complete HTML.");
            }
        }

        var count = (int)countProperty.GetValue(invocations)!;
        var capacity = ((Array)arrays[0].GetValue(invocations)!).Length;
        if (iteration != 0 && count <= previousCount)
        {
            throw new InvalidOperationException("No retained invocation growth was observed.");
        }

        growths += capacity != beforeCapacity ? 1 : 0;
        if (iteration == 0 || capacity != beforeCapacity || iteration == 64)
        {
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                iteration,
                retained_invocations = count,
                prior_capacity = beforeCapacity,
                capacity,
                complete_html_unchanged = true
            }));
        }

        previousCount = count;
    }

    if (growths == 0)
    {
        throw new InvalidOperationException("No invocation-storage expansion was observed.");
    }

    Console.WriteLine(JsonSerializer.Serialize(new
    {
        diagnostic = "Untimed actual-render observation; not a fourth benchmark or a quantitative allocation attribution",
        initial_retained_invocations = initialCount,
        final_retained_invocations = previousCount,
        storage_expansions = growths
    }));
}
finally
{
    type.GetMethod("Cleanup")!.Invoke(benchmark, null);
}
