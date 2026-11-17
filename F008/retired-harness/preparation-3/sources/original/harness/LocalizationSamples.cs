using System.Collections.ObjectModel;
using System.Globalization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoPerf;

public enum Shape
{
    QueryOneMutable,
    QueryOneReadOnly,
    Query16LastArray,
    Query16LastReadOnlyWrapper,
    Query64Last,
    Query64Miss,
    Header3List64,
    Query64Parent
}

internal sealed class RequestFixture
{
    public RequestLocalizationOptions Options { get; }
    public RequestCultureProvider Provider { get; }
    public DefaultHttpContext Context { get; } = new();
    public RequestLocalizationMiddleware Middleware { get; }
    public long NextCalls { get; private set; }
    public CultureInfo? ObservedCulture { get; private set; }
    public CultureInfo? ObservedUICulture { get; private set; }
    public CaptureSink? Sink { get; }

    public RequestFixture(IList<CultureInfo> cultures, string query = "?culture=fr-FR", string? header = null,
        bool fallback = false, bool captureLogs = true)
    {
        Provider = header is null ? new QueryStringRequestCultureProvider() : new AcceptLanguageHeaderRequestCultureProvider();
        Options = new()
        {
            DefaultRequestCulture = new RequestCulture(CultureInfo.GetCultureInfo("en-US")),
            SupportedCultures = cultures,
            SupportedUICultures = cultures,
            FallBackToParentCultures = fallback,
            FallBackToParentUICultures = fallback,
            ApplyCurrentCultureToResponseHeaders = true,
            RequestCultureProviders = [Provider]
        };
        Provider.Options = Options;
        Context.Request.QueryString = new QueryString(query);
        if (header is not null)
        {
            Context.Request.Headers.AcceptLanguage = header;
        }
        Sink = captureLogs ? new() : null;
        Middleware = new(Next, Microsoft.Extensions.Options.Options.Create(Options),
            Sink is null ? NullLoggerFactory.Instance : new CaptureFactory(Sink));
    }

    private Task Next(HttpContext context)
    {
        NextCalls++;
        ObservedCulture = CultureInfo.CurrentCulture;
        ObservedUICulture = CultureInfo.CurrentUICulture;

        return Task.CompletedTask;
    }

    public Task Invoke() => Middleware.Invoke(Context);

    public async Task Proof(string label, string role, bool expectedResult = true)
    {
        var result = await Provider.DetermineProviderCultureResult(Context);
        Evidence.Require((result is not null) == expectedResult, "Actual native-provider null/result contract differs.");
        Evidence.Write("producer", new
        {
            label, role, providerType = Provider.GetType().FullName,
            actualNullResult = result is null, expectedResult,
            actualProviderCultureNames = result?.Cultures.Select(value => value.Value).ToArray(),
            actualProviderUICultureNames = result?.UICultures.Select(value => value.Value).ToArray(),
            query = Context.Request.QueryString.Value, acceptLanguage = Context.Request.Headers.AcceptLanguage.ToString(),
            configuredHeaderMaximum = Provider is AcceptLanguageHeaderRequestCultureProvider header ? header.MaximumAcceptLanguageHeaderValuesToTry : (int?)null,
            supportedCultures = Options.SupportedCultures?.Select(value => value.Name).ToArray(),
            supportedUICultures = Options.SupportedUICultures?.Select(value => value.Name).ToArray(),
            supportedCollectionType = Options.SupportedCultures?.GetType().FullName,
            supportedListIsReadOnly = Options.SupportedCultures?.IsReadOnly,
            fallback = Options.FallBackToParentCultures,
            optionsAndCallerListsNotCopiedByHarness = true, providerResultNotInjected = true
        });
    }

