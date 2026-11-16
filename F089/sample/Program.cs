// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Net.Http;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using BlazorWebAssemblyStandalone;
using Microsoft.AspNetCore.Components.Routing;
using Microsoft.Extensions.DependencyInjection.Extensions;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

var scrollRegistration = builder.Services.Single(service => service.ServiceType == typeof(IScrollToLocationHash));
if (scrollRegistration.ImplementationInstance is not IScrollToLocationHash scrollOwner)
{
    throw new InvalidOperationException("The canonical sample must use the actual registered WebAssembly scroll owner.");
}

var scrollDiagnostics = new HashScrollDiagnostics(scrollOwner);
builder.Services.Replace(ServiceDescriptor.Singleton<IScrollToLocationHash>(scrollDiagnostics));
builder.Services.AddSingleton(scrollDiagnostics);

await builder.Build().RunAsync();
