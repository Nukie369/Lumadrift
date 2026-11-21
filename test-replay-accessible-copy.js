'use strict';
// Verify results-screen replay remains accessible and honestly discloses costs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, 'game.js'), 'utf8');
const match = source.match(/function renderReplayChoice\(\)\{[\s\S]*?\}\s*function renderHeader\(/);
assert.ok(match, 'replay presentation function exists');
const fn = match[0].replace(/\s*function renderHeader\($/, '');
const attributes = {};
const button = {
  dataset: {},
  textContent: '',
  setAttribute(name, value) { attributes[name] = value; },
  getAttribute(name) { return attributes[name] ?? null; }
};
const state = {energy: 0, energyAt: 0};
const now = 100000000;
const context = {state, $: () => button, Date: {now: () => now}, Math};
vm.runInNewContext(fn + '; renderReplayChoice();', context);
assert.equal(button.dataset.replayMode, 'practice');
assert.match(button.textContent, /PRACTICE FREE.*NO REWARDS/);
assert.match(attributes['aria-label'], /no rewards or mission progress/i);
assert.match(attributes['aria-label'], /Next fuel/i);
assert.equal(attributes['aria-live'], 'polite');
state.energy = 1;
vm.runInNewContext('renderReplayChoice()', context);
assert.equal(button.dataset.replayMode, 'standard');
assert.match(button.textContent, /FLY AGAIN.*1 FUEL/);
assert.match(attributes['aria-label'], /uses one fuel and awards expedition rewards/i);
state.energy = 0;
state.energyAt = now - 19 * 60000;
vm.runInNewContext('renderReplayChoice()', context);
assert.match(button.textContent, /FUEL IN 1M/);
assert.match(attributes['aria-label'], /approximately 1 minute(?!s)/);
console.log('PASS accessible results replay: Practice disclosure, standard cost, recharge countdown');
