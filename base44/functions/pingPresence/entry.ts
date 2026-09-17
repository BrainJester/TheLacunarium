import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, bodyOf, errorResponse, fail } from '../../shared/security.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44), body = await bodyOf(req);
    if (typeof body.session_id !== 'string' || !/^[a-zA-Z0-9-]{10,80}$/.test(body.session_id)) fail(400, 'Invalid session.');
    const allowed = ['/', '/piece-and-quiet', '/red-queen', '/profile', '/hq', '/dots-room'];
    if (!allowed.includes(body.page)) fail(400, 'Invalid page.');
    const entity = base44.asServiceRole.entities.Presence;
    const rows = await entity.filter({ user_id: user.id, session_id: body.session_id }, 'created_date', 10);
    const data = { page: body.page, last_active: Date.now() };
    if (rows.length) await entity.update(rows[0].id, data);
    else await entity.create({ user_id: user.id, session_id: body.session_id, ...data });
    const expired = await entity.filter({ user_id: user.id, last_active: { $lt: Date.now() - 86400000 } }, 'created_date', 100);
    await Promise.all(expired.map((row: any) => entity.delete(row.id)));
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
