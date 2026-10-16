const STYLES = {
  Open: 'bg-blue-50 text-blue-700 ring-blue-200',
  'In Review': 'bg-amber-50 text-amber-800 ring-amber-200',
  Approved: 'bg-green-50 text-green-700 ring-green-200',
  Rejected: 'bg-red-50 text-red-700 ring-red-200',
  Completed: 'bg-gray-100 text-gray-700 ring-gray-300',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status] || STYLES.Completed}`}>
      {status}
    </span>
  );
}
