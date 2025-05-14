# URL Shortener — Project Outline

## Objective

Create a lightweight URL shortener that:

-   Generates deterministic, short URLs using a hash of the cleaned original URL.
-   Does not use a database.
-   Returns the original URL if it's already shorter than the generated short URL.

## Key Features

-   Strip query strings and hash fragments from the input URL before processing.
-   Normalize URL (e.g., remove trailing slashes, enforce lowercase for domain).
-   Use a hashing algorithm (e.g., SHA-256 or FNV-1a) and base62-encode the result.
-   Generate short URLs using the first 6–8 characters of the hash.
-   Store mappings in memory or a static module object.
-   Leverage edge caching (e.g., Vercel Edge Functions) to serve frequent redirects with minimal latency.
-   Implement static or in-memory caching for repeated lookups to reduce redundant hash computation.

## Constraints & Deployment Considerations

-   No analytics, expiration, or editing of URLs.
-   Designed for small-scale or single-user use.
-   Stateless; no user login or ownership required.
-   Must be optimized for deployment on platforms like Vercel using Edge or Serverless Functions.
-   Should include basic abuse protection, such as rate limiting per IP or request throttling, to mitigate excessive or automated requests.

## Example Flow

1. Input: `https://example.com/page?utm_source=foo#section2`
2. Normalize to: `example.com/page`
3. Generate hash → base62 → `a1B2c3`
4. Output: `https://short.ly/a1B2c3`

If the input URL is already shorter than `https://short.ly/a1B2c3`, return the original URL.
