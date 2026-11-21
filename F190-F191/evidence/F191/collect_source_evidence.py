import hashlib
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parent
REPO = Path(r"C:\src\aspnetcore")
BASELINE = "37e809ead5824bc753a1c3d56f11615bdb1296c5"
EXPECTED_HEAD = "24875ef5dabb55567870b39f6eb0002170435e2f"
EXPECTED_BRANCH = "autoperf/F145-hoist-large-response-utf8-encoding"
EXPECTED_REPORTS = {
    "autoperf-issue-70219-deduplicated-report.html",
    "autoperf-issue-70219-duplicate-report.html",
    "autoperf-scan-report.md",
    "performance-antipattern-findings.md",
}
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS="0", GH_PAGER="", PAGER="")
COMMANDS = []


def save(path, data):
    destination = ROOT / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("xb") as stream:
        stream.write(data)
    return str(destination.relative_to(ROOT))


def save_json(path, value):
    return save(path, (json.dumps(value, indent=2) + "\n").encode("utf-8"))


def command(label, argv, allow_failure=False):
    result = subprocess.run(argv, cwd=REPO, env=ENV, capture_output=True)
    entry = {
        "label": label,
        "argv": argv,
        "cwd": str(REPO),
        "exitCode": result.returncode,
        "stdout": save(Path("commands") / (label + ".stdout"), result.stdout),
        "stderr": save(Path("commands") / (label + ".stderr"), result.stderr),
    }
    COMMANDS.append(entry)
    save_json("COMMANDS.json", COMMANDS) if len(COMMANDS) == 1 else None
    if result.returncode and not allow_failure:
        raise RuntimeError(f"{label} exited {result.returncode}; raw streams preserved")
    return result


def git(label, *arguments, allow_failure=False):
    return command(
        label,
        ["git", "-C", str(REPO), "--no-pager", *arguments],
        allow_failure=allow_failure,
    )


