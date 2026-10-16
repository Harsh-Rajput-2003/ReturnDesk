'use client';

import { useState } from 'react';
import { REASONS } from '@/lib/constants';
import { btnPrimary, btnSecondary, inputClass } from './styles';

const EMPTY_VALUES = {
  customer_name: '', customer_email: '', order_number: '', item_name: '', quantity: '1', return_reason: '',
};

function Field({ label, name, error, children }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Used for both "create" and "edit". The server does the real validation;
// this form just shows whatever errors the server sends back.
export default function RequestForm({ initialValues, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState({ ...EMPTY_VALUES, ...initialValues });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError('');
    try {
      await onSubmit(values);
    } catch (error) {
      setFieldErrors(error.details || {});
      setFormError(error.details ? (error.details.general || 'Please fix the highlighted fields.') : error.message);
    } finally {
      setSaving(false);
    }
  }

  const common = (name) => ({ id: name, name, value: values[name], onChange: handleChange, className: inputClass });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer name" name="customer_name" error={fieldErrors.customer_name}>
          <input type="text" autoComplete="off" {...common('customer_name')} />
        </Field>
        <Field label="Customer email" name="customer_email" error={fieldErrors.customer_email}>
          <input type="email" autoComplete="off" {...common('customer_email')} />
        </Field>
        <Field label="Order number" name="order_number" error={fieldErrors.order_number}>
          <input type="text" placeholder="ORD-10001" autoComplete="off" {...common('order_number')} />
        </Field>
        <Field label="Item name" name="item_name" error={fieldErrors.item_name}>
          <input type="text" autoComplete="off" {...common('item_name')} />
        </Field>
        <Field label="Quantity" name="quantity" error={fieldErrors.quantity}>
          <input type="number" min="1" step="1" {...common('quantity')} />
        </Field>
        <Field label="Return reason" name="return_reason" error={fieldErrors.return_reason}>
          <select {...common('return_reason')}>
            <option value="">Select a reason</option>
            {REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className={btnSecondary} onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
