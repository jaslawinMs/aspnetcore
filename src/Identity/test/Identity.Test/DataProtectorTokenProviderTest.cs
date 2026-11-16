// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

using System.Runtime.ExceptionServices;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace Microsoft.AspNetCore.Identity.Test;

public class DataProtectorTokenProviderTest
{
    [Theory]
    [InlineData("InvalidCharacter")]
    [InlineData("InvalidLength")]
    [InlineData("InvalidPadding")]
    [InlineData("NonAscii")]
    public async Task ValidateAsyncAvoidsFormatExceptionsForMalformedTokens(string caseName)
    {
        var token = caseName switch
        {
            "InvalidCharacter" => "AA!A",
            "InvalidLength" => "AAA",
            "InvalidPadding" => "AA=A",
            "NonAscii" => "AA\u00a0A",
            _ => throw new ArgumentException("Unknown malformed token case.", nameof(caseName)),
        };
        var (provider, protector, logger) = CreateProvider();
        var manager = MockHelpers.MockUserManager<PocoUser>();
        var user = new PocoUser();
        var callingThread = Environment.CurrentManagedThreadId;
        var formatExceptions = 0;

        void ObserveException(object sender, FirstChanceExceptionEventArgs args)
        {
            if (Environment.CurrentManagedThreadId == callingThread && args.Exception is FormatException)
            {
                formatExceptions++;
            }
        }

        AppDomain.CurrentDomain.FirstChanceException += ObserveException;
        try
        {
            Assert.False(await provider.ValidateAsync("purpose", token, manager.Object, user));
        }
        finally
        {
            AppDomain.CurrentDomain.FirstChanceException -= ObserveException;
        }

        Assert.Equal(0, formatExceptions);
        protector.Verify(p => p.Unprotect(It.IsAny<byte[]>()), Times.Never);
        manager.Verify(m => m.GetUserIdAsync(user), Times.Never);
        manager.Verify(m => m.GetSecurityStampAsync(user), Times.Never);
        var log = Assert.Single(logger.Invocations.Where(i => i.Method.Name == nameof(ILogger.Log)));
        Assert.Equal(LogLevel.Debug, Assert.IsType<LogLevel>(log.Arguments[0]));
        var eventId = Assert.IsType<EventId>(log.Arguments[1]);
        Assert.Equal(6, eventId.Id);
        Assert.Equal("UnhandledException", eventId.Name);
        Assert.Equal("ValidateAsync failed: unhandled exception was thrown.", log.Arguments[2].ToString());
        Assert.Null(log.Arguments[3]);
    }

    [Fact]
    public async Task ValidateAsyncPropagatesLoggingFailureOnceForMalformedToken()
    {
        var (provider, protector, logger) = CreateProvider();
        var manager = MockHelpers.MockUserManager<PocoUser>();
        var failure = new InvalidOperationException("Logger failure.");
        logger.SetupSequence(l => l.IsEnabled(LogLevel.Debug)).Throws(failure).Returns(true);

        var observed = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            provider.ValidateAsync("purpose", "AA!A", manager.Object, new PocoUser()));

        Assert.Same(failure, observed);
        logger.Verify(l => l.IsEnabled(LogLevel.Debug), Times.Once);
        protector.Verify(p => p.Unprotect(It.IsAny<byte[]>()), Times.Never);
    }

    [Theory]
    [InlineData("Leading")]
    [InlineData("Embedded")]
    [InlineData("Trailing")]
    public async Task ValidateAsyncRejectsMalformedTokensWithWhitespace(string caseName)
    {
        var token = caseName switch
        {
            "Leading" => " AA!A",
            "Embedded" => "AA! A",
            "Trailing" => "AA!A\t",
            _ => throw new ArgumentException("Unknown whitespace case.", nameof(caseName)),
        };
        var (provider, protector, logger) = CreateProvider();
        var manager = MockHelpers.MockUserManager<PocoUser>();
        var user = new PocoUser();

        Assert.False(await provider.ValidateAsync("purpose", token, manager.Object, user));

        protector.Verify(p => p.Unprotect(It.IsAny<byte[]>()), Times.Never);
        manager.Verify(m => m.GetUserIdAsync(user), Times.Never);
        manager.Verify(m => m.GetSecurityStampAsync(user), Times.Never);
        var log = Assert.Single(logger.Invocations.Where(i => i.Method.Name == nameof(ILogger.Log)));
        Assert.Equal(LogLevel.Debug, Assert.IsType<LogLevel>(log.Arguments[0]));
        var eventId = Assert.IsType<EventId>(log.Arguments[1]);
        Assert.Equal(6, eventId.Id);
        Assert.Equal("UnhandledException", eventId.Name);
        Assert.Equal("ValidateAsync failed: unhandled exception was thrown.", log.Arguments[2].ToString());
        Assert.Null(log.Arguments[3]);
    }

    private static (
        DataProtectorTokenProvider<PocoUser> Provider,
        Mock<IDataProtector> Protector,
        Mock<ILogger<DataProtectorTokenProvider<PocoUser>>> Logger) CreateProvider()
    {
        var protector = new Mock<IDataProtector>(MockBehavior.Strict);
        var dataProtectionProvider = new Mock<IDataProtectionProvider>();
        dataProtectionProvider.Setup(p => p.CreateProtector(It.IsAny<string>())).Returns(protector.Object);
        var logger = new Mock<ILogger<DataProtectorTokenProvider<PocoUser>>>();
        logger.Setup(l => l.IsEnabled(LogLevel.Debug)).Returns(true);
        var provider = new DataProtectorTokenProvider<PocoUser>(
            dataProtectionProvider.Object, Options.Create(new DataProtectionTokenProviderOptions()), logger.Object);

        return (provider, protector, logger);
    }
}
