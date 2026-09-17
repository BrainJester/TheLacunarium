import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, requireOwner, bodyOf, errorResponse, fail } from '../../shared/security.ts';
import { validateRecord } from '../../shared/records.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44); await requireOwner(base44, user);
    const body = await bodyOf(req), field = String(body.field || '');
    const value = validateRecord(field, body.value);
    if (typeof body.profile_id !== 'string' || !body.profile_id) fail(400, 'Profile required.');
    await base44.asServiceRole.entities.Profile.update(body.profile_id, { [field]: value });
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
