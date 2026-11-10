const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('game.js','utf8');
const section=src.slice(src.indexOf('  function renderColonyFunding(){'),src.indexOf('  function renderColony(){'));
assert.match(section,/funding\.hidden=false;[\s\S]*funding\.setAttribute\('aria-label'/);
assert.match(section,/milestone\.dataset\.ready='complete';\s*funding\.hidden=true;\s*funding\.removeAttribute\('aria-label'\);\s*funding\.value=0;/);
console.log('PASS: completed colony resets hidden funding meter and stale accessible description');
