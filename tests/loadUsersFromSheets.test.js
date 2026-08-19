const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

describe('loadUsersFromSheets error path', () => {
  let dom;
  let window;

  beforeEach(() => {
    // Avoid jsdom throwing an error when encountering missing libraries or functions.
    // We intercept jsdom's virtual console to silence the fetch error.
    const virtualConsole = new VirtualConsole();
    virtualConsole.sendTo(console, { omitJSDOMErrors: true });

    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    dom = new JSDOM(html, {
      runScripts: "dangerously",
      virtualConsole,
      beforeParse(window) {
        // Mock Leaflet 'L' before parsing scripts
        window.L = {
          map: jest.fn(() => ({
            fitBounds: jest.fn()
          })),
          tileLayer: jest.fn(() => ({
            addTo: jest.fn()
          })),
          rectangle: jest.fn(() => ({
            addTo: jest.fn(() => ({
              bindTooltip: jest.fn()
            }))
          })),
          control: {
            layers: jest.fn(() => ({
              addTo: jest.fn()
            }))
          }
        };
        // Mock fetch before scripts run to avoid the early fetch failing
        window.fetch = jest.fn(() => Promise.resolve({
            json: () => Promise.resolve([])
        }));
      }
    });
    window = dom.window;

    // Reset fetch for our test specifically
    window.fetch = jest.fn();
    window.refreshUserControls = jest.fn();
    window.updateMapAndUI = jest.fn();

    // Silence console.error for the expected error
    jest.spyOn(window.console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle fetch rejection gracefully and log an error', async () => {
    const mockError = new Error('Network error');
    window.fetch.mockRejectedValueOnce(mockError);

    // Initial state
    const initialUsersLength = window.users ? window.users.length : 0;

    // We need to wait for the promise to reject
    await window.loadUsersFromSheets();

    expect(window.console.error).toHaveBeenCalledWith(
      "Erreur de synchronisation Google Sheets :",
      mockError
    );
    expect(window.users ? window.users.length : 0).toBe(initialUsersLength);
  });
});
