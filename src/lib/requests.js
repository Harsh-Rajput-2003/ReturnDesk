import { query, withTransaction } from './db';
import { ApiError } from './api';
import { ALLOWED_TRANSITIONS, DELETABLE_STATUSES, EDITABLE_STATUSES } from './constants';

// refund_amount is NUMERIC in PostgreSQL; ::float8 makes it a normal JavaScript number
const COLUMNS = `id, reference_number, customer_name, customer_email, order_number, item_name,
  quantity, return_reason, status, resolution, refund_amount::float8 AS refund_amount,
  created_at, updated_at, deleted_at`;

// Whitelist: user input only chooses a KEY here, it is never pasted into the SQL text
const SORT_SQL = {
  newest: 'created_at DESC, id DESC',
  oldest: 'created_at ASC, id ASC',
};

// Search text must not act as a wildcard, so escape % _ and \
function escapeLike(text) {
  return text.replace(/[\\%_]/g, '\\$&');
}

function describeResolution(resolution, refundAmount) {
  return resolution === 'Refund' ? `Refund of $${refundAmount.toFixed(2)}` : resolution;
}

async function addSystemNote(client, requestId, text) {
  await client.query(
    `INSERT INTO return_notes (request_id, note_text, author_label) VALUES ($1, $2, 'System')`,
    [requestId, text]
  );
}

// Loads a non-deleted request and locks its row until the transaction ends.
// The lock stops two people changing the same request at the same moment.
async function lockRequest(client, id) {
  const result = await client.query(
    `SELECT ${COLUMNS} FROM return_requests WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
    [id]
  );
  if (result.rows.length === 0) throw new ApiError(404, 'Return request not found.');
  return result.rows[0];
}

export async function listRequests({ search, status, reason, sort, page, page_size }) {
  const conditions = ['deleted_at IS NULL']; // soft-deleted requests never appear
  const params = [];

  if (search) {
    params.push(`%${escapeLike(search)}%`);
    const p = `$${params.length}`;
    conditions.push(`(customer_name ILIKE ${p} OR order_number ILIKE ${p} OR reference_number ILIKE ${p})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (reason) {
    params.push(reason);
    conditions.push(`return_reason = $${params.length}`);
  }
  const where = conditions.join(' AND ');

  const countResult = await query(`SELECT COUNT(*)::int AS total FROM return_requests WHERE ${where}`, params);
  const total = countResult.rows[0].total;

  const limitParam = `$${params.length + 1}`;
  const offsetParam = `$${params.length + 2}`;
  const rows = await query(
    `SELECT ${COLUMNS} FROM return_requests WHERE ${where}
     ORDER BY ${SORT_SQL[sort]} LIMIT ${limitParam} OFFSET ${offsetParam}`,
    [...params, page_size, (page - 1) * page_size]
  );

  return {
    items: rows.rows,
    pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) },
  };
}

export async function getStats() {
  // "active" = not Rejected and not Completed (same meaning as the duplicate rule)
  const result = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status NOT IN ('Rejected', 'Completed'))::int AS active,
      COUNT(*) FILTER (WHERE status = 'Open')::int AS open,
      COUNT(*) FILTER (WHERE status = 'In Review')::int AS in_review,
      COUNT(*) FILTER (WHERE status = 'Approved')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'Rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed
    FROM return_requests
    WHERE deleted_at IS NULL`);
  return result.rows[0];
}

export async function getRequestById(id) {
  const requestResult = await query(
    `SELECT ${COLUMNS} FROM return_requests WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (requestResult.rows.length === 0) throw new ApiError(404, 'Return request not found.');

  const notesResult = await query(
    `SELECT id, request_id, note_text, author_label, created_at
     FROM return_notes WHERE request_id = $1 ORDER BY created_at ASC, id ASC`,
    [id]
  );
  return { request: requestResult.rows[0], notes: notesResult.rows };
}

