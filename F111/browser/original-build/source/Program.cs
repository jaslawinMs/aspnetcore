// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Security.Cryptography;
using BlazorWebAppPerPage.Client.Pages;
using BlazorWebAppPerPage.Components;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddInteractiveWebAssemblyComponents();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
#pragma warning disable ASPDEPR011 // UseWebAssemblyDebugging is obsolete
    app.UseWebAssemblyDebugging();
#pragma warning restore ASPDEPR011
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();

app.UseAntiforgery();

app.MapStaticAssets();
app.MapGet("/autoperf-f111-owner", () =>
{
    var assembly = typeof(Microsoft.AspNetCore.Components.Endpoints.RazorComponentsServiceOptions).Assembly;
    return new
    {
        OwnerSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(assembly.Location))),
        OwnerMvid = assembly.ManifestModule.ModuleVersionId,
        ProcessId = Environment.ProcessId
    };
});
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(BlazorWebAppPerPage.Client._Imports).Assembly);

app.Run();
