using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Build.Framework;
using Microsoft.Build.Logging;

if (args.Length != 2)
{
    throw new ArgumentException("Actual binlog and new output JSON required.");
}
var records = new List<object>();
var targets = new List<string>();
var tasks = new List<string>();
var failures = new List<string>();
bool Selected(string name) => name.Contains("Validat", StringComparison.OrdinalIgnoreCase)
    || name.Contains("ApiCompat", StringComparison.OrdinalIgnoreCase);
var replay = new BinaryLogReplayEventSource();
replay.AnyEventRaised += (_, item) =>
{
    var context = item.BuildEventContext;
    var location = context is null ? "" : $"{context.ProjectContextId}/{context.TargetId}/{context.TaskId}";
    switch (item)
    {
        case TargetStartedEventArgs start when Selected(start.TargetName):
            targets.Add(start.TargetName);
            records.Add(new { kind = "target-started", name = start.TargetName, context = location });
            break;
        case TargetFinishedEventArgs finish when Selected(finish.TargetName):
            records.Add(new { kind = "target-finished", name = finish.TargetName, context = location, succeeded = finish.Succeeded });
            if (!finish.Succeeded)
            {
                failures.Add("target:" + finish.TargetName);
            }
            break;
        case TaskStartedEventArgs start when Selected(start.TaskName):
            tasks.Add(start.TaskName);
            records.Add(new { kind = "task-started", name = start.TaskName, context = location });
            break;
        case TaskFinishedEventArgs finish when Selected(finish.TaskName):
            records.Add(new { kind = "task-finished", name = finish.TaskName, context = location, succeeded = finish.Succeeded });
            if (!finish.Succeeded)
            {
                failures.Add("task:" + finish.TaskName);
            }
            break;
        default:
            if (item.Message is not null && Selected(item.Message) &&
                (item.Message.Contains("skipp", StringComparison.OrdinalIgnoreCase) || item.GetType().Name.Contains("Skipped", StringComparison.Ordinal)))
            {
                records.Add(new { kind = item.GetType().Name, message = item.Message, context = location });
            }
            break;
    }
};
replay.Replay(args[0]);
var packageTasks = tasks.Where(name => name.Contains("Package", StringComparison.OrdinalIgnoreCase) || name.Contains("ApiCompat", StringComparison.OrdinalIgnoreCase)).ToArray();
var passed = packageTasks.Length > 0 && failures.Count == 0;
var bytes = File.ReadAllBytes(args[0]);
File.WriteAllText(args[1], JsonSerializer.Serialize(new
{
    candidate = "F010", actualBinlogSha256 = Convert.ToHexString(SHA256.HashData(bytes)), actualReaderAssembly = typeof(BinaryLogReplayEventSource).Assembly.Location,
    actualReaderAssemblySha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(BinaryLogReplayEventSource).Assembly.Location))),
    actualSelectedTargetsStarted = targets, actualSelectedTasksStarted = tasks, actualPackageValidationTasksStarted = packageTasks,
    allSelectedTasksAndTargetsSucceeded = failures.Count == 0, proofPassed = passed, records,
    boundary = "Read-only native MSBuild BinaryLogReplayEventSource of actual candidate pack execution;not string-presence inference. Repository nonservicing package baseline validation remains disabled by existing defaults."
}, new JsonSerializerOptions { WriteIndented = true }));
Console.WriteLine($"F010 actual pack replay:package-validation task starts={string.Join(",", packageTasks)};selected failures={failures.Count};proof={passed}.");
if (!passed)
{
    throw new InvalidOperationException("Actual successful package-validation task events required.");
}
