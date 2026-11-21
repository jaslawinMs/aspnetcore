import ctypes
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import threading
import time
from ctypes import wintypes

OUT = Path(__file__).resolve().parent
PAR = OUT.parent
S = PAR.parent
REPO = Path(r"C:\src\aspnetcore")
ORIGINAL = "37e809ead5824bc753a1c3d56f11615bdb1296c5"
OWNER = "cb6dfbf4-dd69-4c3e-b55f-d49f1820df2b"
BOOT = json.loads((OUT / "control" / "bootstrap.json").read_text(encoding="utf-8-sig"))
EXPECTED_SCOPE = BOOT["scope"]
KERNEL = ctypes.WinDLL("kernel32", use_last_error=True)
KERNEL.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
KERNEL.OpenProcess.restype = wintypes.HANDLE
KERNEL.CloseHandle.argtypes = [wintypes.HANDLE]
KERNEL.CloseHandle.restype = wintypes.BOOL
KERNEL.GetProcessTimes.argtypes = [wintypes.HANDLE] + [ctypes.POINTER(wintypes.FILETIME)] * 4
KERNEL.GetProcessTimes.restype = wintypes.BOOL
KERNEL.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
KERNEL.WaitForSingleObject.restype = wintypes.DWORD


class ProcessEntry(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD),
        ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD),
        ("th32DefaultHeapID", ctypes.c_size_t),
        ("th32ModuleID", wintypes.DWORD),
        ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD),
        ("pcPriClassBase", wintypes.LONG),
        ("dwFlags", wintypes.DWORD),
        ("szExeFile", wintypes.WCHAR * 260),
    ]


KERNEL.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
KERNEL.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
KERNEL.Process32FirstW.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessEntry)]
KERNEL.Process32FirstW.restype = wintypes.BOOL
KERNEL.Process32NextW.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessEntry)]
KERNEL.Process32NextW.restype = wintypes.BOOL


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def sha256(data):
    return hashlib.sha256(data).hexdigest().upper()


def write_json(path, value):
    with path.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write("\n")


def creation(handle):
    values = [wintypes.FILETIME() for _ in range(4)]
    if not KERNEL.GetProcessTimes(handle, *(ctypes.byref(v) for v in values)):
        raise ctypes.WinError(ctypes.get_last_error())
    return (values[0].dwHighDateTime << 32) | values[0].dwLowDateTime


def process_identity(pid):
    handle = KERNEL.OpenProcess(0x00101000, False, pid)
    if not handle:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return {"pid": pid, "creationFileTime": creation(handle)}
    finally:
        KERNEL.CloseHandle(handle)


def guard(label):
    policy_bytes = (PAR / "policy.json").read_bytes()
    policy = json.loads(policy_bytes)
    registration_bytes = (PAR / "owner-registrations-267-268-269.json").read_bytes()
    registration = json.loads(registration_bytes)
    assert policy["independentFindingPreparationWorkers"]["F234"] == OWNER
    assert policy["activeWorkerPreparationScopes"]["F234"] == EXPECTED_SCOPE
    assert registration["actualOwners"]["F234"] == OWNER
    assert registration["scopes"]["F234"] == EXPECTED_SCOPE
    assert EXPECTED_SCOPE.startswith("268 SOURCE ONLY ")
    assert len(policy["independentFindingPreparationWorkers"]) <= 4
    assert policy["actualWorkerBuildHoldActive"] is False
    assert policy["buildAndTestWorkQuiesced"] is False
    lease_paths = [
        PAR / "benchmark-exclusive.lease.json",
        S / "benchmark-exclusive.lease.json",
        S / "autoperf-runs" / "benchmark-exclusive.lease.json",
    ]
    assert not any(path.exists() for path in lease_paths)
    campaign_bytes = (S / "autoperf-campaign.json").read_bytes()
    campaign = json.loads(campaign_bytes)
    selected = [item for item in campaign["candidates"] if item["id"] in ("F234", "F235")]
    assert len(selected) == 2 and all(item["status"] == "pending" for item in selected)
    return {
        "observedUtc": utc(),
        "label": label,
        "owner": OWNER,
        "scope": EXPECTED_SCOPE,
        "policySha256": sha256(policy_bytes),
        "registrationSha256": sha256(registration_bytes),
        "campaignSha256": sha256(campaign_bytes),
        "outerStatuses": {item["id"]: item["status"] for item in selected},
        "leasePathsAbsent": [str(path) for path in lease_paths],
        "actualWorkerBuildHoldActive": False,
        "buildAndTestWorkQuiesced": False,
        "policyBytes": policy_bytes,
        "registrationBytes": registration_bytes,
    }


