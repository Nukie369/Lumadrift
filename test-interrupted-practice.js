'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, 'game.js'), 'utf8');
const start = source.indexOf('  function interruptedFlight(){');
const end = source.indexOf('\n  let run=null', start);
assert(start >= 0 && end > start, 'interrupted flight recovery function must exist');
const recovery = source.slice(start, end);
const now = Date.now();
function recover(record) {
  const items = new Map(record === null ? [] : [['flight', record]]);
  const store = {
    getItem(key) { return items.get(key) ?? null; },
    removeItem(key) { items.delete(key); }
  };
  const context = { localStorage: store, FLIGHT_STORAGE: 'flight', Date };
  const result = vm.runInNewContext(`${recovery}\ninterruptedFlight()`, context);
  assert.equal(items.has('flight'), false, 'recovery marker must be cleared');
  return result;
}
const practice = recover(JSON.stringify({started:now, practice:true, depth:3}));
assert.equal(practice.practice, true);
assert.match(practice.message, /practice flight/i);
assert.match(practice.message, /No virtual rewards/i);
const standard = recover(JSON.stringify({started:now, practice:false, depth:3}));
assert.equal(standard.practice, false);
assert.match(standard.message, /Unbanked virtual cargo/i);
assert.equal(recover(JSON.stringify({started:now-8*86400000, practice:true})), null);
assert.equal(recover('{broken'), null);
assert.equal(recover(null), null);
const future = recover(JSON.stringify({started:now+120000, practice:true}));
assert.equal(future, null, 'future-dated flight markers must be discarded');
const forged = recover(JSON.stringify({started:now, practice:'true', depth:3}));
assert.equal(forged.practice, false, 'only an explicit boolean true can mark Practice');
assert.match(forged.message, /Unbanked virtual cargo/i);
const saved = new Map([['save', JSON.stringify({credits:725, energy:0, dailyProgress:{launches:2}})], ['flight', JSON.stringify({started:now, practice:true})]]);
const store = {getItem:key=>saved.get(key)??null,removeItem:key=>saved.delete(key)};
const before = saved.get('save');
const isolated = vm.runInNewContext(`${recovery}\ninterruptedFlight()`, {localStorage:store,FLIGHT_STORAGE:'flight',Date});
assert.equal(isolated.practice, true);
assert.equal(saved.get('save'), before, 'interruption recovery must not alter saved wallet, fuel, or missions');
assert.equal(saved.has('flight'), false);
// A second boot must not resurrect an interrupted flight or duplicate any reward.
const once = new Map([['flight', JSON.stringify({started:now, practice:true, depth:2})]]);
const onceStore = {getItem:key=>once.get(key)??null,removeItem:key=>once.delete(key)};
const firstBoot = vm.runInNewContext(`${recovery}\ninterruptedFlight()`, {localStorage:onceStore,FLIGHT_STORAGE:'flight',Date});
const secondBoot = vm.runInNewContext(`${recovery}\ninterruptedFlight()`, {localStorage:onceStore,FLIGHT_STORAGE:'flight',Date});
assert.equal(firstBoot.practice, true);
assert.equal(secondBoot, null, 'interrupted Practice notice must be consumed exactly once');
assert.match(source, /state\.end=\{title:'Flight interrupted',description:interrupted\.message,icon:'🛟',earned:0,relic:null,practice:interrupted\.practice\}/);

// A crashed standard expedition must discard unbanked cargo without touching
// already banked rewards or granting the abandoned cargo on later launches.
const banked = new Map([
  ['save', JSON.stringify({credits:930, energy:2, dailyProgress:{launches:4, banked:780}})],
  ['flight', JSON.stringify({started:now, practice:false, depth:4, cargo:9000})]
]);
const bankedStore = {getItem:key=>banked.get(key)??null,removeItem:key=>banked.delete(key)};
const bankedBefore = banked.get('save');
const abandoned = vm.runInNewContext(`${recovery}\ninterruptedFlight()`, {localStorage:bankedStore,FLIGHT_STORAGE:'flight',Date});
assert.equal(abandoned.practice, false);
assert.match(abandoned.message, /Unbanked virtual cargo was not awarded/);
assert.equal(banked.get('save'), bankedBefore, 'abandoned cargo must not change previously banked rewards');
assert.equal(banked.has('flight'), false, 'abandoned cargo marker must be consumed');
assert.equal(vm.runInNewContext(`${recovery}\ninterruptedFlight()`, {localStorage:bankedStore,FLIGHT_STORAGE:'flight',Date}), null);
console.log('Interrupted Practice recovery: 10 cases passed');