def reserved_snapshot():
    branch = git("reserved-initial-branch", "symbolic-ref", "--short", "HEAD").stdout.decode().strip()
    head = git("reserved-initial-head", "rev-parse", "HEAD").stdout.decode().strip()
    status_bytes = git(
        "reserved-initial-status", "status", "--porcelain=v1", "--untracked-files=all"
    ).stdout
    tracked = git("reserved-initial-worktree-diff", "diff", "--binary", "--no-ext-diff").stdout
    staged = git("reserved-initial-index-diff", "diff", "--cached", "--binary", "--no-ext-diff").stdout
    lines = status_bytes.decode().splitlines()
    assert branch == EXPECTED_BRANCH
    assert head == EXPECTED_HEAD
    assert not tracked and not staged
    assert all(line.startswith("?? ") for line in lines)
    assert {line[3:] for line in lines} == EXPECTED_REPORTS
    reports = []
    for name in sorted(EXPECTED_REPORTS):
        data = (REPO / name).read_bytes()
        reports.append(
            {"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        )
    return {
        "branch": branch,
        "head": head,
        "status": lines,
        "trackedDiffBytes": len(tracked),
        "stagedDiffBytes": len(staged),
        "untrackedReports": reports,
    }


def main():
    assert Path.cwd().resolve() == ROOT
    observed_at = datetime.now(timezone.utc).isoformat()
    initial = reserved_snapshot()
    save_json("reserved-initial.json", initial)

    upstream = git("upstream-default-head", "ls-remote", "--symref", "origin", "HEAD").stdout.decode()
    branch = next(line.split()[1] for line in upstream.splitlines() if line.startswith("ref:"))
    default = next(line.split()[0] for line in upstream.splitlines() if line.endswith("\tHEAD") and not line.startswith("ref:"))
    repository = command(
        "upstream-repository",
        ["gh", "api", "repos/dotnet/aspnetcore", "--jq", "{full_name,default_branch,updated_at,pushed_at,html_url}"],
    ).stdout.decode()
    assert branch == "refs/heads/" + json.loads(repository)["default_branch"]
    git("upstream-object-presence", "cat-file", "-t", default)
    save_json(
        "SOURCE_ROLES.json",
        {
            "observedAtUtc": observed_at,
            "original": BASELINE,
            "default": default,
            "defaultBranch": branch,
            "reserved": EXPECTED_HEAD,
            "sourceAcquisition": "Read-only local git objects; no fetch, checkout or graph creation.",
        },
    )

    contexts = [
        r".editorconfig",
        r".github\instructions\components.instructions.md",
        r".github\instructions\cross-cutting-guidance.instructions.md",
        r".github\instructions\build.instructions.md",
        r"src\Components\AGENTS.md",
        r"docs\BuildFromSource.md",
        r"docs\BuildErrors.md",
        r"docs\BlazorComponentsGuidance.md",
        r"docs\CrossCuttingGuidance.md",
        r"Directory.Build.props",
        r"Directory.Build.targets",
        r"eng\Versions.props",
        r"global.json",
        r"src\Components\Directory.Build.props",
        r"src\Components\Directory.Build.targets",
        r"src\Components\build.cmd",
        r"src\Components\Analyzers\test\Directory.Build.props",
    ]
    source_files = []
    missing_context = []
    for role, commit in [("Original", BASELINE), ("Default", default)]:
        tree = git(
            f"{role}-analyzers-tree",
            "ls-tree", "-r", "--name-only", commit, "--", "src/Components/Analyzers",
        ).stdout.decode().splitlines()
        assert tree
        paths = list(dict.fromkeys(tree + [path.replace("\\", "/") for path in contexts]))
        for index, path in enumerate(paths):
            exists = git(
                f"{role}-exists-{index:03d}", "cat-file", "-e", f"{commit}:{path}",
                allow_failure=True,
            )
            if exists.returncode:
                missing_context.append({"role": role, "commit": commit, "path": path})
                continue
            data = git(
                f"{role}-blob-{index:03d}", "show", f"{commit}:{path}"
            ).stdout
            saved = save(Path("raw") / role / Path(path.replace("/", "\\")), data)
            source_files.append(
                {
                    "role": role,
                    "commit": commit,
                    "repositoryPath": path,
                    "artifact": saved,
                    "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                }
            )

    for path in contexts:
        source = REPO / path
        if source.is_file():
            data = source.read_bytes()
            saved = save(Path("raw") / "ReservedGuidance" / path, data)
            source_files.append(
                {
                    "role": "ReservedGuidance",
                    "commit": EXPECTED_HEAD,
                    "repositoryPath": path.replace("\\", "/"),
                    "artifact": saved,
                    "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                }
            )
    save_json("SOURCE_FILES.json", source_files)
    save_json("missing-role-context.json", missing_context)

    policy_path = ROOT.parent / "policy.json"
    policy = policy_path.read_bytes()
    save("governance-initial-policy.json", policy)
    policy_object = json.loads(policy)
    save_json(
        "governance-initial-observation.json",
        {
            "observedAtUtc": datetime.now(timezone.utc).isoformat(),
            "policySha256": hashlib.sha256(policy).hexdigest(),
            "findingOwner": policy_object.get("independentFindingPreparationWorkers", {}).get("F191"),
            "registeredOwners": len(policy_object.get("independentFindingPreparationWorkers", {})),
            "findingScope": policy_object.get("activeWorkerPreparationScopes", {}).get("F191"),
            "actualWorkerBuildHoldActive": policy_object.get("actualWorkerBuildHoldActive"),
            "buildAndTestWorkQuiesced": policy_object.get("buildAndTestWorkQuiesced"),
            "benchmarkExclusiveLeaseExists": (ROOT.parent / "benchmark-exclusive.lease.json").exists(),
            "nativeStartRequested": False,
        },
    )

    target = "src/Components/Analyzers/test/Verifiers/DiagnosticVerifier.cs"
    helper = "src/Components/Analyzers/test/Helpers/DiagnosticVerifier.Helper.cs"
    for role, commit in [("Original", BASELINE), ("Default", default)]:
        git(f"{role}-target-history", "log", "-20", "--follow", "--format=fuller", "--name-status", commit, "--", target)
        git(f"{role}-helper-history", "log", "-20", "--follow", "--format=fuller", "--name-status", commit, "--", helper)
        git(f"{role}-target-blame", "blame", "-L", "88,130", commit, "--", target)
        git(f"{role}-helper-blame", "blame", "-L", "30,103", commit, "--", helper)
        git(
            f"{role}-repository-caller-literals",
            "grep", "-n", "-E",
            "VerifyDiagnosticResults|GetSortedDiagnosticsFromDocuments|VerifyCSharpDiagnostic|VerifyBasicDiagnostic",
            commit, "--", "src/Components/Analyzers",
            allow_failure=True,
        )
        git(
            f"{role}-repository-verifier-source-links",
            "grep", "-n", "-E", r"DiagnosticVerifier(\.Helper)?\.cs",
            commit, "--", "*.csproj", "*.props", "*.targets",
            allow_failure=True,
        )
    git(
        "Original-to-Default-analyzers-diff", "diff", "--no-ext-diff", "--no-renames",
        "--binary", BASELINE, default, "--", "src/Components/Analyzers",
    )
    git(
        "Original-to-Default-verifier-diff", "diff", "--no-ext-diff", "--no-renames",
        "--binary", BASELINE, default, "--", target, helper,
        "src/Components/Analyzers/test/Verifiers/CodeFixVerifier.cs",
    )
    git(
        "Default-to-Reserved-target-diff", "diff", "--no-ext-diff", "--no-renames",
        "--binary", default, EXPECTED_HEAD, "--", target, helper,
    )
    save_json("COMMANDS-complete.json", COMMANDS)
    print(json.dumps({
        "original": BASELINE,
        "default": default,
        "savedSourceFiles": len(source_files),
        "missingRoleContext": len(missing_context),
        "nativeStarts": 0,
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    finally:
        if COMMANDS and not (ROOT / "COMMANDS-complete.json").exists():
            save_json("COMMANDS-failed.json", COMMANDS)
