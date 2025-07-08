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
	// Enable CORS for API clients
	res.setHeader('Access-Control-Allow-Credentials', 'true')
	res.setHeader('Access-Control-Allow-Origin', '*')
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
	const isAllowed = checkRateLimit(clientId, 15, req)

	// Get rate limit info for headers
	const rateLimitInfo = getRateLimitInfo(clientId, 15, req)

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

	let url
	try {
		url = req.body && req.body.url
		if (!url) throw new Error('Missing url')
	} catch (e) {
		res.status(400).json({ error: 'Invalid request body' })
		return
	}

	try {
		// Now properly await the async function
		const shortUrl = await getShortUrl(url)
		res.status(200).json({ shortUrl })
	} catch (e) {
		res.status(500).json({ error: e.message })
	}
}
