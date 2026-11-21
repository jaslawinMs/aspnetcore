import ctypes
from ctypes import wintypes
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
import traceback
from urllib.parse import quote


OUT = Path(__file__).resolve().parent
PAR = OUT.parent
REPO = Path(r"C:\src\aspnetcore")
ORIGINAL = "37e809ead5824bc753a1c3d56f11615bdb1296c5"
RESERVED_HEAD = "24875ef5dabb55567870b39f6eb0002170435e2f"
OWNER = "ed471f5e-c998-47a0-a617-4b6bcd83121b"
SCOPE = (
    "267 SOURCE ONLY after GO267 and fresh actual-own-registration/exact-scope/no-lease/no-HOLD/nonquiesced guards. "
    "One owner also qualifies F232/F233 at same Identity.Test UserClaimsPrincipalFactoryTest source: actual claims/roles producer/cardinality/test frequency/equality/type/value/order/duplicates/exception contracts/current Default/history/materiality. "
    "Initial max15whole logical product/doc/test/config files per role/max32direct Git-gh source roots includingfailures, batch exact raw cat-file bindings. "
    "finding-F231-F232-F233-267 only; no fabricated claims/repetition/isolated Contains or duplicate-by-file inference. "
    "No SDKactivation/dotnet/build/test/restore/runtime/host/browser/server/scenario/candidate/source edits/timing/warmup/allocation/profiler/counters/remote/subagent/shared/policy/lease/ledger/publication/API/default/cache/assertion/message/manifest/IVT/UnsafeAccessor/cleanup authority. "
    "Source-only no material candidate valid, stop finite proposal before broadening; seal actual whole source/failures/terminal evidence."
)
assert OUT.name == "finding-F231-F232-F233-267"
ROOTS = OUT / "roots"
ROOTS.mkdir(exist_ok=True)
KERNEL = ctypes.WinDLL("kernel32", use_last_error=True)


class PROCESSENTRY32W(ctypes.Structure):
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


KERNEL.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
KERNEL.OpenProcess.restype = wintypes.HANDLE
KERNEL.CloseHandle.argtypes = [wintypes.HANDLE]
KERNEL.CloseHandle.restype = wintypes.BOOL
KERNEL.GetProcessTimes.argtypes = [
    wintypes.HANDLE,
    ctypes.POINTER(wintypes.FILETIME),
    ctypes.POINTER(wintypes.FILETIME),
    ctypes.POINTER(wintypes.FILETIME),
    ctypes.POINTER(wintypes.FILETIME),
]
KERNEL.GetProcessTimes.restype = wintypes.BOOL
KERNEL.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
KERNEL.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
KERNEL.Process32FirstW.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESSENTRY32W)]
KERNEL.Process32FirstW.restype = wintypes.BOOL
KERNEL.Process32NextW.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESSENTRY32W)]
KERNEL.Process32NextW.restype = wintypes.BOOL


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def sha256(data):
    return hashlib.sha256(data).hexdigest().upper()


def write_json(path, value):
    assert not path.exists(), f"Refusing overwrite: {path}"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def file_metadata(path):
    data = path.read_bytes()
    return {"path": str(path.relative_to(OUT)), "bytes": len(data), "sha256": sha256(data)}


def process_times(handle):
    creation, exit_time, kernel_time, user_time = (wintypes.FILETIME() for _ in range(4))
    if not KERNEL.GetProcessTimes(handle, ctypes.byref(creation), ctypes.byref(exit_time),
                                  ctypes.byref(kernel_time), ctypes.byref(user_time)):
        raise ctypes.WinError(ctypes.get_last_error())
    return {
        "creationFileTime": (creation.dwHighDateTime << 32) | creation.dwLowDateTime,
        "exitFileTime": (exit_time.dwHighDateTime << 32) | exit_time.dwLowDateTime,
    }


def process_identity(pid):
    handle = KERNEL.OpenProcess(0x1000, False, pid)
    if not handle:
        return {"pid": pid, "querySucceeded": False, "win32Error": ctypes.get_last_error()}
    try:
        return {"pid": pid, "querySucceeded": True, **process_times(handle)}
    finally:
        assert KERNEL.CloseHandle(handle)


