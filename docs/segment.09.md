# Segment 09 - Migrate to Vercel-Compatible API Routes

## Objective

Begin migration from Express to Vercel-native serverless functions, while preserving existing logic. This segment replaces `server.js` with function-based endpoints in `/api`, allowing deployment to Vercel without removing the existing Express setup.

## Tasks

### 1. Setup

-   Install Vercel CLI (if not already):
    ```sh
    npm install -g vercel
    ```

### 2. Add API Routes

-   Create `api/shorten.js`:

    -   Handle `POST` requests with JSON body `{ url: string }`
    -   Use `getShortUrl()` from `src/shorten.js`
    -   Return JSON `{ shortUrl }` or `{ error }`

-   Create `api/[shortId].js`:
    -   Handle `GET` requests to `/api/abc123`
    -   Use `resolveShortId()` from `src/shorten.js`
    -   Respond with a `302` redirect or `404`

### 3. Update Frontend

-   In `public/main.js`, update `fetch('/shorten')` to `fetch('/api/shorten')`

### 4. Test Locally

-   Run with:
    ```sh
    vercel dev
    ```
-   Confirm shortening and redirect both work via Vercel routes.

### Notes

-   Do **not** delete `server.js` or Express logic.
-   This allows local testing via Express, and Vercel testing via native handlers.
-   If this step fails or is unstable, you can revert or restart clean later.
