const fs=require('node:fs');const assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
assert.match(src,/i===next&&!already\?'next'/,'claimed days must not look claimable');
assert.match(src,/box\.setAttribute\('aria-label'/,'reward cells must have accessible amounts');
assert.match(src,/box\.setAttribute\('aria-current','step'\)/,'available day must be identified');
assert.match(src,/already&&i===state\.dailyStreak\?'claimed'/,'claimed day must remain highlighted');
console.log('PASS: daily streak accessibility and claim state');
