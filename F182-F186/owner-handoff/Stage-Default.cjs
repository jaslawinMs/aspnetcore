'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,graphs=JSON.parse(fs.readFileSync(path.join(root,'graph-creation.json')));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function inventory(directory,relative=''){
  const files=[];for(const e of fs.readdirSync(path.join(directory,relative),{withFileTypes:true})){
    const n=path.join(relative,e.name);assert(!e.isSymbolicLink(),n);
    if(e.isDirectory())files.push(...inventory(directory,n));else{const b=fs.readFileSync(path.join(directory,n));files.push({path:n.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)});}
  }return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
const native=path.join(graphs.defaultPath,'artifacts','bin','Microsoft.AspNetCore.Identity.InMemory.Test','Release','net12.0');
const directory=path.join(root,'..','images','default');assert(!fs.existsSync(directory));
const built=inventory(native);fs.cpSync(native,directory,{recursive:true,errorOnExist:true,force:false,dereference:true});
const files=inventory(directory);assert.deepEqual(files,built);
const previous=JSON.parse(fs.readFileSync(path.join(root,'native-images-initial.json')));
const output={boundary:'Every file in both private complete normal native output copies before this owner common augmentation; Original includes four historical donor companions, Default is a fresh whole dependency-aware build.',
  images:{...previous.images,default:{role:'default',commit:graphs.defaultCommit,builtDirectory:native,directory,files,count:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0)}}};
const a=new Map(output.images.original.files.map(f=>[f.path,f])),b=new Map(files.map(f=>[f.path,f]));
output.union=[...new Set([...a.keys(),...b.keys()])].sort().map(p=>({path:p,original:a.get(p)??null,default:b.get(p)??null}));
output.differences=output.union.filter(r=>r.original?.sha256!==r.default?.sha256);
assert(!fs.existsSync(path.join(root,'native-images.json')));
fs.writeFileSync(path.join(root,'native-images.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',images:Object.values(output.images).map(i=>({role:i.role,count:i.count,bytes:i.bytes})),union:output.union.length,differences:output.differences.length}));
