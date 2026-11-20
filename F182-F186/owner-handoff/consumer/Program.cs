using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.InMemory;
using Microsoft.AspNetCore.Identity.Test;
using Microsoft.Extensions.DependencyInjection;

internal static class Program
{
    private static readonly List<object> Rows = [];
    private static List<object> _checks = [];
    private static string _role = "";
    private static string _output = "";
    private static bool _failed;

    private static void Check(string name, bool passed, object? observed = null)
    {
        _checks.Add(new { name, passed, observed });
        if (!passed)
        {
            throw new InvalidOperationException(name);
        }
    }

    private static void Success(string name, IdentityResult result)
    {
        Check(name, result.Succeeded, new { result.Succeeded, errors = result.Errors.Select(e => e.Code).ToArray() });
    }

    private static void Failure(string name, IdentityResult result, string error)
    {
        var codes = result.Errors.Select(e => e.Code).ToArray();
        Check(name, !result.Succeeded && codes.SequenceEqual([error]), new { result.Succeeded, codes });
    }

    private static void SameRole(string name, PocoRole? actual, PocoRole? expected)
    {
        Check(name, ReferenceEquals(actual, expected), new { actualId = actual?.Id, actualName = actual?.Name, expectedId = expected?.Id, referenceEquals = ReferenceEquals(actual, expected) });
    }

    private static void Users(string name, IList<PocoUser> actual, params PocoUser[] expected)
    {
        Check(name, actual.Count == expected.Length && actual.Zip(expected).All(p => ReferenceEquals(p.First, p.Second)),
            new { actualIds = actual.Select(u => u.Id).ToArray(), expectedIds = expected.Select(u => u.Id).ToArray(), exactReferenceOrder = true });
    }

    private static async Task Throws<TException>(string name, Func<Task> action) where TException : Exception
    {
        Exception? observed = null;
        try
        {
            await action();
        }
        catch (Exception exception)
        {
            observed = exception;
        }

        Check(name, observed?.GetType() == typeof(TException), new { expected = typeof(TException).FullName, actual = observed?.GetType().FullName, message = observed?.Message });
    }

    private static ServiceProvider Provider(InMemoryStore<PocoUser, PocoRole> store)
    {
        var services = new ServiceCollection();
        services.AddIdentityCore<PocoUser>(options => options.User.AllowedUserNameCharacters = null).AddRoles<PocoRole>();
        services.AddSingleton<IUserStore<PocoUser>>(store);
        services.AddSingleton<IRoleStore<PocoRole>>(store);
        return services.BuildServiceProvider(new ServiceProviderOptions { ValidateScopes = true });
    }

