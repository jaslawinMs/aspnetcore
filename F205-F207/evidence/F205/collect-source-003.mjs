import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const helper = fileURLToPath(import.meta.url);
const root = dirname(helper);
const repo = String.raw`C:\src\aspnetcore`;
const roles = JSON.parse(readFileSync(join(root, "source-roles-002.json"), "utf8"));
const env = { ...process.env, GIT_OPTIONAL_LOCKS: "0", GH_PROMPT_DISABLED: "true", GH_NO_UPDATE_NOTIFIER: "1" };
const envKeys = [
  "PATH", "PATHEXT", "SYSTEMROOT", "COMSPEC", "GIT_OPTIONAL_LOCKS", "GIT_PAGER", "PAGER",
  "GH_PROMPT_DISABLED", "GH_NO_UPDATE_NOTIFIER", "GH_HOST", "DOTNET_ROOT", "DOTNET_ROOT_X64",
  "DOTNET_MULTILEVEL_LOOKUP", "DOTNET_GENERATE_ASPNET_CERTIFICATE",
  "DOTNET_ADD_GLOBAL_TOOLS_TO_PATH", "MSBUILDDISABLENODEREUSE", "NUGET_PACKAGES",
];
let receiptCount = 0;
const now = () => new Date().toISOString();
const sha = data => createHash("sha256").update(data).digest("hex").toUpperCase();
function write(relative, data) {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data, { flag: "wx" });
}
const json = (relative, data) => write(relative, JSON.stringify(data, null, 2) + "\n");
function run(label, executable, args, stdin = null) {
  const startedUtc = now();
  const result = spawnSync(executable, args, {
    cwd: repo, env, input: stdin, encoding: null, maxBuffer: 64 * 1024 * 1024, windowsHide: true,
  });
  const stdout = result.stdout ?? Buffer.alloc(0);
  const stderr = result.stderr ?? Buffer.alloc(0);
  const receipt = {
    label, argv: [executable, ...args], cwd: repo, startedUtc, completedUtc: now(),
    pid: result.pid, exitCode: result.status, signal: result.signal, spawnError: result.error?.message ?? null,
    stdout: `receipts-003\\${label}.stdout.bin`, stderr: `receipts-003\\${label}.stderr.bin`,
    stdoutBytes: stdout.length, stderrBytes: stderr.length, stdoutSha256: sha(stdout), stderrSha256: sha(stderr),
    stdin: stdin === null ? null : `receipts-003\\${label}.stdin.bin`,
    stdinBytes: stdin?.length ?? 0, stdinSha256: stdin === null ? null : sha(stdin),
    environment: Object.fromEntries(envKeys.map(key => [key, env[key] ?? null])),
    environmentScope: "Execution-relevant allowlist; authentication and unrelated ambient values deliberately not captured.",
    rootAwaited: true, redirectedStreamsReachedEof: !result.error,
    operationClass: "Read-only source/evidence, not a product build/test/performance execution",
  };
  write(receipt.stdout, stdout);
  write(receipt.stderr, stderr);
  if (stdin !== null) write(receipt.stdin, stdin);
  json(`receipts-003\\${label}.json`, receipt);
  receiptCount++;
  if (result.status !== 0 || result.error) throw new Error(`${label} exited ${result.status}; full streams retained`);
  return stdout;
}
const git = (label, args, stdin = null) => run(label, "git", ["--no-optional-locks", "--no-pager", "-C", repo, ...args], stdin);

