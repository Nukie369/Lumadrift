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
