// Handle POST requests to /api/shorten
// Expects JSON: { url: string }
// Returns: { shortUrl } or { error }

const { getShortUrl } = require('../src/shorten.js')

/**
 * @param {import('vercel').VercelRequest} req
 * @param {import('vercel').VercelResponse} res
 */
module.exports = async (req, res) => {
	// Enable CORS for API clients
	res.setHeader('Access-Control-Allow-Credentials', 'true')
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

	// Handle preflight OPTIONS request
	if (req.method === 'OPTIONS') {
		res.status(200).end()
		return
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
