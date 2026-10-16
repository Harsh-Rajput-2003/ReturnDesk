import { NextResponse } from 'next/server';

// An error we throw on purpose, with the HTTP status the client should receive
export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details; // optional { fieldName: 'message' }
  }
}

// Every success response looks like { success: true, data: ... }
export function ok(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

// Every error response looks like { success: false, error: { message, details } }
function fail(status, message, details = null) {
  return NextResponse.json({ success: false, error: { message, details } }, { status });
}

// Turns any thrown error into a safe JSON response (no stack traces, no credentials)
export function handleError(error) {
  if (error instanceof ApiError) {
    return fail(error.status, error.message, error.details);
  }
  // PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  if (error && error.code === '23505') {
    if (error.constraint === 'uniq_active_order_item') {
      return fail(409, 'An active return request already exists for this order and item.');
    }
    return fail(409, 'A record with these values already exists.');
  }
  if (error && (error.code === '23514' || error.code === '23502' || error.code === '22001' || error.code === '22003')) {
    return fail(400, 'Some of the values are not allowed. Please check your input.');
  }
  console.error('Unexpected server error:', error); // only visible in the server terminal
  return fail(500, 'Something went wrong on the server. Please try again.');
}

// Reads the JSON body and makes sure it is an object
export async function readJson(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON object.');
  }
  return body;
}

// Validators return { errors, values }. This throws a 400 if there are any errors.
export function assertValid({ errors, values }) {
  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, 'Validation failed. Please check the highlighted fields.', errors);
  }
  return values;
}

// Turns the "[id]" part of the URL into a safe integer
export function parseId(rawId) {
  if (!/^\d+$/.test(rawId)) {
    throw new ApiError(400, 'Request ID must be a positive whole number.');
  }
  const id = Number(rawId);
  if (id < 1 || id > 2147483647) {
    throw new ApiError(404, 'Return request not found.');
  }
  return id;
}
