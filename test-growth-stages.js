const fs=require('node:fs');const assert=require('node:assert/strict');
const js=fs.readFileSync('game.js','utf8'),css=fs.readFileSync('polish.css','utf8');
assert.match(js,/world\.dataset\.growth=String\(state\.buildings\.length\)/);
for(const stage of [0,1,2,3,4])assert.match(css,new RegExp('\\.colony-world\\[data-growth="'+stage+'"\\]'));
assert.match(css,/data-growth="0"\] \.colony-marker\.locked/);
assert.match(css,/data-growth="4"\] \.colony-marker\.built/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
console.log('Saved-state colony growth stage contracts passed');
