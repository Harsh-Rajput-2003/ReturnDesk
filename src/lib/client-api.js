// Small wrapper around fetch() used by every component.
export class ApiClientError extends Error {
  constructor(message, details = null) {
    super(message);
    this.details = details; // { fieldName: 'message' } for validation errors
  }
}

export async function apiFetch(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
  } catch {
    throw new ApiClientError('Could not reach the server. Please check your connection.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // not JSON; handled below
  }
  if (!response.ok || !payload || !payload.success) {
    const error = payload && payload.error;
    throw new ApiClientError((error && error.message) || 'Something went wrong. Please try again.', error && error.details);
  }
  return payload.data;
}

// One readable sentence for an error (joins field errors if there are any)
export function errorText(error) {
  if (error.details) return Object.values(error.details).join(' ');
  return error.message;
}
