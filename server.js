const path = require('path')
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

const { getShortUrl, cleanAndValidateUrl, generateShortId, resolveShortId } = require('./src/shorten')

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')))

// Basic logging middleware
app.use((req, res, next) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
	next()
})

// Parse JSON bodies
app.use(express.json())

// Homepage route
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'))
})

// Short URL redirect route (must not conflict with static files or root)
app.get('/:shortId', (req, res, next) => {
	const { shortId } = req.params
	if (!/^[a-zA-Z0-9]{6,8}$/.test(shortId)) return next()
	const originalUrl = resolveShortId(shortId)
	if (originalUrl) {
		console.log(`[redirect] ${shortId} -> ${originalUrl}`)
		return res.redirect(302, originalUrl)
	}
	res.status(404).type('text').send('Not found: No mapping for this short URL')
})

// POST /shorten endpoint
app.post('/shorten', (req, res) => {
	const { url } = req.body || {}
	if (!url || typeof url !== 'string') {
		return res.status(400).json({ error: 'Missing or invalid URL.' })
	}
	const shortUrl = getShortUrl(url)
	if (shortUrl instanceof Error) {
		return res.status(400).json({ error: shortUrl.message })
	}
	console.log(`[shorten] ${url} -> ${shortUrl}`)
	res.json({ shortUrl })
})

// Catch-all for invalid short URLs (not static files)
app.use((req, res) => {
	res.status(400).type('text').send('Bad request: Invalid short URL format')
})

// Placeholder for future API routes

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`)
})
