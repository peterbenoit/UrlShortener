# Segment 08 - Error Handling and Response Codes

## Objective

Improve robustness and reliability by implementing standardized error handling, HTTP status codes, and basic logging for failed or malformed requests.

## Tasks

### Server Enhancements

-   In `server.js`:

    -   Add try/catch blocks around all major route handlers.
    -   Ensure proper status codes are returned:
        -   `400` for invalid URL input or missing body fields.
        -   `404` for unknown short IDs.
        -   `500` for unexpected errors.
    -   Send JSON error responses with `{ error: 'description' }` or plain-text fallback.
    -   Log errors to the console with helpful messages and timestamps.

-   Apply input validation in the `/shorten` endpoint to:
    -   Ensure the input is a string.
    -   Ensure it resembles a valid URL before proceeding.

## Notes

-   These measures should prevent silent failures and aid in debugging.
-   They will also improve clarity for any future client apps consuming the service.
