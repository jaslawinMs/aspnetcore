using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace AutoPerf;

[MemoryDiagnoser]
public class CookieDeleteBenchmark
{
    [ParamsSource(nameof(Cases))]
    public CookieRecipe Recipe { get; set; } = null!;

    public IEnumerable<CookieRecipe> Cases => Corpus.Cases;

    private CookieWorkload _workload = null!;

    [GlobalSetup]
    public void Setup()
    {
        _workload = new CookieWorkload(Recipe);
        Contracts.VerifyOriginal(Contracts.VerifyTwice(_workload));
    }

    [Benchmark]
    public int Delete() => _workload.Execute();
}

public sealed record CookieRecipe(
    string Name, int Chunks = 0, int Unrelated = 0, bool Related = true,
    string Options = "None", string Variant = "Generated", bool LongName = false,
    bool DefaultSize = false)
{
    public override string ToString() => Name;
}

internal static class Corpus
{
    public static readonly CookieRecipe[] Cases =
    [
        new("EmptyResponse_Base", Related: false),
        new("EmptyResponse_Chunks4", 4, Related: false),
        new("Unrelated1_Base", Unrelated: 1, Related: false),
        new("Unrelated16_Base", Unrelated: 16, Related: false),
        new("Unrelated128_Base", Unrelated: 128, Related: false),
        new("Related_Base"),
        new("Related_Chunks2", 2),
        new("Related_Chunks4", 4),
        new("Related_Chunks16", 16),
        new("Related_Chunks64", 64),
        new("Mixed16_Chunks4", 4, 16),
        new("Mixed128_Chunks16", 16, 128),
        new("Mixed128_Chunks64", 64, 128),
        new("NearMiss16_Chunks4", 4, 16, Variant: "NearMiss"),
        new("NearMiss128_Chunks16", 16, 128, Variant: "NearMiss"),
        new("NearMiss128_Chunks64", 64, 128, Variant: "NearMiss"),
        new("AlternateCase_Chunks16", 16, Variant: "AlternateCase"),
        new("LongName_Chunks16", 16, LongName: true),
        new("LongNameMixed128_Chunks64", 64, 128, LongName: true),
        new("DefaultSize_Chunks4", 4, DefaultSize: true),
        new("DefaultSizeMixed16_Chunks16", 16, 16, DefaultSize: true),
        new("Domain_Chunks4", 4, Options: "Domain"),
        new("Domain_Chunks16", 16, Options: "Domain"),
        new("Path_Chunks4", 4, Options: "Path"),
        new("Path_Chunks16", 16, Options: "Path"),
        new("DomainBeforePath_Chunks4", 4, Options: "DomainPath", Variant: "OtherPath"),
        new("DomainMismatch_Chunks4", 4, Options: "Domain", Variant: "OtherDomain"),
        new("PathMismatch_Chunks4", 4, Options: "Path", Variant: "OtherPath"),
        new("MissingFirst_Chunks4", 4, Variant: "MissingFirst"),
        new("MissingMiddle_Chunks4", 4, Variant: "MissingMiddle"),
        new("EmptyMiddle_Chunks4", 4, Variant: "EmptyMiddle"),
        new("ExtraProbe_Chunks4", 4, Variant: "ExtraProbe"),
        new("CanonicalSuffixNoise_Chunks4", 4, Variant: "SuffixNoise"),
        new("NameEndingC1_Chunks4", 4, Variant: "NameEndingC1"),
        new("CallerNameEquals", Variant: "NameEquals"),
        new("CallerNameEmpty", Variant: "NameEmpty"),
        new("CallerNullHeader", Variant: "NullHeader"),
        new("CallerNumericNoise_Chunks4", 4, Variant: "RawDigits"),
        new("CallerMissingEquals_Chunks4", 4, Variant: "MissingEquals"),
        new("CallerLooseAttributes_Chunks4", 4, Options: "DomainPath", Variant: "LooseAttributes"),
    ];
}

internal sealed class CookieWorkload
{
    private readonly CookieRecipe _recipe;
    private readonly ChunkingCookieManager _manager = new();
    private readonly string _key;
    private readonly CookieOptions _options;
    private readonly string[] _produced;
    private readonly string _requestHeader;
    private readonly string?[] _initialHeaders;
    private readonly string _scope;
    private readonly int _observedProducedChunks;

