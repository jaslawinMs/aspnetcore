// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using BlazorWebAppPerPage.Client.Pages;
using BlazorWebAppPerPage.Components;
using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents()
    .AddInteractiveWebAssemblyComponents();
builder.Services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession();

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

app.UseSession();
app.UseAntiforgery();

app.MapGet("/autoperf-f112-owner", () => new
{
    OwnerSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(Microsoft.AspNetCore.Http.HttpResults.RazorComponentResult).Assembly.Location))),
    SessionSha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(typeof(Microsoft.AspNetCore.Session.DistributedSession).Assembly.Location))),
});
app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(BlazorWebAppPerPage.Client._Imports).Assembly);

app.Run();