    private static async Task ManagerMembershipAndMissing()
    {
        var store = new InMemoryStore<PocoUser, PocoRole>();
        using var provider = Provider(store);
        using var first = provider.CreateScope();
        using var second = provider.CreateScope();
        var users = first.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var roles = first.ServiceProvider.GetRequiredService<RoleManager<PocoRole>>();
        var otherUsers = second.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var otherRoles = second.ServiceProvider.GetRequiredService<RoleManager<PocoRole>>();
        Check("exact-store-serves-both-interfaces", ReferenceEquals(store, first.ServiceProvider.GetRequiredService<IUserStore<PocoUser>>()) && ReferenceEquals(store, first.ServiceProvider.GetRequiredService<IRoleStore<PocoRole>>()));
        Check("same-store-in-second-scope", ReferenceEquals(store, second.ServiceProvider.GetRequiredService<IUserStore<PocoUser>>()) && ReferenceEquals(store, second.ServiceProvider.GetRequiredService<IRoleStore<PocoRole>>()));
        Check("managers-are-scoped-not-shared", !ReferenceEquals(users, otherUsers) && !ReferenceEquals(roles, otherRoles));
        Check("actual-default-normalizer", first.ServiceProvider.GetRequiredService<ILookupNormalizer>().GetType() == typeof(UpperInvariantLookupNormalizer));
        var role = new PocoRole("MiXeD Staff") { Id = "staff-id" };
        var a = new PocoUser { Id = "user-z", UserName = "Zulu" };
        var b = new PocoUser { Id = "user-a", UserName = "Alpha" };
        var outsider = new PocoUser { Id = "outside", UserName = "Outside" };
        Success("create-first-user", await users.CreateAsync(a));
        Success("create-second-user", await users.CreateAsync(b));
        Success("create-outsider", await users.CreateAsync(outsider));
        SameRole("missing-role-name-before-create", await roles.FindByNameAsync("mixed staff"), null);
        Check("missing-membership-false", !await users.IsInRoleAsync(a, "Missing"));
        Users("missing-users-list-empty", await users.GetUsersInRoleAsync("Missing"));
        Success("missing-role-add-is-manager-success", await users.AddToRoleAsync(a, "Missing"));
        Check("missing-add-did-not-create-association", a.Roles.Count == 0, new { associations = a.Roles.Count });
        Failure("missing-remove-precheck-failure", await users.RemoveFromRoleAsync(a, "Missing"), "UserNotInRole");
        Success("create-role-through-manager", await roles.CreateAsync(role));
        Check("manager-populates-upper-invariant-normalized-name", role.NormalizedName == "MIXED STAFF", new { role.Name, role.NormalizedName });
        var equalName = new string("mixed staff".ToCharArray());
        Check("equal-name-is-new-string-instance", equalName == "mixed staff" && !ReferenceEquals(equalName, "mixed staff"));
        SameRole("equal-value-and-case-manager-lookup", await roles.FindByNameAsync(equalName), role);
        SameRole("repeat-role-lookup-exact-reference", await otherRoles.FindByNameAsync("MIXED STAFF"), role);
        Check("existing-but-unassociated-false", !await users.IsInRoleAsync(a, equalName));
        Users("existing-but-no-users-empty", await users.GetUsersInRoleAsync(equalName));
        Success("add-second-created-user-first", await users.AddToRoleAsync(b, equalName));
        Success("add-first-created-user-second", await users.AddToRoleAsync(a, "MiXeD Staff"));
        Check("association-has-real-user-and-role-id", a.Roles.Count == 1 && a.Roles.Single().RoleId == role.Id && a.Roles.Single().UserId == a.Id);
        Check("member-hit-case-normalized", await otherUsers.IsInRoleAsync(a, "mixed STAFF"));
        Check("repeated-member-hit", await users.IsInRoleAsync(a, equalName));
        Users("users-are-exact-references-in-user-insertion-not-add-or-name-order", await otherUsers.GetUsersInRoleAsync("MIXED STAFF"), a, b);
        Check("outside-user-not-member", !await users.IsInRoleAsync(outsider, equalName));
        Failure("repeat-add-rejected-before-store-add", await users.AddToRoleAsync(a, equalName), "UserAlreadyInRole");
        Check("repeat-add-retains-single-association", a.Roles.Count == 1);
        Success("remove-first-user", await users.RemoveFromRoleAsync(a, equalName));
        Check("removed-user-not-member", !await users.IsInRoleAsync(a, equalName));
        Users("remove-preserves-other-user", await users.GetUsersInRoleAsync(equalName), b);
        Failure("repeated-remove-rejected-before-store-remove", await users.RemoveFromRoleAsync(a, equalName), "UserNotInRole");
        Success("readd-first-user", await users.AddToRoleAsync(a, equalName));
        Users("readd-restores-user-insertion-order", await users.GetUsersInRoleAsync(equalName), a, b);
        Success("remove-second-user", await users.RemoveFromRoleAsync(b, equalName));
        Success("remove-readded-first-user", await users.RemoveFromRoleAsync(a, equalName));
        Users("all-members-removed-empty", await users.GetUsersInRoleAsync(equalName));
        Check("no-association-after-removals", a.Roles.Count == 0 && b.Roles.Count == 0);
    }

