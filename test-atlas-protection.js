// Regression test executes the production relic draw function, not a duplicate implementation.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/game.js', 'utf8');
const start = source.indexOf('  function revealRelic(){');
const end = source.indexOf('  const colonyBonus=', start);
assert.ok(start > 0 && end > start, 'production revealRelic function must be present');
const production = source.slice(start, end);
const sets = [
  {id:'skyward',name:'Skyward',reward:350,relics:[{id:'bloom',weight:26},{id:'pearl',weight:20},{id:'kite',weight:14}]},
  {id:'deep',name:'Deep',reward:600,relics:[{id:'lantern',weight:20},{id:'key',weight:13},{id:'crown',weight:7}]}
];
const allRelics = sets.flatMap(s=>s.relics);
function fixture(discovered, streak, randomValue=0) {
  const state = {atlas:{discovered:[...discovered],claimed:[],repeats:0,duplicateStreak:streak}};
  const events=[];
  const ctx={state,allRelics,atlasSets:sets,random:()=>randomValue,track:(...args)=>events.push(args),atlasComplete:set=>set.relics.every(r=>state.atlas.discovered.includes(r.id))};
  vm.runInNewContext(production+'\nthis.drawRelic = revealRelic;',ctx);
  return {state,events,draw:()=>ctx.drawRelic()};
}
let f=fixture(['bloom','pearl','kite','lantern','key'],6,0);
let r=f.draw();
assert.equal(r.id,'crown');assert.equal(r.repeated,false);assert.equal(f.state.atlas.duplicateStreak,0);
assert.equal(f.state.atlas.repeats,0);assert.equal(f.state.atlas.discovered.length,6);
assert.equal(f.state.atlas.claimed.length,1);assert.equal(f.state.atlas.claimed[0],'deep');
assert.equal(r.bonus,600);assert.equal(f.events[0][1].protectedDraw,true);
f=fixture(['bloom','pearl'],5,0);r=f.draw();
assert.equal(r.repeated,true);assert.equal(r.bonus,45);assert.equal(f.state.atlas.duplicateStreak,6);
r=f.draw();assert.equal(r.repeated,false);assert.equal(f.state.atlas.duplicateStreak,0);
assert.equal(f.state.atlas.repeats,1);assert.equal(f.state.atlas.discovered.length,3);
f=fixture(['bloom','pearl'],2,0.99);r=f.draw();
assert.equal(r.repeated,false);assert.equal(f.state.atlas.duplicateStreak,0);
f=fixture(['bloom','pearl','kite','lantern','key','crown'],6,0);
r=f.draw();assert.equal(r.repeated,true);assert.equal(r.bonus,45);
assert.equal(f.state.atlas.claimed.length,0);assert.equal(f.events[0][1].protectedDraw,false);
// Completed collections must not advertise nonexistent new relics or an active pity guarantee.
const atlasRender = source.slice(source.indexOf('  function renderAtlas(){'), source.indexOf('  function renderAtlas(){') + 2300);
assert.match(atlasRender, /owned===allRelics\.length[\s\S]*?Atlas complete!/);
assert.match(atlasRender, /Future eligible relic draws are duplicates worth 45 bonus shards/);
assert.match(atlasRender, /there are no undiscovered relics left/);
assert.match(atlasRender, /:.*Next draw:.*chance of a new relic/);
console.log('PASS: production Atlas six-duplicate guarantee, threshold, reset, rewards and completed collection');
