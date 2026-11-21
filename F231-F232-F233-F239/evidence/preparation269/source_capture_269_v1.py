import argparse
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
import time
import traceback

BASE = Path(__file__).resolve().parent
PAR = BASE.parent
REPO = Path(r"C:\src\aspnetcore")
OWNER = "ec444276-1562-48a8-8655-bc9a7c90de94"
ORIGINAL = "37e809ead5824bc753a1c3d56f11615bdb1296c5"
ROLES = ("Original", "Default")
MAX_ROOTS = 32
MAX_FILES = 15
MAX_STREAM = 32 * 1024 * 1024
kernel = ctypes.WinDLL("kernel32", use_last_error=True)
kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
kernel.OpenProcess.restype = wintypes.HANDLE
kernel.GetProcessTimes.argtypes = [wintypes.HANDLE] + [ctypes.POINTER(wintypes.FILETIME)] * 4
kernel.GetProcessTimes.restype = wintypes.BOOL
kernel.CloseHandle.argtypes = [wintypes.HANDLE]
kernel.CloseHandle.restype = wintypes.BOOL


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def sha256(data):
    return hashlib.sha256(data).hexdigest().upper()


def write_new(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as stream:
        stream.write(data)


def write_json(path, value):
    write_new(path, (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))


def identity(pid, handle=None):
    owned = handle is None
    handle = handle or kernel.OpenProcess(0x1000, False, pid)
    result = {"pid": pid, "observedUtc": utc()}
    if not handle:
        result["queryError"] = ctypes.get_last_error()
        return result
    creation, end, kernel_time, user_time = (wintypes.FILETIME() for _ in range(4))
    if kernel.GetProcessTimes(handle, ctypes.byref(creation), ctypes.byref(end),
                              ctypes.byref(kernel_time), ctypes.byref(user_time)):
        ticks = (creation.dwHighDateTime << 32) | creation.dwLowDateTime
        result["creationFiletime100ns"] = ticks
        result["creationUtc"] = (
            datetime.datetime(1601, 1, 1, tzinfo=datetime.timezone.utc)
            + datetime.timedelta(microseconds=ticks // 10)
        ).isoformat()
    else:
        result["queryError"] = ctypes.get_last_error()
    if owned:
        kernel.CloseHandle(handle)
    return result


class ProcessEntry(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD), ("th32DefaultHeapID", ctypes.c_size_t),
        ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD), ("pcPriClassBase", wintypes.LONG),
        ("dwFlags", wintypes.DWORD), ("szExeFile", wintypes.WCHAR * 260),
    ]


def snapshot():
    kernel.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
    kernel.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel.Process32FirstW.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessEntry)]
    kernel.Process32FirstW.restype = wintypes.BOOL
    kernel.Process32NextW.argtypes = [wintypes.HANDLE, ctypes.POINTER(ProcessEntry)]
    kernel.Process32NextW.restype = wintypes.BOOL
    handle = kernel.CreateToolhelp32Snapshot(2, 0)
    if handle == ctypes.c_void_p(-1).value:
        raise ctypes.WinError(ctypes.get_last_error())
    values = {}
    entry = ProcessEntry()
    entry.dwSize = ctypes.sizeof(entry)
    try:
        present = kernel.Process32FirstW(handle, ctypes.byref(entry))
        while present:
            values[entry.th32ProcessID] = {
                "pid": entry.th32ProcessID, "parentPid": entry.th32ParentProcessID,
                "imageName": entry.szExeFile,
            }
            present = kernel.Process32NextW(handle, ctypes.byref(entry))
    finally:
        kernel.CloseHandle(handle)
    return values


