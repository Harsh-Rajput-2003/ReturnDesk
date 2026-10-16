import { handleError, ok } from '@/lib/api';
import { getStats } from '@/lib/requests';

export const dynamic = 'force-dynamic';

// GET /api/stats -> dashboard counts (soft-deleted requests excluded)
export async function GET() {
  try {
    return ok(await getStats());
  } catch (error) {
    return handleError(error);
  }
}
