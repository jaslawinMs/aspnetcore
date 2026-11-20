using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.InMemory;
using Microsoft.AspNetCore.Identity.Test;
using Microsoft.Extensions.DependencyInjection;

/// <summary>Records actual process images without changing the native tests.</summary>
public static class StartupHook
{
    /// <summary>Registers a synchronous process-exit identity observation.</summary>
    public static void Initialize()
    {
        var directory = Environment.GetEnvironmentVariable("AUTOPERF_IDENTITY_OUTPUT");
        if (string.IsNullOrEmpty(directory))
        {
            return;
        }

        JsonSerializer.Serialize(0);
        AppDomain.CurrentDomain.ProcessExit += (_, _) =>
        {
            IdentityObservation.Write(Path.Combine(directory, $"{Environment.ProcessId}.json"), "startup-hook-process-exit");
        };
    }
}

internal static class IdentityObservation
{
    internal static string Hash(string filename) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(filename)));

    internal static object Assembly(Assembly assembly)
    {
        var location = assembly.IsDynamic ? "" : assembly.Location;
        return new
        {
            name = assembly.GetName().Name,
            fullName = assembly.FullName,
            mvid = assembly.ManifestModule.ModuleVersionId,
            location,
            dynamic = assembly.IsDynamic,
            sha256 = string.IsNullOrEmpty(location) ? null : Hash(location),
            informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
        };
    }

    internal static void Write(string filename, string boundary)
    {
        using var process = Process.GetCurrentProcess();
        var native = process.Modules.Cast<ProcessModule>()
            .Where(m => m.ModuleName is "coreclr.dll" or "hostfxr.dll" or "hostpolicy.dll" or "dotnet.exe")
            .Select(m => new
            {
                name = m.ModuleName,
                location = m.FileName,
                sha256 = Hash(m.FileName),
                fileVersion = FileVersionInfo.GetVersionInfo(m.FileName).FileVersion,
                productVersion = FileVersionInfo.GetVersionInfo(m.FileName).ProductVersion
            }).ToArray();
        var record = new
        {
            boundary,
            processId = Environment.ProcessId,
            processPath = Environment.ProcessPath,
            commandLine = Environment.GetCommandLineArgs(),
            frameworkDescription = RuntimeInformation.FrameworkDescription,
            runtimeVersion = Environment.Version.ToString(),
            architecture = RuntimeInformation.ProcessArchitecture.ToString(),
            coreLib = Assembly(typeof(object).Assembly),
            assemblies = AppDomain.CurrentDomain.GetAssemblies().OrderBy(a => a.FullName, StringComparer.Ordinal).Select(Assembly).ToArray(),
            nativeModules = native,
            nativeModuleFilenameBounds = new[] { "coreclr.dll", "hostfxr.dll", "hostpolicy.dll", "dotnet.exe" }
        };
        File.WriteAllText(filename, JsonSerializer.Serialize(record, new JsonSerializerOptions { WriteIndented = true }));
    }
}

internal static class Program
{
    private static readonly List<object> Rows = [];
    private static readonly List<object> Checks = [];

    private static void Check(string name, bool condition, object? observed = null)
    {
        Checks.Add(new { name, passed = condition, observed });
        if (!condition)
        {
            throw new InvalidOperationException(name);
        }
    }

    private static void Success(string name, IdentityResult result)
    {
        Check(name, result.Succeeded, new { result.Succeeded, errors = result.Errors.Select(e => e.Code).ToArray() });
    }

    private static void User(string name, PocoUser? actual, PocoUser? expected)
    {
        Check(name, ReferenceEquals(actual, expected), new
        {
            returnedId = actual?.Id,
            returnedUserName = actual?.UserName,
            expectedId = expected?.Id,
            referenceEqualsExpected = ReferenceEquals(actual, expected)
        });
    }

    private static void Role(string name, PocoRole? actual, PocoRole? expected)
    {
        Check(name, ReferenceEquals(actual, expected), new
        {
            returnedId = actual?.Id,
            returnedRoleName = actual?.Name,
            expectedId = expected?.Id,
            referenceEqualsExpected = ReferenceEquals(actual, expected)
        });
    }

