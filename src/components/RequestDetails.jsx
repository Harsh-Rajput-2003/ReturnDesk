'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import RequestForm from './RequestForm';
import StatusBadge from './StatusBadge';
import Timeline from './Timeline';
import { apiFetch, errorText } from '@/lib/client-api';
import { ALLOWED_TRANSITIONS, DELETABLE_STATUSES, EDITABLE_STATUSES, RESOLUTIONS } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';
import { btnDanger, btnPrimary, btnSecondary, inputClass } from './styles';

const TRANSITION_LABELS = {
  'In Review': 'Move to In Review',
  Approved: 'Approve…',
  Rejected: 'Reject',
  Completed: 'Mark as Completed',
};

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export default function RequestDetails({ requestId, onClose, onChanged }) {
  const [data, setData] = useState(null); // { request, notes }
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'approve'
  const [resolution, setResolution] = useState('Refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const load = useCallback(async () => {
    try {
      setData(await apiFetch(`/api/requests/${requestId}`));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message);
    }
  }, [requestId]);

  useEffect(() => { load(); }, [load]);

  // Runs an API call, then refreshes this window AND the dashboard behind it
  async function runAction(action, successText) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await load();
      onChanged();
      setMessage({ type: 'success', text: successText });
      return true;
    } catch (error) {
      setMessage({ type: 'error', text: errorText(error) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status, extra = {}) {
    const success = await runAction(
      () => apiFetch(`/api/requests/${requestId}/transition`, { method: 'PATCH', body: JSON.stringify({ status, ...extra }) }),
      `Status changed to ${status}.`
    );
    if (success) setMode('view');
  }

  function handleTransitionClick(status) {
    if (status === 'Approved') {
      setMessage(null);
      setMode('approve');
    } else if (status === 'Rejected') {
      if (window.confirm('Reject this request? Rejected requests cannot be reopened.')) changeStatus(status);
    } else {
      changeStatus(status);
    }
  }

  function submitApproval(event) {
    event.preventDefault();
    changeStatus('Approved', resolution === 'Refund' ? { resolution, refund_amount: refundAmount } : { resolution });
  }

  async function submitNote(event) {
    event.preventDefault();
    const success = await runAction(
      () => apiFetch(`/api/requests/${requestId}/notes`, { method: 'POST', body: JSON.stringify({ note_text: noteText }) }),
      'Note added.'
    );
    if (success) setNoteText('');
  }

  async function saveEdits(values) {
    // Only send fields that actually changed
    const changed = {};
    for (const [field, value] of Object.entries(values)) {
      if (String(value) !== String(data.request[field])) changed[field] = value;
    }
    if (Object.keys(changed).length > 0) {
      await apiFetch(`/api/requests/${requestId}`, { method: 'PATCH', body: JSON.stringify(changed) });
      await load();
      onChanged();
      setMessage({ type: 'success', text: 'Details updated.' });
    }
    setMode('view');
  }

  async function deleteRequest() {
    if (!window.confirm('Delete this request? It is hidden from the dashboard but kept in the database.')) return;
    setBusy(true);
    try {
      await apiFetch(`/api/requests/${requestId}`, { method: 'DELETE' });
      onChanged(`Request ${data.request.reference_number} was deleted.`);
      onClose();
    } catch (error) {
      setMessage({ type: 'error', text: errorText(error) });
      setBusy(false);
    }
  }

  // ----- Rendering -----
  if (loadError) {
    return (
      <Modal title="Request details" onClose={onClose}>
        <p role="alert" className="text-sm text-red-700">{loadError}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={load}>Try again</button>
          <button type="button" className={btnPrimary} onClick={onClose}>Close</button>
        </div>
      </Modal>
    );
  }
  if (!data) {
    return <Modal title="Request details" onClose={onClose}><p className="text-sm text-gray-600">Loading…</p></Modal>;
  }

  const { request, notes } = data;
  const canEdit = EDITABLE_STATUSES.includes(request.status);
  const canDelete = DELETABLE_STATUSES.includes(request.status);
  const nextStatuses = ALLOWED_TRANSITIONS[request.status];

  return (
    <Modal title={request.reference_number} onClose={onClose}>
      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}
        >
          {message.text}
        </div>
      )}

      {mode === 'edit' ? (
        <RequestForm initialValues={request} submitLabel="Save changes" onSubmit={saveEdits} onCancel={() => setMode('view')} />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3"><StatusBadge status={request.status} /></div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail label="Customer">{request.customer_name}</Detail>
            <Detail label="Email">{request.customer_email}</Detail>
            <Detail label="Order number">{request.order_number}</Detail>
            <Detail label="Item">{request.item_name}</Detail>
            <Detail label="Quantity">{request.quantity}</Detail>
            <Detail label="Return reason">{request.return_reason}</Detail>
            <Detail label="Created">{formatDate(request.created_at)}</Detail>
            <Detail label="Resolution">
              {request.resolution
                ? request.resolution === 'Refund' ? `Refund — ${formatMoney(request.refund_amount)}` : request.resolution
                : 'Not decided yet'}
            </Detail>
          </dl>

          {!canEdit && (
            <p className="mt-4 text-sm text-gray-500">Customer and item details are locked because this request is {request.status}.</p>
          )}

          {/* Actions: only the buttons that are allowed for the current status */}
          <div className="mt-5 flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <button key={status} type="button" disabled={busy} onClick={() => handleTransitionClick(status)} className={status === 'Rejected' ? btnDanger : btnPrimary}>
                {TRANSITION_LABELS[status]}
              </button>
            ))}
            {canEdit && <button type="button" disabled={busy} onClick={() => setMode('edit')} className={btnSecondary}>Edit details</button>}
            {canDelete && <button type="button" disabled={busy} onClick={deleteRequest} className={btnDanger}>Delete</button>}
          </div>

          {mode === 'approve' && (
            <form onSubmit={submitApproval} className="mt-4 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">Choose a resolution to approve this request</p>
              <select value={resolution} onChange={(e) => setResolution(e.target.value)} aria-label="Resolution" className={inputClass}>
                {RESOLUTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {resolution === 'Refund' && (
                <input type="number" min="0.01" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="Refund amount (USD)" aria-label="Refund amount" className={inputClass} />
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Confirm approval'}</button>
                <button type="button" disabled={busy} onClick={() => setMode('view')} className={btnSecondary}>Cancel</button>
              </div>
            </form>
          )}
        </>
      )}

      <section className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Activity timeline</h3>
        <Timeline notes={notes} />
        <form onSubmit={submitNote} className="mt-4 space-y-2">
          <label htmlFor="note_text" className="sr-only">Add a note</label>
          <textarea id="note_text" rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" className={inputClass} />
          <div className="flex justify-end">
            <button type="submit" disabled={busy || !noteText.trim()} className={btnSecondary}>Add note</button>
          </div>
        </form>
      </section>
    </Modal>
  );
}