    private static async Task ManagerNameLifetime()
    {
        var store = new InMemoryStore<PocoUser, PocoRole>();
        using var provider = Provider(store);
        using var scope = provider.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<PocoRole>>();
        var role = new PocoRole("Before") { Id = "stable-role" };
        var control = new PocoRole("Control") { Id = "control-role" };
        var user = new PocoUser { Id = "member", UserName = "Member" };
        Success("create-user", await users.CreateAsync(user));
        Success("create-lifecycle-role", await roles.CreateAsync(role));
        Success("create-control-role", await roles.CreateAsync(control));
        Success("create-membership", await users.AddToRoleAsync(user, "Before"));
        Success("set-name-public-manager", await roles.SetRoleNameAsync(role, "After"));
        Check("set-name-mutates-normalized-property", role.Name == "After" && role.NormalizedName == "AFTER", new { role.Name, role.NormalizedName });
        SameRole("stored-reference-sees-set-name-before-update", await roles.FindByNameAsync("after"), role);
        SameRole("old-name-gone-before-update", await roles.FindByNameAsync("Before"), null);
        Check("old-membership-name-no-longer-matches", !await users.IsInRoleAsync(user, "Before"));
        Check("same-role-id-means-new-name-membership", await users.IsInRoleAsync(user, "After"));
        Users("new-name-resolves-existing-association-before-update", await users.GetUsersInRoleAsync("After"), user);
        Success("update-same-reference", await roles.UpdateAsync(role));
        var replacement = new PocoRole("Replacement") { Id = role.Id };
        Success("update-replacement-object-same-id", await roles.UpdateAsync(replacement));
        SameRole("replacement-reference-not-old-object", await roles.FindByNameAsync("replacement"), replacement);
        SameRole("replaced-object-name-no-longer-indexed", await roles.FindByNameAsync("After"), null);
        Check("old-object-not-mutated-by-replacement", role.Name == "After" && !ReferenceEquals(role, replacement));
        Check("same-id-replacement-keeps-membership", await users.IsInRoleAsync(user, "Replacement"));
        Users("same-id-replacement-users-exact-reference", await users.GetUsersInRoleAsync("replacement"), user);
        Check("role-list-uses-replacement-name", (await users.GetRolesAsync(user)).SequenceEqual(["Replacement"]));
        Success("delete-role-with-membership", await roles.DeleteAsync(replacement));
        SameRole("name-missing-after-delete", await roles.FindByNameAsync("Replacement"), null);
        Check("deleted-name-membership-false", !await users.IsInRoleAsync(user, "Replacement"));
        Users("deleted-name-users-empty", await users.GetUsersInRoleAsync("Replacement"));
        Check("delete-does-not-remove-user-association", user.Roles.Count == 1 && user.Roles.Single().RoleId == replacement.Id);
        await Throws<KeyNotFoundException>("get-role-names-observes-orphaned-id", async () => { await users.GetRolesAsync(user); });
        var sameId = new PocoRole("Reborn") { Id = replacement.Id };
        Success("recreate-original-id", await roles.CreateAsync(sameId));
        SameRole("recreated-role-reference", await roles.FindByNameAsync("Reborn"), sameId);
        Check("same-id-recreate-rebinds-retained-association", await users.IsInRoleAsync(user, "Reborn"));
        Users("same-id-recreate-shows-retained-member", await users.GetUsersInRoleAsync("Reborn"), user);
        Check("role-list-restored-by-same-id", (await users.GetRolesAsync(user)).SequenceEqual(["Reborn"]));
        Success("remove-rebound-association", await users.RemoveFromRoleAsync(user, "Reborn"));
        Success("delete-recreated-original-id", await roles.DeleteAsync(sameId));
        var newId = new PocoRole("Reborn") { Id = "new-role-id" };
        Success("same-name-recreated-with-new-id", await roles.CreateAsync(newId));
        SameRole("same-name-new-id-reference", await roles.FindByNameAsync("reborn"), newId);
        Check("new-id-does-not-inherit-old-membership", !await users.IsInRoleAsync(user, "Reborn"));
        Users("new-id-user-list-empty", await users.GetUsersInRoleAsync("Reborn"));
        Success("add-to-new-id", await users.AddToRoleAsync(user, "Reborn"));
        Check("new-association-uses-new-id", user.Roles.Count == 1 && user.Roles.Single().RoleId == newId.Id);
        SameRole("unrelated-role-reference-unchanged", await roles.FindByNameAsync("Control"), control);
    }

