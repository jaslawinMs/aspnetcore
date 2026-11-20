using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Security.Cryptography;
using System.Text.Json;

if (args.Length is < 2 or > 3)
{
    Console.Error.WriteLine("Usage: MetadataAudit <managed-image> <portable-pdb> [source-root]");
    return 2;
}

var imagePath = Path.GetFullPath(args[0]);
var pdbPath = Path.GetFullPath(args[1]);
using var imageStream = File.OpenRead(imagePath);
using var pe = new PEReader(imageStream);
var metadata = pe.GetMetadataReader();
var codeViews = pe.ReadDebugDirectory()
    .Where(entry => entry.Type == DebugDirectoryEntryType.CodeView)
    .Select(entry =>
    {
        var data = pe.ReadCodeViewDebugDirectoryData(entry);
        return new { guid = data.Guid, stamp = entry.Stamp, age = data.Age, path = data.Path };
    }).ToArray();
using var pdbStream = File.OpenRead(pdbPath);
using var pdbProvider = MetadataReaderProvider.FromPortablePdbStream(pdbStream);
var pdb = pdbProvider.GetMetadataReader();
var pdbId = new BlobContentId(pdb.DebugMetadataHeader!.Id);
var documents = new List<object>();
var associated = 0;
var mismatches = 0;
foreach (var handle in pdb.Documents)
{
    var document = pdb.GetDocument(handle);
    var name = pdb.GetString(document.Name);
    var algorithm = pdb.GetGuid(document.HashAlgorithm);
    var recordedHash = pdb.GetBlobBytes(document.Hash);
    string? rawPath = null;
    if (args.Length == 3)
    {
        var root = Path.GetFullPath(args[2]);
        var normalized = name.Replace('\\', '/');
        if (normalized.StartsWith("/_/", StringComparison.Ordinal))
        {
            rawPath = Path.Combine(root, normalized[3..].Replace('/', Path.DirectorySeparatorChar));
        }
        else if (Path.IsPathFullyQualified(name) && File.Exists(name))
        {
            rawPath = name;
        }
        else
        {
            rawPath = Path.Combine(root, normalized.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        }
    }

    string? actualHash = null;
    bool? rawChecksumMatches = null;
    if (rawPath is not null && File.Exists(rawPath))
    {
        var bytes = File.ReadAllBytes(rawPath);
        byte[]? hash = algorithm.ToString() switch
        {
            "8829d00f-11b8-4213-878b-770e8597ac16" => SHA256.HashData(bytes),
            "ff1816ec-aa5e-4d10-87f7-6f4963833460" => SHA1.HashData(bytes),
            _ => null
        };
        if (hash is not null)
        {
            associated++;
            actualHash = Convert.ToHexString(hash);
            rawChecksumMatches = hash.AsSpan().SequenceEqual(recordedHash);
            if (rawChecksumMatches is false)
            {
                mismatches++;
            }
        }
    }
    documents.Add(new { name, algorithm, recordedHash = Convert.ToHexString(recordedHash), rawPath, actualHash, rawChecksumMatches });
}

var codeViewMatchesPdb = codeViews.Any(entry => entry.guid == pdbId.Guid && entry.stamp == pdbId.Stamp);
var result = new
{
    imagePath,
    imageSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(imagePath))),
    mvid = metadata.GetGuid(metadata.GetModuleDefinition().Mvid),
    pdbPath,
    pdbSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(pdbPath))),
    codeViews,
    pdbIdentity = new { guid = pdbId.Guid, stamp = pdbId.Stamp },
    codeViewMatchesPdb,
    associatedRawDocumentCount = associated,
    rawDocumentMismatchCount = mismatches,
    documentCount = documents.Count,
    documents,
    boundary = "Metadata-only PE/PDB/raw-document association. Not full compiler, build, or broader materialization attestation."
};
Console.WriteLine(JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }));
return codeViewMatchesPdb && mismatches == 0 ? 0 : 1;
