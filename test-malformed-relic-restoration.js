const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b));
const ctx={Date,Math,JSON,Number,Array,Set,structuredClone,console,STORAGE:'luma_drift_save_v2',clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),dateKey:()=> '2026-11-09',toLocalDay:()=>new Date(2026,10,9)};
vm.createContext(ctx);
vm.runInContext(section('  const baseState=','  function track(')+section('  const safeObject=','  // Preserve the last readable save'),ctx);
const normalize=vm.runInContext('normalizeState',ctx);
for(const malformed of [null,42,'bad',{},['pearl'],{discovered:'pearl',claimed:'skyward'}, {discovered:[null,{},'pearl','pearl','fake',17],claimed:[null,'deep','deep','bogus']}]){
 const restored=normalize({atlas:malformed});
 assert(Array.isArray(restored.atlas.discovered));assert(Array.isArray(restored.atlas.claimed));
 assert(restored.atlas.discovered.every(x=>['bloom','pearl','kite','lantern','key','crown'].includes(x)));
 assert(restored.atlas.claimed.every(x=>['skyward','deep'].includes(x)));
 assert.equal(new Set(restored.atlas.discovered).size,restored.atlas.discovered.length);
 assert.equal(new Set(restored.atlas.claimed).size,restored.atlas.claimed.length);
}
const restored=normalize({atlas:{discovered:['bloom','pearl','kite','kite','unknown'],claimed:['skyward','skyward','invalid'],repeats:-5}});
assert.deepEqual([...restored.atlas.discovered],['bloom','pearl','kite']);
assert.deepEqual([...restored.atlas.claimed],['skyward']);
assert.equal(restored.atlas.repeats,0);
console.log('PASS malformed relic records sanitized without duplicate discoveries or claims');
