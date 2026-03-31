// Handle POST requests to /api/shorten
// Expects JSON: { url: string }
// Returns: { shortUrl } or { error }

const { getShortUrl } = require('../src/shorten.js')
const { checkRateLimit, getRateLimitInfo } = require('../src/rateLimit.js')

/**
 * @param {import('vercel').VercelRequest} req
 * @param {import('vercel').VercelResponse} res
 */
module.exports = async (req, res) => {
	const ALLOWED_ORIGINS = [
		'https://smawl.vercel.app',
		'https://visual-chromatics.vercel.app',
		'http://localhost:3000',
		'http://127.0.0.1:3000'
	]

	const origin = req.headers.origin || req.headers.referer

	// If it's a direct API/Server call (no origin/referer) allow it only if they are authenticating with an API key,
	// or block by default if we want to be strict. To allow curl commands directly from you, we can permit requests
	// without an origin, but block explicit foreign browser origins.
	if (origin) {
		const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))
		if (!isAllowed) {
			return res.status(403).json({ error: 'Origin not allowed' })
		}
		res.setHeader('Access-Control-Allow-Origin', origin)
	} else {
		// Fallback for direct API requests (e.g. curl)
		res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0])
	}

	res.setHeader('Access-Control-Allow-Credentials', 'true')
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-API-Key')

	// Handle preflight OPTIONS request
	if (req.method === 'OPTIONS') {
		res.status(200).end()
		return
	}

	// Get client IP address or API key
	const clientId = (req.headers['x-api-key']) ||
		req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		'unknown-ip'

	// Check rate limit - stricter for shortening (15 per minute by default)
	// But API clients and trusted referrers get higher limits automatically
	const isAllowed = await checkRateLimit(clientId, 15, req)

	// Get rate limit info for headers
	const rateLimitInfo = await getRateLimitInfo(clientId, 15, req)

	// Add rate limit headers
	res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit.toString())
	res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString())
	res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.reset / 1000).toString())

	if (!isAllowed) {
		return res.status(429).json({
			error: 'Rate limit exceeded. Try again later.',
			retryAfter: Math.ceil((rateLimitInfo.reset - Date.now()) / 1000)
		})
	}

	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method Not Allowed' })
		return
	}

	let url, customId
	try {
		if (!req.headers['content-type']?.includes('application/json')) {
			throw new Error('Unsupported Media Type: must be application/json')
		}

		url = req.body && req.body.url
		customId = req.body && req.body.customId

		if (typeof url !== 'string' || !url.trim()) throw new Error('Missing or invalid url')
		if (customId !== undefined && typeof customId !== 'string') throw new Error('Custom ID must be a string')
	} catch (e) {
		return res.status(400).json({ error: e.message || 'Invalid request body' })
	}

	try {
		// Now properly await the async function
		const shortUrl = await getShortUrl(url, undefined, customId)
		if (shortUrl instanceof Error) {
			return res.status(400).json({ error: shortUrl.message })
		}
		res.status(200).json({ shortUrl })
	} catch (e) {
		res.status(500).json({ error: e.message })
	}
}
