const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('game.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert.match(js,/Math\.min\(target,available\)/,'available shards capped at construction cost');
assert.match(js,/\$\{percentage\}% of cost available/,'label must not imply shards reserved');
assert.doesNotMatch(js,/\$\{percentage\}% funded/,'misleading funded terminology removed');
assert.match(html,/Spend virtual shards earned from exploration/);
console.log('PASS funding clarity: available balance, not escrow or reserved funds');
