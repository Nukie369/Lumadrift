const assert=require('node:assert/strict');const fs=require('node:fs');
const js=fs.readFileSync('game.js','utf8'),css=fs.readFileSync('polish.css','utf8');
const ids=['bloom','array','observatory','port'];
for(const id of ids){assert.match(js,new RegExp("id:'"+id+"',name:"));assert.ok(css.includes('.colony-marker.landmark-'+id));}
assert.ok(js.includes('landmark-${def.id}'));assert.ok(css.includes('prefers-reduced-motion:reduce'));
assert.ok(css.includes('.colony-marker.built .marker-icon::before'));
console.log('PASS: all four distinct landmark themes and reduced-motion fallback');