const paths = [
  "src/Components/Endpoints/src/Builder/RazorComponentEndpointDataSource.cs",
  "src/Components/Endpoints/src/Builder/RenderModeEndpointProvider.cs",
  "src/Components/Endpoints/src/Builder/RazorComponentEndpointDataSourceFactory.cs",
  "src/Components/Endpoints/src/Builder/RazorComponentEndpointFactory.cs",
  "src/Components/Endpoints/src/Builder/RazorComponentDataSourceOptions.cs",
  "src/Components/Endpoints/src/Builder/ConfiguredRenderModesMetadata.cs",
  "src/Components/Endpoints/src/Builder/RazorComponentsEndpointConventionBuilder.cs",
  "src/Components/Endpoints/src/Builder/RazorComponentsEndpointConventionBuilderExtensions.cs",
  "src/Components/Endpoints/src/Builder/ComponentEndpointConventionBuilderHelper.cs",
  "src/Components/Endpoints/src/Builder/RazorComponentsEndpointRouteBuilderExtensions.cs",
  "src/Components/Endpoints/src/Builder/ResourceCollectionConvention.cs",
  "src/Components/Endpoints/src/DependencyInjection/HotReloadService.cs",
  "src/Components/Endpoints/src/DependencyInjection/RazorComponentsServiceCollectionExtensions.cs",
  "src/Components/Server/src/DependencyInjection/ServerRazorComponentsBuilderExtensions.cs",
  "src/Components/Server/src/Builder/ServerRazorComponentsEndpointConventionBuilderExtensions.cs",
  "src/Components/Server/src/Builder/InternalServerRenderMode.cs",
  "src/Components/WebAssembly/Server/src/WebAssemblyRazorComponentsBuilderExtensions.cs",
  "src/Components/WebAssembly/Server/src/WebAssemblyEndpointProvider.cs",
  "src/Components/WebAssembly/Server/src/Builder/WebAssemblyRazorComponentsEndpointConventionBuilderExtensions.cs",
  "src/Components/WebAssembly/Server/src/Builder/WebAssemblyRenderModeWithOptions.cs",
  "src/Components/Web/src/RenderMode/InteractiveServerRenderMode.cs",
  "src/Components/Web/src/RenderMode/InteractiveWebAssemblyRenderMode.cs",
  "src/Components/Web/src/RenderMode/InteractiveAutoRenderMode.cs",
  "src/DefaultBuilder/src/WebApplication.cs",
  "src/Http/Routing/src/IEndpointRouteBuilder.cs",
  "src/Http/Routing/src/DefaultEndpointRouteBuilder.cs",
  "src/Http/Routing/src/RouteGroupBuilder.cs",
  "src/Http/Http/src/Builder/ApplicationBuilder.cs",
  "src/Http/Http.Abstractions/src/IApplicationBuilder.cs",
  "src/Shared/CopyOnWriteDictionary/CopyOnWriteDictionary.cs",
  "src/Http/Routing/src/Matching/DataSourceDependentMatcher.cs",
  "src/Http/Routing/src/DataSourceDependentCache.cs",
  "src/Http/Routing/src/EndpointRoutingMiddleware.cs",
  "src/Components/Endpoints/test/RazorComponentEndpointDataSourceTest.cs",
  "src/Components/Endpoints/test/HotReloadServiceTests.cs",
  "src/Components/Endpoints/test/Builder/RazorComponentsEndpointConventionBuilderExtensionsTest.cs",
  "src/Components/Endpoints/test/Microsoft.AspNetCore.Components.Endpoints.Tests.csproj",
  "src/Components/build.cmd",
  "src/Components/Samples/BlazorWebAppGlobal/Program.cs",
  "src/Components/Samples/BlazorWebAppGlobal/Components/App.razor",
  "src/Components/Samples/BlazorWebAppPerPage/Program.cs",
  "src/Components/ARCHITECTURE.md",
  "docs/BlazorComponentsGuidance.md",
  "docs/CrossCuttingGuidance.md",
  "docs/BuildFromSource.md",
];

