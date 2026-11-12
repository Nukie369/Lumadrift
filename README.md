# Luma Drift — playable alpha v8.2

Run `./verify.sh` to test the game and build `luma-drift-standalone-v8.2.html`. Open the resulting file to play offline. The Missions tab counts unclaimed rewards. In flight, the storm forecast shows the hull risk, remaining cargo after a hit, and the final beacon bonus.

Before committing changes to hosted game assets, run `python3 version_sw.py` to refresh the offline cache fingerprint. CI checks the committed worker.

## Alpha v8.0

**Archived build:** `luma-drift-standalone-v8.0.html` (local browser alpha).

**New in v8.0:** local JSON backup export/import with explicit overwrite confirmation and checksum validation; fixed five-item mobile navigation. `./verify.sh` executes 58 JavaScript regression scripts, validates JS syntax, and rebuilds the standalone HTML. Neither real-world payout nor payment processing is enabled.

**Hosting caution:** `owner.html` is an unauthenticated local economics simulation, not an administrator login. Do not deploy it as a publicly accessible live administrative interface. Browser-driven and real Android device testing remain outstanding.

---

## v4.3 — live funding refresh

The colony milestone and available-shards progress now refresh whenever the header balance refreshes, including earnings and purchases outside the colony screen. The full colony scenery is not rebuilt on these balance changes.

## v3.1 landmark completion feedback

A nonblocking, accessible colony construction confirmation shows the built landmark, its permanent daily-supply bonus, and remaining shard balance. No economy values changed.

# Luma Drift Alpha v2.1

**Fix:** Purchased ship skins (Solar Ember, Void Phantom, Ion Grove) persist correctly after a reload. The save validator previously discarded all three due to obsolete skin IDs. Unknown skin IDs remain rejected.

**Verification:** `node test-skin-persistence.js`, `node test-save.js`, `node test-recovery.js`, `node test-interrupted.js`, `node test-storage-failure.js`, `node --check game.js`, and `python3 build_standalone.py`.

The build remains a browser alpha; Android-device validation is outstanding.

# Luma Drift · Playable Alpha 1.7

An original, free-to-play virtual-currency space-salvage adventure, with a colorful mobile interface, expedition risk/reward choices, permanent upgrades, collectible ship appearances, Nova Haven colony building, seven-day daily rewards, missions, and a device-local owner economics dashboard.

## Play

- **Quickest:** open `luma-drift-standalone-v1.7.html` in a browser. Everything required for the game visuals and logic is embedded. Local progress storage depends on browser support for locally opened files.
- **Full web/PWA build:** run a local static web server from the `luma-drift/` directory, such as `python3 -m http.server 8000`, then visit `http://localhost:8000/`. A production deployment should use HTTPS.
- In the full web build, open `owner.html` to explore an **internal scenario calculator**. It is a local prototype, **not an authenticated, production-grade admin dashboard**. It must never be exposed as an unsecured production admin panel.
- Game progress and test events are stored in browser localStorage and do not sync between devices. There is no login or cloud backend yet.

## Current features

- Three flight lanes with visible hazard chances, 5-jump expedition length and a bank-or-push choice.
- Five rechargeable fuel cells, plus a free practice mode.
- Permanent scanner, magnet, and shield upgrades; four ship cosmetics earned with virtual shards.
- Four buildable Nova Haven landmarks with visibly changing on-map states and daily supply bonuses.
- **New:** Star Atlas gallery with six original illustrated relics in two collections. A nonpractice expedition banked after two or more jumps grants exactly one free relic draw; duplicates award 45 virtual shards and each complete collection gives a one-time virtual shard bonus and a colony monument badge. The draw weights are disclosed in-game.
- **New:** the Owner Lab records device-local relic discoveries and Atlas progress.
- Free daily check-in and repeating seven-day virtual reward cycle; daily missions and achievements.
- Sounds, responsive mobile navigation, accessibility labels, reduced-motion support, animated success sparkles.
- Offline-ready service worker when hosted on an eligible origin (normally HTTPS or localhost). The service worker cache was versioned to deliver the new assets.
- Owner scenario model with adjustable ad impressions, ad eCPM, purchases, store fee, marketing, cloud, and hypothetical reward expense. All figures are **unverified, editable assumptions**, not actual earnings.

