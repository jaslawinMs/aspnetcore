using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class EncryptionBenchmarks
{
    private EncryptionFixture _fixture = null!;

    [ParamsAllValues]
    public Shape Shape { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _fixture = new EncryptionFixture(Shape);
        _fixture.Validate(_fixture.Encryptor.Encrypt(_fixture.Plaintext, _fixture.Aad), "untimed-global-setup");
    }

    [Benchmark]
    public byte[] Encrypt()
    {
        return _fixture.Encryptor.Encrypt(_fixture.Plaintext, _fixture.Aad);
    }

    public void ValidateReturnedPayload(byte[] payload)
    {
        _fixture.Validate(payload, "actual-timed-wrapper-preflight");
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.Validate(_fixture.Encryptor.Encrypt(_fixture.Plaintext, _fixture.Aad), "untimed-global-cleanup");
        _fixture.Dispose();
    }
}
