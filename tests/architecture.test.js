import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('financial domain has no dependency on browser controls or application state', async () => {
  const directory = new URL('../src/domain/', import.meta.url);
  for (const name of await fs.readdir(directory)) {
    const content = await fs.readFile(new URL(name, directory), 'utf8');
    assert.doesNotMatch(content, /\b(document|window|appState|pricingState|readControl)\b/, name);
    assert.doesNotMatch(content, /from\s+['"][^'"]*(?:state|ui)\//, name);
  }
});

test('styles have one declaration per selector within each media condition', async () => {
  const directory = new URL('../src/styles/', import.meta.url);
  const styles = [];
  for (const name of (await fs.readdir(directory)).filter((name) => name !== 'main.css'))
    styles.push(await fs.readFile(new URL(name, directory), 'utf8'));
  const dom = new JSDOM('<!doctype html><style>' + styles.join('\n') + '</style>');
  const selectors = new Set();
  function inspect(rules, context = '') {
    for (const rule of rules) {
      if (rule.cssRules) inspect(rule.cssRules, context + rule.conditionText);
      else if (rule.selectorText) {
        const key = context + ':' + rule.selectorText;
        assert.ok(!selectors.has(key), 'Duplicate selector: ' + key);
        selectors.add(key);
      }
    }
  }
  assert.ok(dom.window.document.styleSheets.length > 0);
  for (const stylesheet of dom.window.document.styleSheets) inspect(stylesheet.cssRules);
  dom.window.close();
});