    private static async Task ManagerValidationAndInvalidArguments()
    {
        var store = new InMemoryStore<PocoUser, PocoRole>();
        using var provider = Provider(store);
        using var scope = provider.CreateScope();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<PocoRole>>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var role = new PocoRole("Caf\u00e9");
        Success("create-composed-name", await roles.CreateAsync(role));
        Check("actual-normalizer-canonicalizes-and-uppercases", role.NormalizedName == "CAF\u00c9", new { role.NormalizedName });
        SameRole("decomposed-case-lookup-real-normalizer", await roles.FindByNameAsync("cafe\u0301"), role);
        Failure("duplicate-exact-name-rejected", await roles.CreateAsync(new PocoRole("Caf\u00e9")), "DuplicateRoleName");
        Failure("duplicate-case-name-rejected", await roles.CreateAsync(new PocoRole("CAF\u00c9")), "DuplicateRoleName");
        Failure("duplicate-canonically-equivalent-name-rejected", await roles.CreateAsync(new PocoRole("cafe\u0301")), "DuplicateRoleName");
        foreach (var (value, label) in new (string?, string)[] { (null, "null"), ("", "empty"), (" ", "whitespace") })
        {
            Failure($"create-{label}-name-rejected", await roles.CreateAsync(new PocoRole { Name = value! }), "InvalidRoleName");
        }
        Check("invalid-create-attempts-did-not-add-roles", roles.Roles.Count() == 1);
        await Throws<ArgumentNullException>("manager-find-null-name-guard", async () => { await roles.FindByNameAsync(null!); });
        await Throws<ArgumentNullException>("manager-user-list-null-name-guard", async () => { await users.GetUsersInRoleAsync(null!); });
        await Throws<ArgumentException>("empty-name-reaches-store-user-list-guard", async () => { await users.GetUsersInRoleAsync(""); });
        var user = new PocoUser { UserName = "Arguments", Id = "argument-user" };
        Success("create-argument-user", await users.CreateAsync(user));
        Check("null-membership-argument-no-null-role-is-false", !await users.IsInRoleAsync(user, null!));
        Success("null-add-argument-no-null-role-is-noop-success", await users.AddToRoleAsync(user, null!));
        Failure("null-remove-argument-precheck", await users.RemoveFromRoleAsync(user, null!), "UserNotInRole");
        Check("invalid-null-role-arguments-did-not-add-association", user.Roles.Count == 0);
    }

