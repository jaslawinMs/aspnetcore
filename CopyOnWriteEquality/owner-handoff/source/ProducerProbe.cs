using System.Diagnostics;
using System.Reflection;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace F151F152;

internal static class Program
{
    private static readonly List<object> Assertions = [];
    private static readonly List<object> Requests = [];
    private static Assembly Owner => typeof(MvcOptions).Assembly;
    private static Type ListDefinition => Owner.GetType("Microsoft.AspNetCore.Mvc.Infrastructure.CopyOnWriteList`1", throwOnError: true)!;

    public static async Task<int> RunAsync(string[] args)
    {
        var sourceRoot = args[0];
        var expectedOwner = args[1];
        var resultPath = args[2];
        object? association = null;
        string? failure = null;
        try
        {
            Equal("association.owner_sha256", Hash(expectedOwner), Hash(Owner.Location));
            Equal("runtime.exact_coreclr", "12.0.0-alpha.1.26557.102",
                FileVersionInfo.GetVersionInfo(typeof(object).Assembly.Location).ProductVersion!.Split('+')[0]);
            association = DescribeAssociation(sourceRoot, expectedOwner);
            await ExerciseMvcAsync(sourceRoot, enableActionInvokers: false);
            await ExerciseMvcAsync(sourceRoot, enableActionInvokers: true);
            ExerciseHelperOnly();
        }
        catch (Exception exception)
        {
            failure = exception.ToString();
        }

        var result = new
        {
            purpose = "Untimed producer and equality characterization; not a benchmark.",
            passed = failure is null,
            failure,
            runtime = new
            {
                requested_netcore = "12.0.0-alpha.1.26557.102",
                requested_aspnetcore = "12.0.0-alpha.1.26557.102",
                actual = RuntimeInformation.FrameworkDescription,
                corelib = typeof(object).Assembly.Location,
                corelib_product_version = FileVersionInfo.GetVersionInfo(typeof(object).Assembly.Location).ProductVersion,
                process_id = Environment.ProcessId
            },
            association,
            requests = Requests,
            assertions = Assertions
        };
        Directory.CreateDirectory(Path.GetDirectoryName(resultPath)!);
        File.WriteAllText(resultPath, JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
        Console.WriteLine(JsonSerializer.Serialize(new { result.passed, resultPath, assertion_count = Assertions.Count, request_count = Requests.Count, failure }));
        return failure is null ? 0 : 1;
    }

    private static async Task ExerciseMvcAsync(string sourceRoot, bool enableActionInvokers)
    {
        var mode = enableActionInvokers ? "action-invoker-provider" : "default-request-delegate";
        var first = new FactoryReference("first-object", "first-typed");
        IValueProviderFactory boxedFactory = new FactoryValue("boxed-object", "boxed-typed");
        var filter = new MembershipFilter(mode, first, boxedFactory);
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ApplicationName = typeof(ProbeController).Assembly.GetName().Name,
            ContentRootPath = sourceRoot,
            EnvironmentName = "Production"
        });
        builder.Logging.ClearProviders();
        builder.Services.AddControllers(options =>
        {
            options.EnableActionInvokers = enableActionInvokers;
            options.ValueProviderFactories.Clear();
            options.ValueProviderFactories.Add(first);
            options.ValueProviderFactories.Add(boxedFactory);
            options.Filters.Add(filter);
        }).AddApplicationPart(typeof(ProbeController).Assembly);
        await using var application = builder.Build();
        var options = application.Services.GetRequiredService<IOptions<MvcOptions>>().Value;
        filter.Options = options;
        var pipelineBuilder = new ApplicationBuilder(application.Services);
        pipelineBuilder.UseRouting();
        pipelineBuilder.Use(async (context, next) =>
        {
            var endpoint = context.GetEndpoint()!;
            Requests.Add(new
            {
                mode,
                endpoint = endpoint.DisplayName,
                endpoint_delegate_owner = endpoint.RequestDelegate!.Method.DeclaringType!.FullName,
                endpoint_delegate_method = endpoint.RequestDelegate.Method.Name
            });
            await next(context);
        });
        pipelineBuilder.UseEndpoints(endpoints => endpoints.MapControllers());
        var pipeline = pipelineBuilder.Build();
        for (var request = 0; request < 2; request++)
        {
            await using var scope = application.Services.CreateAsyncScope();
            var context = new DefaultHttpContext
            {
                RequestServices = scope.ServiceProvider
            };
            context.Request.Method = HttpMethods.Get;
            context.Request.Path = "/f151-f152/probe";
            await pipeline(context);
            Equal($"{mode}.request{request}.status", StatusCodes.Status200OK, context.Response.StatusCode);
        }

