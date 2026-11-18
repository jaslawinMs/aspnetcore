// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using System.Linq.Expressions;
using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace AutoPerf;

public enum ConnectionProfileKey
{
    NoExisting,
    KeepAlive,
    TwoExisting,
    EightExisting,
    MixedCaseExisting,
    WrappedStore
}

internal sealed class HeaderAccess
{
    internal static readonly HeaderAccess HttpSys = new(typeof(Microsoft.AspNetCore.Server.HttpSys.HttpSysOptions).Assembly);
    internal static readonly HeaderAccess Iis = new(Assembly.Load("Microsoft.AspNetCore.Server.IIS"));
    private readonly ConstructorInfo _defaultConstructor;
    private readonly ConstructorInfo _storeConstructor;
    private readonly Func<bool, IHeaderDictionary> _create;
    private readonly Func<IDictionary<string, StringValues>, IHeaderDictionary> _createStored;
    private readonly Action<IHeaderDictionary, string, string?> _append;
    private readonly Action<IHeaderDictionary, bool> _setReadOnly;

    internal Assembly Owner { get; }
    internal Type HeaderType { get; }
    internal MethodInfo AppendMethod { get; }

    private HeaderAccess(Assembly owner)
    {
        Owner = owner;
        HeaderType = owner.GetType("Microsoft.AspNetCore.HttpSys.Internal.HeaderCollection", throwOnError: true)!;
        _defaultConstructor = HeaderType.GetConstructor([typeof(bool)])
            ?? throw new InvalidOperationException("Actual default header constructor absent.");
        _storeConstructor = HeaderType.GetConstructor([typeof(IDictionary<string, StringValues>)])
            ?? throw new InvalidOperationException("Actual interface-store constructor absent.");
        AppendMethod = HeaderType.GetMethod("Append", [typeof(string), typeof(string)])
            ?? throw new InvalidOperationException("Actual instance Append absent.");
        var checkTrailers = Expression.Parameter(typeof(bool), "checkTrailers");
        _create = Expression.Lambda<Func<bool, IHeaderDictionary>>(
            Expression.Convert(Expression.New(_defaultConstructor, checkTrailers), typeof(IHeaderDictionary)), checkTrailers).Compile();
        var store = Expression.Parameter(typeof(IDictionary<string, StringValues>), "store");
        _createStored = Expression.Lambda<Func<IDictionary<string, StringValues>, IHeaderDictionary>>(
            Expression.Convert(Expression.New(_storeConstructor, store), typeof(IHeaderDictionary)), store).Compile();
        var headers = Expression.Parameter(typeof(IHeaderDictionary), "headers");
        var key = Expression.Parameter(typeof(string), "key");
        var value = Expression.Parameter(typeof(string), "value");
        _append = Expression.Lambda<Action<IHeaderDictionary, string, string?>>(
            Expression.Call(Expression.Convert(headers, HeaderType), AppendMethod, key, value), headers, key, value).Compile();
        var readOnly = Expression.Parameter(typeof(bool), "readOnly");
        var setter = HeaderType.GetProperty(nameof(IHeaderDictionary.IsReadOnly))!.GetSetMethod(nonPublic: true)
            ?? throw new InvalidOperationException("Actual read-only setter absent.");
        _setReadOnly = Expression.Lambda<Action<IHeaderDictionary, bool>>(
            Expression.Call(Expression.Convert(headers, HeaderType), setter, readOnly), headers, readOnly).Compile();
    }

    internal IHeaderDictionary Create(bool checkTrailers = false) => _create(checkTrailers);
    internal IHeaderDictionary Create(IDictionary<string, StringValues> store) => _createStored(store);
    internal void Append(IHeaderDictionary headers, string key, string? value) => _append(headers, key, value);
    internal void SetReadOnly(IHeaderDictionary headers, bool readOnly) => _setReadOnly(headers, readOnly);

    internal static string[] InitialValues(ConnectionProfileKey profile) => profile switch
    {
        ConnectionProfileKey.NoExisting => [],
        ConnectionProfileKey.KeepAlive or ConnectionProfileKey.MixedCaseExisting or ConnectionProfileKey.WrappedStore => ["keep-alive"],
        ConnectionProfileKey.TwoExisting => ["keep-alive", "upgrade"],
        ConnectionProfileKey.EightExisting => ["option0", "option1", "option2", "option3", "option4", "option5", "option6", "option7"],
        _ => throw new InvalidOperationException("Undeclared profile.")
    };

