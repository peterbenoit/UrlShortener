/**
 * Simple rate limiting implementation with differentiated limits
 * based on client type and configurable limits
 */

// Rate limit storage (in-memory)
// { ip: { hits: [{timestamp}], whitelisted: boolean } }
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
 * Check if a client has exceeded their rate limit
 * @param {string} clientId - Client identifier (IP or API key)
 * @param {number} [customLimit] - Optional custom limit to override the default
 * @param {Object} [req] - Request object for additional context
 * @returns {boolean} - true if allowed, false if rate limited
 */
function checkRateLimit(clientId, customLimit, req) {
	if (!clientId) return true // Allow if no client ID (should never happen)

	const now = Date.now()
	const clientType = identifyClientType(clientId, req)
	const config = clientConfigs[clientType]

	// Use custom limit if provided, otherwise use config limit
	const limit = customLimit || config.limit
	const window = config.window

	// Initialize client if first request
	if (!rateLimits[clientId]) {
		rateLimits[clientId] = { hits: [] }
	}

	// Filter out expired hits
	rateLimits[clientId].hits = rateLimits[clientId].hits.filter(
		hit => now - hit < window
	)

	// Check if client is over limit
	if (rateLimits[clientId].hits.length >= limit) {
		return false // Rate limited
	}

	// Add current hit
	rateLimits[clientId].hits.push(now)
	return true // Allowed
}

/**
 * Get rate limit information for a client
 * @param {string} clientId - Client identifier (IP or API key)
 * @param {number} [customLimit] - Optional custom limit
 * @param {Object} [req] - Request object for additional context
 * @returns {Object} - Rate limit info: { limit, remaining, reset }
 */
function getRateLimitInfo(clientId, customLimit, req) {
	if (!clientId) {
		return { limit: 9999, remaining: 9999, reset: Date.now() + 60000 }
	}

	const now = Date.now()
	const clientType = identifyClientType(clientId, req)
	const config = clientConfigs[clientType]

	// Use custom limit if provided, otherwise use config limit
	const limit = customLimit || config.limit
	const window = config.window

	if (!rateLimits[clientId]) {
		return { limit, remaining: limit, reset: now + window }
	}

	// Find oldest timestamp within window
	const hits = rateLimits[clientId].hits.filter(
		hit => now - hit < window
	)

	const remaining = Math.max(0, limit - hits.length)
	const oldestHit = hits.length > 0 ? Math.min(...hits) : now
	const reset = oldestHit + window

	return { limit, remaining, reset }
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

// Clean up expired rate limit data periodically
setInterval(() => {
	const now = Date.now()
	Object.keys(rateLimits).forEach(clientId => {
		// Find the longest window among all client types
		const longestWindow = Math.max(
			...Object.values(clientConfigs).map(config => config.window)
		)

		// Keep only hits within the longest window
		rateLimits[clientId].hits = rateLimits[clientId].hits.filter(
			hit => now - hit < longestWindow
		)

		// Remove client if no recent hits
		if (rateLimits[clientId].hits.length === 0) {
			delete rateLimits[clientId]
		}
	})
}, CLEANUP_INTERVAL)

module.exports = {
	checkRateLimit,
	getRateLimitInfo,
	whitelistClient,
	unwhitelistClient,
	addTrustedReferrer,
	configureClientType
}
