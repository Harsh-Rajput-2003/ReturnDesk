// Business rules shared by the server (validation, SQL) and the browser (which buttons to show).
export const STATUSES = ['Open', 'In Review', 'Approved', 'Rejected', 'Completed'];
export const REASONS = ['Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind'];
export const RESOLUTIONS = ['Refund', 'Replacement', 'Store Credit'];

// The ONLY allowed status changes. Rejected and Completed are final.
export const ALLOWED_TRANSITIONS = {
  Open: ['In Review'],
  'In Review': ['Approved', 'Rejected'],
  Approved: ['Completed'],
  Rejected: [],
  Completed: [],
};

// Customer/item details can only be edited in these statuses
export const EDITABLE_STATUSES = ['Open', 'In Review'];

// Only these requests can be soft-deleted
export const DELETABLE_STATUSES = ['Open', 'Rejected'];

export const SORT_OPTIONS = { newest: 'Newest first', oldest: 'Oldest first' };
export const PAGE_SIZES = [10, 25, 50];
