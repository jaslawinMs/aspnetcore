# F035 complete audited comparisons

Positive less-time percentages favor the candidate;negative values are regressions. Three complete alternating pairs,N=8 per row. All profiles,controls,allocation residuals and raw samples retained. Shared VM,not application throughput.

| Profile | Round1 original->candidate ns | Less time % | Round2 original->candidate ns | Less time % | Round3 original->candidate ns | Less time % | B/op original->candidate rounds1/2/3 |
|---|---:|---:|---:|---:|---:|---:|---|
| CollectionBinding:0 | 215.297->206.142 | 4.25 | 186.187->191.386 | -2.79 | 184.897->196.867 | -6.47 | 656->656 / 656->656 / 656->656 |
| CollectionBinding:1 | 564.955->581.274 | -2.89 | 574.982->564.324 | 1.85 | 552.679->652.570 | -18.07 | 1456->1456 / 1456->1456 / 1456->1456 |
| CollectionBinding:64 | 10174.831->10178.114 | -0.03 | 10321.089->10226.411 | 0.92 | 10537.496->9995.002 | 5.15 | 13393->13393 / 13392->13393 / 13392->13392 |
| CollectionBinding:8 | 1681.817->1860.698 | -10.64 | 1689.594->1716.416 | -1.59 | 1677.375->1726.295 | -2.92 | 2792->2792 / 2792->2792 / 2792->2792 |
| PreparedConcrete:0 | 0.722->0.731 | -1.18 | 0.750->0.746 | 0.61 | 0.718->0.719 | -0.11 | 0->0 / 0->0 / 0->0 |
| PreparedConcrete:1 | 2.667->2.687 | -0.75 | 2.746->2.673 | 2.66 | 2.695->2.645 | 1.85 | 0->0 / 0->0 / 0->0 |
| PreparedConcrete:64 | 95.069->120.636 | -26.89 | 94.939->119.923 | -26.32 | 95.511->120.141 | -25.79 | 0->0 / 0->0 / 0->0 |
| PreparedConcrete:8 | 13.704->17.542 | -28.01 | 13.605->17.516 | -28.74 | 12.776->17.375 | -36.00 | 0->0 / 0->0 / 0->0 |
| PreparedPreboxedGeneric:0 | 11.337->10.488 | 7.49 | 10.727->10.892 | -1.54 | 10.416->11.367 | -9.12 | 40->40 / 40->40 / 40->40 |
| PreparedPreboxedGeneric:1 | 17.663->15.684 | 11.21 | 16.360->15.845 | 3.15 | 16.395->18.066 | -10.19 | 40->40 / 40->40 / 40->40 |
| PreparedPreboxedGeneric:64 | 411.363->444.353 | -8.02 | 392.467->424.698 | -8.21 | 397.152->390.544 | 1.66 | 40->40 / 40->40 / 40->40 |
| PreparedPreboxedGeneric:8 | 61.310->66.282 | -8.11 | 58.300->61.163 | -4.91 | 58.104->59.426 | -2.28 | 40->40 / 40->40 / 40->40 |
| QueryProducer:0 | 6.122->6.146 | -0.39 | 6.363->6.185 | 2.79 | 6.159->6.131 | 0.45 | 0->0 / 0->0 / 0->0 |
| QueryProducer:1 | 17.019->16.836 | 1.07 | 16.483->16.862 | -2.30 | 16.976->16.433 | 3.20 | 0->0 / 0->0 / 0->0 |
| QueryProducer:64 | 143.968->140.237 | 2.59 | 150.592->145.997 | 3.05 | 135.066->132.121 | 2.18 | 0->0 / 0->0 / 0->0 |
| QueryProducer:8 | 33.861->33.386 | 1.40 | 34.043->32.968 | 3.16 | 32.693->32.146 | 1.67 | 0->0 / 0->0 / 0->0 |
| UnchangedValuesControl:0 | 0.641->0.712 | -11.10 | 0.768->0.771 | -0.35 | 0.724->0.640 | 11.63 | 0->0 / 0->0 / 0->0 |
| UnchangedValuesControl:1 | 1.904->3.029 | -59.05 | 3.107->3.036 | 2.28 | 3.036->1.889 | 37.78 | 0->0 / 0->0 / 0->0 |
| UnchangedValuesControl:64 | 145.474->133.725 | 8.08 | 132.612->131.428 | 0.89 | 134.071->141.506 | -5.55 | 0->0 / 0->0 / 0->0 |
| UnchangedValuesControl:8 | 19.984->18.064 | 9.61 | 18.045->17.668 | 2.09 | 17.910->19.920 | -11.22 | 0->0 / 0->0 / 0->0 |

Declared primary:CollectionBinding:1. Prepared8/64 regress in all three pairs;Query8/64 have small consistent positives but no consistent ordinary binding gain. Primary1456B/op unchanged;Count64 round2+1B/op residual retained. Unchanged direct-Values controls move materially,particularly subnanosecond Count1. No fourth comparison;original source/product restored;no performance PR.