    private static async Task PublicSetterDuplicates()
    {
        var store = new InMemoryStore<PocoUser, PocoRole>();
        using var provider = Provider(store);
        using var scope = provider.CreateScope();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<PocoRole>>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var first = new PocoRole("Shared") { Id = "duplicate-first" };
        var second = new PocoRole("Other") { Id = "duplicate-second" };
        var user = new PocoUser { UserName = "Duplicate", Id = "duplicate-user" };
        Success("validated-create-first", await roles.CreateAsync(first));
        Success("validated-create-second-distinct", await roles.CreateAsync(second));
        Success("validated-create-user", await users.CreateAsync(user));
        Success("public-set-name-does-not-run-uniqueness-validator", await roles.SetRoleNameAsync(second, "SHARED"));
        Check("setter-produced-two-live-equal-normalized-names", first.NormalizedName == "SHARED" && second.NormalizedName == "SHARED" && roles.Roles.Count() == 2);
        await Throws<InvalidOperationException>("F182-direct-real-store-add-duplicate-role-names", () => store.AddToRoleAsync(user, "SHARED"));
        await Throws<InvalidOperationException>("F183-direct-real-store-remove-duplicate-role-names", () => store.RemoveFromRoleAsync(user, "SHARED"));
        await Throws<InvalidOperationException>("F184-manager-membership-duplicate-role-names", async () => { await users.IsInRoleAsync(user, "Shared"); });
        await Throws<InvalidOperationException>("F185-manager-user-list-duplicate-role-names", async () => { await users.GetUsersInRoleAsync("Shared"); });
        await Throws<InvalidOperationException>("F186-manager-name-duplicate-role-names", async () => { await roles.FindByNameAsync("Shared"); });
        await Throws<InvalidOperationException>("update-validator-lookup-also-observes-duplicates", async () => { await roles.UpdateAsync(second); });
        Check("duplicate-errors-did-not-add-association", user.Roles.Count == 0);
        Success("public-set-name-restores-distinct-name", await roles.SetRoleNameAsync(second, "Other"));
        Success("validated-update-after-restoration", await roles.UpdateAsync(second));
        SameRole("first-reference-restored", await roles.FindByNameAsync("Shared"), first);
        SameRole("second-reference-restored", await roles.FindByNameAsync("Other"), second);
    }

    private static async Task PublicSetterNullAndOrder(bool nullFirst)
    {
        var store = new InMemoryStore<PocoUser, PocoRole>();
        using var provider = Provider(store);
        using var scope = provider.CreateScope();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<PocoRole>>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var normal = new PocoRole("Normal") { Id = "normal" };
        var nullable = new PocoRole("Temporary") { Id = "nullable" };
        var user = new PocoUser { UserName = "NullBoundary", Id = "null-boundary-user" };
        Success("create-first-role", await roles.CreateAsync(nullFirst ? nullable : normal));
        Success("create-second-role", await roles.CreateAsync(nullFirst ? normal : nullable));
        Success("create-user", await users.CreateAsync(user));
        Success("public-nullable-set-name-produces-null-normalized-name", await roles.SetRoleNameAsync(nullable, null));
        Check("null-property-and-enumeration-order-observed", nullable.Name is null && nullable.NormalizedName is null &&
            ReferenceEquals(roles.Roles.First(), nullFirst ? nullable : normal), new { nullFirst, ids = roles.Roles.Select(r => r.Id).ToArray() });
        Failure("update-validation-rejects-null-but-reference-already-mutated", await roles.UpdateAsync(nullable), "InvalidRoleName");
        SameRole("direct-role-store-null-name-matches-null-normalized-property", await ((IRoleStore<PocoRole>)store).FindByNameAsync(null!, CancellationToken.None), nullable);
        SameRole("nonnull-role-name-lookup-survives-other-null-property", await roles.FindByNameAsync("Normal"), normal);
        Check("F184-null-equality-matches-no-association-yet", !await store.IsInRoleAsync(user, null!));
        await store.AddToRoleAsync(user, null!);
        Check("F182-direct-null-name-add-resolves-null-role", user.Roles.Count == 1 && user.Roles.Single().RoleId == nullable.Id);
        Check("F184-direct-null-name-member-hit", await store.IsInRoleAsync(user, null!));
        await store.RemoveFromRoleAsync(user, null!);
        Check("F183-direct-null-name-remove-clears-association", user.Roles.Count == 0);
        await Throws<NullReferenceException>("F185-user-list-throws-even-if-normal-match-precedes-null", async () => { await users.GetUsersInRoleAsync("Normal"); });
        await Throws<ArgumentNullException>("manager-role-name-null-is-still-guarded", async () => { await roles.FindByNameAsync(null!); });
        Success("restore-valid-name-through-public-setter", await roles.SetRoleNameAsync(nullable, "Restored"));
        Success("validate-restored-name", await roles.UpdateAsync(nullable));
        Users("user-list-recovers-after-name-restored", await users.GetUsersInRoleAsync("Normal"));
    }

