import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REPO = Path(r"C:\src\aspnetcore")
CAMPAIGN = ROOT.parent
ORIGINAL = "37e809ead5824bc753a1c3d56f11615bdb1296c5"
REPORTED_DEFAULT = "d3483989953ae3cccd773aea5ea04cb0c7198531"
OWNER = "c1cf1d27-371f-40da-9895-3a099570e45e"


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def sha256(data):
    return hashlib.sha256(data).hexdigest().upper()


def write_json(relative, data):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise FileExistsError(path)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def run(label, argv, allowed=(0,)):
    record_path = ROOT / "commands" / (label + ".json")
    if record_path.exists():
        raise FileExistsError(record_path)
    record_path.parent.mkdir(parents=True, exist_ok=True)
    started = utc()
    process = subprocess.Popen(
        argv,
        cwd=str(REPO),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={**os.environ, "GIT_OPTIONAL_LOCKS": "0", "GIT_PAGER": "cat", "GH_PAGER": "cat"},
    )
    stdout, stderr = process.communicate()
    out_path = record_path.with_suffix(".stdout.txt")
    err_path = record_path.with_suffix(".stderr.txt")
    out_path.write_bytes(stdout)
    err_path.write_bytes(stderr)
    record_path.write_text(json.dumps({
        "label": label,
        "argv": argv,
        "cwd": str(REPO),
        "startedUtc": started,
        "finishedUtc": utc(),
        "processId": process.pid,
        "returnCode": process.returncode,
        "stdout": str(out_path.relative_to(ROOT)),
        "stdoutBytes": len(stdout),
        "stdoutSha256": sha256(stdout),
        "stderr": str(err_path.relative_to(ROOT)),
        "stderrBytes": len(stderr),
        "stderrSha256": sha256(stderr),
        "rootAwaited": True,
        "bothRedirectedStreamsAwaited": True,
        "executionClass": "read-only source/metadata; not build, test, restore or performance work",
    }, indent=2) + "\n", encoding="utf-8")
    if process.returncode not in allowed:
        raise RuntimeError(f"{label}: exit {process.returncode}; see retained stdout/stderr")
    return stdout


def git(label, *args, allowed=(0,)):
    return run(label, ["git", "--no-pager", "-C", str(REPO), *args], allowed)


def snapshot(label, path):
    data = path.read_bytes()
    relative = Path("snapshots") / label
    destination = ROOT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        raise FileExistsError(destination)
    destination.write_bytes(data)
    return {
        "path": str(path),
        "artifact": str(relative),
        "bytes": len(data),
        "sha256": sha256(data),
        "observedUtc": utc(),
    }


