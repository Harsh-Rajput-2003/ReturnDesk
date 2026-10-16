import { assertValid, handleError, ok, parseId, readJson } from '@/lib/api';
import { validateUpdate } from '@/lib/validation';
import { getRequestById, softDeleteRequest, updateRequest } from '@/lib/requests';

export const dynamic = 'force-dynamic';

// GET /api/requests/:id  -> the request plus its notes (oldest first)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    return ok(await getRequestById(parseId(id)));
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/requests/:id  -> edit details (only while Open or In Review)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const requestId = parseId(id);
    const body = await readJson(request);
    const values = assertValid(validateUpdate(body));
    return ok(await updateRequest(requestId, values));
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/requests/:id  -> soft delete (only Open or Rejected)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    return ok(await softDeleteRequest(parseId(id)));
  } catch (error) {
    return handleError(error);
  }
}
