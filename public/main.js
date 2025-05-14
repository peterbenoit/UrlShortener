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
	form.addEventListener('submit', async function (e) {
		e.preventDefault()
		const url = input.value.trim()
		resultDiv.textContent = ''
		if (!url) {
			resultDiv.textContent = 'Please enter a URL.'
			return
		}
		resultDiv.textContent = 'Shortening...'
		try {
			const resp = await fetch('/shorten', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			})
			const data = await resp.json()
			if (resp.ok && data.shortUrl) {
				resultDiv.innerHTML = `<a href="${data.shortUrl}" target="_blank" rel="noopener">${data.shortUrl}</a>`
			} else {
				resultDiv.textContent = data.error || 'Failed to shorten URL.'
			}
		} catch (err) {
			resultDiv.textContent = 'Error: ' + (err.message || err)
		}
	})
}

document.addEventListener('DOMContentLoaded', initShortenForm)
