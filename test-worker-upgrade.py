"""Exercise the v15 stale cache, release upgrades, and offline rollback in one profile."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
from threading import Thread

from playwright.sync_api import sync_playwright
from version_sw import ROOT, stamp


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        # A new worker must fetch fresh assets even with a warm HTTP cache.
        if self.path.endswith('game.js'):
            self.send_header('Cache-Control', 'public, max-age=86400')
        super().end_headers()


def run(browser, temp):
    site = temp / 'site'
    game = site / 'game'
    game.mkdir(parents=True)
    (site / 'observer.html').write_text('<title>Worker lifecycle observer</title>')
    for pattern in ('assets', '*.css', 'index.html', 'manifest.webmanifest', 'icon.svg'):
        for asset in ROOT.glob(pattern):
            if asset.is_dir():
                shutil.copytree(asset, game / asset.name)
            else:
                shutil.copyfile(asset, game / asset.name)

    base = (ROOT / 'game.js').read_text(encoding='utf-8')

    def release(label, legacy=False):
        (game / 'game.js').write_text(base + f"\ndocument.body.dataset.release = '{label}';",
                                      encoding='utf-8')
        source = ROOT / ('tests/fixtures/sw-v15.js' if legacy else 'sw.js')
        shutil.copyfile(source, game / 'sw.js')
        if not legacy:
            stamp(game)

    release('A', legacy=True)
    handler = partial(Handler, directory=site)
    with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server, sync_playwright() as pw:
        Thread(target=server.serve_forever, daemon=True).start()
        origin = f'http://127.0.0.1:{server.server_port}'
        context = pw.chromium.launch_persistent_context(str(temp / 'profile'),
                                                        executable_path=browser)
        context.set_default_timeout(15000)
        observer = context.new_page()
        observer.goto(origin + '/observer.html')

        def open_game(label, entry=""):
            page = context.new_page()
            page.goto(origin + '/game/' + entry)
            assert page.locator('body').get_attribute('data-release') == label, label
            return page

        def activate_release(page, current, target):
            page.evaluate('async () => { await (await navigator.serviceWorker.ready).update() }')
            page.wait_for_function('async () => !!(await navigator.serviceWorker.ready).waiting')
            assert page.locator('body').get_attribute('data-release') == current
            assert page.evaluate("""async () => (await (await fetch('game.js')).text())
                                  .includes("dataset.release = '" + document.body.dataset.release + "'")""")
            page.close()
            observer.wait_for_function("""async () => {
              const reg = await navigator.serviceWorker.getRegistration('/game/');
              return reg?.active?.state === 'activated' && !reg.waiting && !reg.installing;
            }""")
            page = open_game(target)
            assert page.locator('#credits').inner_text() == credits, 'Saved reward lost on upgrade'
            return page

        page = open_game('A')
        page.wait_for_function('!!navigator.serviceWorker.controller')
        page.locator('#daily-btn').evaluate('button => button.click()')
        credits = page.locator('#credits').inner_text()
        assert int(credits.replace(',', '')) > 150, 'Daily reward must change the saved balance'
        release('stale-control', legacy=True)
        page.evaluate('async () => { await (await navigator.serviceWorker.ready).update() }')
        page.close()
        page = open_game('A')
        print('Reproduced v15: reopening ran A after the origin published new game.js', flush=True)

        for current, target in [('A', 'B'), ('B', 'C')]:
            release(target)
            page = activate_release(page, current, target)
            print(f'{current} to {target}: new code and original credits on reopen', flush=True)

        release('D')
        (game / 'assets/relic-key.svg').unlink()
        # Observe the installing worker before requesting the update so a fast 404 is captured.
        page.evaluate("""async () => {
          const reg = await navigator.serviceWorker.ready;
          window.failedInstall = false;
          reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            worker.addEventListener('statechange', () => {
              if (worker.state === 'redundant') window.failedInstall = true;
            });
          }, {once: true});
          await reg.update();
        }""")
        page.wait_for_function('window.failedInstall')
        page.close()
        server.shutdown()
        context.set_offline(True)
        for entry in ('', '?source=return', 'index.html'):
            page = open_game('C', entry)
            assert page.locator('#credits').inner_text() == credits, f'Saved reward lost at {entry}'
            page.close()
        page = open_game('C', 'index.html?source=home')
        assert page.locator('#credits').inner_text() == credits, 'Saved reward lost on offline launch'
        assert page.evaluate("""async () => (await fetch('assets/relic-key.svg')).ok""")
        page.locator('#practice-btn').click()
        page.locator('#routes button').first.click()
        assert page.locator('#jump').inner_text().startswith('2'), 'Offline flight did not advance'
        print('Failed D install: reopened C offline, loaded artwork, kept credits, flew a route')
        # Retry the exact failed worker once the missing file returns.
        shutil.copyfile(ROOT / 'assets/relic-key.svg', game / 'assets/relic-key.svg')
        Thread(target=server.serve_forever, daemon=True).start()
        context.set_offline(False)
        page = activate_release(page, 'C', 'D')
        page.close()
        server.shutdown()
        context.set_offline(True)
        page = open_game('D', 'index.html')
        assert page.locator('#credits').inner_text() == credits, 'Lost credits after retry'
        assert page.evaluate("async () => (await fetch('assets/relic-key.svg')).ok")
        print('Repaired D: same worker retried successfully and reopened offline with saved credits')
        context.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', default='chromium')
    args = parser.parse_args()
    with TemporaryDirectory() as directory:
        run(shutil.which(args.browser) or args.browser, Path(directory))
