using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

[MemoryDiagnoser]
public class FormFileCollectionBenchmark
{
    private const string Boundary = "AutoPerfF107";
    private const string Payload = "file-payload";
    private IFormFileCollection _files = null!;
    private IFormFile[] _expected = null!;
    private MemoryStream? _requestBody;
    private string _query = "upload";
    private bool _singleFileControl;

    public static IEnumerable<string> Cases =>
    [
        "Empty", "Miss_1", "Miss_16", "Miss_128", "Miss_1024",
        "Hit_1", "First_16", "Last_16", "Mixed_16", "Mixed_128",
        "All_16", "All_128", "All_1024", "EmptyName", "OrdinalMiss",
        "Parsed_Empty", "Parsed_Miss_1", "Parsed_Miss_16", "Parsed_Hit_1",
        "Parsed_Mixed_16", "Parsed_All_16",
        "Control_GetFile_First_16", "Control_GetFile_Miss_16",
    ];

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = null!;

    [GlobalSetup]
    public void Setup()
    {
        var parsed = Case.StartsWith("Parsed_", StringComparison.Ordinal);
        _singleFileControl = Case.StartsWith("Control_", StringComparison.Ordinal);
        var scenario = parsed ? Case["Parsed_".Length..] : Case;
        var (count, kind) = scenario switch
        {
            "Empty" => (0, "none"),
            "Miss_1" => (1, "none"),
            "Miss_16" => (16, "none"),
            "Miss_128" => (128, "none"),
            "Miss_1024" => (1024, "none"),
            "Hit_1" => (1, "all"),
            "First_16" or "Control_GetFile_First_16" => (16, "first"),
            "Last_16" => (16, "last"),
            "Mixed_16" => (16, "mixed"),
            "Mixed_128" => (128, "mixed"),
            "All_16" => (16, "all"),
            "All_128" => (128, "all"),
            "All_1024" => (1024, "all"),
            "EmptyName" => (16, "empty"),
            "OrdinalMiss" => (16, "ordinal"),
            "Control_GetFile_Miss_16" => (16, "none"),
            _ => throw new InvalidOperationException($"Unknown scenario: {Case}"),
        };
        _query = kind switch { "empty" => "", "ordinal" => "SS", _ => "upload" };
        var names = new string[count];
        var matchingIndices = new List<int>();
        for (var i = 0; i < count; i++)
        {
            var matches = kind switch
            {
                "all" => true,
                "first" => i == 0,
                "last" => i == count - 1,
                "mixed" => i % 3 == 0,
                "empty" => i == count - 1,
                _ => false,
            };
            names[i] = matches
                ? (kind == "empty" ? "" : (i % 2 == 0 ? "upload" : "UPLOAD"))
                : (kind == "ordinal" ? "\u00df" : "other");
            if (matches)
            {
                matchingIndices.Add(i);
            }
        }

        if (parsed)
        {
            var content = new StringBuilder();
            content.Append($"--{Boundary}\r\nContent-Disposition: form-data; name=\"description\"\r\n\r\nparsed-field\r\n");
            for (var i = 0; i < count; i++)
            {
                content.Append($"--{Boundary}\r\nContent-Disposition: form-data; name=\"{names[i]}\"; filename=\"file-{i}.txt\"\r\nContent-Type: text/plain\r\n\r\n{Payload}\r\n");
            }
            content.Append($"--{Boundary}--\r\n");
            _requestBody = new MemoryStream(Encoding.UTF8.GetBytes(content.ToString()));
            var context = new DefaultHttpContext();
            context.Request.ContentType = $"multipart/form-data; boundary={Boundary}";
            context.Request.Body = _requestBody;
            context.Features.Set<IFormFeature>(new FormFeature(context.Request, new FormOptions { BufferBody = true }));
            var form = context.Request.ReadFormAsync().GetAwaiter().GetResult();
            if (form["description"].ToString() != "parsed-field" || form.Files.Count != count ||
                !ReferenceEquals(form, context.Request.ReadFormAsync().GetAwaiter().GetResult()) ||
                _requestBody.Position != 0)
            {
                throw new InvalidOperationException($"Multipart producer/caching mismatch: {Case}");
            }
            _files = form.Files;
            for (var i = 0; i < count; i++)
            {
                var file = _files[i];
                using var body = file.OpenReadStream();
                using var reader = new StreamReader(body);
                if (file.Name != names[i] || file.FileName != $"file-{i}.txt" ||
                    file.Length != Encoding.UTF8.GetByteCount(Payload) ||
                    file.ContentType != "text/plain" || reader.ReadToEnd() != Payload)
                {
                    throw new InvalidOperationException($"Complete multipart file mismatch: {Case}, {i}");
                }
            }
        }
        else
        {
            var files = new FormFileCollection();
            for (var i = 0; i < count; i++)
            {
                files.Add(new FormFile(Stream.Null, 0, 0, names[i], $"file-{i}.txt"));
            }
            _files = files;
        }

        _expected = matchingIndices.Select(index => _files[index]).ToArray();
        ValidateResult(Query());
        ValidateResult(Query());
        if (_files.Count != count)
        {
            throw new InvalidOperationException($"Query changed source collection: {Case}");
        }
        for (var i = 0; i < count; i++)
        {
            if (_files[i].Name != names[i])
            {
                throw new InvalidOperationException($"Query changed file identity/name: {Case}, {i}");
            }
        }
        Console.WriteLine("Verified " + JsonSerializer.Serialize(new
        {
            scenario = Case,
            producer = parsed ? "Request.ReadFormAsync/FormFeature" : "FormFileCollection/FormFile",
            source_count = count,
            query = _query,
            single_file_control = _singleFileControl,
            expected_files = _expected.Select(file => new { file.Name, file.FileName, file.Length }).ToArray(),
            file_identity_and_order = true,
            full_parsed_file_content = parsed,
            source_unchanged = true,
        }));
    }

    [Benchmark]
    public object? Query()
    {
        return _singleFileControl ? _files.GetFile(_query) : _files.GetFiles(_query);
    }

    private void ValidateResult(object? result)
    {
        if (_singleFileControl)
        {
            var expected = _expected.Length == 0 ? null : _expected[0];
            if (!ReferenceEquals(expected, result))
            {
                throw new InvalidOperationException($"GetFile control output mismatch: {Case}");
            }
            return;
        }
        if (result is not IReadOnlyList<IFormFile> files || files.Count != _expected.Length)
        {
            throw new InvalidOperationException($"GetFiles count/type mismatch: {Case}");
        }
        for (var i = 0; i < files.Count; i++)
        {
            if (!ReferenceEquals(files[i], _expected[i]))
            {
                throw new InvalidOperationException($"GetFiles identity/order mismatch: {Case}, {i}");
            }
        }
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _requestBody?.Dispose();
    }
}
