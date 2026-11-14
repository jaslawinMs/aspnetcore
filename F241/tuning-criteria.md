# F241 source-only tune after pair 1, before implementation

All25 first-pair cases are retained. No32%-gain headline exceeds the user's
50% early-stop guideline, so two comparisons remain.

The32-entry index prototype's three1024-component complete-discovery cases
improve32.06-32.62% but add21,549-71,829B/op. 256-component targets improve
5.49-6.87%, with6,007-15,388 extraB/op. At64components affected cases generally
regress2.13-6.16%, allocating1,576-4,217 moreB/op; early indexing does not amortize.
Array64's source-unchanged fallback is22.24% lower and many other controls are
3.48-19.71% higher; retain all values without causal or harmless-noise diagnosis.
No-component controls also report changed heap/time despite no index creation;
preserve raw measurements, do not attribute their delta to the local set.

One source-only tune changes **only the lazy index threshold32->256**.
Keep the exact original measured harness/DLL/PDB/configuration and both existing
immutable snapshots, first-pair source/tests/checks/manifests and raw reports.
Final summaries will use pairs2-3 only, never aggregate different thresholds.

Add255/256/257 focused compatibility rows. Scale custom producer mutation
prepopulation above256 so the tests continue proving guarded fallback
reachability, not a below-threshold accidental pass. Revalidate new rows against
original shipping source before validating the final256-entry prototype.
Capture a new after-2 snapshot; do not overwrite before/after.

The original unchanged harness's IndexThresholdReachable diagnostic describes
the32-entry prototype. Its complete outcome/hash/trusted-producer receipts remain
valid, but final256 reachability must be separately derived from actual producer
receipts and exact final source. Do not relabel the immutable harness.

Both final comparisons must retain all25 cases/eight measurements and all
allocation/control/non-win data. No request/full-app-startup/concurrent/cold
metadata/other-runtime claim. Remaining source changes are forbidden unless
required to fix a directly coupled correctness failure.