def process_snapshot():
    handle = KERNEL.CreateToolhelp32Snapshot(0x00000002, 0)
    if handle == ctypes.c_void_p(-1).value:
        raise ctypes.WinError(ctypes.get_last_error())
    records = []
    try:
        entry = PROCESSENTRY32W()
        entry.dwSize = ctypes.sizeof(entry)
        okay = KERNEL.Process32FirstW(handle, ctypes.byref(entry))
        if not okay:
            raise ctypes.WinError(ctypes.get_last_error())
        while okay:
            records.append({
                "pid": int(entry.th32ProcessID),
                "parentPid": int(entry.th32ParentProcessID),
                "executableName": entry.szExeFile,
            })
            okay = KERNEL.Process32NextW(handle, ctypes.byref(entry))
        error = ctypes.get_last_error()
        assert error == 18, f"Unexpected process enumeration result: {error}"
        return records
    finally:
        assert KERNEL.CloseHandle(handle)


OBSERVER = process_identity(os.getpid())
assert OBSERVER["querySucceeded"]
OBSERVER["pythonExecutable"] = sys.executable
OBSERVER["outerPowerShellPid"] = int(os.environ["F231_OUTER_PS_PID"])
OBSERVER["outerPowerShellStartUtc"] = os.environ["F231_OUTER_PS_START_UTC"]
OBSERVER["outerPowerShellIdentity"] = process_identity(OBSERVER["outerPowerShellPid"])
assert OBSERVER["outerPowerShellIdentity"]["querySucceeded"]


def guard(label):
    data = (PAR / "policy.json").read_bytes()
    policy = json.loads(data)
    workers = policy["independentFindingPreparationWorkers"]
    assert workers["F231"] == OWNER, "Actual owner registration changed"
    assert len(workers) <= 4 and policy["maximumRegisteredPreparationOwners"] == 4
    assert policy["activeWorkerPreparationScopes"]["F231"] == SCOPE, "Exact 267 scope changed"
    assert policy["actualWorkerBuildHoldActive"] is False, "Active worker HOLD"
    assert policy["buildAndTestWorkQuiesced"] is False, "Build/test quiescence active"
    assert not (PAR / "benchmark-exclusive.lease.json").exists(), "Exclusive lease exists"
    policy_copy = OUT / "guards" / f"{label}-policy.json"
    assert not policy_copy.exists()
    policy_copy.parent.mkdir(exist_ok=True)
    policy_copy.write_bytes(data)
    value = {
        "observedAt": now(),
        "ownerId": OWNER,
        "scope": SCOPE,
        "policy": file_metadata(policy_copy),
        "leaseAbsentAtObservation": True,
        "actualWorkerBuildHoldActive": False,
        "buildAndTestWorkQuiesced": False,
        "registeredOwnerCount": len(workers),
        "observer": OBSERVER,
        "pointOnlyNotFutureAuthorization": True,
    }
    write_json(OUT / "guards" / f"{label}.json", value)
    return value


