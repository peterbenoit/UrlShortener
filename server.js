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

// Add CORS middleware for API endpoints
app.use('/shorten', (req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*')
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
	res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
	if (req.method === 'OPTIONS') {
		return res.status(200).end()
	}
	next()
})

// Homepage route
app.get('/', (req, res) => {
	try {
		res.sendFile(path.join(__dirname, 'index.html'))
	} catch (err) {
		console.error(`[${new Date().toISOString()}] [error] GET /:`, err)
		res.status(500).type('json').send({ error: 'Internal server error' })
	}
})

// Short URL redirect route (must not conflict with static files or root)
app.get('/:shortId', async (req, res, next) => {
	try {
		const { shortId } = req.params
		if (!/^[a-zA-Z0-9]{6,8}$/.test(shortId)) return next()

		// Now using async/await with the updated resolveShortId function
		const originalUrl = await resolveShortId(shortId)
		if (originalUrl) {
			console.log(`[redirect] ${shortId} -> ${originalUrl}`)
			return res.redirect(302, originalUrl)
		}
		console.warn(`[${new Date().toISOString()}] [404] Short ID not found: ${shortId}`)
		res.status(404).type('json').send({ error: 'Short URL not found' })
	} catch (err) {
		console.error(`[${new Date().toISOString()}] [error] GET /:shortId:`, err)
		res.status(500).type('json').send({ error: 'Internal server error' })
	}
})

// POST /shorten endpoint
app.post('/shorten', async (req, res) => {
	try {
		console.log('[shorten] body:', req.body)
		const { url } = req.body || {}
		if (!url || typeof url !== 'string') {
			console.warn(`[${new Date().toISOString()}] [400] Invalid or missing URL field:`, url)
			return res.status(400).json({ error: 'Missing or invalid URL.' })
		}
		// Basic input validation: must look like a URL
		if (!/^https?:\/\/.+\..+/.test(url.trim())) {
			console.warn(`[${new Date().toISOString()}] [400] Malformed URL:`, url)
			return res.status(400).json({ error: 'Malformed URL.' })
		}

		// Now using async/await with the updated getShortUrl function
		const shortUrl = await getShortUrl(url)
		if (shortUrl instanceof Error) {
			console.warn(`[${new Date().toISOString()}] [400] URL validation failed:`, shortUrl.message)
			return res.status(400).json({ error: shortUrl.message })
		}
		console.log(`[shorten] ${url} -> ${shortUrl}`)
		res.json({ shortUrl })
	} catch (err) {
		console.error(`[${new Date().toISOString()}] [error] POST /shorten:`, err)
		res.status(500).type('json').send({ error: 'Internal server error' })
	}
})

// Catch-all for invalid short URLs (not static files)
app.use((req, res) => {
	console.warn(`[${new Date().toISOString()}] [400] Bad request: ${req.method} ${req.url}`)
	res.status(400).type('json').send({ error: 'Bad request: Invalid short URL format' })
})

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`)
})
