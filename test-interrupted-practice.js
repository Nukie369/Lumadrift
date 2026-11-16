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
assert.match(source, /state\.end=\{title:'Flight interrupted',description:interrupted\.message,icon:'🛟',earned:0,relic:null,practice:interrupted\.practice\}/);
console.log('Interrupted Practice recovery: 6 cases passed');