    private static ServiceProvider Provider(InMemoryUserStore<PocoUser> store)
    {
        var services = new ServiceCollection();
        var builder = services.AddIdentityCore<PocoUser>(options =>
        {
            options.User.AllowedUserNameCharacters = null;
        });
        services.AddSingleton<IUserStore<PocoUser>>(store);
        if (store is InMemoryStore<PocoUser, PocoRole> roles)
        {
            builder.AddRoles<PocoRole>();
            services.AddSingleton<IRoleStore<PocoRole>>(roles);
        }

        return services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
    }

    private static void SingletonStore(ServiceProvider provider, IServiceScope first, IServiceScope second, InMemoryUserStore<PocoUser> store)
    {
        Check("store-is-exact-provided-instance-in-first-scope", ReferenceEquals(store, first.ServiceProvider.GetRequiredService<IUserStore<PocoUser>>()));
        Check("store-is-reused-in-second-scope", ReferenceEquals(store, second.ServiceProvider.GetRequiredService<IUserStore<PocoUser>>()));
        Check("user-managers-are-distinct-across-scopes",
            !ReferenceEquals(first.ServiceProvider.GetRequiredService<UserManager<PocoUser>>(), second.ServiceProvider.GetRequiredService<UserManager<PocoUser>>()));
        Check("store-registration-is-singleton", ReferenceEquals(store, provider.GetRequiredService<IUserStore<PocoUser>>()));
    }

    private static async Task RoleIdLifecycle()
    {
        var store = new InMemoryStore<PocoUser, PocoRole>();
        using var provider = Provider(store);
        using var first = provider.CreateScope();
        using var second = provider.CreateScope();
        SingletonStore(provider, first, second, store);
        Check("same-store-owns-role-and-user-contracts", ReferenceEquals(
            first.ServiceProvider.GetRequiredService<IUserStore<PocoUser>>(),
            first.ServiceProvider.GetRequiredService<IRoleStore<PocoRole>>()));
        var manager = first.ServiceProvider.GetRequiredService<RoleManager<PocoRole>>();
        var otherManager = second.ServiceProvider.GetRequiredService<RoleManager<PocoRole>>();
        Check("role-managers-are-distinct-across-scopes", !ReferenceEquals(manager, otherManager));
        var role = new PocoRole("UpperRole") { Id = "Role-Key" };
        var lower = new PocoRole("LowerRole") { Id = "role-key" };
        Role("missing-before-create", await manager.FindByIdAsync(role.Id), null);
        Success("manager-create-role", await manager.CreateAsync(role));
        var equalId = new string(role.Id.ToCharArray());
        Check("equal-id-distinct-string-instance", equalId == role.Id && !ReferenceEquals(equalId, role.Id), new { equalId });
        Role("equal-value-key-returns-exact-stored-role", await manager.FindByIdAsync(equalId), role);
        Role("repeat-id-lookup", await manager.FindByIdAsync(role.Id), role);
        Role("other-scope-sees-same-role", await otherManager.FindByIdAsync(equalId), role);
        Role("case-distinct-id-missing", await manager.FindByIdAsync(lower.Id), null);
        Success("manager-create-case-distinct-role-id", await manager.CreateAsync(lower));
        Role("case-distinct-role-id-has-separate-value", await manager.FindByIdAsync(lower.Id), lower);
        Role("original-role-id-not-replaced-by-case-distinct-id", await manager.FindByIdAsync(role.Id), role);
        role.Name = "UpdatedRole";
        Success("manager-update-same-role-object", await manager.UpdateAsync(role));
        Role("lookup-after-role-update", await manager.FindByIdAsync(equalId), role);
        Check("role-updated-property-observed", (await otherManager.FindByIdAsync(equalId))?.Name == "UpdatedRole");
        var replacement = new PocoRole("ReplacementRole") { Id = equalId };
        Success("manager-update-replacement-role-same-id", await manager.UpdateAsync(replacement));
        Role("lookup-returns-replacement-role-object", await manager.FindByIdAsync(role.Id), replacement);
        Success("manager-delete-replacement-role", await manager.DeleteAsync(replacement));
        Role("role-missing-after-delete", await manager.FindByIdAsync(equalId), null);
        Role("repeat-role-miss-after-delete", await otherManager.FindByIdAsync(role.Id), null);
        Role("case-distinct-role-survives-other-delete", await manager.FindByIdAsync(lower.Id), lower);
    }

