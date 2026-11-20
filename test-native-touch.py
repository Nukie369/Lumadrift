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
        # Install on every document, including the reload after editing saved fuel.
        # A page.evaluate override disappears on navigation, causing flaky storms.
        context.add_init_script("""() => {
          // Fixed 50% roll keeps the first Practice crossing safe.
          Object.defineProperty(crypto, 'getRandomValues', {
            configurable: true,
            value: a => { a.fill(0x80000000); return a; }
          });
        }""".replace('() => {', '{', 1))
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
                page.screenshot(path='native-touch-obstruction.png', full_page=True)
                raise AssertionError(f'Touch target obscured: {selector}; center hit={detail}; box={box}; screenshot=native-touch-obstruction.png')
            page.touchscreen.tap(*point)
        # Start from a genuinely empty tank, not a free Practice flight
        # while standard replay is still available.
        page.evaluate("""() => {
          const key = 'luma_drift_save_v2';
          const save = JSON.parse(localStorage.getItem(key));
          save.energy = 0;
          save.energyAt = Date.now();
          // The game validates an FNV-1a checkpoint checksum on reload.
          // Re-sign the test fixture; otherwise it restores the older backup
          // with five fuel, falsely reporting a replay-mode regression.
          const payload = {...save};
          delete payload.checkpointHash;
          let hash = 2166136261;
          for (const char of JSON.stringify(payload))
            hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
          save.checkpointHash = hash.toString(16).padStart(8, '0');
          localStorage.setItem(key, JSON.stringify(save));
        }""")
        page.reload()
        page.wait_for_selector('#practice-btn')
        # The initial Flight tab is already selected; tapping its covered nav
        # item is unnecessary for the zero-fuel replay scenario.
        assert page.locator('[data-tab="flight"]').get_attribute('class').find('active') >= 0, 'Flight tab not initially selected'
        assert page.locator('#practice-btn').is_visible(), 'Flight controls unavailable'
        assert page.locator('#energy').inner_text() == '0/5', 'Game did not restore zero-fuel checkpoint'
        assert page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).energy") == 0
        # Verify persisted economy state as well as HUD text: a UI-only check
        # could miss a hidden Practice payout or fuel debit.
        economy_before = page.evaluate("""() => {
          const s = JSON.parse(localStorage.getItem('luma_drift_save_v2'));
          return {credits: s.credits, energy: s.energy};
        }""")
        mission_progress = page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).dailyProgress")
        credits = page.locator('#credits').inner_text()
        fuel = page.locator('#energy').inner_text()
        touch('#practice-btn')
        for i in range(2):
            page.wait_for_selector('#run-controls:visible')
            if i == 0:
                # The expanded storm warnings must remain readable on a narrow phone.
                page.set_viewport_size({'width': 320, 'height': 720})
                assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2'), '320px mobile page scrolls horizontally before route selection'
                assert page.locator('#routes button').count() > 0, 'No routes rendered at 320px'
                assert all(page.locator('#routes button').nth(j).bounding_box()['width'] >= 44 and page.locator('#routes button').nth(j).bounding_box()['height'] >= 44 for j in range(page.locator('#routes button').count())), '320px route touch target smaller than 44 CSS pixels'
                route_layout = page.locator('#routes button').evaluate_all("""buttons => buttons.map(b => {
                  const text = b.querySelector('.route-side') || b;
                  const rect = text.getBoundingClientRect();
                  return {label: b.innerText, right: rect.right, viewport: innerWidth,
                    overflow: text.scrollWidth > text.clientWidth + 2};
                })""")
                assert route_layout and all('storm' in r['label'].lower() for r in route_layout), f'Missing visible storm warnings: {route_layout}'
                assert all(not r['overflow'] and r['right'] <= r['viewport'] + 2 for r in route_layout), f'Clipped narrow-screen route warnings: {route_layout}'
                page.set_viewport_size({'width': 390, 'height': 844})
            touch('#routes button')
            touch('#bank-btn')
            assert 'NO FUEL SPENT' in page.locator('#end-desc').inner_text().upper() and 'REWARDS EARNED' in page.locator('#end-desc').inner_text().upper(), 'Practice results omitted fuel and reward disclosures'
            assert 'NO REWARDS' in page.locator('#end-controls').inner_text().upper(), 'Practice exit omitted no-rewards disclosure'
            assert page.locator('#end-earned').inner_text() == '0', 'Practice awarded currency'
            assert page.locator('#credits').inner_text() == credits, 'Practice changed wallet'
            assert page.locator('#energy').inner_text() == fuel, 'Practice consumed fuel'
            assert page.evaluate("""() => {
              const s = JSON.parse(localStorage.getItem('luma_drift_save_v2'));
              return {credits: s.credits, energy: s.energy};
            }""") == economy_before, 'Practice modified persisted economy'
            assert page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).dailyProgress") == mission_progress, 'Practice advanced missions'
            if i == 0:
                replay_mode = page.locator('#again-btn').get_attribute('data-replay-mode')
                saved = page.evaluate("""() => {
                  const s = JSON.parse(localStorage.getItem('luma_drift_save_v2'));
                  return {energy: s.energy, energyAt: s.energyAt, end: s.end, now: Date.now()};
                }""")
                assert replay_mode == 'practice', f'Zero-fuel replay mismatch: mode={replay_mode!r}, saved={saved!r}, button={page.locator("#again-btn").inner_text()!r}'
                # One direct tap from the empty-tank results screen must start
                # free Practice; no store offer or dismissal is required.
                assert page.locator('#again-btn').is_visible(), 'Free replay hidden on results screen'
                # Measure the empty-tank replay friction directly: one tap,
                # zero mandatory offer dismissals, and immediate playable routes.
                replay_taps = 0
                forced_dismissals = 0
                touch('#again-btn')
                replay_taps += 1
                page.wait_for_selector('#run-controls:visible')
                assert page.locator('#routes button:visible').count() > 0, 'Free replay has no playable route'
                assert (replay_taps, forced_dismissals) == (1, 0), 'Free replay requires extra interactions'
                print(f'PASS: empty-tank results to playable Practice: {replay_taps} tap, {forced_dismissals} forced dismissals')
                assert not page.locator('#end-earned').is_visible(), 'Results overlay did not close for free replay'
                assert page.locator('#energy').inner_text() == fuel, 'Free replay consumed fuel'
        page.reload()
        page.wait_for_selector('#practice-btn')
        assert page.locator('#credits').inner_text() == credits, 'Reload changed Practice wallet'
        assert page.locator('#energy').inner_text() == fuel, 'Reload changed Practice fuel'
        assert page.evaluate("""() => {
          const s = JSON.parse(localStorage.getItem('luma_drift_save_v2'));
          return {credits: s.credits, energy: s.energy};
        }""") == economy_before, 'Reload changed persisted Practice economy'
        assert page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).dailyProgress") == mission_progress, 'Reload changed Practice missions'
        # Simulate elapsed real time while results remain open: the regular
        # 15-second refresh must expose the earned standard flight without
        # charging fuel until the player explicitly taps it.
        touch('#practice-btn')
        page.wait_for_selector('#run-controls:visible')
        touch('#routes button')
        touch('#bank-btn')
        assert page.locator('#again-btn').get_attribute('data-replay-mode') == 'practice'
        page.evaluate("""() => {
          const realNow = Date.now.bind(Date);
          Date.now = () => realNow() + 1200001;
          window.dispatchEvent(new Event('focus'));
        }""")
        assert page.locator('#energy').inner_text() == '1/5', 'Timed recharge did not restore one fuel'
        # Recharge is time-based, not a purchase or flight: no wallet debit,
        # mission progress, or fuel spend may occur before the player's tap.
        assert page.locator('#credits').inner_text() == credits, 'Recharge changed wallet before replay'
        assert page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).energy") == 1, 'Recharge did not persist one fuel'
        assert page.evaluate("() => JSON.parse(localStorage.getItem('luma_drift_save_v2')).dailyProgress") == mission_progress, 'Recharge advanced missions before replay'
        assert page.locator('#again-btn').get_attribute('data-replay-mode') == 'standard', 'Results did not refresh replay mode after recharge'
        assert '1 FUEL' in page.locator('#again-btn').inner_text(), 'Recharged replay cost not disclosed'
        touch('#again-btn')
        page.wait_for_selector('#run-controls:visible')
        assert page.locator('#energy').inner_text() == '0/5', 'Standard replay did not consume exactly one fuel'
        assert page.locator('#credits').inner_text() == credits, 'Starting recharged flight changed wallet'
        print('PASS: results-screen recharge switches to disclosed one-fuel replay')
        print('PASS: two touchscreen Practice flights; wallet and fuel preserved after reload')
        context.close()
        browser.close()
