const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('browser-colony-check.html','utf8');
assert.match(src,/<iframe id="game" src="about:blank"/);
const seed=src.indexOf("localStorage.setItem('luma_drift_save_v2'");
const navigate=src.indexOf("frame.src='index.html?initial=1'");
assert.ok(seed>=0&&navigate>seed,'save must be seeded before navigation');
assert.match(src,/if\(frame.getAttribute\('src'\)==='about:blank'\)return/);
console.log('PASS: browser fixture seeded before game navigation');
