"""Read-only, standard-library-only F138 capsule auditor; never loads target code."""
import collections
import hashlib
import json
import pathlib
import struct
import sys
import uuid
import xml.etree.ElementTree as ET


def digest(path, algorithm="sha256"):
    value = hashlib.new(algorithm)
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest().upper()


def streams(data, base=0):
    if data[base:base + 4] != b"BSJB":
        raise ValueError("Not a CLI metadata root")
    length = struct.unpack_from("<I", data, base + 12)[0]
    cursor = (base + 16 + length + 3) & ~3
    count = struct.unpack_from("<H", data, cursor + 2)[0]
    cursor += 4
    result = {}
    for _ in range(count):
        offset, size = struct.unpack_from("<II", data, cursor)
        end = data.index(0, cursor + 8)
        name = data[cursor + 8:end].decode("ascii")
        result[name] = data[base + offset:base + offset + size]
        cursor = (end + 4) & ~3
    return result


def table_header(data):
    heap_sizes = data[6]
    valid = struct.unpack_from("<Q", data, 8)[0]
    cursor = 24
    rows = {}
    for number in range(64):
        if valid & (1 << number):
            rows[number] = struct.unpack_from("<I", data, cursor)[0]
            cursor += 4
    return heap_sizes, rows, cursor


def compressed(data, cursor):
    first = data[cursor]
    if first < 0x80:
        return first, cursor + 1
    if first < 0xC0:
        return ((first & 0x3F) << 8) | data[cursor + 1], cursor + 2
    if first < 0xE0:
        return ((first & 0x1F) << 24) | int.from_bytes(data[cursor + 1:cursor + 4], "big"), cursor + 4
    raise ValueError("Invalid compressed unsigned integer")


def blob(heap, index):
    length, cursor = compressed(heap, index)
    return heap[cursor:cursor + length]


def guid(heap, index):
    if not index:
        return str(uuid.UUID(int=0))
    return str(uuid.UUID(bytes_le=heap[(index - 1) * 16:index * 16]))


def pdb_metadata(path):
    stream = streams(path.read_bytes())
    identifier = stream["#Pdb"][:20]
    pdb_id = (str(uuid.UUID(bytes_le=identifier[:16])), int.from_bytes(identifier[16:20], "little"))
    tables = stream.get("#~", stream.get("#-"))
    heaps, rows, cursor = table_header(tables)
    if any(number < 48 and count for number, count in rows.items()):
        raise ValueError("Unexpected pre-Document portable-PDB tables")
    blob_size = 4 if heaps & 4 else 2
    guid_size = 4 if heaps & 2 else 2
    result = []
    for _ in range(rows.get(48, 0)):
        values = []
        for size in (blob_size, guid_size, blob_size, guid_size):
            values.append(int.from_bytes(tables[cursor:cursor + size], "little"))
            cursor += size
        name_data = blob(stream["#Blob"], values[0])
        separator = chr(name_data[0])
        parts = []
        position = 1
        while position < len(name_data):
            index, position = compressed(name_data, position)
            parts.append(blob(stream["#Blob"], index).decode("utf-8"))
        result.append({
            "name": separator.join(parts),
            "algorithm": guid(stream["#GUID"], values[1]),
            "checksum": blob(stream["#Blob"], values[2]).hex().upper(),
        })
    return pdb_id, result


def pe_metadata(path):
    data = path.read_bytes()
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    if data[pe:pe + 4] != b"PE\0\0":
        raise ValueError("Not a PE image")
    section_count = struct.unpack_from("<H", data, pe + 6)[0]
    optional_size = struct.unpack_from("<H", data, pe + 20)[0]
    optional = pe + 24
    magic = struct.unpack_from("<H", data, optional)[0]
    directory = optional + (112 if magic == 0x20B else 96)
    sections = optional + optional_size

    def offset(rva):
        for index in range(section_count):
            start = sections + index * 40
            virtual_size, virtual_address, raw_size, raw_pointer = struct.unpack_from("<IIII", data, start + 8)
            if virtual_address <= rva < virtual_address + max(virtual_size, raw_size):
                return raw_pointer + rva - virtual_address
        raise ValueError(f"Unmapped RVA {rva}")

    debug_rva, debug_size = struct.unpack_from("<II", data, directory + 6 * 8)
    codeviews = []
    if debug_rva:
        debug = offset(debug_rva)
        for position in range(debug, debug + debug_size, 28):
            _, stamp, _, _, kind, size, _, pointer = struct.unpack_from("<IIHHIIII", data, position)
            if kind == 2 and data[pointer:pointer + 4] == b"RSDS":
                codeviews.append({
                    "guid": str(uuid.UUID(bytes_le=data[pointer + 4:pointer + 20])),
                    "stamp": stamp,
                    "age": int.from_bytes(data[pointer + 20:pointer + 24], "little"),
                    "path": data[pointer + 24:pointer + size].split(b"\0", 1)[0].decode("utf-8"),
                })
    cli_rva, _ = struct.unpack_from("<II", data, directory + 14 * 8)
    mvid = None
    if cli_rva:
        cli = offset(cli_rva)
        metadata_rva = struct.unpack_from("<I", data, cli + 8)[0]
        metadata = streams(data, offset(metadata_rva))
        tables = metadata.get("#~", metadata.get("#-"))
        heaps, rows, cursor = table_header(tables)
        if rows.get(0) != 1:
            raise ValueError("Expected one CLI Module row")
        string_size = 4 if heaps & 1 else 2
        guid_size = 4 if heaps & 2 else 2
        index_start = cursor + 2 + string_size
        index = int.from_bytes(tables[index_start:index_start + guid_size], "little")
        mvid = guid(metadata["#GUID"], index)
    return mvid, codeviews


