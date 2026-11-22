'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, 'game.js'), 'utf8');
const match = source.match(/  function renderReplayChoice\(\)\{[^\n]*\}\n(?=  function renderHeader\()/);
assert.ok(match, 'Replay-choice renderer must remain available for regression testing');
const button = {
  dataset: {}, textContent: '', attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; },
  getAttribute(name) { return this.attributes[name] ?? null; }
};
const state = {energy: 0, energyAt: Date.now() - 5 * 60000, end: {id: 1}};
const context = {state, $: id => id === 'again-btn' ? button : null, Date, Math, replayChoiceEnd: null};
vm.createContext(context);
vm.runInContext(match[0] + '\nthis.renderReplayChoice = renderReplayChoice;', context);
context.renderReplayChoice();
assert.equal(button.dataset.replayMode, 'practice');
assert.match(button.textContent, /PRACTICE FREE.*NO REWARDS/);
assert.match(button.attributes['aria-label'], /zero fuel required; no rewards or mission progress/);
assert.match(button.textContent, /FUEL IN 15M/);
state.energy = 1;
context.renderReplayChoice();
assert.equal(button.dataset.replayMode, 'practice', 'recharge preserves Practice');
assert.doesNotMatch(button.textContent, /FUEL IN/);
state.end = {id: 2};
context.renderReplayChoice();
assert.equal(button.dataset.replayMode, 'standard');
assert.match(button.textContent, /FLY AGAIN.*1 FUEL/);
assert.match(button.attributes['aria-label'], /uses one fuel and awards expedition rewards/);
state.energy = 0;
state.energyAt = Date.now() - 19 * 60000;
context.renderReplayChoice();
assert.match(button.textContent, /FUEL IN 1M/);
console.log('Replay-choice labels: empty fuel, available fuel, and recharge countdown passed');
