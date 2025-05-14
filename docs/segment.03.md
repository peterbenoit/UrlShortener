# Segment 03 - Hash Generation and Short ID Encoding

## Objective

Implement deterministic short ID generation by hashing the normalized URL and encoding the result. This step transforms clean URLs into unique, reproducible short identifiers suitable for routing.

## Tasks

-   In `src/shorten.js`, implement a function `generateShortId(normalizedUrl)` that:
    -   Accepts a cleaned, normalized URL (from Segment 02).
    -   Generates a SHA-256 hash of the normalized URL using Node's `crypto` module.
    -   Encodes the hash result using a base62-like encoding (a–z, A–Z, 0–9).
    -   Truncates the result to 6–8 characters for brevity.
-   Export this function for later use in the redirect service.

-   In `src/shorten.js`, also include:
    -   A reusable base62 character set utility.
    -   A utility function to encode a `Buffer` or hex string into base62.

## Notes

-   Ensure consistent, deterministic output for the same normalized input.
-   Use only the first N bytes of the hash if necessary (e.g., first 4–5 bytes).
-   Keep the hash-to-ID conversion function isolated from HTTP/server concerns.
-   Use CommonJS syntax throughout.
-   Aim for simplicity over security; this is not meant to be cryptographically safe.

## Optional Enhancements (if time permits)

-   Add a collision check mechanism (e.g., rehash with salt or extend output length) — even if unused for now.
-   Include simple tests or console output to verify short ID results from known input strings.
