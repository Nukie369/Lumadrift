const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('game.js','utf8');
const match=source.match(/  function colonyFunding\(credits,cost\)\{[\s\S]*?\n  \}/);
assert.ok(match,'actual production funding calculator must exist');
const funding=vm.runInNewContext(`(${match[0].trim()})`);
const cases=[
  [0,260,0,0,260],
  [130,260,130,50,130],
  [260,260,260,100,0],
  [999,260,260,100,0],
  [-50,260,0,0,260],
  [NaN,260,0,0,260],
  [Infinity,260,0,0,260],
  [150,0,1,100,0],
];
for(const [credits,cost,saved,percentage,shortfall] of cases){
  const actual=funding(credits,cost);
  assert.equal(actual.saved,saved);
  assert.equal(actual.percentage,percentage);
  assert.equal(actual.shortfall,shortfall);
}
assert.match(source,/const \{saved,percentage,shortfall\}=colonyFunding\(state\.credits,next\.cost\)/);
console.log('Production funding calculation: 8 runtime boundary cases passed');
