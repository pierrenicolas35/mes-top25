const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

test('Service Worker Tests', async (t) => {
  // Setup mock environment
  const mockSelf = {
    listeners: {},
    addEventListener(event, callback) {
      this.listeners[event] = callback;
    }
  };

  const mockCache = {
    assets: [],
    async addAll(assets) {
      this.assets.push(...assets);
    }
  };

  const mockCaches = {
    store: {},
    async open(name) {
      if (!this.store[name]) {
        this.store[name] = mockCache;
      }
      return this.store[name];
    },
    async match(req) {
      if (req === 'cached-request') return 'cached-response';
      return null;
    }
  };

  let fetchCalledWith = null;
  const mockFetch = async (req) => {
    fetchCalledWith = req;
    return 'network-response';
  };

  // Load and evaluate sw.js in a mocked context
  const swCode = fs.readFileSync('./sw.js', 'utf8');
  const context = vm.createContext({
    self: mockSelf,
    caches: mockCaches,
    fetch: mockFetch,
    console: console,
  });

  vm.runInContext(swCode, context);

  await t.test('Registers install and fetch event listeners', () => {
    assert.strictEqual(typeof mockSelf.listeners['install'], 'function');
    assert.strictEqual(typeof mockSelf.listeners['fetch'], 'function');
  });

  await t.test('Install event caches assets', async () => {
    let waitUntilPromise = null;
    const event = {
      waitUntil: (p) => { waitUntilPromise = p; }
    };

    mockSelf.listeners['install'](event);
    assert.ok(waitUntilPromise);

    await waitUntilPromise;

    assert.ok(mockCaches.store['cartes-ign-v2']);
    assert.ok(mockCache.assets.includes('./index.html'));
    assert.strictEqual(mockCache.assets.length, 5);
  });

  await t.test('Fetch event serves from cache if available', async () => {
    let respondWithPromise = null;
    const event = {
      request: 'cached-request',
      respondWith: (p) => { respondWithPromise = p; }
    };

    mockSelf.listeners['fetch'](event);
    const response = await respondWithPromise;

    assert.strictEqual(response, 'cached-response');
  });

  await t.test('Fetch event falls back to network if not in cache', async () => {
    fetchCalledWith = null;
    let respondWithPromise = null;
    const event = {
      request: 'uncached-request',
      respondWith: (p) => { respondWithPromise = p; }
    };

    mockSelf.listeners['fetch'](event);
    const response = await respondWithPromise;

    assert.strictEqual(response, 'network-response');
    assert.strictEqual(fetchCalledWith, 'uncached-request');
  });
});
