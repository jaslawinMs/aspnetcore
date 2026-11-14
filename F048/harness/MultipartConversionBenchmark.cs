using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.WebUtilities;

namespace AutoPerf;

public class MultipartConversionBenchmark
{
    private MultipartWorkload _workload = null!;

    public IEnumerable<string> Cases => MultipartWorkload.Definitions
        .Where(definition => definition.Operation is Operation.FileConversion or Operation.FormConversion or Operation.HeaderParsing)
        .Select(definition => definition.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public async Task Setup()
    {
        _workload = new MultipartWorkload(Case);
        await _workload.InitializeAsync();
        await _workload.VerifyAsync();
    }

    [Benchmark]
    public int Convert()
    {
        return _workload.Convert();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _workload.Dispose();
    }
}

public class MultipartReaderConversionBenchmark
{
    private MultipartWorkload _workload = null!;

    public IEnumerable<string> Cases => MultipartWorkload.Definitions
        .Where(definition => definition.Operation is Operation.FileReader or Operation.FormReader or Operation.ReaderOnly)
        .Select(definition => definition.Name);

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    [GlobalSetup]
    public async Task Setup()
    {
        _workload = new MultipartWorkload(Case);
        await _workload.InitializeAsync();
        await _workload.VerifyAsync();
    }

    [Benchmark]
    public Task<int> Read()
    {
        return _workload.ReadAsync();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _workload.Dispose();
    }
}

public enum Operation
{
    FileConversion,
    FormConversion,
    HeaderParsing,
    FileReader,
    FormReader,
    ReaderOnly
}

public record CaseDefinition(string Name, Operation Operation, string?[] Dispositions, int PayloadLength = 32);
public record SectionReceipt(string? Disposition, string? FileField, string? FileName, string? FormField,
    bool? SectionIdentity, bool? StreamIdentity, long? StreamOffset, int BodyBytes, string BodySha256);
public record CaseReceipt(string Name, string Kind, string InputSha256, SectionReceipt[] Sections, int Checksum);

public sealed class MultipartWorkload : IDisposable
{
    private const string Boundary = "F048Boundary";
    private const string Form = "form-data; name=note";
    private const string File = "form-data; name=upload; filename=plain.txt";
    private const string Star = "form-data; name=upload; filename*=UTF-8''%E2%82%AC.txt";
    private const string EmptyStarFile = "form-data; name=upload; filename=plain.txt; filename*=UTF-8''";
    private readonly CaseDefinition _definition;
    private readonly byte[][] _payloads;
    private readonly byte[] _wire;
    private MemoryStream? _conversionInput;
    private MultipartSection _section = null!;

