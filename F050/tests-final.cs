// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Runtime.ExceptionServices;
using Microsoft.Extensions.Primitives;

namespace Microsoft.AspNetCore.Mvc.Formatters;

public class AcceptHeaderParserTest
{
    [Theory]
    [InlineData("bad")]
    [InlineData("1e3")]
    [InlineData("-0.2")]
    [InlineData("+0.2")]
    [InlineData("")]
    [InlineData("\"bad\"")]
    public void ParseAcceptHeader_InvalidQuality_RecoversWithoutThrowing(string quality)
    {
        var header = $"application/json;q={quality},text/plain";
        var thread = Environment.CurrentManagedThreadId;
        var exceptions = 0;
        IList<MediaTypeSegmentWithQuality> parsed;
        void Observe(object sender, FirstChanceExceptionEventArgs args)
        {
            if (Environment.CurrentManagedThreadId == thread && args.Exception is FormatException)
            {
                exceptions++;
            }
        }
        AppDomain.CurrentDomain.FirstChanceException += Observe;
        try
        {
            parsed = AcceptHeaderParser.ParseAcceptHeader(new[] { header });
        }
        finally
        {
            AppDomain.CurrentDomain.FirstChanceException -= Observe;
        }

        var result = Assert.Single(parsed);
        Assert.Equal("text/plain", result.MediaType.Value);
        Assert.Same(header, result.MediaType.Buffer);
        Assert.Equal(header.IndexOf("text/plain", StringComparison.Ordinal), result.MediaType.Offset);
        Assert.Equal(1.0, result.Quality);
        Assert.Equal(0, exceptions);
    }

    [Theory]
    [InlineData("bad")]
    [InlineData("1e3")]
    [InlineData("-0.2")]
    [InlineData("+0.2")]
    [InlineData("\"bad\"")]
    public void CreateMediaTypeSegmentWithQuality_InvalidQuality_PreservesPublicException(string quality)
    {
        var header = $"application/json;q={quality}";

        Assert.Throws<FormatException>(() => MediaType.CreateMediaTypeSegmentWithQuality(header, start: 0));
    }

    [Fact]
    public void CreateMediaTypeSegmentWithQuality_EmptyQualityAtEnd_PreservesPublicException()
    {
        var header = "application/json;q=";

        var exception = Assert.Throws<ArgumentOutOfRangeException>(
            () => MediaType.CreateMediaTypeSegmentWithQuality(header, start: 0));
        Assert.Equal("index", exception.ParamName);
    }

    [Fact]
    public void CreateMediaTypeSegmentWithQuality_EmptyQualityBeforeComma_PreservesPublicException()
    {
        var header = "application/json;q=,text/plain";

        Assert.Throws<FormatException>(() => MediaType.CreateMediaTypeSegmentWithQuality(header, start: 0));
    }

    [Fact]
    public void ParseAcceptHeader_ParsesSimpleHeader()
    {
        // Arrange
        var header = "application/json";
        var expected = new List<MediaTypeSegmentWithQuality>
            {
                new MediaTypeSegmentWithQuality(new StringSegment("application/json"),1.0)
            };

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(new List<string> { header });

        // Assert
        Assert.Equal(expected, parsed);
    }

    [Fact]
    public void ParseAcceptHeader_ParsesSimpleHeaderWithMultipleValues()
    {
        // Arrange
        var header = "application/json, application/xml;q=0.8";
        var expected = new List<MediaTypeSegmentWithQuality>
            {
                new MediaTypeSegmentWithQuality(new StringSegment("application/json"),1.0),
                new MediaTypeSegmentWithQuality(new StringSegment("application/xml;q=0.8"),0.8)
            };

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(new List<string> { header });

        // Assert
        Assert.Equal(expected, parsed);
        foreach (var mediaType in parsed)
        {
            Assert.Same(header, mediaType.MediaType.Buffer);
        }
    }

    [Fact]
    public void ParseAcceptHeader_ParsesSimpleHeaderWithMultipleValues_InvalidFormat()
    {
        // Arrange
        var header = "application/json, application/xml,;q=0.8";
        var expectedMediaTypes = new List<MediaTypeSegmentWithQuality>
            {
                new MediaTypeSegmentWithQuality(new StringSegment("application/json"),1.0),
                new MediaTypeSegmentWithQuality(new StringSegment("application/xml"),1.0),
            };

        // Act
        var mediaTypes = AcceptHeaderParser.ParseAcceptHeader(new List<string> { header });

        // Assert
        Assert.Equal(expectedMediaTypes, mediaTypes);
    }