def snapshot():
    handle = KERNEL.CreateToolhelp32Snapshot(2, 0)
    if handle == ctypes.c_void_p(-1).value:
        raise ctypes.WinError(ctypes.get_last_error())
    result = {}
    try:
        entry = ProcessEntry()
        entry.dwSize = ctypes.sizeof(entry)
        okay = KERNEL.Process32FirstW(handle, ctypes.byref(entry))
        while okay:
            result[int(entry.th32ProcessID)] = (int(entry.th32ParentProcessID), entry.szExeFile)
            okay = KERNEL.Process32NextW(handle, ctypes.byref(entry))
        return result
    finally:
        KERNEL.CloseHandle(handle)


def run(label, executable, arguments, stdin=b""):
    runs = OUT / "roots"
    runs.mkdir(exist_ok=True)
    sequence = len(list(runs.glob("root-*"))) + 1
    assert sequence <= 32, "Direct Git/gh root budget exhausted"
    root_dir = runs / f"root-{sequence:03d}"
    root_dir.mkdir(exist_ok=False)
    checked = guard(label)
    (root_dir / "policy.raw.json").write_bytes(checked.pop("policyBytes"))
    (root_dir / "registration.raw.json").write_bytes(checked.pop("registrationBytes"))
    write_json(root_dir / "guard.json", checked)
    exe = shutil.which(executable)
    assert exe, f"Missing required existing tool: {executable}"
    argv = [exe] + arguments
    env = os.environ.copy()
    env.update({
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_PAGER": "",
        "GH_PAGER": "",
        "GH_PROMPT_DISABLED": "1",
        "GH_HTTP_TIMEOUT": "60",
        "NO_COLOR": "1",
    })
    (root_dir / "stdin.bin").write_bytes(stdin)
    observer = process_identity(os.getpid())
    outer_pid = int(sys.argv[1])
    outer = process_identity(outer_pid)
    launch = {
        "rootNumber": sequence,
        "label": label,
        "argv": argv,
        "cwd": str(REPO),
        "requestedUtc": utc(),
        "observer": observer,
        "outerPowerShellObserver": outer,
        "helper": str(Path(__file__).resolve()),
        "helperSha256": sha256(Path(__file__).read_bytes()),
        "stdinBytes": len(stdin),
        "stdinSha256": sha256(stdin),
        "environmentOverrides": {key: env[key] for key in (
            "GIT_OPTIONAL_LOCKS", "GIT_NO_REPLACE_OBJECTS", "GIT_NO_LAZY_FETCH",
            "GIT_TERMINAL_PROMPT", "GIT_PAGER", "GH_PAGER", "GH_PROMPT_DISABLED",
            "GH_HTTP_TIMEOUT", "NO_COLOR"
        )},
    }
    write_json(root_dir / "launch.json", launch)
    started = utc()
    process = subprocess.Popen(
        argv, cwd=REPO, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, shell=False
    )
    root_creation = creation(int(process._handle))
    done = threading.Event()
    children = {}
    observations = {"snapshots": 0, "errors": []}

    def observe():
        while True:
            try:
                entries = snapshot()
                observations["snapshots"] += 1
                known = {process.pid: (int(process._handle), root_creation)}
                known.update({pid: (row["handle"], row["creationFileTime"])
                              for pid, row in children.items()})
                changed = True
                while changed:
                    changed = False
                    for pid, (parent, name) in entries.items():
                        if pid in known or parent not in known:
                            continue
                        parent_handle, parent_creation = known[parent]
                        if KERNEL.WaitForSingleObject(parent_handle, 0) != 258:
                            continue
                        handle = KERNEL.OpenProcess(0x00101000, False, pid)
                        if not handle:
                            continue
                        child_creation = creation(handle)
                        if child_creation < parent_creation:
                            KERNEL.CloseHandle(handle)
                            continue
                        children[pid] = {
                            "pid": pid, "parentPid": parent, "executableName": name,
                            "creationFileTime": child_creation, "handle": handle,
                            "firstObservedUtc": utc()
                        }
                        known[pid] = (handle, child_creation)
                        changed = True
            except Exception as error:
                observations["errors"].append(repr(error))
            if done.wait(0.1):
                break

    thread = threading.Thread(target=observe, daemon=True)
    thread.start()
    stdout, stderr = process.communicate(stdin)
    return_code = process.wait()
    done.set()
    thread.join(10)
    child_deadline = time.monotonic() + 10
    child_receipts = []
    for row in children.values():
        handle = row.pop("handle")
        remaining_ms = max(0, int((child_deadline - time.monotonic()) * 1000))
        result = KERNEL.WaitForSingleObject(handle, remaining_ms)
        row["waitForSingleObjectResult"] = result
        row["observedIdentityTerminal"] = result == 0
        row["waitRecordedUtc"] = utc()
        KERNEL.CloseHandle(handle)
        child_receipts.append(row)
    (root_dir / "stdout.bin").write_bytes(stdout)
    (root_dir / "stderr.bin").write_bytes(stderr)
    receipt = {
        **launch,
        "rootPid": process.pid,
        "rootCreationFileTime": root_creation,
        "startedUtc": started,
        "observedCompletedUtc": utc(),
        "exitCode": return_code,
        "communicateReturned": True,
        "explicitRootWaitReturned": True,
        "bothRedirectedStreamsDrainedToEof": True,
        "stdoutBytes": len(stdout),
        "stdoutSha256": sha256(stdout),
        "stderrBytes": len(stderr),
        "stderrSha256": sha256(stderr),
        "observationThreadJoined": not thread.is_alive(),
        "observations": observations,
        "observedChildren": child_receipts,
        "observedChildLimit": (
            "100ms Toolhelp census, creation-time checked live parent identities; at most "
            "10s total post-root wait for observed descendants. Fast, reparented, inaccessible "
            "or otherwise unobserved descendants are not proven absent. No universal closure claim."
        ),
    }
    write_json(root_dir / "receipt.json", receipt)
    print(json.dumps({
        "root": sequence, "label": label, "pid": process.pid,
        "observerPid": observer["pid"], "outerObserverPid": outer_pid,
        "exitCode": return_code, "stdoutBytes": len(stdout),
        "stderrBytes": len(stderr), "observedChildren": len(child_receipts)
    }), flush=True)
    assert not thread.is_alive(), "Observer thread did not finish"
    assert all(row["observedIdentityTerminal"] for row in child_receipts), "Observed child outstanding"
    assert return_code == 0, f"Preserved failed source root {sequence}: {stderr.decode('utf-8', 'replace')}"
    return stdout, root_dir


