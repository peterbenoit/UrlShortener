// Handle GET requests to /api/[shortId]
// Redirects to original URL or returns 404

const { resolveShortId } = require('../src/shorten.js')

/**
 * @param {import('vercel').VercelRequest} req
 * @param {import('vercel').VercelResponse} res
 */
module.exports = async (req, res) => {
	const shortId = req.query.shortId
	if (!shortId) {
		res.status(400).json({ error: 'Missing shortId' })
		return
	}

	const url = resolveShortId(shortId)
	if (url) {
		res.writeHead(302, { Location: url })
		res.end()
	} else {
		res.status(404).json({ error: 'Not found' })
	}
}
