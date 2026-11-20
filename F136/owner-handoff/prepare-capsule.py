"""Gather bounded F136 proof without executing product code or changing either graph."""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
WORK = Path(__file__).resolve().parent
sys.path.insert(0, str(WORK))
import audit

SCOPE = WORK.parent
CAPSULE = SCOPE / "capsule"
ROLES = ("Original37", "Default")
GIT_PROCESSES = []
SOURCE_PATHS = [
    r"src\Components\Endpoints\test\Builder\TestFileProvider\TestFileProvider.cs",
    r"src\Components\Endpoints\test\Builder\TestFileProvider\TestFileChangeToken.cs",
    r"src\Components\Endpoints\test\Builder\TestFileProvider\TestFileInfo.cs",
    r"src\Components\Endpoints\test\Builder\TestFileProvider\TestDirectoryContent.cs",
    r"src\Components\Endpoints\test\Builder\RazorComponentsEndpointConventionBuilderExtensionsTest.cs",
    r"src\Components\Endpoints\test\HotReloadServiceTests.cs",
    r"src\Components\Endpoints\test\RazorComponentEndpointDataSourceTest.cs",
    r"src\Components\Endpoints\test\Microsoft.AspNetCore.Components.Endpoints.Tests.csproj",
    r"src\Components\Endpoints\test\TestApplication.staticwebassets.endpoints.json",
    r"src\Components\Endpoints\test\TestManifests\Test.staticwebassets.endpoints.json",
    r"src\Components\Endpoints\src\Microsoft.AspNetCore.Components.Endpoints.csproj",
    r"src\Components\Endpoints\src\Builder\RazorComponentsEndpointConventionBuilderExtensions.cs",
    r"src\Components\Endpoints\src\Builder\RazorComponentsEndpointRouteBuilderExtensions.cs",
    r"src\Components\Endpoints\src\Builder\RazorComponentEndpointDataSource.cs",
    r"src\Components\Endpoints\src\Builder\RazorComponentEndpointDataSourceFactory.cs",
    r"src\Components\Endpoints\src\DependencyInjection\DefaultRazorComponentsServiceOptionsConfiguration.cs",
    r"src\Shared\Components\ResourceCollectionResolver.cs",
    r"src\StaticAssets\src\StaticAssetsEndpointRouteBuilderExtensions.cs",
    r"src\StaticAssets\src\StaticAssetEndpointFactory.cs",
    r"src\Components\AGENTS.md",
    r"src\Components\Directory.Build.props",
    r"src\Components\Directory.Build.targets",
    r"Directory.Build.props",
    r"Directory.Build.targets",
    r"global.json",
    r"eng\Versions.props",
    r"eng\tools\GenerateFiles\GenerateFiles.csproj",
    r"eng\tools\GenerateFiles\Directory.Build.props.in",
    r"eng\tools\GenerateFiles\Directory.Build.targets.in",
    r"docs\BuildFromSource.md",
    r"docs\BuildErrors.md",
]


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def copy(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)


