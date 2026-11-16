# F091 actual Google challenge comparisons

Positive timing changes mean slower. All three comparisons, regressions, unchanged controls and raw samples are retained.

**Resource-only result:** typed true/false reaches an approximately 32 B/op reduction (reported 31-33 B/op).
The complete owner/request allocation reduction is approximately 0.16-0.26%. The ToString two-allocation scan premise is false.

**No established speedup:** target regressions and unchanged-control movement remain. PreparedOwner/Absent is nonstationary in every launch; no samples are removed or extra comparisons run.

| Method / profile | Pair | Before ns/op | After ns/op | Change % | Before / after B/op | Saved B/op | Max CV % |
|---|---:|---:|---:|---:|---:|---:|---:|
| PreparedOwner / Absent (control) | 1 | 30882.22 | 31571.38 | 2.23 | 14234 / 14234 | 0 | 34.48 |
| PublicChallenge / Absent (control) | 1 | 15207.48 | 15183.66 | -0.16 | 18849 / 18849 | 0 | 1.41 |
| PreparedOwner / EndpointDefault (control) | 1 | 12681.82 | 12650.77 | -0.24 | 15729 / 15729 | 0 | 1.35 |
| PublicChallenge / EndpointDefault (control) | 1 | 15704.94 | 15965.41 | 1.66 | 20401 / 20401 | 0 | 4.10 |
| PreparedOwner / FalseOverridesItem | 1 | 13149.50 | 13614.10 | 3.53 | 15600 / 15568 | 32 | 8.09 |
| PublicChallenge / FalseOverridesItem | 1 | 15346.13 | 16141.68 | 5.18 | 20009 / 19976 | 33 | 2.04 |
| PreparedOwner / ItemFalse (control) | 1 | 12901.65 | 13424.70 | 4.05 | 15425 / 15425 | 0 | 1.21 |
| PublicChallenge / ItemFalse (control) | 1 | 15411.16 | 16139.74 | 4.73 | 19833 / 19833 | 0 | 5.60 |
| PreparedOwner / ItemTrue (control) | 1 | 13174.03 | 13228.53 | 0.41 | 15401 / 15401 | 0 | 4.31 |
| PublicChallenge / ItemTrue (control) | 1 | 15413.37 | 15724.59 | 2.02 | 19817 / 19817 | 0 | 3.65 |
| PreparedOwner / ItemVerbatim (control) | 1 | 13166.86 | 13404.44 | 1.80 | 15745 / 15745 | 0 | 1.47 |
| PublicChallenge / ItemVerbatim (control) | 1 | 15649.46 | 15931.68 | 1.80 | 21633 / 21633 | 0 | 2.62 |
| PreparedOwner / NullKeepsItem (control) | 1 | 13811.26 | 13561.62 | -1.81 | 15881 / 15881 | 0 | 4.64 |
| PublicChallenge / NullKeepsItem (control) | 1 | 15845.57 | 16205.40 | 2.27 | 21769 / 21769 | 0 | 3.46 |
| PreparedOwner / TrueOverridesItem | 1 | 13281.91 | 13467.61 | 1.40 | 15609 / 15577 | 32 | 3.00 |
| PublicChallenge / TrueOverridesItem | 1 | 15378.09 | 15867.51 | 3.18 | 20025 / 19993 | 32 | 3.38 |
| PreparedOwner / TypedFalse | 1 | 12610.12 | 13015.36 | 3.21 | 15025 / 14993 | 32 | 4.46 |
| PublicChallenge / TypedFalse | 1 | 15393.85 | 15783.34 | 2.53 | 19689 / 19657 | 32 | 1.64 |
| PreparedOwner / TypedFalseNoPkce | 1 | 10700.69 | 10824.04 | 1.15 | 12161 / 12129 | 32 | 2.84 |
| PublicChallenge / TypedFalseNoPkce | 1 | 13160.37 | 13695.26 | 4.06 | 16537 / 16505 | 32 | 3.41 |
| PreparedOwner / TypedNull (control) | 1 | 12179.27 | 12532.28 | 2.90 | 14313 / 14313 | 0 | 1.17 |
| PublicChallenge / TypedNull (control) | 1 | 15222.19 | 15753.98 | 3.49 | 18985 / 18985 | 0 | 4.02 |
| PreparedOwner / TypedTrue | 1 | 12664.21 | 12768.63 | 0.82 | 15017 / 14985 | 32 | 4.29 |
| PublicChallenge / TypedTrue | 1 | 15340.83 | 15973.24 | 4.12 | 19689 / 19657 | 32 | 2.37 |
| PreparedOwner / TypedTrueNoPkce | 1 | 10724.45 | 10858.60 | 1.25 | 12161 / 12129 | 32 | 3.02 |
| PublicChallenge / TypedTrueNoPkce | 1 | 13330.22 | 13635.26 | 2.29 | 16537 / 16505 | 32 | 2.96 |
| PreparedOwner / Absent (control) | 2 | 35674.16 | 31682.62 | -11.19 | 14234 / 14233 | 1 | 30.43 |
| PublicChallenge / Absent (control) | 2 | 15425.56 | 15300.33 | -0.81 | 18849 / 18849 | 0 | 1.21 |
| PreparedOwner / EndpointDefault (control) | 2 | 13000.55 | 12924.64 | -0.58 | 15729 / 15729 | 0 | 1.60 |
| PublicChallenge / EndpointDefault (control) | 2 | 15942.85 | 15725.48 | -1.36 | 20401 / 20401 | 0 | 1.47 |
| PreparedOwner / FalseOverridesItem | 2 | 13476.83 | 13287.83 | -1.40 | 15600 / 15568 | 32 | 2.82 |
| PublicChallenge / FalseOverridesItem | 2 | 15721.41 | 16048.34 | 2.08 | 20009 / 19977 | 32 | 3.58 |
| PreparedOwner / ItemFalse (control) | 2 | 13397.58 | 13329.10 | -0.51 | 15425 / 15425 | 0 | 4.81 |
| PublicChallenge / ItemFalse (control) | 2 | 15567.44 | 15576.46 | 0.06 | 19833 / 19833 | 0 | 1.07 |
| PreparedOwner / ItemTrue (control) | 2 | 13155.23 | 13210.61 | 0.42 | 15401 / 15401 | 0 | 2.87 |
| PublicChallenge / ItemTrue (control) | 2 | 15605.86 | 15456.39 | -0.96 | 19817 / 19817 | 0 | 1.08 |
| PreparedOwner / ItemVerbatim (control) | 2 | 13330.81 | 13223.24 | -0.81 | 15745 / 15745 | 0 | 1.28 |
| PublicChallenge / ItemVerbatim (control) | 2 | 15940.65 | 15609.72 | -2.08 | 21633 / 21633 | 0 | 1.37 |
| PreparedOwner / NullKeepsItem (control) | 2 | 13465.79 | 13406.57 | -0.44 | 15881 / 15881 | 0 | 1.05 |
| PublicChallenge / NullKeepsItem (control) | 2 | 16233.22 | 15851.99 | -2.35 | 21769 / 21769 | 0 | 3.94 |
| PreparedOwner / TrueOverridesItem | 2 | 13285.72 | 13476.06 | 1.43 | 15609 / 15577 | 32 | 1.08 |
| PublicChallenge / TrueOverridesItem | 2 | 15983.16 | 16718.68 | 4.60 | 20025 / 19993 | 32 | 4.53 |
| PreparedOwner / TypedFalse | 2 | 12806.27 | 13117.80 | 2.43 | 15025 / 14993 | 32 | 1.26 |
| PublicChallenge / TypedFalse | 2 | 15825.28 | 16262.53 | 2.76 | 19689 / 19657 | 32 | 0.83 |
| PreparedOwner / TypedFalseNoPkce | 2 | 10974.83 | 11096.71 | 1.11 | 12161 / 12129 | 32 | 3.94 |
| PublicChallenge / TypedFalseNoPkce | 2 | 13661.87 | 13627.17 | -0.25 | 16537 / 16505 | 32 | 4.35 |
| PreparedOwner / TypedNull (control) | 2 | 12433.43 | 12694.93 | 2.10 | 14313 / 14313 | 0 | 1.09 |
| PublicChallenge / TypedNull (control) | 2 | 15459.68 | 15787.51 | 2.12 | 18985 / 18985 | 0 | 1.00 |
| PreparedOwner / TypedTrue | 2 | 12737.62 | 12836.32 | 0.77 | 15017 / 14985 | 32 | 1.31 |
| PublicChallenge / TypedTrue | 2 | 15993.84 | 15910.48 | -0.52 | 19689 / 19657 | 32 | 5.17 |
| PreparedOwner / TypedTrueNoPkce | 2 | 10703.87 | 11123.50 | 3.92 | 12161 / 12129 | 32 | 4.72 |
| PublicChallenge / TypedTrueNoPkce | 2 | 13552.87 | 13673.50 | 0.89 | 16537 / 16505 | 32 | 1.55 |
| PreparedOwner / Absent (control) | 3 | 30354.26 | 31163.68 | 2.67 | 14233 / 14233 | 0 | 30.53 |
| PublicChallenge / Absent (control) | 3 | 16587.91 | 14999.79 | -9.57 | 18849 / 18849 | 0 | 14.22 |
| PreparedOwner / EndpointDefault (control) | 3 | 12833.11 | 12709.50 | -0.96 | 15729 / 15729 | 0 | 1.34 |
| PublicChallenge / EndpointDefault (control) | 3 | 15627.69 | 15529.25 | -0.63 | 20401 / 20401 | 0 | 2.12 |
| PreparedOwner / FalseOverridesItem | 3 | 13153.30 | 13017.26 | -1.03 | 15600 / 15569 | 31 | 2.03 |
| PublicChallenge / FalseOverridesItem | 3 | 15344.09 | 15127.20 | -1.41 | 20009 / 19976 | 33 | 1.75 |
| PreparedOwner / ItemFalse (control) | 3 | 12975.66 | 12842.37 | -1.03 | 15425 / 15425 | 0 | 1.02 |
| PublicChallenge / ItemFalse (control) | 3 | 15309.95 | 15152.77 | -1.03 | 19833 / 19833 | 0 | 3.35 |
| PreparedOwner / ItemTrue (control) | 3 | 13132.03 | 12972.68 | -1.21 | 15401 / 15401 | 0 | 1.59 |
| PublicChallenge / ItemTrue (control) | 3 | 15477.10 | 15357.83 | -0.77 | 19817 / 19817 | 0 | 2.18 |
| PreparedOwner / ItemVerbatim (control) | 3 | 13800.81 | 12997.38 | -5.82 | 15745 / 15745 | 0 | 3.67 |
| PublicChallenge / ItemVerbatim (control) | 3 | 16295.84 | 15384.97 | -5.59 | 21633 / 21633 | 0 | 1.66 |
| PreparedOwner / NullKeepsItem (control) | 3 | 13397.76 | 13399.27 | 0.01 | 15881 / 15881 | 0 | 3.13 |
| PublicChallenge / NullKeepsItem (control) | 3 | 15897.37 | 15661.80 | -1.48 | 21769 / 21769 | 0 | 5.16 |
| PreparedOwner / TrueOverridesItem | 3 | 13059.84 | 13160.42 | 0.77 | 15609 / 15577 | 32 | 2.13 |
| PublicChallenge / TrueOverridesItem | 3 | 15331.01 | 15236.03 | -0.62 | 20025 / 19993 | 32 | 1.65 |
| PreparedOwner / TypedFalse | 3 | 12390.36 | 12471.91 | 0.66 | 15025 / 14993 | 32 | 1.81 |
| PublicChallenge / TypedFalse | 3 | 15723.02 | 15755.60 | 0.21 | 19689 / 19657 | 32 | 2.98 |
| PreparedOwner / TypedFalseNoPkce | 3 | 10736.31 | 10879.30 | 1.33 | 12161 / 12129 | 32 | 3.23 |
| PublicChallenge / TypedFalseNoPkce | 3 | 13179.69 | 13291.60 | 0.85 | 16537 / 16505 | 32 | 1.75 |
| PreparedOwner / TypedNull (control) | 3 | 12363.53 | 12227.84 | -1.10 | 14313 / 14313 | 0 | 3.10 |
| PublicChallenge / TypedNull (control) | 3 | 15212.52 | 15258.20 | 0.30 | 18985 / 18985 | 0 | 1.57 |
| PreparedOwner / TypedTrue | 3 | 12523.20 | 12431.12 | -0.74 | 15017 / 14985 | 32 | 1.24 |
| PublicChallenge / TypedTrue | 3 | 15462.05 | 15227.85 | -1.51 | 19689 / 19657 | 32 | 1.42 |
| PreparedOwner / TypedTrueNoPkce | 3 | 10848.89 | 10606.38 | -2.24 | 12161 / 12129 | 32 | 1.55 |
| PublicChallenge / TypedTrueNoPkce | 3 | 13460.85 | 13060.14 | -2.98 | 16537 / 16505 | 32 | 3.60 |

PreparedOwner invokes the actual protected Google owner through a thin initialized external subclass. PublicChallenge creates/disposes a real request scope and invokes the registered handler through ChallengeAsync. Both use actual ephemeral PropertiesDataFormat state protection; no remote provider or browser workflow is measured.

Setup checks complete query/state keys, typed-over-Items precedence, verbatim Items, nullable omission, existing two-value endpoint-query repetition, item removal, return URI/payload and the real generated PKCE verifier/challenge relationship. The 50 existing Google tests pass on each owner. These are preservation checks, not a correctness red/green claim.

Public record auditing rehashes published source and raw records, not omitted binary/PDB bytes. Recorded original-host portable-PDB/source proofs and full copied execution hashes remain available.
