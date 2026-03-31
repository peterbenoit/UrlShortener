// main.js - Handles frontend form and fetches short URL

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

document.addEventListener('DOMContentLoaded', () => {
	initShortenForm()
	checkQueryParam()
})
