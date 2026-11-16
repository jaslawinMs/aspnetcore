using System.Text;
using System.Text.Json;

namespace AutoPerf;

internal static class TokenFixture
{
    internal const string ApplicationName = "F109-synthetic-only";
    internal const string ProtectorName = "DataProtectorTokenProvider";
    internal const string ProviderName = "F109";
    internal const string Purpose = "F109-purpose";
    internal static readonly string[] Labels =
    [
        "ValidSmall", "ValidLarge", "ValidWhitespace", "ValidNoStamp",
        "InvalidHeadSmall", "InvalidMiddleSmall", "InvalidTailSmall", "InvalidLengthSmall",
        "InvalidPaddingSmall", "InvalidNonAsciiSmall", "InvalidHeadLarge", "InvalidTailLarge",
        "InvalidLengthLarge", "InvalidHeadEnabled", "InvalidTailEnabled", "Empty",
        "WhitespaceOnly", "NullOutsideAnnotation", "UnprotectFailure", "ProtectedTruncated",
        "ProtectedTrailing", "WrongPurpose", "WrongUser", "WrongStamp",
        "Expired", "ValidEnabled", "ProtectedInvalidUtf8", "ProtectedMalformedLengthPrefix",
        "NonEmptyStampWithoutStore", "ValidLargeWhitespace", "ValidPadded", "InvalidUnusedPadBits", "InvalidPaddingEnabled"
    ];

    internal static TokenCase Load(string directory, string label)
    {
        Evidence.Require(Labels.Contains(label, StringComparer.Ordinal), "Unknown explicit token profile.");
        var input = JsonSerializer.Deserialize<TokenCase>(File.ReadAllBytes(Path.Combine(directory, "case-inputs", label + ".json")))
            ?? throw new InvalidOperationException("The exact token input is missing.");
        Evidence.Require(input.Label == label, "The exact token label differs.");

        return input;
    }

    internal static object Verify(string directory)
    {
        var file = Path.Combine(directory, "provenance.json");
        using var document = JsonDocument.Parse(File.ReadAllBytes(file));
        var root = document.RootElement;
        Evidence.Require(root.GetProperty("caseCount").GetInt32() == Labels.Length &&
            root.GetProperty("syntheticOnly").GetBoolean(), "The declared paired synthetic fixture differs.");
        var observedKeys = Directory.GetFiles(Path.Combine(directory, "keys"), "*.xml").Order(StringComparer.Ordinal).ToArray();
        var declaredKeys = root.GetProperty("keys").EnumerateArray().ToArray();
        Evidence.Require(observedKeys.Length == declaredKeys.Length && declaredKeys.Length > 0,
            "The isolated key set changed.");
        foreach (var key in declaredKeys)
        {
            var name = key.GetProperty("name").GetString() ?? throw new InvalidOperationException("Missing key file name.");
            var actual = Path.Combine(directory, "keys", name);
            Evidence.Require(Path.GetFileName(name) == name && Evidence.Hash(actual) == key.GetProperty("sha256").GetString() &&
                new FileInfo(actual).Length == key.GetProperty("bytes").GetInt64(), "Synthetic key bytes changed.");
        }
        var inputs = root.GetProperty("inputs").EnumerateArray().ToArray();
        Evidence.Require(inputs.Length == Labels.Length &&
            inputs.Select(i => i.GetProperty("label").GetString()).Order(StringComparer.Ordinal)
                .SequenceEqual(Labels.Order(StringComparer.Ordinal)), "The exact fixture input set differs.");
        foreach (var input in inputs)
        {
            var label = input.GetProperty("label").GetString() ?? throw new InvalidOperationException("Missing fixture label.");
            var actual = Path.Combine(directory, "case-inputs", label + ".json");
            Evidence.Require(Evidence.Hash(actual) == input.GetProperty("sha256").GetString(), "Paired synthetic input bytes changed.");
        }

        return new
        {
            provenanceSha256 = Evidence.Hash(file), caseCount = Labels.Length, keyCount = declaredKeys.Length,
            inputBytesSharedAcrossFrozenVariants = true, syntheticKeyHashesCheckedLocally = true,
            keysMustNotBePublished = true,
            replayBoundary = "Original paired exact token/key bytes verified locally. Omitted private synthetic keys are not portable rehashed bytes;fresh reproduction must regenerate one shared fixture for both variants. Generated tokens retain the original one-day lifespan."
        };
    }