    private static async Task UserIdLifecycle(bool inherited)
    {
        InMemoryUserStore<PocoUser> store = inherited ? new InMemoryStore<PocoUser, PocoRole>() : new InMemoryUserStore<PocoUser>();
        using var provider = Provider(store);
        using var first = provider.CreateScope();
        using var second = provider.CreateScope();
        SingletonStore(provider, first, second, store);
        var manager = first.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var otherManager = second.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var user = new PocoUser("UpperUser") { Id = "User-Key" };
        var lower = new PocoUser("LowerUser") { Id = "user-key" };
        User("missing-before-user-create", await manager.FindByIdAsync(user.Id), null);
        Success("manager-create-user", await manager.CreateAsync(user));
        var equalId = new string(user.Id.ToCharArray());
        Check("equal-user-id-distinct-string-instance", equalId == user.Id && !ReferenceEquals(equalId, user.Id), new { equalId, inherited });
        User("equal-value-key-returns-exact-stored-user", await manager.FindByIdAsync(equalId), user);
        User("repeat-user-id-lookup", await manager.FindByIdAsync(user.Id), user);
        User("other-scope-sees-same-user", await otherManager.FindByIdAsync(equalId), user);
        User("case-distinct-user-id-missing", await manager.FindByIdAsync(lower.Id), null);
        Success("manager-create-case-distinct-user-id", await manager.CreateAsync(lower));
        User("case-distinct-user-id-has-separate-value", await manager.FindByIdAsync(lower.Id), lower);
        User("original-user-id-not-replaced-by-case-distinct-id", await manager.FindByIdAsync(user.Id), user);
        user.UserName = "UpdatedUser";
        Success("manager-update-same-user-object", await manager.UpdateAsync(user));
        User("lookup-after-user-update", await manager.FindByIdAsync(equalId), user);
        Check("user-updated-property-observed", (await otherManager.FindByIdAsync(equalId))?.UserName == "UpdatedUser");
        var replacement = new PocoUser("ReplacementUser") { Id = equalId, SecurityStamp = user.SecurityStamp };
        Success("manager-update-replacement-user-same-id", await manager.UpdateAsync(replacement));
        User("lookup-returns-replacement-user-object", await manager.FindByIdAsync(user.Id), replacement);
        Success("manager-delete-replacement-user", await manager.DeleteAsync(replacement));
        User("user-missing-after-delete", await manager.FindByIdAsync(equalId), null);
        User("repeat-user-miss-after-delete", await otherManager.FindByIdAsync(user.Id), null);
        User("case-distinct-user-survives-other-delete", await manager.FindByIdAsync(lower.Id), lower);
    }

