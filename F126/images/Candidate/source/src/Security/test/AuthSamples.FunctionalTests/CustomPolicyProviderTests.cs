// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace AuthSamples.FunctionalTests;

public class CustomPolicyProviderTests : IClassFixture<WebApplicationFactory<CustomPolicyProvider.Startup>>
{
    public CustomPolicyProviderTests(WebApplicationFactory<CustomPolicyProvider.Startup> fixture)
    {
        Client = fixture.CreateClient();
    }

    public HttpClient Client { get; }

    [Fact]
    public async Task DefaultReturns200()
    {
        // Arrange & Act
        var response = await Client.GetAsync("/");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task MinimumAge10RedirectsWhenNotLoggedIn()
    {
        // Arrange & Act
        var response = await Client.GetAsync("/Home/MinimumAge10");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("http://localhost/account/signin?ReturnUrl=%2FHome%2FMinimumAge10", response.RequestMessage.RequestUri.ToString());
    }

    [Fact]
    public async Task MinimumAge10WorksIfOldEnough()
    {
        // Arrange & Act
        var signIn = await SignIn(Client, "Dude", DateTime.Now.Subtract(TimeSpan.FromDays(365 * 20)).ToString(DateTimeFormatInfo.InvariantInfo.ShortDatePattern, CultureInfo.InvariantCulture));
        Assert.Equal(HttpStatusCode.OK, signIn.StatusCode);

        var response = await Client.GetAsync("/Home/MinimumAge10");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Welcome, Dude", content);
        Assert.Contains("Welcome to a page restricted to users 10 or older", content);
    }

    [Fact]
    public async Task MinimumAge10FailsIfNotOldEnough()
    {
        // Arrange & Act
        var signIn = await SignIn(Client, "Dude", DateTime.Now.Subtract(TimeSpan.FromDays(365 * 5)).ToString(DateTimeFormatInfo.InvariantInfo.ShortDatePattern, CultureInfo.InvariantCulture));
        Assert.Equal(HttpStatusCode.OK, signIn.StatusCode);

        var response = await Client.GetAsync("/Home/MinimumAge10");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Access Denied: Dude is not authorized to view this page.", content);
    }

    [Fact]
    public async Task MinimumAge50WorksIfOldEnough()
    {
        // Arrange & Act
        var signIn = await SignIn(Client, "Dude", DateTime.Now.Subtract(TimeSpan.FromDays(365 * 55)).ToString(DateTimeFormatInfo.InvariantInfo.ShortDatePattern, CultureInfo.InvariantCulture));
        Assert.Equal(HttpStatusCode.OK, signIn.StatusCode);

        var response = await Client.GetAsync("/Home/MinimumAge50");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Welcome, Dude", content);
        Assert.Contains("Welcome to a page restricted to users 50 or older", content);
    }

    [Fact]
    public async Task MinimumAge50FailsIfNotOldEnough()
    {
        // Arrange & Act
        var signIn = await SignIn(Client, "Dude", DateTime.Now.Subtract(TimeSpan.FromDays(365 * 20)).ToString(DateTimeFormatInfo.InvariantInfo.ShortDatePattern, CultureInfo.InvariantCulture));
        Assert.Equal(HttpStatusCode.OK, signIn.StatusCode);

        var response = await Client.GetAsync("/Home/MinimumAge50");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Access Denied: Dude is not authorized to view this page.", content);
    }

    [Fact]
    public async Task MinimumAge50RedirectsWhenNotLoggedIn()
    {
        // Arrange & Act
        var response = await Client.GetAsync("/Home/MinimumAge50");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("http://localhost/account/signin?ReturnUrl=%2FHome%2FMinimumAge50", response.RequestMessage.RequestUri.ToString());
    }

    [Theory]
    [InlineData("MinimumAge10")]
    [InlineData("MinimumAge50")]
    public async Task MinimumAgePolicyIsCachedBetweenRequests(string policyName)
    {
        using var rootFactory = new WebApplicationFactory<CustomPolicyProvider.Startup>();
        using var factory = rootFactory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            var registration = Assert.Single(services, descriptor => descriptor.ServiceType == typeof(IAuthorizationPolicyProvider));
            var providerType = Assert.IsAssignableFrom<Type>(registration.ImplementationType);
            services.Remove(registration);
            services.AddSingleton(serviceProvider =>
            {
                var actualProvider = (IAuthorizationPolicyProvider)ActivatorUtilities.CreateInstance(serviceProvider, providerType);
                var provider = new Mock<IAuthorizationPolicyProvider>(MockBehavior.Strict);
                provider.SetupGet(p => p.AllowsCachingPolicies).Returns(() => actualProvider.AllowsCachingPolicies);
                provider.Setup(p => p.GetPolicyAsync(It.IsAny<string>())).Returns((string name) => actualProvider.GetPolicyAsync(name));
                provider.Setup(p => p.GetDefaultPolicyAsync()).Returns(actualProvider.GetDefaultPolicyAsync);
                provider.Setup(p => p.GetFallbackPolicyAsync()).Returns(actualProvider.GetFallbackPolicyAsync);
                return provider.Object;
            });
        }));
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        for (var i = 0; i < 2; i++)
        {
            using var response = await client.GetAsync($"/Home/{policyName}");
            Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
            Assert.NotNull(response.Headers.Location);
            Assert.Equal($"http://localhost/account/signin?ReturnUrl=%2FHome%2F{policyName}", response.Headers.Location.OriginalString);
        }

        var provider = Mock.Get(factory.Services.GetRequiredService<IAuthorizationPolicyProvider>());
        provider.Verify(p => p.GetPolicyAsync(policyName), Times.Once);
    }

    internal static async Task<HttpResponseMessage> SignIn(HttpClient client, string userName, string dob)
    {
        var goToSignIn = await client.GetAsync("/account/signin");
        var signIn = await TestAssert.IsHtmlDocumentAsync(goToSignIn);

        var form = TestAssert.HasForm(signIn);
        return await client.SendAsync(form, new Dictionary<string, string>()
        {
            ["UserName"] = userName,
            ["DOB"] = dob,
        });
    }
}
