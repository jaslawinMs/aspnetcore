using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.AuthenticatedEncryption;
using Microsoft.AspNetCore.DataProtection.AuthenticatedEncryption.ConfigurationModel;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace AutoPerf;

public enum Shape
{
    Aes256Sha256_P0,
    Aes256Sha256_P15,
    Aes256Sha256_P16,
    Aes256Sha256_P17,
    Aes256Sha256_P191,
    Aes256Sha256_P192,
    Aes256Sha256_P193,
    Aes256Sha256_P255,
    Aes256Sha256_P256,
    Aes256Sha256_P257,
    Aes256Sha256_P1024,
    Aes256Sha256_P1025,
    Aes256Sha256_P65536,
    Aes256Sha256_P65537,
    Aes256Sha256_P1048576,
    Aes256Sha256_P1048577,
    Aes256Sha512_P0,
    Aes256Sha512_P1024,
    Aes256Sha512_P1025,
    Aes256Sha512_P1048576,
    Aes256Sha512_P1048577,
}

internal sealed class DecryptionFixture : IDisposable
{
    private readonly byte[] _plaintextBuffer;
    private readonly byte[] _aadBuffer;
    private readonly byte[] _ciphertextBuffer;
    private readonly byte[] _originalPlaintext;
    private readonly byte[] _originalAad;
    private readonly byte[] _originalCiphertext;
    private readonly IDisposable _lifetime;
    private readonly Mock<IKey> _key;
    private readonly Shape _shape;

    public DecryptionFixture(Shape shape)
    {
        _shape = shape;
        var (plaintextLength, sha512) = shape switch
        {
            Shape.Aes256Sha256_P0 => (0, false),
            Shape.Aes256Sha256_P15 => (15, false),
            Shape.Aes256Sha256_P16 => (16, false),
            Shape.Aes256Sha256_P17 => (17, false),
            Shape.Aes256Sha256_P191 => (191, false),
            Shape.Aes256Sha256_P192 => (192, false),
            Shape.Aes256Sha256_P193 => (193, false),
            Shape.Aes256Sha256_P255 => (255, false),
            Shape.Aes256Sha256_P256 => (256, false),
            Shape.Aes256Sha256_P257 => (257, false),
            Shape.Aes256Sha256_P1024 => (1024, false),
            Shape.Aes256Sha256_P1025 => (1025, false),
            Shape.Aes256Sha256_P65536 => (65536, false),
            Shape.Aes256Sha256_P65537 => (65537, false),
            Shape.Aes256Sha256_P1048576 => (1048576, false),
            Shape.Aes256Sha256_P1048577 => (1048577, false),
            Shape.Aes256Sha512_P0 => (0, true),
            Shape.Aes256Sha512_P1024 => (1024, true),
            Shape.Aes256Sha512_P1025 => (1025, true),
            Shape.Aes256Sha512_P1048576 => (1048576, true),
            Shape.Aes256Sha512_P1048577 => (1048577, true),
            _ => throw new ArgumentOutOfRangeException(nameof(shape)),
        };
        PlaintextLength = plaintextLength;
        DigestLength = sha512 ? 64 : 32;
        PaddedCiphertextLength = ((plaintextLength / 16) + 1) * 16;
        ExpectedPayloadLength = 16 + 16 + PaddedCiphertextLength + DigestLength;
        _plaintextBuffer = new byte[plaintextLength + 7];
        _aadBuffer = new byte[42];
        for (var index = 0; index < _plaintextBuffer.Length; index++)
        {
            _plaintextBuffer[index] = (byte)(index * 17 + 3);
        }
        for (var index = 0; index < _aadBuffer.Length; index++)
        {
            _aadBuffer[index] = (byte)(index * 7 + 11);
        }
        _originalPlaintext = _plaintextBuffer.ToArray();
        _originalAad = _aadBuffer.ToArray();
        Plaintext = new ArraySegment<byte>(_plaintextBuffer, 3, plaintextLength);
        Aad = new ArraySegment<byte>(_aadBuffer, 5, 32);
        var configuration = new ManagedAuthenticatedEncryptorConfiguration
        {
            EncryptionAlgorithmType = typeof(Aes),
            EncryptionAlgorithmKeySize = 256,
            ValidationAlgorithmType = sha512 ? typeof(HMACSHA512) : typeof(HMACSHA256),
        };
        using var masterKey = Secret.Random(64);
        var descriptor = new ManagedAuthenticatedEncryptorDescriptor(configuration, masterKey);
        _key = new Mock<IKey>(MockBehavior.Strict);
        _key.SetupGet(key => key.Descriptor).Returns(descriptor);
        Encryptor = new ManagedAuthenticatedEncryptorFactory(NullLoggerFactory.Instance).CreateEncryptorInstance(_key.Object)
            ?? throw new InvalidOperationException("The actual public managed factory did not create its backend.");
        if (Encryptor is not IDisposable lifetime)
        {
            throw new InvalidOperationException("The actual managed backend must own its disposable cloned secret.");
        }
        _lifetime = lifetime;
        Evidence.Require(Encryptor.GetType().FullName == "Microsoft.AspNetCore.DataProtection.Managed.ManagedAuthenticatedEncryptor",
            "The public factory did not create the expected actual managed backend.");
        var payload = Encryptor.Encrypt(Plaintext, Aad);
        Evidence.Require(payload.Length == ExpectedPayloadLength, "The actual untimed Encrypt producer returned an unexpected payload size.");
        _ciphertextBuffer = new byte[payload.Length + 9];
        payload.CopyTo(_ciphertextBuffer, 4);
        _originalCiphertext = _ciphertextBuffer.ToArray();
        Ciphertext = new ArraySegment<byte>(_ciphertextBuffer, 4, payload.Length);
        _key.VerifyGet(key => key.Descriptor, Times.Once());
        _key.VerifyNoOtherCalls();
    }