    public CookieWorkload(CookieRecipe recipe)
    {
        _recipe = recipe;
        _key = recipe.Variant switch
        {
            "NameEquals" => "Target=Cookie",
            "NameEmpty" => string.Empty,
            "NameEndingC1" => "TargetCookieC1",
            _ => recipe.LongName ? "Target_" + new string('n', 160) : "TargetCookie"
        };
        _options = CreateOptions(recipe.Options);
        _scope = recipe.Variant is "NameEquals" or "NameEmpty" or "NullHeader" or "RawDigits" or "MissingEquals" or "LooseAttributes"
            ? "Caller-owned header/name diagnostic;actual DeleteCookie and response append error boundary"
            : "Actual chunk append producer/request cookie parser/response append/delete header boundary";

        if (recipe.Variant is "NameEquals" or "NameEmpty")
        {
            _produced = [];
            _requestHeader = string.Empty;
            _initialHeaders = [_key + "=value; path=/", "Unrelated=value; path=/"];
            return;
        }

        var producerOptions = CreateOptions(recipe.Options);
        var chunkSize = recipe.DefaultSize ? ChunkingCookieManager.DefaultChunkSize : recipe.LongName ? 512 : 128;
        var producer = new ChunkingCookieManager { ChunkSize = chunkSize };
        var template = new DefaultHttpContext();
        template.Response.Cookies.Append(_key, string.Empty, producerOptions);
        var templateLength = template.Response.Headers.SetCookie[0]!.Length;
        var dataPerCookie = chunkSize - templateLength - 3;
        var payload = recipe.Chunks == 0 ? "payload" : new string('v', checked(recipe.Chunks * dataPerCookie));
        var previous = new DefaultHttpContext();
        producer.AppendResponseCookie(previous, _key, payload, producerOptions);
        _produced = previous.Response.Headers.SetCookie.Select(value => value!).ToArray();
        var parsed = _produced.Select(value => SetCookieHeaderValue.Parse(value)).ToList();
        _observedProducedChunks = parsed.Count - 1;
        if (_observedProducedChunks != recipe.Chunks ||
            recipe.Chunks > 0 && parsed[0].Value.ToString() != "chunks-" + recipe.Chunks.ToString(CultureInfo.InvariantCulture))
        {
            throw new InvalidOperationException("Actual append producer did not create the requested chunk corpus.");
        }

        if (recipe.Variant == "ExtraProbe")
        {
            previous.Response.Headers.SetCookie = StringValues.Empty;
            previous.Response.Cookies.Append(_key + "C" + (recipe.Chunks + 1).ToString(CultureInfo.InvariantCulture), "extra", producerOptions);
            parsed.Add(SetCookieHeaderValue.Parse(previous.Response.Headers.SetCookie[0]!));
        }
        var requestPairs = parsed.Select(cookie => KeyValuePair.Create(cookie.Name.ToString(), cookie.Value.ToString())).ToList();
        if (recipe.Variant is "MissingFirst" or "MissingMiddle" or "EmptyMiddle")
        {
            var affected = _key + (recipe.Variant == "MissingFirst" ? "C1" : "C2");
            var index = requestPairs.FindIndex(pair => pair.Key == affected);
            if (index < 0)
            {
                throw new InvalidOperationException("Actual producer missing the intended partial-request chunk.");
            }
            if (recipe.Variant == "EmptyMiddle")
            {
                requestPairs[index] = KeyValuePair.Create(affected, string.Empty);
            }
            else
            {
                requestPairs.RemoveAt(index);
            }
        }
        _requestHeader = string.Join("; ", requestPairs.Select(pair => pair.Key + "=" + pair.Value));

        var current = new DefaultHttpContext();
        if (recipe.Related)
        {
            var relatedOptions = CreateOptions(recipe.Options);
            if (recipe.Variant == "OtherDomain")
            {
                relatedOptions.Domain = "other.example";
            }
            if (recipe.Variant == "OtherPath")
            {
                relatedOptions.Path = "/other";
            }
            if (recipe.Variant == "AlternateCase")
            {
                foreach (var cookie in parsed)
                {
                    current.Response.Cookies.Append(cookie.Name.ToString().ToLowerInvariant(), cookie.Value.ToString(), relatedOptions);
                }
            }
            else
            {
                producer.AppendResponseCookie(current, _key, payload, relatedOptions);
            }
            if (recipe.Variant == "ExtraProbe")
            {
                current.Response.Cookies.Append(_key + "C" + (recipe.Chunks + 1).ToString(CultureInfo.InvariantCulture), "extra", relatedOptions);
            }
        }
        for (var i = 0; i < recipe.Unrelated; i++)
        {
            var name = recipe.Variant == "NearMiss" ? _key + "Similar_" + i.ToString(CultureInfo.InvariantCulture)
                : "Unrelated_" + i.ToString(CultureInfo.InvariantCulture);
            current.Response.Cookies.Append(name, "unrelated", producerOptions);
        }
        if (recipe.Variant == "SuffixNoise")
        {
            foreach (var suffix in new[] { "C01", "C00", "C+1", "C0", "C5", "C2147483648", "C111111111111111111111", "C1Tail" })
            {
                current.Response.Cookies.Append(_key + suffix, "noise", producerOptions);
            }
        }
        var headers = current.Response.Headers.SetCookie.Select(value => value).ToList();
        if (recipe.Variant == "NullHeader")
        {
            headers.Add(null);
        }
        if (recipe.Variant == "RawDigits")
        {
            headers.Add(_key + "C1\0=raw");
            headers.Add(_key + "C1\u0661=raw");
            headers.Add(_key + "C1 =raw");
        }
        if (recipe.Variant == "MissingEquals")
        {
            headers.Add(_key);
            headers.Add(_key + "C1");
            headers.Add(_key + "C=malformed");
        }
        if (recipe.Variant == "LooseAttributes")
        {
            headers.Add(_key + "=raw; notdomain=example.test; path=/other");
            headers.Add(_key + "C1=raw; DOMAIN=EXAMPLE.TEST.suffix; path=/other");
        }
        _initialHeaders = headers.ToArray();
    }

