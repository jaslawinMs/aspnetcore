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
    Aes256Sha256_P1024,
    Aes256Sha256_P65536,
    Aes256Sha256_P1048576,
    Aes256Sha512_P0,
    Aes256Sha512_P16,
    Aes256Sha512_P1024,
    Aes256Sha512_P1048576,
}

internal sealed class EncryptionFixture : IDisposable
{
    private readonly byte[] _plaintextBuffer;
    private readonly byte[] _aadBuffer;
    private readonly byte[] _originalPlaintext;
    private readonly byte[] _originalAad;
    private readonly IDisposable _lifetime;
    private readonly Mock<IKey> _key;
    private readonly Shape _shape;

    public EncryptionFixture(Shape shape)
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
            Shape.Aes256Sha256_P1024 => (1024, false),
            Shape.Aes256Sha256_P65536 => (65536, false),
            Shape.Aes256Sha256_P1048576 => (1048576, false),
            Shape.Aes256Sha512_P0 => (0, true),
            Shape.Aes256Sha512_P16 => (16, true),
            Shape.Aes256Sha512_P1024 => (1024, true),
            Shape.Aes256Sha512_P1048576 => (1048576, true),
            _ => throw new ArgumentOutOfRangeException(nameof(shape)),
        };
        PlaintextLength = plaintextLength;
        DigestLength = sha512 ? 64 : 32;
        ExpectedPayloadLength = 16 + 16 + ((plaintextLength / 16) + 1) * 16 + DigestLength;
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
        _key.VerifyGet(key => key.Descriptor, Times.Once());
        _key.VerifyNoOtherCalls();
    }

    public IAuthenticatedEncryptor Encryptor { get; }
    public ArraySegment<byte> Plaintext { get; }
    public ArraySegment<byte> Aad { get; }
    public int PlaintextLength { get; }
    public int DigestLength { get; }
    public int ExpectedPayloadLength { get; }

    public void Validate(byte[] payload, string phase)
    {
        Evidence.Require(payload.Length == ExpectedPayloadLength, "Actual encrypted payload length differs for " + _shape);
        var ciphertextBuffer = new byte[payload.Length + 9];
        payload.CopyTo(ciphertextBuffer, 4);
        var roundtrip = Encryptor.Decrypt(new ArraySegment<byte>(ciphertextBuffer, 4, payload.Length), Aad);
        Evidence.Require(roundtrip.AsSpan().SequenceEqual(_originalPlaintext.AsSpan(3, PlaintextLength)),
            "Actual nonzero-offset roundtrip differs for " + _shape);
        Evidence.Require(_plaintextBuffer.AsSpan().SequenceEqual(_originalPlaintext) && _aadBuffer.AsSpan().SequenceEqual(_originalAad),
            "Actual native encryption/decryption mutated an input buffer.");
        _key.VerifyGet(key => key.Descriptor, Times.Once());
        _key.VerifyNoOtherCalls();
        Evidence.Write("native-roundtrip", new
        {
            shape = _shape.ToString(), phase, plaintextLength = PlaintextLength, digestLength = DigestLength,
            plaintextOffset = Plaintext.Offset, aadOffset = Aad.Offset, aadLength = Aad.Count, ciphertextOffset = 4,
            expectedPayloadLength = ExpectedPayloadLength, actualPayloadLength = payload.Length,
            actualDecryptedLength = roundtrip.Length, actualBackend = Encryptor.GetType().FullName,
            actualPublicFactory = true, realDefaultOperationRandomness = true, inputBuffersUnchanged = true,
            keyMetadataReadsDuringFactoryOnly = 1, returnedCiphertextNotPublished = true,
        });
    }

    public void ValidateArguments()
    {
        RequireArgumentException(() => Encryptor.Encrypt(default, Aad), "Default plaintext segment");
        RequireArgumentException(() => Encryptor.Encrypt(Plaintext, default), "Default AAD segment");
        var emptyAad = new ArraySegment<byte>(Array.Empty<byte>());
        var payload = Encryptor.Encrypt(Plaintext, emptyAad);
        Evidence.Require(payload.Length == ExpectedPayloadLength &&
            Encryptor.Decrypt(new ArraySegment<byte>(payload), emptyAad).AsSpan().SequenceEqual(_originalPlaintext.AsSpan(3, PlaintextLength)),
            "Actual empty-AAD roundtrip differs.");
        Evidence.Write("argument-contracts", new { defaultPlaintextRejected = true, defaultAadRejected = true, emptyAadRoundtripPassed = true });
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