def normalized(value):
    return value.replace("\\", "/").casefold()


def main(root):
    manifest_path = root / "MANIFEST.json"
    expected_manifest = (root / "MANIFEST.sha256").read_text().split()[0].upper()
    assert digest(manifest_path) == expected_manifest, "Manifest checksum"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    declared = {entry["path"] for entry in manifest["files"]}
    actual = {path.relative_to(root).as_posix() for path in root.rglob("*")
              if path.is_file() and path.name not in ("MANIFEST.json", "MANIFEST.sha256")}
    assert len(declared) == len(manifest["files"]) and declared == actual, "Manifest completeness"
    for entry in manifest["files"]:
        path = root / entry["path"]
        assert path.stat().st_size == entry["bytes"], entry["path"]
        assert digest(path) == entry["sha256"].upper(), entry["path"]
    facts = json.loads((root / "facts.json").read_text(encoding="utf-8-sig"))
    assert facts["officialState"] == "PENDING" and not facts["sourceRewriteApplied"]
    assert not facts["candidateAdopted"] and not facts["performanceMeasurements"]
    sources = json.loads((root / "source-catalog.json").read_text(encoding="utf-8-sig"))
    for source in sources:
        raw = (root / source["snapshot"]).read_bytes()
        lf = raw.replace(b"\r\n", b"\n")
        git_blob = hashlib.sha1(b"blob " + str(len(lf)).encode("ascii") + b"\0" + lf).hexdigest()
        assert hashlib.sha256(raw).hexdigest().upper() == source["rawSha256"], source["relativePath"]
        assert hashlib.sha256(lf).hexdigest().upper() == source["gitLfSha256"], source["relativePath"]
        assert git_blob == source["gitBlobSha1"] == source["normalizedWorkingBytesGitBlobSha1"], source["relativePath"]
    common = facts["commonConsumer"]
    for entry in common["files"]:
        name = pathlib.PureWindowsPath(entry["path"]).name
        assert digest(root / "consumer" / "built" / name) == entry["sha256"], name
    common_mvid, common_codeviews = pe_metadata(root / "consumer" / "built" / "F138.Characterization.dll")
    common_pdb_id, common_documents = pdb_metadata(root / "consumer" / "built" / "F138.Characterization.pdb")
    assert any((entry["guid"], entry["stamp"]) == common_pdb_id for entry in common_codeviews)
    assert all(entry["mvid"] == common_mvid and entry["sha256"] == common["files"][0]["sha256"]
               for entry in common["loadedRoleIdentities"])
    common_document_map = {normalized(document["name"]): document for document in common_documents}
    for source in common["rawSourceDocuments"]:
        document = common_document_map[normalized(source["originalPath"])]
        assert document["algorithm"] == "8829d00f-11b8-4213-878b-770e8597ac16"
        assert digest(root / source["snapshot"]) == document["checksum"], source["snapshot"]
    assert len(common["rawSourceDocuments"]) == len(common_documents) == 4
    associations = []
    for proof in facts["ownerProofs"]:
        image = root / proof["image"]
        pdb = root / proof["pdb"]
        mvid, codeviews = pe_metadata(image)
        pdb_id, documents = pdb_metadata(pdb)
        assert mvid == proof["mvid"], (image, "MVID")
        assert any((entry["guid"], entry["stamp"]) == pdb_id for entry in codeviews), (image, "CodeView/PDB")
        assert digest(image) == proof["sha256"], (image, "loaded image SHA")
        loaded = json.loads((root / "results" / f"{proof['role']}-producer" / "loaded-assemblies.json").read_text())
        actual_owner = next(entry for entry in loaded if entry["name"] == "Microsoft.AspNetCore.OpenApi")
        assert actual_owner["mvid"] == mvid and actual_owner["sha256"] == proof["sha256"]
        assert actual_owner["path"] == proof["actualLoadedPath"]
        document_map = {normalized(document["name"]): document for document in documents}
        matched = []
        for source in sources:
            if source["role"] != proof["role"]:
                continue
            document = document_map.get(normalized(source["originalPath"]))
            if document is None:
                continue
            algorithm = {
                "8829d00f-11b8-4213-878b-770e8597ac16": "sha256",
                "ff1816ec-aa5e-4d10-87f7-6f4963833460": "sha1",
            }[document["algorithm"]]
            assert digest(root / source["snapshot"], algorithm) == document["checksum"], source["snapshot"]
            matched.append(source["relativePath"])
        assert any(path.endswith("ApiDescriptionExtensions.cs") for path in matched), "Missing helper source association"
        assert any(path.endswith("OpenApiDocumentService.cs") for path in matched), "Missing consumer source association"
        associations.append({"role": proof["role"], "mvid": mvid, "codeViewPdbMatch": True, "selectedRawSourcesMatched": matched})
    for role in ("baseline", "default"):
        assertions = json.loads((root / "results" / f"{role}-producer" / "assertions.json").read_text())
        assert len(assertions) == 29 and all(row["pass"] for row in assertions), role
        assert sum(row["name"] == "isolated-public-metadata-multiple-control" for row in assertions) == 1, role
        boundary = json.loads((root / "results" / f"{role}-producer" / "source-role-boundary.json").read_text())
        assert boundary["passes"] and not boundary["nonRoleFrameworkAssemblies"], role
        trx = ET.parse(root / "results" / f"{role}-existing" / f"{role}.trx")
        rows = list(trx.getroot().iter("{http://microsoft.com/schemas/VisualStudio/TeamTest/2010}UnitTestResult"))
        assert len(rows) == 107, (role, len(rows))
        assert sum(row.attrib["outcome"] == "Passed" for row in rows) == 105, role
        assert sum(row.attrib["outcome"] == "NotExecuted" for row in rows) == 2, role
    comparison = json.loads((root / "image-comparison.json").read_text())
    first = json.loads((root / "results" / "baseline-execution-images.json").read_text())
    second = json.loads((root / "results" / "default-execution-images.json").read_text())
    by_role = [{entry["key"]: entry["sha256"] for entry in values} for values in (first, second)]
    expected_keys = set(by_role[0]) | set(by_role[1])
    assert expected_keys == {entry["key"] for entry in comparison["entries"]}, "Every-image comparison completeness"
    assert len(comparison["entries"]) == len(expected_keys) and comparison["prefixExclusions"] == []
    for entry in comparison["entries"]:
        assert entry["baselineSha256"] == by_role[0].get(entry["key"]), entry["key"]
        assert entry["defaultSha256"] == by_role[1].get(entry["key"]), entry["key"]
        first_hash, second_hash = entry["baselineSha256"], entry["defaultSha256"]
        status = "only-default" if first_hash is None else "only-baseline" if second_hash is None else "same" if first_hash == second_hash else "different"
        assert entry["status"] == status, entry["key"]
    counts = dict(collections.Counter(entry["status"] for entry in comparison["entries"]))
    assert counts == comparison["counts"] == facts["imageComparisonCounts"]
    differences = [entry["key"] for entry in comparison["entries"] if entry["status"] != "same" and not entry["targetOwnerImage"]]
    assert differences == comparison["nonOwnerDifferences"]
    assert len(differences) == facts["nonOwnerImageDifferenceCount"]
    terminal = json.loads((root / "terminal-state.json").read_text(encoding="utf-8-sig"))
    assert terminal["allFinalReceiptsTerminal"] and not terminal["unmatchedPreparationStarts"]
    assert not terminal["activeOwnedNativeProcesses"] and not terminal["activeOwnedDirectChildren"]
    print(json.dumps({
        "pass": True,
        "capsuleFilesChecked": len(manifest["files"]),
        "ownerMetadataAssociations": associations,
        "existingTestsPerRole": {"passed": 105, "preExistingSkipped": 2},
        "characterizationAssertionsPerRole": 29,
        "ofWhichIsolatedPublicMetadataGuardControl": 1,
        "commonConsumerMetadataAndFourRawDocumentsMatched": True,
        "selectedGitLfAndRawSourceRowsChecked": len(sources),
        "everyImageEntriesCompared": len(expected_keys),
        "boundary": "Read-only metadata, hashes, recorded rows and selected raw sources. No target execution, timing, performance verdict, complete compiler attestation, or complete repository materialization audit."
    }, indent=2))


if __name__ == "__main__":
    main(pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).parent).resolve())
