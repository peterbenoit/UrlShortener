// main.js - Handles frontend form and fetches short URL

const LS_KEY = 'smawl:links'

function getLSLinks() {
	try {
		return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
	} catch {
		return []
	}
}

function setLSLinks(links) {
	localStorage.setItem(LS_KEY, JSON.stringify(links))
}

/**
 * Upsert a link entry into localStorage.
 * If the shortId already exists, skips (idempotent).
 */
function saveLinkToLS(originalUrl, shortUrl) {
	const shortId = shortUrl.split('/').pop()
	if (!shortId) return
	const links = getLSLinks()
	if (links.some(l => l.shortId === shortId)) return
	links.unshift({ shortId, originalUrl, shortUrl, createdAt: Date.now(), label: '' })
	setLSLinks(links)
}

/**
 * Initialize form event binding for URL shortener
 */
function initShortenForm() {
	const form = document.getElementById('shorten-form')
	const input = document.getElementById('url-input')
	let resultDiv = document.getElementById('shorten-result')
	if (!resultDiv) {
		resultDiv = document.createElement('div')
		resultDiv.id = 'shorten-result'
		form.insertAdjacentElement('afterend', resultDiv)
	}

	const toggleCb = document.getElementById('use-custom-id')
	const customContainer = document.getElementById('custom-id-container')
	const customInput = document.getElementById('custom-id-input')

	if (toggleCb && customContainer) {
		toggleCb.addEventListener('change', (e) => {
			if (e.target.checked) {
				customContainer.classList.add('visible')
				customInput.required = true
				customInput.focus()
			} else {
				customContainer.classList.remove('visible')
				customInput.required = false
				customInput.value = ''
			}
		})
	}

	form.addEventListener('submit', async function (e) {
		e.preventDefault()
		const url = input.value.trim()
		resultDiv.textContent = ''
		if (!url) {
			resultDiv.textContent = 'Please enter a URL.'
			return
		}
		resultDiv.textContent = 'Shortening...'

		const payload = { url }
		if (toggleCb && toggleCb.checked) {
			const cId = customInput.value.trim()
			if (cId) payload.customId = cId
		}

		try {
			const resp = await fetch('/api/shorten', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			})
			const data = await resp.json()
			if (resp.ok && data.shortUrl) {
				displayResult(resultDiv, data.shortUrl)
				saveLinkToLS(url, data.shortUrl)
				if (typeof loadMyLinks === 'function') loadMyLinks()
			} else {
				resultDiv.textContent = data.error || 'Failed to shorten URL.'
			}
		} catch (err) {
			resultDiv.textContent = 'Error: ' + (err.message || err)
		}
	})
}

/**
 * Display the shortened URL result with share options
 * @param {HTMLElement} container - The result container element
 * @param {string} shortUrl - The shortened URL to display
 */
function displayResult(container, shortUrl) {
	// Clear previous content
	container.innerHTML = ''

	// Add the link
	const link = document.createElement('a')
	link.href = shortUrl
	link.target = '_blank'
	link.rel = 'noopener'
	link.textContent = shortUrl
	container.appendChild(link)

	// Add share buttons container
	const shareDiv = document.createElement('div')
	shareDiv.className = 'share-buttons'

	// Copy to clipboard button
	const copyBtn = document.createElement('button')
	copyBtn.className = 'copy-button'
	copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy'
	copyBtn.setAttribute('aria-label', 'Copy to clipboard')
	copyBtn.onclick = () => copyToClipboard(shortUrl, shareDiv)
	shareDiv.appendChild(copyBtn)

	// Success message (hidden initially)
	const successMsg = document.createElement('div')
	successMsg.className = 'share-success'
	successMsg.textContent = 'Copied!'
	shareDiv.appendChild(successMsg)

	container.appendChild(shareDiv)
}

/**
 * Copy text to clipboard and show success message
 * @param {string} text - Text to copy
 * @param {HTMLElement} container - Container where success message is shown
 */
function copyToClipboard(text, container) {
	navigator.clipboard.writeText(text).then(
		() => {
			const successMsg = container.querySelector('.share-success')
			successMsg.classList.add('visible')
			setTimeout(() => {
				successMsg.classList.remove('visible')
			}, 2000)
		},
		(err) => {
			console.error('Could not copy text: ', err)
			// Fallback
			const textArea = document.createElement('textarea')
			textArea.value = text
			textArea.style.position = 'fixed'
			document.body.appendChild(textArea)
			textArea.focus()
			textArea.select()

			try {
				document.execCommand('copy')
				const successMsg = container.querySelector('.share-success')
				successMsg.classList.add('visible')
				setTimeout(() => {
					successMsg.classList.remove('visible')
				}, 2000)
			} catch (err) {
				console.error('Fallback: Copying text failed', err)
			}

			document.body.removeChild(textArea)
		}
	)
}

