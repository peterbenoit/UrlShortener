# Segment 06 - In-Memory Mapping for Active Redirects

## Objective

Add temporary, in-memory mapping so that the server can successfully redirect short URLs created during the same session. This will allow the app to be usable during development without requiring persistent storage.

## Tasks

-   In `src/shorten.js`:

    -   Add an in-memory object to store mappings: `{ shortId: originalUrl }`.
    -   Update `getShortUrl(originalUrl)` to store the mapping after generating the shortId.
    -   Add a new function `resolveShortId(shortId)` that returns the original URL if it exists in the map, or null otherwise.
    -   Export both functions.

-   In `server.js`:
    -   Update the route handling `/abc123` to use `resolveShortId`.
    -   If found, perform a `302` redirect to the original URL.
    -   If not found, return a 404 response.

## Notes

-   This mapping will only persist for the duration of the server process (i.e., in-memory).
-   This approach does not violate the no-database constraint and is acceptable for testing and development purposes.

## Optional

-   Add logging for new mappings created and short IDs resolved.