## Not yet connected

- There are **no real-money purchases**, ads, live sponsors, cash prizes, payouts, or cryptocurrency redemption.
- A future cash program would require separate third-party verification, explicit terms, eligibility and legal assessment. Virtual shards do not convert to cash or prizes.
- Launch needs backend accounts, fraud protection, verified Google Play Billing, real ad integrations, disclosure/privacy flows, real analytics, production QA, and a proper Android build and store review.

## Business decisions

Prioritize voluntary return play and sustainable margin: measure D1/D7/D30 retention, active play duration (not background idling), player purchase conversion, ad engagement, refund rates, store fees, cost per acquisition, lifetime value, and actual cash-reward liabilities if a separate compliant program is added.

This is an original alpha prototype, not a clone of any existing title or a Google Play-approved game.

## v1.3 update

- Added an expandable, accessible Star Atlas odds panel. Percentages are generated from the actual in-game relic draw weights, so the disclosure and game logic cannot drift apart.
- Increased the offline cache version to v6.

### v1.4 — small-screen navigation and discovery polish
- Corrected the mobile bottom navigation to display all five sections in one row at phone sizes.
- Added reduced-motion-friendly Star Atlas reveal animations with rarity-specific styling and optional sound.
- Rebases on the packaged v1.3 source, preserving the exact relic odds disclosure panel.
- Local browser data remains local and cosmetic purchases and cash redemptions are **not** implemented.

### v1.5 — Nova Haven construction polish and reproducible standalone package
- A newly constructed landmark briefly springs into place with original gold sparkles; honors reduced-motion system settings.
- Reproducible `build_standalone.py` embeds the game's styles, JavaScript, and original SVG artwork into one browser HTML file for offline prototyping.
- The full project, source and standalone demo ship together; no store purchases, cloud saving, or payouts are live.
- Automated checks cover JavaScript syntax, required DOM element mappings and ZIP integrity. Actual device and browser usability testing remain required before release.

### v1.7 — Save-state hardening

- Validates stored currencies, fuel, dates, upgrades, collections and owned cosmetics; ignores malformed values.
- Prevents duplicate buildings and invalid future recharge timestamps; protects against corrupted browser saves.
- Practice storm damage is excluded from permanent statistics.
- Local-only save validation is **not** server-side anti-cheat; do not treat it as authoritative for paid or cash-linked systems.

## v1.8 — Local save recovery
The game now keeps the last valid primary save as a backup before writing the next checkpoint. If the primary save is missing, malformed, or incomplete, it attempts to restore and repair from the backup. If both copies are damaged, a fresh game is loaded. The backup can be one checkpoint behind; this is best-effort local resilience, not a cloud save or protection against device loss. Active in-progress expeditions are not persisted and still restart docked on reload. Run `node test-recovery.js` and `node test-save.js` for automated regression coverage.

### v1.9 interrupted-flight notice
Active expeditions write a small local marker at launch and after each crossing. Finishing a flight clears it. On reopening, a leftover recent marker produces a one-time explanation that unbanked cargo is not awarded; practice interruptions are identified separately. This does not replay route randomness, refund fuel, or grant virtual rewards. Tested with `node test-interrupted.js`.

## v2.0 verified-save improvement

Local checkpoints now read back the saved JSON after writing, detecting silent storage write rejection as well as thrown quota/security exceptions. A failure shows the existing progress-persistence warning; gameplay continues without pretending the save succeeded. `node test-storage-failure.js` covers normal saves, quota denial, silent drops, read restrictions, and recovery after storage access returns. This is local browser persistence, not cloud backup or server-side anti-cheat. Full Android-device testing remains pending.

## v2.3 verified recovery writes
When restoring a backup checkpoint, the game now checks whether repair of the primary save actually persisted. If storage silently discards the write or denies it, the player receives an explicit warning. This prevents misleading assurance after recovering progress in a restricted browser.

### v2.5 — startup recovery warning fix
When a damaged primary save is restored from a backup but the repair write fails, the warning is queued until the page has finished initializing. Previously the recovery path could call `notify()` during `readState()` before `toastTimeout` was initialized, aborting startup with a temporal-dead-zone error. The repair-write regression now asserts deferred warnings for denied and silently dropped writes. Seven Node regression suites pass. Full browser and Android-device validation remain pending.

