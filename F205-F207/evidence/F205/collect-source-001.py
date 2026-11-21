import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REPO = Path(r"C:\src\aspnetcore")
POLICY = ROOT.parent / "policy.json"
LEASE = ROOT.parent / "benchmark-exclusive.lease.json"
OWNER = "e2ba3013-578f-4603-8c85-a43ba9a905b5"
ORIGINAL = "37e809ead5824bc753a1c3d56f11615bdb1296c5"
OBSERVED_BEFORE_DISPATCH = "d3483989953ae3cccd773aea5ea04cb0c7198531"
ENV = os.environ.copy()
ENV.update({
    "GIT_OPTIONAL_LOCKS": "0",
    "GH_PROMPT_DISABLED": "true",
    "GH_NO_UPDATE_NOTIFIER": "1",
    "PYTHONDONTWRITEBYTECODE": "1",
})
ENV_KEYS = [
    "PATH", "PATHEXT", "SYSTEMROOT", "COMSPEC", "GIT_OPTIONAL_LOCKS",
    "GIT_PAGER", "PAGER", "GH_PROMPT_DISABLED", "GH_NO_UPDATE_NOTIFIER",
    "GH_HOST", "DOTNET_ROOT", "DOTNET_ROOT_X64", "DOTNET_MULTILEVEL_LOOKUP",
    "DOTNET_GENERATE_ASPNET_CERTIFICATE", "DOTNET_ADD_GLOBAL_TOOLS_TO_PATH",
    "MSBUILDDISABLENODEREUSE", "NUGET_PACKAGES", "PYTHONDONTWRITEBYTECODE",
]
RECEIPTS = []


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def write_json(relative, data):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise RuntimeError(f"Refusing to overwrite {path}")
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_bytes(relative, data):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise RuntimeError(f"Refusing to overwrite {path}")
    path.write_bytes(data)


def sha(data):
    return hashlib.sha256(data).hexdigest().upper()


