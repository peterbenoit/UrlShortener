const crypto = require('crypto')
const { kv } = require('@vercel/kv')

/**
 * Clean and validate a URL for consistent hashing.
 * Strips query, fragment, protocol, normalizes domain, and removes trailing slashes.
 * @param {string} inputUrl - The user-provided URL
 * @returns {string|Error} - Cleaned URL string or Error object if invalid
 */
function cleanAndValidateUrl(inputUrl) {
	if (typeof inputUrl !== 'string' || !inputUrl.trim()) {
		return new Error('Input must be a non-empty string')
	}
	let urlObj
	try {
		// Ensure protocol for parsing
		let tempUrl = inputUrl.trim()
		if (!/^https?:\/\//i.test(tempUrl)) tempUrl = 'http://' + tempUrl
		urlObj = new URL(tempUrl)
	} catch (e) {
		return new Error('Invalid URL format')
	}

	// Lowercase the hostname
	let host = urlObj.hostname.toLowerCase()
	// Remove protocol, query, fragment, and normalize pathname
	let pathname = urlObj.pathname
	// Remove trailing slash unless root
	if (pathname.length > 1 && pathname.endsWith('/')) {
		pathname = pathname.replace(/\/+$/, '')
	}
	// Compose cleaned URL: host + pathname
	const cleaned = host + pathname
	return cleaned
}

/**
 * Base62 character set utility
 */
const BASE62_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Encode a Buffer or hex string into base62
 * @param {Buffer|string} input - Buffer or hex string
 * @returns {string} base62-encoded string
 */
function base62Encode(input) {
	let buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'hex')
	let num = BigInt('0x' + buf.toString('hex'))
	let out = ''
	const base = BigInt(BASE62_CHARS.length)
	if (num === 0n) return BASE62_CHARS[0]
	while (num > 0n) {
		out = BASE62_CHARS[Number(num % base)] + out
		num = num / base
	}
	return out
}

/**
 * Generate a deterministic short ID from a normalized URL
 * @param {string} normalizedUrl - Cleaned, normalized URL
 * @returns {string} Short ID (6-8 chars)
 */
function generateShortId(normalizedUrl) {
	if (typeof normalizedUrl !== 'string' || !normalizedUrl) {
		throw new Error('Input must be a normalized URL string')
	}
	const hash = crypto.createHash('sha256').update(normalizedUrl).digest()
	// Use first 5 bytes (40 bits) for brevity, enough for 6-8 base62 chars
	const shortBuf = hash.subarray(0, 5)
	const shortId = base62Encode(shortBuf).padStart(6, BASE62_CHARS[0])
	return shortId.slice(0, 8)
}

// In-memory mapping (kept as fallback)
const shortIdMap = {}

/**
 * Construct a short URL for the given original URL.
 * Returns the original if it is already shorter than the short version.
 * Stores the mapping in Vercel KV for persistence.
 * @param {string} originalUrl
 * @param {string} [shortDomain] - Optional override for the short domain
 * @returns {Promise<string|Error>} - Short URL or original if shorter, or Error if invalid
 */
async function getShortUrl(originalUrl, shortDomain) {
	const SHORT_DOMAIN = (shortDomain || 'https://sml-nu.vercel.app/').replace(/\/+$/, '')
	const cleaned = cleanAndValidateUrl(originalUrl)
	if (cleaned instanceof Error) return cleaned
	const shortId = generateShortId(cleaned)
	const shortUrl = SHORT_DOMAIN + '/' + shortId
	if (typeof originalUrl === 'string' && originalUrl.length <= shortUrl.length) {
		return originalUrl
	}

	try {
		// Store mapping in Vercel KV
		await kv.set(shortId, originalUrl)

		// Also keep in memory as fallback
		shortIdMap[shortId] = originalUrl

		// Optional: log mapping
		if (process.env.NODE_ENV !== 'test') {
			console.log(`[shorten] Mapped ${shortId} -> ${originalUrl}`)
		}
		return shortUrl
	} catch (err) {
		console.error(`[KV error] Failed to store mapping: ${err.message}`)
		// Fallback to in-memory if KV fails
		shortIdMap[shortId] = originalUrl
		return shortUrl
	}
}

/**
 * Resolve a shortId to the original URL from Vercel KV or in-memory fallback.
 * @param {string} shortId
 * @returns {Promise<string|null>}
 */
async function resolveShortId(shortId) {
	try {
		// Try to get from Vercel KV first
		const url = await kv.get(shortId)
		if (url) return url

		// Fall back to in-memory if not in KV
		return shortIdMap[shortId] || null
	} catch (err) {
		console.error(`[KV error] Failed to retrieve mapping: ${err.message}`)
		// Fall back to in-memory on KV error
		return shortIdMap[shortId] || null
	}
}

module.exports = {
	cleanAndValidateUrl,
	generateShortId,
	base62Encode,
	BASE62_CHARS,
	getShortUrl,
	resolveShortId
}

// Simple test output (remove or comment out in production)
if (require.main === module) {
	const testUrls = [
		'https://Example.com/',
		'https://example.com/path/',
		'https://example.com/path?query=1#frag',
		'http://example.com/path',
		'example.com/path/',
		'example.com/',
		'example.com',
	]
	testUrls.forEach(url => {
		const cleaned = cleanAndValidateUrl(url)
		if (cleaned instanceof Error) {
			console.log(`Invalid: ${url} -> ${cleaned.message}`)
		} else {
			const id = generateShortId(cleaned)
			console.log(`${url} => ${cleaned} => ${id}`)
		}
	})
}
