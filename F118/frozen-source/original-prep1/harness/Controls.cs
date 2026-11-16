using System.Collections;
using System.Globalization;
using System.Reflection;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Razor.TagHelpers;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Microsoft.Extensions.DependencyInjection;

namespace AutoPerf;

internal static class Controls
{
    internal static object RenderContracts()
    {
        var rows = new List<object>();
        var http = new DefaultHttpContext();
        http.Request.PathBase = "/app&root";
        var helper = new UrlResolutionTagHelper(new UrlHelperFactory(), HtmlEncoder.Default)
        {
            ViewContext = new ViewContext { HttpContext = http, RouteData = new(), ActionDescriptor = new(), Writer = TextWriter.Null }
        };
        string Render(IHtmlContent content, string name = "href")
        {
            var output = new TagHelperOutput("a", new TagHelperAttributeList { { name, content } }, (_, _) => throw new InvalidOperationException("No child content expected."));
            helper.Process(new TagHelperContext("a", [], new Dictionary<object, object>(), "F118-control"), output);
            using var writer = new StringWriter(CultureInfo.InvariantCulture);
            output.Attributes[0].WriteTo(writer, HtmlEncoder.Default);

            return writer.ToString();
        }
        foreach (var culture in new[] { "en-US", "fr-FR", "tr-TR" })
        {
            var previous = CultureInfo.CurrentCulture;
            try
            {
                CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo(culture);
                var content = new DecimalContent();
                var actual = Render(content);
                var expected = "href=\"/" + 1234.5m.ToString(CultureInfo.CurrentCulture) + "\"";
                Evidence.Require(actual == expected && content.FormatProviderName == culture && content.NewLineAtEntry == Environment.NewLine &&
                    content.WriterType == typeof(StringWriter).FullName, "Per-call actual writer culture/type/newline semantics changed.");
                rows.Add(new { name = "culture", culture, actual, content.FormatProviderName, content.NewLineAtEntry, content.WriterType });
            }
            finally
            {
                CultureInfo.CurrentCulture = previous;
            }
        }
        var bad = new ThrowingContent();
        var threw = false;
        try
        {
            Render(bad);
        }
        catch (ProbeException)
        {
            threw = true;
        }
        Evidence.Require(threw && bad.Writer is not null, "Real content producer must have written then thrown.");
        var disposed = false;
        try
        {
            bad.Writer!.Write("after-disposal");
        }
        catch (ObjectDisposedException)
        {
            disposed = true;
        }
        var clean = Render(new DefaultTagHelperContent().SetHtmlContent("/clean"));
        var afterThrow = new DecimalContent();
        Render(afterThrow);
        Evidence.Require(disposed && clean == "href=\"/clean\"" && afterThrow.NewLineAtEntry == Environment.NewLine,
            "Exception must dispose its writer and never contaminate the next real render/newline.");
        rows.Add(new { name = "throw-partial-then-clean", actualException = typeof(ProbeException).FullName, disposed, clean, nextWriterNewLine = afterThrow.NewLineAtEntry });
        var reentrant = new ReentrantContent(() => Render(new DefaultTagHelperContent().SetHtmlContent("/inner")));
        var outer = Render(reentrant);
        Evidence.Require(outer == "href=\"/before|href=\"/inner\"|after\"", "Nested actual Process must not reuse/contaminate an actively borrowed builder.");
        rows.Add(new { name = "reentrant-real-process", actual = outer });
        foreach (var payload in new[] { " \t~/a&amp;b\r\n", "/already&amp;encoded", "\u000C~/x\u00E9\t" })
        {
            var result = Render(new DefaultTagHelperContent().SetHtmlContent(payload));
            var trimmed = payload.Trim('\t', '\n', '\f', '\r', ' ');
            var expected = trimmed.StartsWith("~/", StringComparison.Ordinal) ? "/app&amp;root/" + trimmed[2..] : payload;
            Evidence.Require(result == "href=\"" + expected + "\"", "Typed general HTML whitespace/once-encoding contract differs.");
            rows.Add(new { name = "general-content-whitespace-encoding", payload, actual = result });
        }
        using var services = new ServiceCollection().AddLogging().AddRouting().BuildServiceProvider();
        http.RequestServices = services;
        http.SetEndpoint(new Endpoint(_ => Task.CompletedTask,
            new EndpointMetadataCollection(new ResourceAssetCollection([new ResourceAsset("a.fingerprint.js", [new ResourceAssetProperty("label", "a.js")])])), "F118-assets"));
        http.Items.Remove(typeof(Microsoft.AspNetCore.Mvc.IUrlHelper));
        var versioned = Render(new DefaultTagHelperContent().SetHtmlContent("~/a.js"));
        Evidence.Require(versioned == "href=\"/app&amp;root/a.fingerprint.js\"", "Real endpoint metadata/URL factory must produce the versioned URL.");
        rows.Add(new { name = "real-resource-asset-collection", actual = versioned });

        return new { rows = rows.ToArray(), writerBorrowedSynchronously = true,
            postDisposalBuilderOwnershipOrFreshCapacityPromiseClaimed = false,
            lowerBoundary = "Actual public Process/real content callbacks/real URL factory and endpoint metadata,not network/full-page behavior." };
    }

    internal static object PoolState()
    {
        var field = typeof(UrlResolutionTagHelper).GetField("StringBuilderPool", BindingFlags.Static | BindingFlags.NonPublic);
        var pool = field?.GetValue(null);
        if (pool is null)
        {
            return new { present = false, slots = Array.Empty<object>(), note = "Original helper has no static pooled-builder field." };
        }
        var type = pool.GetType();
        var builders = new List<StringBuilder>();
        if (type.GetField("_fastItem", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(pool) is StringBuilder first)
        {
            builders.Add(first);
        }
        foreach (var value in (IEnumerable)type.GetField("_items", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(pool)!)
        {
            builders.Add((StringBuilder)value);
        }
        var slots = builders.Select(builder => new { length = builder.Length, capacity = builder.Capacity }).ToArray();
        Evidence.Require(slots.All(slot => slot.length == 0 && slot.capacity <= 4096), "Returned actual pooled buffers must be cleared and bounded by existing policy.");

        return new { present = true, poolType = type.FullName, slots,
            initializedPoolReadIsNotBeforeTypeInitializerAllocation = true, privateWrites = false,
            note = "Immediate materialized read-only retained-state snapshot after producers stop;not total heap size or continuous lifetime tracing." };
    }

    private sealed class DecimalContent : IHtmlContent
    {
        internal string? WriterType { get; private set; }
        internal string? FormatProviderName { get; private set; }
        internal string? NewLineAtEntry { get; private set; }
        public void WriteTo(TextWriter writer, HtmlEncoder encoder)
        {
            WriterType = writer.GetType().FullName;
            FormatProviderName = (writer.FormatProvider as CultureInfo)?.Name;
            NewLineAtEntry = writer.NewLine;
            writer.Write('/');
            writer.Write(1234.5m);
        }
    }
    private sealed class ProbeException : Exception
    {
    }
    private sealed class ThrowingContent : IHtmlContent
    {
        internal TextWriter? Writer { get; private set; }
        public void WriteTo(TextWriter writer, HtmlEncoder encoder)
        {
            Writer = writer;
            writer.NewLine = "changed";
            writer.Write("/partial-residue");
            throw new ProbeException();
        }
    }
    private sealed class ReentrantContent(Func<string> nested) : IHtmlContent
    {
        public void WriteTo(TextWriter writer, HtmlEncoder encoder)
        {
            writer.Write("/before|");
            writer.Write(nested());
            writer.Write("|after");
        }
    }
}