    public static CaseDefinition[] Definitions { get; } =
    [
        new("Convert_Form", Operation.FileConversion, [Form]),
        new("Convert_Missing", Operation.FileConversion, [null]),
        new("Convert_Malformed", Operation.FileConversion, ["@"]),
        new("Convert_Uppercase", Operation.FileConversion, ["FORM-DATA; name=upload; filename=file.txt"]),
        new("Convert_Attachment", Operation.FileConversion, ["attachment; filename=file.txt"]),
        new("Convert_Inline", Operation.FileConversion, ["inline; filename=file.txt"]),
        new("Convert_OtherParameter", Operation.FileConversion, ["form-data; name=note; other=filename"]),
        new("Convert_EmptyFilename", Operation.FileConversion, ["form-data; name=upload; filename=\"\""]),
        new("Convert_EmptyStar", Operation.FileConversion, ["form-data; name=upload; filename*=UTF-8''"]),
        new("Convert_FilePlain", Operation.FileConversion, [File]),
        new("Convert_FileQuoted", Operation.FileConversion, ["form-data; name=\"up load\"; filename=\"file name.txt\""]),
        new("Convert_FileNoName", Operation.FileConversion, ["form-data; filename=plain.txt"]),
        new("Convert_FileStar", Operation.FileConversion, [Star]),
        new("Convert_FileStarPreferred", Operation.FileConversion, ["form-data; name=upload; filename=plain.txt; filename*=UTF-8''preferred.txt"]),
        new("Convert_FileEmptyStar", Operation.FileConversion, [EmptyStarFile]),
        new("Read_Form_1", Operation.FileReader, [Form]),
        new("Read_Form_8", Operation.FileReader, Repeat(Form, 8)),
        new("Read_Form_32", Operation.FileReader, Repeat(Form, 32)),
        new("Read_Missing_1", Operation.FileReader, [null]),
        new("Read_Malformed_1", Operation.FileReader, ["@"]),
        new("Read_Uppercase_1", Operation.FileReader, ["FORM-DATA; name=upload; filename=file.txt"]),
        new("Read_FilePlain_1", Operation.FileReader, [File]),
        new("Read_FileStar_1", Operation.FileReader, [Star]),
        new("Read_Files_8", Operation.FileReader, Repeat(File, 8)),
        new("Read_Mixed_2", Operation.FileReader, [Form, File]),
        new("Read_Mixed_8", Operation.FileReader, RepeatMixed(8)),
        new("Read_MixedLarge_8", Operation.FileReader, RepeatMixed(8), 4096),
        new("Control_FormConverter", Operation.FormConversion, [Form]),
        new("Control_HeaderParser", Operation.HeaderParsing, [Form]),
        new("Control_FormReader_8", Operation.FormReader, Repeat(Form, 8)),
        new("Control_ReaderOnly_8", Operation.ReaderOnly, RepeatMixed(8))
    ];

    public MultipartWorkload(string name)
    {
        _definition = Definitions.Single(definition => definition.Name == name);
        _payloads = Enumerable.Range(0, _definition.Dispositions.Length)
            .Select(index => Encoding.ASCII.GetBytes($"section-{index}:" + new string('p', _definition.PayloadLength))).ToArray();
        var builder = new StringBuilder();
        for (var index = 0; index < _definition.Dispositions.Length; index++)
        {
            builder.Append("--").Append(Boundary).Append("\r\n");
            if (_definition.Dispositions[index] is { } disposition)
            {
                builder.Append("Content-Disposition: ").Append(disposition).Append("\r\n");
            }
            builder.Append("Content-Type: text/plain\r\n\r\n").Append(Encoding.ASCII.GetString(_payloads[index])).Append("\r\n");
        }
        builder.Append("--").Append(Boundary).Append("--\r\n");
        _wire = Encoding.ASCII.GetBytes(builder.ToString());
    }

    public async Task InitializeAsync()
    {
        _conversionInput = new MemoryStream(_wire, writable: false);
        var reader = new MultipartReader(Boundary, _conversionInput);
        _section = await reader.ReadNextSectionAsync() ?? throw new InvalidOperationException("Actual producer emitted no section.");
    }

    public int Convert()
    {
        return _definition.Operation switch
        {
            Operation.FileConversion => FileValue(_section.AsFileSection()),
            Operation.FormConversion => FormValue(_section.AsFormDataSection()),
            Operation.HeaderParsing => _section.GetContentDispositionHeader()?.DispositionType.Length ?? 0,
            _ => throw new InvalidOperationException("This is not a conversion workload.")
        };
    }

    public async Task<int> ReadAsync()
    {
        using var input = new MemoryStream(_wire, writable: false);
        var reader = new MultipartReader(Boundary, input);
        var checksum = 0;
        while (await reader.ReadNextSectionAsync() is { } section)
        {
            checksum += 1 + (_definition.Operation switch
            {
                Operation.FileReader => FileValue(section.AsFileSection()),
                Operation.FormReader => FormValue(section.AsFormDataSection()),
                Operation.ReaderOnly => 0,
                _ => throw new InvalidOperationException("This is not a reader workload.")
            });
            await section.Body.CopyToAsync(Stream.Null);
        }

        return checksum;
    }

