'use strict';
// Guard the results-screen mobile replay path against stale fuel state.
// Source-level contract: the click handler must regenerate fuel before choosing
// Practice versus a paid-fuel expedition, and launch must recheck availability.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const game = fs.readFileSync(require('node:path').join(__dirname, 'game.js'), 'utf8');
const click = game.match(/\$\('again-btn'\)\.addEventListener\('click',\(\)=>\{([^}]+)\}\);/);
assert.ok(click, 'results-screen replay click handler exists');
assert.match(click[1], /regen\(\);\s*launch\(state\.energy\s*<=\s*0\)/,
  'replay regenerates fuel and uses the current energy value');
const launch = game.match(/function launch\(practice=false\)\{([\s\S]*?)\}\s*function fly\(/);
assert.ok(launch, 'flight launch implementation exists');
assert.match(launch[1], /regen\(\);\s*ensureDay\(\);\s*if\(!practice\)\{if\(state\.energy<=0\)/,
  'standard launch independently rechecks the fuel balance');
assert.match(launch[1], /else state\.runs\+=0;state\.end=null;run=/,
  'practice can start directly from results without consuming fuel or counting a run');
assert.match(game, /PRACTICE FREE • NO REWARDS/,
  'results-screen practice choice discloses no rewards');
console.log('PASS results-screen replay checks live fuel, zero-fuel Practice, and reward disclosure');
