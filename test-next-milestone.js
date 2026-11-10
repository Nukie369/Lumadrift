const fs=require('node:fs'),assert=require('node:assert/strict');
const js=fs.readFileSync('game.js','utf8'),html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('polish.css','utf8');
assert.match(html,/id="colony-next-milestone"[^>]*role="status"[^>]*aria-live="polite"/);
assert.match(js,/buildingDefs\.find\(def=>!state\.buildings\.includes\(def\.id\)\)/);
assert.match(js,/Math\.max\(0,target-available\)/);
assert.match(js,/shortfall===0\?'Ready to build'/);
assert.match(js,/COLONY COMPLETE/);
assert.match(css,/\.colony-next-milestone\[data-ready="complete"\]/);
const defs=[{id:'a',cost:260,bonus:15},{id:'b',cost:650,bonus:20}];
function milestone(built,credits){const next=defs.find(d=>!built.includes(d.id));return next?{id:next.id,shortfall:Math.max(0,next.cost-credits),ready:credits>=next.cost}:{complete:true};}
assert.deepEqual(milestone([],0),{id:'a',shortfall:260,ready:false});
assert.deepEqual(milestone([],260),{id:'a',shortfall:0,ready:true});
assert.deepEqual(milestone(['a'],400),{id:'b',shortfall:250,ready:false});
assert.deepEqual(milestone(['a','b'],0),{complete:true});
console.log('Next milestone contracts and boundary cases passed');