    public async Task<CaseReceipt> CaptureAsync()
    {
        using var input = new MemoryStream(_wire, writable: false);
        var reader = new MultipartReader(Boundary, input);
        var sections = new List<SectionReceipt>();
        var checksum = 0;
        while (await reader.ReadNextSectionAsync() is { } section)
        {
            var index = sections.Count;
            if (index >= _payloads.Length || section.ContentDisposition != _definition.Dispositions[index])
            {
                throw new InvalidOperationException("Actual reader changed section order or disposition.");
            }
            var file = section.AsFileSection();
            var form = _definition.Operation is Operation.FormConversion or Operation.FormReader ? section.AsFormDataSection() : null;
            var fileSectionIdentity = file is null ? (bool?)null : ReferenceEquals(section, file.Section);
            var fileStreamIdentity = file is null ? (bool?)null : ReferenceEquals(section.Body, file.FileStream);
            if (fileSectionIdentity is false || fileStreamIdentity is false)
            {
                throw new InvalidOperationException("Actual conversion changed section/body identity.");
            }
            using var output = new MemoryStream();
            await section.Body.CopyToAsync(output);
            var bytes = output.ToArray();
            if (!bytes.AsSpan().SequenceEqual(_payloads[index]))
            {
                throw new InvalidOperationException("Actual conversion/reader changed or consumed body bytes.");
            }
            sections.Add(new SectionReceipt(section.ContentDisposition, file?.Name, file?.FileName, form?.Name,
                fileSectionIdentity, fileStreamIdentity, section.BaseStreamOffset, bytes.Length, Hash(bytes)));
            checksum += _definition.Operation switch
            {
                Operation.FileConversion => FileValue(file),
                Operation.FormConversion => FormValue(form),
                Operation.HeaderParsing => section.GetContentDispositionHeader()?.DispositionType.Length ?? 0,
                Operation.FileReader => 1 + FileValue(file),
                Operation.FormReader => 1 + FormValue(form),
                Operation.ReaderOnly => 1,
                _ => throw new InvalidOperationException("Unknown workload.")
            };
        }
        if (sections.Count != _payloads.Length)
        {
            throw new InvalidOperationException("Actual reader omitted sections.");
        }

        return new CaseReceipt(_definition.Name, _definition.Operation.ToString(), Hash(_wire), sections.ToArray(), checksum);
    }

    public async Task VerifyAsync()
    {
        var expected = JsonSerializer.Deserialize<CaseReceipt[]>(
            System.IO.File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "contract-oracles.json")))
            ?.Single(receipt => receipt.Name == _definition.Name) ?? throw new InvalidOperationException("Missing original contract.");
        var actual = await CaptureAsync();
        if (JsonSerializer.Serialize(actual) != JsonSerializer.Serialize(expected))
        {
            throw new InvalidOperationException("Actual producer contract differs from the original: " + _definition.Name);
        }
        var checksum = _definition.Operation is Operation.FileConversion or Operation.FormConversion or Operation.HeaderParsing
            ? Convert() : await ReadAsync();
        if (checksum != expected.Checksum)
        {
            throw new InvalidOperationException("Measured operation differs from actual producer oracle: " + _definition.Name);
        }
        Console.WriteLine("Contract receipt: " + JsonSerializer.Serialize(actual));
    }

    public void Dispose()
    {
        _conversionInput?.Dispose();
    }

    private static int FileValue(FileMultipartSection? section)
    {
        return section is null ? 0 : 1 + section.Name.Length * 31 + section.FileName.Length;
    }

    private static int FormValue(FormMultipartSection? section)
    {
        return section is null ? 0 : 1 + section.Name.Length;
    }

    private static string Hash(byte[] bytes)
    {
        return System.Convert.ToHexString(SHA256.HashData(bytes));
    }

    private static string?[] Repeat(string disposition, int count)
    {
        return Enumerable.Repeat<string?>(disposition, count).ToArray();
    }

    private static string?[] RepeatMixed(int count)
    {
        return Enumerable.Range(0, count).Select(index => index % 2 == 0 ? Form : File).ToArray();
    }
}