    private static async Task DirectStoreComparerAndMissingDiagnostics()
    {
        var store = new InMemoryStore<PocoUser, PocoRole>();
        IRoleStore<PocoRole> roles = store;
        var upper = new PocoRole("Upper raw") { Id = "upper", NormalizedName = "MIXED" };
        var lower = new PocoRole("Lower raw") { Id = "lower", NormalizedName = "mixed" };
        var a = new PocoUser { UserName = "First", Id = "raw-first" };
        var b = new PocoUser { UserName = "Second", Id = "raw-second" };
        Success("direct-store-create-first-user", await store.CreateAsync(a));
        Success("direct-store-create-second-user", await store.CreateAsync(b));
        Success("direct-store-create-raw-upper-role", await roles.CreateAsync(upper, CancellationToken.None));
        Success("direct-store-create-raw-lower-role", await roles.CreateAsync(lower, CancellationToken.None));
        await store.AddToRoleAsync(a, new string("MIXED".ToCharArray()));
        await store.AddToRoleAsync(b, "mixed");
        Check("F182-case-exact-role-selected-not-universal-case-insensitive", a.Roles.Single().RoleId == upper.Id && b.Roles.Single().RoleId == lower.Id);
        Check("F184-case-exact-membership-positive-and-negative", await store.IsInRoleAsync(a, "MIXED") && !await store.IsInRoleAsync(a, "mixed") && !await store.IsInRoleAsync(a, "MiXeD"));
        Users("F185-upper-exact-list", await store.GetUsersInRoleAsync("MIXED"), a);
        Users("F185-lower-exact-list", await store.GetUsersInRoleAsync("mixed"), b);
        Users("F185-mixed-case-list-missing", await store.GetUsersInRoleAsync("MiXeD"));
        await Throws<InvalidOperationException>("F186-ordinal-ignore-case-sees-two-matches", async () => { await roles.FindByNameAsync("MiXeD", CancellationToken.None); });
        await Throws<NullReferenceException>("F183-direct-missing-role-dereferences-null", () => store.RemoveFromRoleAsync(a, "Missing"));
        await Throws<ArgumentNullException>("F185-direct-null-argument-guard", async () => { await store.GetUsersInRoleAsync(null!); });
        await Throws<ArgumentException>("F185-direct-empty-argument-guard", async () => { await store.GetUsersInRoleAsync(""); });
        await store.RemoveFromRoleAsync(a, "MIXED");
        Check("F183-case-exact-removal-leaves-other-role-member", a.Roles.Count == 0 && await store.IsInRoleAsync(b, "mixed"));
        await store.RemoveFromRoleAsync(a, "Missing");
        Check("F183-missing-role-with-empty-association-list-does-not-evaluate-null-dereference", a.Roles.Count == 0);
        Users("F185-removal-list-empty", await store.GetUsersInRoleAsync("MIXED"));
        Success("direct-delete-lower-role", await roles.DeleteAsync(lower, CancellationToken.None));
        SameRole("F186-single-ignore-case-match-returns-exact-upper", await roles.FindByNameAsync("mixed", CancellationToken.None), upper);
    }

    private static async Task DirectStoreDuplicateAssociations()
    {
        var store = new InMemoryStore<PocoUser, PocoRole>();
        var role = new PocoRole("Direct") { Id = "direct-role", NormalizedName = "DIRECT" };
        var user = new PocoUser { Id = "direct-user", UserName = "DirectUser" };
        Success("direct-create-role", await ((IRoleStore<PocoRole>)store).CreateAsync(role, CancellationToken.None));
        Success("direct-create-user", await store.CreateAsync(user));
        await store.AddToRoleAsync(user, "DIRECT");
        await store.AddToRoleAsync(user, "DIRECT");
        Check("F182-direct-repeated-add-produces-two-associations", user.Roles.Count == 2 && user.Roles.All(r => r.RoleId == role.Id && r.UserId == user.Id));
        Check("F184-any-membership-remains-true", await store.IsInRoleAsync(user, "DIRECT"));
        Users("F185-any-user-selection-does-not-duplicate-user", await store.GetUsersInRoleAsync("DIRECT"), user);
        await Throws<InvalidOperationException>("F183-user-association-single-or-default-rejects-duplicate-associations", () => store.RemoveFromRoleAsync(user, "DIRECT"));
        Check("failed-duplicate-remove-leaves-associations-intact", user.Roles.Count == 2);
    }