    public int Execute()
    {
        var context = CreateContext();
        var error = Delete(context);
        var values = context.Response.Headers.SetCookie;
        var result = values.Count + (error?.GetType().FullName?.Length ?? 0);
        foreach (var value in values)
        {
            result = unchecked(result * 31 + (value?.Length ?? 0));
        }
        return result;
    }

    public CookieContract Capture()
    {
        var context = CreateContext();
        var error = Delete(context);
        var requestCookies = context.Request.Cookies;
        return new CookieContract(
            _recipe.Name, _scope, _key, _recipe.Chunks, _observedProducedChunks,
            _produced, _requestHeader, _initialHeaders, context.Response.Headers.SetCookie.ToArray(),
            requestCookies.Select(pair => pair.Key + "=" + pair.Value).ToArray(),
            requestCookies.GetType().FullName!, context.Response.Cookies.GetType().FullName!,
            error?.GetType().FullName, error?.Message);
    }

    private DefaultHttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.Cookie = _requestHeader;
        context.Response.Headers.SetCookie = new StringValues(_initialHeaders);
        return context;
    }

    private Exception? Delete(DefaultHttpContext context)
    {
        try
        {
            _manager.DeleteCookie(context, _key, _options);
            if (_recipe.Variant == "NullHeader")
            {
                throw new InvalidOperationException("Expected caller-owned null-header diagnostic failure was not produced: " + _recipe.Name);
            }
            return null;
        }
        catch (ArgumentException exception) when (_recipe.Variant is "NameEquals" or "NameEmpty")
        {
            return exception;
        }
        catch (NullReferenceException exception) when (_recipe.Variant == "NullHeader")
        {
            return exception;
        }
    }

    private static CookieOptions CreateOptions(string profile) => new()
    {
        Path = profile is "Path" or "DomainPath" ? "/path" : null,
        Domain = profile is "Domain" or "DomainPath" ? "example.test" : null,
        HttpOnly = true,
        Secure = true,
        SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax,
        MaxAge = TimeSpan.FromMinutes(5),
        Extensions = { "extension" }
    };
}

internal sealed record CookieContract(
    string Case, string Scope, string Key, int RequestedChunks, int ActualProducedChunks,
    string[] ProducedSetCookie, string RequestCookieHeader, string?[] InitialSetCookie,
    string?[] FinalSetCookie, string[] RequestCookieEntries,
    string RequestCookieCollectionType, string ResponseCookiesType,
    string? ErrorType, string? ErrorMessage);

internal static class OwnerProbe
{
    public static void Verify()
    {
        var assembly = typeof(ChunkingCookieManager).Assembly;
        var expected = Path.Combine(AppContext.BaseDirectory, "Microsoft.AspNetCore.Authentication.Cookies.dll");
        if (!Path.GetFullPath(assembly.Location).Equals(Path.GetFullPath(expected), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Frozen current-repo public cookie owner was not loaded.");
        }
        Console.WriteLine("AUTOPERF_OWNER " + JsonSerializer.Serialize(new
        {
            assembly.Location, Mvid = assembly.ManifestModule.ModuleVersionId,
            SHA256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location)))
        }));
    }
}

internal static class Contracts
{
    public static CookieContract VerifyTwice(CookieWorkload workload)
    {
        var first = workload.Capture();
        var second = workload.Capture();
        if (JsonSerializer.Serialize(first) != JsonSerializer.Serialize(second))
        {
            throw new InvalidOperationException("Repeated complete cookie output/state/error contract differs.");
        }
        return first;
    }

    public static void VerifyOriginal(CookieContract contract)
    {
        var all = JsonSerializer.Deserialize<CookieContract[]>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "contract-oracles.json")))
            ?? throw new InvalidOperationException("Original cookie contract corpus absent.");
        var expected = all.Single(row => row.Case == contract.Case);
        if (JsonSerializer.Serialize(expected) != JsonSerializer.Serialize(contract))
        {
            throw new InvalidOperationException("Complete cookie producer/output/caller-input contract differs from original.");
        }
    }
}