def observe(directory, root_pid, root_creation):
    directory = Path(directory)
    own = identity(os.getpid())
    started = utc()
    observations = {}
    samples = 0
    maximum = 0
    bound = identity(root_pid)
    if bound.get("creationFiletime100ns") != root_creation:
        raise RuntimeError("Observer root creation identity mismatch")
    write_json(directory / "observer-ready.json", {"observer": own, "root": bound})
    while True:
        processes = snapshot()
        descendants = {root_pid}
        changed = True
        while changed:
            changed = False
            for pid, row in processes.items():
                if row["parentPid"] in descendants and pid not in descendants:
                    descendants.add(pid)
                    changed = True
        selected = descendants.intersection(processes)
        maximum = max(maximum, len(selected - {root_pid, os.getpid()}))
        samples += 1
        for pid in selected:
            observed = identity(pid)
            key = str(pid) + ":" + str(observed.get("creationFiletime100ns"))
            if key not in observations:
                observations[key] = dict(processes[pid], **observed, firstSeenUtc=utc(), samples=0)
            observations[key]["lastSeenUtc"] = utc()
            observations[key]["samples"] += 1
        if (directory / "observer-stop.json").is_file():
            break
        if identity(root_pid).get("creationFiletime100ns") != root_creation:
            break
        time.sleep(0.02)
    write_json(directory / "observer-result.json", {
        "startedUtc": started, "finishedUtc": utc(), "root": bound, "observer": own,
        "samples": samples, "nominalPollingSeconds": 0.02,
        "maximumSampledSourceDescendantsExcludingObserver": maximum,
        "observedProcesses": list(observations.values()),
        "limits": [
            "Polling is not complete descendant discovery; short-lived or intersample children can be missed.",
            "Creation-bound direct Popen handles, complete pipe capture and actual wait results are recorded separately.",
            "No global process, benchmark-idleness or unobserved-child absence claim is made.",
        ],
    })


def guard(label, destination):
    raw = (PAR / "policy.json").read_bytes()
    registration_raw = (PAR / "owner-registrations-267-268-269.json").read_bytes()
    policy = json.loads(raw)
    registration = json.loads(registration_raw)
    lease = (PAR / "benchmark-exclusive.lease.json").exists()
    expected_scope = registration["scopes"]["F239"]
    checks = {
        "ownActualPolicyRegistration": policy["independentFindingPreparationWorkers"]["F239"] == OWNER,
        "ownActualRegistrationReceipt": registration["actualOwners"]["F239"] == OWNER,
        "exact269Scope": policy["activeWorkerPreparationScopes"]["F239"] == expected_scope
            and expected_scope.startswith("269 SOURCE ONLY after GO269"),
        "withinRegisteredOwnerLimit": len(policy["independentFindingPreparationWorkers"])
            <= policy["maximumRegisteredPreparationOwners"] == 4,
        "leaseAbsent": not lease,
        "actualWorkerBuildHoldActiveFalse": policy["actualWorkerBuildHoldActive"] is False,
        "buildAndTestWorkQuiescedFalse": policy["buildAndTestWorkQuiesced"] is False,
    }
    write_new(destination.with_suffix(".policy.raw.json"), raw)
    write_new(destination.with_suffix(".registration.raw.json"), registration_raw)
    write_json(destination.with_suffix(".guard.json"), {
        "label": label, "observedUtc": utc(), "policySha256": sha256(raw),
        "registrationSha256": sha256(registration_raw), "checks": checks,
        "exactScope": expected_scope, "pointOnly": True,
    })
    if not all(checks.values()):
        raise RuntimeError("Fresh source-only guard failed: " + repr(checks))


def prior_usage():
    roots = 0
    paths = {role: set() for role in ROLES}
    for path in (BASE / "runs").glob("*\\command-*.result.json"):
        row = json.loads(path.read_bytes())
        roots += int(row.get("gitGhSourceRoot", False))
        for source in row.get("wholeSources", []):
            for role in source["chargedRoles"]:
                paths[role].add(source["logicalPath"])
    return roots, paths