    private static async Task PublicSetterEmptyName()
    {
        var store = new InMemoryStore<PocoUser, PocoRole>();
        using var provider = Provider(store);
        using var scope = provider.CreateScope();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<PocoRole>>();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<PocoUser>>();
        var role = new PocoRole("InitiallyValid") { Id = "empty-name-role" };
        var user = new PocoUser { UserName = "EmptyName", Id = "empty-name-user" };
        Success("validated-create-role", await roles.CreateAsync(role));
        Success("validated-create-user", await users.CreateAsync(user));
        Success("public-setter-produces-empty-normalized-name", await roles.SetRoleNameAsync(role, ""));
        Check("stored-empty-name-and-normalized-name", role.Name == "" && role.NormalizedName == "");
        Failure("update-rejects-empty-name-after-reference-mutation", await roles.UpdateAsync(role), "InvalidRoleName");
        SameRole("F186-manager-empty-lookup-returns-stored-role", await roles.FindByNameAsync(""), role);
        Check("F184-empty-name-not-member-before-add", !await users.IsInRoleAsync(user, ""));
        Success("F182-manager-empty-name-add", await users.AddToRoleAsync(user, ""));
        Check("F184-empty-name-is-member-after-add", await users.IsInRoleAsync(user, "") && user.Roles.Single().RoleId == role.Id);
        await Throws<ArgumentException>("F185-empty-user-list-is-guarded-even-with-matching-role-and-member", async () => { await users.GetUsersInRoleAsync(""); });
        Success("F183-manager-empty-name-remove", await users.RemoveFromRoleAsync(user, ""));
        Check("empty-name-association-removed", user.Roles.Count == 0 && !await users.IsInRoleAsync(user, ""));
        Success("restore-nonempty-name", await roles.SetRoleNameAsync(role, "Restored"));
        Success("validate-restored-nonempty-name", await roles.UpdateAsync(role));
    }

