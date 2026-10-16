import { assertValid, handleError, ok, parseId, readJson } from '@/lib/api';
import { validateTransition } from '@/lib/validation';
import { transitionRequest } from '@/lib/requests';

export const dynamic = 'force-dynamic';

// PATCH /api/requests/:id/transition
// Body: { "status": "Approved", "resolution": "Refund", "refund_amount": 25.5 }
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const requestId = parseId(id);
    const body = await readJson(request);
    const values = assertValid(validateTransition(body));
    return ok(await transitionRequest(requestId, values));
  } catch (error) {
    return handleError(error);
  }
}
