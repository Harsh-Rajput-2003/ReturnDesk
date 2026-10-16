import { formatDateTime } from '@/lib/format';

// Notes arrive from the API already sorted oldest first.
export default function Timeline({ notes }) {
  if (notes.length === 0) {
    return <p className="text-sm text-gray-500">No activity yet.</p>;
  }
  return (
    <ol className="space-y-4 border-l border-gray-200 pl-4">
      {notes.map((note) => (
        <li key={note.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600" />
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{note.author_label}</span> · {formatDateTime(note.created_at)}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-900">{note.note_text}</p>
        </li>
      ))}
    </ol>
  );
}
