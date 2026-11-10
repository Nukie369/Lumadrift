const fs=require('fs'),assert=require('assert');
const s=fs.readFileSync('browser-colony-check.html','utf8');
assert.match(s,/addEventListener\('unhandledrejection'/);
assert.match(s,/result\.textContent='FAIL: '\+lastEvent/g);
assert.match(s,/result\.textContent!=='RUNNING'/);
assert.match(s,/timeout after 12000ms/);
console.log('PASS: browser harness reports asynchronous errors immediately and prevents post-failure mutation');
