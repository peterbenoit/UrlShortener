# Segment 10 - Integrate Vercel KV for Persistent Redirects

## Objective

Replace the in-memory shortId map with Vercel KV to ensure persistence across serverless executions. This will enable shortened URLs to function correctly when accessed through Vercel-deployed endpoints.

## Tasks

### 1. Enable KV in Vercel

-   Go to your Vercel dashboard
-   Add the **KV Integration** to your project
-   Vercel will automatically inject the following environment variables:
    -   `KV_REST_API_URL`
    -   `KV_REST_API_TOKEN`

### 2. Install Client

```sh
npm install @vercel/kv
```

### 3. Update `shorten.js`

-   Import and use the `kv` client:
    ```js
    import { kv } from '@vercel/kv';
    ```
-   In `getShortUrl()`:
    -   After generating the short ID, call:
        ```js
        await kv.set(shortId, originalUrl);
        ```
-   In `resolveShortId()`:
    -   Replace in-memory lookup with:
        ```js
        const originalUrl = await kv.get(shortId);
        ```

### 4. Update API Routes

-   Ensure both `shorten.js` and `/api` functions support `async/await`.
-   Handle cases where `kv.get()` returns null in the redirect handler.

## Notes

-   This eliminates the dependency on server memory for redirect logic.
-   The project is now deployable and functional on Vercel with persistent URL resolution.
-   You may optionally remove the in-memory map after verifying KV works.

## Optional

-   Add TTL (time-to-live) if you want short links to expire:
    ```js
    await kv.set(shortId, originalUrl, { ex: 86400 }); // 1 day in seconds
    ```
