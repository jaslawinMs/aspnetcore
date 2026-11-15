using System.Reflection.Metadata;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
if (args[0] == "pdb")
{
    using var stream = File.OpenRead(args[1]);
    using var provider = MetadataReaderProvider.FromPortablePdbStream(stream);
    var reader = provider.GetMetadataReader();
    var documents = reader.Documents.Select(handle => reader.GetDocument(handle))
        .Where(document => reader.GetString(document.Name).EndsWith(args[2], StringComparison.Ordinal)).ToArray();
    if (documents.Length != 1)
    {
        throw new InvalidOperationException("Expected one exact portable-PDB source document.");
    }
    var document = documents[0];
    var actual = Convert.ToHexString(reader.GetBlobBytes(document.Hash));
    var expected = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(args[3])));
    if (reader.GetGuid(document.HashAlgorithm) != new Guid("8829d00f-11b8-4213-878b-770e8597ac16")
        || actual != expected)
    {
        throw new InvalidOperationException("Actual PDB document differs from the source snapshot.");
    }
    Console.WriteLine(JsonSerializer.Serialize(new
    {
        document = reader.GetString(document.Name),
        actual_pdb_document_sha256 = actual,
        source_sha256 = expected,
        verified = true
    }, jsonOptions));
    return;
}
if (args[0] != "self")
{
    throw new ArgumentException("Expected self or pdb mode.");
}

string[] values =
[
    "application/json", "APPLICATION/JSON", " application / json ", "a/b", "a/b+",
    "a/+b", "a/b+*", "a/*+*", "*/*", "application/vnd.example+json",
    "application/json; version=1", "application/json;version=1;version=2",
    "application/json; x=\"\"", "application/json; x=\"a;b\"", "application/json; x=a; x=A",
    "application/json; x=", "application/json; x=\"unterminated", "application/json;",
    "application/json; *", "application/json; q=0.4; version=2",
    "application/json; version=2; q=0.4; version=3",
    "application", "application/", "/json", " ", "application/\u00e4"
];
var records = values.Select((value, index) =>
{
    var parsed = new MediaType(value);
    var options = new MvcOptions();
    options.FormatterMappings.SetMediaTypeMappingForFormat("mapped", new RawMappingHeader(value));
    var produces = new ProducesAttribute(typeof(object));
    produces.ContentTypes.Add(new string(value.AsSpan()));
    var route = new RouteData();
    route.Values["format"] = "mapped";
    var context = new ResourceExecutingContext(
        new ActionContext(new DefaultHttpContext(), route, new ActionDescriptor()),
        [produces], new List<IValueProviderFactory>());
    new FormatFilter(Options.Create(options), NullLoggerFactory.Instance).OnResourceExecuting(context);
    return new
    {
        name = $"Raw{index:D2}",
        raw = value,
        parsed_type_has_value = parsed.Type.HasValue,
        parsed_subtype_has_value = parsed.SubType.HasValue,
        actual_self_subset = parsed.IsSubsetOf(parsed),
        actual_resource_result_type = context.Result?.GetType().Name,
        same_reference_alias = ReferenceEquals(
            options.FormatterMappings.GetMediaTypeMappingForFormat("mapped"), produces.ContentTypes[0]),
        producer = "public FormatterMappings with an overriding HeaderValue plus ordinary mutable ProducesAttribute"
    };
}).ToArray();
Console.WriteLine(JsonSerializer.Serialize(new
{
    owner_sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(FormatFilter).Assembly.Location))),
    diagnostic_not_timed = true,
    records
}, jsonOptions));

sealed class RawMappingHeader(string value) : MediaTypeHeaderValue("application/json")
{
    public override string ToString()
    {
        return value;
    }
}
