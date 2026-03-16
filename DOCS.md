# smawl — URL Shortener: Technical Documentation

## What Is It?

**smawl** is a self-hosted, serverless URL shortener built on Node.js and deployed to Vercel. It takes long, unwieldy URLs and maps them to short, shareable aliases (e.g., `https://smawl.vercel.app/abc123`). Unlike black-box commercial shorteners, smawl is fully open, auditable, and designed to run in a serverless environment with virtually zero cold infrastructure cost.

Under the hood it uses:

- **Vercel Serverless Functions** as the API layer (`api/shorten.js`, `api/[shortId].js`)
- **Vercel KV (Redis)** for persistent, globally distributed URL mapping and rate-limit tracking
- **SHA-256 + Base62 encoding** to generate deterministic 6–8 character short IDs
- **Express** as a local development server that mirrors Vercel's routing

---

## Why It Was Created

Most URL shorteners are either closed SaaS products with opaque data policies, or open-source tools that require a dedicated database server and full-stack infrastructure. smawl was built to fill the gap: a production-grade shortener that:

- **Costs nothing to host** — Vercel's free tier handles serverless functions and KV storage for modest traffic
- **Is trivially deployable** — one `vercel deploy` command, no servers to provision
- **Has correct, auditable logic** — collision handling, URL canonicalization, and rate limiting are all tested and transparent
- **Is embeddable by other apps** — the REST API is designed to be called programmatically, not just used from the UI

The original use case was a companion application that needed a reliable, private shortening service without relying on third-party APIs. That app is registered as a trusted referrer in the server-side configuration, granting it a higher rate-limit tier.

---

## Target Audience

| Audience | Use Case |
|---|---|
| **Developers** | Embed short-link generation into their own apps via the REST API |
| **Teams** | Share a self-hosted shortener with configurable rate limits and trusted-app whitelisting |
| **Hobbyists / learners** | Explore a real-world serverless Node.js project with testing, Redis integration, and collision-safe hashing |
| **Anyone wary of commercial shorteners** | Full control over where URL data lives and for how long |

---

## Features

### URL Canonicalization
Before any URL is hashed or stored, it is normalized:
- Protocol is lowercased and enforced (`http://` or `https://` only — `javascript:` and other protocols are rejected)
- The hostname is lowercased
- Trailing slashes on paths are stripped
- Query strings and hash fragments are **preserved** (e.g., `?q=hello#section` survives normalization)
- URLs longer than 2,048 characters are rejected

### Deterministic Short ID Generation
Short IDs are produced by:
1. Running the normalized URL through **SHA-256**
2. Taking the first 5 bytes (40 bits) of the digest
3. Encoding those bytes in **Base62** (`a–z`, `A–Z`, `0–9`)
4. Left-padding to a minimum of 6 characters and truncating to 8

The result is a stable, repeatable ID for any given URL — the same URL always produces the same ID, enabling idempotency.

### Idempotency
Submitting the same URL multiple times returns the **same short link** without creating a duplicate database entry. This keeps the KV store lean and simplifies client-side caching.

### Custom Aliases
Users can request a specific short ID instead of the auto-generated one:

```json
{ "url": "https://example.com/...", "customId": "myBlog" }
```

Custom IDs must be **3–10 alphanumeric characters** (`[a-zA-Z0-9]`). Custom IDs are stored and resolved the same way as generated IDs.

### Collision Protection
When a generated short ID collides with an existing (different) URL in KV, the algorithm appends an incrementing nonce to the input and re-hashes, recursively, until a free slot is found.

### Multi-Tier Rate Limiting
Rate limits are enforced globally across all serverless instances via Vercel KV — a per-instance in-memory counter would be meaningless in a stateless environment.

| Client Type | Limit | Window |
|---|---|---|
| Default (browser/anonymous) | 30 requests | 1 minute |
| API clients (whitelisted key/IP) | 100 requests | 1 minute |
| Trusted apps (whitelisted referrer) | 300 requests | 1 minute |

Client type is determined server-side using a combination of request metadata. The specific criteria and whitelisted values are intentionally kept out of public documentation.

When KV is unavailable, rate limiting degrades gracefully to an in-memory store.

### Redirect
A `GET` to `/:shortId` issues a **HTTP 302** redirect to the resolved target URL. If the short ID is unknown or invalid, the response renders an error state rather than a bare 404.

