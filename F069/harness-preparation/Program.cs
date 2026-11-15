using System.Reflection;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using AutoPerf;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Server.Kestrel.Core;

using var key = RSA.Create(2048);
var request = new CertificateRequest("CN=F069-loopback", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
request.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(new OidCollection { new("1.3.6.1.5.5.7.3.1") }, false));
using var generated = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(1));
// Schannel needs a PKCS#12 reload rather than CreateSelfSigned's ephemeral key.
using var certificate = X509CertificateLoader.LoadPkcs12(generated.Export(X509ContentType.Pkcs12), password: null, keyStorageFlags: X509KeyStorageFlags.DefaultKeySet);
CertificateSource.Current = certificate;
OwnerProbe.Verify();
if (args is ["--verify-contracts", var output])
{
    var contracts = CaseSpec.All.Select(spec =>
    {
        using var fixture = new SniFixture(spec);
        return fixture.Verify();
    }).ToArray();
    File.WriteAllText(output, JsonSerializer.Serialize(contracts));
    foreach (var contract in contracts)
    {
        Console.WriteLine("AUTOPERF_CONTRACT " + JsonSerializer.Serialize(contract));
    }
}
else if (args is ["--verify-tls", var tlsOutput])
{
    var contracts = await TlsProbe.VerifyAsync();
    File.WriteAllText(tlsOutput, JsonSerializer.Serialize(contracts));
}
else
{
    BenchmarkSwitcher.FromAssembly(Assembly.GetExecutingAssembly()).Run(args);
}

internal static class CertificateSource
{
    public static X509Certificate2 Current { get; set; } = null!;
}

internal static class OwnerProbe
{
    public static void Verify()
    {
        var owner = typeof(KestrelServerOptions).Assembly;
        var expected = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "Microsoft.AspNetCore.Server.Kestrel.Core.dll"));
        if (!string.Equals(Path.GetFullPath(owner.Location), expected, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("The actual Kestrel.Core owner must be beside the frozen harness.");
        }
        Console.WriteLine("AUTOPERF_OWNER " + JsonSerializer.Serialize(new
        {
            assembly = owner.FullName,
            sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(owner.Location))),
            actual_shipping_owner_beside_harness = true,
            actual_certificate_configuration_loader_no_recording_proxy = true,
            reflection_only_prepares_constructor_and_typed_delegate_outside_timing = true,
            installed_aspnet_framework_fallback = false
        }));
    }
}
