import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';

test('browser workflows share state and keep strategies, models, simulations and exercises functional', async () => {
  const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error.message));
  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    url: 'http://localhost/',
    virtualConsole,
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const settle = () => new Promise((resolve) => setTimeout(resolve, 80));
  const input = (id, value) => {
    const element = document.getElementById(id);
    element.value = value;
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const click = (selector) => {
    const element = document.querySelector(selector);
    assert.ok(element, selector);
    element.click();
  };
  await import('../src/main.js');
  await settle();
  const { appState } = await import('../src/state/store.js');
  assert.equal(appState.ui.error, null);
  assert.ok(document.querySelectorAll('#optionChain tbody tr').length >= 5);
  assert.equal(document.querySelectorAll('[data-preset]').length, 13);
  assert.ok(document.querySelector('#builderChart svg'));
  assert.ok(document.getElementById('exbs_Problem').textContent.length > 20);
  assert.ok(document.getElementById('excrr_Problem').textContent.length > 20);
  for (const prefix of ['exbs_', 'excrr_']) {
    const exercise = appState.exercises[prefix];
    exercise.cur.campuri.forEach((field, index) =>
      input(prefix + 'ans' + index, String(field.val)),
    );
    click('#' + prefix + 'Check');
    assert.equal(exercise.ok, 1);
    assert.equal(exercise.tot, 1);
    click('#' + prefix + 'Check');
    assert.equal(exercise.tot, 1);
    click('#' + prefix + 'New');
    assert.equal(appState.controls[prefix + 'ans0'], '');
    click('#' + prefix + 'Sol');
    assert.ok(document.getElementById(prefix + 'Solution').textContent.length > 20);
  }

  click('#clearStrategy');
  await settle();
  assert.equal(appState.strategy.positions.length, 0);
  click('#optionChain [data-side="1"]');
  await settle();
  assert.equal(appState.strategy.positions.length, 1);
  click('#positions [data-qtystep="1"]');
  await settle();
  assert.equal(appState.strategy.positions[0].qty, 2);
  click('#buySpot');
  await settle();
  assert.equal(appState.strategy.positions.at(-1).qty, 100);
  click('[data-days="90"]');
  await settle();
  assert.equal(Number(appState.controls.chainDays), 90);
  click('[data-preset="iron-condor"]');
  await settle();
  assert.equal(appState.strategy.positions.length, 4);
  assert.equal(new Set(appState.strategy.positions.map((leg) => leg.id)).size, 4);
  input('scenarioSpot', '110');
  await settle();
  assert.ok(document.getElementById('resultTable').textContent.includes('P&L AGREGAT'));

  click('[data-tab="bs"]');
  await settle();
  input('in_S', '110');
  await settle();
  assert.equal(appState.pricing.S, 110);
  assert.ok(document.getElementById('cardsBS').textContent.includes('Valoare teoretică'));
  input('in_S', '');
  await settle();
  assert.equal(appState.pricing.S, 110);
  assert.equal(document.getElementById('appError').hidden, false);
  input('in_S', '100');
  await settle();
  assert.equal(appState.ui.error, null);
  for (const config of ['stock', 'stock_q', 'fx', 'fut', 'fwd_stock', 'fwd_fx']) {
    const select = document.getElementById('cfg');
    select.value = config;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await settle();
    assert.equal(appState.pricing.config, config);
    assert.equal(appState.ui.error, null, config);
  }
  click('[data-tab="crr"]');
  await settle();
  assert.ok(document.querySelector('#treeSvg .node rect'));
  assert.ok(document.querySelector('#convChart svg'));
  input('in_n', '8');
  await settle();
  assert.equal(appState.pricing.n, 8);

  click('[data-tab="brownian"]');
  await settle();
  assert.ok(document.querySelector('#bmStandardChart svg'));
  assert.ok(document.querySelector('#bmDistChart svg'));
  const oldSeed = appState.simulation.brownianSeed;
  click('#bmResim');
  await settle();
  assert.notEqual(appState.simulation.brownianSeed, oldSeed);
  click('#themeBtn');
  await settle();
  assert.equal(appState.ui.theme, 'dark');
  assert.equal(document.documentElement.dataset.theme, 'dark');

  const greeksPane = document.getElementById('pane-greeks');
  greeksPane.hidden = false;
  const { initGreeks } = await import('../src/ui/labs/greeks.js');
  initGreeks();
  await settle();
  assert.ok(document.querySelector('#greekValueChart svg'));
  assert.ok(document.querySelector('#hedgeErrorChart svg'));
  assert.equal(appState.ui.error, null);
  assert.deepEqual(errors, []);
  dom.window.close();
});