    private static string Hash(string filename) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(filename)));

    private static object AssemblyIdentity(Assembly assembly)
    {
        var location = assembly.IsDynamic ? "" : assembly.Location;
        return new { name = assembly.GetName().Name, fullName = assembly.FullName, mvid = assembly.ManifestModule.ModuleVersionId, location,
            dynamic = assembly.IsDynamic, sha256 = string.IsNullOrEmpty(location) ? null : Hash(location),
            informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion };
    }

    private static void AtomicJson(string filename, object value)
    {
        File.WriteAllText(filename + ".stage", JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true }));
        File.Move(filename + ".stage", filename, overwrite: true);
    }

    private static void Identity(string filename, string boundary)
    {
        using var process = Process.GetCurrentProcess();
        var native = process.Modules.Cast<ProcessModule>()
            .Where(m => m.ModuleName is "coreclr.dll" or "hostfxr.dll" or "hostpolicy.dll" or "dotnet.exe")
            .Select(m => new { name = m.ModuleName, location = m.FileName, sha256 = Hash(m.FileName),
                fileVersion = FileVersionInfo.GetVersionInfo(m.FileName).FileVersion, productVersion = FileVersionInfo.GetVersionInfo(m.FileName).ProductVersion }).ToArray();
        AtomicJson(filename, new { boundary, observedAt = DateTime.UtcNow, processId = Environment.ProcessId, creationTimeUtc = process.StartTime.ToUniversalTime(),
            processPath = Environment.ProcessPath, commandLine = Environment.GetCommandLineArgs(), frameworkDescription = RuntimeInformation.FrameworkDescription,
            runtimeVersion = Environment.Version.ToString(), architecture = RuntimeInformation.ProcessArchitecture.ToString(),
            coreLib = AssemblyIdentity(typeof(object).Assembly), assemblies = AppDomain.CurrentDomain.GetAssemblies().OrderBy(a => a.FullName, StringComparer.Ordinal).Select(AssemblyIdentity).ToArray(),
            nativeModules = native, nativeModuleFilenameBounds = new[] { "coreclr.dll", "hostfxr.dll", "hostpolicy.dll", "dotnet.exe" } });
    }

    private static void Results(bool complete)
    {
        AtomicJson(_output, new { role = _role, boundary = "Supplemental console rows, not VSTest-discovered tests; actual public managers and real nonshipping store",
            complete, consumer = AssemblyIdentity(typeof(Program).Assembly), owner = AssemblyIdentity(typeof(InMemoryStore<PocoUser, PocoRole>).Assembly),
            managerProducer = AssemblyIdentity(typeof(UserManager<PocoUser>).Assembly), coreLib = AssemblyIdentity(typeof(object).Assembly),
            rows = Rows, exitCode = _failed ? 1 : 0 });
    }

    private static async Task Run(string name, string boundary, Func<Task> action)
    {
        _checks = [];
        string? failure = null;
        try
        {
            await action();
        }
        catch (Exception exception)
        {
            _failed = true;
            failure = exception.ToString();
        }

        Rows.Add(new { name, boundary, outcome = failure is null ? "Passed" : "Failed", checks = _checks, failure });
        Results(complete: false);
    }

    private static async Task<int> Main(string[] args)
    {
        if (args.Length != 3)
        {
            Console.Error.WriteLine("Expected: role output-json identity-json");
            return 2;
        }

        _role = args[0];
        _output = args[1];
        Identity(args[2] + ".entry.json", "Supplemental process entry; bounded snapshot, no startup hook");
        await Run("RoleNames_ManagerMembershipMissingAndOrdering", "Ordinary validated public-manager producer and caller-selected missing role", ManagerMembershipAndMissing);
        await Run("RoleNames_ManagerNormalizedNameUpdateDeleteReadd", "Public-manager creation/set/update/replacement/delete/recreate; exact stored object and role-ID membership", ManagerNameLifetime);
        await Run("RoleNames_ManagerNormalizationUniquenessAndArgumentBoundaries", "Default normalizer/validators and explicitly caller-supplied invalid arguments", ManagerValidationAndInvalidArguments);
        await Run("RoleNames_PublicSetterProducesDuplicateNames", "Actual public SetRoleNameAsync before validating Update; direct real-store leaf calls separately identified", PublicSetterDuplicates);
        await Run("RoleNames_PublicSetterNullNormalizedName_NullFirst", "Actual nullable public setter; direct real-store null-argument diagnostics; null role first in enumeration", () => PublicSetterNullAndOrder(true));
        await Run("RoleNames_PublicSetterNullNormalizedName_NullLast", "Actual nullable public setter; direct real-store null-argument diagnostics; valid match precedes null role", () => PublicSetterNullAndOrder(false));
        await Run("RoleNames_PublicSetterEmptyNormalizedName", "Actual public setter before validating Update; intentionally invalid stored name, not successful validated creation", PublicSetterEmptyName);
        await Run("RoleNames_DirectStoreComparerAndMissingDiagnostics", "Deliberate raw public-store creation, not default-manager-produced case-distinct normalized names", DirectStoreComparerAndMissingDiagnostics);
        await Run("RoleNames_DirectStoreDuplicateAssociationDiagnostics", "Deliberate direct public-store repeated add, unlike manager duplicate precheck", DirectStoreDuplicateAssociations);
        Results(complete: true);
        Identity(args[2], "Supplemental process exit snapshot; actual real-store public-manager consumer");
        Console.WriteLine(JsonSerializer.Serialize(new { role = _role, rows = Rows.Count, exitCode = _failed ? 1 : 0 }));
        return _failed ? 1 : 0;
    }
}
