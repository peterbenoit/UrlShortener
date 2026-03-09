# URL Shortener

A lightweight, robust, and scalable URL shortener built with Node.js and Serverless functions. It uses Vercel KV (Redis) to persistently store URL mappings and to provide scalable rate-limiting. It also contains an Express server fallback for local development.

## Features

- **Deterministic URL Canonicalization**: Correctly normalizes domains while preserving query strings (`?q=hello`) and hash fragments.
- **Custom Shortener IDs**: Optionally map URLs to custom, human-readable aliases (e.g., `https://smawl.vercel.app/myLink123`).
- **Collision Protection**: Intelligently handles hash collisions during assignment and recursively scales with a nonce.
- **Serverless-Ready Rate Limiting**: Utilizes global Redis (Vercel KV) to enforce rate limits across serverless instances to prevent API abuse.
- **Idempotency**: Providing the same URL natively returns the original mapping to conserve database space.
- **Simple UI**: Intuitive, responsive HTML/JS vanilla interface styled with Pico CSS.

## Prerequisites

- Node.js (v18+)
- Vercel CLI (Optional, for deploying)
- A Vercel KV Database (For production persistence)

## Installation

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the skeleton environment file and fill in your Vercel KV credentials:
   ```bash
   # Set up your KV_REST_API_URL and KV_REST_API_TOKEN
   cp .env.local.example .env.local
   ```

## Running Locally

You can spin up the app locally using the fallback Express server. This server mimics the serverless routing on Vercel.

```bash
npm start
```

Visit `http://localhost:3000` to interact with the frontend UI. 

*(Note: If Vercel KV is not configured locally, rate limiting and mapping will gracefully fall back to an internal memory map for testing purposes)*

## Testing

This project maintains a robust Jest testing suite ensuring algorithmic correctness for URL validations, hash generation, database storage algorithms, and rate limiting logic.

To run the test suite:

```bash
npm test
```

To run with coverage metrics:

```bash
npm run test -- --coverage
```

## API Refernce

### `POST /api/shorten`
Shortens a URL or assigns it a custom alias.

**Request Body:**
```json
{
  "url": "https://example.com/very/long/path",
  "customId": "myCustom1" // Optional, 3-10 alphanumeric characters
}
```

**Response:**
```json
{
  "shortUrl": "https://smawl.vercel.app/myCustom1"
}
```

### `GET /:shortId`
Redirects the client (`302`) automatically to the resolved, fully-normalized target URL. If invalid or expired, gracefully renders the invalid URL template.

## Architecture & Codebase

- `api/` - Vercel Serverless Function entry points.
- `public/` - The static frontend HTML, CSS, and JS.
- `src/shorten.js` - Core business logic for mapping URLs and hashing sequences.
- `src/rateLimit.js` - Global multi-tier rate limiting module powered by KV.
- `tests/` - Jest test specs.
- `server.js` - Local development express server mirroring Vercel's routing.

## Deployment

Simply deploy this directly to Vercel:

```bash
vercel deploy
```
Make sure your `@vercel/kv` environment integrations are correctly mapped to your production project via the Vercel Dashboard!
