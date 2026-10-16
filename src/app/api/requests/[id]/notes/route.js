import { assertValid, handleError, ok, parseId, readJson } from '@/lib/api';
import { validateNote } from '@/lib/validation';
import { addNote } from '@/lib/requests';

export const dynamic = 'force-dynamic';

// POST /api/requests/:id/notes  -> append a note (allowed in every status)
// There is intentionally no PATCH or DELETE: notes are append-only.
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const requestId = parseId(id);
    const body = await readJson(request);
    const values = assertValid(validateNote(body));
    return ok(await addNote(requestId, values), 201);
  } catch (error) {
    return handleError(error);
  }
}
