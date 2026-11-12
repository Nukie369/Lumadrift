const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/game.js', 'utf8');
const declaration = source.match(/const candidates=\[[^\n]+\];\s*const winner=[^\n]+;/);
assert.ok(declaration, 'save-recovery selection logic must be present');
function choose(primary, pending, backup) {
  const context = {committed: primary, pending, backup};
  return vm.runInNewContext(`${declaration[0]} winner.source`, context);
}
const checkpoint = revision => revision === null ? null : {saveRevision: revision};
assert.equal(choose(checkpoint(4), checkpoint(4), checkpoint(3)), 'primary', 'committed save wins ties with journal');
assert.equal(choose(checkpoint(3), checkpoint(4), checkpoint(2)), 'pending', 'newer pending journal is recovered');
assert.equal(choose(checkpoint(4), checkpoint(3), checkpoint(4)), 'primary', 'committed save wins ties with backup');
assert.equal(choose(null, null, checkpoint(2)), 'backup', 'backup restores when others are missing');
console.log('PASS: save-recovery revision precedence');
