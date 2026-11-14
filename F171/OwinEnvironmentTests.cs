// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using System.Net.Http;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Moq;

namespace Microsoft.AspNetCore.Owin;

public class OwinEnvironmentTests
{
    private T Get<T>(IDictionary<string, object> environment, string key)
    {
        object value;
        return environment.TryGetValue(key, out value) ? (T)value : default(T);
    }

    [Fact]
    public void OwinEnvironmentCanBeCreated()
    {
        HttpContext context = CreateContext();
        context.Request.Method = "SomeMethod";
        context.User = new ClaimsPrincipal(new ClaimsIdentity("Foo"));
        context.Request.Body = Stream.Null;
        context.Request.Headers["CustomRequestHeader"] = "CustomRequestValue";
        context.Request.Path = new PathString("/path");
        context.Request.PathBase = new PathString("/pathBase");
        context.Request.Protocol = "http/1.0";
        context.Request.QueryString = new QueryString("?key=value");
        context.Request.Scheme = "http";
        context.Response.Body = Stream.Null;
        context.Response.Headers["CustomResponseHeader"] = "CustomResponseValue";
        context.Response.StatusCode = 201;

        IDictionary<string, object> env = new OwinEnvironment(context);
        Assert.Equal("SomeMethod", Get<string>(env, "owin.RequestMethod"));
        // User property should set both server.User (non-standard) and owin.RequestUser.
        Assert.Equal("Foo", Get<ClaimsPrincipal>(env, "server.User").Identity.AuthenticationType);
        Assert.Equal("Foo", Get<ClaimsPrincipal>(env, "owin.RequestUser").Identity.AuthenticationType);
        Assert.Same(Stream.Null, Get<Stream>(env, "owin.RequestBody"));
        var requestHeaders = Get<IDictionary<string, string[]>>(env, "owin.RequestHeaders");
        Assert.NotNull(requestHeaders);
        Assert.Equal("CustomRequestValue", requestHeaders["CustomRequestHeader"].First());
        Assert.Equal("/path", Get<string>(env, "owin.RequestPath"));
        Assert.Equal("/pathBase", Get<string>(env, "owin.RequestPathBase"));
        Assert.Equal("http/1.0", Get<string>(env, "owin.RequestProtocol"));
        Assert.Equal("key=value", Get<string>(env, "owin.RequestQueryString"));
        Assert.Equal("http", Get<string>(env, "owin.RequestScheme"));

        Assert.Same(Stream.Null, Get<Stream>(env, "owin.ResponseBody"));
        var responseHeaders = Get<IDictionary<string, string[]>>(env, "owin.ResponseHeaders");
        Assert.NotNull(responseHeaders);
        Assert.Equal("CustomResponseValue", responseHeaders["CustomResponseHeader"].First());
        Assert.Equal(201, Get<int>(env, "owin.ResponseStatusCode"));
    }

    [Fact]
    public void OwinEnvironmentCanBeModified()
    {
        HttpContext context = CreateContext();
        IDictionary<string, object> env = new OwinEnvironment(context);

        env["owin.RequestMethod"] = "SomeMethod";
        env["server.User"] = new ClaimsPrincipal(new ClaimsIdentity("Foo"));
        Assert.Equal("Foo", context.User.Identity.AuthenticationType);
        // User property should fall back from owin.RequestUser to server.User.
        env["owin.RequestUser"] = new ClaimsPrincipal(new ClaimsIdentity("Bar"));
        Assert.Equal("Bar", context.User.Identity.AuthenticationType);
        env["owin.RequestBody"] = Stream.Null;
        var requestHeaders = Get<IDictionary<string, string[]>>(env, "owin.RequestHeaders");
        Assert.NotNull(requestHeaders);
        requestHeaders["CustomRequestHeader"] = new[] { "CustomRequestValue" };
        env["owin.RequestPath"] = "/path";
        env["owin.RequestPathBase"] = "/pathBase";
        env["owin.RequestProtocol"] = "http/1.0";
        env["owin.RequestQueryString"] = "key=value";
        env["owin.RequestScheme"] = "http";
        env["owin.ResponseBody"] = Stream.Null;
        var responseHeaders = Get<IDictionary<string, string[]>>(env, "owin.ResponseHeaders");
        Assert.NotNull(responseHeaders);
        responseHeaders["CustomResponseHeader"] = new[] { "CustomResponseValue" };
        env["owin.ResponseStatusCode"] = 201;

        Assert.Equal("SomeMethod", context.Request.Method);
        Assert.Same(Stream.Null, context.Request.Body);
        Assert.Equal("CustomRequestValue", context.Request.Headers["CustomRequestHeader"]);
        Assert.Equal("/path", context.Request.Path.Value);
        Assert.Equal("/pathBase", context.Request.PathBase.Value);
        Assert.Equal("http/1.0", context.Request.Protocol);
        Assert.Equal("?key=value", context.Request.QueryString.Value);
        Assert.Equal("http", context.Request.Scheme);

        Assert.Same(Stream.Null, context.Response.Body);
        Assert.Equal("CustomResponseValue", context.Response.Headers["CustomResponseHeader"]);
        Assert.Equal(201, context.Response.StatusCode);
    }