    private static async Task LoginLifecycle(bool inherited)
    {
        InMemoryUserStore<PocoUser> store = inherited ? new InMemoryStore<PocoUser, PocoRole>() : new InMemoryUserStore<PocoUser>();
        using var provider = Provider(store);
        using var first = provider.CreateScope();
        using var second = provider.CreateScope();
        SingletonStore(provider, first, second, store);
        var manager = first.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var otherManager = second.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var user = new PocoUser("LoginUser") { Id = "login-user" };
        var providerCase = new PocoUser("ProviderCaseUser") { Id = "login-provider-case" };
        var keyCase = new PocoUser("KeyCaseUser") { Id = "login-key-case" };
        User("missing-login-tuple-before-add", await manager.FindByLoginAsync("Provider", "Key"), null);
        Success("create-login-user", await manager.CreateAsync(user));
        Success("manager-add-login", await manager.AddLoginAsync(user, new UserLoginInfo("Provider", "Key", "display")));
        var equalProvider = new string("Provider".ToCharArray());
        var equalKey = new string("Key".ToCharArray());
        Check("equal-login-components-are-distinct-string-instances",
            equalProvider == "Provider" && equalKey == "Key" && !ReferenceEquals(equalProvider, "Provider") && !ReferenceEquals(equalKey, "Key"),
            new { equalProvider, equalKey, inherited });
        User("equal-value-tuple-returns-exact-stored-user", await manager.FindByLoginAsync(equalProvider, equalKey), user);
        User("repeat-login-lookup", await manager.FindByLoginAsync("Provider", "Key"), user);
        User("other-manager-reuses-login-map", await otherManager.FindByLoginAsync(equalProvider, equalKey), user);
        User("provider-case-distinct-before-add", await manager.FindByLoginAsync("provider", "Key"), null);
        User("provider-key-case-distinct-before-add", await manager.FindByLoginAsync("Provider", "key"), null);
        User("reversed-login-components-do-not-match", await manager.FindByLoginAsync("Key", "Provider"), null);
        Success("create-provider-case-user", await manager.CreateAsync(providerCase));
        Success("create-key-case-user", await manager.CreateAsync(keyCase));
        Success("add-provider-case-distinct-login", await manager.AddLoginAsync(providerCase, new UserLoginInfo("provider", "Key", "provider-case")));
        Success("add-key-case-distinct-login", await manager.AddLoginAsync(keyCase, new UserLoginInfo("Provider", "key", "key-case")));
        User("provider-case-has-separate-value", await manager.FindByLoginAsync("provider", "Key"), providerCase);
        User("key-case-has-separate-value", await manager.FindByLoginAsync("Provider", "key"), keyCase);
        User("original-tuple-still-owns-original-object", await manager.FindByLoginAsync("Provider", "Key"), user);
        user.PhoneNumber = "123";
        Success("update-login-user-object", await manager.UpdateAsync(user));
        User("login-after-user-update-has-exact-identity", await otherManager.FindByLoginAsync("Provider", "Key"), user);
        Check("login-returned-user-has-updated-property", (await manager.FindByLoginAsync("Provider", "Key"))?.PhoneNumber == "123");
        var duplicate = await manager.AddLoginAsync(user, new UserLoginInfo("Provider", "Key", "duplicate"));
        Check("manager-rejects-existing-login", !duplicate.Succeeded && duplicate.Errors.Single().Code == "LoginAlreadyAssociated",
            new { duplicate.Succeeded, errors = duplicate.Errors.Select(e => e.Code).ToArray() });
        Success("manager-remove-login", await manager.RemoveLoginAsync(user, equalProvider, equalKey));
        User("removed-login-returns-null", await manager.FindByLoginAsync("Provider", "Key"), null);
        User("repeat-removed-login-returns-null", await otherManager.FindByLoginAsync(equalProvider, equalKey), null);
        Check("login-list-empty-after-remove", (await manager.GetLoginsAsync(user)).Count == 0);
        Success("manager-readd-removed-login", await manager.AddLoginAsync(user, new UserLoginInfo("Provider", "Key", "readded")));
        User("readded-login-returns-exact-same-user", await manager.FindByLoginAsync(equalProvider, equalKey), user);
        Check("login-list-one-after-readd", (await manager.GetLoginsAsync(user)).Count == 1);
        Success("manager-remove-readded-login", await manager.RemoveLoginAsync(user, "Provider", "Key"));
        User("readded-login-missing-after-second-remove", await manager.FindByLoginAsync(equalProvider, equalKey), null);
        User("provider-case-survives-original-removal", await manager.FindByLoginAsync("provider", "Key"), providerCase);
        User("key-case-survives-original-removal", await manager.FindByLoginAsync("Provider", "key"), keyCase);
    }

