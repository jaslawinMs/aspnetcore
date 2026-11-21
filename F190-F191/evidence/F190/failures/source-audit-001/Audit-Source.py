import collections
import hashlib
import json
import pathlib
import re
import sys


ROOT = pathlib.Path.cwd()
assert ROOT == pathlib.Path(__file__).resolve().parent
checks = []


def require(name, condition, evidence):
    checks.append({"name": name, "passed": bool(condition), "evidence": evidence})
    if not condition:
        raise AssertionError(name)


def read(path):
    return pathlib.Path(path).read_text(encoding="utf-8-sig")


def write(path, value):
    pathlib.Path(path).write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


source_bindings = json.loads(read("source-bindings.json"))
linq_bindings = json.loads(read("linq-source-bindings.json"))
for binding in source_bindings + linq_bindings:
    data = pathlib.Path(binding["artifact"]).read_bytes()
    require(
        f"RawSourceHash:{binding['role']}:{binding['repositoryPath']}",
        len(data) == binding["bytes"]
        and hashlib.sha256(data).hexdigest().upper() == binding["sha256"]
        and hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
        == binding["gitBlob"],
        binding["artifact"],
    )

tree_pins = read(r"commands\identical-projecttemplates-tree-pins.stdout").splitlines()
require(
    "OriginalAndActualDefaultProjectTemplatesSubtreesIdentical",
    tree_pins == ["b29d825ba287dc360512f8da8e3e6a06e235c96a"] * 2
    and not pathlib.Path(r"commands\projecttemplates-default-diff.stdout").read_bytes(),
    r"commands\identical-projecttemplates-tree-pins.stdout",
)

base = pathlib.Path(r"sources\original\src\ProjectTemplates")
target = read(base / r"Shared\AspNetProcess.cs")
require(
    "ExactRetainedGuardStillAtLine117",
    target.splitlines()[116].strip() == "if (page.Links?.Count() > 0)",
    r"sources\original\src\ProjectTemplates\Shared\AspNetProcess.cs:117",
)
constants = dict(
    re.findall(r'public const string (\w+) = "([^"]*)";', read(base / r"Shared\PageUrls.cs"))
)
owner_files = [
    r"test\Templates.Mvc.Tests\MvcTemplateTest.cs",
    r"test\Templates.Mvc.Tests\RazorPagesTemplateTest.cs",
]
assignment = re.compile(
    r"\bLinks\s*=\s*(?P<expression>new\s*\[\s*\]\s*\{(?P<array>[^}]*)\}"
    r"|(?P<pipeline>menuLinks[^,\r\n]*))"
)
producer_rows = []
for relative in owner_files:
    text = read(base / relative)
    declared_assignments = list(re.finditer(r"\bLinks\s*=", text))
    parsed_assignments = list(assignment.finditer(text))
    require(
        f"AllLinksAssignmentsParsed:{relative}",
        len(declared_assignments) == len(parsed_assignments),
        relative,
    )
    for match in parsed_assignments:
        prefix = text[: match.start()]
        method = re.findall(
            r"(?:public|private)\s+(?:async\s+)?Task(?:<[^>]+>)?\s+(\w+)\(",
            prefix,
        )[-1]
        url_name = re.findall(r"\bUrl\s*=\s*PageUrls\.(\w+)", prefix)[-1]
        line = text.count("\n", 0, match.start()) + 1
        if match["array"] is not None:
            names = re.findall(r"PageUrls\.(\w+)", match["array"])
            shape = {
                "runtimeTypeFromConstruction": "System.String[]",
                "declaredType": "IEnumerable<string>",
                "deferredElements": False,
                "countPath": "Enumerable.Count -> ICollection<string>.Count; no element traversal",
            }
        else:
            menu_match = list(
                re.finditer(r"\bmenuLinks\s*=\s*new[^{;]*\{([^}]*)\}", prefix)
            )[-1]
            footer_match = list(
                re.finditer(r"\bfooterLinks\s*=\s*new[^{;]*\{([^}]*)\}", prefix)
            )[-1]
            menu_names = re.findall(r"PageUrls\.(\w+)", menu_match[1])
            footer_names = re.findall(r"PageUrls\.(\w+)", footer_match[1])
            require(
                f"RealPipelineInputSizes:{method}:{url_name}",
                len(menu_names) == 3 and len(footer_names) == 1,
                {"menu": menu_match[0], "footer": footer_match[0]},
            )
            appended = ".Append(" in match["pipeline"]
            names = menu_names + (["DocsUrl"] if appended else []) + footer_names
            menu_type = (
                "System.Collections.Generic.List<System.String>"
                if "List<string>" in menu_match[0]
                else "System.String[]"
            )
            shape = {
                "runtimeTypeFromPinnedImplementation": "System.Linq.Enumerable+Concat2Iterator<System.String>",
                "nestedFirstType": (
                    "System.Linq.Enumerable+AppendPrepend1Iterator<System.String>"
                    if appended
                    else menu_type
                ),
                "menuRuntimeTypeFromConstruction": menu_type,
                "menuCount": len(menu_names),
                "footerRuntimeTypeFromConstruction": "System.String[]",
                "footerCount": len(footer_names),
                "deferredElements": True,
                "countPath": (
                    "Count -> Iterator.GetCount(false) -> Concat2Iterator.GetCount -> "
                    "TryGetNonEnumeratedCount(first/second)"
                    + (
                        " -> AppendPrepend1Iterator.GetCount(true) -> menu ICollection<string>.Count + 1"
                        if appended
                        else " -> menu ICollection<string>.Count"
                    )
                    + "; footer ICollection<string>.Count; checked sum; no element traversal"
                ),
            }
        producer_rows.append(
            {
                "repositoryPath": "src\\ProjectTemplates\\" + relative,
                "method": method,
                "line": line,
                "urlConstant": "PageUrls." + url_name,
                "url": constants[url_name],
                "expression": match["expression"],
                "expectedLinksInOrder": ["PageUrls." + name for name in names],
                "resolvedLinksInOrder": [constants[name] for name in names],
                "exactCountFromRealInitializer": len(names),
                "shape": shape,
                "evidenceBoundary": "Pinned in-tree constructor/initializer plus dependency-pinned LINQ source; no executing test host observed",
                "sourceRoles": ["original", "actualDefault"],
            }
        )

