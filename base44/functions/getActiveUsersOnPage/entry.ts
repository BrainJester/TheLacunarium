import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, requireOwner, bodyOf, errorResponse, listAll } from '../../shared/security.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44); await requireOwner(base44, user);
    const body = await bodyOf(req);
    const rows = await listAll(base44.asServiceRole.entities.Presence, { page: body.page || '/', last_active: { $gte: Date.now() - 45000 } });
    return Response.json({ active: new Set(rows.map((row: any) => row.user_id)).size });
  } catch (error) { return errorResponse(error); }
}