    private static async Task LoginKeyComposition()
    {
        var store = new InMemoryUserStore<PocoUser>();
        using var provider = Provider(store);
        using var scope = provider.CreateScope();
        var manager = scope.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var first = new PocoUser("CompositionUser") { Id = "composition-user" };
        var other = new PocoUser("OtherCompositionUser") { Id = "other-composition-user" };
        Success("create-composition-user", await manager.CreateAsync(first));
        Success("create-other-composition-user", await manager.CreateAsync(other));
        Success("add-pipe-containing-tuple", await manager.AddLoginAsync(first, new UserLoginInfo("Pipe|Provider", "Key", "pipe")));
        User("original-pipe-tuple-exact-user", await manager.FindByLoginAsync("Pipe|Provider", "Key"), first);
        User("alternate-components-with-same-composed-key", await manager.FindByLoginAsync("Pipe", "Provider|Key"), first);
        var aliasAdd = await manager.AddLoginAsync(other, new UserLoginInfo("Pipe", "Provider|Key", "alias"));
        Check("manager-sees-composed-key-alias-as-existing", !aliasAdd.Succeeded && aliasAdd.Errors.Single().Code == "LoginAlreadyAssociated",
            new { aliasAdd.Succeeded, errors = aliasAdd.Errors.Select(e => e.Code).ToArray() });
        Success("remove-original-pipe-tuple", await manager.RemoveLoginAsync(first, "Pipe|Provider", "Key"));
        User("composed-key-alias-missing-after-remove", await manager.FindByLoginAsync("Pipe", "Provider|Key"), null);
        User("empty-components-missing-before-add", await manager.FindByLoginAsync("", ""), null);
        Success("manager-add-empty-components", await manager.AddLoginAsync(first, new UserLoginInfo("", "", "empty")));
        User("empty-components-return-exact-user", await manager.FindByLoginAsync("", ""), first);
        Success("manager-remove-empty-components", await manager.RemoveLoginAsync(first, "", ""));
        User("empty-components-null-after-remove", await manager.FindByLoginAsync("", ""), null);
    }

    private static async Task Run(string name, string finding, string ownerType, Func<Task> action)
    {
        Checks.Clear();
        try
        {
            await action();
            Rows.Add(new { name, finding, ownerType, outcome = "Passed", checks = Checks.ToArray() });
        }
        catch (Exception exception)
        {
            Rows.Add(new { name, finding, ownerType, outcome = "Failed", exception = exception.ToString(), checks = Checks.ToArray() });
            throw;
        }
    }

    private static async Task<int> Main(string[] args)
    {
        if (args.Length != 3)
        {
            Console.Error.WriteLine("Expected: role output-json identity-json");
            return 2;
        }

        var exitCode = 0;
        string? failure = null;
        try
        {
            await Run("F173_RoleId_ManagerIdentityLifecycle", "F173", typeof(InMemoryStore<PocoUser, PocoRole>).FullName!, RoleIdLifecycle);
            await Run("F174_Login_ManagerIdentityLifecycle_BaseStore", "F174", typeof(InMemoryUserStore<PocoUser>).FullName!, () => LoginLifecycle(false));
            await Run("F174_Login_ManagerIdentityLifecycle_InheritedStore", "F174", typeof(InMemoryStore<PocoUser, PocoRole>).FullName!, () => LoginLifecycle(true));
            await Run("F174_Login_ComposedKeyAndEmptyComponents", "F174", typeof(InMemoryUserStore<PocoUser>).FullName!, LoginKeyComposition);
            await Run("F175_UserId_ManagerIdentityLifecycle_BaseStore", "F175", typeof(InMemoryUserStore<PocoUser>).FullName!, () => UserIdLifecycle(false));
            await Run("F175_UserId_ManagerIdentityLifecycle_InheritedStore", "F175", typeof(InMemoryStore<PocoUser, PocoRole>).FullName!, () => UserIdLifecycle(true));
        }
        catch (Exception exception)
        {
            exitCode = 1;
            failure = exception.ToString();
        }

        var output = new
        {
            role = args[0],
            boundary = "Supplemental console checks; not discovered VSTest tests",
            consumer = IdentityObservation.Assembly(typeof(Program).Assembly),
            owner = IdentityObservation.Assembly(typeof(InMemoryUserStore<PocoUser>).Assembly),
            managerProducer = IdentityObservation.Assembly(typeof(UserManager<PocoUser>).Assembly),
            coreLib = IdentityObservation.Assembly(typeof(object).Assembly),
            rows = Rows,
            exitCode,
            failure
        };
        File.WriteAllText(args[1], JsonSerializer.Serialize(output, new JsonSerializerOptions { WriteIndented = true }));
        IdentityObservation.Write(args[2], "supplemental-real-store-manager-consumer");
        Console.WriteLine(JsonSerializer.Serialize(new { role = args[0], exitCode, rows = Rows.Count, failure }));
        return exitCode;
    }
}
