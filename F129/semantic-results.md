# F129: every declared profile

The table shows repetition one. All three repetitions per profile remain in each raw JSON report. Four original/default/prototype/restored executions and two fresh-project executions produced **162 actual managed component renders**. These are repeated executions of nine profiles, not 162 distinct tests.

| Profile | Original HTML | Lazy-filter HTML | Prototype preservation result |
|---|---|---|---|
| NoAttributes | `<a data-blazor-file-download="" href="javascript:void(0)">Download</a>` | `<a data-blazor-file-download="" href="javascript:void(0)">Download</a>` | Same |
| OrdinaryNoHref | `<a data-blazor-file-download="" href="javascript:void(0)" class="btn">Download</a>` | `<a data-blazor-file-download="" href="javascript:void(0)" class="btn">Download</a>` | Same |
| OrdinaryWithHref | `<a data-blazor-file-download="" href="javascript:void(0)" class="btn">Download</a>` | `<a data-blazor-file-download="" href="javascript:void(0)" class="btn">Download</a>` | Same |
| UppercaseHrefOrdinalIgnoreCase | `<a data-blazor-file-download="" HREF="https://example.test/uppercase" class="btn">Download</a>` | `<a data-blazor-file-download="" HREF="https://example.test/uppercase" class="btn">Download</a>` | Same |
| ReplaceValueWithHref | `<a data-blazor-file-download="" href="javascript:void(0)" data-trigger="converted" data-after="before">Download</a>` | `<a data-blazor-file-download="" href="javascript:void(0)" data-trigger="converted" data-after="after">Download</a>` | Different: Expected rendered data-after=before. |
| ReplaceValueWithoutHref | `<a data-blazor-file-download="" href="javascript:void(0)" data-trigger="converted" data-after="after">Download</a>` | `<a data-blazor-file-download="" href="javascript:void(0)" data-trigger="converted" data-after="after">Download</a>` | Same |
| AddKeyWithHref | `<a data-blazor-file-download="" href="javascript:void(0)" data-trigger="converted" data-after="before">Download</a>` | No HTML: renderer exception | Different: Expected successful rendering, observed System.InvalidOperationException: Collection was modified; enumeration operation may not execute.; No actual HTML was produced.; The copied trailing value did not render.; The late key escaped the original snapshot. |
| AddKeyWithoutHref | No HTML: renderer exception | No HTML: renderer exception | Same |
| ChildContentWithHref | `custom-link` | `custom-link` | Same |

Both href-present mutator profiles differ in every repetition, including the independent rebuild. The two prototype executions each exit **2**, with six failed original-behavior rows. The original, actual default, restored original and fresh original each exit **0**, with all 27 rows satisfying the same assertions.

The nearest-opposite controls are retained: without supplied href, both implementations already observe a replacement during direct enumeration, and both already report the insertion exception. With custom ChildContent, neither invokes the mutating value. The uppercase-href/comparer control preserves the existing behavior; this case does not change it.

[Original](validation/original-characterize-001/observations.json), [actual default](validation/default-characterize-001/observations.json), [prototype](validation/prototype-characterize-001/observations.json), [restored original](validation/restored-characterize-001/observations.json), [fresh original](validation/reconstruction-original-characterize-001/observations.json), [fresh prototype](validation/reconstruction-prototype-characterize-001/observations.json), [machine-readable matrix](semantic-matrix.json).

**No timing, allocation result or ordinary application-frequency claim.** The deliberately reentrant application value establishes a concrete difference, not its prevalence.
