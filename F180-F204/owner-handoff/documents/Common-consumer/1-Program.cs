using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using IISSample;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace AutoPerf.AzureSampleProbe;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        if (args.Length != 3)
        {
            throw new ArgumentException("Expected role, fixture, and an explicit environment-contract JSON file.");
        }

        var expectedEnvironment = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(args[2]))
            ?? throw new InvalidOperationException("The environment contract was null.");
        var initialEnvironment = ReadEnvironment();
        if (!initialEnvironment.OrderBy(item => item.Key, StringComparer.Ordinal).SequenceEqual(
            expectedEnvironment.OrderBy(item => item.Key, StringComparer.Ordinal)))
        {
            throw new InvalidOperationException("The actual process environment differs from the explicit owned-child fixture.");
        }

        var rows = new List<object>();
        foreach (var debugEnabled in new[] { false, true })
        {
            var checks = new List<string>();
            void Require(bool condition, string name)
            {
                if (!condition)
                {
                    throw new InvalidOperationException($"{args[0]}/{args[1]}/{debugEnabled}: {name}");
                }

                checks.Add(name);
            }

            var collector = new CollectingProvider();
            using var loggerFactory = LoggerFactory.Create(builder => builder.ClearProviders()
                .SetMinimumLevel(debugEnabled ? LogLevel.Debug : LogLevel.Information).AddProvider(collector));
            Require(loggerFactory.CreateLogger("Requests").IsEnabled(LogLevel.Debug) == debugEnabled,
                "ActualLoggerFactoryDebugFilterMatchesFixture");
            var services = new ServiceCollection();
            var startup = new Startup();
            startup.ConfigureServices(services);
            using var serviceProvider = services.BuildServiceProvider();
            var application = new ApplicationBuilder(serviceProvider);
            startup.Configure(application, loggerFactory);
            var pipeline = application.Build();
            var context = new DefaultHttpContext
            {
                RequestServices = serviceProvider,
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.Name, "fixture-user")], "fixture-auth"))
            };
            context.Request.Method = "POST";
            context.Request.Scheme = "http";
            context.Request.Host = new HostString("example.test", 8080);
            context.Request.PathBase = new PathString("/base");
            context.Request.Path = new PathString("/probe/request");
            context.Request.QueryString = new QueryString("?a=1&b=two");
            context.Request.Headers["X-Evidence"] = new StringValues(["one", "two"]);
            context.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.1");
            context.Connection.RemotePort = 1234;
            context.Connection.LocalIpAddress = IPAddress.Loopback;
            context.Connection.LocalPort = 5678;
            using var body = new MemoryStream();
            context.Response.Body = body;

            await pipeline(context);

            var response = Encoding.UTF8.GetString(body.ToArray());
            var newline = Environment.NewLine;
            var lines = response.Split(newline, StringSplitOptions.None);
            Require(context.Response.StatusCode == 200 && context.Response.ContentType == "text/plain",
                "ActualNativeHandlerWritesSuccessfulPlainTextResponse");
            Require(lines[0].StartsWith("Hello World - ", StringComparison.Ordinal) &&
                DateTimeOffset.TryParse(lines[0]["Hello World - ".Length..], CultureInfo.CurrentCulture,
                    DateTimeStyles.None, out _),
                "ActualGreetingContainsParseableCurrentCultureTimestamp");
            var expectedAddress = string.Join(newline,
                "Address:", "Scheme: http", "Host: example.test:8080", "PathBase: /base",
                "Path: /probe/request", "Query: ?a=1&b=two", "", "");
            var expectedConnection = string.Join(newline,
                "Connection:", "RemoteIp: 192.0.2.1", "RemotePort: 1234", "LocalIp: 127.0.0.1",
                "LocalPort: 5678", "ClientCert: ", "", "");
            Require(response.Contains(expectedAddress, StringComparison.Ordinal),
                "AddressSectionPreservesActualRequestProperties");
            Require(response.Contains(expectedConnection, StringComparison.Ordinal),
                "ConnectionSectionPreservesActualConnectionProperties");
            Require(response.Contains("User: fixture-user" + newline + newline, StringComparison.Ordinal),
                "UserSectionPreservesPublicIdentityInput");
            var headerStart = response.IndexOf("Headers:" + newline, StringComparison.Ordinal);
            var environmentStart = response.IndexOf("Environment Variables:" + newline, StringComparison.Ordinal);
            Require(headerStart >= 0 && environmentStart > headerStart,
                "ActualNativeHandlerEmitsHeadersBeforeEnvironment");
            var headerLines = response[(headerStart + ("Headers:" + newline).Length)..environmentStart]
                .Split(newline, StringSplitOptions.RemoveEmptyEntries);
            Require(headerLines.OrderBy(value => value, StringComparer.Ordinal).SequenceEqual(
                new[] { "Host: example.test:8080", "X-Evidence: one,two" }.OrderBy(value => value, StringComparer.Ordinal)),
                "HeaderValuesPreserveActualHeaderDictionaryValuesWithoutClaimingHeaderOrdering");
            var actualEnvironmentLines = response[(environmentStart + ("Environment Variables:" + newline).Length)..]
                .Split(newline, StringSplitOptions.None);
            var expectedEnvironmentLines = expectedEnvironment.OrderBy(item => item.Key, StringComparer.OrdinalIgnoreCase)
                .Select(item => item.Key + ": " + item.Value).Concat(["", ""]).ToArray();
            Require(actualEnvironmentLines.SequenceEqual(expectedEnvironmentLines),
                "ActualOsEnvironmentSnapshotIsCompleteValuePairedAndOrdinalIgnoreCaseOrdered");
            Require(ReadEnvironment().OrderBy(item => item.Key, StringComparer.Ordinal).SequenceEqual(
                initialEnvironment.OrderBy(item => item.Key, StringComparer.Ordinal)),
                "HandlerDoesNotMutateTheOwnedChildEnvironment");
            Require(collector.Entries.Count == (debugEnabled ? 1 : 0),
                "RealLoggerFactoryEnabledAndDisabledFilterProducesExactRecordCount");
            if (debugEnabled)
            {
                var entry = collector.Entries.Single();
                Require(entry.Category == "Requests" && entry.Level == LogLevel.Debug && entry.EventId == 0 &&
                    entry.EventName is null && entry.ExceptionType is null &&
                    entry.Message == "Received request: POST /probe/request",
                    "EnabledRecordPreservesActualCategoryLevelEventAndRenderedMessage");
                Require(entry.State.Count == 1 && entry.State[0].Key == "{OriginalFormat}" &&
                    entry.State[0].Value == "Received request: POST /probe/request",
                    "EnabledRecordDocumentsCurrentDynamicallyConcatenatedOriginalFormat");
            }

            rows.Add(new
            {
                name = debugEnabled ? "RequestPipeline_DebugEnabled" : "RequestPipeline_DebugDisabled",
                actualStatus = "PASS",
                actualDebugEnabled = debugEnabled,
                actualChecks = checks,
                actualResponse = response,
                actualLoggingRecords = collector.Entries
            });
        }

        object Image(Assembly assembly) => new
        {
            fullName = assembly.FullName,
            location = assembly.Location,
            mvid = assembly.ManifestModule.ModuleVersionId,
            sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location)))
        };
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            actualStatus = "PASS",
            actualRole = args[0],
            actualFixture = args[1],
            actualPid = Environment.ProcessId,
            actualRuntime = RuntimeInformation.FrameworkDescription,
            actualCoreLibrary = Image(typeof(object).Assembly),
            actualOwner = Image(typeof(Startup).Assembly),
            actualConsumer = Image(typeof(Program).Assembly),
            actualEnvironment = initialEnvironment,
            actualRows = rows,
            actualLoadedManagedImages = AppDomain.CurrentDomain.GetAssemblies()
                .Where(assembly => !assembly.IsDynamic && assembly.Location.Length != 0)
                .OrderBy(assembly => assembly.GetName().Name, StringComparer.Ordinal).Select(Image).ToArray(),
            actualNativeStartupConfigureAndOperatingSystemEnvironmentProducerExecuted = true,
            actualNoServerAzureIisDeploymentOrSampleMainExecutionClaim = true,
            actualNoTimingAllocationCounterOrPerformanceComparison = true
        }, new JsonSerializerOptions { WriteIndented = true }));
    }

    private static Dictionary<string, string> ReadEnvironment()
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (DictionaryEntry item in Environment.GetEnvironmentVariables())
        {
            result.Add((string)item.Key, (string)item.Value!);
        }

        return result;
    }

    private sealed record Entry(string Category, LogLevel Level, int EventId, string? EventName,
        string? ExceptionType, string Message, List<KeyValuePair<string, string?>> State);

    private sealed class CollectingProvider : ILoggerProvider
    {
        public List<Entry> Entries { get; } = [];

        public ILogger CreateLogger(string categoryName) => new CollectingLogger(categoryName, Entries);

        public void Dispose()
        {
        }
    }

    private sealed class CollectingLogger(string category, List<Entry> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (state is not IEnumerable<KeyValuePair<string, object?>> values)
            {
                throw new InvalidOperationException("Unexpected non-structured LoggerExtensions state.");
            }

            entries.Add(new Entry(category, logLevel, eventId.Id, eventId.Name, exception?.GetType().FullName,
                formatter(state, exception), values.Select(item =>
                    new KeyValuePair<string, string?>(item.Key, item.Value?.ToString())).ToList()));
        }
    }
}