def charge_sources(current, entries):
    prospective = {role: set(paths) for role, paths in current.items()}
    for row in entries:
        for role in row["chargedRoles"]:
            prospective[role].add(row["logicalPath"])
    if any(len(value) > MAX_FILES for value in prospective.values()):
        raise RuntimeError("Whole logical file budget would be exceeded: " +
                           repr({role: len(value) for role, value in prospective.items()}))
    return prospective


def parse_batch(raw, specs, command_dir):
    offset = 0
    bindings = []
    for index, row in enumerate(specs):
        begin = offset
        header_end = raw.index(b"\n", offset)
        header = raw[offset:header_end]
        offset = header_end + 1
        if header.endswith(b" missing"):
            bindings.append(dict(row, missing=True, framingStart=begin, framingEnd=offset))
            continue
        object_id, kind, size_raw = header.decode("ascii").split(" ")
        size = int(size_raw)
        body = raw[offset:offset + size]
        if len(body) != size or raw[offset + size:offset + size + 1] != b"\n":
            raise RuntimeError("Invalid binary Git batch framing")
        computed = hashlib.sha1(kind.encode("ascii") + b" " + size_raw.encode("ascii") + b"\0" + body).hexdigest()
        if computed != object_id:
            raise RuntimeError("Git object SHA-1 mismatch")
        if kind != row["expectedType"]:
            raise RuntimeError("Unexpected Git object type")
        if ":" not in row["spec"] and object_id != row["spec"]:
            raise RuntimeError("Commit SHA-1 mismatch")
        blob_path = command_dir / ("object-" + str(index).zfill(2) + "." + kind + ".bin")
        write_new(blob_path, body)
        bindings.append(dict(row, objectSha1=object_id, type=kind, size=size,
                             contentSha256=sha256(body), gitObjectSha1Verified=True,
                             output=str(blob_path.relative_to(BASE)),
                             framingStart=begin, payloadStart=offset,
                             payloadEnd=offset + size, framingEnd=offset + size + 1))
        offset += size + 1
    if offset != len(raw):
        raise RuntimeError("Trailing bytes after exact Git batch response")
    return bindings


def display_bytes(label, raw, start=None, end=None):
    print("=== " + label + " (decoded display only; original bytes retained) ===", flush=True)
    lines = raw.decode("utf-8-sig", errors="replace").splitlines()
    for number, line in enumerate(lines, 1):
        if (start is None or number >= start) and (end is None or number <= end):
            print(str(number) + ": " + line)
    sys.stdout.flush()


