"""Exercise both game entry points on isolated localhost with an installed Chromium."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from run_browser_check import run

parser = argparse.ArgumentParser()
parser.add_argument('--browser', default='chromium')
args = parser.parse_args()
handler = functools.partial(SimpleHTTPRequestHandler, directory=Path(__file__).resolve().parent)
with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    for page in ('browser-colony-check.html', 'test-mobile.html'):
        url = f'http://127.0.0.1:{server.server_port}/{page}'
        result = run(args.browser, 35, url)
        print(page, 'attempt 1', result, flush=True)
        # Hosted Chromium occasionally stalls before the test page loads. Retry only
        # infrastructure timeouts, never gameplay assertion failures.
        if result['status'] == 'TIMEOUT':
            result = run(args.browser, 50, url)
            print(page, 'timeout retry', result, flush=True)
        if result['status'] != 'PASS':
            raise SystemExit(1)
