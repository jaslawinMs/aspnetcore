// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Text;

namespace Microsoft.AspNetCore.WebUtilities;

public class MultipartSectionConverterExtensionsTests
{
    private const string Boundary = "F048Boundary";

    [Theory]
    [InlineData(null)]
    [InlineData("form-data; name=note")]
    [InlineData("form-data")]
    [InlineData("FORM-DATA; name=upload; filename=file.txt")]
    [InlineData("attachment; filename=file.txt")]
    [InlineData("inline; filename=file.txt")]
    [InlineData("form-data; name=note; other=filename")]
    [InlineData("@")]
    [InlineData("form-data; name=upload; filename=\"\"")]
    [InlineData("form-data; name=upload; filename*=UTF-8''")]
    public async Task AsFileSection_NonFileReaderSection_ReturnsNullWithoutConsumingBody(string? disposition)
    {
        using var input = CreateStream(disposition);
        var reader = new MultipartReader(Boundary, input);
        var section = Assert.IsType<MultipartSection>(await reader.ReadNextSectionAsync());
        var body = section.Body;

        var result = section.AsFileSection();

        Assert.Null(result);
        Assert.Same(body, section.Body);
        using var output = new MemoryStream();
        await section.Body.CopyToAsync(output);
        Assert.Equal("payload", Encoding.UTF8.GetString(output.ToArray()));
        Assert.Null(await reader.ReadNextSectionAsync());
    }

    [Theory]
    [InlineData("form-data; name=upload; filename=plain.txt", "upload", "plain.txt")]
    [InlineData("form-data; name=\"up load\"; filename=\"file name.txt\"", "up load", "file name.txt")]
    [InlineData("form-data; filename=plain.txt", "", "plain.txt")]
    [InlineData("form-data; name=upload; filename*=UTF-8''%E2%82%AC.txt", "upload", "\u20ac.txt")]
    [InlineData("form-data; name=upload; filename=plain.txt; filename*=UTF-8''preferred.txt", "upload", "preferred.txt")]
    [InlineData("form-data; name=upload; filename=plain.txt; filename*=UTF-8''", "upload", "")]
    public async Task AsFileSection_FileReaderSection_PreservesMetadataAndBody(string disposition, string name, string fileName)
    {
        using var input = CreateStream(disposition);
        var reader = new MultipartReader(Boundary, input);
        var section = Assert.IsType<MultipartSection>(await reader.ReadNextSectionAsync());

        var result = Assert.IsType<FileMultipartSection>(section.AsFileSection());
        var fileStream = Assert.IsAssignableFrom<Stream>(result.FileStream);

        Assert.Same(section, result.Section);
        Assert.Same(section.Body, fileStream);
        Assert.Equal(name, result.Name);
        Assert.Equal(fileName, result.FileName);
        using var output = new MemoryStream();
        await fileStream.CopyToAsync(output);
        Assert.Equal("payload", Encoding.UTF8.GetString(output.ToArray()));
        Assert.Null(await reader.ReadNextSectionAsync());
    }

    [Fact]
    public void AsFileSection_NullSection_ThrowsArgumentNullException()
    {
        var exception = Assert.Throws<ArgumentNullException>(() => MultipartSectionConverterExtensions.AsFileSection(null!));

        Assert.Equal("section", exception.ParamName);
    }

    private static MemoryStream CreateStream(string? disposition)
    {
        var header = disposition is null ? "Content-Type: text/plain\r\n" : $"Content-Disposition: {disposition}\r\n";
        var body = $"--{Boundary}\r\n{header}\r\npayload\r\n--{Boundary}--\r\n";

        return new MemoryStream(Encoding.UTF8.GetBytes(body));
    }
}
