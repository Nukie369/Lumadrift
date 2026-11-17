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
assert.match(source, /state\.end=\{title:'Flight interrupted',description:interrupted\.message,icon:'🛟',earned:0,relic:null,practice:interrupted\.practice\}/);
console.log('Interrupted Practice recovery: 9 cases passed');
