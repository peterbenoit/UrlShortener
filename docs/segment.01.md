# Segment 01 - Project Bootstrapping

## Objective

Initialize the URL Shortener project to prepare for further implementation. Set up the file structure, development environment, and base scaffolding.

## Tasks

-   Create a new project folder with the following structure:

    ```
    /public
    /src
    /docs
    index.html
    server.js
    ```

-   Populate `index.html` with basic HTML boilerplate and a form that allows URL input.
-   Set up `server.js` with a basic Node.js HTTP server using Express or native HTTP module.
-   Add a route for the homepage and serve `index.html`.
-   Prepare `src/shorten.js` (empty file) for future logic.
-   Ensure the server responds on a local development port (e.g., 3000).

## Notes

-   No ESM; use CommonJS-style `require()` and `module.exports`.
-   Use only built-in modules or locally defined code.
-   This project will be deployable to Vercel later, but for now treat it as a local Node.js app.