function checkQueryParam() {
	const params = new URLSearchParams(window.location.search)
	const urlToShorten = params.get('shorten')
	if (!urlToShorten) return

	// Browsers split the fragment off into location.hash before JS can read it,
	// so re-attach it to reconstruct the full URL (e.g. .../#palette=...)
	const fullUrl = urlToShorten + window.location.hash

	const input = document.getElementById('url-input')
	if (input) {
		input.value = fullUrl
		document.getElementById('shorten-form').requestSubmit()
	}

	// Clean the query param from the address bar without a page reload
	const cleanUrl = window.location.pathname
	window.history.replaceState(null, '', cleanUrl)
}

// --- Phase 3: My Links table ---

let sortState = { col: 'createdAt', dir: 'desc' }
let cachedStats = {}

function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

async function loadMyLinks() {
	const links = getLSLinks()
	const section = document.getElementById('my-links-section')
	if (!section) return

	if (links.length === 0) {
		const tableContainer = document.getElementById('my-links-table-container')
		if (tableContainer) {
			tableContainer.innerHTML = '<p class="table-empty">No links yet. Shorten a URL above to get started.</p>'
		}
		renderStatsCards([], {})
		renderActionsBar([], {})
		return
	}

	try {
		const ids = links.map(l => l.shortId).join(',')
		const resp = await fetch('/api/stats?ids=' + encodeURIComponent(ids))
		if (resp.ok) {
			cachedStats = await resp.json()
		}
	} catch { /* stats are optional */ }

	renderTable(links, cachedStats)
	renderStatsCards(links, cachedStats)
	renderActionsBar(links, cachedStats)
}

function sortLinks(links, stats) {
	const { col, dir } = sortState
	const factor = dir === 'asc' ? 1 : -1
	return [...links].sort((a, b) => {
		let av, bv
		if (col === 'clicks') {
			av = (stats[a.shortId] && stats[a.shortId].clicks) || 0
			bv = (stats[b.shortId] && stats[b.shortId].clicks) || 0
		} else if (col === 'createdAt') {
			av = a.createdAt
			bv = b.createdAt
		} else if (col === 'shortId') {
			av = a.shortId.toLowerCase()
			bv = b.shortId.toLowerCase()
		} else if (col === 'originalUrl') {
			av = a.originalUrl.toLowerCase()
			bv = b.originalUrl.toLowerCase()
		} else if (col === 'label') {
			av = (a.label || '').toLowerCase()
			bv = (b.label || '').toLowerCase()
		}
		if (av < bv) return -1 * factor
		if (av > bv) return 1 * factor
		return 0
	})
}

function renderTable(links, stats) {
	const container = document.getElementById('my-links-table-container')
	if (!container) return

	const sorted = sortLinks(links, stats)
	const cols = [
		{ key: 'shortId', label: 'Short Link' },
		{ key: 'originalUrl', label: 'Destination' },
		{ key: 'label', label: 'Label' },
		{ key: 'clicks', label: 'Clicks' },
		{ key: 'createdAt', label: 'Created' },
	]

	let html = '<table><thead><tr>'
	cols.forEach(c => {
		const active = sortState.col === c.key
		const arrow = active ? (sortState.dir === 'asc' ? ' ▲' : ' ▼') : ''
		html += `<th data-col="${c.key}">${escapeHtml(c.label)}${arrow}</th>`
	})
	html += '<th>Actions</th></tr></thead><tbody>'

	sorted.forEach(entry => {
		const clicks = (stats[entry.shortId] && stats[entry.shortId].clicks) || 0
		const created = new Date(entry.createdAt).toLocaleDateString()
		const destDisplay = entry.originalUrl.length > 42
			? entry.originalUrl.slice(0, 42) + '…'
			: entry.originalUrl

		html += `<tr data-id="${escapeHtml(entry.shortId)}">
			<td><a href="${escapeHtml(entry.shortUrl)}" target="_blank" rel="noopener">${escapeHtml(entry.shortId)}</a></td>
			<td title="${escapeHtml(entry.originalUrl)}">${escapeHtml(destDisplay)}</td>
			<td><span class="link-label" contenteditable="true" data-id="${escapeHtml(entry.shortId)}">${escapeHtml(entry.label || '')}</span></td>
			<td class="col-clicks">${clicks.toLocaleString()}</td>
			<td>${escapeHtml(created)}</td>
			<td class="col-actions">
				<button class="action-btn btn-copy" data-url="${escapeHtml(entry.shortUrl)}">Copy</button>
				<button class="action-btn btn-qr" data-url="${escapeHtml(entry.shortUrl)}">QR</button>
				<button class="action-btn btn-remove" data-id="${escapeHtml(entry.shortId)}">✕</button>
			</td>
		</tr>`
	})

	html += '</tbody></table>'
	container.innerHTML = html

	// Sort header clicks
	container.querySelectorAll('th[data-col]').forEach(th => {
		th.addEventListener('click', () => {
			const col = th.dataset.col
			if (sortState.col === col) {
				sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc'
			} else {
				sortState.col = col
				sortState.dir = (col === 'createdAt' || col === 'clicks') ? 'desc' : 'asc'
			}
			renderTable(getLSLinks(), cachedStats)
		})
	})

	// Label editing
	container.querySelectorAll('.link-label').forEach(span => {
		span.addEventListener('blur', () => {
			const id = span.dataset.id
			const newLabel = span.textContent.trim()
			const links = getLSLinks()
			const entry = links.find(l => l.shortId === id)
			if (entry) {
				entry.label = newLabel
				setLSLinks(links)
			}
		})
		span.addEventListener('keydown', e => {
			if (e.key === 'Enter') { e.preventDefault(); span.blur() }
		})
	})

	// Copy button
	container.querySelectorAll('.btn-copy').forEach(btn => {
		btn.addEventListener('click', () => {
			navigator.clipboard.writeText(btn.dataset.url).catch(() => { })
		})
	})

	// Remove from LS
	container.querySelectorAll('.btn-remove').forEach(btn => {
		btn.addEventListener('click', () => {
			const id = btn.dataset.id
			setLSLinks(getLSLinks().filter(l => l.shortId !== id))
			loadMyLinks()
		})
	})

	// QR — wired up in Phase 4
	container.querySelectorAll('.btn-qr').forEach(btn => {
		btn.addEventListener('click', () => {
			if (typeof showQrModal === 'function') showQrModal(btn.dataset.url)
		})
	})
}

