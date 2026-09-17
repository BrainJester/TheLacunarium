import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, bodyOf, errorResponse } from '../../shared/security.ts';
import { writeIsland } from '../../shared/islands.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44), body = await bodyOf(req);
    const result = await writeIsland(base44, user.id, body, null);
    return Response.json({ ok: true, ...result });
  } catch (error) { return errorResponse(error); }
}
