const assert=require('node:assert/strict');const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');const js=fs.readFileSync('game.js','utf8');
assert.match(html,/<label for="colony-funding-progress" id="colony-funding-label">Available shards toward next landmark<\/label>/);
assert.match(js,/shards currently available \(\$\{percentage\}% of construction cost\); shards are not reserved/);
assert.match(js,/funding\.hidden=true/);
assert.match(js,/funding\.value=saved/);
assert.doesNotMatch(js,/construction funding:/);
console.log('Accessible funding language and completion state passed');