def run(label, command, stdin=b"", deadline_seconds=120):
    existing = list(ROOTS.glob("*.before.json"))
    assert len(existing) < 32, "Direct Git/gh source root budget exhausted"
    sequence = len(existing) + 1
    name = f"{sequence:02d}-{label}"
    authorization = guard(name)
    executable = shutil.which(command[0])
    assert executable is not None, f"Missing required source utility: {command[0]}"
    argv = [executable, *command[1:]]
    stdin_path = ROOTS / f"{name}.stdin.bin"
    stdout_path = ROOTS / f"{name}.stdout.bin"
    stderr_path = ROOTS / f"{name}.stderr.bin"
    stdin_path.write_bytes(stdin)
    before = {
        "sequence": sequence, "label": label, "argv": argv, "cwd": str(REPO),
        "stdin": file_metadata(stdin_path), "startRequestedAt": now(),
        "observer": OBSERVER, "guardPolicySha256": authorization["policy"]["sha256"],
        "rootBudgetIncludingThisAttempt": sequence,
        "sourceOnly": True,
    }
    write_json(ROOTS / f"{name}.before.json", before)
    environment = dict(os.environ)
    environment.update({
        "GIT_PAGER": "cat", "PAGER": "cat", "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0", "GH_PROMPT_DISABLED": "1",
    })
    process = subprocess.Popen(
        argv, cwd=REPO, env=environment, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, shell=False, creationflags=subprocess.CREATE_NO_WINDOW,
    )
    root = {"pid": process.pid, "querySucceeded": True, **process_times(int(process._handle))}
    root["identityBoundByOwnedPopenHandle"] = True
    write_json(ROOTS / f"{name}.started.json", {
        "observedAt": now(), "root": root, "observer": OBSERVER, "argv": argv,
    })
    stream_states = {}
    stream_errors = []

    def drain(stream, path, key):
        state = {"eof": False, "bytes": 0}
        stream_states[key] = state
        try:
            with path.open("xb") as target:
                while True:
                    chunk = stream.read(65536)
                    if not chunk:
                        state["eof"] = True
                        break
                    target.write(chunk)
                    state["bytes"] += len(chunk)
        except BaseException as error:
            stream_errors.append({"stream": key, "error": repr(error)})
            raise
        finally:
            stream.close()

    threads = [
        threading.Thread(target=drain, args=(process.stdout, stdout_path, "stdout"), daemon=True),
        threading.Thread(target=drain, args=(process.stderr, stderr_path, "stderr"), daemon=True),
    ]
    for thread in threads:
        thread.start()
    process.stdin.write(stdin)
    process.stdin.close()
    observed_children = {}
    snapshots = 0
    deadline = time.monotonic() + deadline_seconds

    def observe():
        nonlocal snapshots
        snapshot = process_snapshot()
        snapshots += 1
        parent_ids = {process.pid}
        for item in observed_children.values():
            identity = process_identity(item["pid"])
            if identity["querySucceeded"] and identity["creationFileTime"] == item.get("creationFileTime"):
                parent_ids.add(item["pid"])
        added = True
        while added:
            added = False
            for entry in snapshot:
                if entry["pid"] in parent_ids or entry["parentPid"] not in parent_ids:
                    continue
                identity = process_identity(entry["pid"])
                key = str((entry["pid"], identity.get("creationFileTime"), identity.get("win32Error")))
                if key not in observed_children:
                    observed_children[key] = {**entry, **identity, "firstObservedAt": now()}
                parent_ids.add(entry["pid"])
                added = True

    while process.poll() is None and time.monotonic() < deadline:
        observe()
        time.sleep(0.05)
    observe()
    root_exited = process.poll() is not None
    if root_exited:
        process.wait()
    for thread in threads:
        thread.join(timeout=15)
    closure_deadline = time.monotonic() + 15
    while time.monotonic() < closure_deadline:
        pending = []
        for item in observed_children.values():
            identity = process_identity(item["pid"])
            if identity["querySucceeded"] and identity["creationFileTime"] == item.get("creationFileTime") and identity["exitFileTime"] == 0:
                pending.append(item)
        if not pending:
            break
        time.sleep(0.05)
    child_terminals = []
    for item in observed_children.values():
        final = process_identity(item["pid"])
        absent = not final["querySucceeded"] and final["win32Error"] == 87
        replaced = final["querySucceeded"] and final["creationFileTime"] != item.get("creationFileTime")
        exited = final["querySucceeded"] and final["creationFileTime"] == item.get("creationFileTime") and final["exitFileTime"] != 0
        child_terminals.append({**item, "finalObservation": final,
                                "terminalEstablished": item["querySucceeded"] and (absent or replaced or exited)})
    receipt = {
        **before, "completedObservationAt": now(), "root": root,
        "rootExited": root_exited, "rootWaitCalledAndReturned": root_exited,
        "exitCode": process.returncode, "rootFinalTimesFromOwnedHandle": process_times(int(process._handle)),
        "streams": stream_states, "streamErrors": stream_errors,
        "stdout": file_metadata(stdout_path), "stderr": file_metadata(stderr_path),
        "allDrainThreadsJoined": all(not thread.is_alive() for thread in threads),
        "observedChildren": child_terminals,
        "allObservedChildrenTerminal": all(item["terminalEstablished"] for item in child_terminals),
        "processSnapshots": snapshots,
        "observationLimits": {
            "nominalPollingSeconds": 0.05,
            "rootDeadlineSeconds": deadline_seconds,
            "perStreamJoinSeconds": 15,
            "observedChildClosureSeconds": 15,
            "jobObjectContainment": False,
            "shortLivedOrUnobservedDescendantsExcluded": False,
            "scope": "Creation-bound direct root; sampled creation-bound descendants only. Not a machine-wide quiescence proof.",
            "noProcessWasTerminatedByThisUtility": True,
        },
    }
    receipt["terminalSuccess"] = (
        root_exited and process.returncode == 0 and receipt["allDrainThreadsJoined"]
        and not stream_errors and all(item["eof"] for item in stream_states.values())
        and len(stream_states) == 2 and receipt["allObservedChildrenTerminal"]
    )
    write_json(ROOTS / f"{name}.receipt.json", receipt)
    assert receipt["terminalSuccess"], f"Source utility failed or nonterminal: {name}"
    return stdout_path.read_bytes(), receipt


