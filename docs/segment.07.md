# Segment 07 - Frontend Integration and Shorten Endpoint

## Objective

Enable actual use of the shortening service by wiring up the frontend form to a backend `/shorten` endpoint using fetch, and rendering the resulting short URL on the page.

## Tasks

### Client-Side

-   Create a new script file: `public/main.js`
-   In `index.html`:
    -   Add a `<script src="/main.js" defer></script>` tag before closing `</body>`.
-   In `main.js`:
    -   Intercept form submission (`submit` event on `#shorten-form`)
    -   Prevent default page reload
    -   Extract the input URL
    -   POST the URL to `/shorten` using `fetch()`
    -   Receive and display the shortened URL (or an error)

### Server-Side

-   In `server.js`:
    -   Add a `POST /shorten` route
    -   Extract the original URL from the request body (assume JSON)
    -   Pass it to `getShortUrl()` from `shorten.js`
    -   Return `{ shortUrl: '...' }` as JSON

## Notes

-   Make sure to use body-parsing middleware (`express.json()`) if using Express
-   Render the shortened URL below the form in a readable format
-   Log each shortening request to the console

## Optional

-   Add loading indicator or basic success/error message below the form
