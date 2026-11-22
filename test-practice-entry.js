'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const game = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');

// A returning free player must find Practice before running out of fuel.
assert.match(html, /id="practice-btn"[^>]*>PRACTICE FLIGHT • FREE • NO REWARDS<\/button>/);
assert.match(html, /id="practice-disclosure"[^>]*>Practice is always free\. It awards no shards, relics, or mission progress; fuel is not spent\./);
assert.match(html, /id="practice-btn"[^>]*aria-label="[^"]*No fuel spent and no rewards earned\./);

// Practice must launch explicitly, not through the fuel-consuming standard path.
assert.match(game, /\$\('practice-btn'\)\.addEventListener\('click',\(\)=>launch\(true\)\)/);
// Replay preserves the player's chosen mode if fuel regenerates while results are open.
assert.match(game, /const selectedPractice=\$\('again-btn'\)\.dataset\.replayMode==='practice'/);
assert.match(game, /if\(!selectedPractice&&state\.energy<=0\)/);
assert.match(game, /launch\(selectedPractice\)/);
console.log('Practice entry and replay disclosure contracts passed');
