
# Segment 02 - URL Normalization & Validation

## Objective

Implement core logic to clean and validate the input URL before it is hashed. This step ensures consistent output and prevents invalid or malformed input.

## Tasks

- In `src/shorten.js`, implement a function to:
  - Strip query parameters (`?`) and fragments (`#`) from the URL.
  - Normalize the URL:
    - Lowercase the domain.
    - Remove trailing slashes (unless it's root).
    - Remove protocol (`http://` or `https://`) for consistent hashing.
  - Validate that the input is a well-formed URL.
- Return the cleaned URL or an error if invalid.

## Notes

- Use Node's `url` or `URL` module for parsing.
- This function should not perform hashing—only cleaning and validation.
- Keep the output deterministic and consistent across repeated inputs.