# Segment 05 - Basic Redirect Server

## Objective

Implement a Node.js-based HTTP server that handles requests for short URLs and performs redirects to the original URL.

## Tasks

-   In `server.js`, add routing logic to:

    -   Serve `index.html` for the root path `/`.
    -   Parse incoming paths like `/abc123`.
    -   Use the same logic from previous segments to:
        -   Reverse-lookup or regenerate the original normalized URL (deterministically).
        -   Redirect to the full original URL using a `302` response.

-   Ensure invalid short IDs or improperly formed URLs result in a 400 or 404 response.

-   Make sure the server can:
    -   Log each request to the console.
    -   Respond quickly with minimal overhead.

## Notes

-   Use only built-in modules or Express (if desired).
-   Avoid implementing persistence at this stage; regenerate as needed.
-   Keep server logic in `server.js`, calling utility functions from `src/shorten.js`.

## Optional

-   Add basic logging middleware.
-   Implement error pages or plain-text error messages for 400/404 responses.
