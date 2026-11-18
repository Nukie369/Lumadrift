"""Mobile-emulated touchscreen smoke; not Android hardware validation."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import argparse
import shutil
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--browser', default='google-chrome')
args = parser.parse_args()
with ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=Path(__file__).resolve().parent)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as pw:
        browser_path = shutil.which(args.browser)
        if not browser_path:
            raise RuntimeError(f'Browser executable not found on PATH: {args.browser}')
        browser = pw.chromium.launch(executable_path=browser_path)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = context.new_page()
        page.goto(f'http://127.0.0.1:{server.server_port}/luma-drift-standalone-v8.2.html')
        page.wait_for_selector('#practice-btn')
        page.evaluate("""() => {
          Object.defineProperty(crypto, 'getRandomValues', {configurable: true, value: a => {a.fill(0xffffffff); return a;}});
        }""")
        def touch(selector):
            el = page.locator(selector).first
            el.scroll_into_view_if_needed()
            box = el.bounding_box()
            assert box and box['width'] >= 44 and box['height'] >= 44, f'Undersized touch target: {selector}'
            assert el.is_visible() and el.is_enabled(), f'Unavailable touch target: {selector}'
            # A large control may have an overlapping badge at its center.
            # Find a genuinely hittable point rather than bypassing touch input.
            hit_test = """([x, y, target]) => {
              const hit = document.elementFromPoint(x, y);
              return hit === target || target.contains(hit);
            }"""
            target = el.element_handle()
            point = None
            for fx, fy in ((.5, .5), (.25, .5), (.75, .5), (.5, .25), (.5, .75)):
                x, y = box['x'] + box['width']*fx, box['y'] + box['height']*fy
                if page.evaluate(hit_test, [x, y, target]):
                    point = (x, y)
                    break
            if point is None:
                detail = page.evaluate("""([x, y]) => {
                  const hit = document.elementFromPoint(x, y);
                  return hit ? hit.tagName + '#' + hit.id + '.' + hit.className : 'none';
                }""", [box['x'] + box['width']/2, box['y'] + box['height']/2])
                raise AssertionError(f'Touch target obscured: {selector}; center hit={detail}; box={box}')
            page.touchscreen.tap(*point)
        # Start from a genuinely empty tank, not a free Practice flight
        # while standard replay is still available.
        page.evaluate("""() => {
          const key = 'luma_drift_save_v2';
          const save = JSON.parse(localStorage.getItem(key));
          save.energy = 0;
          save.energyAt = Date.now();
          localStorage.setItem(key, JSON.stringify(save));
        }""")
        page.reload()
        page.wait_for_selector('#practice-btn')
        touch('[data-tab="flight"]')
        assert page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).energy") == 0
        mission_progress = page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).dailyProgress")
        credits = page.locator('#credits').inner_text()
        fuel = page.locator('#energy').inner_text()
        touch('#practice-btn')
        for i in range(2):
            page.wait_for_selector('#run-controls:visible')
            touch('#routes button')
            touch('#bank-btn')
            assert page.locator('#end-earned').inner_text() == '0', 'Practice awarded currency'
            assert page.locator('#credits').inner_text() == credits, 'Practice changed wallet'
            assert page.locator('#energy').inner_text() == fuel, 'Practice consumed fuel'
            assert page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).dailyProgress") == mission_progress, 'Practice advanced missions'
            if i == 0:
                assert page.locator('#again-btn').get_attribute('data-replay-mode') == 'practice', 'Zero fuel did not offer free replay'
                touch('#again-btn')
        page.reload()
        page.wait_for_selector('#practice-btn')
        assert page.locator('#credits').inner_text() == credits, 'Reload changed Practice wallet'
        assert page.locator('#energy').inner_text() == fuel, 'Reload changed Practice fuel'
        assert page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).dailyProgress") == mission_progress, 'Reload changed Practice missions'
        print('PASS: two touchscreen Practice flights; wallet and fuel preserved after reload')
        context.close()
        browser.close()
