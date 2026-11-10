const fs=require('node:fs'),assert=require('node:assert/strict');
const js=fs.readFileSync('game.js','utf8'),html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('polish.css','utf8');
assert.match(html,/<progress id="colony-funding-progress" max="100" value="0"><\/progress>/);
assert.match(js,/function colonyFunding\(credits,cost\)/);
assert.match(js,/funding\.max=next\.cost/);
assert.match(js,/funding\.value=saved/);
assert.match(js,/funding\.hidden=true/);
assert.match(js,/funding\.setAttribute\('aria-label'/);
assert.match(css,/progress\[hidden\]\{display:none\}/);
function funding(credits,cost){return {saved:Math.min(cost,Math.max(0,credits)),pct:Math.round(Math.min(cost,Math.max(0,credits))/cost*100)}}
assert.deepEqual(funding(0,260),{saved:0,pct:0});
assert.deepEqual(funding(130,260),{saved:130,pct:50});
assert.deepEqual(funding(260,260),{saved:260,pct:100});
assert.deepEqual(funding(999,260),{saved:260,pct:100});
console.log('Colony funding meter contracts and boundary cases passed');