try {
  json("execution-003.json", {
    startedUtc: now(), helper, helperSha256: sha(readFileSync(helper)), argv: process.argv,
    pid: process.pid, parentPid: process.ppid, scope: "Bounded commit-pinned source/history capture only; no native product commands.",
    inputRoles: "source-roles-002.json", sourcePathCount: paths.length,
    sourceRoleRule: "Local reserved source reads and LSP were navigation only; these raw commit-object bytes are evidence for each role.",
  });
  const members = [];
  for (const [role, commit] of [["Original", roles.original.commit], ["Default", roles.default.commit]]) {
    const listing = git(`${role}-source-membership`, ["ls-tree", "-r", commit, "--", ...paths]);
    const entries = new Map(listing.toString("utf8").trim().split(/\r?\n/).filter(Boolean).map(line => {
      const match = /^([0-9]+) blob ([a-f0-9]{40})\t(.*)$/.exec(line);
      if (!match) throw new Error(`Unexpected ls-tree entry: ${line}`);
      return [match[3], { mode: match[1], blob: match[2] }];
    }));
    const existing = paths.filter(path => entries.has(path));
    const input = Buffer.from(existing.map(path => `${commit}:${path}\n`).join(""), "utf8");
    const batch = git(`${role}-source-raw-batch`, ["cat-file", "--batch"], input);
    let offset = 0;
    for (const path of paths) {
      const entry = entries.get(path);
      if (!entry) {
        members.push({ role, commit, path, present: false, rawArtifact: null });
        continue;
      }
      const end = batch.indexOf(10, offset);
      if (end < 0) throw new Error("Missing cat-file header");
      const header = /^([a-f0-9]{40}) blob ([0-9]+)$/.exec(batch.subarray(offset, end).toString("ascii"));
      if (!header || header[1] !== entry.blob) throw new Error(`Unexpected object header for ${path}`);
      const size = Number(header[2]);
      const raw = batch.subarray(end + 1, end + 1 + size);
      if (raw.length !== size || batch[end + 1 + size] !== 10) throw new Error(`Truncated object for ${path}`);
      offset = end + 1 + size + 1;
      const rawArtifact = `source-003\\${role}\\${path.replaceAll("/", "\\")}`;
      write(rawArtifact, raw);
      members.push({ role, commit, path, present: true, gitBlob: entry.blob, gitMode: entry.mode, bytes: raw.length, sha256: sha(raw), rawArtifact });
    }
    if (offset !== batch.length) throw new Error("Unconsumed batch output");
    git(`${role}-actual-provider-registrations`, [
      "grep", "-n", "-E", "RenderModeEndpointProvider|ConfiguredRenderModes|AddRenderMode\\(",
      commit, "--", "src/Components/Endpoints/src", "src/Components/Server/src",
      "src/Components/WebAssembly/Server/src",
    ]);
  }
  json("source-membership-003.json", members);
  const changedPaths = paths.filter(path => {
    const original = members.find(x => x.role === "Original" && x.path === path);
    const current = members.find(x => x.role === "Default" && x.path === path);
    return original.present !== current.present || original.sha256 !== current.sha256;
  });
  git("source-role-diff", ["diff", "--binary", roles.original.commit, roles.default.commit, "--", ...paths]);
  git("source-role-intervening-history", ["log", "--format=fuller", "--name-status", `${roles.original.commit}..${roles.default.commit}`, "--", ...paths]);
  git("Original-is-ancestor-of-Default", ["merge-base", "--is-ancestor", roles.original.commit, roles.default.commit]);
  const target = paths[0];
  git("eager-seam-blame", ["blame", "-L", "135,177", roles.original.commit, "--", target]);
  git("builder-creation-history", ["log", "--format=fuller", "-p", "-n", "3", "-S", "CreateApplicationBuilder()", roles.original.commit, "--", target]);
  git("supports-dispatch-history", ["log", "--format=fuller", "-p", "-n", "2", "-S", "provider.Supports(renderMode)", roles.original.commit, "--", target]);
  git("hot-reload-refresh-fix", ["show", "--format=fuller", "982cae2c12aeb6fffd91cbe980353304a5ad8a96", "--", target, paths[34]]);
  git("resource-property-introduction", ["show", "--format=fuller", "c283d05ce0e49941c7df3eeea6143ca58e2d0b3b", "--", target, paths[17]]);
  git("existing-mode-table-references", ["grep", "-n", "-E", "ConfiguredAndDiscoveredRenderModes|SetRenderModesFailures", roles.original.commit, "--", "src/Components/Endpoints/test"]);
  run("related-hot-reload-pr", "gh", [
    "api", "--method", "GET", "--include", "-H", "Accept: application/vnd.github+json",
    "-H", "X-GitHub-Api-Version: 2022-11-28", "repos/dotnet/aspnetcore/pulls/63972",
  ]);
  run("related-source-pr-search", "gh", [
    "api", "--method", "GET", "--include", "-H", "Accept: application/vnd.github+json",
    "-H", "X-GitHub-Api-Version: 2022-11-28", "search/issues",
    "-f", 'q=repo:dotnet/aspnetcore is:pr "RazorComponentEndpointDataSource" in:title,body',
    "-f", "per_page=20",
  ]);
  json("source-comparison-003.json", {
    completedUtc: now(), paths: paths.length, presentOriginal: members.filter(x => x.role === "Original" && x.present).length,
    presentDefault: members.filter(x => x.role === "Default" && x.present).length,
    changedPaths, receiptCount, nativeProductStarts: 0,
    commandRootsAwaited: true, redirectedStreamsReachedEof: true,
    limitations: ["Source-level only; no compiler/test/runtime image or live metadata delta executed.",
      "Historical GitHub search is bounded to 20 issue/PR title/body results, not exhaustive code search."],
  });
  console.log(JSON.stringify({ receipts: receiptCount, members: members.length, changedPaths, nativeProductStarts: 0 }, null, 2));
} catch (error) {
  json("collection-failure-003.json", { atUtc: now(), type: error.name, message: error.message, completedReceipts: receiptCount, nativeProductStarts: 0 });
  throw error;
}
