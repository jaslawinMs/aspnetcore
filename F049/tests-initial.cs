// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Text;

namespace Microsoft.AspNetCore.WebUtilities;

public class FormMultipartSectionConversionTests
{
    private const string Boundary = "F049Boundary";

    [Theory]
    [InlineData(null)]
    [InlineData("@")]
    [InlineData("FORM-DATA; name=note")]
    [InlineData("attachment; filename=file.txt")]
    [InlineData("inline; filename=file.txt")]
    [InlineData("form-data; name=upload; filename=plain.txt")]
    [InlineData("form-data; name=\"up load\"; filename=\"file name.txt\"")]
    [InlineData("form-data; filename=plain.txt")]
    [InlineData("form-data; name=upload; filename*=UTF-8''%E2%82%AC.txt")]
    [InlineData("form-data; name=upload; filename=plain.txt; filename*=UTF-8''")]
    [InlineData("form-data; name=upload; filename=plain.txt; filename*=UTF-8''preferred.txt")]
    public async Task AsFormDataSection_NonFormReaderSection_ReturnsNullWithoutConsumingBody(string? disposition)
    {
        using var input = CreateStream(disposition);
        var reader = new MultipartReader(Boundary, input);
        var section = Assert.IsType<MultipartSection>(await reader.ReadNextSectionAsync());
        var body = section.Body;

        var result = section.AsFormDataSection();

        Assert.Null(result);
        Assert.Same(body, section.Body);
        using var output = new MemoryStream();
        await section.Body.CopyToAsync(output);
        Assert.Equal("payload", Encoding.UTF8.GetString(output.ToArray()));
        Assert.Null(await reader.ReadNextSectionAsync());
    }

    [Theory]
    [InlineData("form-data; name=note", "note")]
    [InlineData("form-data; name=\"two words\"", "two words")]
    [InlineData("form-data", "")]
    [InlineData("form-data; name=\"\"", "")]
    [InlineData("form-data; name=note; other=filename", "note")]
    [InlineData("form-data; name=upload; filename=\"\"", "upload")]
    [InlineData("form-data; name=upload; filename*=UTF-8''", "upload")]
    [InlineData("form-data; name=upload; filename*=invalid", "upload")]
    [InlineData("form-data; name=upload; filename=\"\"; filename*=UTF-8''", "upload")]
    public async Task AsFormDataSection_FormReaderSection_PreservesNameIdentityAndValue(string disposition, string name)
    {
        using var input = CreateStream(disposition);
        var reader = new MultipartReader(Boundary, input);
        var section = Assert.IsType<MultipartSection>(await reader.ReadNextSectionAsync());
        var body = section.Body;

        var result = Assert.IsType<FormMultipartSection>(section.AsFormDataSection());

        Assert.Same(section, result.Section);
        Assert.Same(body, result.Section.Body);
        Assert.Equal(name, result.Name);
        Assert.Equal("payload", await result.GetValueAsync());
        Assert.Null(await reader.ReadNextSectionAsync());
    }

    [Fact]
    public void AsFormDataSection_NullSection_ThrowsArgumentNullException()
    {
        var exception = Assert.Throws<ArgumentNullException>(() => MultipartSectionConverterExtensions.AsFormDataSection(null!));

        Assert.Equal("section", exception.ParamName);
    }

    private static MemoryStream CreateStream(string? disposition)
    {
        var header = disposition is null ? "Content-Type: text/plain\r\n" : $"Content-Disposition: {disposition}\r\n";
        var body = $"--{Boundary}\r\n{header}\r\npayload\r\n--{Boundary}--\r\n";

        return new MemoryStream(Encoding.UTF8.GetBytes(body));
    }
}
