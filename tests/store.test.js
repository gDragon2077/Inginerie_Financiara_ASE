import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/state/store.js';

test('one observable state owns nested edits, array edits and batched notifications', () => {
  const store = createStore({ pricing: { spot: 100 }, positions: [] });
  const notifications = [];
  const unsubscribe = store.subscribe((version) => notifications.push(version));
  store.transaction(() => {
    store.state.pricing.spot = 105;
    store.state.positions.push({ qty: 1 });
  });
  assert.deepEqual(notifications, [1]);
  store.state.positions[0].qty = 2;
  assert.deepEqual(notifications, [1, 2]);
  const snapshot = store.snapshot();
  snapshot.pricing.spot = 0;
  assert.equal(store.state.pricing.spot, 105);
  unsubscribe();
  store.state.pricing.spot = 106;
  assert.deepEqual(notifications, [1, 2]);
});
