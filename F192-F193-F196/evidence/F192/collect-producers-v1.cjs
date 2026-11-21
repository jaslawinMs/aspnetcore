const fs = require("node:fs");
const path = require("node:path");
const { ROOT, receipts, utc, put, json, run, git } = require("./source-io-v1.cjs");
const roles = require("./source-roles.json");

try {
    for (const [role, revision] of [["original", roles.original], ["default", roles.observedDefault]]) {
        for (const [label, file] of [
            ["wix-props", "src/Installers/Windows/Wix.props"],
            ["windows-props", "src/Installers/Windows/Directory.Build.props"],
            ["windows-targets", "src/Installers/Windows/Directory.Build.targets"],
            ["windows-readme", "src/Installers/Windows/README.md"],
            ["windows-build", "src/Installers/Windows/build.ps1"],
            ["host-options-project", "src/Installers/Windows/HostOptions/HostOptions.wixproj"],
            ["host-options-product", "src/Installers/Windows/HostOptions/Product.wxs"],
            ["bundle-project", "src/Installers/Windows/WindowsHostingBundle/WindowsHostingBundle.wixproj"],
            ["bundle-product-targets", "src/Installers/Windows/WindowsHostingBundle/Product.targets"],
            ["bundle-wxs", "src/Installers/Windows/WindowsHostingBundle/Bundle.wxs"],
            ["ancm-project", "src/Installers/Windows/AspNetCoreModule-Setup/ANCMV2/AncmV2.wixproj"],
            ["ancm-express-project", "src/Installers/Windows/AspNetCoreModule-Setup/ANCMIISExpressV2/AncmIISExpressV2.wixproj"],
            ["ancm-props", "src/Installers/Windows/AspNetCoreModule-Setup/Directory.Build.props"],
            ["root-props", "Directory.Build.props"],
            ["eng-versions", "eng/Versions.props"],
            ["eng-common-props", "eng/Common.props"],
            ["eng-build-props", "eng/Build.props"],
            ["tfm-update-doc", "docs/UpdatingMajorVersionAndTFM.md"]
        ]) {
            git(`${role}-${label}-membership`, "ls-tree", revision, "--", file);
            git(`${role}-${label}-raw`, "show", `${revision}:${file}`);
        }
        git(`${role}-wix-imports`, "grep", "-n", "-I", "-e", "Wix.props", "-e", "Wix.targets",
            "-e", "DisableGuidGeneration", revision, "--");
        git(`${role}-guid-related-properties`, "grep", "-n", "-I", "-E",
            "-e", "<(AspNetCoreMajorMinorVersion|AspNetCoreMajorVersion|AspNetCoreMinorVersion|AspNetCorePatchVersion|VersionSuffix|Platform|OutputType|ProductNameShort|NamespaceGuid|DefaultNetCoreTargetFramework|BundledNETCoreAppTargetFramework)[ >]",
            revision, "--", "src/Installers", "src/Framework", "eng", "Directory.Build.props", "Directory.Build.targets");
        git(`${role}-guid-material-history`, "log", "--follow", "--max-count=8",
            "--format=%H%n%aI%n%s", "-p", "-G", "ToArray|ToLowerInvariant|var value",
            revision, "--", "eng/tools/RepoTasks/GenerateGuid.cs");
        git(`${role}-wix-guid-history`, "log", "--max-count=16", "--format=%H%n%aI%n%s",
            "-p", "-G", "GuidInputs|ProductCode|UpgradeCode|GenerateGuid",
            revision, "--", "src/Installers/Windows/Wix.targets");
    }
    const installed = [];
    for (const [label, file] of [
        ["sdk-version", String.raw`.dotnet\sdk\12.0.100-alpha.1.26557.102\.version`],
        ["sdk-msbuild-runtimeconfig", String.raw`.dotnet\sdk\12.0.100-alpha.1.26557.102\MSBuild.runtimeconfig.json`],
        ["sdk-dotnet-runtimeconfig", String.raw`.dotnet\sdk\12.0.100-alpha.1.26557.102\dotnet.runtimeconfig.json`],
        ["runtime-26557-version", String.raw`.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26557.102\.version`],
        ["runtime-26562-version", String.raw`.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26562.105\.version`],
        ["runtime-26565-version", String.raw`.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26565.104\.version`]
    ]) {
        const absolute = path.join(ROOT, file);
        const exists = fs.existsSync(absolute);
        installed.push({
            observedUtc: utc(), label, path: absolute, exists,
            artifact: exists ? put(path.join("installed-source-identity", label + ".raw"), fs.readFileSync(absolute)) : null,
            executableStarted: false
        });
    }
    json("installed-source-identity.json", installed);
    run("installed-msbuild-file-identity", [
        "powershell", "-NoProfile", "-NonInteractive", "-Command",
        String.raw`$p='C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102\Microsoft.Build.dll'; $f=Get-Item -LiteralPath $p; [pscustomobject]@{Path=$f.FullName;ProductVersion=$f.VersionInfo.ProductVersion;FileVersion=$f.VersionInfo.FileVersion;MetadataReadOnly=$true} | ConvertTo-Json -Compress`
    ]);
    const gh = ["gh", "api", "--method", "GET"];
    run("upstream-related-pr26064", [...gh, "repos/dotnet/aspnetcore/pulls/26064"]);
    run("upstream-related-pr26064-files", [...gh, "repos/dotnet/aspnetcore/pulls/26064/files", "-f", "per_page=20"]);
    run("upstream-related-pr26065", [...gh, "repos/dotnet/aspnetcore/pulls/26065"]);
    run("upstream-related-pr26065-files", [...gh, "repos/dotnet/aspnetcore/pulls/26065/files", "-f", "per_page=20"]);
} finally {
    json("producer-command-index-v1.json", receipts);
}
