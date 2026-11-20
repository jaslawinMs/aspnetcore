using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

if (args is not [var caseRoot, var output])
{
    throw new ArgumentException("Expected: <case-root> <output.json>. This is untimed source analysis.");
}

using var records = JsonDocument.Parse(File.ReadAllText(Path.Combine(caseRoot, "retained-snapshot-findings.json")));
var options = CSharpParseOptions.Default.WithLanguageVersion(LanguageVersion.CSharp13);
var results = new List<Observation>();
var exclusions = new List<object>();
foreach (var role in new[] { "Original", "Default" })
{
    var sourceRoot = Path.Combine(caseRoot, "alias-source", role);
    var emitterText = File.ReadAllText(Path.Combine(sourceRoot, @"src\OpenApi\gen\XmlCommentGenerator.Emitter.cs"));
    var emitter = Parse(emitterText);
    var producer = emitter.GetRoot().DescendantNodes().OfType<MethodDeclarationSyntax>()
        .Single(method => method.Identifier.ValueText == "GenerateXmlCommentSupportSource");
    var expression = producer.ExpressionBody?.Expression as InterpolatedStringExpressionSyntax ??
        throw new InvalidOperationException("The owning generator no longer returns an interpolated literal.");
    var chunks = expression.Contents.OfType<InterpolatedStringTextSyntax>().ToArray();
    foreach (var record in records.RootElement.EnumerateArray())
    {
        var id = record.GetProperty("id").GetString()!;
        var finding = record.GetProperty("finding");
        var file = finding.GetProperty("file").GetString()!;
        var firstLine = finding.GetProperty("line_start").GetInt32();
        var lastLine = finding.GetProperty("line_end").GetInt32();
        var snippet = finding.GetProperty("snippet").GetString()!;
        var source = File.ReadAllText(Path.Combine(sourceRoot, file.Replace('/', '\\')));
        var tree = Parse(source);
        var text = tree.GetText();
        var first = text.Lines[firstLine - 1].Start;
        var last = text.Lines[lastLine - 1].End;
        var span = Microsoft.CodeAnalysis.Text.TextSpan.FromBounds(first, last);
        var method = tree.GetRoot().DescendantNodes().OfType<MethodDeclarationSyntax>()
            .Where(node => node.FullSpan.Contains(span)).OrderBy(node => node.Span.Length).FirstOrDefault();
        if (method is null)
        {
            exclusions.Add(new { Role = role, FindingId = id, Reason = "The reported span is not inside one actual method." });
            continue;
        }
        var methodText = method.ToString().Replace("\r\n", "\n");
        var normalizedSnippet = Normalize(snippet);
        var normalizedMethod = Normalize(methodText);
        var firstOccurrence = normalizedMethod.IndexOf(normalizedSnippet, StringComparison.Ordinal);
        var uniqueSnippet = firstOccurrence >= 0 &&
            normalizedMethod.IndexOf(normalizedSnippet, firstOccurrence + normalizedSnippet.Length, StringComparison.Ordinal) < 0;
        var actualSpan = source[first..last];
        var matchingChunks = chunks.Where(chunk => chunk.TextToken.ValueText.Replace("\r\n", "\n").Contains(methodText, StringComparison.Ordinal)).ToArray();
        if (!Normalize(actualSpan).Contains(normalizedSnippet, StringComparison.Ordinal) || !uniqueSnippet || matchingChunks.Length != 1)
        {
            exclusions.Add(new
            {
                Role = role, FindingId = id, Reason = "Exact reported-span, unique-snippet or whole-method producer-literal proof was not established.",
                ActualSpan = actualSpan, UniqueSnippetInMethod = uniqueSnippet, MatchingProducerLiteralChunks = matchingChunks.Length,
            });
            continue;
        }
        var tokenText = string.Join("\u001f", method.DescendantTokens().Select(token => token.RawKind + ":" + token.Text));
        var chunk = matchingChunks[0];
        results.Add(new Observation(id, role, finding.GetProperty("card_id").GetString()!, file, firstLine, lastLine,
            actualSpan, snippet, normalizedSnippet, method.Ancestors().OfType<TypeDeclarationSyntax>().First().Identifier.ValueText,
            method.Identifier.ValueText, method.ParameterList.ToString(), method.GetLocation().GetLineSpan().StartLinePosition.Line + 1,
            method.GetLocation().GetLineSpan().EndLinePosition.Line + 1, Hash(tokenText), Hash(methodText),
            chunk.GetLocation().GetLineSpan().StartLinePosition.Line + 1, chunk.GetLocation().GetLineSpan().EndLinePosition.Line + 1,
            Hash(chunk.TextToken.ValueText)));
    }
}