export async function createRequest(values) {
  return withTransaction(async (client) => {
    // If an active request for this order + item exists, PostgreSQL rejects the insert (error 23505 -> 409)
    const result = await client.query(
      `INSERT INTO return_requests
         (reference_number, customer_name, customer_email, order_number, item_name, quantity, return_reason)
       VALUES ('RD-' || nextval('return_ref_seq'), $1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNS}`,
      [values.customer_name, values.customer_email, values.order_number,
       values.item_name, values.quantity, values.return_reason]
    );
    const created = result.rows[0];
    await addSystemNote(client, created.id, 'Return request created.');
    return created;
  });
}

export async function updateRequest(id, values) {
  return withTransaction(async (client) => {
    const current = await lockRequest(client, id);
    // Business rule: details are locked after approval, rejection or completion
    if (!EDITABLE_STATUSES.includes(current.status)) {
      throw new ApiError(409, `Details cannot be edited because the request is ${current.status}.`);
    }
    // Column names come from the validated whitelist (FIELD_RULES keys), never from raw input
    const fields = Object.keys(values);
    const setSql = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const result = await client.query(
      `UPDATE return_requests SET ${setSql}, updated_at = NOW()
       WHERE id = $${fields.length + 1} RETURNING ${COLUMNS}`,
      [...fields.map((field) => values[field]), id]
    );
    await addSystemNote(client, id, `Request details updated (${fields.join(', ')}).`);
    return result.rows[0];
  });
}

export async function transitionRequest(id, { status: newStatus, resolution, refund_amount }) {
  return withTransaction(async (client) => {
    const current = await lockRequest(client, id);

    const allowed = ALLOWED_TRANSITIONS[current.status];
    if (!allowed.includes(newStatus)) {
      const message = allowed.length === 0
        ? `A ${current.status} request is final and cannot be changed.`
        : `A request that is ${current.status} cannot be moved to ${newStatus}. Allowed next status: ${allowed.join(' or ')}.`;
      throw new ApiError(409, message);
    }

    // Status and resolution are written in ONE statement so they can never disagree
    let result;
    if (newStatus === 'Approved') {
      result = await client.query(
        `UPDATE return_requests
         SET status = $1, resolution = $2, refund_amount = $3, updated_at = NOW()
         WHERE id = $4 RETURNING ${COLUMNS}`,
        [newStatus, resolution, refund_amount ?? null, id]
      );
    } else {
      result = await client.query(
        `UPDATE return_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING ${COLUMNS}`,
        [newStatus, id]
      );
    }

    let noteText = `Status changed from ${current.status} to ${newStatus}.`;
    if (newStatus === 'Approved') noteText += ` Resolution: ${describeResolution(resolution, refund_amount)}.`;
    await addSystemNote(client, id, noteText);
    return result.rows[0];
  });
}

export async function addNote(id, { note_text, author_label }) {
  // One statement: inserts only if the request exists and is not deleted
  const result = await query(
    `INSERT INTO return_notes (request_id, note_text, author_label)
     SELECT id, $2::text, $3::varchar FROM return_requests WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, request_id, note_text, author_label, created_at`,
    [id, note_text, author_label]
  );
  if (result.rows.length === 0) throw new ApiError(404, 'Return request not found.');
  return result.rows[0];
}

export async function softDeleteRequest(id) {
  return withTransaction(async (client) => {
    const current = await lockRequest(client, id);
    if (!DELETABLE_STATUSES.includes(current.status)) {
      throw new ApiError(409, `A ${current.status} request cannot be deleted. Only Open or Rejected requests can be deleted.`);
    }
    // The row and its notes stay in the database. Setting deleted_at also frees the
    // order + item combination, because the unique index ignores deleted rows.
    const result = await client.query(
      `UPDATE return_requests SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING id, reference_number, deleted_at`,
      [id]
    );
    await addSystemNote(client, id, 'Request was deleted.');
    return result.rows[0];
  });
}
