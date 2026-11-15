// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

#nullable enable

using Microsoft.AspNetCore.Components.RenderTree;
using Microsoft.AspNetCore.Components.Test.Helpers;

namespace Microsoft.AspNetCore.Components.Routing;

public class NavLinkTest
{
    [Theory]
    [InlineData("https://example.com/", "https://example.com/sub-site/page-a", "details", "https://example.com/sub-site/details")]
    [InlineData("https://example.com/", "https://example.com/a/b/c/page", "sibling", "https://example.com/a/b/c/sibling")]
    [InlineData("https://example.com/", "https://example.com/page", "other", "https://example.com/other")]
    [InlineData("https://example.com/", "https://example.com/folder/page?query=value#hash", "other", "https://example.com/folder/other")]
    [InlineData("https://example.com/org/project/app/", "https://example.com/org/project/app/admin/users", "roles", "https://example.com/org/project/app/admin/roles")]
    public async Task NavLink_WithRelativeToCurrentUri_ResolvesHrefCorrectly(
        string baseUri, string currentUri, string href, string expectedHref)
    {
        var renderedHref = await RenderNavLinkAndGetAttributeAsync(
            baseUri, currentUri, href, relativeToCurrentUri: true, attributeName: "href");

        Assert.Equal(expectedHref, renderedHref);
    }

    [Fact]
    public async Task NavLink_WithRelativeToCurrentUriFalse_DoesNotResolve()
    {
        var renderedHref = await RenderNavLinkAndGetAttributeAsync(
            "https://example.com/", "https://example.com/folder/page",
            href: "relative", relativeToCurrentUri: false, attributeName: "href");

        Assert.Equal("relative", renderedHref);
    }

    [Fact]
    public async Task NavLink_WithRelativeToCurrentUri_PreservesActiveClassLogic()
    {
        var classValue = await RenderNavLinkAndGetAttributeAsync(
            "https://example.com/", "https://example.com/sub-site/details",
            href: "details", relativeToCurrentUri: true, attributeName: "class");

        Assert.Equal("active", classValue);
    }

    [Theory]
    [InlineData("SameCase", "routes/item", "https://example.com/routes/item", NavLinkMatch.All, true)]
    [InlineData("MixedCase", "routes/item", "https://example.com/ROUTES/ITEM", NavLinkMatch.All, true)]
    [InlineData("LateMismatch", "routes/item", "https://example.com/routes/itez", NavLinkMatch.All, false)]
    [InlineData("EarlyMismatch", "routes/item", "https://example.com/pages/item", NavLinkMatch.All, false)]
    [InlineData("MissingHref", null, "https://example.com/routes/item", NavLinkMatch.All, false)]
    [InlineData("EmptyHref", "", "https://example.com/", NavLinkMatch.All, true)]
    [InlineData("HrefTrailingSlash", "routes/item/", "https://example.com/routes/item", NavLinkMatch.All, true)]
    [InlineData("CurrentTrailingSlash", "routes/item", "https://example.com/routes/item/", NavLinkMatch.All, false)]
    [InlineData("CurrentQueryAndFragment", "routes/item", "https://example.com/routes/item?view=FULL#section", NavLinkMatch.All, true)]
    [InlineData("HrefQueryAndFragment", "routes/item?view=FULL#section", "https://example.com/routes/item", NavLinkMatch.All, true)]
    [InlineData("PrefixSeparator", "routes/item", "https://example.com/routes/item/child", NavLinkMatch.Prefix, true)]
    [InlineData("PrefixNonSeparator", "routes/item", "https://example.com/routes/itemized", NavLinkMatch.Prefix, false)]
    [InlineData("EncodedUnicode", "routes/caf\u00e9", "https://example.com/routes/caf%C3%A9", NavLinkMatch.All, true)]
    [InlineData("DifferentEncodedUnicode", "routes/caf\u00e9", "https://example.com/routes/caf%C3%AA", NavLinkMatch.All, false)]
    public async Task NavLink_MatchingPreservesActiveClassAndAriaCurrent(
        string caseName, string? href, string currentUri, NavLinkMatch match, bool expectedActive)
    {
        var navigationManager = new TestNavigationManager();
        navigationManager.Initialize("https://example.com/", currentUri);

        using var renderer = new TestRenderer();
        var component = new NavLink { NavigationManager = navigationManager };
        var componentId = renderer.AssignRootComponentId(component);
        var attributes = new Dictionary<string, object> { ["class"] = "menu-link" };
        if (href is not null)
        {
            attributes["href"] = href;
        }

        var parameters = ParameterView.FromDictionary(new Dictionary<string, object?>
        {
            [nameof(NavLink.Match)] = match,
            [nameof(NavLink.AdditionalAttributes)] = attributes
        });

        await renderer.RenderRootComponentAsync(componentId, parameters);

        var frames = renderer.Batches.Single().ReferenceFrames;
        var expectedClass = expectedActive ? "menu-link active" : "menu-link";
        var actualClass = frames.Single(f => f.AttributeName == "class").AttributeValue;
        Assert.True(Equals(expectedClass, actualClass),
            $"{caseName}: Expected class '{expectedClass}', but found '{actualClass}'.");
        Assert.Equal(expectedActive ? "page" : null,
            frames.FirstOrDefault(f => f.AttributeName == "aria-current").AttributeValue);
    }

    private async Task<object?> RenderNavLinkAndGetAttributeAsync(
        string baseUri, string currentUri, string href, bool relativeToCurrentUri, string attributeName)
    {
        var navigationManager = new TestNavigationManager();
        navigationManager.Initialize(baseUri, currentUri);

        var renderer = new TestRenderer();
        var component = new NavLink { NavigationManager = navigationManager };
        var componentId = renderer.AssignRootComponentId(component);

        var parameters = ParameterView.FromDictionary(new Dictionary<string, object?>
        {
            [nameof(NavLink.RelativeToCurrentUri)] = relativeToCurrentUri,
            [nameof(NavLink.AdditionalAttributes)] = new Dictionary<string, object> { ["href"] = href }
        });

        await renderer.RenderRootComponentAsync(componentId, parameters);

        var batch = renderer.Batches.Single();
        return batch.ReferenceFrames.FirstOrDefault(f => f.AttributeName == attributeName).AttributeValue;
    }

    private class TestNavigationManager : NavigationManager
    {
        public new void Initialize(string baseUri, string uri) => base.Initialize(baseUri, uri);

        protected override void NavigateToCore(string uri, NavigationOptions options)
        {
            Uri = uri;
            NotifyLocationChanged(false);
        }
    }
}
