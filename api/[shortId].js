// Handle GET requests to /api/[shortId]
// Redirects to original URL or returns 404

const { kv } = require('@vercel/kv')
const { resolveShortId } = require('../src/shorten.js')
const { checkRateLimit, getRateLimitInfo } = require('../src/rateLimit.js')

/**
 * @param {import('vercel').VercelRequest} req
 * @param {import('vercel').VercelResponse} res
 */
module.exports = async (req, res) => {
	// Get client IP address or API key
	const clientId = (req.headers['x-api-key']) ||
		req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		'unknown-ip'

	// Check rate limit (30 requests per minute for redirects by default,
	// but API clients and trusted referrers get higher limits)
	const isAllowed = await checkRateLimit(clientId, 30, req)

	// Get rate limit headers
	const rateLimitInfo = await getRateLimitInfo(clientId, 30, req)

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

	const shortId = req.query.shortId
	if (!shortId) {
		res.status(400).json({ error: 'Missing shortId' })
		return
	}

	try {
		const url = await resolveShortId(shortId)
		if (url) {
			// Fire-and-forget click increment — does not block the redirect
			kv.incr('clicks:' + shortId).catch(() => { })
			res.writeHead(302, { Location: url })
			res.end()
		} else {
			// Serve index.html with an invalid url message
			const fs = require('fs')
			const path = require('path')
			const indexPath = path.join(__dirname, '../public/index.html')
			let html = fs.readFileSync(indexPath, 'utf8')
			// Assuming there is <div id="shorten-result"></div> in index.html
			html = html.replace('<div id="shorten-result"></div>', '<div id="shorten-result" style="color:red;font-weight:bold;">Invalid or expired short URL.</div>')
			res.status(200).setHeader('Content-Type', 'text/html').end(html)
		}
	} catch (err) {
		console.error(`[Error] Failed to resolve shortId: ${err.message}`)
		res.status(500).json({ error: 'Internal server error' })
	}
}