    public IAuthenticatedEncryptor Encryptor { get; }
    public ArraySegment<byte> Plaintext { get; }
    public ArraySegment<byte> Aad { get; }
    public ArraySegment<byte> Ciphertext { get; }
    public int PlaintextLength { get; }
    public int DigestLength { get; }
    public int PaddedCiphertextLength { get; }
    public int ExpectedPayloadLength { get; }

    public void Validate(byte[] plaintext, string phase)
    {
        Evidence.Require(plaintext.Length == PlaintextLength &&
            plaintext.AsSpan().SequenceEqual(_originalPlaintext.AsSpan(3, PlaintextLength)),
            "Actual nonzero-offset decryption output differs for " + _shape);
        Evidence.Require(_plaintextBuffer.AsSpan().SequenceEqual(_originalPlaintext) &&
            _aadBuffer.AsSpan().SequenceEqual(_originalAad) && _ciphertextBuffer.AsSpan().SequenceEqual(_originalCiphertext),
            "Actual native payload production/decryption mutated an input buffer.");
        _key.VerifyGet(key => key.Descriptor, Times.Once());
        _key.VerifyNoOtherCalls();
        Evidence.Write("native-roundtrip", new
        {
            shape = _shape.ToString(), phase, plaintextLength = PlaintextLength, digestLength = DigestLength,
            plaintextOffset = Plaintext.Offset, aadOffset = Aad.Offset, aadLength = Aad.Count, ciphertextOffset = Ciphertext.Offset,
            paddedCiphertextLength = PaddedCiphertextLength, paddedCiphertextIsUpperBoundNotExactPlaintext = true,
            expectedPayloadLength = ExpectedPayloadLength, actualPayloadLength = Ciphertext.Count,
            actualDecryptedLength = plaintext.Length, actualBackend = Encryptor.GetType().FullName,
            actualPublicFactory = true, actualPayloadProducedByPublicEncrypt = true,
            realDefaultEntropyInUntimedPayloadSetup = true, timedDecryptGeneratesRandomness = false,
            inputBuffersUnchanged = true, keyMetadataReadsDuringFactoryOnly = 1, payloadAndPlaintextBytesNotPublished = true,
        });
    }

    public void ValidateArguments()
    {
        RequireArgumentException(() => Encryptor.Decrypt(default, Aad), "Default protected-payload segment");
        RequireArgumentException(() => Encryptor.Decrypt(Ciphertext, default), "Default AAD segment");
        var emptyAad = new ArraySegment<byte>(Array.Empty<byte>());
        var payload = Encryptor.Encrypt(Plaintext, emptyAad);
        Evidence.Require(payload.Length == ExpectedPayloadLength &&
            Encryptor.Decrypt(new ArraySegment<byte>(payload), emptyAad).AsSpan().SequenceEqual(_originalPlaintext.AsSpan(3, PlaintextLength)),
            "Actual empty-AAD roundtrip differs.");
        Evidence.Write("argument-contracts", new { defaultProtectedPayloadRejected = true, defaultAadRejected = true, emptyAadRoundtripPassed = true });
    }

    private static void RequireArgumentException(Action operation, string description)
    {
        try
        {
            operation();
        }
        catch (ArgumentException)
        {
            return;
        }

        throw new InvalidOperationException(description + " was not rejected by the actual owner.");
    }

    public void Dispose()
    {
        _lifetime.Dispose();
    }
}
