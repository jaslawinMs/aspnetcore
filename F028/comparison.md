# F028 measured comparison

1 actual comparison;20 native warm rows and4 first observations. Positive percentage means less time.
Stopped under the declared>=50%primary rule;the128scheme tail primary meets it with separated reported intervals. This is a scoped synthetic-scaling result,not an application-frequency claim.
Derived-manager/provider controls are slower in this comparison. The proposal is not an all-caller improvement or merge-ready recommendation.

| Actual public profile | Original ns/op | Selected ns/op | Observed less time % | Original/selected B/op |
|---|---:|---:|---:|---:|
| Default.One.Hit | 210.97 | 180.02 | 14.67 | 576 / 472 |
| Default.Four.Tail (primary) | 237.50 | 180.25 | 24.11 | 576 / 472 |
| Default.Many.Tail (primary) | 1340.29 | 182.30 | 86.40 | 576 / 472 |
| Default.Many.Miss | 1346.64 | 177.19 | 86.84 | 576 / 472 |
| Default.Many.Hidden | 1352.44 | 182.01 | 86.54 | 576 / 472 |
| Default.Many.Head | 210.94 | 187.74 | 10.99 | 576 / 472 |
| Default.Empty.Miss | 189.62 | 174.67 | 7.89 | 528 / 472 |
| DerivedManager.Four.Tail | 246.11 | 260.19 | -5.72 | 576 / 576 |
| DerivedProvider.Four.Tail | 246.94 | 263.05 | -6.53 | 576 / 576 |
| Early.NoAuthentication | 31.83 | 31.72 | 0.35 | 24 / 24 |

## First observed:fixture,provider,DI,UserManager,JIT and metadata included

| Public profile | Original ms | Selected ms | Original bytes | Selected bytes |
|---|---:|---:|---:|---:|
| Default.Four.Tail | 50.69 | 48.98 | 33048 | 26672 |
| DerivedManager.Four.Tail | 50.68 | 49.71 | 33064 | 33064 |

Single observations only,not cold-start or isolated-entry conclusions. All unfavorable observations remain authoritative.

## Limits

- Shared Windows VM,not sandboxed,dedicated or isolated. Settings are point observations:Normal/Normal/65535. No OS settings were changed.
- Only exact default manager/provider types use the dictionary. All custom/derived virtual behavior stays on the original sequence path.
- The real default provider already reuses its safe snapshot. This removes a per-call filter/scan,not a snapshot rebuild.
- Prepared synchronous authentication-result service and actual public owner/provider. Not full login,cookie,HTTP/network,async-authentication throughput or application-frequency evidence.
- The128scheme primary is explicitly synthetic scaling,not evidence that applications commonly register128schemes.
- Derived controls traverse the added type guard and larger method;they are not byte-identical IL controls. Retain their observed regressions rather than claiming all callers benefit.
- The unreached early-return control has unchanged source but shares the rebuilt method. Source identity is not proof of identical generated code.
- Task<int> consumer and prepared-producer bookkeeping are common to both images. Owning unit and BDN callers have different absolute allocation boundaries.
- PE/PDB selected-document identities are not full compiler provenance or method coverage. Copied-text verification does not rehash omitted binaries or runtime files.
- All raw native,control and first observations are retained. Paired means are scoped measurements,not clean causal application-speedup claims.
