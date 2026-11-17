using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace AutoPerf;

internal static class SignInContracts
{
    public const int Count = 18;

    public static async Task RunAsync()
    {
        var completed = 0;
        void Record(string name, object facts)
        {
            completed++;
            Evidence.Write("additional-producer-contract", new { name, facts, actualAllAssertionsPassed = true });
        }
        static AuthenticationScheme Scheme(string? display) => new("scheme.3", display, typeof(UnusedHandler));

        using (var fixture = new SignInFixture("Default.Four.Tail"))
        {
            fixture.RequireResult(await fixture.Manager.GetExternalLoginInfoAsync(), "Display 3");
            fixture.Schemes.RemoveScheme(fixture.ProviderName);
            fixture.RequireResult(await fixture.Manager.GetExternalLoginInfoAsync(), fixture.ProviderName);
            Evidence.Require(fixture.Schemes.TryAddScheme(Scheme("after")), "Actual provider re-add failed.");
            fixture.RequireResult(await fixture.Manager.GetExternalLoginInfoAsync(), "after");
            Record("Default.LiveRemoveAndAdd", new { actualLookups = 3, observed = new[] { "Display 3", fixture.ProviderName, "after" } });
        }
        foreach (var scenario in new[] { "empty", "custom", "duplicate", "null-first", "empty-display" })
        {
            AuthenticationScheme[] sequence = scenario switch
            {
                "empty" => [],
                "custom" => [Scheme("custom")],
                "duplicate" => [Scheme("first"), Scheme("second")],
                "null-first" => [Scheme(null), Scheme("second")],
                "empty-display" => [Scheme(""), Scheme("second")],
                _ => throw new InvalidOperationException("Unknown explicit manager contract."),
            };
            using var fixture = new SignInFixture("Default.Four.Tail",
                externalSchemes: () => Task.FromResult<IEnumerable<AuthenticationScheme>>(sequence));
            var expected = scenario switch
            {
                "empty" or "null-first" => fixture.ProviderName,
                "custom" => "custom",
                "duplicate" => "first",
                "empty-display" => "",
                _ => throw new InvalidOperationException("Unknown explicit manager result."),
            };
            fixture.RequireResult(await fixture.Manager.GetExternalLoginInfoAsync(), expected);
            Evidence.Require(fixture.Manager is OverrideSignInManager { OverrideCalls: 1 }, "Actual manager override was bypassed.");
            Record("Manager.Override." + scenario, new { expected, actualManagerOverrideCalls = 1 });
        }
        foreach (var include in new[] { true, false })
        {
            AuthenticationScheme[] sequence = include ? [Scheme("custom")] : [];
            var provider = new EnumeratingProvider(() => Task.FromResult<IEnumerable<AuthenticationScheme>>(sequence));
            using var fixture = new SignInFixture("Default.Four.Tail", provider);
            var expected = include ? "custom" : fixture.ProviderName;
            fixture.RequireResult(await fixture.Manager.GetExternalLoginInfoAsync(), expected);
            Evidence.Require(provider.EnumerationCalls == 1 && provider.KeyedCalls == 0, "Actual derived provider enumeration was bypassed.");
            Record(include ? "Provider.Override.Custom" : "Provider.Override.Empty",
                new { expected, provider.EnumerationCalls, provider.KeyedCalls });
        }
        foreach (var fault in new[] { false, true })
        {
            var completion = new TaskCompletionSource<IEnumerable<AuthenticationScheme>>(TaskCreationOptions.RunContinuationsAsynchronously);
            var provider = new EnumeratingProvider(() => completion.Task);
            using var fixture = new SignInFixture("Default.Four.Tail", provider);
            var pending = fixture.Manager.GetExternalLoginInfoAsync();
            Evidence.Require(provider.EnumerationCalls == 1 && !pending.IsCompleted && provider.KeyedCalls == 0,
                "Actual pending provider did not hold the public consumer.");
            if (fault)
            {
                var failure = new InvalidOperationException("Synthetic provider producer failure.");
                completion.SetException(failure);
                try
                {
                    await pending.WaitAsync(TimeSpan.FromSeconds(10));
                    throw new InvalidOperationException("The public consumer hid the actual provider failure.");
                }
                catch (InvalidOperationException exception) when (ReferenceEquals(exception, failure))
                {
                }
            }
            else
            {
                completion.SetResult([Scheme("released")]);
                fixture.RequireResult(await pending.WaitAsync(TimeSpan.FromSeconds(10)), "released");
            }
            Evidence.Require(provider.EnumerationCalls == 1 && provider.KeyedCalls == 0, "The actual pending provider was queried again.");
            Record(fault ? "Provider.Pending.ExactFailure" : "Provider.Pending.Success",
                new { actualObservedPendingBeforeProducerRelease = true, provider.EnumerationCalls, provider.KeyedCalls });
        }
        using (var fixture = new SignInFixture("Default.Four.Tail"))
        {
            fixture.Properties.Items.Remove("LoginProvider");
            Evidence.Require(await fixture.Manager.GetExternalLoginInfoAsync() is null, "Missing provider metadata must return null.");
            Record("Early.MissingProvider", new { actualResultNull = true, fixture.Authentication.Calls });
        }
        using (var fixture = new SignInFixture("Default.Four.Tail"))
        {
            var identity = (ClaimsIdentity)fixture.Principal.Identity!;
            identity.RemoveClaim(identity.FindFirst(ClaimTypes.NameIdentifier)!);
            Evidence.Require(await fixture.Manager.GetExternalLoginInfoAsync() is null, "Missing subject must return null.");
            Record("Early.MissingSubject", new { actualResultNull = true, fixture.Authentication.Calls });
        }
        using (var fixture = new SignInFixture("Default.Four.Tail"))
        {
            var identity = (ClaimsIdentity)fixture.Principal.Identity!;
            identity.RemoveClaim(identity.FindFirst(ClaimTypes.NameIdentifier)!);
            identity.AddClaim(new Claim("sub", "subject"));
            fixture.RequireResult(await fixture.Manager.GetExternalLoginInfoAsync(), "Display 3", "subject");
            Record("Subject.Fallback", new { actualSubject = "subject" });
        }
        foreach (var match in new[] { true, false })
        {
            using var fixture = new SignInFixture("Default.Four.Tail");
            fixture.Properties.Items["XsrfId"] = "marker";
            var result = await fixture.Manager.GetExternalLoginInfoAsync(match ? "marker" : "different");
            if (match)
            {
                fixture.RequireResult(result, "Display 3");
            }
            else
            {
                Evidence.Require(result is null, "The unchanged marker mismatch must return null.");
            }
            Record(match ? "Marker.Match" : "Marker.Mismatch", new { match, actualResultNull = result is null });
        }
        foreach (var fault in new[] { false, true })
        {
            using var fixture = new SignInFixture("Default.Four.Tail");
            var completion = new TaskCompletionSource<AuthenticateResult>(TaskCreationOptions.RunContinuationsAsynchronously);
            fixture.Authentication.ResultTask = completion.Task;
            var pending = fixture.Manager.GetExternalLoginInfoAsync();
            Evidence.Require(fixture.Authentication.Calls == 1 && !pending.IsCompleted,
                "Actual pending authentication-result producer did not hold the public consumer.");
            if (fault)
            {
                var failure = new InvalidOperationException("Synthetic authentication-result producer failure.");
                completion.SetException(failure);
                try
                {
                    await pending.WaitAsync(TimeSpan.FromSeconds(10));
                    throw new InvalidOperationException("The public consumer hid the actual authentication-result failure.");
                }
                catch (InvalidOperationException exception) when (ReferenceEquals(exception, failure))
                {
                }
            }
            else
            {
                completion.SetResult(fixture.SuccessfulAuthentication);
                fixture.RequireResult(await pending.WaitAsync(TimeSpan.FromSeconds(10)), "Display 3");
            }
            Record(fault ? "AuthenticationResult.Pending.ExactFailure" : "AuthenticationResult.Pending.Success",
                new { actualObservedPendingBeforeProducerRelease = true, fixture.Authentication.Calls });
        }
        {
            var disposed = false;
            var moves = 0;
            IEnumerable<AuthenticationScheme> Produce()
            {
                try
                {
                    moves++;
                    yield return Scheme("first");
                    throw new InvalidOperationException("First-match enumeration must not reach the later element.");
                }
                finally
                {
                    disposed = true;
                }
            }
            using var fixture = new SignInFixture("Default.Four.Tail",
                externalSchemes: () => Task.FromResult(Produce()));
            fixture.RequireResult(await fixture.Manager.GetExternalLoginInfoAsync(), "first");
            Evidence.Require(moves == 1 && disposed, "The actual manager producer did not short circuit and dispose.");
            Record("Manager.Iterator.ShortCircuitAndDispose", new { actualYielded = moves, actualDisposed = disposed });
        }
        Evidence.Require(completed == Count, "An actual additional producer contract was omitted.");
    }

    private sealed class EnumeratingProvider(Func<Task<IEnumerable<AuthenticationScheme>>> source)
        : AuthenticationSchemeProvider(Options.Create(new AuthenticationOptions()))
    {
        public int EnumerationCalls { get; private set; }
        public int KeyedCalls { get; private set; }

        public override Task<IEnumerable<AuthenticationScheme>> GetAllSchemesAsync()
        {
            EnumerationCalls++;

            return source();
        }

        public override Task<AuthenticationScheme?> GetSchemeAsync(string name)
        {
            KeyedCalls++;
            throw new InvalidOperationException("The derived provider keyed lookup must not replace its external enumeration.");
        }
    }

    private sealed class UnusedHandler : IAuthenticationHandler
    {
        public Task InitializeAsync(AuthenticationScheme scheme, Microsoft.AspNetCore.Http.HttpContext context) => throw new NotSupportedException();
        public Task<AuthenticateResult> AuthenticateAsync() => throw new NotSupportedException();
        public Task ChallengeAsync(AuthenticationProperties? properties) => throw new NotSupportedException();
        public Task ForbidAsync(AuthenticationProperties? properties) => throw new NotSupportedException();
    }
}
