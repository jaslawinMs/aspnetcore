from capture_common_001 import *

helper_start("capture_source_001")
policy_path = ROOT.parent / "policy.json"
policy_raw = policy_path.read_bytes()
policy = json.loads(policy_raw)
write_bytes("guards\\policy-start.json", policy_raw)
write_json("guards\\point-observation-start.json", {
    "observedUtc": utc(),
    "policySha256": sha256(policy_raw),
    "registeredOwner": policy["independentFindingPreparationWorkers"].get("F221"),
    "scope": policy["activeWorkerPreparationScopes"].get("F221"),
    "actualWorkerBuildHoldActive": policy["actualWorkerBuildHoldActive"],
    "buildAndTestWorkQuiesced": policy["buildAndTestWorkQuiesced"],
    "benchmarkLeaseExists": (ROOT.parent / "benchmark-exclusive.lease.json").exists(),
    "notPerpetualNativePermission": True,
    "sourceOnlyStart": True,
})
assert policy["independentFindingPreparationWorkers"]["F221"] == OWNER

reservation = {}
for label, args in (
    ("head", ["rev-parse", "HEAD"]),
    ("branch", ["branch", "--show-current"]),
    ("status", ["status", "--porcelain=v1", "--untracked-files=all"]),
    ("tracked-diff", ["diff", "--no-ext-diff", "--binary", "HEAD", "--"]),
    ("index-tree", ["ls-files", "--stage"]),
):
    data = run(f"reserved-start-{label}", ["git", "--no-pager"] + args)
    reservation[label] = {"bytes": len(data), "sha256": sha256(data), "stdout": f"commands\\reserved-start-{label}\\stdout.bin"}
write_json("reserved-start.json", reservation)

default_ref = json.loads(run("fresh-upstream-main-ref", ["gh", "api", "repos/dotnet/aspnetcore/git/ref/heads/main"]))
default = default_ref["object"]["sha"]
write_json("source-roles.json", {
    "repository": "dotnet/aspnetcore",
    "original": ORIGINAL,
    "default": default,
    "defaultObservedUtc": utc(),
    "defaultObservation": "Fresh read-only gh git/ref/heads/main; subsequently pinned contents by returned full commit.",
    "reservedCheckoutIsNotDefault": True,
    "host": os.environ.get("COMPUTERNAME"),
})

paths = [
    "src/Components/Testing/gen/ServiceOverrideAnalyzer.cs",
    "src/Components/Testing/gen/Microsoft.AspNetCore.Components.Testing.Generators.csproj",
]
sources = []
for path in paths:
    sources.append(local_blob("Original", ORIGINAL, path))
    sources.append(remote_blob("Default", default, path))
write_json("source-stage1.json", sources)

run("original-testing-tree", ["git", "--no-pager", "ls-tree", "-r", "--name-only", ORIGINAL, "--", "src/Components/Testing"])
run("original-analyzer-history", ["git", "--no-pager", "log", "--follow", "--name-status", "-n", "8", "--format=fuller", ORIGINAL, "--", paths[0]])
run("default-analyzer-history", [
    "gh", "api", "--method", "GET", "repos/dotnet/aspnetcore/commits",
    "-f", f"sha={default}", "-f", f"path={paths[0]}", "-f", "per_page=8",
])
run("original-testing-serviceoverride-search", [
    "git", "--no-pager", "grep", "-n", "-E",
    "ConfigureServices|ServiceOverrideAnalyzer|ServiceOverrideGenerator|ServiceOverride", ORIGINAL,
    "--", "src/Components/Testing", ":!src/Components/Testing/gen/ServiceOverrideAnalyzer.cs",
], acceptable=(0, 1))

guidance_paths = [
    "src/Components/AGENTS.md",
    "src/Components/Testing/AGENTS.md",
    ".github/instructions/components.instructions.md",
    ".github/instructions/cross-cutting-guidance.instructions.md",
    ".github/instructions/build.instructions.md",
    "docs/BlazorComponentsGuidance.md",
    "docs/CrossCuttingGuidance.md",
    "docs/BuildFromSource.md",
    "src/Components/build.cmd",
]
guidance = []
for path in guidance_paths:
    raw = (REPO / Path(path)).read_bytes()
    relative = Path("guidance-reserved") / Path(path)
    write_bytes(relative, raw)
    guidance.append({"path": path, "artifact": str(relative), "bytes": len(raw), "sha256": sha256(raw), "role": "Reserved checkout guidance, not Default source evidence"})
write_json("guidance-manifest.json", guidance)
helper_end("capture_source_001")