    [Theory]
    [InlineData("server.LocalPort")]
    public void OwinEnvironmentDoesNotContainEntriesForMissingFeatures(string key)
    {
        HttpContext context = CreateContext();
        IDictionary<string, object> env = new OwinEnvironment(context);

        object value;
        Assert.False(env.TryGetValue(key, out value));

        Assert.Throws<KeyNotFoundException>(() => env[key]);

        Assert.False(env.Keys.Contains(key));
        Assert.False(env.ContainsKey(key));
    }

    [Fact]
    public void OwinEnvironmentSuppliesDefaultsForMissingRequiredEntries()
    {
        HttpContext context = CreateContext();
        IDictionary<string, object> env = new OwinEnvironment(context);

        object value;
        Assert.True(env.TryGetValue("owin.CallCancelled", out value), "owin.CallCancelled");
        Assert.True(env.TryGetValue("owin.Version", out value), "owin.Version");

        Assert.Equal(CancellationToken.None, env["owin.CallCancelled"]);
        Assert.Equal("1.0", env["owin.Version"]);
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(0, 1)]
    [InlineData(0, 2)]
    [InlineData(1, 0)]
    [InlineData(1, 1)]
    [InlineData(1, 2)]
    [InlineData(2, 0)]
    [InlineData(2, 1)]
    [InlineData(2, 2)]
    [InlineData(3, 0)]
    [InlineData(3, 1)]
    [InlineData(3, 2)]
    [InlineData(4, 0)]
    [InlineData(4, 1)]
    [InlineData(4, 2)]
    public void OwinEnvironmentCancellationDefaultPreservesItemValues(int valueKind, int dictionaryKind)
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var context = new DefaultHttpContext();
        context.Items = dictionaryKind switch
        {
            0 => context.Items,
            1 => new Dictionary<object, object>(),
            2 => new SortedDictionary<object, object>(),
            _ => throw new ArgumentOutOfRangeException(nameof(dictionaryKind))
        };
        var unrelated = new object();
        context.Items["unrelated"] = unrelated;
        context.Items["owin.Version"] = "9.0";
        object existing = valueKind switch
        {
            0 or 3 => null,
            1 => CancellationToken.None,
            2 => cancellation.Token,
            4 => new object(),
            _ => throw new ArgumentOutOfRangeException(nameof(valueKind))
        };
        if (valueKind is not 0)
        {
            context.Items["owin.CallCancelled"] = existing;
        }

        IDictionary<string, object> environment = new OwinEnvironment(context);

        Assert.True(context.Items.TryGetValue("owin.CallCancelled", out var actual));
        Assert.True(environment.TryGetValue("owin.CallCancelled", out var exposed));
        if (valueKind is 0)
        {
            Assert.Equal(CancellationToken.None, Assert.IsType<CancellationToken>(actual));
        }
        else
        {
            Assert.Same(existing, actual);
        }
        Assert.Same(actual, exposed);
        Assert.Same(unrelated, context.Items["unrelated"]);
        Assert.Equal("9.0", environment["owin.Version"]);
        Assert.Same(context, context.Items[typeof(HttpContext).FullName]);
        Assert.Equal(4, context.Items.Count);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void OwinEnvironmentCancellationDefaultPreservesLifetimeFeature(bool cancelled)
    {
        using var cancellation = new CancellationTokenSource();
        if (cancelled)
        {
            cancellation.Cancel();
        }
        var context = new DefaultHttpContext();
        context.RequestAborted = cancellation.Token;

        IDictionary<string, object> environment = new OwinEnvironment(context);

        Assert.Equal(CancellationToken.None, Assert.IsType<CancellationToken>(context.Items["owin.CallCancelled"]));
        Assert.Equal(cancellation.Token, Assert.IsType<CancellationToken>(environment["owin.CallCancelled"]));
        Assert.Equal(cancelled, ((CancellationToken)environment["owin.CallCancelled"]).IsCancellationRequested);
        Assert.Equal("1.0", environment["owin.Version"]);
    }