def git(*arguments):
    return ["git", "--no-pager", "-C", str(REPO), *arguments]


def discovery():
    repository_data, _ = run("upstream-default-branch", [
        "gh", "api", "repos/dotnet/aspnetcore", "--jq", "{full_name,default_branch}",
    ])
    repository = json.loads(repository_data)
    assert repository["full_name"] == "dotnet/aspnetcore"
    default_branch = repository["default_branch"]
    reference_data, _ = run("upstream-default-commit", [
        "gh", "api", f"repos/dotnet/aspnetcore/git/ref/heads/{quote(default_branch, safe='')}",
    ])
    reference = json.loads(reference_data)
    assert reference["ref"] == "refs/heads/" + default_branch and reference["object"]["type"] == "commit"
    default_commit = reference["object"]["sha"]
    assert len(default_commit) == 40
    revisions_data, _ = run("reserved-and-original-identity", git("rev-parse", "HEAD", ORIGINAL + "^{commit}"))
    revisions = revisions_data.decode("ascii").splitlines()
    assert revisions == [RESERVED_HEAD, ORIGINAL], "Reserved navigation/objectstore identity changed"
    availability_data, _ = run(
        "immutable-commit-availability", git("cat-file", "--batch-check"),
        f"{ORIGINAL}\n{default_commit}\n".encode("ascii"),
    )
    availability = availability_data.decode("ascii").splitlines()
    assert availability[0].split()[1] == "commit"
    expected_prefix = default_commit + " commit "
    local_default_available = availability[1].startswith(expected_prefix)
    selectors = [
        "AGENTS.md", "src/AGENTS.md", ".github/AGENTS.md",
        ".github/instructions/cross-cutting-guidance.instructions.md",
        "src/Identity/AGENTS.md", "src/Identity/test/AGENTS.md",
        "src/Identity/test/Identity.Test", "src/Identity/Extensions.Core",
    ]
    for role, commit in [("Original", ORIGINAL), *([("Default", default_commit)] if local_default_available else [])]:
        run(f"{role.lower()}-bounded-path-inventory", git("ls-tree", "-r", "--name-only", commit, "--", *selectors))
    write_json(OUT / "discovery-267.json", {
        "freshUpstream": {"repository": repository["full_name"], "defaultBranch": default_branch,
                          "commit": default_commit, "reference": reference},
        "Original": ORIGINAL, "Default": default_commit, "reservedHead": RESERVED_HEAD,
        "reservedRepositoryUse": "Read-only navigation/objectstore only; never a source role",
        "localDefaultObjectAvailable": local_default_available,
        "availabilityResponse": availability,
        "selectors": selectors, "observedAt": now(),
    })
    print(json.dumps({"defaultBranch": default_branch, "defaultCommit": default_commit,
                      "localDefaultObjectAvailable": local_default_available}))
    for path in sorted(ROOTS.glob("*-bounded-path-inventory.stdout.bin")):
        print(path.name)
        print(path.read_text(encoding="utf-8"))


