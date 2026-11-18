// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;

namespace AutoPerf;

internal sealed class TempDataScenario(
    ServiceProvider services, AsyncServiceScope scope, MemoryStream body,
    ITempData data, CookieLogProvider logs) : IAsyncDisposable
{
    public ITempData Data { get; } = data;
    public CookieLogProvider Logs { get; } = logs;

    public static async Task<TempDataScenario> CreateAsync()
    {
        var logs = new CookieLogProvider();
        var files = new NullFileProvider();
        var environment = Mock.Of<IWebHostEnvironment>(host =>
            host.EnvironmentName == Environments.Production &&
            host.ApplicationName == typeof(TempDataCaptureComponent).Assembly.GetName().Name! &&
            host.ContentRootPath == AppContext.BaseDirectory &&
            host.ContentRootFileProvider == files && host.WebRootFileProvider == files);
        var services = new ServiceCollection();
        services.AddSingleton(environment);
        services.AddSingleton<IHostEnvironment>(environment);
        services.AddSingleton<IConfiguration>(_ => new ConfigurationBuilder().Build());
        services.AddSingleton(_ => new DiagnosticListener("AutoPerf.F040"));
        services.AddSingleton<DiagnosticSource>(provider => provider.GetRequiredService<DiagnosticListener>());
        services.AddLogging(builder => builder.SetMinimumLevel(LogLevel.Debug).AddProvider(logs));
        services.AddRazorComponents();
        services.AddDataProtection().UseEphemeralDataProtectionProvider();
        var root = services.BuildServiceProvider(validateScopes: true);
        var scope = root.CreateAsyncScope();
        var body = new MemoryStream();
        var context = new DefaultHttpContext { RequestServices = scope.ServiceProvider };
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("localhost");
        context.Request.Path = "/autoperf-f040-capture";
        context.Response.Body = body;
        ITempData? captured = null;
        var captures = 0;
        var parameters = new Dictionary<string, object?>
        {
            [nameof(TempDataCaptureComponent.Capture)] = (Action<ITempData>)(value =>
            {
                captured = value;
                captures++;
            }),
        };
        await new RazorComponentResult<TempDataCaptureComponent>(parameters).ExecuteAsync(context);
        Evidence.Require(captured is not null && captures == 1, "The real registered cascade must supply one actual TempData owner.");
        Evidence.Require(captured.GetType().FullName == "Microsoft.AspNetCore.Components.TempData" &&
            captured.GetType().Assembly == typeof(ITempData).Assembly, "Require the actual source-built internal TempData implementation.");
        Evidence.Require(context.Response.StatusCode == 200 &&
            Encoding.UTF8.GetString(body.ToArray()).Contains("<p id=\"f040-capture\">captured</p>", StringComparison.Ordinal),
            "The public component result must render through the actual EndpointHtmlRenderer.");
        Evidence.Require(logs.LoadEvents == 0 && logs.Warnings == 0, "Capturing the owner must not load cookie data or hide host warnings.");
        Evidence.Write("public-owner-capture", new { actualCaptures = captures,
            actualOwnerType = captured.GetType().FullName, actualOwnerAssemblySha256 = Evidence.Hash(captured.GetType().Assembly.Location),
            actualProviderLoadEventsBeforeAccess = logs.LoadEvents, actualResponseStatus = context.Response.StatusCode,
            actualNoEndpointInvokerPersistenceClaim = true });

        return new TempDataScenario(root, scope, body, captured, logs);
    }

    public async ValueTask DisposeAsync()
    {
        await scope.DisposeAsync();
        await services.DisposeAsync();
        await body.DisposeAsync();
    }
}

/// <summary>Receives the real registered TempData cascading value during public result execution.</summary>
public sealed class TempDataCaptureComponent : ComponentBase
{
    /// <summary>Gets or sets the request's actual TempData cascade.</summary>
    [CascadingParameter]
    public ITempData? TempData { get; set; }

    /// <summary>Gets or sets the untimed owner-capture action.</summary>
    [Parameter]
    public Action<ITempData> Capture { get; set; } = null!;

    protected override void OnParametersSet()
    {
        Capture(TempData ?? throw new InvalidOperationException("Actual registered TempData cascade required."));
    }

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        builder.OpenElement(0, "p");
        builder.AddAttribute(1, "id", "f040-capture");
        builder.AddContent(2, "captured");
        builder.CloseElement();
    }
}

internal sealed class CookieLogProvider : ILoggerProvider
{
    private readonly ConcurrentQueue<LogRecord> _records = new();
    public int LoadEvents => _records.Count(record => record.Category.EndsWith(".CookieTempDataProvider", StringComparison.Ordinal) &&
        record.EventId is 1 or 2 or 4);
    public int Warnings => _records.Count(record => record.Level >= LogLevel.Warning);
    public object[] Snapshot() => _records.Cast<object>().ToArray();
    public ILogger CreateLogger(string categoryName) => new Logger(categoryName, _records);
    public void Dispose() { }
    private sealed record LogRecord(string Category, LogLevel Level, int EventId, string? EventName, string Message);

    private sealed class Logger(string category, ConcurrentQueue<LogRecord> records) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Debug;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (category.EndsWith(".CookieTempDataProvider", StringComparison.Ordinal) || logLevel >= LogLevel.Warning)
            {
                records.Enqueue(new(category, logLevel, eventId.Id, eventId.Name, formatter(state, exception)));
            }
        }
    }
}
