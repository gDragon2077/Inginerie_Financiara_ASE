export function createStore(initialState) {
  const data = structuredClone(initialState);
  const proxies = new WeakMap();
  const listeners = new Set();
  let transactionDepth = 0;
  let changed = false;
  let version = 0;

  function notify() {
    if (!changed || transactionDepth) return;
    changed = false;
    version += 1;
    for (const listener of listeners) listener(version);
  }

  function observe(target) {
    if (!target || typeof target !== 'object') return target;
    if (proxies.has(target)) return proxies.get(target);
    const proxy = new Proxy(target, {
      get(object, key) {
        return observe(Reflect.get(object, key));
      },
      set(object, key, value) {
        if (Object.is(object[key], value)) return true;
        const success = Reflect.set(object, key, value);
        changed = true;
        notify();
        return success;
      },
      deleteProperty(object, key) {
        if (!Object.hasOwn(object, key)) return true;
        Reflect.deleteProperty(object, key);
        changed = true;
        notify();
        return true;
      },
    });
    proxies.set(target, proxy);
    proxies.set(proxy, proxy);
    return proxy;
  }

  return {
    state: observe(data),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    transaction(callback) {
      transactionDepth += 1;
      try {
        return callback();
      } finally {
        transactionDepth -= 1;
        notify();
      }
    },
    snapshot() {
      return JSON.parse(JSON.stringify(data));
    },
  };
}

export const store = createStore({
  pricing: {
    config: 'stock_q',
    tip: 'call',
    stil: 'european',
    n: 5,
    S: 100,
    K: 95,
    T: 1,
    sigma: 0.25,
    r: 0.05,
    q: 0.03,
    rf: 0.02,
    Tf: 1.5,
    settleTf: false,
  },
  controls: {},
  strategy: { positions: [], nextId: 1, selectedBasic: 'long-call' },
  simulation: { brownianSeed: 137, hedgeSeed: 911 },
  exercises: {},
  ui: { tab: 'strategii', theme: '', error: null },
});

export const appState = store.state;
export const pricingState = appState.pricing;
