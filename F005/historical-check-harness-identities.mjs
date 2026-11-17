import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const session=path.dirname(fileURLToPath(import.meta.url));
for(const id of ['F004','F005']){
    const root=path.join(session,'autoperf-runs',id);
    const read=variant=>JSON.parse(fs.readFileSync(path.join(root,`manifest-${variant}.json`),'utf8').replace(/^\uFEFF/,''));
    const versions=id==='F005'?['','-small-controls']:[''];
    const observations=versions.map(suffix=>{
        const original=read('original'+suffix),candidate=read('candidate-1'+suffix);
        const difference=(left,right)=>left.filter(row=>{
            const matches=right.filter(other=>other.relativePath===row.relativePath);assert.equal(matches.length,1);
            return matches[0].sha256!==row.sha256;
        }).map(row=>({file:row.relativePath,originalSha256:row.sha256,candidateSha256:right.find(other=>other.relativePath===row.relativePath).sha256}));
        return {imageVersion:suffix||'first',differentImageFiles:difference(original.files,candidate.files),
            differentHarnessSources:difference(original.frozenSources.filter(row=>/^harness[\\/]/.test(row.relativePath)),candidate.frozenSources)};
    });
    const report={candidate:id,observations,sourceHashesNotMistakenForExecutableIdentity:true,methodIlOrFullSemanticBinaryEquivalenceClaimed:false,
        newBenchmarkComparisonOrRerun:false,note:id==='F005'
            ?'Comparison1 independent harness builds are byte-different despite identical source. Treat as exploratory,not isolated owner comparison. Comparisons2/3 share exact18-case harness DLL/PDB bytes;their original/candidate images differ only in the actual owner DLL/PDB.'
            :'The published no-gain decision remains conservative,but independent harness builds are byte-different despite identical source. Do not treat its3 paired observations as exact-harness causal owner isolation. No rerun or speculative PR.'};
    const output=path.join(session,id+'-harness-identity-observation.json');assert(!fs.existsSync(output));
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
