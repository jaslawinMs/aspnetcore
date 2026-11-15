// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using System.Text.Unicode;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Moq;

namespace Microsoft.AspNetCore.StaticFiles;

public class HtmlDirectoryFormatterTests
{
    [Theory]
    [InlineData("Root")]
    [InlineData("SeparatorsOnly")]
    [InlineData("Single")]
    [InlineData("Two")]
    [InlineData("MissingTrailing")]
    [InlineData("Repeated")]
    [InlineData("PathBase")]
    [InlineData("PathBaseTrailing")]
    [InlineData("PathBaseRepeated")]
    [InlineData("Spaces")]
    [InlineData("Attributes")]
    [InlineData("Unicode")]
    [InlineData("PercentLiteral")]
    [InlineData("LongSegment")]
    [InlineData("ManySegments")]
    [InlineData("UnpairedSurrogates")]
    public async Task GenerateContentAsync_DefaultEncoderPreservesBreadcrumbs(string scenario)
    {
        var (pathBase, path, segments) = GetScenario(scenario);
        var (context, bytes, contents, provider) = await Render(pathBase, path, HtmlEncoder.Default);
        var body = Encoding.UTF8.GetString(bytes);
        var header = Regex.Match(body, @"<header><h1>.*?</h1></header>", RegexOptions.Singleline);
        Assert.True(header.Success);
        var actual = Regex.Matches(header.Value, @"<a href=""([^""]*)"">(.*?)</a>")
            .Select(match => new KeyValuePair<string, string>(WebUtility.HtmlDecode(match.Groups[1].Value), WebUtility.HtmlDecode(match.Groups[2].Value)));
        var expected = new List<KeyValuePair<string, string>> { new("/", "/") };
        for (var i = 0; i < segments.Length; i++)
        {
            expected.Add(new("/" + string.Join('/', segments.Take(i + 1)) + "/", segments[i] + "/"));
        }

        Assert.Equal(expected, actual);
        Assert.Equal("text/html; charset=utf-8", context.Response.ContentType);
        Assert.Equal(bytes.Length, context.Response.ContentLength);
        var requestPath = context.Request.PathBase + context.Request.Path;
        Assert.Contains($"{HtmlEncoder.Default.Encode(requestPath.Value!)}</title>", body);
        Assert.Contains("folder&quot;&amp;/", body);
        Assert.Contains("file&lt;&amp;&gt;.txt", body);
        Assert.True(body.IndexOf(@"<tr class=""directory"">", StringComparison.Ordinal) < body.IndexOf(@"<tr class=""file"">", StringComparison.Ordinal));
        contents.Verify(c => c.GetEnumerator(), Times.Exactly(2));
        provider.Verify(p => p.GetDirectoryContents(It.IsAny<string>()), Times.Once());
    }

    [Fact]
    public async Task GenerateContentAsync_PreservesConfiguredEncoder()
    {
        var encoder = HtmlEncoder.Create(UnicodeRanges.All);
        var (context, bytes, _, _) = await Render("/base", "/caf\u00E9/\u03A9/\U0001F600/", encoder);
        var body = Encoding.UTF8.GetString(bytes);
        Assert.Contains($"href=\"{encoder.Encode("/base/caf\u00E9/")}\"", body);
        Assert.Contains($"href=\"{encoder.Encode("/base/caf\u00E9/\u03A9/\U0001F600/")}\"", body);
        Assert.Contains($"{encoder.Encode("caf\u00E9")}/</a>", body);
        Assert.Equal(bytes.Length, context.Response.ContentLength);
    }

    [Theory]
    [InlineData("Two")]
    [InlineData("ManySegments")]
    public async Task GenerateContentAsync_PreservesStringEncoderOverride(string scenario)
    {
        var (pathBase, path, segments) = GetScenario(scenario);
        var encoder = new Mock<HtmlEncoder>(MockBehavior.Strict);
        encoder.Setup(e => e.Encode(It.IsAny<string>()))
            .Returns((string value) => "[custom]" + HtmlEncoder.Default.Encode(value));
        var (_, bytes, _, _) = await Render(pathBase, path, encoder.Object);
        var body = Encoding.UTF8.GetString(bytes);
        var lastPath = "/" + string.Join('/', segments) + "/";
        Assert.Contains($"href=\"[custom]{HtmlEncoder.Default.Encode(lastPath)}\"", body);
        Assert.Contains($"[custom]{HtmlEncoder.Default.Encode(segments[0])}/</a>", body);
        encoder.Verify(e => e.Encode(It.IsAny<string>()), Times.Exactly(13 + 2 * segments.Length));
    }

