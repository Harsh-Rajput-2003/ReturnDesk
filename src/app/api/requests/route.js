import { assertValid, handleError, ok, readJson } from '@/lib/api';
import { validateListParams, validateNewRequest } from '@/lib/validation';
import { createRequest, listRequests } from '@/lib/requests';

export const dynamic = 'force-dynamic'; // never cache API responses

// GET /api/requests?search=&status=&reason=&sort=newest&page=1&page_size=10
export async function GET(request) {
  try {
    const params = assertValid(validateListParams(request.nextUrl.searchParams));
    return ok(await listRequests(params));
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/requests
export async function POST(request) {
  try {
    const body = await readJson(request);
    const values = assertValid(validateNewRequest(body));
    return ok(await createRequest(values), 201);
  } catch (error) {
    return handleError(error);
  }
}
