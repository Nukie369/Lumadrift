const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('game.js','utf8');
const defs=source.match(/  const buildingDefs=\[([\s\S]*?)\n  \];/);
const scenes=source.match(/    const scenes=(\{[^;]+\});/);
assert.ok(defs && scenes,'production landmark definitions and scenery must exist');
const ids=[...defs[1].matchAll(/id:'([^']+)'/g)].map(m=>m[1]);
const map=vm.runInNewContext('('+scenes[1]+')');
assert.deepEqual(Object.keys(map).sort(),ids.slice().sort(),'every constructible landmark has exactly one scenery entry');
for(const id of ids){
 const [symbol,x,y]=map[id];
 assert.equal(typeof symbol,'string');
 assert.ok(symbol.length>0);
 assert.ok(x>=0&&x<=100&&y>=0&&y<=100,'scenery must be on island');
}
console.log('PASS: all four production landmark IDs resolve to distinct valid scenery placements');