def run(label, argv):
    started = now()
    process = subprocess.Popen(
        argv, cwd=REPO, env=ENV, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    stdout, stderr = process.communicate()
    receipt = {
        "label": label,
        "argv": argv,
        "cwd": str(REPO),
        "startedUtc": started,
        "completedUtc": now(),
        "pid": process.pid,
        "exitCode": process.returncode,
        "stdout": f"receipts-001\\{label}.stdout.bin",
        "stderr": f"receipts-001\\{label}.stderr.bin",
        "stdoutBytes": len(stdout),
        "stderrBytes": len(stderr),
        "stdoutSha256": sha(stdout),
        "stderrSha256": sha(stderr),
        "environment": {key: ENV.get(key) for key in ENV_KEYS},
        "environmentScope": "Execution-relevant allowlist; authentication and unrelated ambient values deliberately not captured.",
        "rootAwaited": True,
        "redirectedStreamsReachedEof": True,
        "operationClass": "read-only source/evidence, not a product build/test/performance execution",
    }
    write_bytes(receipt["stdout"], stdout)
    write_bytes(receipt["stderr"], stderr)
    write_json(f"receipts-001\\{label}.json", receipt)
    RECEIPTS.append(receipt)
    return process.returncode, stdout, stderr


def git(label, *args):
    return run(label, ["git", "--no-optional-locks", "--no-pager", "-C", str(REPO), *args])


def required(label, *args):
    code, stdout, stderr = git(label, *args)
    if code:
        raise RuntimeError(f"{label} exited {code}; streams retained")
    return stdout


def main():
    write_json("execution-001.json", {
        "startedUtc": now(),
        "helper": str(Path(__file__).resolve()),
        "helperSha256": sha(Path(__file__).read_bytes()),
        "argv": sys.argv,
        "pid": os.getpid(),
        "parentPid": os.getppid(),
        "go": "Explicit registered GO222 received 2026-11-21T01:01:57.209Z",
        "owner": OWNER,
        "scope": "Source/evidence only. No native product command, worktree, service, edit, timing or publication.",
    })
    policy_bytes = POLICY.read_bytes()
    write_bytes("policy-admission-001.json", policy_bytes)
    policy = json.loads(policy_bytes)
    admission = {
        "observedUtc": now(),
        "policySha256": sha(policy_bytes),
        "ownerMatches": policy["independentFindingPreparationWorkers"].get("F205") == OWNER,
        "activeScope": policy["activeWorkerPreparationScopes"].get("F205"),
        "registeredOwnerCount": len(policy["independentFindingPreparationWorkers"]),
        "leaseExists": LEASE.exists(),
        "actualWorkerBuildHoldActive": policy["actualWorkerBuildHoldActive"],
        "buildAndTestWorkQuiesced": policy["buildAndTestWorkQuiesced"],
        "nativeLaunchAuthorityExercised": False,
    }
    write_json("source-admission-001.json", admission)
    if not admission["ownerMatches"] or not admission["activeScope"]:
        raise RuntimeError("Owner is not registered for this source task")
    head = required("reserved-head-before", "rev-parse", "HEAD").decode().strip()
    branch = required("reserved-branch-before", "symbolic-ref", "--short", "HEAD").decode().strip()
    status = required("reserved-status-before", "status", "--porcelain=v1", "--untracked-files=all", "-z")
    diff = required("reserved-working-diff-before", "diff", "--binary", "HEAD", "--")
    staged = required("reserved-staged-diff-before", "diff", "--cached", "--binary", "HEAD", "--")
    untracked = []
    for record in status.split(b"\0"):
        if record.startswith(b"?? "):
            name = record[3:].decode("utf-8")
            data = (REPO / name).read_bytes()
            untracked.append({"path": name, "bytes": len(data), "sha256": sha(data)})
    write_json("reserved-before-001.json", {
        "observedUtc": now(),
        "head": head,
        "branch": branch,
        "statusSha256": sha(status),
        "workingDiffBytes": len(diff),
        "workingDiffSha256": sha(diff),
        "stagedDiffBytes": len(staged),
        "stagedDiffSha256": sha(staged),
        "untracked": untracked,
    })

    url = "https://api.github.com/repos/dotnet/aspnetcore/git/ref/heads/main"
    code, response, stderr = run("upstream-actual-main-get", [
        "gh", "api", "--method", "GET", "--include",
        "-H", "Accept: application/vnd.github+json",
        "-H", "X-GitHub-Api-Version: 2022-11-28",
        "repos/dotnet/aspnetcore/git/ref/heads/main",
    ])
    if code:
        raise RuntimeError("Independent upstream GET failed; full receipt retained")
    candidates = []
    for marker in (b"\r\n\r\n", b"\n\n"):
        offset = 0
        while True:
            index = response.find(marker, offset)
            if index < 0:
                break
            try:
                candidates.append(json.loads(response[index + len(marker):]))
            except (ValueError, UnicodeDecodeError):
                pass
            offset = index + len(marker)
    body = next((item for item in candidates if item.get("ref") == "refs/heads/main"), None)
    if body is None:
        raise RuntimeError("Cannot parse upstream main response; raw response retained")
    default = body["object"]["sha"]
    if len(default) != 40:
        raise RuntimeError("Default commit identity is not a full SHA")
    write_json("source-roles-001.json", {
        "original": {"commit": ORIGINAL, "role": "Independent campaign Original; no branch created"},
        "default": {
            "commit": default,
            "role": "Independently observed upstream dotnet/aspnetcore actual main; immutable source pin",
            "getUrl": url,
            "responseReceipt": "receipts-001\\upstream-actual-main-get.json",
            "rawResponse": "receipts-001\\upstream-actual-main-get.stdout.bin",
            "responseSha256": sha(response),
            "separateFromReservedCheckout": True,
            "dispatchObservation": OBSERVED_BEFORE_DISPATCH,
            "matchesDispatchObservation": default == OBSERVED_BEFORE_DISPATCH,
        },
        "reserved": {"head": head, "branch": branch, "sourceRole": "Neither Original nor Default"},
    })
    target = "src/Components/Endpoints/src/Builder/RazorComponentEndpointDataSource.cs"
    members = []
    for role, commit in (("Original", ORIGINAL), ("Default", default)):
        exists, _, _ = git(f"{role}-commit-membership", "cat-file", "-e", f"{commit}^{{commit}}")
        if exists:
            raise RuntimeError(f"{role} commit absent locally; no fetch attempted")
        raw = required(f"{role}-target-raw", "show", f"{commit}:{target}")
        blob = required(f"{role}-target-membership", "ls-tree", commit, "--", target).decode().strip()
        destination = f"source-001\\{role}\\{target.replace('/', chr(92))}"
        write_bytes(destination, raw)
        members.append({
            "role": role, "commit": commit, "path": target,
            "gitLsTree": blob, "bytes": len(raw), "sha256": sha(raw),
            "rawArtifact": destination,
        })
        required(f"{role}-producer-discovery", "grep", "-n", "-E",
            "RenderModeEndpointProvider|ConfiguredRenderModes|AddInteractive(Server|WebAssembly)RenderMode",
            commit, "--", "src/Components/Endpoints", "src/Components/Server",
            "src/Components/WebAssembly", "src/Components/Samples")
    required("target-history", "log", ORIGINAL, "--follow", "--format=fuller",
        "--name-status", "-12", "--", target)
    write_json("source-membership-001.json", members)
    write_json("collection-completed-001.json", {
        "completedUtc": now(), "receiptCount": len(RECEIPTS),
        "allCommandRootsAwaited": True, "allRedirectedStreamsReachedEof": True,
        "nativeProductStarts": 0, "sourceMutation": False,
        "note": "No claim about arbitrary unrelated or unobserved short-lived processes.",
    })
    print(json.dumps({"default": default, "sourceMembers": len(members), "receipts": len(RECEIPTS),
                      "reservedHead": head, "untrackedReports": len(untracked)}, indent=2))


try:
    main()
except BaseException as error:
    write_json("collection-failure-001.json", {
        "atUtc": now(), "type": type(error).__name__, "message": str(error),
        "completedReceipts": len(RECEIPTS), "nativeProductStarts": 0,
    })
    raise
