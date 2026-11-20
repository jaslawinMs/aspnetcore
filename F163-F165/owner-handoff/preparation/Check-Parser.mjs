import { pe, pdb } from './evidence.mjs';
const file = String.raw`C:\src\ap163o011\artifacts\bin\Microsoft.AspNetCore.Components\Debug\net12.0\Microsoft.AspNetCore.Components.dll`;
const image = pe(file), debug = pdb(file.replace('.dll', '.pdb'));
console.log(JSON.stringify({
  image, pdbId: debug.idGuid, stamp: debug.idStamp, documents: debug.documents.length,
  selected: debug.documents.filter(d => d.name.endsWith('MemberAssignment.cs') || d.name.endsWith('ResourceAssetCollection.cs'))
}, null, 2));
if (!image.codeView.some(c => c.guid === debug.idGuid && c.stamp === debug.idStamp)) throw Error('PE/PDB content ID mismatch');