def git(label, arguments, stdin=b""):
    return run(label, "git.exe", ["--no-pager", "-C", str(REPO)] + arguments, stdin)


def phase_one():
    query = "query { repository(owner:\"dotnet\", name:\"aspnetcore\") { nameWithOwner defaultBranchRef { name target { oid } } } }"
    raw, root_dir = run(
        "Fresh read-only upstream current default branch and immutable object ID",
        "gh.exe", ["api", "graphql", "-f", "query=" + query]
    )
    resolved = json.loads(raw)["data"]["repository"]
    assert resolved["nameWithOwner"] == "dotnet/aspnetcore"
    default_branch = resolved["defaultBranchRef"]["name"]
    default_commit = resolved["defaultBranchRef"]["target"]["oid"]
    assert len(default_commit) == 40
    write_json(OUT / "roles.json", {
        "Original": {"commit": ORIGINAL, "meaning": "user-pinned original"},
        "Default": {
            "commit": default_commit, "branch": default_branch,
            "meaning": "fresh upstream API observation, not reserved working-tree HEAD",
            "rawApiRoot": str(root_dir), "observedUtc": utc()
        },
        "NavigationOnly": {"commit": BOOT["reservedNavigationHead"], "neverDefault": True},
    })
    tree_paths = [
        "AGENTS.md", ".github/AGENTS.md", ".github/copilot-instructions.md",
        ".github/instructions", "src/AGENTS.md", "src/Identity",
    ]
    for role, commit in (("Original", ORIGINAL), ("Default", default_commit)):
        raw, _ = git(
            role + " bounded filename-only instruction/product/test inventory",
            ["ls-tree", "-r", "--name-only", commit, "--"] + tree_paths
        )
        selected = [
            line for line in raw.decode("utf-8").splitlines()
            if "AGENTS.md" in line or "InMemory.Test/" in line
            or "test/Shared/" in line or line.startswith(".github/")
        ]
        print(role + " INVENTORY\n" + "\n".join(selected), flush=True)


if __name__ == "__main__":
    phase_one()