def capture_file(role, revision, git_path):
    manifest_path = ROOT / "source-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    if any(entry["role"] == role and entry["gitPath"] == git_path for entry in manifest):
        return
    slug = git_path.replace("/", "__").replace(".", "_")
    membership = git(f"source-{role}-{slug}-membership", "ls-tree", revision, "--", git_path)
    row = membership.decode("utf-8").strip()
    if not row:
        manifest.append({
            "role": role, "revision": revision, "gitPath": git_path,
            "present": False, "membershipCommand": f"commands\\source-{role}-{slug}-membership.json",
        })
    else:
        fields, observed_path = row.split("\t", 1)
        mode, kind, oid = fields.split()
        if kind != "blob" or observed_path != git_path:
            raise RuntimeError(f"Unexpected membership: {row}")
        data = git(f"source-{role}-{slug}-blob", "cat-file", "blob", oid)
        destination = ROOT / "source" / role / Path(*git_path.split("/"))
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            raise FileExistsError(destination)
        destination.write_bytes(data)
        actual_git_oid = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
        if actual_git_oid != oid:
            raise RuntimeError("Blob identity mismatch")
        manifest.append({
            "role": role, "revision": revision, "gitPath": git_path,
            "present": True, "mode": mode, "gitBlob": oid,
            "bytes": len(data), "sha256": sha256(data),
            "artifact": str(destination.relative_to(ROOT)),
            "membershipCommand": f"commands\\source-{role}-{slug}-membership.json",
            "blobCommand": f"commands\\source-{role}-{slug}-blob.json",
            "rawGitBlobIdentityVerified": True,
        })
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def initial():
    if (ROOT / "INITIAL.json").exists():
        raise FileExistsError("Initial collection already exists; no automatic replay")
    policy_snapshot = snapshot("policy-initial.json", CAMPAIGN / "policy.json")
    policy = json.loads((CAMPAIGN / "policy.json").read_text(encoding="utf-8"))
    reports = [
        "autoperf-issue-70219-deduplicated-report.html",
        "autoperf-issue-70219-duplicate-report.html",
        "autoperf-scan-report.md",
        "performance-antipattern-findings.md",
    ]
    report_hashes = []
    for name in reports:
        data = (REPO / name).read_bytes()
        report_hashes.append({"path": str(REPO / name), "bytes": len(data), "sha256": sha256(data)})
    lease = Path(policy["runsRoot"]) / "benchmark-exclusive.lease.json"
    lease_observation = {"path": str(lease), "exists": lease.exists(), "observedUtc": utc()}
    if lease.exists():
        lease_observation["snapshot"] = snapshot("benchmark-lease-initial.json", lease)
    write_json("INITIAL.json", {
        "recordedUtc": utc(), "finding": "F193", "preparation": 213,
        "ownerAgentId": OWNER, "host": os.environ.get("COMPUTERNAME"),
        "pythonExecutable": sys.executable, "collectorPid": os.getpid(),
        "policy": policy_snapshot,
        "actualRegisteredOwner": policy["independentFindingPreparationWorkers"].get("F193"),
        "registeredOwnerCount": len(policy["independentFindingPreparationWorkers"]),
        "maximumOwners": policy["maximumRegisteredPreparationOwners"],
        "actualWorkerBuildHoldActive": policy["actualWorkerBuildHoldActive"],
        "buildAndTestWorkQuiesced": policy["buildAndTestWorkQuiesced"],
        "scope": policy["activeWorkerPreparationScopes"].get("F193"),
        "actualLease": lease_observation,
        "reservedReports": report_hashes,
        "authority": {
            "initialSourceOnly": True,
            "go213Received": True,
            "coordinatorObservationUtc": "2026-11-21T00:34:42.2416286Z",
            "coordinatorPolicyReadToolId": "4467",
            "goAppliesOnlyIfCandidateSurvives": True,
            "nativeExecutionInThisCollection": False,
        },
        "bootstrapTools": [
            {"tool": "functions.powershell", "shellId": "4465", "exit": 0,
             "commands": [
                 "Get-ChildItem -LiteralPath <campaign root> -Force | Select-Object Name,Mode,Length",
                 "git --no-pager -C C:\\src\\aspnetcore status --porcelain=v1 -uall",
                 "git --no-pager -C C:\\src\\aspnetcore branch --show-current",
                 "git --no-pager -C C:\\src\\aspnetcore rev-parse HEAD"
             ],
             "observedBranch": "autoperf/F145-hoist-large-response-utf8-encoding",
             "observedHead": "24875ef5dabb55567870b39f6eb0002170435e2f",
             "observedStatus": ["?? " + name for name in reports],
             "limitation": "Bootstrap output exists in tool history; subsequent commands preserve full stdout/stderr as files."
            },
            {"tool": "functions.lsp", "operation": "documentSymbol",
             "file": str(REPO / r"src\Components\test\testassets\Components.TestServer\Controllers\PersonController.cs"),
             "result": "PersonController.Delete() : string at line 48; identity/navigation only, not pinned behavioral evidence"}
        ],
    })
    if policy["independentFindingPreparationWorkers"].get("F193") != OWNER:
        raise RuntimeError("Actual owner mismatch; source collection stops")
    git("reserved-initial-status", "status", "--porcelain=v1", "-uall")
    git("reserved-initial-head", "rev-parse", "HEAD")
    git("reserved-initial-branch", "symbolic-ref", "--short", "HEAD")
    git("reserved-initial-diff", "diff", "--binary", "--no-ext-diff")
    git("reserved-initial-index-diff", "diff", "--cached", "--binary", "--no-ext-diff")
    git("related-remotes", "remote", "-v")
    repo_result = run("upstream-repository", ["gh", "api", "repos/dotnet/aspnetcore"])
    repo_json = json.loads(repo_result)
    default_branch = repo_json["default_branch"]
    branch_started = utc()
    branch_result = run("upstream-default-branch", [
        "gh", "api", f"repos/dotnet/aspnetcore/branches/{default_branch}"
    ])
    branch_json = json.loads(branch_result)
    default = branch_json["commit"]["sha"]
    local_roles = {}
    for role, revision in (("Original", ORIGINAL), ("Default", default)):
        local = git(f"role-{role}-commit-exists", "cat-file", "-e", revision + "^{commit}", allowed=(0, 1, 128))
        record = json.loads((ROOT / "commands" / f"role-{role}-commit-exists.json").read_text())
        local_roles[role] = {"revision": revision, "localCommitExists": record["returnCode"] == 0}
        if record["returnCode"] == 0:
            git(f"role-{role}-commit-metadata", "show", "-s", "--format=fuller", revision)
    write_json("SOURCE-ROLES.json", {
        "recordedUtc": utc(),
        "upstreamRepository": "dotnet/aspnetcore",
        "observedDefaultBranch": default_branch,
        "defaultObservationStartedUtc": branch_started,
        "observedDefaultCommit": default,
        "reportedDefaultCommit": REPORTED_DEFAULT,
        "reportedDefaultStillCurrentAtObservation": default == REPORTED_DEFAULT,
        "roles": local_roles,
        "fetchOrRefUpdatesPerformed": False,
        "reservedCheckoutIsNotABaseline": True,
        "upstreamEvidence": ["commands\\upstream-repository.json", "commands\\upstream-default-branch.json"],
    })
    if not all(r["localCommitExists"] for r in local_roles.values()):
        raise RuntimeError("Current role commit missing locally; preserve bounded limitation, do not fetch or substitute")
    paths = [
        "src/Components/test/testassets/Components.TestServer/Controllers/PersonController.cs",
        "src/Components/test/testassets/Components.TestServer/Components.TestServer.csproj",
        "src/Components/test/testassets/Components.TestServer/Startup.cs",
        "src/Components/test/testassets/Components.TestServer/Program.cs",
        "src/Http/Http/src/HeaderDictionary.cs",
        "src/Http/Http.Features/src/IHeaderDictionary.cs",
        "eng/Version.Details.xml",
        "eng/Versions.props",
        "global.json",
        "src/Components/AGENTS.md",
        ".github/instructions/components.instructions.md",
        ".github/instructions/cross-cutting-guidance.instructions.md",
        ".github/instructions/components.server.instructions.md",
        "docs/BuildFromSource.md",
        "docs/BlazorComponentsGuidance.md",
        "docs/CrossCuttingGuidance.md",
    ]
    for role, revision in (("Original", ORIGINAL), ("Default", default)):
        for path in paths:
            capture_file(role, revision, path)
        git(f"discovery-{role}-person-consumers", "grep", "-n", "-i", "-E",
            "api/person|PersonController", revision, "--", "src/Components", allowed=(0, 1))
        git(f"history-{role}-controller-follow", "log", "--follow", "-n", "12",
            "--format=fuller", "--name-status", revision, "--", paths[0])
        git(f"history-{role}-controller-patches", "log", "-n", "8", "-p",
            "--format=fuller", revision, "--", paths[0])
    print(json.dumps({"phase": "initial-source-captured", "default": default, "root": str(ROOT)}))


if __name__ == "__main__":
    initial()
