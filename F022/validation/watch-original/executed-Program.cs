using System.Diagnostics;
using System.Linq.Expressions;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;

if (!OperatingSystem.IsWindows() && !OperatingSystem.IsLinux())
{
    throw new PlatformNotSupportedException("The read-only process-affinity observation requires Windows or Linux.");
}

var owner = typeof(ModelExpressionProvider).Assembly;
var helper = owner.GetType("Microsoft.AspNetCore.Mvc.ViewFeatures.ExpressionHelper", throwOnError: true)
    ?? throw new InvalidOperationException("The owning helper was not loaded.");
var classifierMethod = helper.GetMethod("IsSingleArgumentIndexer", BindingFlags.Public | BindingFlags.Static)
    ?? throw new InvalidOperationException("The real owning classifier was not found.");
var classify = classifierMethod.CreateDelegate<Func<Expression, bool>>();
var provider = new ModelExpressionProvider(new EmptyModelMetadataProvider());
Expression<Func<IndexerModel, string>> retainedExpression = model => model[7].Name;
if (retainedExpression.Body is not MemberExpression { Expression: MethodCallExpression indexer })
{
    throw new InvalidOperationException("The compiler did not produce the expected real indexer expression.");
}

using var process = Process.GetCurrentProcess();
Console.WriteLine(JsonSerializer.Serialize(new
{
    kind = "F022_PROCESS_START",
    processId = process.Id,
    ownerPath = owner.Location,
    ownerModule = owner.ManifestModule.ModuleVersionId,
    ownerSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(owner.Location))),
    runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
    priority = process.PriorityClass.ToString(),
    affinity = process.ProcessorAffinity.ToInt64(),
    threadPriority = Thread.CurrentThread.Priority.ToString(),
    retainedGetter = indexer.Method.Name,
}));

string? previous = null;
while (true)
{
    var state = JsonSerializer.Serialize(new
    {
        kind = "F022_STATE",
        processId = process.Id,
        defaultMember = typeof(IndexerModel).GetCustomAttribute<DefaultMemberAttribute>()?.MemberName,
        retainedGetter = indexer.Method.Name,
        classifiedAsIndexer = classify(indexer),
        expressionText = provider.GetExpressionText(retainedExpression),
    });
    if (!string.Equals(state, previous, StringComparison.Ordinal))
    {
        Console.WriteLine(state);
        previous = state;
    }

    await Task.Delay(100);
}
