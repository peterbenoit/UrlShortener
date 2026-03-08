/**
 * Rate limiting implementation with differentiated limits
 * based on client type and configurable limits, using @vercel/kv with in-memory fallback.
 */

const { kv } = require('@vercel/kv')

// Rate limit storage fallback (in-memory)
// { key: { hits: number, expire: timestamp } }
const rateLimits = {}

// Default cleanup interval (1 minute)
const CLEANUP_INTERVAL = 60 * 1000

// Config for different client types
const clientConfigs = {
	// Normal web clients (default)
	default: {
		limit: 30, // requests per minute
		window: 60 * 1000 // 1 minute in ms
	},
	// API clients (identified by API key or trusted domains)
	api: {
		limit: 100, // higher limit for legitimate API clients
		window: 60 * 1000
	},
	// Trusted applications (your own apps)
	trusted: {
		limit: 300, // very high limit for trusted sources
		window: 60 * 1000
	}
}

// Whitelist of trusted IPs or API keys that get higher limits
const whitelist = new Set([
	// Add your trusted IPs or API keys here
	// e.g., '123.123.123.123', 'your-api-key'
])

// List of trusted referrers (your own apps)
const trustedReferrers = new Set([
	// Add domains of your own applications
	// e.g., 'yourapp.com', 'your-other-app.vercel.app'
	'routeguide.vercel.app/'
])

/**
 * Identify client type based on IP, API key, or referrer
 * @param {string} clientId - IP address or API key
 * @param {Object} req - Request object with headers
 * @returns {string} - Client type: 'default', 'api', or 'trusted'
 */
function identifyClientType(clientId, req = {}) {
	// Check if client is whitelisted
	if (whitelist.has(clientId)) {
		return 'api'
	}

	// Check for API key in headers
	const apiKey = req.headers && req.headers['x-api-key']
	if (apiKey && whitelist.has(apiKey)) {
		return 'api'
	}

	// Check referrer for trusted apps
	const referrer = req.headers && req.headers.referer
	if (referrer) {
		try {
			const referrerHost = new URL(referrer).hostname
			if (trustedReferrers.has(referrerHost)) {
				return 'trusted'
			}
		} catch (e) {
			// Invalid referrer URL, ignore
		}
	}

	return 'default'
}

/**
 * Check if a client has exceeded their rate limit asynchronously using KV.
 * @param {string} clientId - Client identifier (IP or API key)
 * @param {number} [customLimit] - Optional custom limit to override the default
 * @param {Object} [req] - Request object for additional context
 * @returns {Promise<boolean>} - true if allowed, false if rate limited
 */
async function checkRateLimit(clientId, customLimit, req) {
	if (!clientId) return true

	const now = Date.now()
	const clientType = identifyClientType(clientId, req)
	const config = clientConfigs[clientType]

	const limit = customLimit || config.limit
	const window = config.window

	const windowId = Math.floor(now / window)
	const key = `ratelimit:${clientId}:${windowId}`

	try {
		// Vercel KV rate logic
		const hits = await kv.incr(key)
		if (hits === 1) {
			await kv.expire(key, Math.ceil(window / 1000))
		}
		return hits <= limit
	} catch (e) {
		// console.error(`[KV rate limit error]: ${e.message}`)
		// Fallback to in-memory fixed window
		if (!rateLimits[key]) {
			rateLimits[key] = { hits: 0, expire: now + window }
		}
		rateLimits[key].hits++
		return rateLimits[key].hits <= limit
	}
}

/**
 * Get rate limit information for a client
 * @param {string} clientId - Client identifier (IP or API key)
 * @param {number} [customLimit] - Optional custom limit
 * @param {Object} [req] - Request object for additional context
 * @returns {Promise<Object>} - Rate limit info: { limit, remaining, reset }
 */
async function getRateLimitInfo(clientId, customLimit, req) {
	if (!clientId) {
		return { limit: 9999, remaining: 9999, reset: Date.now() + 60000 }
	}

	const now = Date.now()
	const clientType = identifyClientType(clientId, req)
	const config = clientConfigs[clientType]

	const limit = customLimit || config.limit
	const window = config.window

	const windowId = Math.floor(now / window)
	const key = `ratelimit:${clientId}:${windowId}`
	const reset = (windowId + 1) * window

	try {
		let hits = await kv.get(key)
		hits = hits ? parseInt(hits, 10) : 0
		const remaining = Math.max(0, limit - hits)
		return { limit, remaining, reset }
	} catch (e) {
		// Fallback
		const hits = rateLimits[key] ? rateLimits[key].hits : 0
		const remaining = Math.max(0, limit - hits)
		return { limit, remaining, reset }
	}
}

/**
 * Add a client to the whitelist for higher rate limits
 * @param {string} clientId - Client identifier (IP or API key)
 */
function whitelistClient(clientId) {
	whitelist.add(clientId)
}

/**
 * Remove a client from the whitelist
 * @param {string} clientId - Client identifier (IP or API key)
 */
function unwhitelistClient(clientId) {
	whitelist.delete(clientId)
}

/**
 * Add a trusted referrer domain
 * @param {string} domain - Domain name (e.g., 'example.com')
 */
function addTrustedReferrer(domain) {
	trustedReferrers.add(domain)
}

/**
 * Configure rate limits for a client type
 * @param {string} type - Client type: 'default', 'api', or 'trusted'
 * @param {Object} config - Configuration: { limit, window }
 */
function configureClientType(type, config) {
	if (clientConfigs[type]) {
		clientConfigs[type] = { ...clientConfigs[type], ...config }
	}
}

// Clean up expired rate limit data periodically for the fallback store
const cleanupIntervalObj = setInterval(() => {
	const now = Date.now()
	Object.keys(rateLimits).forEach(key => {
		// Remove client if expired
		if (now > rateLimits[key].expire) {
			delete rateLimits[key]
		}
	})
}, CLEANUP_INTERVAL)

function stopCleanup() { // For testing purposes
	clearInterval(cleanupIntervalObj)
}

module.exports = {
	checkRateLimit,
	getRateLimitInfo,
	whitelistClient,
	unwhitelistClient,
	addTrustedReferrer,
	configureClientType,
	stopCleanup
}
