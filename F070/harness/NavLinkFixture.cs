using System.Globalization;
using System.Xml.Linq;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.Components.Routing;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.Web.HtmlRendering;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AutoPerf;

/// <summary>Identifies a stable scenario without embedding raw data in report metadata.</summary>
public sealed record NavCase(
    string Name, string? Href, string Current, NavLinkMatch Match, bool Expected,
    bool? StrictExpected = null, int MenuCount = 0, MenuMode Menu = MenuMode.None)
{
    /// <inheritdoc />
    public override string ToString() => Name;
}

/// <summary>Identifies which actual managed navigation cycle is measured.</summary>
public enum MenuMode
{
    None,
    Toggle,
    Query,
    Mixed
}

internal static class NavCases
{
    private static string Route(int length) => $"settings/{new string('a', length)}/item";

    public static readonly NavCase[] All =
    [
        new("Exact16", Route(16), Route(16), NavLinkMatch.All, true),
        new("Exact64", Route(64), Route(64), NavLinkMatch.All, true),
        new("Exact256", Route(256), Route(256), NavLinkMatch.All, true),
        new("Mixed16", Route(16), Route(16).ToUpperInvariant(), NavLinkMatch.All, true),
        new("Mixed64", Route(64), Route(64).ToUpperInvariant(), NavLinkMatch.All, true),
        new("Mixed256", Route(256), Route(256).ToUpperInvariant(), NavLinkMatch.All, true),
        new("LateMismatch16", Route(16), Route(16)[..^1] + "z", NavLinkMatch.All, false),
        new("LateMismatch64", Route(64), Route(64)[..^1] + "z", NavLinkMatch.All, false),
        new("LateMismatch256", Route(256), Route(256)[..^1] + "z", NavLinkMatch.All, false),
        new("EarlyMismatch64", Route(64), "z" + Route(64)[1..], NavLinkMatch.All, false),
        new("LengthMismatch64", Route(64), Route(64) + "x", NavLinkMatch.All, false),
        new("CurrentQuery64", Route(64), Route(64) + "?view=FULL", NavLinkMatch.All, true, false),
        new("CurrentFragment64", Route(64), Route(64) + "#section", NavLinkMatch.All, true, false),
        new("HrefQuery64", Route(64) + "?view=FULL#section", Route(64), NavLinkMatch.All, true, false),
        new("QueryCaseEqual64", Route(64) + "?view=FULL#section", Route(64) + "?VIEW=full#SECTION", NavLinkMatch.All, true),
        new("HrefTrailingSlash64", Route(64) + "/", Route(64), NavLinkMatch.All, true),
        new("CurrentTrailingSlash64", Route(64), Route(64) + "/", NavLinkMatch.All, false),
        new("PrefixChild64", Route(64), Route(64) + "/child", NavLinkMatch.Prefix, true),
        new("PrefixNeighbor64", Route(64), Route(64) + "ized", NavLinkMatch.Prefix, false),
        new("MissingHref", null, Route(64), NavLinkMatch.All, false),
        new("EncodedUnicode", "settings/caf\u00e9", "settings/caf%C3%A9", NavLinkMatch.All, true),
        new("EncodedUnicodeMismatch", "settings/caf\u00e9", "settings/caf%C3%AA", NavLinkMatch.All, false),
        new("EmptyHrefBase", "", "", NavLinkMatch.All, true),
        new("DeepMixed64", "a/b/c/d/e/f/g/h/" + Route(64), "A/B/C/D/E/F/G/H/" + Route(64).ToUpperInvariant(), NavLinkMatch.All, true),
        new("MenuToggle8", null, "", NavLinkMatch.All, true, MenuCount: 8, Menu: MenuMode.Toggle),
        new("MenuToggle64", null, "", NavLinkMatch.All, true, MenuCount: 64, Menu: MenuMode.Toggle),
        new("MenuQuery8", null, "", NavLinkMatch.All, true, MenuCount: 8, Menu: MenuMode.Query),
        new("MenuQuery64", null, "", NavLinkMatch.All, true, MenuCount: 64, Menu: MenuMode.Query),
        new("MenuMixed8", null, "", NavLinkMatch.All, true, MenuCount: 8, Menu: MenuMode.Mixed),
        new("MenuMixed64", null, "", NavLinkMatch.All, true, MenuCount: 64, Menu: MenuMode.Mixed),
    ];
}