### v2.5 — recovery backup write verification
When replacing a valid primary checkpoint, the game now verifies the backup write and warns if the recovery copy could not be updated. The primary save still succeeds independently. A fresh installation does not produce a false backup warning. Automated regression: `node test-backup-verification.js`.


### v2.6 accessibility
System reduced-motion settings now suppress continuous starfield, ship hover, engine flame, view transitions, relic reveals and colony construction animations while retaining static content. Verified by automated stylesheet assertions; visual browser verification remains outstanding.

### v2.7 daily reward transparency
Daily supply UI now explains local-midnight reset, consecutive-day requirements, missed-day reset, repeating seven-day cycle and permanent colony bonuses. `node test-daily-terms.js` verifies terms match the implemented claim rules. No economy or purchase mechanics changed.

## v2.8 daily trail polish
Daily trail cells announce exact virtual shard amounts to assistive technology, mark the available day with aria-current, and avoid showing a future day as claimable after today’s claim. No economy values changed.

## v3.1 scenery progression
Built landmarks now generate up to four decorative, noninteractive ambient accents on the colony map. They derive exclusively from saved building state, reset on render, are hidden from assistive technology, and animate only when reduced motion is not requested. These are prototype CSS effects, not final commercial artwork.

### v3.2 landmark identities
Built colony markers now receive four distinct CSS-only color and silhouette treatments, derived from existing landmark IDs. No new assets, save fields, network requests, or economic changes. Reduced-motion users receive a non-transformed Solar Array. Run `node test-landmark-identity.js`. This is prototype artwork, not commercial 3D art.


### v3.3 island depth pass
Static layered light, vignette and landmark highlights add depth without new textures or animation. Automated CSS contract test: `node test-island-depth.js`. Browser/device visual QA remains required.

## v3.4
Colony visual maturity now scales across zero through four saved landmarks using static CSS and existing persisted construction state. No economy changes.

## v3.5 milestone visibility
The colony workshop now displays the next unbuilt landmark, its fixed cost, its daily supply bonus, and the exact shard shortfall or ready-to-build status. Once complete, the panel reports total colony daily bonus. No economy amounts changed.

## v3.6 next-landmark funding meter
The colony workshop now shows an accessible native progress meter for available shards relative to the next unbuilt landmark's cost. Funding is capped visually at 100%, recalculates from existing balances, and disappears when all landmarks are built. It does not reserve or spend currency.

## v3.7 — Funding language clarity
Construction meter now explicitly says percentage of cost available, not funded; shards remain spendable elsewhere. Regression test: `node test-funding-clarity.js`. Real Chromium headless attempt was inconclusive (browser hung in this environment); Android verification remains outstanding.

### v3.8 — accessible shard availability wording
The construction meter's accessible name explicitly states shards are **currently available**, not reserved or committed to construction. Its visible label now uses the same terminology. Regression: `node test-funding-accessibility.js`. This does not change balances, purchases, or gameplay.

## v3.9 landmark-specific scenery
Environmental accents now follow landmark IDs rather than build order, preserving visual identity even for nonstandard restored building order. Verified by test-scenery-identity.js and the full Node regression suite. Chromium headless remains blocked in this environment; Android testing pending.

## v4.0 completed-colony accessibility cleanup
When all landmarks are built, the hidden construction funding meter now clears its old landmark-specific accessible label and resets its value to zero. This prevents stale progress metadata when the workshop transitions to the completed state. A dedicated regression test verifies the reset. Chromium smoke testing remains blocked by a timeout in this environment; no browser pass is claimed.

## v4.1 — runtime-tested funding calculation
Extracted the production colony funding computation into a pure function shared by the milestone shortfall and progress meter. Handles negative and non-finite balances defensively; never reserves currency. Eight runtime boundary cases execute the exact production function via Node VM (`node test-funding-runtime.js`). Browser/device validation remains pending.

## v4.1 — runtime-tested funding calculation
Extracted the production colony funding computation into a pure function shared by the milestone shortfall and progress meter. Handles negative and non-finite balances defensively; never reserves currency. Eight runtime boundary cases execute the exact production function via Node VM (`node test-funding-runtime.js`). Browser/device validation remains pending.
