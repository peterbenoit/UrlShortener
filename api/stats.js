// Handle GET requests to /api/stats?ids=id1,id2,...
// Returns click counts for the given shortIds from Vercel KV.

const { kv } = require('@vercel/kv')
const { checkRateLimit, getRateLimitInfo } = require('../src/rateLimit.js')

const VALID_ID = /^[a-zA-Z0-9]{3,10}$/
const MAX_IDS = 50

/**
 * @param {import('vercel').VercelRequest} req
 * @param {import('vercel').VercelResponse} res
 */
module.exports = async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'X-API-Key, X-Requested-With')

	if (req.method === 'OPTIONS') {
		res.status(200).end()
		return
	}

	if (req.method !== 'GET') {
		res.status(405).json({ error: 'Method Not Allowed' })
		return
	}

	const clientId =
		req.headers['x-api-key'] ||
		req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		'unknown-ip'

	const isAllowed = await checkRateLimit(clientId, 30, req)
	const rateLimitInfo = await getRateLimitInfo(clientId, 30, req)

	res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit.toString())
	res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString())
	res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.reset / 1000).toString())

	if (!isAllowed) {
		return res.status(429).json({
			error: 'Rate limit exceeded. Try again later.',
			retryAfter: Math.ceil((rateLimitInfo.reset - Date.now()) / 1000)
		})
	}

	const raw = req.query.ids
	if (!raw || !raw.trim()) {
		return res.status(400).json({ error: 'Missing ids query parameter' })
	}

	const ids = raw.split(',').map(s => s.trim()).filter(Boolean)

	if (ids.length === 0) {
		return res.status(400).json({ error: 'No valid ids provided' })
	}

	if (ids.length > MAX_IDS) {
		return res.status(400).json({ error: `Too many ids. Maximum is ${MAX_IDS}.` })
	}

	const invalid = ids.filter(id => !VALID_ID.test(id))
	if (invalid.length > 0) {
		return res.status(400).json({ error: `Invalid id format: ${invalid.join(', ')}` })
	}

	try {
		const counts = await Promise.all(ids.map(id => kv.get('clicks:' + id)))
		const result = {}
		ids.forEach((id, i) => {
			result[id] = { clicks: Number(counts[i]) || 0 }
		})
		res.status(200).json(result)
	} catch (err) {
		console.error(`[stats] KV error: ${err.message}`)
		res.status(500).json({ error: 'Internal server error' })
	}
}
