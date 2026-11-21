import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(r"C:\src\aspnetcore")
OUT = Path(__file__).resolve().parent
os.chdir(OUT)
COMMANDS = OUT / "commands"
SOURCES = OUT / "source"
COMMANDS.mkdir(exist_ok=True)
SOURCES.mkdir(exist_ok=True)
ENV = os.environ.copy()
ENV.update({
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
    "GIT_PAGER": "cat",
    "GH_PAGER": "cat",
    "GH_PROMPT_DISABLED": "1",
})
LOG = []
MEMBERSHIP = []


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def run(label, argv):
    prefix = COMMANDS / label
    before = utc()
    with prefix.with_suffix(".stdout").open("xb") as stdout, prefix.with_suffix(".stderr").open("xb") as stderr:
        process = subprocess.Popen(argv, cwd=ROOT, env=ENV, stdout=stdout, stderr=stderr)
        code = process.wait()
    item = {
        "label": label,
        "argv": [str(arg) for arg in argv],
        "cwd": str(ROOT),
        "pid": process.pid,
        "parentPid": os.getpid(),
        "startedUtc": before,
        "endedUtc": utc(),
        "exitCode": code,
        "terminal": process.poll() is not None,
        "stdout": str(prefix.with_suffix(".stdout").relative_to(OUT)),
        "stderr": str(prefix.with_suffix(".stderr").relative_to(OUT)),
        "classification": "source-read-only",
    }
    LOG.append(item)
    write_json(prefix.with_suffix(".json"), item)
    print(json.dumps({"command": label, "pid": process.pid, "exitCode": code}), flush=True)
    return code, prefix.with_suffix(".stdout").read_bytes()


def git(label, *args):
    return run(label, ["git", "--no-pager", "-c", "core.fsmonitor=false", "-C", str(ROOT), *args])


def snapshot(revision, role, path):
    git_path = path.replace("\\", "/")
    key = hashlib.sha256(path.encode()).hexdigest()[:12]
    code, raw = git("source-" + role + "-" + key, "show", revision + ":" + git_path)
    entry = {
        "role": role,
        "revision": revision,
        "path": path,
        "gitPath": git_path,
        "exitCode": code,
    }
    if code == 0:
        target = SOURCES / role / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        entry.update({
            "artifact": str(target.relative_to(OUT)),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
        })
    MEMBERSHIP.append(entry)


def main():
    started = utc()
    git("reserved-head", "rev-parse", "HEAD")
    git("reserved-branch", "symbolic-ref", "--short", "HEAD")
    git("reserved-status", "status", "--porcelain=v2", "--untracked-files=all")
    git("reserved-tracked-diff", "diff", "--no-ext-diff", "--binary", "HEAD", "--")
    git("reserved-remotes", "remote", "-v")
    git("reserved-local-default", "rev-parse", "--verify", "refs/remotes/upstream/main")
    run("upstream-repository", ["gh", "api", "--method", "GET", "repos/dotnet/aspnetcore"])
    code, data = run("upstream-main", ["gh", "api", "--method", "GET", "repos/dotnet/aspnetcore/commits/main"])
    upstream = json.loads(data)["sha"] if code == 0 else None
    revisions = {
        "original": "37e809ead5824bc753a1c3d56f11615bdb1296c5",
        "reportedDefault": "d3483989953ae3cccd773aea5ea04cb0c7198531",
        "reserved": "24875ef5dabb55567870b39f6eb0002170435e2f",
    }
    if upstream:
        revisions["observedDefault"] = upstream
    available = {}
    for role, revision in revisions.items():
        code, unused = git("revision-" + role, "cat-file", "-e", revision + "^{commit}")
        available[role] = code == 0
        if code == 0:
            git("metadata-" + role, "show", "-s", "--format=fuller", revision)
    initial = [
        r"src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpers\TagCloudViewComponentTagHelper.cs",
        r"src\Mvc\test\WebSites\TagHelpersWebSite\TagHelpersWebSite.csproj",
        r"src\Mvc\test\WebSites\TagHelpersWebSite\Startup.cs",
        r"src\Mvc\test\Mvc.FunctionalTests\Mvc.FunctionalTests.csproj",
        r"src\Mvc\build.cmd",
        r"src\Mvc\README.md",
        r"docs\BuildFromSource.md",
        r"docs\BuildErrors.md",
        r"docs\CrossCuttingGuidance.md",
        r"CONTRIBUTING.md",
        r".editorconfig",
    ]
    for role in ("original", "observedDefault"):
        if not available.get(role):
            continue
        for path in initial:
            snapshot(revisions[role], role, path)
        revision = revisions[role]
        git("tagcloud-occurrences-" + role, "grep", "-n", "-i", "-E",
            "TagCloud|tag-cloud|GetTagsAsync", revision, "--", "src/Mvc")
        git("tagcloud-history-" + role, "log", "--follow", "--format=fuller", "--stat", revision, "--",
            "src/Mvc/test/WebSites/TagHelpersWebSite/TagHelpers/TagCloudViewComponentTagHelper.cs")
        git("tagcloud-blame-" + role, "blame", "-l", revision, "--",
            "src/Mvc/test/WebSites/TagHelpersWebSite/TagHelpers/TagCloudViewComponentTagHelper.cs")
    if available["reserved"]:
        snapshot(revisions["reserved"], "reserved", initial[0])
    guidance_paths = [
        r"src\Mvc\AGENTS.md",
        r".github\instructions\cross-cutting-guidance.instructions.md",
        r".github\instructions\build.instructions.md",
    ]
    guidance = []
    for path in guidance_paths:
        raw = (ROOT / path).read_bytes()
        target = SOURCES / "reserved-working-guidance" / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        guidance.append({"path": path, "artifact": str(target.relative_to(OUT)),
                         "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
                         "authority": "working-tree guidance, not Default source evidence"})
    write_json(OUT / "membership_01.json", MEMBERSHIP)
    write_json(OUT / "guidance_01.json", guidance)
    write_json(OUT / "source_collection_01.json", {
        "startedUtc": started,
        "endedUtc": utc(),
        "collectorPid": os.getpid(),
        "parentPid": os.getppid(),
        "revisions": revisions,
        "localObjectAvailability": available,
        "commands": LOG,
        "nativeCommandsStarted": 0,
    })


if __name__ == "__main__":
    main()
