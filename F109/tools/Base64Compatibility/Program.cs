using System.Buffers.Binary;
using System.Buffers.Text;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;

if (args.Length != 1 || !Path.IsPathFullyQualified(args[0]) || File.Exists(args[0]))
{
    throw new ArgumentException("One new absolute report path is required.");
}
if (!BitConverter.IsLittleEndian)
{
    throw new InvalidOperationException("The recorded exact UTF16LE corpus requires a little-endian host.");
}

using var corpus = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
var mismatches = new List<object>();
long checkedCases = 0;
long accepted = 0;
long rejected = 0;
long decodedBytes = 0;

void Check(string value)
{
    Span<byte> lengthBytes = stackalloc byte[4];
    BinaryPrimitives.WriteInt32LittleEndian(lengthBytes, value.Length);
    corpus.AppendData(lengthBytes);
    corpus.AppendData(MemoryMarshal.AsBytes(value.AsSpan()));
    var predicateAccepted = Base64.IsValid(value.AsSpan(), out var predictedBytes);
    var decoderAccepted = false;
    var actualBytes = -1;
    try
    {
        actualBytes = Convert.FromBase64String(value).Length;
        decoderAccepted = true;
    }
    catch (FormatException)
    {
        rejected++;
    }
    checkedCases++;
    if (decoderAccepted)
    {
        accepted++;
        decodedBytes += actualBytes;
    }
    if ((predicateAccepted != decoderAccepted || (decoderAccepted && predictedBytes != actualBytes)) &&
        mismatches.Count < 32)
    {
        mismatches.Add(new
        {
            index = checkedCases,
            utf16CodeUnits = value.Select(c => (int)c).ToArray(),
            predicateAccepted,
            decoderAccepted,
            predictedBytes,
            actualBytes
        });
    }
}

var substitutions = new (string Template, int Offset)[]
{
    ("AAAA", 0), ("AAAA", 1), ("AAAA", 2), ("AAAA", 3),
    ("AAAAAA==", 6), ("AA==", 3), ("AAAA AAA=", 4),
    (" AAAA", 0), ("AAAA ", 4), ("AAAA\nAA==", 5)
};
foreach (var (template, offset) in substitutions)
{
    var units = template.ToCharArray();
    for (var code = 0; code <= char.MaxValue; code++)
    {
        units[offset] = (char)code;
        Check(new string(units));
    }
}

const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
foreach (var first in alphabet)
{
    foreach (var second in alphabet)
    {
        Check($"{first}{second}==");
        Check($"A{first}{second}=");
    }
}

var separators = new[] { "", " ", "\t", "\r", "\n", "\r\n\t ", "\v", "\f", "\u00a0", "\u2003" };
foreach (var first in separators)
{
    foreach (var second in separators)
    {
        Check(first + "AAAA" + second);
        Check("A" + first + "A" + second + "==");
        Check("AA=" + first + "=" + second);
        Check("AAAA" + first + "AAA=" + second);
    }
}

uint state = 0xF1092026;
uint Next()
{
    state = unchecked(state * 1664525 + 1013904223);

    return state;
}
for (var sample = 0; sample < 10000; sample++)
{
    var units = new char[Next() % 161];
    for (var index = 0; index < units.Length; index++)
    {
        var choice = Next();
        units[index] = (choice % 8) switch
        {
            < 4 => alphabet[(int)(Next() % 64)],
            4 => '=',
            5 => " \t\r\n"[(int)(Next() % 4)],
            _ => (char)Next()
        };
    }
    Check(new string(units));
}
foreach (var value in new[] { "", "=", "==", "===", "====", "A", "AA", "AAA", "AAAA", "AAAA====", "\t\r\n " })
{
    Check(value);
}

var nullPredicateAccepted = Base64.IsValid(((string?)null).AsSpan());
string nullDecoderException;
string? nullDecoderParameter;
try
{
    Convert.FromBase64String(null!);
    throw new InvalidOperationException("The original null decoder boundary unexpectedly returned.");
}
catch (ArgumentNullException exception)
{
    nullDecoderException = exception.GetType().FullName!;
    nullDecoderParameter = exception.ParamName;
}
var corelib = typeof(Convert).Assembly;
var report = new
{
    candidate = "F109",
    boundary = "Actual public Base64.IsValid(ReadOnlySpan<char>,out int) versus Convert.FromBase64String;external compatibility diagnostic,not an owning-path benchmark or unit test of framework internals.",
    runtime = Environment.Version.ToString(),
    corelibInformationalVersion = corelib.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
    corelibSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(corelib.Location))),
    corelibMvid = corelib.ManifestModule.ModuleVersionId,
    corpusFormat = "Repeated int32LE UTF16-code-unit length followed by exact UTF16LE code-unit bytes,including isolated surrogates.",
    exactCorpusSha256 = Convert.ToHexString(corpus.GetHashAndReset()),
    exhaustiveTemplates = substitutions.Select(s => new
    {
        templateUtf16CodeUnits = s.Template.Select(c => (int)c).ToArray(),
        offset = s.Offset,
        substitutedCodeUnits = 65536
    }).ToArray(),
    exhaustiveSubstitutionCases = substitutions.Length * 65536,
    exhaustivePaddingCases = 64 * 64 * 2,
    separatorCases = separators.Length * separators.Length * 4,
    randomSamples = 10000,
    randomAlgorithm = "uint32 x=unchecked(x*1664525+1013904223),initial0xF1092026;exact source retained.",
    explicitCases = 11,
    checkedCases,
    accepted,
    rejected,
    totalAcceptedDecodedBytes = decodedBytes,
    nullExcludedFromEquivalenceDomain = true,
    nullSpanPredicateAccepted = nullPredicateAccepted,
    actualNullDecoderException = nullDecoderException,
    actualNullDecoderParameter = nullDecoderParameter,
    nullOriginalDecoderMustStillRunInsideExistingCatch = true,
    mismatches,
    sourceComparisons = 0
};
Directory.CreateDirectory(Path.GetDirectoryName(args[0])!);
File.WriteAllText(args[0], JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
if (mismatches.Count != 0 || !nullPredicateAccepted || nullDecoderParameter != "s" ||
    checkedCases != 655360 + 8192 + 400 + 10000 + 11 || checkedCases != accepted + rejected)
{
    throw new InvalidOperationException("Actual Base64 predicate/decoder or null/corpus boundary differs;retain the report and do not implement a candidate.");
}
Console.WriteLine($"F109 actual BCL compatibility:{checkedCases} exact corpus cases,{accepted} accepted,{rejected} rejected,0 predicate/decoded-length differences;null continues to the original decoder catch.");