arrays = [row for row in producer_rows if not row["shape"]["deferredElements"]]
pipelines = [row for row in producer_rows if row["shape"]["deferredElements"]]
require(
    "ExactRealNonNullProducerInventory",
    len(producer_rows) == 16 and len(arrays) == 12 and len(pipelines) == 4,
    {"nonNullSites": len(producer_rows), "arrays": len(arrays), "pipelines": len(pipelines)},
)
require(
    "ExactRealProducerSizes",
    collections.Counter(row["exactCountFromRealInitializer"] for row in arrays)
    == {4: 1, 5: 1, 6: 4, 7: 4, 10: 2}
    and collections.Counter(row["exactCountFromRealInitializer"] for row in pipelines)
    == {4: 2, 5: 2},
    "These are source initializer sites, not executed test results or a synthetic dataset.",
)

blazor = read(base / r"test\Templates.Mvc.Tests\BlazorTemplateTest.cs")
expected_pages = blazor.split("private static IEnumerable<Page> GetExpectedPages", 1)[1]
expected_pages = expected_pages.split("private static", 1)[0]
null_sites = [
    {
        "pageConstant": name,
        "line": blazor.count("\n", 0, blazor.index("yield return new(" + name + ");")) + 1,
        "links": None,
        "shape": "Page auto-property left unassigned; null, not an empty or deferred IEnumerable<string>",
    }
    for name in re.findall(r"yield return new\(([^)]+)\);", expected_pages)
]
require(
    "BlazorOuterIteratorDoesNotCreateALinksIterator",
    len(null_sites) == 7
    and "Links =" not in expected_pages
    and "public IEnumerable<string> Links { get; set; }" in target,
    "GetExpectedPages yields Pages; each Page.Links is null.",
)

for role in ("original", "default"):
    linq = pathlib.Path("sources") / ("linq-" + role)
    count_text = read(linq / "Count.cs")
    count_method = count_text.split("public static int Count<TSource>", 2)[1]
    require(
        f"CountHasUnconditionalCollectionAndIteratorSpecialization:{role}",
        "source is ICollection<TSource>" in count_method
        and "source is Iterator<TSource>" in count_method
        and "iterator.GetCount(onlyIfCheap: false)" in count_method
        and "IsSizeOptimized" not in count_method,
        str(linq / "Count.cs"),
    )
    concat = read(linq / "Concat.SpeedOpt.cs")
    first_count = concat.split("public override int GetCount(bool onlyIfCheap)", 1)[1]
    first_count = first_count.split("public override TSource[] ToArray()", 1)[0]
    append = read(linq / "AppendPrepend.SpeedOpt.cs")
    require(
        f"ActualConcatAppendInputsHaveCheapCounts:{role}",
        "_first.TryGetNonEnumeratedCount(out firstCount)" in first_count
        and "_second.TryGetNonEnumeratedCount(out secondCount)" in first_count
        and "return checked(firstCount + secondCount);" in first_count
        and "return !onlyIfCheap || _source is ICollection<TSource> ? checked(_source.Count() + 1) : -1;"
        in append,
        [str(linq / "Concat.SpeedOpt.cs"), str(linq / "AppendPrepend.SpeedOpt.cs")],
    )
    any_text = read(linq / "AnyAll.cs").split("public static bool Any<TSource>", 2)[1]
    require(
        f"AnyUsuallyUsesTheSameCheapCountNotAnAvoidedTraversal:{role}",
        "if (!IsSizeOptimized && source is Iterator<TSource> iterator)" in any_text
        and "iterator.GetCount(onlyIfCheap: true)" in any_text
        and "return gc.Count != 0;" in any_text,
        str(linq / "AnyAll.cs"),
    )

producer_matrix = {
    "classification": "source-derived real producer inventory, not native test output",
    "nonNullProducerSites": producer_rows,
    "blazorNullConstructionSites": null_sites,
    "summary": {
        "nonNullSites": 16,
        "arraySites": 12,
        "arraySizes": {"4": 1, "5": 1, "6": 4, "7": 4, "10": 2},
        "concatSites": 4,
        "concatSizes": {"4": 2, "5": 2},
        "blazorNullSites": 7,
        "nonNullMaximumCount": 10,
        "nativeObservedTypesOrSizes": False,
        "inventedProducers": False,
    },
}
write("producer-matrix.json", producer_matrix)
write(
    "source-audit-results.json",
    {
        "command": ["python", ".\\Audit-Source.py"],
        "classification": "Offline finite source/hash audit; not a .NET build, test, runtime probe or benchmark",
        "checks": checks,
        "passed": sum(check["passed"] for check in checks),
        "failed": sum(not check["passed"] for check in checks),
        "nativeTestRowsExecuted": 0,
        "comparisons": 0,
    },
)
sys.stdout.write(json.dumps({"passed": len(checks), "failed": 0, "producerSites": 16, "nativeRows": 0, "comparisons": 0}) + "\n")
