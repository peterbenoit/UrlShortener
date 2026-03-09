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
	const ALLOWED_ORIGINS = [
		'https://smawl.vercel.app',
		'http://localhost:3000',
		'http://127.0.0.1:3000'
	]

	const origin = req.headers.origin || req.headers.referer
	if (origin) {
		const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))
		if (!isAllowed) {
			return res.status(403).json({ error: 'Origin not allowed' })
		}
		res.header('Access-Control-Allow-Origin', origin)
	} else {
		res.header('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0])
	}

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
		if (!req.headers['content-type']?.includes('application/json')) {
			return res.status(400).json({ error: 'Unsupported Media Type: must be application/json' })
		}
		const { url, customId } = req.body || {}
		if (typeof url !== 'string' || !url.trim()) {
			return res.status(400).json({ error: 'Missing or invalid url' })
		}
		if (customId !== undefined && typeof customId !== 'string') {
			return res.status(400).json({ error: 'Custom ID must be a string' })
		}

		// Now using async/await with the updated getShortUrl function
		const shortUrl = await getShortUrl(url, undefined, customId)
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