### Simple UI
A vanilla HTML/JS frontend (no framework) lets anyone shorten URLs directly in the browser. Styled with [Pico CSS](https://picocss.com/) for a clean, responsive layout with zero custom CSS overhead.

---

## API Reference

### `POST /api/shorten`

Shortens a URL, optionally with a custom alias.

**Request**
```http
POST /api/shorten
Content-Type: application/json
```

```json
{
  "url": "https://example.com/very/long/path",
  "customId": "myAlias"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `url` | string | Yes | Must be a valid `http`/`https` URL, ≤2048 chars |
| `customId` | string | No | 3–10 alphanumeric characters |

**Success Response — `200 OK`**
```json
{
  "shortUrl": "https://smawl.vercel.app/myAlias"
}
```

**Error Response — `4xx`**
```json
{
  "error": "Custom ID must be 3-10 alphanumeric characters"
}
```

---

### `GET /:shortId`

Resolves a short ID and redirects to the original URL.

**Response — `302 Found`**
```
Location: https://example.com/very/long/path
```

**Response — invalid ID**
Returns an HTML error page (no bare 404).

---

## Code Examples

### cURL
```bash
curl -X POST https://smawl.vercel.app/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/path"}'
```

### JavaScript (Fetch)
```javascript
const res = await fetch('https://smawl.vercel.app/api/shorten', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com/very/long/path' }),
});
const { shortUrl } = await res.json();
console.log(shortUrl);
```

### Python
```python
import requests

res = requests.post(
    'https://smawl.vercel.app/api/shorten',
    json={'url': 'https://example.com/very/long/path'}
)
print(res.json()['shortUrl'])
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Browser / Client            │
│  public/index.html + public/main.js     │
└────────────────┬────────────────────────┘
                 │ HTTP
     ┌───────────▼────────────┐
     │   Vercel Serverless     │
     │  api/shorten.js         │  POST /api/shorten
     │  api/[shortId].js       │  GET  /:shortId
     └───────────┬────────────┘
                 │
     ┌───────────▼────────────┐
     │     src/shorten.js      │  URL validation, hashing,
     │     src/rateLimit.js    │  collision handling, KV I/O
     └───────────┬────────────┘
                 │
     ┌───────────▼────────────┐
     │     Vercel KV (Redis)   │  Persistent URL map
     │                         │  Rate limit counters
     └────────────────────────┘

Local development only:
     server.js (Express) mirrors Vercel routing at localhost:3000
```

### Directory Layout

| Path | Role |
|---|---|
| `api/shorten.js` | Serverless entry point for `POST /api/shorten` |
| `api/[shortId].js` | Serverless entry point for `GET /:shortId` |
| `src/shorten.js` | Core logic: validation, hashing, deduplication, KV storage |
| `src/rateLimit.js` | Multi-tier rate limiting with KV backend and in-memory fallback |
| `public/` | Static frontend (HTML, JS) |
| `server.js` | Local Express dev server |
| `tests/` | Jest test suite |

---

## Local Development

### Prerequisites
- Node.js v18+
- A Vercel account with a KV database (or run without KV — the app falls back to in-memory maps)

### Setup

```bash
git clone <repo-url>
cd UrlShortener
npm install
cp .env.local.example .env.local   # fill in KV_REST_API_URL and KV_REST_API_TOKEN
npm start
```

Open `http://localhost:3000` in your browser.

> Without KV credentials, URL mappings and rate limits are stored in process memory only — this is fine for local testing but does not persist across restarts.

---

## Testing

The test suite covers URL validation, hash generation, Base62 encoding, collision handling, idempotency, and rate limiting.

```bash
npm test                        # run all tests
npm test -- --coverage          # run with coverage report
```

Coverage output is written to `coverage/lcov-report/index.html`.

---

## Deployment

```bash
vercel deploy
```

Ensure your Vercel project has the KV integration enabled and the environment variables `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set in the Vercel dashboard.

### Adding Trusted Apps or API Keys

Edit `src/rateLimit.js`:

```javascript
// Whitelist IPs or API keys for elevated limits (100 req/min)
const whitelist = new Set([
  'your-api-key',
  '203.0.113.42',
]);

// Whitelist referrer domains for highest limits (300 req/min)
const trustedReferrers = new Set([
  'yourapp.vercel.app',
]);
```

---

## Security Notes

- Only `http` and `https` protocols are accepted — `javascript:`, `data:`, and other schemes are rejected at validation time
- Short IDs are never user-controlled unless a `customId` is explicitly provided; generated IDs are derived only from the SHA-256 hash of the normalized URL
- Rate limiting is enforced server-side via Redis — it cannot be bypassed by client-side tricks
- No user accounts or credentials are stored; the only data persisted is the URL mapping itself

---

## License

ISC
