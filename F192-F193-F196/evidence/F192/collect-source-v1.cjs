const { receipts, json, run, git } = require("./source-io-v1.cjs");
const roles = require("./source-roles.json");

try {
    for (const [role, revision] of [["original", roles.original], ["default", roles.observedDefault]]) {
        for (const [label, file] of [
            ["task-project", "eng/tools/RepoTasks/RepoTasks.csproj"],
            ["task-registration", "eng/tools/RepoTasks/RepoTasks.tasks"],
            ["uuid", "eng/tools/RepoTasks/Uuid.cs"],
            ["wix-targets", "src/Installers/Windows/Wix.targets"]
        ]) {
            git(`${role}-${label}-membership`, "ls-tree", revision, "--", file);
            git(`${role}-${label}-raw`, "show", `${revision}:${file}`);
        }
        git(`${role}-wix-tree`, "ls-tree", "-r", "--name-only", revision, "--", "src/Installers/Windows");
        git(`${role}-wix-producers`, "grep", "-n", "-I", "-E",
            "-e", "GuidInputs|ProductNameShort|HostOptionsNameShort|NamespaceGuid|BundleGuid",
            revision, "--", "src/Installers/Windows", "eng", "Directory.Build.props", "Directory.Build.targets");
        git(`${role}-task-imports`, "grep", "-n", "-I", "-e", "RepoTasks.tasks",
            "-e", "_RepoTaskAssembly", "-e", "RepoTasks.csproj", revision, "--");
        git(`${role}-generate-guid-history`, "log", "--follow", "--max-count=12",
            "--format=fuller", "--name-status", revision, "--", "eng/tools/RepoTasks/GenerateGuid.cs");
        git(`${role}-generate-guid-history-patch`, "log", "--follow", "--max-count=8",
            "--format=fuller", "-p", revision, "--", "eng/tools/RepoTasks/GenerateGuid.cs");
        git(`${role}-wix-targets-history`, "log", "--max-count=10", "--format=fuller",
            "--name-status", revision, "--", "src/Installers/Windows/Wix.targets");
    }
    const gh = ["gh", "api", "--method", "GET"];
    for (const [label, repo] of [["upstream", "dotnet/aspnetcore"], ["fork", "jaslawinMs/aspnetcore"]]) {
        run(`${label}-related-generate-guid`, [...gh, "search/issues",
            "-f", `q=repo:${repo} "GenerateGuid"`, "-f", "per_page=20"]);
        run(`${label}-related-wix-guid`, [...gh, "search/issues",
            "-f", `q=repo:${repo} "Wix" "Guid"`, "-f", "per_page=20"]);
        run(`${label}-task-remote-history`, [...gh, `repos/${repo}/commits`,
            "-f", "path=eng/tools/RepoTasks/GenerateGuid.cs",
            "-f", `sha=${label === "upstream" ? roles.observedDefault : "main"}`,
            "-f", "per_page=10"]);
    }
} finally {
    json("source-command-index-v1.json", receipts);
}
