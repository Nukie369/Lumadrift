"""Stamp the static service worker before publishing changes to the game shell."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent


def stamp(root, check=False):
    worker = root / 'sw.js'
    source = worker.read_text(encoding='utf-8')
    assets = json.loads(source.split('const ASSETS = ', 1)[1].split(';', 1)[0])
    digest = sha256()
    for url in sorted(assets):
        content = (root / ('index.html' if url == './' else url)).read_bytes()
        digest.update(url.encode() + b'\0' + sha256(content).digest())
    version = f"const CACHE = 'luma-drift-{digest.hexdigest()[:24]}';"
    updated, count = re.subn(r"^const CACHE = 'luma-drift-[0-9a-f]+';$", version,
                             source, flags=re.MULTILINE)
    if count != 1:
        raise ValueError('Expected one generated CACHE declaration in sw.js')
    if updated != source:
        if check:
            raise SystemExit('Stale sw.js. Run python3 version_sw.py and commit sw.js.')
        worker.write_text(updated, encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    stamp(ROOT, parser.parse_args().check)