    [Fact]
    public void OwinEnvironmentCancellationDefaultPreservesItemsSetterException()
    {
        var expected = new InvalidOperationException("items setter");
        var values = new Dictionary<object, object>();
        var items = new Mock<IDictionary<object, object>>(MockBehavior.Strict);
        items.Setup(dictionary => dictionary.ContainsKey(It.IsAny<object>()))
            .Returns((object key) => values.ContainsKey(key));
        items.Setup(dictionary => dictionary.Add(It.IsAny<object>(), It.IsAny<object>()))
            .Callback((object key, object value) => values.Add(key, value));
        items.SetupSet(dictionary => dictionary["owin.CallCancelled"] = It.IsAny<object>())
            .Throws(expected);
        items.SetupSet(dictionary => dictionary["owin.Version"] = It.IsAny<object>())
            .Callback((object key, object value) => values[key] = value);
        items.SetupSet(dictionary => dictionary[typeof(HttpContext).FullName] = It.IsAny<object>())
            .Callback((object key, object value) => values[key] = value);
        var context = new DefaultHttpContext { Items = items.Object };

        var actual = Assert.Throws<InvalidOperationException>(() => new OwinEnvironment(context));

        Assert.Same(expected, actual);
        Assert.Empty(values);
    }

    [Fact]
    public void OwinEnvironmentImplementsGetEnumerator()
    {
        var owinEnvironment = new OwinEnvironment(CreateContext());

        Assert.NotNull(owinEnvironment.GetEnumerator());
        Assert.NotNull(((IEnumerable)owinEnvironment).GetEnumerator());
    }

    [Fact]
    public void OwinEnvironmentImplementsCopyTo()
    {
        var owinEnvironment = new OwinEnvironment(CreateContext());
        var collection = (ICollection<KeyValuePair<string, object>>)owinEnvironment;

        var length = collection.Count;
        var kvp = new KeyValuePair<string, object>[length];

        collection.CopyTo(kvp, 0);

        Assert.Throws<ArgumentNullException>(() => collection.CopyTo(null, 0)); // array is null
        Assert.Throws<ArgumentOutOfRangeException>(() => collection.CopyTo(kvp, -1));   // arrayIndex is less than 0
        Assert.Throws<ArgumentException>(() => collection.CopyTo(kvp, 1));  // The number of elements in the source ICollection<T> is greater than the available space from arrayIndex to the end of the destination array.
    }

    [Fact]
    public void OwinEnvironmentSupportsLinq()
    {
        var owinEnvironment = new OwinEnvironment(CreateContext());

        var orderedEnvironment = owinEnvironment.OrderBy(kv => kv.Key).ToList();
        Assert.NotNull(orderedEnvironment);
    }

    [Fact]
    public void OwinEnvironmentRemoveCorrectlyRemovesEntryAndDoesNotImpactNextOwinEnvironment()
    {
        var httpContext1 = CreateContext();
        IDictionary<string, object> env1 = new OwinEnvironment(httpContext1);
        var initialEnv1Count = env1.Count;

        Assert.True(env1.Remove("owin.RequestProtocol"));
        Assert.Equal(initialEnv1Count, env1.Count + 1);
        Assert.False(env1.ContainsKey("owin.RequestProtocol"));
        foreach (var key in env1.Keys)
        {
            Assert.NotEqual("owin.RequestProtocol", key);
        }

        var httpContext2 = CreateContext();
        IDictionary<string, object> env2 = new OwinEnvironment(httpContext2);
        Assert.True(env2.ContainsKey("owin.RequestProtocol"));
    }

    [Fact]
    public void OwinEnvironmentFeatureMapsRemoveDoesNotImpactNextOwinEnvironment()
    {
        var httpContext1 = CreateContext();
        var httpContext2 = CreateContext();

        var owinEnvironment1 = new OwinEnvironment(httpContext1);
        owinEnvironment1.FeatureMaps.Remove("owin.RequestProtocol");

        var owinEnvironment2 = new OwinEnvironment(httpContext2);
        Assert.True(owinEnvironment2.FeatureMaps.ContainsKey("owin.RequestProtocol"));
        Assert.Equal(owinEnvironment1.ToList().Count + 1, owinEnvironment2.ToList().Count);
    }

    [Fact]
    public void OwinEnvironmentClearBehavesCorrectlyAndDoesNotImpactNextOwinEnvironment()
    {
        var httpContext1 = CreateContext();
        IDictionary<string, object> owinEnvironment1 = new OwinEnvironment(httpContext1);
        owinEnvironment1.Clear();
        Assert.Empty(owinEnvironment1);

        var httpContext2 = CreateContext();
        IDictionary<string, object> owinEnvironment2 = new OwinEnvironment(httpContext2);
        Assert.True(owinEnvironment2.Count != 0);
    }

    [Fact]
    public void OwinEnvironmentAccessContextDependentFeatureBehavesCorrectly()
    {
        var httpContext = CreateContext();
        IDictionary<string, object> owinEnvironment = new OwinEnvironment(httpContext);

        Assert.True(owinEnvironment.TryGetValue("owin.ResponseBody", out var responseBody));
        responseBody.Equals(httpContext.Response.Body);
    }

    private HttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        return context;
    }
}