        Equal($"{mode}.filter_execution_count", 2, filter.ExecutionCount);
        Equal($"{mode}.options_count_after_requests", 2, options.ValueProviderFactories.Count);
        Same($"{mode}.options_first_unchanged", first, options.ValueProviderFactories[0]);
        Same($"{mode}.options_box_unchanged", boxedFactory, options.ValueProviderFactories[1]);
    }

    private sealed class MembershipFilter(string mode, FactoryReference first, IValueProviderFactory boxedFactory) : IResourceFilter
    {
        public MvcOptions Options { get; set; } = null!;
        public int ExecutionCount { get; private set; }

        public void OnResourceExecuting(ResourceExecutingContext context)
        {
            var prefix = $"{mode}.request{ExecutionCount++}";
            var list = context.ValueProviderFactories;
            Equal($"{prefix}.real_owner", Owner, list.GetType().Assembly);
            Equal($"{prefix}.actual_generic_definition", ListDefinition, list.GetType().GetGenericTypeDefinition());
            Equal($"{prefix}.generic_argument", typeof(IValueProviderFactory), list.GetType().GetGenericArguments()[0]);
            Equal($"{prefix}.generic_argument_is_value_type", false, list.GetType().GetGenericArguments()[0].IsValueType);
            Equal($"{prefix}.fresh_request_count", 2, list.Count);
            Equal($"{prefix}.readonly_copy_absent", true, Copy(list) is null);
            Same($"{prefix}.configured_box_is_same_reference", boxedFactory, list[1]);

            var objectEqual = new FactoryReference(first.ObjectKey, "different-typed");
            var typedEqualOnly = new FactoryReference("different-object", first.TypedKey);
            Equal($"{prefix}.concrete_typed_comparer_differs", false, EqualityComparer<FactoryReference>.Default.Equals(first, objectEqual));
            Equal($"{prefix}.interface_comparer_uses_object", true, EqualityComparer<IValueProviderFactory>.Default.Equals(first, objectEqual));
            CheckMembership(prefix + ".readonly", list, objectEqual, typedEqualOnly);
            Equal($"{prefix}.reads_did_not_copy", true, Copy(list) is null);

            var extra = new FactoryReference("extra-object", "extra-typed");
            list.Add(extra);
            Equal($"{prefix}.mutation_made_list_copy", true, Copy(list) is List<IValueProviderFactory>);
            Same($"{prefix}.copy_retains_existing_box_reference", boxedFactory, list[1]);
            CheckMembership(prefix + ".copied", list, objectEqual, typedEqualOnly);
            Equal($"{prefix}.copied_extra_contains", true, list.Contains(extra));
            Equal($"{prefix}.copied_extra_index", 2, list.IndexOf(extra));
            list.RemoveAt(0);
            Equal($"{prefix}.removed_object_contains", false, list.Contains(objectEqual));
            Equal($"{prefix}.removed_object_index", -1, list.IndexOf(objectEqual));
            Equal($"{prefix}.request_mutation_not_options_mutation", 2, Options.ValueProviderFactories.Count);
            Same($"{prefix}.option_first_preserved", first, Options.ValueProviderFactories[0]);
            Same($"{prefix}.option_box_preserved", boxedFactory, Options.ValueProviderFactories[1]);
            context.Result = new EmptyResult();
        }

        public void OnResourceExecuted(ResourceExecutedContext context)
        {
        }

        private static void CheckMembership(string prefix, IList<IValueProviderFactory> list, IValueProviderFactory objectEqual, IValueProviderFactory typedEqualOnly)
        {
            Equal($"{prefix}.Contains_object_equal", true, list.Contains(objectEqual));
            Equal($"{prefix}.IndexOf_object_equal", 0, list.IndexOf(objectEqual));
            Equal($"{prefix}.Contains_typed_equal_only", false, list.Contains(typedEqualOnly));
            Equal($"{prefix}.IndexOf_typed_equal_only", -1, list.IndexOf(typedEqualOnly));
            IValueProviderFactory equalBox = new FactoryValue("boxed-object", "different-typed");
            Equal($"{prefix}.Contains_boxed_interface_factory", true, list.Contains(equalBox));
            Equal($"{prefix}.IndexOf_boxed_interface_factory", 1, list.IndexOf(equalBox));
        }
    }

    private static void ExerciseHelperOnly()
    {
        ExerciseDivergence(
            "helper-only.struct",
            new FactoryValue("same-object", "same-typed"),
            new FactoryValue("other-object", "same-typed"),
            new FactoryValue("same-object", "other-typed"));
        ExerciseDivergence(
            "helper-only.reference",
            new FactoryReference("same-object", "same-typed"),
            new FactoryReference("other-object", "same-typed"),
            new FactoryReference("same-object", "other-typed"));
    }

    private static void ExerciseDivergence<T>(string prefix, T stored, T typedEqualOnly, T objectEqualOnly)
    {
        var source = new[] { stored };
        var list = (IList<T>)Activator.CreateInstance(ListDefinition.MakeGenericType(typeof(T)), [source])!;
        Equal($"{prefix}.object_equality_rejects_typed_equal", false, object.Equals(stored, typedEqualOnly));
        Equal($"{prefix}.proposed_comparer_accepts_typed_equal", true, EqualityComparer<T>.Default.Equals(stored, typedEqualOnly));
        Equal($"{prefix}.object_equality_accepts_object_equal", true, object.Equals(stored, objectEqualOnly));
        Equal($"{prefix}.proposed_comparer_rejects_object_equal", false, EqualityComparer<T>.Default.Equals(stored, objectEqualOnly));
        foreach (var copied in new[] { false, true })
        {
            if (copied)
            {
                list[0] = stored;
            }

            Equal($"{prefix}.copied{copied}.branch_reached", copied, Copy(list) is not null);
            Equal($"{prefix}.copied{copied}.Contains_typed_equal", false, list.Contains(typedEqualOnly));
            Equal($"{prefix}.copied{copied}.IndexOf_typed_equal", -1, list.IndexOf(typedEqualOnly));
            Equal($"{prefix}.copied{copied}.Contains_object_equal", true, list.Contains(objectEqualOnly));
            Equal($"{prefix}.copied{copied}.IndexOf_object_equal", 0, list.IndexOf(objectEqualOnly));
        }

        Equal($"{prefix}.Remove_existing_List_default_comparer", true, list.Remove(typedEqualOnly));
        Equal($"{prefix}.Remove_copy_count", 0, list.Count);
        Equal($"{prefix}.source_count_unchanged", 1, source.Length);
        Equal($"{prefix}.source_item_unchanged", true, object.Equals(stored, source[0]));
    }

    private static object? Copy<T>(IList<T> list)
    {
        return list.GetType().GetField("_copy", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(list);
    }

    private static object DescribeAssociation(string sourceRoot, string expectedOwner)
    {
        using var peStream = File.OpenRead(Owner.Location);
        using var pe = new PEReader(peStream);
        var codeView = pe.ReadCodeViewDebugDirectoryData(pe.ReadDebugDirectory().Single(entry => entry.Type is DebugDirectoryEntryType.CodeView));
        var pdbPath = Path.ChangeExtension(expectedOwner, ".pdb");
        using var pdbStream = File.OpenRead(pdbPath);
        using var provider = MetadataReaderProvider.FromPortablePdbStream(pdbStream);
        var reader = provider.GetMetadataReader();
        var pdbId = new BlobContentId(reader.DebugMetadataHeader!.Id);
        Equal("association.PE_PDB_guid", codeView.Guid, pdbId.Guid);
        string[] selected =
        [
            "src\\Mvc\\Mvc.Core\\src\\Infrastructure\\CopyOnWriteList.cs",
            "src\\Mvc\\Mvc.Core\\src\\Infrastructure\\ControllerActionInvokerProvider.cs",
            "src\\Mvc\\Mvc.Core\\src\\Routing\\ControllerRequestDelegateFactory.cs",
            "src\\Mvc\\Mvc.Core\\src\\Infrastructure\\ResourceInvoker.cs"
        ];
        var documents = new List<object>();
        foreach (var relativePath in selected)
        {
            var document = reader.Documents.Select(handle => reader.GetDocument(handle))
                .Single(document => reader.GetString(document.Name).Replace('/', '\\').EndsWith("\\" + relativePath, StringComparison.OrdinalIgnoreCase));
            var sourcePath = Path.Combine(sourceRoot, relativePath);
            var algorithm = reader.GetGuid(document.HashAlgorithm);
            Equal($"association.{relativePath}.hash_algorithm", new Guid("8829d00f-11b8-4213-878b-770e8597ac16"), algorithm);
            var pdbHash = Convert.ToHexString(reader.GetBlobBytes(document.Hash));
            Equal($"association.{relativePath}.physical_source_hash", Hash(sourcePath), pdbHash);
            documents.Add(new { sourcePath, pdb_document = reader.GetString(document.Name), sha256 = pdbHash });
        }

        return new
        {
            loaded_owner = Owner.Location,
            expected_owner = expectedOwner,
            owner_sha256 = Hash(expectedOwner),
            module_id = Owner.ManifestModule.ModuleVersionId,
            pdb_path = pdbPath,
            pdb_sha256 = Hash(pdbPath),
            codeview_guid = codeView.Guid,
            codeview_path = codeView.Path,
            pdb_guid = pdbId.Guid,
            documents
        };
    }

    private static string Hash(string path)
    {
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(stream));
    }

    private static void Equal<T>(string id, T expected, T actual)
    {
        var passed = EqualityComparer<T>.Default.Equals(expected, actual);
        Assertions.Add(new { id, passed, expected = expected?.ToString(), actual = actual?.ToString() });
        if (!passed)
        {
            throw new InvalidOperationException($"{id}: expected {expected}, actual {actual}");
        }
    }

    private static void Same(string id, object expected, object actual)
    {
        Equal(id, true, ReferenceEquals(expected, actual));
    }
}

