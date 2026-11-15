'use strict';
// Guard the results-screen mobile replay path against stale fuel state.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const game = fs.readFileSync(require('node:path').join(__dirname, 'game.js'), 'utf8');
const click = game.match(/\$\('again-btn'\)\.addEventListener\('click',\(\)=>\{([^\n]+?)\}\);/);
assert.ok(click, 'results-screen replay click handler exists');
assert.match(click[1], /dataset\.replayMode==='practice'/,
  'replay honors the mode displayed at tap time');
assert.match(click[1], /regen\(\);if\(!selectedPractice&&state\.energy<=0\)\{renderReplayChoice\(\);notify\(/,
  'standard replay refreshes the choice rather than silently launching Practice if fuel disappears');
assert.match(click[1], /launch\(selectedPractice\)/,
  'replay launches the explicitly selected mode');
const launch = game.match(/function launch\(practice=false\)\{([\s\S]*?)\}\s*function fly\(/);
assert.ok(launch, 'flight launch implementation exists');
assert.match(launch[1], /regen\(\);\s*ensureDay\(\);\s*if\(!practice\)\{if\(state\.energy<=0\)/,
  'standard launch independently rechecks the fuel balance');
assert.match(launch[1], /else state\.runs\+=0;state\.end=null;run=/,
  'practice can start directly from results without consuming fuel or counting a run');
assert.match(game, /PRACTICE FREE • NO REWARDS/,
  'results-screen practice choice discloses no rewards');
console.log('PASS results-screen replay checks displayed choice, live fuel, and reward disclosure');
