#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node --check game.js
node --check sw.js
python3 version_sw.py
python3 version_sw.py --check
python3 build_standalone.py
python3 - <<'PY'
from pathlib import Path
p=Path('luma-drift-standalone-v8.2.html')
assert p.exists() and p.stat().st_size > 100000
print('Standalone artifact:',p.stat().st_size,'bytes')
PY
node - <<'NODE'
const assert = require('node:assert/strict');
const { report } = require('./simulate-atlas');
const a = report(10000), b = report(10000);
assert.deepEqual(a, b, 'Atlas pacing simulation must be reproducible');
for (const set of ['skyward', 'deep', 'both']) {
  assert(a[set].median >= 1 && a[set].p90 >= a[set].median);
  assert(a[set].p90 <= 40, `${set} exceeds the 40-flight collection pacing guardrail`);
}
console.log('Atlas pacing simulation verified:', JSON.stringify(a));
NODE
count=0
failures=0
for test in test-*.js; do
  if ! output=$(node "$test" 2>&1); then
    printf 'FAIL: %s\n%s\n' "$test" "$output" >&2
    failures=$((failures+1))
  fi
  count=$((count+1))
done
printf 'Completed %s Node regression scripts; failures: %s\n' "$count" "$failures"
if (( failures > 0 )); then exit 1; fi
