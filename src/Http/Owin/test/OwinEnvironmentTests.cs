// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

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

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void OwinEnvironmentPreservesMappedAndItemsLookupEquality(bool materializeMaps)
    {
        var context = CreateContext();
        context.Request.Method = "GET";
        context.Request.Path = "/orders";
        context.Items["server.LocalPort"] = "fallback";
        var wrapper = new OwinEnvironment(context);
        IDictionary<string, object> environment = wrapper;
        if (materializeMaps)
        {
            _ = wrapper.FeatureMaps;
        }

        Assert.Equal("GET", environment["owin.RequestMethod"]);
        Assert.True(environment.TryGetValue("owin.RequestPath", out var path));
        Assert.Equal("/orders", path);
        Assert.Equal("fallback", environment["server.LocalPort"]);
        Assert.False(environment.ContainsKey("OWIN.RequestMethod"));
        Assert.False(environment.TryGetValue("owin.Unknown", out _));
        Assert.Throws<InvalidOperationException>(() => environment.Add("owin.RequestMethod", "POST"));
        environment["OWIN.RequestMethod"] = "item";
        Assert.Equal("item", context.Items["OWIN.RequestMethod"]);
        Assert.Equal("item", environment["OWIN.RequestMethod"]);
        Assert.Equal("GET", context.Request.Method);
        environment["owin.RequestMethod"] = "PATCH";
        Assert.Equal("PATCH", context.Request.Method);
        Assert.Equal("PATCH", environment["owin.RequestMethod"]);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void OwinEnvironmentPreservesRemovalFallbackAndNextRequest(bool materializeMaps)
    {
        var context = CreateContext();
        context.Request.Method = "GET";
        var wrapper = new OwinEnvironment(context);
        IDictionary<string, object> environment = wrapper;
        IDictionary<string, OwinEnvironment.FeatureMap> maps = null;
        if (materializeMaps)
        {
            maps = wrapper.FeatureMaps;
        }
        var count = environment.Count;

        Assert.True(environment.Remove("owin.RequestMethod"));
        Assert.Equal(count - 1, environment.Count);
        Assert.False(environment.Remove("owin.RequestMethod"));
        Assert.False(environment.TryGetValue("owin.RequestMethod", out _));
        environment.Add("owin.RequestMethod", "item");
        Assert.Equal("item", environment["owin.RequestMethod"]);
        Assert.Equal("GET", context.Request.Method);
        maps ??= wrapper.FeatureMaps;
        Assert.DoesNotContain("owin.RequestMethod", maps.Keys);
        Assert.Equal("item", environment["owin.RequestMethod"]);
        var nextContext = CreateContext();
        nextContext.Request.Method = "NEXT";
        IDictionary<string, object> nextEnvironment = new OwinEnvironment(nextContext);
        Assert.Equal("NEXT", nextEnvironment["owin.RequestMethod"]);
    }

    [Fact]
    public void OwinEnvironmentPreservesCopyOrderCustomizationAndContextBody()
    {
        var context = CreateContext();
        context.Request.Method = "GET";
        context.Request.Protocol = "HTTP/1.1";
        context.Connection.Id = "connection";
        context.Connection.LocalIpAddress = IPAddress.Loopback;
        context.Connection.RemoteIpAddress = IPAddress.IPv6Loopback;
        using var originalBody = new MemoryStream();
        context.Response.Body = originalBody;
        var wrapper = new OwinEnvironment(context);
        IDictionary<string, object> environment = wrapper;
        var originalOrder = environment.Select(pair => pair.Key).ToArray();

        var maps = wrapper.FeatureMaps;

        Assert.Equal(originalOrder, environment.Select(pair => pair.Key));
        var originalMethodMap = maps["owin.RequestMethod"];
        var nextContext = CreateContext();
        nextContext.Request.Method = "NEXT";
        var nextWrapper = new OwinEnvironment(nextContext);
        Assert.Same(originalMethodMap, nextWrapper.FeatureMaps["owin.RequestMethod"]);
        maps["owin.RequestMethod"] = new OwinEnvironment.FeatureMap<IHttpRequestFeature>(
            feature => feature.Protocol, (feature, value) => feature.Protocol = (string)value);
        Assert.Equal("HTTP/1.1", environment["owin.RequestMethod"]);
        environment["owin.RequestMethod"] = "HTTP/2";
        Assert.Equal("HTTP/2", context.Request.Protocol);
        Assert.Equal("GET", context.Request.Method);
        Assert.Equal("NEXT", ((IDictionary<string, object>)nextWrapper)["owin.RequestMethod"]);
        using var replacementBody = new MemoryStream();
        environment["owin.ResponseBody"] = replacementBody;
        Assert.Same(replacementBody, context.Response.Body);
        Assert.Same(replacementBody, environment["owin.ResponseBody"]);
        Assert.Same(Stream.Null, ((IDictionary<string, object>)nextWrapper)["owin.ResponseBody"]);
        Assert.Equal(originalOrder, environment.Keys);
        var copy = new KeyValuePair<string, object>[environment.Count];
        environment.CopyTo(copy, 0);
        Assert.Equal(originalOrder, copy.Take(originalOrder.Length).Select(pair => pair.Key));
    }

    [Fact]
    public void OwinEnvironmentPreservesReadOnlyMapReplacement()
    {
        var context = CreateContext();
        IDictionary<string, object> environment = new OwinEnvironment(context);
        var replacement = new object();
        var originalCount = environment.Count;

        environment["server.OnSendingHeaders"] = replacement;

        Assert.Same(replacement, context.Items["server.OnSendingHeaders"]);
        Assert.True(environment.TryGetValue("server.OnSendingHeaders", out var value));
        Assert.Same(replacement, value);
        Assert.Equal(originalCount, environment.Count);
        Assert.True(environment.Remove("server.OnSendingHeaders"));
        Assert.False(environment.ContainsKey("server.OnSendingHeaders"));
    }

    [Theory]
    [InlineData("TryGet")]
    [InlineData("Get")]
    [InlineData("Set")]
    [InlineData("Contains")]
    [InlineData("Add")]
    [InlineData("Remove")]
    public void OwinEnvironmentPreservesNullKeyErrors(string operation)
    {
        IDictionary<string, object> environment = new OwinEnvironment(CreateContext());
        string key = null;
        Action invoke = operation switch
        {
            "TryGet" => () => environment.TryGetValue(key, out _),
            "Get" => () => _ = environment[key],
            "Set" => () => environment[key] = "value",
            "Contains" => () => environment.ContainsKey(key),
            "Add" => () => environment.Add(key, "value"),
            "Remove" => () => environment.Remove(key),
            _ => throw new ArgumentException("Unknown operation.", nameof(operation)),
        };

        var exception = Assert.Throws<ArgumentNullException>(invoke);

        Assert.Equal(nameof(key), exception.ParamName);
    }

    private HttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        return context;
    }
}
