// Inserts 32 sample requests. Repeatable: it CLEARS both tables first, then re-inserts.
// Usage: npm run db:seed   (run `npm run db:setup` once before this)
const { connect } = require('./db-client');

// [customer, order, item, qty, reason, status, resolution, refund, daysAgo, extra notes]
const ROWS = [
  // ---- Open (9) ----
  ['Priya Sharma', 'ORD-10231', 'Wireless Earbuds Pro', 1, 'Damaged', 'Open', null, null, 2, ['Customer sent photos of the cracked charging case.']],
  ['Daniel Carter', 'ORD-10234', 'Cotton Crew T-Shirt (Navy, L)', 2, 'Size Issue', 'Open', null, null, 3, []],
  ['Maria Gonzalez', 'ORD-10240', 'Ceramic Table Lamp', 1, 'Damaged', 'Open', null, null, 4, ['Courier confirmed the parcel was dropped during delivery.']],
  ['Arjun Mehta', 'ORD-10245', 'Running Shoes Size 9', 1, 'Size Issue', 'Open', null, null, 5, []],
  ['Sophie Laurent', 'ORD-10251', 'Stainless Steel Water Bottle', 3, 'Wrong Item', 'Open', null, null, 6, ['Customer received the 500ml bottle instead of the 750ml one.']],
  ["Liam O'Connor", 'ORD-10260', 'Bluetooth Speaker', 1, 'Not As Described', 'Open', null, null, 7, []],
  ['Aisha Khan', 'ORD-10268', 'Yoga Mat 6mm', 1, 'Changed Mind', 'Open', null, null, 8, []],
  ['Tom Becker', 'ORD-10275', 'Mechanical Keyboard', 1, 'Wrong Item', 'Open', null, null, 9, []],
  // New request for an item whose earlier request was Rejected (allowed by the duplicate rule)
  ['Neha Patel', 'ORD-10412', 'Wireless Headphones', 1, 'Changed Mind', 'Open', null, null, 1, ['Earlier request for this item was rejected; customer submitted a new one.']],
  // ---- In Review (7) ----
  ['Carlos Ramirez', 'ORD-10190', 'Standing Desk Converter', 1, 'Not As Described', 'In Review', null, null, 10, ['Listing said 80cm wide, customer measured 70cm.']],
  ['Emily Johnson', 'ORD-10195', 'Denim Jacket (M)', 1, 'Size Issue', 'In Review', null, null, 11, []],
  ['Ravi Nair', 'ORD-10199', 'Air Fryer 4L', 1, 'Damaged', 'In Review', null, null, 12, ['Waiting for the warehouse to inspect the returned unit.']],
  ['Hannah Weber', 'ORD-10203', 'Leather Wallet', 2, 'Wrong Item', 'In Review', null, null, 13, []],
  ['Omar Haddad', 'ORD-10208', 'Smart Watch Band', 1, 'Not As Described', 'In Review', null, null, 14, []],
  ['Chloe Martin', 'ORD-10212', 'Scented Candle Set', 4, 'Damaged', 'In Review', null, null, 15, ['Three of four candles arrived broken.']],
  ['Vikram Singh', 'ORD-10216', 'Laptop Backpack', 1, 'Changed Mind', 'In Review', null, null, 16, []],
  // ---- Approved (6) ----
  ['Grace Kim', 'ORD-10120', 'Noise Cancelling Headphones', 1, 'Damaged', 'Approved', 'Refund', 189.99, 20, ['Return label emailed to the customer.']],
  ['Jack Wilson', 'ORD-10125', 'Bed Sheet Set (Queen)', 1, 'Not As Described', 'Approved', 'Store Credit', null, 21, []],
  ['Fatima Zahra', 'ORD-10131', 'Electric Kettle', 1, 'Damaged', 'Approved', 'Replacement', null, 22, ['Replacement shipped, tracking number added to the order.']],
  ['Ethan Brown', 'ORD-10138', 'Hiking Boots Size 10', 1, 'Size Issue', 'Approved', 'Refund', 94.5, 24, []],
  ['Isabella Rossi', 'ORD-10142', 'Desk Organizer', 2, 'Wrong Item', 'Approved', 'Replacement', null, 25, []],
  ['Sanjay Rao', 'ORD-10147', 'Portable Charger 20000mAh', 1, 'Not As Described', 'Approved', 'Refund', 39, 26, []],
  // ---- Rejected (4) ----
  ['Olivia Taylor', 'ORD-10080', 'Winter Coat', 1, 'Changed Mind', 'Rejected', null, null, 30, ['Return window had expired before the request was submitted.']],
  ['Noah Davis', 'ORD-10085', 'Gaming Mouse', 1, 'Damaged', 'Rejected', null, null, 33, ['Photos show damage that did not happen during shipping.']],
  ['Meera Iyer', 'ORD-10091', 'Silk Scarf', 1, 'Changed Mind', 'Rejected', null, null, 35, []],
  ['Neha Patel', 'ORD-10412', 'Wireless Headphones', 1, 'Damaged', 'Rejected', null, null, 40, ['Item was returned used and with missing parts.']],
  // ---- Completed (6) ----
  ['William Clark', 'ORD-09980', 'Coffee Grinder', 1, 'Damaged', 'Completed', 'Refund', 64, 45, ['Refund issued to the original payment method.']],
  ['Ananya Das', 'ORD-09985', 'Linen Curtains', 2, 'Size Issue', 'Completed', 'Replacement', null, 48, []],
  ['Henry Evans', 'ORD-09990', 'Bluetooth Tracker 4-Pack', 1, 'Wrong Item', 'Completed', 'Store Credit', null, 50, []],
  ['Zoe Turner', 'ORD-09996', 'Foam Roller', 1, 'Changed Mind', 'Completed', 'Refund', 22.5, 52, []],
  ['Mohammed Ali', 'ORD-10002', 'Tablet Case 11 inch', 1, 'Not As Described', 'Completed', 'Refund', 18.99, 55, []],
  ['Lily Anderson', 'ORD-10007', 'Cast Iron Skillet', 1, 'Damaged', 'Completed', 'Replacement', null, 58, ['Replacement delivered and confirmed by the customer.']],
];

