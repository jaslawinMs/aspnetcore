using System.Collections;
using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.TagHelpers;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Primitives;

namespace AutoPerf;

internal sealed record GlobbingProfile(string Name, string[]? Files = null,
    string? Left = null, string? Right = null, bool CacheHit = false,
    string? Static = null, string Include = "**/*.css", string? Exclude = null,
    string PathBase = "", int ExcludedCount = 0);

internal static class GlobbingCases
{
    private static string[] Files(int count, Func<int, string>? create = null)
    {
        return Enumerable.Range(0, count).Reverse()
            .Select(create ?? (i => $"js/file{i:D4}.css")).ToArray();
    }

    public static readonly GlobbingProfile[] All =
    [
        new("CompareShort", Left: "/js/site.css", Right: "/js/other.css"),
        new("CompareLong", Left: "/js/" + new string('a', 4096) + "x.css", Right: "/js/" + new string('a', 4096) + "y.css"),
        new("CompareDeep", Left: "/a/b/c/d/e/f/g/site1.css", Right: "/a/b/c/d/e/f/g/site2.css"),
        new("CompareDepth", Left: "/zz/deep/child/site.css", Right: "/aa/site.css"),
        new("CompareStemPrefix", Left: "/a.css", Right: "/a-.css"),
        new("CompareDirPrefix", Left: "/a/one.css", Right: "/a-/one.css"),
        new("SameStemControl", Left: "/js/site.css", Right: "/js/site.js"),
        new("NoExtensionControl", Left: "/js/site", Right: "/js/other"),
        new("IdenticalControl", Left: "/js/site.css", Right: "/js/site.css"),
        new("Fill1", Files(1)),
        new("Fill8", Files(8)),
        new("Fill64", Files(64)),
        new("Fill256", Files(256)),
        new("FillDeep64", Files(64, i => $"a/b/g{i % 8}/c/d/file{i:D4}.css")),
        new("FillLong64", Files(64, i => $"js/{new string('a', 256)}{i:D4}.css")),
        new("FillNoExtension64", Files(64, i => $"js/file{i:D4}"), Include: "**/*"),
        new("FillFiltered64", [.. Files(64), .. Files(8, i => $"js/skip{i:D4}.css")],
            Exclude: "**/skip*.css", PathBase: "/app", ExcludedCount: 8),
        new("CacheHit64", Files(64), CacheHit: true),
        new("CacheStatic64", Files(64), CacheHit: true, Static: "/static.css"),
        new("EmptyPatternControl", Files(1), CacheHit: true, Include: ""),
    ];

    public static readonly string?[] Matrix =
    [
        null, "", "/a.css", "/a-.css", "/a_b.css", "/a.b.css",
        "/a.js", "/a.jslonger", "/a", "/a-",
        "/a/one.css", "/a-/one.css", "/a/b/one.css", "/aa/one.css",
        "/A/one.css", "/dir.ext/site", "/dir.ext/site.css",
        "/.hidden", ".hidden", "relative.css", "/a//one.css",
        "/\u00C5/site.css", "/\U0001F600/site.css",
    ];
}

internal sealed class GlobbingFixture : IDisposable
{
    public static readonly IComparer<string> Comparer =
        (IComparer<string>)(typeof(GlobbingUrlBuilder).GetField("DefaultPathComparer",
            BindingFlags.NonPublic | BindingFlags.Static)?.GetValue(null)
            ?? throw new MissingFieldException("Actual GlobbingUrlBuilder.DefaultPathComparer is required."));
    private readonly GlobbingProfile _profile;
    private readonly VirtualFileProvider? _provider;
    private readonly MemoryCache? _cache;
    private readonly GlobbingUrlBuilder? _owner;

    public GlobbingFixture(GlobbingProfile profile)
    {
        _profile = profile;
        if (profile.Files is not null)
        {
            _provider = new VirtualFileProvider(profile.Files);
            _cache = new MemoryCache(new MemoryCacheOptions { SizeLimit = 8 * 1024 * 1024 });
            _owner = new GlobbingUrlBuilder(_provider, _cache, new PathString(profile.PathBase));
        }
    }

    public int Exercise()
    {
        if (_owner is null)
        {
            return Comparer.Compare(_profile.Left, _profile.Right);
        }
        if (!_profile.CacheHit)
        {
            _provider!.Invalidate();
        }
        var result = _owner.BuildUrlList(_profile.Static!, _profile.Include, _profile.Exclude!);
        return result.Count == 0 ? 0 : result.Count ^ result[0].Length ^ result[^1].Length;
    }

