-- ReturnDesk database schema. Safe to run more than once.
-- Requires PostgreSQL 12 or newer.

-- Reference numbers come from a sequence, so they are unique even when
-- two requests are created at the same moment (e.g. RD-1001, RD-1002).
CREATE SEQUENCE IF NOT EXISTS return_ref_seq START 1001;

CREATE TABLE IF NOT EXISTS return_requests (
  id               SERIAL PRIMARY KEY,
  reference_number VARCHAR(20)  NOT NULL UNIQUE,
  customer_name    VARCHAR(100) NOT NULL,
  customer_email   VARCHAR(255) NOT NULL,
  order_number     VARCHAR(50)  NOT NULL,
  item_name        VARCHAR(150) NOT NULL,
  quantity         INTEGER      NOT NULL,
  return_reason    VARCHAR(30)  NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'Open',
  resolution       VARCHAR(20),
  refund_amount    NUMERIC(10,2),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  CONSTRAINT chk_text_not_blank CHECK (
    length(btrim(customer_name)) > 0 AND length(btrim(customer_email)) > 0 AND
    length(btrim(order_number)) > 0 AND length(btrim(item_name)) > 0
  ),
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_return_reason CHECK (
    return_reason IN ('Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind')
  ),
  CONSTRAINT chk_status CHECK (
    status IN ('Open', 'In Review', 'Approved', 'Rejected', 'Completed')
  ),
  CONSTRAINT chk_resolution CHECK (
    resolution IS NULL OR resolution IN ('Refund', 'Replacement', 'Store Credit')
  ),
  -- Refund needs a positive amount. Replacement / Store Credit / no resolution must have no amount.
  CONSTRAINT chk_refund_rules CHECK (
    (resolution = 'Refund' AND refund_amount IS NOT NULL AND refund_amount > 0)
    OR (resolution IS DISTINCT FROM 'Refund' AND refund_amount IS NULL)
  ),
  -- Approved and Completed requests must have a resolution; other statuses must not.
  CONSTRAINT chk_status_resolution CHECK (
    (status IN ('Approved', 'Completed')) = (resolution IS NOT NULL)
  )
);

-- Only ONE active request per order + item.
-- "Active" = not deleted and not Rejected/Completed. Because the database enforces it,
-- two people clicking "Create" at the same time cannot both succeed.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_order_item
  ON return_requests (LOWER(order_number), LOWER(item_name))
  WHERE deleted_at IS NULL AND status NOT IN ('Rejected', 'Completed');

CREATE INDEX IF NOT EXISTS idx_requests_status     ON return_requests (status)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_reason     ON return_requests (return_reason) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON return_requests (created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS return_notes (
  id           SERIAL PRIMARY KEY,
  request_id   INTEGER      NOT NULL REFERENCES return_requests(id),
  note_text    TEXT         NOT NULL,
  author_label VARCHAR(50)  NOT NULL DEFAULT 'Support Agent',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_note_not_blank CHECK (length(btrim(note_text)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_notes_request ON return_notes (request_id, created_at, id);

-- Notes are append-only: the database refuses to edit or delete them.
CREATE OR REPLACE FUNCTION prevent_note_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Activity notes are append-only and cannot be edited or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS return_notes_append_only ON return_notes;
CREATE TRIGGER return_notes_append_only
  BEFORE UPDATE OR DELETE ON return_notes
  FOR EACH ROW EXECUTE FUNCTION prevent_note_changes();
