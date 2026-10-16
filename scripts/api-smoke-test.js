// Black-box test of the REAL API and database. Start the app first (npm run dev), then run:
//   npm run test:api
// It creates its own "SMOKE-..." records, and soft-deletes what it can at the end.
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const RUN = Date.now().toString(36).toUpperCase();
let passed = 0;
let failed = 0;

async function call(method, path, body) {
  const response = await fetch(BASE_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await response.json(); } catch { /* ignore */ }
  return { status: response.status, json, data: json && json.data };
}

function check(name, condition, extra = '') {
  if (condition) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
}

const base = (suffix, overrides = {}) => ({
  customer_name: 'Smoke Tester', customer_email: 'smoke@example.com',
  order_number: `SMOKE-${RUN}-${suffix}`, item_name: 'Test Item', quantity: 1, return_reason: 'Damaged', ...overrides,
});

async function create(suffix, overrides) {
  const result = await call('POST', '/api/requests', base(suffix, overrides));
  return result;
}
const transition = (id, body) => call('PATCH', `/api/requests/${id}/transition`, body);

async function main() {
  const cleanup = [];

  console.log('\nValidation');
  check('empty body -> 400', (await call('POST', '/api/requests', {})).status === 400);
  check('bad email -> 400', (await create('V1', { customer_email: 'nope' })).status === 400);
  check('quantity 0 -> 400', (await create('V2', { quantity: 0 })).status === 400);
  check('quantity 1.5 -> 400', (await create('V3', { quantity: 1.5 })).status === 400);
  check('bad reason -> 400', (await create('V4', { return_reason: 'Bored' })).status === 400);
  check('GET unknown id -> 404', (await call('GET', '/api/requests/2000000000')).status === 404);
  check('GET invalid id -> 400', (await call('GET', '/api/requests/abc')).status === 400);

  console.log('\nCreate + duplicate prevention');
  const first = await create('A');
  check('create -> 201 with reference number', first.status === 201 && /^RD-\d+$/.test(first.data.reference_number), JSON.stringify(first.json));
  const id = first.data.id;
  check('new request is Open', first.data.status === 'Open');
  check('duplicate active (same order + item) -> 409', (await create('A')).status === 409);
  check('duplicate ignores letter case -> 409', (await create('A', { item_name: 'TEST item' })).status === 409);
  const otherItem = await create('A', { item_name: 'Other Item' });
  check('same order, different item -> 201', otherItem.status === 201);
  const race = await Promise.all(Array.from({ length: 6 }, () => create('RACE')));
  const created = race.filter((r) => r.status === 201).length;
  const conflicts = race.filter((r) => r.status === 409).length;
  check('6 simultaneous creates -> exactly 1 succeeds, 5 conflict', created === 1 && conflicts === 5, `created=${created} conflicts=${conflicts}`);

  console.log('\nStatus workflow');
  check('Open -> Approved blocked (409)', (await transition(id, { status: 'Approved', resolution: 'Replacement' })).status === 409);
  check('Open -> Completed blocked (409)', (await transition(id, { status: 'Completed' })).status === 409);
  check('Open -> In Review ok', (await transition(id, { status: 'In Review' })).status === 200);
  check('In Review -> Open blocked (409)', (await transition(id, { status: 'Open' })).status === 409);
  check('unknown status -> 400', (await transition(id, { status: 'Done' })).status === 400);

  console.log('\nEditing + deletion rules while In Review');
  check('edit while In Review -> 200', (await call('PATCH', `/api/requests/${id}`, { quantity: 3 })).status === 200);
  check('PATCH cannot change status -> 400', (await call('PATCH', `/api/requests/${id}`, { status: 'Approved' })).status === 400);
  check('delete In Review -> 409', (await call('DELETE', `/api/requests/${id}`)).status === 409);

  console.log('\nResolution + refund rules');
  check('approve without resolution -> 400', (await transition(id, { status: 'Approved' })).status === 400);
  check('Refund without amount -> 400', (await transition(id, { status: 'Approved', resolution: 'Refund' })).status === 400);
  check('Refund amount 0 -> 400', (await transition(id, { status: 'Approved', resolution: 'Refund', refund_amount: 0 })).status === 400);
  check('Replacement with amount -> 400', (await transition(id, { status: 'Approved', resolution: 'Replacement', refund_amount: 5 })).status === 400);
  check('Store Credit with amount -> 400', (await transition(id, { status: 'Approved', resolution: 'Store Credit', refund_amount: 5 })).status === 400);
  const stillInReview = await call('GET', `/api/requests/${id}`);
  check('failed approvals left status unchanged', stillInReview.data.request.status === 'In Review');
  const approved = await transition(id, { status: 'Approved', resolution: 'Refund', refund_amount: 25.5 });
  check('Refund 25.50 -> 200', approved.status === 200 && approved.data.status === 'Approved' && approved.data.refund_amount === 25.5, JSON.stringify(approved.json));

  console.log('\nLocked after approval; notes always allowed');
  check('edit Approved -> 409', (await call('PATCH', `/api/requests/${id}`, { quantity: 5 })).status === 409);
  check('delete Approved -> 409', (await call('DELETE', `/api/requests/${id}`)).status === 409);
  check('note on Approved -> 201', (await call('POST', `/api/requests/${id}/notes`, { note_text: 'Approved note' })).status === 201);
  check('empty note -> 400', (await call('POST', `/api/requests/${id}/notes`, { note_text: '   ' })).status === 400);
  check('Approved -> Rejected blocked (409)', (await transition(id, { status: 'Rejected' })).status === 409);
  check('Approved -> Completed ok', (await transition(id, { status: 'Completed' })).status === 200);
  check('Completed is final (409)', (await transition(id, { status: 'In Review' })).status === 409);
  check('edit Completed -> 409', (await call('PATCH', `/api/requests/${id}`, { quantity: 5 })).status === 409);
  check('delete Completed -> 409', (await call('DELETE', `/api/requests/${id}`)).status === 409);
  check('note on Completed -> 201', (await call('POST', `/api/requests/${id}/notes`, { note_text: 'Completed note' })).status === 201);
  check('note on Open request -> 201', (await call('POST', `/api/requests/${otherItem.data.id}/notes`, { note_text: 'Open note' })).status === 201);

  const detail = await call('GET', `/api/requests/${id}`);
  const times = detail.data.notes.map((n) => new Date(n.created_at).getTime());
  check('notes are oldest first', times.every((t, i) => i === 0 || times[i - 1] <= times[i]));
  check('notes include status-change history', detail.data.notes.some((n) => n.note_text.startsWith('Status changed from In Review to Approved')));

  console.log('\nNew request allowed once the old one is Completed');
  const again = await create('A');
  check('same order + item after Completed -> 201', again.status === 201, JSON.stringify(again.json));
  cleanup.push(again.data.id);

  console.log('\nRejected + soft deletion');
  const rej = await create('B');
  await transition(rej.data.id, { status: 'In Review' });
  check('In Review -> Rejected ok', (await transition(rej.data.id, { status: 'Rejected' })).status === 200);
  check('Rejected cannot reopen (409)', (await transition(rej.data.id, { status: 'Open' })).status === 409);
  check('new request after Rejected -> 201', (await create('B')).status === 201);
  const del = await call('DELETE', `/api/requests/${rej.data.id}`);
  check('delete Rejected -> 200 with deleted_at', del.status === 200 && Boolean(del.data.deleted_at));
  check('deleted request hidden from GET detail (404)', (await call('GET', `/api/requests/${rej.data.id}`)).status === 404);
  check('deleted request cannot be deleted again (404)', (await call('DELETE', `/api/requests/${rej.data.id}`)).status === 404);
  check('note on deleted request -> 404', (await call('POST', `/api/requests/${rej.data.id}/notes`, { note_text: 'x' })).status === 404);

  const openOne = await create('C');
  check('delete Open -> 200', (await call('DELETE', `/api/requests/${openOne.data.id}`)).status === 200);
  check('re-create same order + item after soft delete -> 201', (await create('C')).status === 201);

  console.log('\nStats, search, filter, sort, pagination');
  const stats = await call('GET', '/api/stats');
  check('stats has counts', stats.status === 200 && Number.isInteger(stats.data.open) && Number.isInteger(stats.data.completed));
  const all = await call('GET', '/api/requests?page_size=50');
  check('list returns pagination info', all.status === 200 && all.data.pagination.total >= 1);
  check('deleted requests are not listed', !all.data.items.some((r) => r.id === rej.data.id));
  const byOrder = await call('GET', `/api/requests?search=SMOKE-${RUN}-A`);
  check('search by order number', byOrder.data.items.length >= 1 && byOrder.data.items.every((r) => r.order_number.includes(`SMOKE-${RUN}-A`)));
  const byRef = await call('GET', `/api/requests?search=${first.data.reference_number}`);
  check('search by reference number', byRef.data.items.some((r) => r.id === id));
  check('search by customer name', (await call('GET', '/api/requests?search=smoke%20tester')).data.items.length >= 1);
  check('search treats % as plain text', (await call('GET', '/api/requests?search=%25')).data.items.length === 0);
  check('filter by status', (await call('GET', '/api/requests?status=Completed&page_size=50')).data.items.every((r) => r.status === 'Completed'));
  check('filter by reason', (await call('GET', '/api/requests?reason=Damaged&page_size=50')).data.items.every((r) => r.return_reason === 'Damaged'));
  check('status + reason + search compose', (await call('GET', `/api/requests?status=Completed&reason=Damaged&search=SMOKE-${RUN}`)).data.items.every((r) => r.status === 'Completed' && r.return_reason === 'Damaged'));
  const newest = await call('GET', '/api/requests?sort=newest&page_size=50');
  const oldest = await call('GET', '/api/requests?sort=oldest&page_size=50');
  const dates = (r) => r.data.items.map((x) => new Date(x.created_at).getTime());
  check('sort newest first', dates(newest).every((t, i, a) => i === 0 || a[i - 1] >= t));
  check('sort oldest first', dates(oldest).every((t, i, a) => i === 0 || a[i - 1] <= t));
  const page1 = await call('GET', '/api/requests?page=1&page_size=2');
  const page2 = await call('GET', '/api/requests?page=2&page_size=2');
  check('page size respected', page1.data.items.length === 2 && page1.data.pagination.page_size === 2);
  check('pages do not overlap', page1.data.items.every((a) => !page2.data.items.some((b) => b.id === a.id)));
  check('invalid sort -> 400', (await call('GET', '/api/requests?sort=price')).status === 400);
  check('invalid status filter -> 400', (await call('GET', '/api/requests?status=Bogus')).status === 400);
  check('page_size 1000 -> 400', (await call('GET', '/api/requests?page_size=1000')).status === 400);
  check('SQL-injection style search is harmless', (await call('GET', "/api/requests?search=' OR 1=1; DROP TABLE return_requests;--")).status === 200);
  check('table still exists afterwards', (await call('GET', '/api/stats')).status === 200);

  for (const requestId of cleanup) await call('DELETE', `/api/requests/${requestId}`);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\nCould not run the tests. Is the app running at ' + BASE_URL + ' ?\n', error.message);
  process.exit(1);
});