    public void Validate()
    {
        if (_owner is null)
        {
            if (_profile.Name == "CompareStemPrefix" && Comparer.Compare(_profile.Left, _profile.Right) >= 0 ||
                _profile.Name == "CompareDirPrefix" && Comparer.Compare(_profile.Left, _profile.Right) <= 0)
            {
                throw new InvalidOperationException("Original terminal/nonterminal prefix ordering changed.");
            }
            return;
        }
        var result = _owner.BuildUrlList(_profile.Static!, _profile.Include, _profile.Exclude!);
        var expected = string.IsNullOrEmpty(_profile.Include) ? 0 : _profile.Files!.Length - _profile.ExcludedCount;
        expected += _profile.Static is null ? 0 : 1;
        if (result.Count != expected || _profile.Static is not null && result[0] != _profile.Static)
        {
            throw new InvalidOperationException("Actual matcher result count/static URL changed.");
        }
        var reads = _provider!.DirectoryReads;
        var cached = _owner.BuildUrlList(_profile.Static!, _profile.Include, _profile.Exclude!);
        if (_provider.DirectoryReads != reads || !result.SequenceEqual(cached, StringComparer.Ordinal) ||
            _profile.Static is null && !ReferenceEquals(result, cached))
        {
            throw new InvalidOperationException("Actual cache hit must preserve results without enumerating again.");
        }
    }

    public object CaptureContract()
    {
        Validate();
        if (_owner is null)
        {
            return new { left = _profile.Left, right = _profile.Right,
                sign = Math.Sign(Comparer.Compare(_profile.Left, _profile.Right)) };
        }
        var original = _owner.BuildUrlList(_profile.Static!, _profile.Include, _profile.Exclude!).ToArray();
        var reads = _provider!.DirectoryReads;
        if (string.IsNullOrEmpty(_profile.Include))
        {
            return new { urls = original, cache_hit_without_enumeration = true, empty_include = true };
        }
        var before = _owner.BuildUrlList(null!, _profile.Include, _profile.Exclude!);
        _provider.AddFile(_profile.Include == "**/*" ? "changed/fresh" : "changed/fresh.css");
        _provider.Invalidate();
        var updated = _owner.BuildUrlList(null!, _profile.Include, _profile.Exclude!);
        if (ReferenceEquals(before, updated) || updated.Count != before.Count + 1 ||
            _provider.DirectoryReads <= reads)
        {
            throw new InvalidOperationException("Real cancellation change-token producer must invalidate and expose the new file.");
        }
        return new { urls = original, cache_hit_without_enumeration = true,
            actual_token_invalidation_observes_new_file = true, updated = updated.ToArray() };
    }

    public void Dispose()
    {
        _cache?.Dispose();
        _provider?.Dispose();
    }
}

internal sealed class VirtualFileProvider : IFileProvider, IDisposable
{
    private readonly Dictionary<string, FileEntry> _entries = new(StringComparer.Ordinal);
    private readonly Dictionary<string, List<IFileInfo>> _directories = new(StringComparer.Ordinal)
    {
        [""] = [],
    };
    private CancellationTokenSource _changes = new();
    public int DirectoryReads { get; private set; }

    public VirtualFileProvider(IEnumerable<string> paths)
    {
        foreach (var file in paths)
        {
            AddFile(file);
        }
    }

    public void AddFile(string file)
    {
        var segments = file.Split('/');
        var parent = "";
        for (var i = 0; i < segments.Length; i++)
        {
            var full = parent.Length == 0 ? segments[i] : parent + "/" + segments[i];
            if (!_entries.ContainsKey(full))
            {
                var entry = new FileEntry(segments[i], i < segments.Length - 1);
                _entries.Add(full, entry);
                _directories[parent].Add(entry);
                if (entry.IsDirectory)
                {
                    _directories.Add(full, []);
                }
            }
            parent = full;
        }
    }

    public IFileInfo GetFileInfo(string subpath)
    {
        return _entries.TryGetValue(subpath.Trim('/'), out var entry) ? entry : new NotFoundFileInfo(subpath);
    }

    public IDirectoryContents GetDirectoryContents(string subpath)
    {
        DirectoryReads++;
        return _directories.TryGetValue(subpath.Trim('/'), out var files)
            ? new DirectoryContents(files) : NotFoundDirectoryContents.Singleton;
    }

    public IChangeToken Watch(string filter)
    {
        return new CancellationChangeToken(_changes.Token);
    }

    public void Invalidate()
    {
        var previous = _changes;
        _changes = new CancellationTokenSource();
        previous.Cancel();
        previous.Dispose();
    }

    public void Dispose()
    {
        _changes.Dispose();
    }

    private sealed record FileEntry(string Name, bool IsDirectory) : IFileInfo
    {
        public bool Exists => true;
        public long Length => 0;
        public string? PhysicalPath => null;
        public DateTimeOffset LastModified => DateTimeOffset.UnixEpoch;
        public Stream CreateReadStream() => throw new NotSupportedException("Globbing does not read file content.");
    }

    private sealed class DirectoryContents(List<IFileInfo> files) : IDirectoryContents
    {
        public bool Exists => true;
        public IEnumerator<IFileInfo> GetEnumerator() => files.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}
