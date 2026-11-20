"""Standard-library readers. No native execution, reflection, or process launches."""
import hashlib
import struct
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_record(path):
    path = Path(path)
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": digest(data)}


def u16(data, offset):
    return struct.unpack_from("<H", data, offset)[0]


def u32(data, offset):
    return struct.unpack_from("<I", data, offset)[0]


def compressed(data, offset):
    first = data[offset]
    if first & 0x80 == 0:
        return first, offset + 1
    if first & 0xC0 == 0x80:
        return ((first & 0x3F) << 8) | data[offset + 1], offset + 2
    if first & 0xE0 == 0xC0:
        return ((first & 0x1F) << 24) | int.from_bytes(data[offset + 1:offset + 4], "big"), offset + 4
    raise ValueError("Invalid compressed metadata integer")


def streams(data, offset=0):
    if data[offset:offset + 4] != b"BSJB":
        raise ValueError("Not CLI metadata")
    cursor = offset + 16 + u32(data, offset + 12)
    cursor = (cursor + 3) & ~3
    count = u16(data, cursor + 2)
    cursor += 4
    result = {}
    for _ in range(count):
        relative, length = struct.unpack_from("<II", data, cursor)
        end = data.index(0, cursor + 8)
        name = data[cursor + 8:end].decode("ascii")
        result[name] = data[offset + relative:offset + relative + length]
        cursor = (end + 4) & ~3
    return result


def table_info(s):
    data = s.get("#~", s.get("#-"))
    valid = struct.unpack_from("<Q", data, 8)[0]
    cursor = 24
    rows = {}
    for table in range(64):
        if valid >> table & 1:
            rows[table] = u32(data, cursor)
            cursor += 4
    return data, data[6], rows, cursor


def guid(s, index):
    if not index:
        return None
    return str(uuid.UUID(bytes_le=s["#GUID"][(index - 1) * 16:index * 16]))


def blob(s, index):
    heap = s["#Blob"]
    length, cursor = compressed(heap, index)
    return heap[cursor:cursor + length]


def heap_index(data, cursor, wide):
    size = 4 if wide else 2
    return int.from_bytes(data[cursor:cursor + size], "little"), cursor + size


def pe(path):
    data = Path(path).read_bytes()
    header = u32(data, 0x3C)
    if data[header:header + 4] != b"PE\0\0":
        raise ValueError("Not PE")
    count = u16(data, header + 6)
    opt_size = u16(data, header + 20)
    opt = header + 24
    directories = opt + (112 if u16(data, opt) == 0x20B else 96)
    sections = []
    for i in range(count):
        cursor = opt + opt_size + 40 * i
        virtual_size, virtual_address, raw_size, raw_offset = struct.unpack_from("<IIII", data, cursor + 8)
        sections.append((virtual_address, max(virtual_size, raw_size), raw_offset))

    def rva(value):
        for start, size, offset in sections:
            if start <= value < start + size:
                return offset + value - start
        raise ValueError(f"Unmapped RVA {value}")

    clr = rva(u32(data, directories + 14 * 8))
    metadata = streams(data, rva(u32(data, clr + 8)))
    tables, heaps, rows, cursor = table_info(metadata)
    if rows.get(0) != 1:
        raise ValueError("Expected one module row")
    cursor += 2
    _, cursor = heap_index(tables, cursor, heaps & 1)
    mvid_index, cursor = heap_index(tables, cursor, heaps & 2)
    result = {**file_record(path), "mvid": guid(metadata, mvid_index), "codeView": []}
    debug_rva, debug_size = struct.unpack_from("<II", data, directories + 6 * 8)
    if debug_rva:
        debug = rva(debug_rva)
        for i in range(debug_size // 28):
            entry = debug + 28 * i
            stamp = u32(data, entry + 4)
            kind, size, _, offset = struct.unpack_from("<IIII", data, entry + 12)
            if kind == 2 and data[offset:offset + 4] == b"RSDS":
                result["codeView"].append({
                    "guid": str(uuid.UUID(bytes_le=data[offset + 4:offset + 20])),
                    "stamp": stamp, "age": u32(data, offset + 20),
                    "pdbPath": data[offset + 24:offset + size].split(b"\0", 1)[0].decode("utf-8")
                })
    return result


def portable_pdb(path):
    data = Path(path).read_bytes()
    s = streams(data)
    identifier = s["#Pdb"][:20]
    tables, heaps, rows, cursor = table_info(s)
    if any(table < 48 and count for table, count in rows.items()):
        raise ValueError("Unexpected pre-Document table in standalone portable PDB")
    documents = []
    for row in range(rows.get(48, 0)):
        name_index, cursor = heap_index(tables, cursor, heaps & 4)
        algorithm_index, cursor = heap_index(tables, cursor, heaps & 2)
        hash_index, cursor = heap_index(tables, cursor, heaps & 4)
        language_index, cursor = heap_index(tables, cursor, heaps & 2)
        name = blob(s, name_index)
        separator = chr(name[0])
        parts = []
        index = 1
        while index < len(name):
            part, index = compressed(name, index)
            parts.append(blob(s, part).decode("utf-8"))
        documents.append({
            "row": row + 1, "name": separator.join(parts),
            "algorithm": guid(s, algorithm_index),
            "checksum": blob(s, hash_index).hex(),
            "language": guid(s, language_index)
        })
    return {
        **file_record(path),
        "idGuid": str(uuid.UUID(bytes_le=identifier[:16])),
        "idStamp": u32(identifier, 16),
        "documents": documents
    }


def source(path):
    raw = Path(path).read_bytes()
    lf = raw.replace(b"\r\n", b"\n")
    git_blob = hashlib.sha1(b"blob " + str(len(lf)).encode("ascii") + b"\0" + lf).hexdigest()
    return {
        **file_record(path), "crlfPairs": raw.count(b"\r\n"),
        "lfBytes": len(lf), "lfSha256": digest(lf), "gitLfBlobSha1": git_blob
    }


def trx(path):
    root = ET.parse(path).getroot()
    ns = {"t": "http://microsoft.com/schemas/VisualStudio/TeamTest/2010"}
    counters = root.find("t:ResultSummary/t:Counters", ns)
    return {
        "run": dict(root.attrib),
        "counters": None if counters is None else dict(counters.attrib),
        "results": [dict(row.attrib) for row in root.findall(".//t:UnitTestResult", ns)],
        "definitions": [
            {"attributes": dict(row.attrib),
             "execution": dict(row.find("t:Execution", ns).attrib),
             "method": dict(row.find("t:TestMethod", ns).attrib)}
            for row in root.findall(".//t:UnitTest", ns)
        ],
        "entries": [dict(row.attrib) for row in root.findall(".//t:TestEntry", ns)]
    }


def differences(original, default):
    result = []
    for scope in sorted(set(original) | set(default)):
        left, right = original.get(scope, {}), default.get(scope, {})
        for key in sorted(set(left) | set(right)):
            if left.get(key) != right.get(key):
                result.append({"scope": scope, "key": key, "original37": left.get(key), "default": right.get(key)})
    return result
