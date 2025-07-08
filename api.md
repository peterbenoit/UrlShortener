# URL Shortener API Documentation

This document explains how to interact with the URL shortener API
programmatically.

## Endpoints

### Shorten URL

Creates a shortened URL from a long URL.

**Endpoint:** `/api/shorten`

**Method:** `POST`

**Content Type:** `application/json`

**Request Body:**

```json
{
	"url": "https://example.com/very/long/path/that/needs/shortening"
}
```

**Response:**

```json
{
	"shortUrl": "https://smawl.vercel.app/abc123"
}
```

**Error Response:**

```json
{
	"error": "Error message describing what went wrong"
}
```

## Example Usage

### Using cURL

```bash
curl -X POST https://smawl.vercel.app/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/path"}'
```

### Using Postman

1. Create a new POST request to `https://smawl.vercel.app/api/shorten`
2. Set the header `Content-Type: application/json`
3. In the Body tab, select "raw" and choose "JSON" format
4. Enter the request body:
   ```json
   {
   	"url": "https://example.com/very/long/path"
   }
   ```
5. Click "Send" to make the request

### Using JavaScript (Fetch API)

```javascript
const response = await fetch(
	"https://smawl.vercel.app/api/shorten",
	{
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			url: "https://example.com/very/long/path",
		}),
	},
);

const data = await response.json();
console.log(data.shortUrl);
```

### Using Python (requests)

```python
import requests

response = requests.post(
    'https://smawl.vercel.app/api/shorten',
    json={'url': 'https://example.com/very/long/path'}
)

data = response.json()
print(data['shortUrl'])
```

## Rate Limits

For fair usage, the API has the following rate limits:

- **URL Shortening**: 10 requests per minute per IP address
- **URL Redirects**: 30 requests per minute per IP address

When a rate limit is reached, the API will respond with a
`429 Too Many Requests` status code.

### Rate Limit Headers

The API includes the following headers in each response:

- `X-RateLimit-Limit`: Maximum number of requests allowed per minute
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets

### Example Rate Limit Response:

```json
{
	"error": "Rate limit exceeded. Try again later.",
	"retryAfter": 25
}
```

The `retryAfter` field indicates the number of seconds until the rate limit
resets.

## Notes

- URLs are validated before shortening
- If the provided URL is already shorter than its shortened version, the
  original URL will be returned
- Short URLs are permanent once created (unless configured with TTL)