// The status path each request went through before reaching its current status
const PATHS = {
  'Open': [],
  'In Review': ['In Review'],
  'Approved': ['In Review', 'Approved'],
  'Rejected': ['In Review', 'Rejected'],
  'Completed': ['In Review', 'Approved', 'Completed'],
};

function makeEmail(name) {
  return name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '.') + '@example.com';
}

function describeResolution(resolution, refund) {
  return resolution === 'Refund' ? `Refund of $${refund.toFixed(2)}` : resolution;
}

async function main() {
  const client = await connect();
  try {
    await client.query('BEGIN');
    // Wipe old data so the seed can be run again and again
    await client.query('TRUNCATE return_notes, return_requests RESTART IDENTITY');
    await client.query('ALTER SEQUENCE return_ref_seq RESTART WITH 1001');

    for (const [name, order, item, qty, reason, status, resolution, refund, daysAgo, extraNotes] of ROWS) {
      const created = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

      // Build the timeline: created -> status changes -> manual notes (2 hours apart)
      const events = [{ text: 'Return request created.', author: 'System' }];
      let previous = 'Open';
      for (const next of PATHS[status]) {
        let text = `Status changed from ${previous} to ${next}.`;
        if (next === 'Approved') text += ` Resolution: ${describeResolution(resolution, refund)}.`;
        events.push({ text, author: 'System' });
        previous = next;
      }
      extraNotes.forEach((text) => events.push({ text, author: 'Support Agent' }));
      const timeOf = (index) => new Date(created + index * 2 * 60 * 60 * 1000);

      const inserted = await client.query(
        `INSERT INTO return_requests
           (reference_number, customer_name, customer_email, order_number, item_name, quantity,
            return_reason, status, resolution, refund_amount, created_at, updated_at)
         VALUES ('RD-' || nextval('return_ref_seq'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [name, makeEmail(name), order, item, qty, reason, status, resolution, refund,
         timeOf(0), timeOf(events.length - 1)]
      );
      const requestId = inserted.rows[0].id;

      for (let i = 0; i < events.length; i++) {
        await client.query(
          'INSERT INTO return_notes (request_id, note_text, author_label, created_at) VALUES ($1, $2, $3, $4)',
          [requestId, events[i].text, events[i].author, timeOf(i)]
        );
      }
    }
    await client.query('COMMIT');

    const summary = await client.query('SELECT status, COUNT(*)::int AS total FROM return_requests GROUP BY status ORDER BY status');
    console.log(`Seeded ${ROWS.length} return requests:`);
    summary.rows.forEach((row) => console.log(`  ${row.status}: ${row.total}`));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Seeding failed:', error.message);
  console.error('Have you run "npm run db:setup" first?');
  process.exit(1);
});