    [Fact]
    public async Task GenerateContentAsync_HeadDoesNotEnumerateContents()
    {
        var (context, bytes, contents, provider) = await Render("/base", "/first/second/", HtmlEncoder.Default, HttpMethods.Head);
        Assert.Empty(bytes);
        Assert.Equal("text/html; charset=utf-8", context.Response.ContentType);
        Assert.Null(context.Response.ContentLength);
        contents.Verify(c => c.GetEnumerator(), Times.Never());
        provider.Verify(p => p.GetDirectoryContents(It.IsAny<string>()), Times.Once());
    }

    private static (string PathBase, string Path, string[] Segments) GetScenario(string scenario)
    {
        return scenario switch
        {
            "Root" => ("", "/", []),
            "SeparatorsOnly" => ("", "////", []),
            "Single" => ("", "/first/", ["first"]),
            "Two" => ("", "/first/second/", ["first", "second"]),
            "MissingTrailing" => ("", "/first/second", ["first", "second"]),
            "Repeated" => ("", "//first///second///", ["first", "second"]),
            "PathBase" => ("/base", "/first/second/", ["base", "first", "second"]),
            "PathBaseTrailing" => ("/base/", "/first/second/", ["base", "first", "second"]),
            "PathBaseRepeated" => ("/base/", "//first///second/", ["base", "first", "second"]),
            "Spaces" => ("", "/one two/three /", ["one two", "three "]),
            "Attributes" => ("", "/a&b/q\"u'o<t>/", ["a&b", "q\"u'o<t>"]),
            "Unicode" => ("", "/caf\u00E9/\u03A9/\U0001F600/", ["caf\u00E9", "\u03A9", "\U0001F600"]),
            "PercentLiteral" => ("", "/a%2Fb/query?x=1&y=2/#fragment/", ["a%2Fb", "query?x=1&y=2", "#fragment"]),
            "LongSegment" => ("", "/" + new string('x', 1024) + "/last/", [new string('x', 1024), "last"]),
            "ManySegments" => ("", "/" + string.Join('/', Enumerable.Range(0, 64).Select(i => $"segment{i}")) + "/", Enumerable.Range(0, 64).Select(i => $"segment{i}").ToArray()),
            "UnpairedSurrogates" => ("", "/\uD83D/x/\uDE00/", ["\uFFFD", "x", "\uFFFD"]),
            _ => throw new ArgumentOutOfRangeException(nameof(scenario)),
        };
    }

    private static async Task<(HttpContext Context, byte[] Bytes, Mock<IDirectoryContents> Contents, Mock<IFileProvider> Provider)> Render(
        string pathBase, string path, HtmlEncoder encoder, string method = "GET")
    {
        var file = new Mock<IFileInfo>();
        file.SetupGet(f => f.Name).Returns("file<&>.txt");
        file.SetupGet(f => f.Length).Returns(1234);
        file.SetupGet(f => f.LastModified).Returns(new DateTimeOffset(2020, 1, 2, 3, 4, 5, TimeSpan.Zero));
        var directory = new Mock<IFileInfo>();
        directory.SetupGet(f => f.Name).Returns("folder\"&");
        directory.SetupGet(f => f.IsDirectory).Returns(true);
        directory.SetupGet(f => f.LastModified).Returns(new DateTimeOffset(2020, 1, 2, 3, 4, 5, TimeSpan.Zero));
        var infos = new[] { file.Object, directory.Object };
        var contents = new Mock<IDirectoryContents>(MockBehavior.Strict);
        contents.SetupGet(c => c.Exists).Returns(true);
        contents.Setup(c => c.GetEnumerator()).Returns(() => ((IEnumerable<IFileInfo>)infos).GetEnumerator());
        var provider = new Mock<IFileProvider>(MockBehavior.Strict);
        provider.Setup(p => p.GetDirectoryContents(It.IsAny<string>())).Returns(contents.Object);
        var middleware = new DirectoryBrowserMiddleware(
            _ => throw new InvalidOperationException("Directory producer must invoke its actual formatter."),
            Mock.Of<IWebHostEnvironment>(), encoder,
            Options.Create(new DirectoryBrowserOptions
            {
                FileProvider = provider.Object,
                RedirectToAppendTrailingSlash = false,
            }));
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        context.Request.PathBase = pathBase;
        context.Request.Path = path;
        using var body = new MemoryStream();
        context.Response.Body = body;
        await middleware.Invoke(context);

        return (context, body.ToArray(), contents, provider);
    }
}
