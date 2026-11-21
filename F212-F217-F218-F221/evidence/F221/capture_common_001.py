import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REPO = Path(r"C:\src\aspnetcore")
ORIGINAL = "37e809ead5824bc753a1c3d56f11615bdb1296c5"
OWNER = "ac5fbaab-9a69-42c1-81ff-6fdc625139ba"


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def sha256(data):
    return hashlib.sha256(data).hexdigest().upper()


def write_bytes(relative, data):
    target = ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("xb") as stream:
        stream.write(data)
    return target


def write_json(relative, data):
    return write_bytes(relative, (json.dumps(data, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))


def read_json(relative):
    return json.loads((ROOT / relative).read_bytes())


def run(label, argv, acceptable=(0,)):
    destination = Path("commands") / label
    env = os.environ.copy()
    env.update(GIT_OPTIONAL_LOCKS="0", GIT_PAGER="cat", GH_PROMPT_DISABLED="1")
    receipt = {
        "label": label,
        "argv": argv,
        "cwd": str(REPO),
        "startedUtc": utc(),
        "owningHelperPid": os.getpid(),
        "parentPid": os.getppid(),
        "environmentOverrides": {key: env[key] for key in ("GIT_OPTIONAL_LOCKS", "GIT_PAGER", "GH_PROMPT_DISABLED")},
        "waitMethod": "subprocess.Popen.communicate; context-manager wait/handle closure",
        "timeoutSeconds": 180,
    }
    try:
        with subprocess.Popen(argv, cwd=REPO, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE) as process:
            receipt["pid"] = process.pid
            try:
                stdout, stderr = process.communicate(timeout=180)
                receipt["initialWaitExpired"] = False
            except subprocess.TimeoutExpired:
                receipt["initialWaitExpired"] = True
                write_json(destination / "initial-wait-expired.json", receipt)
                stdout, stderr = process.communicate()
            receipt["exitCode"] = process.returncode
            receipt["processWaited"] = True
            receipt["stdoutDrained"] = True
            receipt["stderrDrained"] = True
        receipt["handlesClosed"] = True
    except Exception as error:
        receipt["exception"] = repr(error)
        receipt["exitedUtc"] = utc()
        write_json(destination / "receipt.json", receipt)
        raise
    receipt.update(
        exitedUtc=utc(),
        stdoutBytes=len(stdout),
        stderrBytes=len(stderr),
        stdoutSha256=sha256(stdout),
        stderrSha256=sha256(stderr),
        exitAcceptable=receipt["exitCode"] in acceptable,
    )
    write_bytes(destination / "stdout.bin", stdout)
    write_bytes(destination / "stderr.bin", stderr)
    write_json(destination / "receipt.json", receipt)
    print(f"{label}: exit={receipt['exitCode']} stdout={len(stdout)} stderr={len(stderr)}", flush=True)
    if not receipt["exitAcceptable"]:
        raise RuntimeError(f"{label}: unexpected exit {receipt['exitCode']}; full streams preserved")
    return stdout


def local_blob(role, commit, git_path):
    label = git_path.replace("/", "__").replace(".", "_")
    blob = run(f"{role}-blobid-{label}", ["git", "--no-pager", "rev-parse", f"{commit}:{git_path}"]).decode().strip()
    raw = run(f"{role}-blob-{label}", ["git", "--no-pager", "cat-file", "blob", blob])
    actual = hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()
    if actual != blob:
        raise RuntimeError(f"Git blob mismatch: {git_path}")
    relative = Path("source") / role / Path(git_path)
    write_bytes(relative, raw)
    return {"role": role, "commit": commit, "path": git_path, "blob": blob, "bytes": len(raw), "sha256": sha256(raw), "artifact": str(relative)}


def remote_blob(role, commit, git_path):
    import base64
    label = git_path.replace("/", "__").replace(".", "_")
    result = run(
        f"{role}-contents-{label}",
        ["gh", "api", "--method", "GET", f"repos/dotnet/aspnetcore/contents/{git_path}", "-f", f"ref={commit}"],
    )
    content = json.loads(result)
    raw = base64.b64decode(content["content"], validate=False)
    actual = hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()
    if actual != content["sha"] or len(raw) != content["size"]:
        raise RuntimeError(f"GitHub blob mismatch: {git_path}")
    relative = Path("source") / role / Path(git_path)
    write_bytes(relative, raw)
    return {"role": role, "commit": commit, "path": git_path, "blob": content["sha"], "bytes": len(raw), "sha256": sha256(raw), "artifact": str(relative)}


def helper_start(name):
    write_json(f"{name}-start.json", {
        "helper": name,
        "utc": utc(),
        "pid": os.getpid(),
        "parentPid": os.getppid(),
        "argv": sys.argv,
        "pythonExecutable": sys.executable,
        "cwd": str(Path.cwd()),
        "scope": "Read-only git/gh source capture; writes only this private evidence root. No builds/tests or performance work.",
    })


def helper_end(name):
    write_json(f"{name}-terminal.json", {
        "helper": name,
        "utc": utc(),
        "pid": os.getpid(),
        "allSubprocessCallsSynchronous": True,
        "allRecordedChildrenWaitedAndStreamsDrained": True,
        "outstandingOwnedChildren": [],
        "buildsTestsBenchmarksStarted": 0,
    })
