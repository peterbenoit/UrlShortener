# URL Shortener API Guide

This guide explains how to use the URL Shortener API efficiently, including
information about rate limits and best practices.

## Authentication

For higher rate limits, you can use an API key. Include it in your requests
using the `X-API-Key` header.

To request an API key, contact the administrator of this service.

## Endpoints

### Shorten URL

**Endpoint:** `/api/shorten` **Method:** `POST` **Content-Type:**
`application/json` **Rate Limit:** 15 requests per minute (higher with API key)

**Request Body:**

```json
{
	"url": "https://example.com/long/path/to/shorten"
}
```

**Successful Response (200 OK):**

```json
{
	"shortUrl": "https://short.ly/abc123"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid or missing URL
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

### Redirect

**Endpoint:** `/api/[shortId]` **Method:** `GET` **Rate Limit:** 30 requests per
minute (higher with API key)

**Successful Response:**

- `302 Found` with Location header to the original URL

**Error Responses:**

- `400 Bad Request`: Invalid or missing shortId
- `404 Not Found`: Short URL not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

## Rate Limiting

The API implements progressive rate limiting based on client type:

1. **Standard clients:**
   - 15 requests/minute for shortening
   - 30 requests/minute for redirects

2. **API clients:** (with valid API key)
   - 100 requests/minute for all operations

3. **Trusted applications:** (whitelisted domains)
   - 300 requests/minute for all operations

Rate limit information is included in response headers:

- `X-RateLimit-Limit`: Maximum requests allowed in the current window
- `X-RateLimit-Remaining`: Number of requests left in the current window
- `X-RateLimit-Reset`: Time (in Unix seconds) when the rate limit resets

When rate limited, you'll receive a `429 Too Many Requests` response with a
`retryAfter` value in seconds.

## Best Practices

1. **Implement backoff:** If you receive a 429 response, wait at least the
   `retryAfter` seconds before retrying.

2. **Cache results:** If you're shortening the same URLs repeatedly, cache the
   results.

3. **Batch requests:** If you need to shorten multiple URLs, consider batching
   them to minimize API calls.

4. **Include proper headers:** Always set the `Content-Type: application/json`
   header for POST requests.

5. **Handle errors:** Implement proper error handling for all possible response
   codes.

## Example Usage

### cURL

```bash
curl -X POST https://your-domain.com/api/shorten \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"url": "https://example.com/very/long/path"}'
```

### JavaScript (Fetch)

```javascript
const response = await fetch("https://your-domain.com/api/shorten", {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		"X-API-Key": "your-api-key",
	},
	body: JSON.stringify({
		url: "https://example.com/very/long/path",
	}),
});

const data = await response.json();
console.log(data.shortUrl);
```