def execute_plan(plan_path, run_name):
    run_dir = BASE / "runs" / run_name
    run_dir.mkdir(parents=True, exist_ok=False)
    plan_raw = Path(plan_path).read_bytes()
    write_new(run_dir / "executed-plan.raw.json", plan_raw)
    plan = json.loads(plan_raw)
    root = identity(os.getpid())
    parent = identity(os.getppid())
    observer_argv = [
        sys.executable, str(Path(__file__).resolve()), "--observe", str(run_dir),
        str(os.getpid()), str(root["creationFiletime100ns"]),
    ]
    observer = subprocess.Popen(observer_argv, cwd=BASE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    observer_identity = identity(observer.pid, observer._handle)
    write_json(run_dir / "root-start.json", {
        "root": root, "parent": parent, "observer": observer_identity,
        "argv": sys.argv, "cwd": str(Path.cwd()), "observerArgv": observer_argv,
        "scope": "F239 269 SOURCE ONLY", "maximumGitGhRoots": MAX_ROOTS,
        "maximumWholeLogicalFilesPerRole": MAX_FILES,
        "sourceCommandTimeoutSeconds": 120, "sourceStreamDeclaredLimitBytes": MAX_STREAM,
        "streamPolicy": "Binary pipes; complete streams retained, no text re-encoding or truncation.",
    })
    deadline = time.monotonic() + 10
    while not (run_dir / "observer-ready.json").is_file():
        if observer.poll() is not None or time.monotonic() > deadline:
            raise RuntimeError("Observer not ready within 10 seconds")
        time.sleep(0.02)
    roots, paths = prior_usage()
    failure = None
    command_summaries = []
    try:
        for index, command in enumerate(plan["commands"], 1):
            label = "command-" + str(index).zfill(2)
            prefix = run_dir / label
            guard(command.get("label", label), prefix)
            kind = command["kind"]
            command_dir = run_dir / label
            command_dir.mkdir(exist_ok=False)
            result = {
                "startedUtc": utc(), "label": command.get("label", label),
                "kind": kind, "wholeSources": [], "gitGhSourceRoot": False,
            }
            result_path = run_dir / (label + ".result.json")
            try:
                if kind == "local-instructions":
                    names = command["paths"]
                    present = [name for name in names if (REPO / name).is_file()]
                    entries = [{"logicalPath": name.replace("\\", "/"), "chargedRoles": list(ROLES)}
                               for name in present]
                    paths = charge_sources(paths, entries)
                    for number, name in enumerate(present):
                        data = (REPO / name).read_bytes()
                        output = command_dir / ("instruction-" + str(number).zfill(2) + ".raw.bin")
                        write_new(output, data)
                        entry = dict(entries[number], sourceFile=str(REPO / name), size=len(data),
                                     contentSha256=sha256(data), output=str(output.relative_to(BASE)),
                                     provenance="Local reserved working-tree guidance only; not a Default source binding.")
                        result["wholeSources"].append(entry)
                        if command.get("display"):
                            display_bytes(name, data)
                    result["absentPaths"] = [name for name in names if name not in present]
                    result["exitCode"] = 0
                elif kind == "show":
                    source = BASE / command["path"]
                    data = source.read_bytes()
                    result.update(source=str(source), contentSha256=sha256(data), exitCode=0)
                    display_bytes(command["path"], data, command.get("start"), command.get("end"))
                else:
                    if roots >= MAX_ROOTS:
                        raise RuntimeError("Git/gh root budget exhausted")
                    if kind == "batch":
                        role = command["role"]
                        commit = command["commit"]
                        specs = [{"spec": commit, "expectedType": "commit"}]
                        entries = []
                        for name in command["paths"]:
                            specs.append({"spec": commit + ":" + name, "expectedType": "blob",
                                          "logicalPath": name, "chargedRoles": [role]})
                            entries.append({"logicalPath": name, "chargedRoles": [role]})
                        paths = charge_sources(paths, entries)
                        stdin = ("\n".join(row["spec"] for row in specs) + "\n").encode("utf-8")
                        argv = [shutil.which("git"), "--no-pager", "cat-file", "--batch"]
                    else:
                        specs = None
                        stdin = b""
                        executable = command["executable"]
                        if executable not in ("git", "gh"):
                            raise RuntimeError("Only read-only Git/gh source utilities allowed")
                        argv = [shutil.which(executable)] + command["args"]
                    if argv[0] is None:
                        raise RuntimeError("Source utility is missing")
                    if Path(argv[0]).stem.lower() == "git" and argv[1] != "--no-pager":
                        raise RuntimeError("Git pager must be disabled")
                    write_new(command_dir / "stdin.raw.bin", stdin)
                    write_json(command_dir / "start.json", {
                        "argv": argv, "cwd": str(REPO), "startedUtc": utc(),
                        "stdinSize": len(stdin), "stdinSha256": sha256(stdin),
                        "environmentOverrides": {
                            "GIT_OPTIONAL_LOCKS": "0", "GIT_TERMINAL_PROMPT": "0",
                            "GH_PROMPT_DISABLED": "1", "GH_PAGER": "cat", "GIT_PAGER": "cat",
                        },
                    })
                    env = os.environ.copy()
                    env.update(GIT_OPTIONAL_LOCKS="0", GIT_TERMINAL_PROMPT="0",
                               GH_PROMPT_DISABLED="1", GH_PAGER="cat", GIT_PAGER="cat")
                    child = subprocess.Popen(argv, cwd=REPO, env=env, stdin=subprocess.PIPE,
                                             stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    roots += 1
                    result["gitGhSourceRoot"] = True
                    result["argv"] = argv
                    result["cwd"] = str(REPO)
                    result["child"] = identity(child.pid, child._handle)
                    stdout, stderr = child.communicate(stdin, timeout=120)
                    result["waitReturnedUtc"] = utc()
                    result["exitCode"] = child.returncode
                    result["waitComplete"] = True
                    result["childAfterWait"] = identity(child.pid, child._handle)
                    write_new(command_dir / "stdout.raw.bin", stdout)
                    write_new(command_dir / "stderr.raw.bin", stderr)
                    result.update(stdoutSize=len(stdout), stdoutSha256=sha256(stdout),
                                  stderrSize=len(stderr), stderrSha256=sha256(stderr),
                                  streamsTruncated=False)
                    if max(len(stdout), len(stderr)) > MAX_STREAM:
                        raise RuntimeError("Declared source stream limit exceeded; full bytes retained")
                    if specs is not None and child.returncode == 0:
                        bindings = parse_batch(stdout, specs, command_dir)
                        write_json(command_dir / "bindings.json", bindings)
                        result["wholeSources"] = [row for row in bindings if "logicalPath" in row]
                        if any(row.get("missing") for row in bindings):
                            raise RuntimeError("Requested Git object missing; no retry authorized")
                        for binding in bindings:
                            if binding.get("logicalPath") in command.get("displayPaths", []):
                                display_bytes(binding["spec"], (BASE / binding["output"]).read_bytes())
                    elif command.get("display"):
                        display_bytes(command.get("label", label), stdout)
                    if child.returncode not in command.get("acceptedExitCodes", [0]):
                        raise RuntimeError("Source utility returned " + str(child.returncode))
                result["finishedUtc"] = utc()
            except BaseException as error:
                result["failure"] = repr(error)
                result["traceback"] = traceback.format_exc()
                raise
            finally:
                result["budgetAfter"] = {
                    "gitGhRoots": roots,
                    "wholeLogicalFilesPerRole": {role: sorted(value) for role, value in paths.items()},
                }
                write_json(result_path, result)
                command_summaries.append(str(result_path.relative_to(BASE)))
    except BaseException as error:
        failure = {"error": repr(error), "traceback": traceback.format_exc()}
    finally:
        write_json(run_dir / "observer-stop.json", {"requestedUtc": utc(), "byRoot": root})
        out, err = observer.communicate(timeout=10)
        write_new(run_dir / "observer.stdout.raw.bin", out)
        write_new(run_dir / "observer.stderr.raw.bin", err)
        write_json(run_dir / "root-result.json", {
            "finishedUtc": utc(), "root": root, "parent": parent,
            "observer": observer_identity, "observerWaitComplete": True,
            "observerExitCode": observer.returncode, "observerWaitReturnedUtc": utc(),
            "commandResults": command_summaries, "failure": failure,
            "sourceOnly": True,
            "budget": {"gitGhRoots": roots,
                       "wholeLogicalFilesPerRole": {role: sorted(value) for role, value in paths.items()}},
            "rootExitIsNotSelfAttested": True,
            "limits": "Outer tool return supplies this root's actual termination, not this receipt.",
        })
    print(json.dumps({"run": run_name, "root": root, "observer": observer_identity,
                      "observerExitCode": observer.returncode, "failure": failure,
                      "gitGhRoots": roots,
                      "wholeLogicalFileCounts": {role: len(value) for role, value in paths.items()}}),
          flush=True)
    return 1 if failure or observer.returncode else 0


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--observe":
        observe(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]))
        return 0
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", required=True)
    parser.add_argument("--run", required=True)
    args = parser.parse_args()
    return execute_plan(BASE / args.plan, args.run)


if __name__ == "__main__":
    sys.exit(main())
