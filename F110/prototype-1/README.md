# F110 first prototype: count gates of 16

Round 1 uses the original count-16 prototype, not the final count-32
implementation. Its complete 32-case [comparison](comparison.md) and
[machine-readable values](comparison.json) are retained separately.
Both raw launches remain in [round-1-before](../round-1-before) and
[round-1-after](../round-1-after).

Seven larger List/grouped cases improved 56.73-91.52% in this pair.
However, `ListHit_16_16` was **6.06% slower** and increased measured allocation
from **14,279 to 14,818 B/op**. One tune raises both count gates to 32.
The miss case at the old boundary improved 11.58%; excluding it is an
intentional small-input trade-off, not a universal optimum.

The full first-prototype [source](../source-prototype.cs) and
[shipping-source patch](../prototype-source.patch) reproduce the experiment.
Original/prototype/final complete-HTML contracts all agree, and each owning
suite passes 2,601 tests. Final statistics use only rounds 2-3.
No first-prototype gain, regression or launch is removed.