    public static TheoryData<string[], string[]> ParseAcceptHeaderWithInvalidMediaTypesData =>
        new TheoryData<string[], string[]>
        {
                { new [] { ";q=0.9" }, new string[] { } },
                { new [] { "/" }, new string[] { } },
                { new [] { "*/" }, new string[] { } },
                { new [] { "/*" }, new string[] { } },
                { new [] { "/;q=0.9" }, new string[] { } },
                { new [] { "*/;q=0.9" }, new string[] { } },
                { new [] { "/*;q=0.9" }, new string[] { } },
                { new [] { "/;q=0.9,text/html" }, new string[] { "text/html" } },
                { new [] { "*/;q=0.9,text/html" }, new string[] { "text/html" } },
                { new [] { "/*;q=0.9,text/html" }, new string[] { "text/html" } },
                { new [] { "img/png,/;q=0.9,text/html" }, new string[] { "img/png", "text/html" } },
                { new [] { "img/png,*/;q=0.9,text/html" }, new string[] { "img/png", "text/html" } },
                { new [] { "img/png,/*;q=0.9,text/html" }, new string[] { "img/png", "text/html" } },
                { new [] { "img/png, /;q=0.9" }, new string[] { "img/png", } },
                { new [] { "img/png, */;q=0.9" }, new string[] { "img/png", } },
                { new [] { "img/png;q=1.0, /*;q=0.9" }, new string[] { "img/png;q=1.0", } },
        };

    [Theory]
    [MemberData(nameof(ParseAcceptHeaderWithInvalidMediaTypesData))]
    public void ParseAcceptHeader_GracefullyRecoversFromInvalidMediaTypeValues_AndReturnsValidMediaTypes(
        string[] acceptHeader,
        string[] expected)
    {
        // Arrange
        var expectedMediaTypes = expected.Select(e => new MediaTypeSegmentWithQuality(new StringSegment(e), 1.0)).ToList();

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(acceptHeader);

        // Assert
        Assert.Equal(expectedMediaTypes, parsed);
    }

    [Fact]
    public void ParseAcceptHeader_ParsesMultipleHeaderValues()
    {
        // Arrange
        var expected = new List<MediaTypeSegmentWithQuality>
            {
                new MediaTypeSegmentWithQuality(new StringSegment("application/json"), 1.0),
                new MediaTypeSegmentWithQuality(new StringSegment("application/xml;q=0.8"), 0.8)
            };

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(
            new List<string> { "application/json", "", "application/xml;q=0.8" });

        // Assert
        Assert.Equal(expected, parsed);
    }

    // The text "*/*Content-Type" parses as a valid media type value. However it's followed
    // by ':' instead of whitespace or a delimiter, which means that it's actually invalid.
    [Fact]
    public void ParseAcceptHeader_ValidMediaType_FollowedByNondelimiter()
    {
        // Arrange
        var expected = new MediaTypeSegmentWithQuality[0];

        var input = "*/*Content-Type:application/json";

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(new List<string>() { input });

        // Assert
        Assert.Equal(expected, parsed);
    }

    [Fact]
    public void ParseAcceptHeader_ValidMediaType_FollowedBySemicolon()
    {
        // Arrange
        var expected = new MediaTypeSegmentWithQuality[0];

        var input = "*/*Content-Type;application/json";

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(new List<string>() { input });

        // Assert
        Assert.Equal(expected, parsed);
    }

    [Fact]
    public void ParseAcceptHeader_ValidMediaType_FollowedByComma()
    {
        // Arrange
        var expected = new MediaTypeSegmentWithQuality[]
        {
                new MediaTypeSegmentWithQuality(new StringSegment("*/*Content-Type"), 1.0),
                new MediaTypeSegmentWithQuality(new StringSegment("application/json"), 1.0),
        };

        var input = "*/*Content-Type,application/json";

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(new List<string>() { input });

        // Assert
        Assert.Equal(expected, parsed);
    }

    [Fact]
    public void ParseAcceptHeader_ValidMediaType_FollowedByWhitespace()
    {
        // Arrange
        var expected = new MediaTypeSegmentWithQuality[]
        {
                new MediaTypeSegmentWithQuality(new StringSegment("application/json"), 1.0),
        };

        var input = "*/*Content-Type application/json";

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(new List<string>() { input });

        // Assert
        Assert.Equal(expected, parsed);
    }

    [Fact]
    public void ParseAcceptHeader_InvalidTokenAtStart()
    {
        // Arrange
        var expected = new MediaTypeSegmentWithQuality[0];

        var input = ":;:";

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(new List<string>() { input });

        // Assert
        Assert.Equal(expected, parsed);
    }

    [Fact]
    public void ParseAcceptHeader_DelimiterAtStart()
    {
        // Arrange
        var expected = new MediaTypeSegmentWithQuality[0];

        var input = ",;:";

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(new List<string>() { input });

        // Assert
        Assert.Equal(expected, parsed);
    }

    [Fact]
    public void ParseAcceptHeader_InvalidTokenAtEnd()
    {
        // Arrange
        var expected = new MediaTypeSegmentWithQuality[0];

        var input = "*/*:";

        // Act
        var parsed = AcceptHeaderParser.ParseAcceptHeader(new List<string>() { input });

        // Assert
        Assert.Equal(expected, parsed);
    }
}