    public RequestObservation Observe(string label, string expectedCulture, string expectedUICulture, bool expectedProvider,
        string? expectedDecimalSeparator = null)
    {
        var feature = Context.Features.Get<IRequestCultureFeature>() ?? throw new InvalidOperationException("Actual request-culture feature missing.");
        Evidence.Require(NextCalls > 0 && ObservedCulture is not null && ObservedUICulture is not null, "Actual downstream delegate did not execute.");
        Evidence.Require(ReferenceEquals(ObservedCulture, feature.RequestCulture.Culture)
            && ReferenceEquals(ObservedUICulture, feature.RequestCulture.UICulture), "Actual downstream thread culture/feature identity differs.");
        Evidence.Require(feature.RequestCulture.Culture.Name == expectedCulture
            && feature.RequestCulture.UICulture.Name == expectedUICulture, label + ":actual culture selection differs.");
        Evidence.Require(ReferenceEquals(feature.Provider, Provider) == expectedProvider, label + ":actual winning provider differs.");
        Evidence.Require(feature.RequestCulture.Culture.IsReadOnly && feature.RequestCulture.UICulture.IsReadOnly,
            label + ":actual selected/default culture must be read-only for these prepared inputs.");
        Evidence.Require(Context.Response.Headers.ContentLanguage.ToString() == expectedUICulture, label + ":actual Content-Language differs.");
        if (expectedDecimalSeparator is not null)
        {
            Evidence.Require(feature.RequestCulture.Culture.NumberFormat.NumberDecimalSeparator == expectedDecimalSeparator,
                label + ":actual selected mutable culture formatting differs.");
        }
        var observation = new RequestObservation(label, feature.RequestCulture.Culture.Name, feature.RequestCulture.UICulture.Name,
            expectedProvider, feature.RequestCulture.Culture.IsReadOnly, feature.RequestCulture.UICulture.IsReadOnly,
            feature.RequestCulture.Culture.NumberFormat.NumberDecimalSeparator, Context.Response.Headers.ContentLanguage.ToString(),
            NextCalls, Sink?.Entries.ToArray(), true);
        Evidence.Write("validated", observation);

        return observation;
    }
}

internal sealed record RequestObservation(string Label, string Culture, string UICulture, bool WinningNativeProvider,
    bool CultureReadOnly, bool UICultureReadOnly, string DecimalSeparator, string ContentLanguage, long ActualNextCalls,
    CapturedLog[]? Logs, bool Passed);

internal sealed class CaptureSink
{
    public List<CapturedLog> Entries { get; } = [];
}

internal sealed record CapturedLog(int Id, string Level, string Message);

internal sealed class CaptureFactory(CaptureSink sink) : ILoggerFactory
{
    public ILogger CreateLogger(string categoryName) => new CaptureLogger(sink);
    public void AddProvider(ILoggerProvider provider) => throw new NotSupportedException("No additional provider is used.");
    public void Dispose() { }

    private sealed class CaptureLogger(CaptureSink sink) : ILogger
    {
        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Debug;
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            sink.Entries.Add(new(eventId.Id, logLevel.ToString(), formatter(state, exception)));
    }
}

internal static class LocalizationSamples
{
    public static (RequestFixture Fixture, string Expected, bool HasProvider) Timed(Shape shape)
    {
        if (shape is Shape.QueryOneMutable or Shape.QueryOneReadOnly)
        {
            CultureInfo culture = shape is Shape.QueryOneMutable ? new CultureInfo("fr-FR") : CultureInfo.GetCultureInfo("fr-FR");

            return (new([culture], captureLogs: false), "fr-FR", true);
        }
        var count = shape is Shape.Query16LastArray or Shape.Query16LastReadOnlyWrapper ? 16 : 64;
        var parent = shape is Shape.Query64Parent;
        var target = parent ? "fr" : "fr-FR";
        var names = CultureInfo.GetCultures(CultureTypes.SpecificCultures).Select(value => value.Name)
            .Where(name => name != target && name != "fr-CA" && name != "fr-FR" && name is not "qaa" and not "qab" and not "qac")
            .Distinct(StringComparer.OrdinalIgnoreCase).Order(StringComparer.Ordinal).Take(count - 1).Append(target).ToArray();
        Evidence.Require(names.Length == count, "Exact platform-supported diagnostic culture count unavailable.");
        var cultures = names.Select(CultureInfo.GetCultureInfo).ToArray();
        IList<CultureInfo> supported = shape switch
        {
            Shape.Query16LastArray => cultures,
            Shape.Query16LastReadOnlyWrapper => new ReadOnlyCollection<CultureInfo>(cultures),
            _ => cultures.ToList()
        };
        var miss = shape is Shape.Query64Miss;
        var fixture = new RequestFixture(supported, query: miss ? "?culture=qaa" : parent ? "?culture=fr-CA" : "?culture=FR-fr",
            header: shape is Shape.Header3List64 ? "qaa;q=1.0,qab;q=0.9,fr-FR;q=0.8" : null, fallback: parent, captureLogs: false);

        return (fixture, miss ? "en-US" : target, !miss);
    }
}
