'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('game.js', 'utf8');
const match = source.match(/  function renderReplayChoice\(\)\{[^\n]+\}/);
assert.ok(match, 'replay-choice renderer exists');
const button = {textContent:'', dataset:{}, attributes:{}, setAttribute(k,v){this.attributes[k]=v;}, getAttribute(k){return this.attributes[k]??null;}};
const state = {energy:0,energyAt:Date.now(),end:{id:1}};
const context = {state, Date, $: id => id === 'again-btn' ? button : null, replayChoiceEnd:null};
vm.runInNewContext(`${match[0]}; renderReplayChoice();`, context);
assert.match(button.textContent,/PRACTICE FREE.*NO REWARDS/);
assert.equal(button.dataset.replayMode,'practice');
assert.match(button.attributes['aria-label'],/zero fuel required/);
assert.match(button.attributes['aria-label'],/no rewards or mission progress/);
state.energy=1;
vm.runInNewContext('renderReplayChoice()',context);
assert.equal(button.dataset.replayMode,'practice','recharge preserves Practice on same results screen');
state.end={id:2};
vm.runInNewContext('renderReplayChoice()',context);
assert.equal(button.dataset.replayMode,'standard');
assert.match(button.textContent,/FLY AGAIN/);
assert.match(button.attributes['aria-label'],/uses one fuel and awards expedition rewards/);
state.energy=0;
vm.runInNewContext('renderReplayChoice()',context);
assert.equal(button.dataset.replayMode,'practice');
assert.equal(state.energy,0,'rendering must not consume fuel');
const noButton = {state, $:()=>null, replayChoiceEnd:null};
assert.doesNotThrow(()=>vm.runInNewContext(match[0]+'; renderReplayChoice();',noButton));
console.log('Replay choice: zero fuel, recharge, depletion, and missing DOM pass');

const handlerMatch = source.match(/\$\('again-btn'\)\.addEventListener\('click',(\(\)=>\{.*?\})\);\$\('end-hangar-btn'\)/s);
assert.ok(handlerMatch, 'results-screen replay handler exists');
function replayScenario(mode, before, after, expectedLaunch, warned) {
  const events=[];
  const save={energy:before,end:{earned:42}};
  const btn={dataset:{replayMode:mode}};
  const env={
    state:save, $:()=>btn,
    regen:()=>{save.energy=after;events.push('regen');},
    renderReplayChoice:()=>events.push('rerender'),
    notify:()=>events.push('warning'),
    launch:practice=>events.push('launch:'+practice)
  };
  vm.runInNewContext(handlerMatch[1],env)();
  assert.equal(events[0],'regen');
  assert.equal(events.find(x=>x.startsWith('launch:'))??null,expectedLaunch);
  assert.equal(events.includes('warning'),warned);
  assert.equal(save.end.earned,42,'banked cargo must not be credited twice');
}
replayScenario('practice',0,0,'launch:true',false);
replayScenario('practice',0,1,'launch:true',false);
replayScenario('standard',0,1,'launch:false',false);
replayScenario('standard',1,0,null,true);
console.log('Results-screen replay: zero fuel, recharge, and depleted fuel pass');
