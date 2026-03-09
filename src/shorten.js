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
	if (inputUrl.length > 2048) {
		return new Error('URL exceeds maximum length of 2048 characters')
	}
	let urlObj
	try {
		let tempUrl = inputUrl.trim()
		// If it doesn't strictly start with http or https, force it
		if (!/^https?:\/\//i.test(tempUrl)) {
			// Prevent overriding with other malicious protocols like javascript:
			if (/^[a-zA-Z]+:/.test(tempUrl)) {
				return new Error('Only HTTP and HTTPS protocols are allowed')
			}
			tempUrl = 'http://' + tempUrl
		}
		urlObj = new URL(tempUrl)

		if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
			return new Error('Only HTTP and HTTPS protocols are supported')
		}

		// Basic sanity check for TLD (or localhost mapping)
		if (!urlObj.hostname.includes('.') && urlObj.hostname !== 'localhost') {
			return new Error('Invalid URL domain format')
		}
	} catch (e) {
		return new Error('Invalid URL format')
	}

	// Lowercase the hostname
	let host = urlObj.hostname.toLowerCase()
	let pathname = urlObj.pathname
	// Remove trailing slash unless root
	if (pathname.length > 1 && pathname.endsWith('/')) {
		pathname = pathname.replace(/\/+$/, '')
	}
	// Compose cleaned URL: protocol + host + pathname + search + hash
	const cleaned = urlObj.protocol + '//' + host + pathname + urlObj.search + urlObj.hash
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
 * @param {string} [customId] - Optional custom alias constraint
 * @returns {Promise<string|Error>} - Short URL or original if shorter, or Error if invalid
 */
async function getShortUrl(originalUrl, shortDomain, customId) {
	const SHORT_DOMAIN = (shortDomain || 'https://smawl.vercel.app/').replace(/\/+$/, '')
	const cleaned = cleanAndValidateUrl(originalUrl)
	if (cleaned instanceof Error) return cleaned

	let shortId;
	if (customId) {
		if (typeof customId !== 'string' || !/^[a-zA-Z0-9]{3,10}$/.test(customId)) {
			return new Error('Custom ID must be 3-10 alphanumeric characters')
		}
		shortId = customId;
	} else {
		shortId = generateShortId(cleaned);
	}

	let shortUrl = SHORT_DOMAIN + '/' + shortId
	if (!customId && typeof originalUrl === 'string' && originalUrl.length <= shortUrl.length) {
		return originalUrl
	}

	try {
		// Custom ID Logic
		if (customId) {
			const existingUrl = await resolveShortId(shortId)
			if (existingUrl) {
				if (existingUrl === originalUrl) {
					return shortUrl // Exact match already exists, reuse it.
				} else {
					return new Error('Custom ID has already been taken')
				}
			}
			// Hash Collision Logic
		} else {
			let attempts = 0
			let hashInput = cleaned
			while (attempts < 5) {
				const existingUrl = await resolveShortId(shortId)
				if (!existingUrl) {
					break // Available slot
				}
				if (existingUrl === originalUrl) {
					return shortUrl // Already exists exactly
				}
				// Collision!
				attempts++
				hashInput = cleaned + '#' + attempts
				shortId = generateShortId(hashInput)
				shortUrl = SHORT_DOMAIN + '/' + shortId
			}
		}

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


// Export functions for use in API routes
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