/// <summary>Exposes the existing protected owner method after real renderer initialization.</summary>
public sealed class PreparedNavLink : NavLink
{
    /// <summary>Gets or sets the untimed component capture callback.</summary>
    [Parameter]
    public Action<PreparedNavLink>? Capture { get; set; }

    /// <inheritdoc />
    protected override void OnInitialized()
    {
        base.OnInitialized();
        Capture?.Invoke(this);
    }

    /// <summary>Calls the actual protected shipping matcher without reproducing its implementation.</summary>
    public bool Matches(string currentUri) => base.ShouldMatch(currentUri);
}

/// <summary>Renders ordinary shipping NavLink children with stable menu inputs.</summary>
public sealed class PreparedMenu : ComponentBase
{
    /// <summary>Gets or sets the precomputed hrefs.</summary>
    [Parameter]
    public string[] Hrefs { get; set; } = [];

    /// <inheritdoc />
    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        for (var i = 0; i < Hrefs.Length; i++)
        {
            var index = i;
            builder.OpenComponent<NavLink>(0);
            builder.SetKey(index);
            builder.AddAttribute(1, nameof(NavLink.Match), NavLinkMatch.All);
            builder.AddAttribute(2, nameof(NavLink.AdditionalAttributes),
                new Dictionary<string, object>
                {
                    ["id"] = $"link-{index}",
                    ["href"] = Hrefs[index],
                    ["class"] = "menu-link"
                });
            builder.AddAttribute(3, nameof(NavLink.ChildContent),
                (RenderFragment)(content => content.AddContent(0, $"Link {index}")));
            builder.CloseComponent();
        }
    }
}

internal sealed class FixtureNavigationManager : NavigationManager
{
    public FixtureNavigationManager(string current)
    {
        Initialize("https://example.test/app/", new Uri(new Uri("https://example.test/app/"), current).AbsoluteUri);
    }

    protected override void NavigateToCore(string uri, NavigationOptions options)
    {
        Uri = ToAbsoluteUri(uri).AbsoluteUri;
        NotifyLocationChanged(isInterceptedLink: false);
    }
}

internal sealed class NavLinkFixture : IDisposable
{
    private readonly NavCase _case;
    private readonly bool _strict;
    private readonly FixtureNavigationManager _navigation;
    private readonly ServiceProvider _services;
    private readonly HtmlRenderer _renderer;
    private readonly HtmlRootComponent _root;
    private readonly PreparedNavLink? _link;
    private readonly string _currentUri;
    private readonly string[] _cycle = [];
    private int _cycleIndex;

