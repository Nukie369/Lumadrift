'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('game.js','utf8');
const match=source.match(/  function finish\(success,crashed\)\{[\s\S]*?\}\n  function claimDaily\(/);
assert.ok(match,'finish implementation exists');
const finishSource=match[0].slice(0,-'\n  function claimDaily('.length);
for(const scenario of [
 {name:'banked exit',success:false,crashed:false,practice:false,depth:1,cargo:75,earned:75,xp:15,wins:1},
 {name:'beacon bonus',success:true,crashed:false,practice:false,depth:1,cargo:75,earned:195,xp:15,wins:1},
 {name:'storm loss',success:false,crashed:true,practice:false,depth:1,cargo:75,earned:0,xp:15,wins:0},
 {name:'free practice',success:true,crashed:false,practice:true,depth:1,cargo:75,earned:0,xp:0,wins:0},
]){
 const state={energy:0,credits:200,total:500,best:250,xp:40,wins:2,dailyProgress:{banked:500}};
 let saves=0,events=0;
 const context={state,nf:new Intl.NumberFormat('en-US'),beep(){},revealRelic(){throw Error('Unexpected relic');},addMissionStat(key,amount){state.dailyProgress[key]=(state.dailyProgress[key]||0)+amount;},track(type){if(type==='finish')events++;},sceneMessage(){},updateScene(){},renderHeader(){},renderAtlas(){},save(){saves++;},markFlight(){}};
 vm.createContext(context);
 vm.runInContext('let run=null;'+finishSource+';globalThis.complete=(flight,success,crashed)=>{run=flight;finish(success,crashed)};globalThis.repeat=()=>finish(false,false)',context);
 context.complete({practice:scenario.practice,cargo:scenario.cargo,depth:scenario.depth,hull:2},scenario.success,scenario.crashed);
 assert.equal(state.credits,200+scenario.earned,scenario.name+' credits');
 assert.equal(state.total,500+scenario.earned,scenario.name+' total');
 assert.equal(state.dailyProgress.banked,500+(scenario.wins?scenario.earned:0),scenario.name+' mission');
 assert.equal(state.xp,40+scenario.xp,scenario.name+' xp');
 assert.equal(state.wins,2+scenario.wins,scenario.name+' wins');
 assert.equal(state.energy,0,scenario.name+' fuel');
 const snapshot=JSON.stringify(state);
 context.repeat();
 assert.equal(JSON.stringify(state),snapshot,scenario.name+' cannot finish twice');
 assert.equal(events,1,scenario.name+' one event');
 assert.equal(saves,1,scenario.name+' one save');
}
console.log('Four finish outcomes preserve economy and cannot award twice');
// Star Atlas eligibility is per flight: early banking must explain the reset,
// while two crossings award exactly one relic and never award it twice.
for (const depth of [0, 1, 2]) {
 const state={energy:0,credits:100,total:100,best:0,xp:0,wins:0,dailyProgress:{banked:0}};
 let draws=0, saves=0;
 const context={state,nf:new Intl.NumberFormat('en-US'),beep(){},
  revealRelic(){draws++;return {id:'bloom',bonus:15,repeated:false,rarity:'COMMON'};},
  addMissionStat(key,amount){state.dailyProgress[key]=(state.dailyProgress[key]||0)+amount;},
  track(){},sceneMessage(){},updateScene(){},renderHeader(){},renderAtlas(){},
  save(){saves++;},markFlight(){}};
 vm.createContext(context);
 vm.runInContext('let run=null;'+finishSource+';globalThis.complete=(flight)=>{run=flight;finish(false,false)};globalThis.repeat=()=>finish(false,false)',context);
 context.complete({practice:false,cargo:40,depth,hull:2});
 assert.equal(draws,depth>=2?1:0,'Atlas draw eligibility at depth '+depth);
 assert.equal(state.credits,140+(depth>=2?15:0),'banked cargo and relic bonus at depth '+depth);
 if(depth<2){
  assert.match(state.end.description,/next flight/i,'early bank explains next flight');
  assert.match(state.end.description,/two crossings/i,'early bank explains qualification');
  assert.match(state.end.description,new RegExp(depth+' crossing'),'early bank shows actual crossings');
 }else assert.equal(state.end.relic.id,'bloom','qualifying bank reveals relic');
 const snapshot=JSON.stringify(state);
 context.repeat();
 assert.equal(JSON.stringify(state),snapshot,'no duplicate payout at depth '+depth);
 assert.equal(draws,depth>=2?1:0,'no duplicate relic draw at depth '+depth);
 assert.equal(saves,1,'exactly one save at depth '+depth);
}
console.log('Atlas banking at 0, 1 and 2 crossings preserves eligibility and one-time rewards');
