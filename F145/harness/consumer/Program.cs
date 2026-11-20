using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;

if (args.Length != 3 || args[0] is not ("--verify-only" or "--measure-once"))
{
    throw new ArgumentException("Invocation: --verify-only|--measure-once primary|control http://127.0.0.1:PORT");
}

var (route, expectedLength) = args[1] switch
{
    "primary" => ("/LargeResponseFile", 200000000),
    "control" => ("/LargeResponseBody?length=65000", 65000),
    _ => throw new ArgumentException("The primary and control cannot be replaced.")
};
using var client = new HttpClient
{
    Timeout = TimeSpan.FromSeconds(180)
};
var uri = new Uri(new Uri(args[2]), route);
if (args[0] == "--verify-only")
{
    var verifiedBody = await client.GetStringAsync(uri);
    if (verifiedBody.Length != expectedLength)
    {
        throw new InvalidOperationException($"Expected {expectedLength} characters; received {verifiedBody.Length}.");
    }
    if (verifiedBody.AsSpan().IndexOfAnyExcept('a') >= 0)
    {
        throw new InvalidOperationException("The response contained a character other than the fixed ASCII input.");
    }
    Console.WriteLine(JsonSerializer.Serialize(new
    {
        mode = "verify-only",
        role = args[1],
        uri,
        bodyLength = verifiedBody.Length,
        allCharactersExpected = true,
        processId = Environment.ProcessId,
        runtime = RuntimeInformation.FrameworkDescription,
        coreLibrary = typeof(object).Assembly.Location,
        consumerAssembly = Assembly.GetExecutingAssembly().Location,
        consumerMvid = Assembly.GetExecutingAssembly().ManifestModule.ModuleVersionId
    }));

    return 0;
}

var stopwatch = Stopwatch.StartNew();
var body = await client.GetStringAsync(uri);
if (body.Length != expectedLength)
{
    throw new InvalidOperationException($"Expected {expectedLength} characters; received {body.Length}.");
}
stopwatch.Stop();
Console.WriteLine(JsonSerializer.Serialize(new
{
    role = args[1],
    uri,
    bodyLength = body.Length,
    elapsedTicks = stopwatch.ElapsedTicks,
    ticksPerSecond = Stopwatch.Frequency,
    processId = Environment.ProcessId
}));

return 0;
