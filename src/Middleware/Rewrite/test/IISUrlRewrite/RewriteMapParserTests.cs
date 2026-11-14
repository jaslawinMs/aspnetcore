// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Xml.Linq;
using Microsoft.AspNetCore.Rewrite.IISUrlRewrite;
using Microsoft.AspNetCore.Rewrite.PatternSegments;

namespace Microsoft.AspNetCore.Rewrite.Tests.IISUrlRewrite;

public class RewriteMapParserTests
{
    [Fact]
    public void Should_parse_rewrite_map()
    {
        // arrange
        const string expectedMapName = "apiMap";
        const string expectedKey = "api.test.com";
        const string expectedValue = "test.com/api";
        var xml = $@"<rewrite>
                                <rewriteMaps>
                                    <rewriteMap name=""{expectedMapName}"">
                                        <add key=""{expectedKey}"" value=""{expectedValue}"" />
                                    </rewriteMap>
                                </rewriteMaps>
                            </rewrite>";

        // act
        var xmlDoc = XDocument.Load(new StringReader(xml), LoadOptions.SetLineInfo);
        var xmlRoot = xmlDoc.Descendants(RewriteTags.Rewrite).FirstOrDefault();
        var actualMaps = RewriteMapParser.Parse(xmlRoot);

        // assert
        Assert.Equal(1, actualMaps.Count);

        var actualMap = actualMaps[expectedMapName];
        Assert.NotNull(actualMap);
        Assert.Equal(expectedMapName, actualMap.Name);
        Assert.Equal(expectedValue, actualMap[expectedKey]);
    }

    [Theory]
    [InlineData("product", "/catalog")]
    [InlineData("PRODUCT", "/catalog")]
    [InlineData("PrOdUcT", "/catalog")]
    [InlineData("missing", null)]
    [InlineData("MISSING", null)]
    [InlineData("", null)]
    [InlineData("\u03c3", "/normal-sigma")]
    [InlineData("\u03c2", "/final-sigma")]
    [InlineData("\u03a3", "/normal-sigma")]
    [InlineData("\U00010400", "/deseret")]
    [InlineData("\U00010428", "/deseret")]
    [InlineData("\u00c9", "/accent")]
    [InlineData("\u00e9", "/accent")]
    [InlineData("e\u0301", null)]
    public void EvaluateRewriteMap_PreservesInvariantLowercaseKeyIdentity(string input, string expected)
    {
        var actual = EvaluateRewriteMap(input,
            ("Product", "/first"),
            ("pRODUCT", "/catalog"),
            ("\u03c3", "/normal-sigma"),
            ("\u03c2", "/final-sigma"),
            ("\U00010428", "/deseret"),
            ("\u00e9", "/accent"));

        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(255)]
    [InlineData(256)]
    [InlineData(257)]
    [InlineData(1024)]
    public void EvaluateRewriteMap_HandlesShortAndLongLookupKeys(int length)
    {
        var actual = EvaluateRewriteMap(new string('A', length), (new string('a', length), "/match"));

        Assert.Equal("/match", actual);
    }

    private static string EvaluateRewriteMap(string input, params (string Key, string Value)[] entries)
    {
        var xml = new XElement("rewrite",
            new XElement("rewriteMaps",
                new XElement("rewriteMap", new XAttribute("name", "map"),
                    entries.Select(entry => new XElement("add",
                        new XAttribute("key", entry.Key), new XAttribute("value", entry.Value))))),
            new XElement("rules",
                new XElement("rule", new XAttribute("name", "map lookup"),
                    new XElement("match", new XAttribute("url", "^(.*)$"), new XAttribute("ignoreCase", "false")),
                    new XElement("conditions",
                        new XElement("add", new XAttribute("input", "{map:{R:1}}"), new XAttribute("pattern", ".*"))),
                    new XElement("action", new XAttribute("type", "None")))));
        using var reader = new StringReader(xml.ToString());
        var rule = Assert.IsType<IISUrlRewriteRule>(Assert.Single(new RewriteOptions().AddIISUrlRewrite(reader).Rules));
        var conditions = Assert.IsType<ConditionCollection>(rule.Conditions);
        var segment = Assert.IsType<RewriteMapSegment>(Assert.Single(Assert.Single(conditions).Input.PatternSegments));
        var context = new RewriteContext();
        var initialMatch = rule.InitialMatch.Evaluate(input, context);
        Assert.True(initialMatch.Success);

        return segment.Evaluate(context, initialMatch.BackReferences, conditionBackReferences: null);
    }
}
