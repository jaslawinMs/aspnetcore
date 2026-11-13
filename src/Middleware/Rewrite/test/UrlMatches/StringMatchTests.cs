// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Rewrite.UrlMatches;

namespace Microsoft.AspNetCore.Rewrite.Tests.UrlMatches;

public class StringMatchTests
{
    [Theory]
    [InlineData("hi", (int)StringOperationType.Equal, true, "hi", true)]
    [InlineData("hi", (int)StringOperationType.Equal, false, "HI", false)]
    [InlineData("hi", (int)StringOperationType.Equal, true, "HI", true)]
    [InlineData("prefix", (int)StringOperationType.Equal, false, "prefix-more", false)]
    [InlineData("prefix-more", (int)StringOperationType.Equal, true, "PREFIX", false)]
    [InlineData("a\0b", (int)StringOperationType.Equal, false, "a\0c", false)]
    [InlineData("\u00e9", (int)StringOperationType.Equal, true, "\u00c9", true)]
    [InlineData("\u00e9", (int)StringOperationType.Equal, true, "e\u0301", false)]
    [InlineData(null, (int)StringOperationType.Equal, false, "", false)]
    [InlineData("", (int)StringOperationType.Equal, true, null, false)]
    [InlineData("a", (int)StringOperationType.Greater, true, "b", true)]
    [InlineData("a", (int)StringOperationType.GreaterEqual, true, "b", true)]
    [InlineData("b", (int)StringOperationType.Less, true, "a", true)]
    [InlineData("b", (int)StringOperationType.LessEqual, true, "a", true)]
    [InlineData("", (int)StringOperationType.Equal, true, "", true)]
    [InlineData(null, (int)StringOperationType.Equal, true, null, true)]
    public void StringMatch_Evaluation_Check_Cases(string value, int operation, bool ignoreCase, string input, bool expectedResult)
    {
        var context = new RewriteContext { HttpContext = new DefaultHttpContext() };
        var stringMatch = new StringMatch(value, (StringOperationType)operation, ignoreCase);
        var matchResult = stringMatch.Evaluate(input, context);
        Assert.Equal(expectedResult, matchResult.Success);
    }
}
