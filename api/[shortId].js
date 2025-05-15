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

	try {
		// Now properly await the async function
		const url = await resolveShortId(shortId)
		if (url) {
			res.writeHead(302, { Location: url })
			res.end()
		} else {
			// Serve index.html with an invalid url message
			const fs = require('fs')
			const path = require('path')
			const indexPath = path.join(__dirname, '../public/index.html')
			let html = fs.readFileSync(indexPath, 'utf8')
			// Inject a message into the page (simple, non-intrusive)
			html = html.replace('<body>', '<body><div id="shorten-result" style="color:red;text-align:center;margin:1em;">Invalid or expired short URL.</div>')
			res.status(200).setHeader('Content-Type', 'text/html').end(html)
		}
	} catch (err) {
		console.error(`[Error] Failed to resolve shortId: ${err.message}`)
		res.status(500).json({ error: 'Internal server error' })
	}
}
