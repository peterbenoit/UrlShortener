# Segment 04 - Short URL Construction and Return Logic

## Objective

Build logic to return a fully constructed short URL using the previously generated short ID, including a check to return the original URL if it is already shorter than the shortened version.

## Tasks

-   In `src/shorten.js`, implement a function `getShortUrl(originalUrl)` that:

    -   Calls the normalization/validation function (Segment 02).
    -   Calls the hash/encoding function (Segment 03) on the normalized result.
    -   Builds a full short URL (e.g., `https://short.ly/abc123`).
    -   Compares the length of the original URL to the short URL.
    -   Returns the original URL if it is already shorter.

-   Export this function from the module for use in server logic.

## Notes

-   The domain (e.g., `https://short.ly/`) can be hardcoded or injected via environment/config.
-   Be sure to trim or sanitize trailing slashes in the short domain.
-   Do not include any HTTP server or routing logic here.

## Example

```js
getShortUrl('https://www.example.com/page?ref=abc#section1');
// → 'https://short.ly/a1B2c3' or original if shorter
```