def git(graph, *arguments):
    process = subprocess.Popen(["git", "-C", str(graph), "--no-pager", *arguments],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    GIT_PROCESSES.append({"pid": process.pid, "graph": str(graph), "arguments": list(arguments),
                          "exitCode": process.returncode, "terminal": True,
                          "stderr": stderr.decode("utf-8", errors="replace")})
    if process.returncode:
        raise RuntimeError(f"Git failed: {arguments}: {stderr!r}")
    return stdout


def git_blob(data):
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def inventory(root, destination, excluded=()):
    rows = []
    reparse = []
    for current, directories, filenames in os.walk(root, followlinks=False):
        relative = Path(current).relative_to(root)
        retained = []
        for name in sorted(directories):
            path = Path(current) / name
            rel = str(relative / name).replace("\\", "/")
            if name in excluded or path.is_symlink() or os.path.isjunction(path):
                reparse.append({"path": rel, "target": os.readlink(path) if path.is_symlink() or os.path.isjunction(path) else None,
                                "reason": "explicit exclusion" if name in excluded else "reparse point not followed"})
            else:
                retained.append(name)
        directories[:] = retained
        for name in sorted(filenames):
            path = Path(current) / name
            rows.append({"path": str(path.relative_to(root)).replace("\\", "/"),
                         "bytes": path.stat().st_size, "sha256": audit.sha256(path)})
    rows.sort(key=lambda row: row["path"])
    result = {"root": str(root), "scope": "all ordinary files recursively, excluding listed directories/reparse targets",
              "excludedOrReparsePoints": reparse, "files": rows}
    write(destination, result)
    print(f"INVENTORY {destination.name}: {len(rows)} files", flush=True)
    return {row["path"]: row["sha256"] for row in rows}


def main():
    if CAPSULE.exists():
        raise RuntimeError("Capsule already exists; preserve it rather than overwriting.")
    CAPSULE.mkdir()
    for name in ("audit.py", "run-native.ps1", "acceptance.json", "test-results.json", "common-deployment.json", "prepare-capsule.py"):
        copy(WORK / name, CAPSULE / name)
    for folder in ("logs", "results", "evidence", "failures"):
        for path in (WORK / folder).rglob("*"):
            if path.is_file():
                copy(path, CAPSULE / path.relative_to(WORK))
    for name in ("Program.cs", "F136Verify.csproj"):
        copy(WORK / "verify" / name, CAPSULE / "verify" / name)
    commands = [audit.load(path) for path in sorted((WORK / "logs").glob("*.process.json"))]
    assert len(commands) == 16 and all(item["terminal"] and item["exitCode"] is not None for item in commands)
    write(CAPSULE / "commands.json", commands)
    lines = ["# Exact native validation commands and results", "",
             "Every command was run after activating its own checkout. Environment and absolute working directories are in `commands.json` and the immutable per-command records.",
             "The native VSTest runner uses the repository SDK's runner DLL and each role's explicit exact runtime; it does not restore/build tests.",
             "Build/test wall-clock fields remain only in untouched raw logs/TRX and are not performance evidence.", "",
             "| Role / command | Native PID | Exit | Exact command |",
             "| --- | ---: | ---: | --- |"]
    for record in commands:
        tokens = [record["executable"], *record["arguments"]]
        command = "& " + " ".join("'" + token.replace("'", "''") + "'" for token in tokens)
        lines.append(f"| {record['role']} / {record['name']} | {record['pid']} | {record['exitCode']} | `{command.replace('|', '&#124;')}` |")
    (CAPSULE / "commands.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    sources = []
    source_owners = []
    identities = []
    package_prerequisites = []
    for role in ROLES:
        graph = SCOPE / "graphs" / role
        revision = git(graph, "rev-parse", "HEAD").decode().strip()
        tree = git(graph, "ls-tree", "-r", "-z", "HEAD", "--", *[name.replace("\\", "/") for name in SOURCE_PATHS])
        blobs = {}
        for item in tree.split(b"\0"):
            if item:
                metadata, path = item.split(b"\t", 1)
                blobs[path.decode("utf-8")] = metadata.split()[2].decode("ascii")
        status = git(graph, "status", "--porcelain", "--untracked-files=no", "--ignore-submodules=untracked").decode()
        submodule = graph / "src" / "submodules" / "MessagePack-CSharp"
        subrevision = git(submodule, "rev-parse", "HEAD").decode().strip()
        substatus = git(submodule, "-c", "core.longpaths=true", "status", "--porcelain", "--untracked-files=no").decode()
        identities.append({"role": role, "root": str(graph), "revision": revision, "trackedStatus": status,
                           "submoduleRevision": subrevision, "submoduleTrackedStatus": substatus,
                           "gitAlternates": (graph / ".git" / "objects" / "info" / "alternates").read_text().strip(),
                           "materialization": "private local shared-object clone, core.autocrlf=false, core.longpaths=true; selected raw/LF identities recorded separately"})
        for relative in SOURCE_PATHS:
            path = graph / relative
            if not path.is_file():
                sources.append({"role": role, "relative": relative, "absent": True})
                continue
            copy(path, CAPSULE / "source" / role / relative)
            raw = path.read_bytes()
            lf = raw.replace(b"\r\n", b"\n")
            blob = blobs.get(relative.replace("\\", "/"))
            sources.append({"role": role, "relative": relative, "rawSha256": hashlib.sha256(raw).hexdigest(),
                            "lfNormalizedSha256": hashlib.sha256(lf).hexdigest(), "rawGitObjectSha1": git_blob(raw),
                            "lfNormalizedGitObjectSha1": git_blob(lf), "repositoryBlobId": blob,
                            "rawMatchesRepositoryBlob": git_blob(raw) == blob,
                            "lfNormalizedMatchesRepositoryBlob": git_blob(lf) == blob})
        generated = [
            r"artifacts\bin\GenerateFiles\Directory.Build.props",
            r"artifacts\bin\GenerateFiles\Directory.Build.targets",
        ]
        for project in ("GenerateFiles", "Microsoft.AspNetCore.Components.Endpoints.Tests"):
            for name in ("project.assets.json", f"{project}.csproj.nuget.dgspec.json",
                         f"{project}.csproj.nuget.g.props", f"{project}.csproj.nuget.g.targets"):
                generated.append(fr"artifacts\obj\{project}\{name}")
        for relative in generated:
            path = graph / relative
            if path.is_file():
                copy(path, CAPSULE / "generated" / role / relative)
        for project in ("GenerateFiles", "Microsoft.AspNetCore.Components.Endpoints.Tests"):
            assets_path = graph / "artifacts" / "obj" / project / "project.assets.json"
            assets = audit.load(assets_path)
            for identity, library in assets["libraries"].items():
                if library["type"] == "package":
                    package_prerequisites.append({"role": role, "assetsProject": project, "identity": identity,
                                                  "archiveSha512FromAssets": library.get("sha512"),
                                                  "packagePath": library.get("path"),
                                                  "packageFolders": list(assets.get("packageFolders", {})),
                                                  "scope": "NuGet archive identity from own restore assets; global package tree not rehashed"})
        image = SCOPE / "images" / role
        report = audit.load(WORK / "evidence" / f"{role}-verify.json")
        for record in report["selectedMetadata"]:
            assembly = Path(record["path"])
            copy(assembly, CAPSULE / "proof" / role / assembly.name)
            copy(assembly.with_suffix(".pdb"), CAPSULE / "proof" / role / assembly.with_suffix(".pdb").name)
        for stem in ("F136Verify", "Microsoft.AspNetCore.Components.Endpoints.Tests"):
            for extension in (".deps.json", ".runtimeconfig.json"):
                copy(image / (stem + extension), CAPSULE / "proof" / role / (stem + extension))
        for project in sorted((graph / "artifacts" / "bin").iterdir()):
            output = project / "Release" / "net12.0" / (project.name + ".dll")
            deployed = image / (project.name + ".dll")
            if output.is_file() and deployed.is_file():
                source_owners.append({"role": role, "projectOutput": str(output), "imageFile": str(deployed),
                                      "sha256": audit.sha256(output), "imageSha256": audit.sha256(deployed),
                                      "sameAsOwnGraph": audit.sha256(output) == audit.sha256(deployed),
                                      "mvid": audit.pe_metadata(output)["mvid"]})
    assert all(item["sameAsOwnGraph"] for item in source_owners)
    write(CAPSULE / "source-identities.json", sources)
    write(CAPSULE / "graph-identities.json", identities)
    write(CAPSULE / "source-built-owners.json", source_owners)
    write(CAPSULE / "nuget-prerequisites.json", package_prerequisites)
    write(CAPSULE / "metadata-native-processes.json", GIT_PROCESSES)
    common_pdb = SCOPE / "images" / "Original37" / "F136Verify.pdb"
    common_documents = audit.pdb_metadata(common_pdb)["documents"]
    common_doc = next(item for item in common_documents if item["name"].replace("/", "\\").endswith(r"\handoff\verify\Program.cs"))
    raw_common = (WORK / "verify" / "Program.cs").read_bytes()
    assert hashlib.sha256(raw_common).hexdigest() == common_doc["documentChecksum"]
    write(CAPSULE / "common-source-association.json", {
        "pdb": "proof/Original37/F136Verify.pdb", "source": "verify/Program.cs", "document": common_doc,
        "rawSha256": hashlib.sha256(raw_common).hexdigest(), "rawDocumentMatches": True,
        "scope": "one actual common Program.cs document; not a claim about all compiler inputs"})
    inv = CAPSULE / "inventories"
    images = {}
    for role in ROLES:
        images[role] = inventory(SCOPE / "images" / role, inv / f"image-{role}.json")
    rows = [{"path": name, "Original37": images["Original37"].get(name), "Default": images["Default"].get(name)}
            for name in sorted(images["Original37"].keys() | images["Default"].keys())]
    write(CAPSULE / "image-comparison.json", {
        "exemptions": [], "futureCausalPair": False,
        "reason": "independent original/default source graphs, dependencies and exact runtimes differ; this is not a future causal performance pair",
        "everyImageFileCompared": True, "files": rows,
        "equalFiles": sum(item["Original37"] is not None and item["Original37"] == item["Default"] for item in rows),
        "differentOrMissingFiles": sum(item["Original37"] != item["Default"] for item in rows)})
    for role in ROLES:
        inventory(SCOPE / "graphs" / role, inv / f"graph-{role}.json", excluded=(".dotnet",))
        inventory(SCOPE / "packages" / role, inv / f"private-packages-{role}.json")
    inventory(WORK / "verify" / "bin", inv / "omitted-common-bin.json")
    inventory(WORK / "verify" / "obj", inv / "omitted-common-obj.json")
    inventory(SCOPE / "tools", inv / "private-python-tools.json")
    runtimes = {
        "Original37": Path(r"C:\src\aspnetcore\.dotnet\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26562.105"),
        "Default": Path(r"C:\Users\jaslawin\.copilot\session-state\a24edcfd-1bb9-4160-afce-6ba54b1b7f00\files\autoperf-parallelism\finding-F145-005\runtime-default\shared\Microsoft.NETCore.App\12.0.0-alpha.1.26568.110"),
    }
    for role, runtime in runtimes.items():
        inventory(runtime, inv / f"external-runtime-{role}.json")
    inventory(Path(r"C:\src\aspnetcore\.dotnet\sdk\12.0.100-alpha.1.26557.102"), inv / "external-sdk.json")
    testhosts = []
    for role in ROLES:
        log = (WORK / "logs" / f"{role}-vstest.log").read_text(encoding="utf-8-sig")
        for pid, code in re.findall(r"Testhost processId: (\d+) exited with exitcode: (\d+)", log):
            testhosts.append({"role": role, "pid": int(pid), "exitCode": int(code), "terminal": True,
                              "source": f"logs/{role}-vstest.log"})
    assert len(testhosts) == 2 and all(item["exitCode"] == 0 for item in testhosts)
    write(CAPSULE / "native-testhost-terminal.json", testhosts)
    print(json.dumps({"capsule": str(CAPSULE), "commands": len(commands), "selectedSources": len(sources),
                      "sourceBuiltOwnerRows": len(source_owners), "imageFiles": len(rows),
                      "differentImageFiles": sum(row["Original37"] != row["Default"] for row in rows)}, indent=2), flush=True)


if __name__ == "__main__":
    main()
