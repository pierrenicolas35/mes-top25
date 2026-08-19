const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('loadUsersFromSheets', () => {
    let window;
    let document;

    beforeEach(() => {
        const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');

        // Extract script to inject into our clean DOM
        const scriptMatch = html.match(/<script>\s*(function escapeHtml[\s\S]*?)<\/script>/);
        if (!scriptMatch) {
            throw new Error('Could not find the expected inline script block in index.html. The regex pattern may need to be updated.');
        }
        let inlineScript = scriptMatch[1];

        // Remove the Promise.all initial execution so tests can control it
        // The script naturally has side effects on load. We mock the globals to prevent errors,
        // and remove the initial execution loop so we only test what we invoke manually.
        inlineScript = inlineScript.replace(/Promise\.all\(\[[\s\S]*?\}\)\.catch\(err => console\.error\("Erreur d'initialisation :", err\)\);/g, '');

        // Make sure variables are attached to window for testing
        inlineScript = inlineScript.replace(/let users = \[\];/, 'window.users = [];');
        inlineScript = inlineScript.replace(/let currentUserId = null;/, 'window.currentUserId = null;');
        inlineScript = inlineScript.replace(/let visibleUserIds = new Set\(\);/, 'window.visibleUserIds = new Set();');
        inlineScript = inlineScript.replace(/let IGN_DATA = \[\];/, 'window.IGN_DATA = [];');

        // Create the JSDOM instance
        const dom = new JSDOM('<!DOCTYPE html><html><body>' +
            '<div id="map"></div>' +
            '<div id="userList"></div>' +
            '<div id="sidebar"></div>' +
            '<input type="text" id="search" value="">' +
            '<div id="list"></div>' +
            '</body></html>', {
                runScripts: "dangerously",
                beforeParse(window) {
                    // Mock Leaflet
                    window.L = {
                        map: () => ({ fitBounds: () => {} }),
                        tileLayer: () => ({ addTo: () => {} }),
                        control: { layers: () => ({ addTo: () => {} }) },
                        rectangle: () => ({ addTo: () => ({ bindTooltip: () => {} }) })
                    };

                    // Mock fetch
                    window.fetch = jest.fn().mockResolvedValue({
                        json: jest.fn().mockResolvedValue([])
                    });
                }
            });

        window = dom.window;
        document = window.document;

        jest.spyOn(console, 'error').mockImplementation(() => {});

        // Inject modified script
        const scriptEl = document.createElement('script');
        scriptEl.textContent = inlineScript;
        document.body.appendChild(scriptEl);

        window.updateMapAndUI = jest.fn();
        window.refreshUserControls = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should fetch users and update state correctly', async () => {
        const mockUsers = [
            { id: 1, user_name: 'Alice', color: '#ff0000', owned_cards: ['1234'] },
            { id: 2, user_name: 'Bob', color: '#00ff00', owned_cards: ['5678'] }
        ];

        window.fetch.mockClear();
        window.fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue(mockUsers)
        });

        await window.loadUsersFromSheets();

        expect(window.fetch).toHaveBeenCalledWith("https://script.google.com/macros/s/AKfycbzq_nTRyluvvIz23JXm-cUS9NxmIwrPqueXIpYVyRfjGD_6iAXvL35CKEzMo4iH2l5I/exec");
        expect(window.users).toEqual(mockUsers);
        expect(window.currentUserId).toBe(1);
        expect(Array.from(window.visibleUserIds)).toEqual([1, 2]);
        expect(window.refreshUserControls).toHaveBeenCalled();
    });

    test('should handle empty response gracefully', async () => {
        window.fetch.mockClear();
        window.fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue([])
        });

        await window.loadUsersFromSheets();

        expect(window.users).toEqual([]);
        // State changes only if users.length > 0
    });

    test('should keep existing currentUserId if still present in response', async () => {
        window.fetch.mockClear();
        window.fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue([{ id: 1, user_name: 'Alice' }, { id: 2, user_name: 'Bob' }])
        });
        await window.loadUsersFromSheets();

        window.currentUserId = 2;

        window.fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue([{ id: 1, user_name: 'Alice' }, { id: 2, user_name: 'Bob' }])
        });
        await window.loadUsersFromSheets();

        expect(window.currentUserId).toBe(2);
    });

    test('should handle network errors gracefully', async () => {
        window.fetch.mockClear();
        window.users = [{id: 99}]; // previous state

        window.fetch.mockRejectedValueOnce(new Error('Network error'));

        await window.loadUsersFromSheets();

        expect(console.error).toHaveBeenCalledWith("Erreur de synchronisation Google Sheets :", expect.any(Error));
        expect(window.users).toEqual([{id: 99}]);
    });

    test('forceUpdate parameter updates map and UI', async () => {
        window.fetch.mockClear();
        window.fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue([{ id: 1, user_name: 'Alice' }])
        });

        await window.loadUsersFromSheets(true);

        expect(window.updateMapAndUI).toHaveBeenCalled();
    });
});
