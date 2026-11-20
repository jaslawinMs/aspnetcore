"""Seal the already prepared facts; never build or execute the target assemblies."""
import hashlib
import json
import pathlib
import shutil

scope = pathlib.Path(__file__).resolve().parent
root = scope / "handoff"
if (root / "MANIFEST.json").exists():
    raise RuntimeError("Refusing to modify an existing seal")

receipts = []
for path in sorted((scope / "logs").glob("*.json")):
    if path.name.endswith(".started.json"):
        continue
    receipt = json.loads(path.read_text(encoding="utf-8-sig"))
    if "executable" not in receipt:
        continue
    assert receipt["terminal"], path
    receipts.append(receipt)
for path in (scope / "logs").iterdir():
    if path.is_file() and not path.name.endswith(".started.json") and (path.suffix == ".json" or path.stat().st_size):
        shutil.copyfile(path, root / "logs" / path.name)
(root / "native-command-receipts.json").write_text(json.dumps(receipts, indent=2) + "\n", encoding="utf-8")
lines = [
    "# Exact commands and results", "",
    "Actual native argument arrays are JSON, not shell reconstructions. Each linked receipt contains cwd, selected environment, PID, exit, and terminal state; unchanged streams are beside it. Omitted empty streams contain zero bytes.", "",
    "| ID | Exit | PID | Executable | Actual arguments |",
    "|---|---:|---:|---|---|",
]
for receipt in receipts:
    arguments = json.dumps(receipt["arguments"], ensure_ascii=False).replace("|", "&#124;")
    lines.append(f"| [{receipt['id']}](logs/{receipt['id']}.json) | {receipt['exitCode']} | {receipt['pid']} | `{receipt['executable']}` | `{arguments}` |")
lines.extend([
    "", "Sealing (`054-seal-facts`) and portable self-audit (`055-portable-sealed-audit`) receipts/logs are deliberately retained in the private scope's adjacent logs directory, outside the immutable seal, to avoid circular manifests.",
])
(root / "COMMANDS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

entries = []
for path in sorted(root.rglob("*")):
    if path.is_file():
        data = path.read_bytes()
        entries.append({"path": path.relative_to(root).as_posix(), "bytes": len(data),
                        "sha256": hashlib.sha256(data).hexdigest().upper()})
assert len(entries) + 2 <= 250, len(entries) + 2
manifest = {"finding": "F138", "officialState": "PENDING", "files": entries}
data = (json.dumps(manifest, indent=2) + "\n").encode("utf-8")
(root / "MANIFEST.json").write_bytes(data)
checksum = hashlib.sha256(data).hexdigest().upper()
(root / "MANIFEST.sha256").write_text(f"{checksum}  MANIFEST.json\n", encoding="ascii")
print(json.dumps({"sealed": True, "filesIncludingManifestAndChecksum": len(entries) + 2,
                  "manifestSha256": checksum, "nativePreparationAndStagingCommands": len(receipts),
                  "officialState": "PENDING"}, indent=2))
