import { HttpErrorResponse } from '@angular/common/http';

/** Turns an API error into a readable message: plain-text errors as-is, validation errors flattened into one line. */
export function describeApiError(err: HttpErrorResponse, fallback: string): string {
  if (err.status === 0) {
    return 'Could not reach the restaurant. Please check your connection and try again.';
  }
  if (typeof err.error === 'string' && err.error) {
    return err.error; // e.g. "Products not found or unavailable: 3"
  }
  const fieldErrors = err.error?.errors as Record<string, string[]> | undefined;
  if (fieldErrors) {
    return Object.values(fieldErrors).flat().join(' ');
  }
  return fallback;
}