internal sealed class FactoryReference(string objectKey, string typedKey) : IValueProviderFactory, IEquatable<FactoryReference>
{
    public string ObjectKey { get; } = objectKey;
    public string TypedKey { get; } = typedKey;

    public Task CreateValueProviderAsync(ValueProviderFactoryContext context) => Task.CompletedTask;
    public bool Equals(FactoryReference? other) => other is not null && TypedKey == other.TypedKey;
    public override bool Equals(object? other) => other is FactoryReference factory && ObjectKey == factory.ObjectKey;
    public override int GetHashCode() => StringComparer.Ordinal.GetHashCode(ObjectKey);
}

internal readonly struct FactoryValue(string objectKey, string typedKey) : IValueProviderFactory, IEquatable<FactoryValue>
{
    public string ObjectKey { get; } = objectKey;
    public string TypedKey { get; } = typedKey;

    public Task CreateValueProviderAsync(ValueProviderFactoryContext context) => Task.CompletedTask;
    public bool Equals(FactoryValue other) => TypedKey == other.TypedKey;
    public override bool Equals(object? other) => other is FactoryValue factory && ObjectKey == factory.ObjectKey;
    public override int GetHashCode() => StringComparer.Ordinal.GetHashCode(ObjectKey);
}

/// <summary>Provides the real MVC-discovered action for the private untimed probe.</summary>
[Route("f151-f152")]
public sealed class ProbeController : ControllerBase
{
    /// <summary>Must be short-circuited by the resource filter.</summary>
    [HttpGet("probe")]
    public IActionResult Get()
    {
        throw new InvalidOperationException("The resource filter did not short-circuit the action.");
    }
}