var original = results.Where(row => row.Role is "Original").ToArray();
var accepted = original.Where(row =>
{
    var other = results.SingleOrDefault(candidate => candidate.FindingId == row.FindingId && candidate.Role is "Default");
    return other is not null && other.MethodTokenSha256 == row.MethodTokenSha256 && other.NormalizedSnippet == row.NormalizedSnippet &&
        other.ContainingType == row.ContainingType && other.Card == row.Card;
}).ToArray();
var groups = accepted.GroupBy(row => (row.Card, row.ContainingType, row.MethodTokenSha256, row.NormalizedSnippet))
    .Where(group => group.Count() > 1)
    .Select(group => group.OrderBy(row => int.Parse(row.FindingId.AsSpan(1))).ToArray())
    .Select(group => new
    {
        CanonicalFindingId = group[0].FindingId,
        AliasFindingIds = group.Skip(1).Select(row => row.FindingId).ToArray(),
        group[0].Card, group[0].ContainingType, group[0].ContainingMethod, group[0].ParameterList,
        group[0].MethodTokenSha256, group[0].NormalizedSnippet,
        ActualProducer = "XmlCommentGenerator.GenerateXmlCommentSupportSource",
        ActualWholeMethodMatchedOwningProducerLiteral = true,
        ActualOriginalDefaultMethodIdentityVerified = true,
        ActualCanonicalFindingRemainsPending = true,
        ActualDistinctFixtureDataNotEquated = true,
        ActualRuntimeOrPerformanceEquivalenceNotClaimed = true,
    }).ToArray();
var report = new
{
    ActualTiming = false,
    ActualMethodIdentityIsSourceEvidenceOnly = true,
    ActualMethodTokenIdentityIncludesTokenKindAndTextButExcludesTrivia = true,
    ActualNoRuntimeReachabilityOrImprovementClaim = true,
    ActualInputFindings = records.RootElement.GetArrayLength(),
    ActualMappedRoleObservations = results.Count,
    ActualOriginalDefaultVerifiedFindings = accepted.Length,
    ActualAliasGroups = groups.Length,
    ActualAliases = groups.Sum(group => group.AliasFindingIds.Length),
    Groups = groups,
    Observations = results,
    Exclusions = exclusions,
};
File.WriteAllText(output, JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }) + Environment.NewLine);
Console.WriteLine(JsonSerializer.Serialize(new { report.ActualInputFindings, report.ActualMappedRoleObservations,
    report.ActualOriginalDefaultVerifiedFindings, report.ActualAliasGroups, report.ActualAliases, ActualExclusions = exclusions.Count, report.ActualTiming }));
return 0;

SyntaxTree Parse(string source)
{
    var tree = CSharpSyntaxTree.ParseText(source, options);
    var failures = tree.GetDiagnostics().Where(diagnostic => diagnostic.Severity is DiagnosticSeverity.Error).ToArray();
    if (failures.Length != 0)
    {
        throw new InvalidOperationException(string.Join(Environment.NewLine, failures.Select(failure => failure.ToString())));
    }

    return tree;
}

static string Normalize(string source) => string.Join(" ", source.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
static string Hash(string source) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(source)));

internal sealed record Observation(string FindingId, string Role, string Card, string SourceFile, int ReportedFirstLine, int ReportedLastLine,
    string ActualReportedSpan, string OriginalSnippet, string NormalizedSnippet, string ContainingType, string ContainingMethod, string ParameterList,
    int MethodFirstLine, int MethodLastLine, string MethodTokenSha256, string MethodTextSha256, int ActualProducerLiteralFirstLine,
    int ActualProducerLiteralLastLine, string ActualProducerLiteralValueTextSha256);
