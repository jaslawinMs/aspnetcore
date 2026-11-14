using System.Security.Cryptography;
using System.Text;
using BenchmarkDotNet.Attributes;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

public class CookieFormattingBenchmark
{
    private CookieHeaderValue _header = null!;
    private SetCookieHeaderValue? _control;

    [ParamsSource(nameof(Cases))]
    public string Case { get; set; } = "";

    public IEnumerable<string> Cases
    {
        get
        {
            foreach (var producer in new[] { "Constructed", "Sliced", "Parsed" })
            {
                foreach (var content in new[] { "Empty", "Small", "Medium", "Large", "Quoted", "Symbols", "LongName" })
                {
                    yield return $"{producer}_{content}";
                }
            }

            yield return "SetCookie_Empty";
            yield return "SetCookie_Small";
            yield return "SetCookie_Large";
        }
    }

    public string VerifiedProducer { get; private set; } = "";
    public int VerifiedNameOffset { get; private set; }
    public int VerifiedValueOffset { get; private set; }
    public string VerifiedOutput { get; private set; } = "";
    public string VerifiedOutputHash { get; private set; } = "";

    [GlobalSetup]
    public void Setup()
    {
        var parts = Case.Split('_');
        var producer = parts[0];
        var content = parts[1];
        var name = content == "LongName" ? new string('N', 64) : "NaMe12";
        var value = content switch
        {
            "Empty" => "",
            "Small" or "LongName" => new string('x', 16),
            "Medium" => new string('x', 256),
            "Large" => new string('x', 4096),
            "Quoted" => "\"" + new string('x', 16) + "\"",
            "Symbols" => "!#$%&'()*+-./:<=>?@[]^_`{|}~",
            _ => throw new InvalidOperationException($"Unknown content: {content}")
        };
        var expected = $"{name}={value}";
        if (producer == "SetCookie")
        {
            _control = new SetCookieHeaderValue(name, value);
            VerifiedNameOffset = _control.Name.Offset;
            VerifiedValueOffset = _control.Value.Offset;
        }
        else
        {
            const string prefix = "ignored-prefix:";
            var buffer = $"{prefix}{expected}:ignored-suffix";
            _header = producer switch
            {
                "Constructed" => new CookieHeaderValue(name, value),
                "Sliced" => new CookieHeaderValue(
                    new StringSegment(buffer, prefix.Length, name.Length),
                    new StringSegment(buffer, prefix.Length + name.Length + 1, value.Length)),
                "Parsed" => CookieHeaderValue.Parse(new StringSegment(buffer, prefix.Length, expected.Length)),
                _ => throw new InvalidOperationException($"Unknown producer: {producer}")
            };
            if (!_header.Name.AsSpan().SequenceEqual(name) || !_header.Value.AsSpan().SequenceEqual(value))
            {
                throw new InvalidOperationException("The actual cookie producer changed name/value content.");
            }

            if (producer is "Sliced" or "Parsed")
            {
                if (!ReferenceEquals(buffer, _header.Name.Buffer) || _header.Name.Offset != prefix.Length)
                {
                    throw new InvalidOperationException("The cookie producer did not retain the actual nonzero name slice.");
                }

                if (producer == "Parsed" && value.Length == 0)
                {
                    if (!_header.Value.Equals(StringSegment.Empty))
                    {
                        throw new InvalidOperationException("The actual parser did not produce its canonical empty value.");
                    }
                }
                else if (!ReferenceEquals(buffer, _header.Value.Buffer) ||
                    _header.Value.Offset != prefix.Length + name.Length + 1)
                {
                    throw new InvalidOperationException("The cookie producer did not retain the actual nonzero value slice.");
                }
            }

            VerifiedNameOffset = _header.Name.Offset;
            VerifiedValueOffset = _header.Value.Offset;
        }

        var actual = FormatHeader();
        if (!string.Equals(expected, actual, StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"Complete header differs for {Case}: expected {expected}; actual {actual}.");
        }

        VerifiedProducer = producer;
        VerifiedOutput = actual;
        VerifiedOutputHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(actual)));
    }

    [Benchmark]
    public string FormatHeader()
    {
        return _control is not null ? _control.ToString() : _header.ToString();
    }
}
