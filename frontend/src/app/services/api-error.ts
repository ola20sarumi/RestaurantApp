import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns an API error into a readable message. The API returns problem details (JSON): validation errors are flattened
 * into one line, other errors use `detail`. Plain-text bodies would be lost — with `withFetch()` a non-JSON error body
 * fails to parse and `err.error` becomes the SyntaxError — so the API must not return them.
 */
export function describeApiError(err: HttpErrorResponse, fallback: string): string {
  if (err.status === 0) {
    return 'Could not reach the restaurant. Please check your connection and try again.';
  }
  const fieldErrors = err.error?.errors as Record<string, string[]> | undefined;
  if (fieldErrors) {
    return Object.values(fieldErrors).flat().join(' ');
  }
  const detail = err.error?.detail;
  if (typeof detail === 'string' && detail) {
    return detail; // e.g. "Products not found or unavailable: 3"
  }
  return fallback;
}