def capture(spec_path):
    spec = json.loads(spec_path.read_bytes())
    discovery_data = json.loads((OUT / "discovery-267.json").read_bytes())
    for role in spec["roles"]:
        assert role in ("Original", "Default")
        commit = discovery_data[role]
        paths = spec["paths"]
        assert len(paths) == len(set(paths))
        previous = []
        for file in OUT.glob("bindings-*.json"):
            previous.extend(item["repositoryPath"] for item in json.loads(file.read_bytes())["files"] if item["role"] == role)
        assert len(set(previous) | set(paths)) <= 15, f"Whole logical file budget for {role}"
        assert not (set(previous) & set(paths)), "Whole logical source was already captured"
        expressions = [commit + ":" + path for path in paths]
        stdin = ("\n".join(expressions) + "\n").encode("utf-8")
        data, root_receipt = run(f"{role.lower()}-raw-blobs-{spec['label']}", git("cat-file", "--batch"), stdin)
        cursor = 0
        bindings = []
        for path, expression in zip(paths, expressions, strict=True):
            newline = data.index(b"\n", cursor)
            header_bytes = data[cursor:newline]
            header = header_bytes.decode("ascii").split(" ")
            assert len(header) == 3 and header[1] == "blob", (expression, header_bytes)
            object_sha, _, raw_size = header
            assert len(object_sha) == 40 and all(char in "0123456789abcdef" for char in object_sha)
            size = int(raw_size)
            assert str(size) == raw_size and size >= 0
            start = newline + 1
            end = start + size
            payload = data[start:end]
            assert len(payload) == size and data[end:end + 1] == b"\n", expression
            calculated_sha = hashlib.sha1(b"blob " + str(size).encode("ascii") + b"\0" + payload).hexdigest()
            assert calculated_sha == object_sha, expression
            destination = OUT / "sources" / role / Path(*path.split("/"))
            assert not destination.exists()
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(payload)
            assert destination.read_bytes() == payload
            bindings.append({
                "role": role, "commit": commit, "repositoryPath": path,
                "commitPathExpression": expression, "objectType": "blob",
                "blobSha1": object_sha, "calculatedGitBlobSha1": calculated_sha,
                "sha256": sha256(payload), "bytes": size, "wholeBlob": True,
                "rawHeaderOffset": cursor, "rawPayloadOffset": start,
                "rawPayloadEndExclusive": end, "rawHeaderAscii": header_bytes.decode("ascii"),
                "rawStdout": root_receipt["stdout"], "sourceFile": str(destination.relative_to(OUT)),
                "binaryFramingValidated": True,
            })
            cursor = end + 1
        assert cursor == len(data), "Unconsumed raw cat-file bytes"
        write_json(OUT / f"bindings-{spec['label']}-{role}.json", {
            "label": spec["label"], "role": role, "commit": commit, "files": bindings,
            "requestOrderValidated": True, "allRawStdoutBytesConsumed": True,
            "sourceRootSequence": root_receipt["sequence"],
        })
        print(json.dumps({"role": role, "captured": len(bindings), "paths": paths}))


def commands(spec_path):
    spec = json.loads(spec_path.read_bytes())
    for command in spec["commands"]:
        assert command["argv"][0] in ("git", "gh")
        argv = git(*command["argv"][1:]) if command["argv"][0] == "git" else command["argv"]
        output, receipt = run(command["label"], argv, command.get("stdin", "").encode("utf-8"))
        print(json.dumps({"label": command["label"], "rootSequence": receipt["sequence"],
                          "stdoutBytes": len(output)}))
        if command.get("display", False):
            print(output.decode("utf-8"))


def main():
    action = sys.argv[1]
    guard("utility-" + action + "-" + sys.argv[-1].replace(".", "-"))
    if action == "discovery":
        discovery()
    elif action == "capture":
        capture(OUT / sys.argv[2])
    elif action == "commands":
        commands(OUT / sys.argv[2])
    else:
        raise AssertionError("Unsupported source-only action")


if __name__ == "__main__":
    invocation = "-".join(sys.argv[1:]).replace("\\", "_").replace("/", "_").replace(".", "-")
    try:
        main()
    except BaseException as failure:
        write_json(OUT / f"failure-{invocation}.json", {
            "observedAt": now(), "exception": repr(failure), "traceback": traceback.format_exc(),
            "observer": OBSERVER, "failureWasRethrown": True, "noSuccessSubstitution": True,
        })
        raise
    else:
        write_json(OUT / f"utility-{invocation}-terminal.json", {
            "observedAt": now(), "observer": OBSERVER, "action": sys.argv[1:],
            "pythonActionReturnedNormally": True, "outerToolReturnNotYetObserved": True,
        })
