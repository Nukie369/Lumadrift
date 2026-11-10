const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const js = fs.readFileSync(__dirname + '/game.js', 'utf8');
const forecast = js.slice(js.indexOf('  function renderFlightForecast'), js.indexOf('  const lanes='));
const label = {};
function describe(run) {
  vm.runInNewContext(forecast + '\nrenderFlightForecast();', {run, nf: new Intl.NumberFormat('en-US'), $: () => label});
  return label.textContent;
}
const final = describe({depth: 4, hull: 2, cargo: 101, practice: false});
assert.match(final, /after a hit: 75 ✦/);
assert.match(final, /120-shard beacon bonus/);
const fatal = describe({depth: 4, hull: 1, cargo: 101, practice: true});
assert.match(fatal, /storm ends this flight/);
assert.match(fatal, /after a hit: 0 ✦/);
assert.doesNotMatch(fatal, /bonus/);
