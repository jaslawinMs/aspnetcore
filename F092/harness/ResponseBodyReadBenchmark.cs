using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Attributes;

/// <summary>Measures completed reads of the actual public TestServer response.</summary>
[MemoryDiagnoser]
public class ResponseBodyReadBenchmark
{
    private LiveResponse _response = null!;
    private byte[] _buffer = null!;
    private int _requested;

    /// <summary>The completed-read targets and cached/EOF controls.</summary>
    public static string[] Profiles { get; } =
    [
        "Eof", "Cached1", "Cached8", "Uncached9", "Uncached16", "Partial16", "Uncached256", "Uncached4096",
    ];

    /// <summary>The actual response payload profile.</summary>
    [ParamsSource(nameof(Profiles))]
    public string Profile { get; set; } = "";

    [GlobalSetup(Target = nameof(PreparedSync))]
    public void PrepareSync() => Prepare(nameof(PreparedSync));

    [GlobalSetup(Target = nameof(PreparedMemoryAsync))]
    public void PrepareMemory() => Prepare(nameof(PreparedMemoryAsync));

    [GlobalSetup(Target = nameof(PublicSync))]
    public void PreparePublic() => Prepare(nameof(PublicSync));

    public void Prepare(string method)
    {
        var size = Profile switch
        {
            "Eof" => 0,
            "Cached1" => 1,
            "Cached8" => 8,
            "Uncached9" => 9,
            "Uncached16" or "Partial16" => 16,
            "Uncached256" => 256,
            "Uncached4096" => 4096,
            _ => throw new ArgumentException($"Unknown actual read profile: {Profile}"),
        };
        _requested = Profile == "Partial16" ? 32 : Math.Max(size, 1);
        var payload = Enumerable.Range(0, size).Select(i => (byte)(i % 239)).ToArray();
        _buffer = Enumerable.Repeat((byte)255, _requested + 4).ToArray();
        _response = new LiveResponse(payload);
        if (size == 0)
        {
            _response.Finish();
            if (_response.Stream.Read(_buffer, 2, _requested) != 0)
            {
                throw new InvalidOperationException("The prepared actual EOF was not complete.");
            }
        }
        var actual = method switch
        {
            nameof(PreparedSync) => PreparedSync(),
            nameof(PreparedMemoryAsync) => PreparedMemoryAsync(),
            nameof(PublicSync) => PublicSync().GetAwaiter().GetResult(),
            _ => throw new ArgumentException($"Unknown read method: {method}"),
        };
        if (actual != size || !_buffer.AsSpan(2, size).SequenceEqual(payload) ||
            _buffer.Take(2).Any(value => value != 255) ||
            _buffer.Skip(2 + size).Any(value => value != 255))
        {
            throw new InvalidOperationException("Actual offset, payload, short read or buffer sentinel differs.");
        }
        var stateRoot = Environment.GetEnvironmentVariable("AUTOPERF_F092_STATE_DIR") ??
            throw new InvalidOperationException("An explicit actual setup receipt directory is required.");
        Directory.CreateDirectory(stateRoot);
        var owner = _response.Stream.GetType().Assembly;
        var receipt = new
        {
            candidate = "F092",
            profile = Profile,
            method,
            process_id = Environment.ProcessId,
            owner_type = _response.Stream.GetType().FullName,
            owner_assembly = owner.FullName,
            owner_sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(owner.Location))),
            harness_sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(ResponseBodyReadBenchmark).Assembly.Location))),
            requested = _requested,
            actual,
            payload_sha256 = Convert.ToHexString(SHA256.HashData(payload)),
            actual_bytes = _buffer,
            exact_payload = true,
            sentinels_unchanged = true,
            real_public_producer = _response.ProducerType,
        };
        var json = JsonSerializer.Serialize(receipt);
        File.WriteAllText(Path.Combine(stateRoot, $"{Profile}-{method}-{Guid.NewGuid():N}.json"), json + Environment.NewLine);
        Console.WriteLine($"AUTOPERF_F092_SETUP {json}");
    }

    /// <summary>Includes the actual producer flush and completed synchronous read.</summary>
    [Benchmark]
    public int PreparedSync()
    {
        if (_response.Payload.Length != 0)
        {
            _response.Produce();
        }
        return _response.Stream.Read(_buffer, 2, _requested);
    }

    /// <summary>Unchanged memory-read control with the identical producer.</summary>
    [Benchmark]
    public int PreparedMemoryAsync()
    {
        if (_response.Payload.Length != 0)
        {
            _response.Produce();
        }
        var read = _response.Stream.ReadAsync(_buffer.AsMemory(2, _requested));
        if (!read.IsCompletedSuccessfully)
        {
            throw new InvalidOperationException("The prepared memory-read control did not complete synchronously.");
        }
        return read.Result;
    }

    /// <summary>Includes a real request, streamed response, synchronous read, EOF and disposal.</summary>
    [Benchmark]
    public Task<int> PublicSync() => _response.ReadPublic(_buffer, 2, _requested);

    [GlobalCleanup]
    public void Cleanup() => _response?.Dispose();
}
