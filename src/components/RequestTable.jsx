import StatusBadge from './StatusBadge';
import { formatDate } from '@/lib/format';
import { btnSecondary } from './styles';

// Desktop shows a table; phones show one card per request (a wide table would not fit at 375px).
export default function RequestTable({ items, onView }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{item.reference_number}</td>
                <td className="px-4 py-3">{item.customer_name}</td>
                <td className="whitespace-nowrap px-4 py-3">{item.order_number}</td>
                <td className="px-4 py-3">{item.item_name}</td>
                <td className="whitespace-nowrap px-4 py-3">{item.return_reason}</td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(item.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className={btnSecondary} onClick={() => onView(item.id)}>View details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-gray-200 md:hidden">
        {items.map((item) => (
          <li key={item.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-gray-900">{item.reference_number}</span>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm text-gray-900">{item.customer_name}</p>
            <p className="break-words text-sm text-gray-600">{item.item_name} · {item.order_number}</p>
            <p className="text-sm text-gray-600">{item.return_reason} · {formatDate(item.created_at)}</p>
            <button type="button" className={`${btnSecondary} w-full`} onClick={() => onView(item.id)}>View details</button>
          </li>
        ))}
      </ul>
    </>
  );
}
