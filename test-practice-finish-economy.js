'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('game.js', 'utf8');
const match = source.match(/  function finish\(success,crashed\)\{[\s\S]*?\}\n  function claimDaily\(/);
assert.ok(match, 'finish implementation exists');
const finishSource = match[0].slice(0, -'\n  function claimDaily('.length);
const state = {energy:0,credits:275,total:100,best:80,xp:42,wins:3,dailyProgress:{key:'2026-11-14',launches:2,jumps:4,banked:100,claimed:['launches']},atlas:{discovered:['a'],claimed:[],repeats:1}};
let run = null;
const events = [];
const context = {state,nf:new Intl.NumberFormat('en-US'),beep(){},revealRelic(){throw Error('Practice must not reveal relics');},addMissionStat(){throw Error('Practice must not advance missions');},track(type,data){events.push({type,...data});},sceneMessage(){},updateScene(){},renderHeader(){},renderAtlas(){},save(){},markFlight(){}};
vm.createContext(context);
vm.runInContext('let run=null;'+finishSource+';globalThis.testFinish=(flight,success,crashed)=>{run=flight;finish(success,crashed);return run;}',context);
const before=JSON.stringify({energy:state.energy,credits:state.credits,total:state.total,best:state.best,xp:state.xp,wins:state.wins,dailyProgress:state.dailyProgress,atlas:state.atlas});
for(const [i,crashed] of [false,true].entries()){
  run={practice:true,cargo:250+i*100,depth:3,hull:crashed?0:2};
  assert.equal(context.testFinish(run,!crashed,crashed),null,'flight ends');
  assert.equal(state.end.earned,0,'practice earns nothing');
  assert.equal(state.end.relic,null,'practice has no relic');
  assert.equal(JSON.stringify({energy:state.energy,credits:state.credits,total:state.total,best:state.best,xp:state.xp,wins:state.wins,dailyProgress:state.dailyProgress,atlas:state.atlas}),before,'practice preserves economy and missions');
}
assert.equal(events.length,2);
assert.ok(events.every(e=>e.practice===true&&e.earned===0));
console.log('Practice finish: success and crash preserve fuel, wallet, XP, missions and relics');
