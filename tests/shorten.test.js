const {
    cleanAndValidateUrl,
    generateShortId,
    base62Encode,
    getShortUrl,
    resolveShortId
} = require('../src/shorten');

// Setting up the mock
jest.mock('@vercel/kv', () => ({
    kv: {
        set: jest.fn(),
        get: jest.fn()
    }
}));
const { kv } = require('@vercel/kv');

describe('shorten.js utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Since we are not resetting modules to preserve `kv` mock identity,
        // we can forcibly inject a clean slate into the cached map by shortening 
        // a dummy URL and having it bypassed, or we can just accept the cache 
        // exists and make sure our KV mock returns values that override the cache!
        // In `shorten.js`, `resolveShortId` checks `await kv.get(shortId)` FIRST.
        // Therefore, if we return `null`, it will fallback to the map.
        // To bypass the map, we don't need to do anything since the map only holds 
        // stuff we put into it during this test run. We will ensure uniqueness per test.
    });

    describe('cleanAndValidateUrl', () => {
        it('should correctly normalize and retain query and hash params', () => {
            const result = cleanAndValidateUrl('https://example.com/demo?q=hello#test');
            expect(result).toBe('https://example.com/demo?q=hello#test');
        });

        it('should add missing protocols as http://', () => {
            const result = cleanAndValidateUrl('example.com/path');
            expect(result).toBe('http://example.com/path');
        });

        it('should remove trailing root slashes but keep others', () => {
            expect(cleanAndValidateUrl('https://example.com/path/')).toBe('https://example.com/path');
            expect(cleanAndValidateUrl('https://example.com/')).toBe('https://example.com/');
        });

        it('should throw an error for completely invalid URLs', () => {
            expect(cleanAndValidateUrl('not-a-url%^#')).toBeInstanceOf(Error);
            expect(cleanAndValidateUrl(null)).toBeInstanceOf(Error);
            expect(cleanAndValidateUrl('')).toBeInstanceOf(Error);
        });
    });

    describe('base62Encode', () => {
        it('should properly encode buffers to base62 strings', () => {
            const input = Buffer.from('00', 'hex'); // 0
            expect(base62Encode(input)).toBe('a');
        });
    });

    describe('generateShortId', () => {
        it('should return deterministically identical hashes', () => {
            const id1 = generateShortId('https://example.com');
            const id2 = generateShortId('https://example.com');
            expect(id1).toBe(id2);
        });

        it('should generate a 6 to 8 character long id', () => {
            const id = generateShortId('https://example.com/something-long');
            expect(id.length).toBeGreaterThanOrEqual(6);
            expect(id.length).toBeLessThanOrEqual(8);
        });
    });

    describe('getShortUrl', () => {
        it('should return exactly the same URL if it is already shorter than the short domain combo', async () => {
            const shortDomain = 'https://s.co/';
            const original = 'http://a.co'; // 11 chars. Short URL would be https://s.co/XXXXXX (min 20 chars).
            const result = await getShortUrl(original, shortDomain);
            expect(result).toBe(original);
            expect(kv.set).not.toHaveBeenCalled();
        });

        it('should generate a short URL and set it in KV', async () => {
            kv.get.mockResolvedValue(null); // Simulated no collision by resolveShortId returning null

            const result = await getShortUrl('https://verylongdomainname.com/some/path');
            expect(result).toMatch(/^https:\/\/smawl\.vercel\.app\/[a-zA-Z0-9]{6,8}$/);
            expect(kv.set).toHaveBeenCalledTimes(1);
        });

        it('should handle a KV collision gracefully and retry with a nonce', async () => {
            // First time it resolves (simulating a collision with a different URL)
            kv.get.mockResolvedValueOnce('https://different.com');
            // Second time it resolves null (simulating a free slot)
            kv.get.mockResolvedValueOnce(null);

            const result = await getShortUrl('https://verylongdomainname.com/another/path');

            expect(kv.get).toHaveBeenCalledTimes(2); // Initial check + 1 retry check
            expect(kv.set).toHaveBeenCalledTimes(1);
            expect(result).toMatch(/^https:\/\/smawl\.vercel\.app\/[a-zA-Z0-9]{6,8}$/);
        });

        it('should return early with no KV sets if the exact URL already maps to exactly that ID', async () => {
            const target = 'https://exactmatch.com/test-id-early-exit';
            kv.get.mockResolvedValueOnce(target);

            const result = await getShortUrl(target);

            expect(kv.get).toHaveBeenCalledTimes(1);
            expect(kv.set).not.toHaveBeenCalled();
        });
    });

    describe('getShortUrl with customId', () => {
        it('should reject invalid custom IDs', async () => {
            const res1 = await getShortUrl('https://example.com', undefined, 'a!');
            expect(res1).toBeInstanceOf(Error);
            const res2 = await getShortUrl('https://example.com', undefined, 'ab'); // Too short
            expect(res2).toBeInstanceOf(Error);
            const res3 = await getShortUrl('https://example.com', undefined, 'abcdefghijkl'); // Too long
            expect(res3).toBeInstanceOf(Error);
        });

        it('should create a short URL with exactly the valid custom ID', async () => {
            kv.get.mockResolvedValueOnce(null); // free slot
            const result = await getShortUrl('https://valid.com', undefined, 'myAlias123');
            expect(kv.set).toHaveBeenCalledTimes(1);
            expect(result).toMatch(/\/myAlias123$/);
        });

        it('should reject a custom ID if it is already taken by a different URL', async () => {
            kv.get.mockResolvedValueOnce('https://someone-else.com');
            const result = await getShortUrl('https://valid.com', undefined, 'myAlias123');
            expect(result).toBeInstanceOf(Error);
            expect(result.message).toMatch(/taken/i);
        });

        it('should succeed idempotently if custom ID is requested for the exact same URL again', async () => {
            kv.get.mockResolvedValueOnce('https://valid.com');
            const result = await getShortUrl('https://valid.com', undefined, 'myAlias123');
            expect(kv.set).not.toHaveBeenCalled(); // No need to overwrite
            expect(result).toMatch(/\/myAlias123$/);
        });
    });
});