    internal static void Create(string directory)
    {
        Evidence.Require(Path.IsPathFullyQualified(directory) && !Directory.Exists(directory),
            "A new isolated absolute synthetic fixture directory is required.");
        Directory.CreateDirectory(Path.Combine(directory, "keys"));
        Directory.CreateDirectory(Path.Combine(directory, "case-inputs"));
        var seed = new TokenCase("SeedSmall", "", "F109-user-" + new string('u', 16),
            "F109-stamp-" + new string('s', 32), true, Purpose, false, TimeSpan.FromDays(1).Ticks,
            true, null, 1, 1, 1, false, 0, "Actual public UserManager.GenerateUserTokenAsync.");
        using var smallProducer = new Workload(seed, directory, allowKeyGeneration: true);
        var smallToken = smallProducer.Generate();
        var smallPayload = smallProducer.UnprotectForFixture(smallToken);
        using var largeProducer = new Workload(seed with { Label = "SeedLarge", UserId = "F109-user-" + new string('u', 8192) },
            directory, allowKeyGeneration: true);
        var largeToken = largeProducer.Generate();
        using var noStampProducer = new Workload(seed with { Label = "SeedNoStamp", SupportsStamp = false, Stamp = "" },
            directory, allowKeyGeneration: true);
        var noStampToken = noStampProducer.Generate();
        var cases = new List<TokenCase>();
        var small = seed with { Label = "ValidSmall", Token = smallToken };
        var large = seed with { Label = "ValidLarge", Token = largeToken, UserId = "F109-user-" + new string('u', 8192) };
        cases.Add(small);
        cases.Add(large);
        cases.Add(small with { Label = "ValidWhitespace", Token = Whitespace(smallToken), Origin = "Accepted ASCII whitespace inserted into actual generated token." });
        cases.Add(seed with { Label = "ValidNoStamp", Token = noStampToken, SupportsStamp = false, Stamp = "", StampCalls = 0 });
        TokenCase Malformed(TokenCase origin, string label, string token) => origin with
        {
            Label = label, Token = token, ExpectedResult = false, ProviderEvent = 6, IdCalls = 0, StampCalls = 0,
            UnprotectCalls = 0, MalformedBase64 = true, Origin = "Declared Base64 text mutation of actual generated token."
        };
        var headSmall = Malformed(small, "InvalidHeadSmall", Replace(smallToken, 0, '!'));
        var tailSmall = Malformed(small, "InvalidTailSmall", Replace(smallToken, smallToken.Length - 1, '!'));
        var paddingSmall = Malformed(small, "InvalidPaddingSmall", Replace(smallToken, 4, '='));
        cases.Add(headSmall);
        cases.Add(Malformed(small, "InvalidMiddleSmall", Replace(smallToken, smallToken.Length / 2, '!')));
        cases.Add(tailSmall);
        cases.Add(Malformed(small, "InvalidLengthSmall", smallToken[..^1]));
        cases.Add(paddingSmall);
        cases.Add(Malformed(small, "InvalidNonAsciiSmall", Replace(smallToken, 1, '\u00a0')));
        cases.Add(Malformed(large, "InvalidHeadLarge", Replace(largeToken, 0, '!')));
        cases.Add(Malformed(large, "InvalidTailLarge", Replace(largeToken, largeToken.Length - 1, '!')));
        cases.Add(Malformed(large, "InvalidLengthLarge", largeToken[..^1]));
        cases.Add(headSmall with { Label = "InvalidHeadEnabled", LogEnabled = true });
        cases.Add(tailSmall with { Label = "InvalidTailEnabled", LogEnabled = true });
        var failure = small with { ExpectedResult = false, ProviderEvent = 6, IdCalls = 0, StampCalls = 0 };
        cases.Add(failure with { Label = "Empty", Token = "", Origin = "Explicit empty caller input;real Unprotect receives empty decoded bytes." });
        cases.Add(failure with { Label = "WhitespaceOnly", Token = " \t\r\n ", Origin = "Explicit whitespace-only caller input;real Unprotect receives empty decoded bytes." });
        cases.Add(failure with { Label = "NullOutsideAnnotation", Token = null, UnprotectCalls = 0, Origin = "Explicit null outside the public non-null annotation;original decoder/catch behavior only." });
        var corrupt = Convert.FromBase64String(smallToken);
        corrupt[^1] ^= 1;
        cases.Add(failure with { Label = "UnprotectFailure", Token = Convert.ToBase64String(corrupt),
            Origin = "Declared last protected-byte mutation of an actual generated token;Base64 remains valid." });
        cases.Add(failure with { Label = "ProtectedTruncated", Token = smallProducer.ProtectForFixture([]),
            Origin = "Real public IDataProtector.Protect of explicitly empty parser payload." });
        cases.Add(failure with { Label = "ProtectedTrailing", Token = smallProducer.ProtectForFixture([.. smallPayload, (byte)'X']),
            ProviderEvent = 3, IdCalls = 1, Origin = "Real public protection of actual generated payload plus one trailing ASCII byte." });
        cases.Add(small with { Label = "WrongPurpose", Purpose = Purpose + "-other", ExpectedResult = false,
            ProviderEvent = 2, StampCalls = 0, Origin = "Actual generated token with declared different caller purpose." });
        cases.Add(small with { Label = "WrongUser", UserId = seed.UserId + "-other", ExpectedResult = false,
            ProviderEvent = 1, StampCalls = 0, Origin = "Actual generated token with declared different store user ID." });
        cases.Add(small with { Label = "WrongStamp", Stamp = seed.Stamp + "-other", ExpectedResult = false,
            ProviderEvent = 4, Origin = "Actual generated token with declared different store stamp." });
        cases.Add(small with { Label = "Expired", LifespanTicks = TimeSpan.FromDays(-1).Ticks,
            ExpectedResult = false, ProviderEvent = 0, IdCalls = 0, StampCalls = 0,
            Origin = "Actual generated token with explicit negative configured lifespan;not a sleep/clock race." });
        cases.Add(small with { Label = "ValidEnabled", LogEnabled = true });
        byte[] ReaderPayload(bool invalidLength)
        {
            using var stream = new MemoryStream();
            using var writer = new BinaryWriter(stream, new UTF8Encoding(false, true), leaveOpen: true);
            writer.Write(DateTimeOffset.UtcNow.UtcTicks);
            if (invalidLength)
            {
                writer.Write(new byte[] { 255, 255, 255, 255, 255 });
            }
            else
            {
                writer.Write7BitEncodedInt(1);
                writer.Write((byte)255);
            }
            writer.Flush();

            return stream.ToArray();
        }
        cases.Add(failure with { Label = "ProtectedInvalidUtf8", Token = smallProducer.ProtectForFixture(ReaderPayload(invalidLength: false)),
            Origin = "Real public protection of explicit timestamp/one-byte invalid UTF8 user-ID parser fixture." });
        cases.Add(failure with { Label = "ProtectedMalformedLengthPrefix", Token = smallProducer.ProtectForFixture(ReaderPayload(invalidLength: true)),
            ReaderFormatExceptions = 1, Origin = "Real public protection of explicit timestamp/five-FF 7-bit string-length fixture;reader FormatException remains." });
        cases.Add(small with { Label = "NonEmptyStampWithoutStore", SupportsStamp = false, Stamp = "", StampCalls = 0,
            ExpectedResult = false, ProviderEvent = 5, Origin = "Actual stamped token validated by an explicit store without stamp support." });
        cases.Add(large with { Label = "ValidLargeWhitespace", Token = Whitespace(largeToken),
            Origin = "Accepted ASCII whitespace inserted into actual generated large token." });
        string? paddedToken = null;
        TokenCase? paddedInput = null;
        for (var extra = 0; extra < 64; extra++)
        {
            var input = seed with { Label = "SeedPadded", UserId = seed.UserId + new string('p', extra) };
            using var producer = new Workload(input, directory, allowKeyGeneration: true);
            var token = producer.Generate();
            if (token.EndsWith('='))
            {
                paddedToken = token;
                paddedInput = input;
                break;
            }
        }
        if (paddedToken is null || paddedInput is null)
        {
            throw new InvalidOperationException("A genuinely generated padded fixture was not reached.");
        }
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var last = paddedToken.TrimEnd('=').Length - 1;
        var nonCanonical = Replace(paddedToken, last, alphabet[alphabet.IndexOf(paddedToken[last]) | 1]);
        Evidence.Require(nonCanonical != paddedToken, "The unused-pad-bit mutation did not change the actual token.");
        var unusedPadBitsRejected = false;
        try
        {
            Convert.FromBase64String(nonCanonical);
        }
        catch (FormatException)
        {
            unusedPadBitsRejected = true;
        }
        Evidence.Require(unusedPadBitsRejected, "The actual pinned decoder did not reject nonzero unused pad bits.");
        cases.Add(paddedInput with { Label = "ValidPadded", Token = paddedToken,
            Origin = "Actually generated canonical padded token;normal complete validation must succeed." });
        cases.Add(Malformed(paddedInput, "InvalidUnusedPadBits", nonCanonical) with
        {
            Origin = "Declared nonzero unused-pad-bit mutation of an actually generated padded token;actual pinned Convert decoder rejects it."
        });
        cases.Add(paddingSmall with { Label = "InvalidPaddingEnabled", LogEnabled = true });
        Evidence.Require(cases.Count == Labels.Length && cases.Select(c => c.Label).SequenceEqual(Labels),
            "The declared complete33-case input matrix differs.");
        var inputs = new List<object>();
        foreach (var input in cases)
        {
            if (input.Token is not null && input.MalformedBase64)
            {
                var rejected = false;
                try
                {
                    Convert.FromBase64String(input.Token);
                }
                catch (FormatException)
                {
                    rejected = true;
                }
                Evidence.Require(rejected,
                    "The generated malformed fixture did not reach actual decoder rejection:" + input.Label);
            }
            var file = Path.Combine(directory, "case-inputs", input.Label + ".json");
            File.WriteAllBytes(file, JsonSerializer.SerializeToUtf8Bytes(input, Evidence.JsonOptions));
            inputs.Add(new { label = input.Label, sha256 = Evidence.Hash(file), bytes = new FileInfo(file).Length,
                tokenCharacters = input.Token?.Length });
        }
        var keys = Directory.GetFiles(Path.Combine(directory, "keys"), "*.xml").Order(StringComparer.Ordinal)
            .Select(file => new { name = Path.GetFileName(file), bytes = new FileInfo(file).Length, sha256 = Evidence.Hash(file) }).ToArray();
        var provenance = new
        {
            candidate = "F109", syntheticOnly = true, caseCount = cases.Count, generatedAt = DateTimeOffset.UtcNow,
            generatorOwnerSha256 = Evidence.OwnerSha256, generatorHarnessSha256 = Evidence.HarnessSha256,
            actualPublicManagerGenerateUsed = true, actualPublicDataProtectionUsed = true,
            actualProtectorType = smallProducer.ActualProtectorType, inputs, keys,
            generatedSeeds = new { smallToken, largeToken, noStampToken, paddedToken },
            privateKeyBytesMustNotBePublished = true, normalGeneratedLifespanDays = 1,
            replayBoundary = "Both frozen variants must consume these exact inputs/isolated keys before normal generated expiry. Historical keys omitted publicly;fresh reproduction regenerates one shared fixture for both variants,not identical random historical ciphertext."
        };
        File.WriteAllBytes(Path.Combine(directory, "provenance.json"), JsonSerializer.SerializeToUtf8Bytes(provenance, Evidence.JsonOptions));
        Verify(directory);
        Console.WriteLine("F109 actual public generated/protected33-case synthetic fixture created;paired exact bytes/isolated keys retained locally.");
    }

    private static string Replace(string value, int index, char replacement) =>
        string.Concat(value.AsSpan(0, index), replacement.ToString(), value.AsSpan(index + 1));

    private static string Whitespace(string token)
    {
        var output = new StringBuilder(token.Length + token.Length / 4);
        for (var index = 0; index < token.Length; index++)
        {
            output.Append(token[index]);
            if ((index + 1) % 16 == 0)
            {
                output.Append(" \t\r\n");
            }
        }

        return output.ToString();
    }
}