// --- Phase 6: Export button ---

function renderActionsBar(links, stats) {
	const bar = document.getElementById('my-links-actions-bar')
	if (!bar) return

	bar.innerHTML = ''
	if (links.length === 0) return
	const btn = document.createElement('button')
	btn.textContent = 'Export JSON'
	btn.className = 'action-btn'
	btn.addEventListener('click', () => {
		const data = links.map(l => ({
			shortId: l.shortId,
			shortUrl: l.shortUrl,
			originalUrl: l.originalUrl,
			label: l.label || '',
			createdAt: new Date(l.createdAt).toISOString(),
			clicks: (stats[l.shortId] && stats[l.shortId].clicks) || 0
		}))
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
		const a = document.createElement('a')
		a.href = URL.createObjectURL(blob)
		a.download = 'smawl-links.json'
		a.click()
		URL.revokeObjectURL(a.href)
	})
	bar.appendChild(btn)
}

// --- Phase 4: QR code modal ---

function showQrModal(url) {
	const overlay = document.getElementById('qr-modal-overlay')
	const container = document.getElementById('qr-canvas-container')
	const urlLabel = document.getElementById('qr-modal-url')
	const closeBtn = document.getElementById('qr-modal-close')
	if (!overlay || !container) return

	container.innerHTML = ''
	urlLabel.textContent = url

	// QRCode is loaded from CDN after main.js, so check at call time
	if (typeof QRCode === 'undefined') {
		container.textContent = 'QR library not loaded.'
		overlay.hidden = false
		return
	}

	new QRCode(container, {
		text: url,
		width: 220,
		height: 220,
		colorDark: '#1a1a2e',
		colorLight: '#ffffff',
		correctLevel: QRCode.CorrectLevel.M
	})

	overlay.hidden = false

	function dismiss() {
		overlay.hidden = true
		overlay.removeEventListener('click', onOverlayClick)
		closeBtn.removeEventListener('click', dismiss)
	}

	function onOverlayClick(e) {
		if (e.target === overlay) dismiss()
	}

	overlay.addEventListener('click', onOverlayClick)
	closeBtn.addEventListener('click', dismiss)
}

// --- Phase 5: Personal stats summary cards ---

function renderStatsCards(links, stats) {
	const container = document.getElementById('my-links-stats-cards')
	if (!container) return

	const totalLinks = links.length
	const totalClicks = links.reduce((sum, l) => sum + ((stats[l.shortId] && stats[l.shortId].clicks) || 0), 0)

	let topLink = null
	let topClicks = 0
	links.forEach(l => {
		const c = (stats[l.shortId] && stats[l.shortId].clicks) || 0
		if (c > topClicks) { topClicks = c; topLink = l }
	})

	const cards = [
		{ value: totalLinks.toLocaleString(), label: 'Total Links' },
		{ value: totalClicks.toLocaleString(), label: 'Total Clicks' },
		{
			value: topLink
				? `<a href="${escapeHtml(topLink.shortUrl)}" target="_blank" rel="noopener">${escapeHtml(topLink.shortId)}</a>`
				: '—',
			label: 'Top Link'
		},
	]

	container.innerHTML = cards.map(c =>
		`<div class="stats-card">
			<div class="stats-value">${c.value}</div>
			<div class="stats-label">${escapeHtml(c.label)}</div>
		</div>`
	).join('')
}

document.addEventListener('DOMContentLoaded', () => {
	initShortenForm()
	checkQueryParam()
	loadMyLinks()
})
