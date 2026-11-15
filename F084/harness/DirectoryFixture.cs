using System.Collections;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using System.Text.Unicode;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace AutoPerf;

internal sealed record DirectoryProfile(string Name, int Depth = 0, int SegmentLength = 8,
    string SegmentKind = "Ascii", string Encoder = "Default", int FileCount = 2,
    int BaseDepth = 0, bool Repeated = false, string Method = "GET");

internal static class DirectoryProfiles
{
    public static readonly DirectoryProfile[] All =
    [
        new("Root"),
        new("Single", 1),
        new("Two", 2),
        new("Eight", 8),
        new("Depth32", 32),
        new("Depth64", 64),
        new("Depth128", 128),
        new("LongSingle1K", 1, 1024),
        new("LongTwo1K", 2, 1024),
        new("LongEight1K", 8, 1024),
        new("EscapedEight", 8, SegmentKind: "Escaped"),
        new("EscapedDepth64", 64, SegmentKind: "Escaped"),
        new("UnicodeEight", 8, SegmentKind: "Unicode"),
        new("UnicodeDepth64", 64, SegmentKind: "Unicode"),
        new("RepeatedEight", 8, Repeated: true),
        new("PathBaseEight", 8, BaseDepth: 2),
        new("ManyFiles64Root", FileCount: 64),
        new("ManyFiles64Depth64", 64, FileCount: 64),
        new("ConfiguredTwoControl", 2, SegmentKind: "Unicode", Encoder: "Configured"),
        new("ConfiguredDepth64Control", 64, SegmentKind: "Unicode", Encoder: "Configured"),
        new("OverrideTwoControl", 2, Encoder: "Override"),
        new("OverrideDepth64Control", 64, Encoder: "Override"),
        new("HeadDepth64Control", 64, Method: "HEAD"),
        new("HeadRootControl", Method: "HEAD"),
    ];
}

internal sealed class DirectoryFixture : IDisposable
{
    private readonly DirectoryProfile _profile;
    private readonly HtmlEncoder _encoder;
    private readonly MarkerEncoder? _marker;
    private readonly DefaultHttpContext _context;
    private readonly DirectoryBrowserMiddleware _producer;
    private readonly RecordingProvider _provider;
    private readonly RecordingStream _stream = new();
    private readonly string[] _segments;
    private int _nextCalls;

    public DirectoryFixture(DirectoryProfile profile)
    {
        _profile = profile;
        CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("en-US");
        CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("en-US");
        _encoder = profile.Encoder switch
        {
            "Configured" => HtmlEncoder.Create(UnicodeRanges.All),
            "Override" => _marker = new MarkerEncoder(),
            _ => HtmlEncoder.Default,
        };
        var segments = Enumerable.Range(0, profile.Depth).Select(i => profile.SegmentKind switch
        {
            "Escaped" => $"seg{i}&<\"",
            "Unicode" => $"caf\u00E9\u03A9{i}",
            _ => $"seg{i}" + new string('x', profile.SegmentLength),
        }).ToArray();
        var path = "/" + string.Join(profile.Repeated ? "///" : "/", segments) + (profile.Repeated ? "///" : "/");
        if (profile.Depth == 0)
        {
            path = "/";
        }
        _provider = new RecordingProvider(Enumerable.Range(0, profile.FileCount)
            .Select(i => (IFileInfo)new FixtureFile($"entry{i}<&>", i % 2 == 0)).ToArray());
        var options = new DirectoryBrowserOptions { FileProvider = _provider, RedirectToAppendTrailingSlash = false };
        _producer = new DirectoryBrowserMiddleware(context =>
        {
            _nextCalls++;
            return Task.CompletedTask;
        }, new FixtureEnvironment(_provider), _encoder, Options.Create(options));
        _context = new DefaultHttpContext();
        _context.Request.Method = profile.Method;
        _context.Request.Path = path;
        _context.Request.PathBase = profile.BaseDepth == 0 ? "" : "/" + string.Join('/', Enumerable.Range(0, profile.BaseDepth).Select(i => $"base{i}"));
        _context.Response.Body = _stream;
        _segments = (_context.Request.PathBase + _context.Request.Path).Value!.Split('/', StringSplitOptions.RemoveEmptyEntries);
    }

    public Task Exercise()
    {
        _stream.Reset(capture: false);
        _provider.Reset();
        _nextCalls = 0;
        _marker?.Reset();
        return _producer.Invoke(_context);
    }

