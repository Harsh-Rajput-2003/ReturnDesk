import { REASONS, RESOLUTIONS, SORT_OPTIONS, STATUSES } from './constants';

// Pure functions: no database, no HTTP. Each returns { errors, values }.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function textRule(label, maxLength) {
  return (value) => {
    const text = trimmed(value);
    if (!text) return { error: `${label} is required.` };
    if (text.length > maxLength) return { error: `${label} must be ${maxLength} characters or fewer.` };
    return { value: text };
  };
}

// One rule per editable field. Used for BOTH creating and editing a request.
const FIELD_RULES = {
  customer_name: textRule('Customer name', 100),
  customer_email: (value) => {
    const email = trimmed(value);
    if (!email) return { error: 'Customer email is required.' };
    if (email.length > 255 || !EMAIL_PATTERN.test(email)) return { error: 'Enter a valid email address.' };
    return { value: email };
  },
  order_number: textRule('Order number', 50),
  item_name: textRule('Item name', 150),
  quantity: (value) => {
    const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) {
      return { error: 'Quantity must be a positive whole number.' };
    }
    if (number > 1000) return { error: 'Quantity cannot be more than 1000.' };
    return { value: number };
  },
  return_reason: (value) => {
    if (!REASONS.includes(value)) return { error: `Return reason must be one of: ${REASONS.join(', ')}.` };
    return { value };
  },
};

export function validateNewRequest(body) {
  const errors = {};
  const values = {};
  for (const field of Object.keys(FIELD_RULES)) {
    const result = FIELD_RULES[field](body[field]);
    if (result.error) errors[field] = result.error;
    else values[field] = result.value;
  }
  return { errors, values };
}

// Only fields that were sent are checked. Unknown fields (like "status") are rejected.
export function validateUpdate(body) {
  const errors = {};
  const values = {};
  const fields = Object.keys(body);
  if (fields.length === 0) errors.general = 'Send at least one field to update.';
  for (const field of fields) {
    if (!FIELD_RULES[field]) {
      errors[field] = 'This field cannot be changed here.';
      continue;
    }
    const result = FIELD_RULES[field](body[field]);
    if (result.error) errors[field] = result.error;
    else values[field] = result.value;
  }
  return { errors, values };
}

export function validateNote(body) {
  const errors = {};
  const values = {};
  const text = trimmed(body.note_text);
  if (!text) errors.note_text = 'Note text cannot be empty.';
  else if (text.length > 2000) errors.note_text = 'Note text must be 2000 characters or fewer.';
  else values.note_text = text;

  const author = body.author_label === undefined ? 'Support Agent' : trimmed(body.author_label);
  if (!author || author.length > 50) errors.author_label = 'Author label must be 1 to 50 characters.';
  else values.author_label = author;
  return { errors, values };
}

export function validateTransition(body) {
  const errors = {};
  const values = {};
  if (!STATUSES.includes(body.status)) {
    errors.status = `Status must be one of: ${STATUSES.join(', ')}.`;
    return { errors, values };
  }
  values.status = body.status;

  const hasAmount = body.refund_amount !== undefined && body.refund_amount !== null && body.refund_amount !== '';
  const hasResolution = body.resolution !== undefined && body.resolution !== null && body.resolution !== '';

  // A resolution is only chosen when approving
  if (body.status !== 'Approved') {
    if (hasResolution) errors.resolution = 'A resolution can only be set when approving a request.';
    if (hasAmount) errors.refund_amount = 'A refund amount can only be set when approving a request.';
    return { errors, values };
  }

  if (!RESOLUTIONS.includes(body.resolution)) {
    errors.resolution = `Choose a resolution: ${RESOLUTIONS.join(', ')}.`;
    return { errors, values };
  }
  values.resolution = body.resolution;

  if (body.resolution === 'Refund') {
    const amount = typeof body.refund_amount === 'string' ? Number(body.refund_amount) : body.refund_amount;
    if (!hasAmount || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      errors.refund_amount = 'A refund needs an amount greater than 0.';
    } else if (amount > 99999999.99) {
      errors.refund_amount = 'Refund amount is too large.';
    } else if (Math.round(amount * 100) / 100 !== amount) {
      errors.refund_amount = 'Refund amount can have at most 2 decimal places.';
    } else {
      values.refund_amount = amount;
    }
  } else if (hasAmount) {
    errors.refund_amount = `${body.resolution} must not have a refund amount.`;
  }
  return { errors, values };
}

// Reads a whole number from the query string. Returns null when invalid.
function readInteger(raw, fallback, min, max) {
  if (raw === null || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const number = Number(raw);
  return number >= min && number <= max ? number : null;
}

export function validateListParams(searchParams) {
  const errors = {};
  const values = {};

  values.search = (searchParams.get('search') || '').trim().slice(0, 100);

  values.status = searchParams.get('status') || '';
  if (values.status && !STATUSES.includes(values.status)) errors.status = 'Unknown status.';

  values.reason = searchParams.get('reason') || '';
  if (values.reason && !REASONS.includes(values.reason)) errors.reason = 'Unknown return reason.';

  values.sort = searchParams.get('sort') || 'newest';
  if (!Object.keys(SORT_OPTIONS).includes(values.sort)) errors.sort = 'Sort must be "newest" or "oldest".';

  values.page = readInteger(searchParams.get('page'), 1, 1, 100000);
  if (values.page === null) errors.page = 'Page must be a whole number of 1 or more.';

  values.page_size = readInteger(searchParams.get('page_size'), 10, 1, 50);
  if (values.page_size === null) errors.page_size = 'Page size must be between 1 and 50.';

  return { errors, values };
}
