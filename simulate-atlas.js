// Deterministic Star Atlas collection pacing simulation (eligible relic flights only).
// Mirrors the six weights and six-duplicate protection in game.js.
'use strict';
const assert = require('node:assert/strict');
const relics = [
  { id: 'bloom', set: 'skyward', weight: 26 },
  { id: 'pearl', set: 'skyward', weight: 20 },
  { id: 'kite', set: 'skyward', weight: 14 },
  { id: 'lantern', set: 'deep', weight: 20 },
  { id: 'key', set: 'deep', weight: 13 },
  { id: 'crown', set: 'deep', weight: 7 }
];
function simulate(seed, protection = 6) {
  let rng = seed >>> 0;
  const random = () => { rng = (Math.imul(1664525, rng) + 1013904223) >>> 0; return rng / 4294967296; };
  const discovered = new Set(), completion = {};
  let duplicates = 0;
  for (let flight = 1; flight <= 10000; flight++) {
    const missing = relics.filter(r => !discovered.has(r.id));
    const pool = duplicates >= protection && missing.length ? missing : relics;
    let roll = random() * pool.reduce((sum, r) => sum + r.weight, 0);
    const relic = pool.find(r => (roll -= r.weight) < 0) || pool[pool.length - 1];
    if (discovered.has(relic.id)) duplicates = Math.min(protection, duplicates + 1);
    else { discovered.add(relic.id); duplicates = 0; }
    for (const set of ['skyward', 'deep'])
      if (!completion[set] && relics.filter(r => r.set === set).every(r => discovered.has(r.id))) completion[set] = flight;
    if (completion.skyward && completion.deep) return completion;
  }
  throw new Error('Collection failed to finish within 10,000 eligible flights');
}
function percentile(sorted, p) { return sorted[Math.ceil(sorted.length * p) - 1]; }
function report(trials = 10000, protection = 6) {
  assert(Number.isInteger(trials) && trials > 0);
  const samples = { skyward: [], deep: [], both: [] };
  for (let i = 1; i <= trials; i++) {
    const result = simulate(i, protection);
    samples.skyward.push(result.skyward);
    samples.deep.push(result.deep);
    samples.both.push(Math.max(result.skyward, result.deep));
  }
  const summary = {};
  for (const [set, values] of Object.entries(samples)) {
    values.sort((a, b) => a - b);
    summary[set] = { median: percentile(values, 0.5), p90: percentile(values, 0.9) };
    assert(summary[set].p90 >= summary[set].median);
  }
  return summary;
}
if (require.main === module) {
  const protectedPacing = report();
  const unprotectedPacing = report(10000, Infinity);
  for (const set of ['skyward', 'deep', 'both']) {
    assert(protectedPacing[set].p90 < unprotectedPacing[set].p90, `${set}: duplicate protection must reduce 90th-percentile completion time`);
  }
  console.log(JSON.stringify({ protectedPacing, unprotectedPacing }, null, 2));
}
module.exports = { simulate, report };