    public async Task<(object Contract, byte[] Bytes)> CaptureContract()
    {
        _stream.Reset(capture: true);
        _provider.Reset();
        _nextCalls = 0;
        _marker?.Reset();
        await _producer.Invoke(_context);
        var encoderCalls = _marker?.StringCalls;
        var bytes = _stream.Captured.ToArray();
        var head = _profile.Method == "HEAD";
        if (_nextCalls != 0 || _provider.Lookups != 1 || _provider.Enumerations != (head ? 0 : 2) ||
            _context.Response.ContentType != "text/html; charset=utf-8" ||
            _stream.Writes != (head ? 0 : 1) || _stream.Bytes != bytes.Length ||
            (head ? _context.Response.ContentLength is not null : _context.Response.ContentLength != bytes.Length))
        {
            throw new InvalidOperationException("Actual middleware/provider/formatter must produce complete UTF8 response or empty HEAD.");
        }
        var body = Encoding.UTF8.GetString(bytes);
        var links = new List<object>();
        if (!head)
        {
            var header = Regex.Match(body, @"<header><h1>.*?</h1></header>", RegexOptions.Singleline);
            if (!header.Success || !body.EndsWith("</html>", StringComparison.Ordinal))
            {
                throw new InvalidOperationException("Actual directory HTML/header/footer required.");
            }
            var matches = Regex.Matches(header.Value, @"<a href=""([^""]*)"">(.*?)</a>");
            if (matches.Count != _segments.Length + 1 || matches[0].Groups[1].Value != "/" || matches[0].Groups[2].Value != "/")
            {
                throw new InvalidOperationException("Actual root and all normalized breadcrumb links required.");
            }
            for (var i = 0; i < _segments.Length; i++)
            {
                var raw = "/" + string.Join('/', _segments.Take(i + 1)) + "/";
                var href = EncodeExpected(raw);
                var text = EncodeExpected(_segments[i]) + "/";
                if (matches[i + 1].Groups[1].Value != href || matches[i + 1].Groups[2].Value != text)
                {
                    throw new InvalidOperationException("Actual breadcrumb href/text must preserve the configured encoder and prefix normalization.");
                }
                links.Add(new { href, text });
            }
            var originalPath = (_context.Request.PathBase + _context.Request.Path).Value!;
            if (!body.Contains(EncodeExpected(originalPath) + "</title>", StringComparison.Ordinal) ||
                Regex.Matches(body, @"<tr class=""(?:directory|file)"">").Count != _profile.FileCount)
            {
                throw new InvalidOperationException("Original title path and every directory/file row required.");
            }
        }
        return (new
        {
            content_type = _context.Response.ContentType,
            content_length = _context.Response.ContentLength,
            response_bytes = bytes.Length,
            response_sha256 = Convert.ToHexString(SHA256.HashData(bytes)),
            writes = _stream.Writes,
            file_provider_lookups = _provider.Lookups,
            contents_enumerations = _provider.Enumerations,
            next_calls = _nextCalls,
            normalized_segments = _segments.Length,
            encoder = _profile.Encoder,
            override_string_calls = encoderCalls,
            method = _profile.Method,
            links,
        }, bytes);
    }

    private string EncodeExpected(string value)
    {
        return _marker is not null ? "[custom]" + HtmlEncoder.Default.Encode(value) : _encoder.Encode(value);
    }

    public void Dispose()
    {
        _stream.Dispose();
    }

    private sealed class RecordingProvider(IFileInfo[] files) : IFileProvider, IDirectoryContents
    {
        public int Lookups { get; private set; }
        public int Enumerations { get; private set; }
        public bool Exists => true;

        public void Reset()
        {
            Lookups = 0;
            Enumerations = 0;
        }

        public IDirectoryContents GetDirectoryContents(string subpath)
        {
            if (string.IsNullOrEmpty(subpath))
            {
                throw new InvalidOperationException("Actual matching directory subpath required.");
            }
            Lookups++;
            return this;
        }

        public IEnumerator<IFileInfo> GetEnumerator()
        {
            Enumerations++;
            return ((IEnumerable<IFileInfo>)files).GetEnumerator();
        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
        public IFileInfo GetFileInfo(string subpath) => throw new NotSupportedException();
        public IChangeToken Watch(string filter) => throw new NotSupportedException();
    }

    private sealed class FixtureFile(string name, bool directory) : IFileInfo
    {
        public bool Exists => true;
        public long Length => 1234;
        public string? PhysicalPath => null;
        public string Name => name;
        public DateTimeOffset LastModified => new(2020, 1, 2, 3, 4, 5, TimeSpan.Zero);
        public bool IsDirectory => directory;
        public Stream CreateReadStream() => throw new NotSupportedException();
    }

    private sealed class FixtureEnvironment(IFileProvider provider) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "AutoPerf";
        public string EnvironmentName { get; set; } = "Benchmark";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = provider;
        public string WebRootPath { get; set; } = "";
        public IFileProvider WebRootFileProvider { get; set; } = provider;
    }

    private sealed class MarkerEncoder : HtmlEncoder
    {
        public int StringCalls { get; private set; }
        public void Reset() => StringCalls = 0;
        public override string Encode(string value)
        {
            StringCalls++;
            return "[custom]" + HtmlEncoder.Default.Encode(value);
        }
        public override int MaxOutputCharactersPerInputCharacter => HtmlEncoder.Default.MaxOutputCharactersPerInputCharacter;
        public override bool WillEncode(int unicodeScalar) => HtmlEncoder.Default.WillEncode(unicodeScalar);
        public override unsafe int FindFirstCharacterToEncode(char* text, int textLength) => HtmlEncoder.Default.FindFirstCharacterToEncode(text, textLength);
        public override unsafe bool TryEncodeUnicodeScalar(int unicodeScalar, char* buffer, int bufferLength, out int written)
            => HtmlEncoder.Default.TryEncodeUnicodeScalar(unicodeScalar, buffer, bufferLength, out written);
    }

    private sealed class RecordingStream : Stream
    {
        private bool _capture;
        public MemoryStream Captured { get; } = new();
        public int Bytes { get; private set; }
        public int Writes { get; private set; }
        public override bool CanRead => false;
        public override bool CanSeek => false;
        public override bool CanWrite => true;
        public override long Length => Bytes;
        public override long Position { get => Bytes; set => throw new NotSupportedException(); }

        public void Reset(bool capture)
        {
            _capture = capture;
            Bytes = 0;
            Writes = 0;
            Captured.SetLength(0);
            Captured.Position = 0;
        }

        public override void Write(byte[] buffer, int offset, int count)
        {
            Writes++;
            Bytes += count;
            if (_capture)
            {
                Captured.Write(buffer, offset, count);
            }
        }

        public override Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Write(buffer, offset, count);
            return Task.CompletedTask;
        }

        public override void Flush() { }
        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                Captured.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