    internal IHeaderDictionary CreateFresh(ConnectionProfileKey profile)
    {
        var headers = profile is ConnectionProfileKey.WrappedStore ? Create(new DictionaryStore()) : Create();
        var values = InitialValues(profile);
        if (values.Length > 0)
        {
            headers[profile is ConnectionProfileKey.MixedCaseExisting ? "cOnNeCtIoN" : HeaderNames.Connection] = values;
        }
        headers[HeaderNames.ContentLength] = "0";

        return headers;
    }

    internal Func<int> CompileFreshOperation(ConnectionProfileKey profile, bool publicControl)
    {
        var headers = Expression.Variable(HeaderType, "headers");
        var body = new List<Expression>
        {
            Expression.Assign(headers, profile is ConnectionProfileKey.WrappedStore
                ? Expression.New(_storeConstructor, Expression.New(typeof(DictionaryStore)))
                : Expression.New(_defaultConstructor, Expression.Constant(false)))
        };
        var values = InitialValues(profile);
        if (values.Length > 0)
        {
            body.Add(Expression.Assign(Expression.Property(headers, "Item",
                Expression.Constant(profile is ConnectionProfileKey.MixedCaseExisting ? "cOnNeCtIoN" : HeaderNames.Connection)),
                Expression.Constant(new StringValues(values))));
        }
        body.Add(Expression.Assign(Expression.Property(headers, "Item", Expression.Constant(HeaderNames.ContentLength)),
            Expression.Constant(new StringValues("0"))));
        var publicAppend = typeof(HeaderDictionaryExtensions).GetMethod(nameof(HeaderDictionaryExtensions.Append),
            [typeof(IHeaderDictionary), typeof(string), typeof(StringValues)])
            ?? throw new InvalidOperationException("Actual public extension absent.");
        body.Add(publicControl
            ? Expression.Call(publicAppend, headers, Expression.Constant(HeaderNames.Connection), Expression.Constant(new StringValues("close")))
            : Expression.Call(headers, AppendMethod, Expression.Constant(HeaderNames.Connection), Expression.Constant("close")));
        body.Add(Expression.Property(headers, nameof(IHeaderDictionary.Count)));
        var operation = Expression.Lambda<Func<int>>(Expression.Block([headers], body)).Compile();
        Evidence.Write("compiled-adapter-binding", new
        {
            profile = profile.ToString(),
            publicControl,
            actualOwner = Owner.GetName().Name,
            actualHeaderType = HeaderType.FullName,
            actualDefaultConstructorToken = _defaultConstructor.MetadataToken,
            actualInstanceAppendToken = AppendMethod.MetadataToken,
            actualSelectedAppendOwner = (publicControl ? publicAppend : AppendMethod).DeclaringType!.Assembly.GetName().Name,
            actualSelectedAppendDeclaration = (publicControl ? publicAppend : AppendMethod).DeclaringType!.FullName,
            actualAlgorithmCopied = false,
            actualOperationIncludesCompiledDelegateAndFreshCollectionInitialization = true
        });

        return operation;
    }
}

internal sealed class DictionaryStore : IDictionary<string, StringValues>
{
    private readonly Dictionary<string, StringValues> _items = new(4, StringComparer.OrdinalIgnoreCase);
    internal int Reads { get; private set; }
    internal int Writes { get; private set; }
    public StringValues this[string key]
    {
        get => _items[key];
        set
        {
            Writes++;
            _items[key] = value;
        }
    }
    public ICollection<string> Keys => _items.Keys;
    public ICollection<StringValues> Values => _items.Values;
    public int Count => _items.Count;
    public bool IsReadOnly => false;
    public void Add(string key, StringValues value) => _items.Add(key, value);
    public void Add(KeyValuePair<string, StringValues> item) => ((ICollection<KeyValuePair<string, StringValues>>)_items).Add(item);
    public void Clear() => _items.Clear();
    public bool Contains(KeyValuePair<string, StringValues> item) => ((ICollection<KeyValuePair<string, StringValues>>)_items).Contains(item);
    public bool ContainsKey(string key) => _items.ContainsKey(key);
    public void CopyTo(KeyValuePair<string, StringValues>[] array, int index) => ((ICollection<KeyValuePair<string, StringValues>>)_items).CopyTo(array, index);
    public IEnumerator<KeyValuePair<string, StringValues>> GetEnumerator() => _items.GetEnumerator();
    public bool Remove(string key) => _items.Remove(key);
    public bool Remove(KeyValuePair<string, StringValues> item) => ((ICollection<KeyValuePair<string, StringValues>>)_items).Remove(item);
    public bool TryGetValue(string key, out StringValues value)
    {
        Reads++;

        return _items.TryGetValue(key, out value);
    }
    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
