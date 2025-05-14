// Handle POST requests to /api/shorten
// Expects JSON: { url: string }
// Returns: { shortUrl } or { error }

const { getShortUrl } = require('../src/shorten.js')

/**
 * @param {import('vercel').VercelRequest} req
 * @param {import('vercel').VercelResponse} res
 */
module.exports = async (req, res) => {
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
		const shortUrl = getShortUrl(url)
		res.status(200).json({ shortUrl })
	} catch (e) {
		res.status(500).json({ error: e.message })
	}
}
