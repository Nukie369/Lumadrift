const fs=require('node:fs');const assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
assert.match(src,/Claims reset at local midnight/);
assert.match(src,/missing a day restarts at Day 1/);
assert.match(src,/7-day cycle repeats/);
assert.match(src,/Colony buildings add a permanent bonus/);
assert.match(src,/dailyClaim===today/);
assert.match(src,/dist===1\?\(state.dailyStreak%7\)\+1:1/);
console.log('PASS: daily reward terms reflect reset, rollover, streak and colony rules');
