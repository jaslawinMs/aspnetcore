using BenchmarkDotNet.Attributes;

namespace AutoPerf;

public class DecryptionBenchmarks
{
    private DecryptionFixture _fixture = null!;

    [ParamsAllValues]
    public Shape Shape { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _fixture = new DecryptionFixture(Shape);
        _fixture.Validate(_fixture.Encryptor.Decrypt(_fixture.Ciphertext, _fixture.Aad), "untimed-global-setup");
    }

    [Benchmark]
    public byte[] Decrypt()
    {
        return _fixture.Encryptor.Decrypt(_fixture.Ciphertext, _fixture.Aad);
    }

    public void ValidateReturnedPlaintext(byte[] plaintext)
    {
        _fixture.Validate(plaintext, "actual-timed-wrapper-preflight");
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _fixture.Validate(_fixture.Encryptor.Decrypt(_fixture.Ciphertext, _fixture.Aad), "untimed-global-cleanup");
        _fixture.Dispose();
    }
}