    public NavLinkFixture(NavCase @case, bool strict)
    {
        _case = @case;
        _strict = strict;
        if (@case.MenuCount > 0)
        {
            const string menuPrefix = "settings/account/preferences/notifications/page-";
            _cycle = @case.Menu switch
            {
                MenuMode.Toggle => [menuPrefix + "000", menuPrefix + "001"],
                MenuMode.Query => [menuPrefix + "000?view=one#first", menuPrefix + "000?view=two#second"],
                MenuMode.Mixed => [menuPrefix + "000", menuPrefix.ToUpperInvariant() + "001"],
                _ => throw new InvalidOperationException("Unexpected menu mode.")
            };
            _navigation = new FixtureNavigationManager(_cycle[0]);
        }
        else
        {
            _navigation = new FixtureNavigationManager(@case.Current);
        }
        _currentUri = _navigation.Uri;
        _services = new ServiceCollection()
            .AddSingleton<NavigationManager>(_navigation)
            .AddLogging()
            .BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
        _renderer = new HtmlRenderer(_services, _services.GetRequiredService<ILoggerFactory>());
        var completed = false;
        try
        {
            if (@case.MenuCount > 0)
            {
                var hrefs = Enumerable.Range(0, @case.MenuCount)
                    .Select(index => $"settings/account/preferences/notifications/page-{index.ToString("D3", CultureInfo.InvariantCulture)}")
                    .ToArray();
                _root = _renderer.Dispatcher.InvokeAsync(() => _renderer.RenderComponentAsync<PreparedMenu>(
                    ParameterView.FromDictionary(new Dictionary<string, object?>
                    {
                        [nameof(PreparedMenu.Hrefs)] = hrefs
                    }))).GetAwaiter().GetResult();
            }
            else
            {
                PreparedNavLink? captured = null;
                var attributes = new Dictionary<string, object> { ["id"] = "link-0", ["class"] = "menu-link" };
                if (@case.Href is not null)
                {
                    attributes["href"] = @case.Href;
                }
                _root = _renderer.Dispatcher.InvokeAsync(() => _renderer.RenderComponentAsync<PreparedNavLink>(
                    ParameterView.FromDictionary(new Dictionary<string, object?>
                    {
                        [nameof(PreparedNavLink.Capture)] = (Action<PreparedNavLink>)(component => captured = component),
                        [nameof(NavLink.Match)] = @case.Match,
                        [nameof(NavLink.AdditionalAttributes)] = attributes
                    }))).GetAwaiter().GetResult();
                _link = captured ?? throw new InvalidOperationException("The actual component did not initialize.");
            }
            completed = true;
        }
        finally
        {
            if (!completed)
            {
                _renderer.Dispose();
                _services.Dispose();
            }
        }
    }

    public int Exercise()
    {
        if (_case.MenuCount == 0)
        {
            return (_link ?? throw new InvalidOperationException("Missing prepared link.")).Matches(_currentUri) ? 1 : 0;
        }

        _cycleIndex ^= 1;
        _renderer.Dispatcher.InvokeAsync(() => _navigation.NavigateTo(_cycle[_cycleIndex])).GetAwaiter().GetResult();
        return _cycleIndex;
    }

    public object Validate()
    {
        var expectedActive = _case.MenuCount > 0
            ? !(_strict && _case.Menu == MenuMode.Query)
            : (_strict ? _case.StrictExpected ?? _case.Expected : _case.Expected);
        if (_case.MenuCount == 0 && Exercise() != (expectedActive ? 1 : 0))
        {
            throw new InvalidOperationException($"Actual ShouldMatch contract failed: {_case.Name}.");
        }
        var html = _renderer.Dispatcher.InvokeAsync(() => _root.ToHtmlString()).GetAwaiter().GetResult();
        var anchors = XElement.Parse($"<div>{html}</div>").Elements("a").ToArray();
        if (anchors.Length != Math.Max(1, _case.MenuCount))
        {
            throw new InvalidOperationException($"Actual rendered link count failed: {_case.Name}.");
        }
        var expectedIndex = _case.MenuCount > 0 && _case.Menu != MenuMode.Query ? _cycleIndex : 0;
        var links = anchors.Select((anchor, index) =>
        {
            var isActive = expectedActive && index == expectedIndex;
            var css = (string?)anchor.Attribute("class");
            var aria = (string?)anchor.Attribute("aria-current");
            if (css != (isActive ? "menu-link active" : "menu-link") || aria != (isActive ? "page" : null))
            {
                throw new InvalidOperationException($"Actual active CSS/aria contract failed: {_case.Name},link {index}.");
            }
            return new { id = (string?)anchor.Attribute("id"), href = (string?)anchor.Attribute("href"), css, aria };
        }).ToArray();
        return new { name = _case.Name, uri = _navigation.Uri, links };
    }

    public void Dispose()
    {
        _renderer.Dispose();
        _services.Dispose();
    }
}
