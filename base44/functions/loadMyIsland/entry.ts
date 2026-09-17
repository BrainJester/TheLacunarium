import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, errorResponse } from '../../shared/security.ts';
import { loadIsland } from '../../shared/islands.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44), row = await loadIsland(base44, user.id);
    return Response.json({ data: row.has_save ? row.data : null, revision: row.revision, save_id: row.id });
  } catch (error) { return errorResponse(error); }
}
