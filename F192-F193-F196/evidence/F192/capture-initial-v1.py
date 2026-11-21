import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess


ROOT = Path(r"C:\src\aspnetcore")
OUT = Path(__file__).resolve().parent
PAR = OUT.parent
ORIGINAL = "37e809ead5824bc753a1c3d56f11615bdb1296c5"
EXPECTED_DEFAULT = "d3483989953ae3cccd773aea5ea04cb0c7198531"
RECEIPTS = []


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def put(name, data):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as stream:
        stream.write(data)
    return {
        "path": name,
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    }


def save_json(name, data):
    return put(name, (json.dumps(data, indent=2) + "\n").encode())


def run(name, argv, required=False):
    start = utc()
    result = subprocess.run(
        argv, cwd=ROOT, stdin=subprocess.DEVNULL, capture_output=True,
        env={**os.environ, "GIT_OPTIONAL_LOCKS": "0", "GIT_PAGER": "cat", "GH_PAGER": "cat"},
    )
    row = {
        "id": name, "cwd": str(ROOT), "argv": argv,
        "startedUtc": start, "completedUtc": utc(), "exitCode": result.returncode,
        "stdout": put(f"commands\\{name}.stdout", result.stdout),
        "stderr": put(f"commands\\{name}.stderr", result.stderr),
    }
    RECEIPTS.append(row)
    save_json(f"commands\\{name}.json", row)
    preview_limit = 12000 if "generate-guid-mentions" in name else 2400
    print(json.dumps({"id": name, "exitCode": result.returncode,
                      "stdout": result.stdout.decode("utf-8", errors="replace")[:preview_limit],
                      "stderr": result.stderr.decode("utf-8", errors="replace")[:4000]}))
    if required and result.returncode:
        raise RuntimeError(f"{name} failed: {result.returncode}")
    return result


def git(name, *args, required=False):
    return run(name, ["git", "--no-optional-locks", "--no-pager", "-C", str(ROOT), *args], required)


def main():
    save_json("initial-owner.json", {
        "recordedUtc": utc(), "finding": "F192", "preparation": 212,
        "ownerAgentId": "f8228d2e-3cae-4e79-8751-2baa68591d80",
        "helperPid": os.getpid(), "nativeBuildTestRestoreStarted": False,
        "registryGoReceived": True,
        "registryGoReceipt": "registry-GO212.json",
        "initialToolObservations": {
            "utc": "2026-11-21T00:34:36.3582590Z",
            "head": "24875ef5dabb55567870b39f6eb0002170435e2f",
            "branch": "refs/heads/autoperf/F145-hoist-large-response-utf8-encoding",
            "rootAgentsView": "C:\\src\\aspnetcore\\AGENTS.md does not exist",
            "engAgentsExists": False,
            "policyFirstView": "Exceeded view size; full deliberate read followed.",
            "benchmarkExclusiveLeaseExists": False,
            "optionalGraphsExist": False,
            "evidenceRootPreviouslyExisted": False,
            "registryGoReceivedAtFirstProbe": False,
            "command": "Read-only PowerShell initial identity/status/remote probe; shellId 4466, exit 0.",
        },
    })
    for name in ("policy.json", "benchmark-exclusive.lease.json"):
        path = PAR / name
        if path.exists():
            saved = put(f"policy-snapshots\\initial-{name}", path.read_bytes())
            print(json.dumps({"snapshot": saved}))
        else:
            save_json(f"policy-snapshots\\initial-{name}.absence.json",
                      {"observedUtc": utc(), "path": str(path), "exists": False})
    for name, args in (
        ("initial-head", ("rev-parse", "HEAD")),
        ("initial-branch", ("symbolic-ref", "--quiet", "HEAD")),
        ("initial-status", ("status", "--porcelain=v1", "--untracked-files=all")),
        ("initial-unstaged", ("diff", "--no-ext-diff", "--binary")),
        ("initial-staged", ("diff", "--cached", "--no-ext-diff", "--binary")),
        ("remotes", ("remote", "-v")),
        ("original-commit-present", ("cat-file", "-e", ORIGINAL + "^{commit}")),
        ("expected-default-commit-present", ("cat-file", "-e", EXPECTED_DEFAULT + "^{commit}")),
    ):
        git(name, *args)
    reports = []
    for name in ("autoperf-issue-70219-deduplicated-report.html",
                 "autoperf-issue-70219-duplicate-report.html",
                 "autoperf-scan-report.md", "performance-antipattern-findings.md"):
        path = ROOT / name
        data = path.read_bytes()
        reports.append({"path": str(path), "bytes": len(data),
                        "sha256": hashlib.sha256(data).hexdigest()})
    save_json("initial-reserved-reports.json", reports)
    gh = ["gh", "api", "--method", "GET"]
    run("upstream-repository", [*gh, "repos/dotnet/aspnetcore"], required=True)
    default_response = run("upstream-main", [*gh, "repos/dotnet/aspnetcore/branches/main"], required=True)
    default = json.loads(default_response.stdout)["commit"]["sha"]
    run("fork-repository", [*gh, "repos/jaslawinMs/aspnetcore"])
    run("fork-main", [*gh, "repos/jaslawinMs/aspnetcore/branches/main"])
    local = git("observed-default-commit-present", "cat-file", "-e", default + "^{commit}")
    save_json("source-roles.json", {
        "recordedUtc": utc(), "original": ORIGINAL,
        "observedDefault": default, "expectedDefault": EXPECTED_DEFAULT,
        "defaultMatchesParentObservation": default == EXPECTED_DEFAULT,
        "defaultLocalCommitPresent": local.returncode == 0,
        "defaultBranchAuthority": "repos/dotnet/aspnetcore/branches/main and upstream-repository raw responses",
        "reservedCheckoutIsDefault": False,
        "forkMainIsDefaultAuthority": False,
    })
    if local.returncode:
        print("BLOCKED: observed Default is not locally present; no fetch or old-role substitution.")
        return
    for role, revision in (("original", ORIGINAL), ("default", default)):
        git(f"{role}-commit", "show", "-s", "--format=fuller", revision)
        git(f"{role}-task-directory", "ls-tree", "-r", revision, "--", "eng/tools/RepoTasks")
        git(f"{role}-area-instructions", "ls-tree", "-r", "--name-only", revision, "--",
            "AGENTS.md", "eng/AGENTS.md", "eng/tools/AGENTS.md",
            "eng/tools/RepoTasks/AGENTS.md", ".github/instructions/build.instructions.md")
        git(f"{role}-generate-guid-mentions", "grep", "-n", "-I", "-e", "GenerateGuid", revision, "--")
        for label, path in (
            ("task", "eng/tools/RepoTasks/GenerateGuid.cs"),
            ("build-instructions", ".github/instructions/build.instructions.md"),
            ("build-doc", "docs/BuildFromSource.md"),
            ("build-errors-doc", "docs/BuildErrors.md"),
            ("global-json", "global.json"),
        ):
            git(f"{role}-{label}-membership", "ls-tree", revision, "--", path)
            git(f"{role}-{label}-raw", "show", f"{revision}:{path}")


try:
    main()
finally:
    save_json("initial-command-index.json", RECEIPTS)
