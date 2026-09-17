import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, requireOwner, bodyOf, errorResponse, fail } from '../../shared/security.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44); await requireOwner(base44, user);
    const body = await bodyOf(req);
    if (typeof body.profile_id !== 'string') fail(400, 'Profile required.');
    const profile = await base44.asServiceRole.entities.Profile.get(body.profile_id);
    if (!profile) fail(404, 'Profile not found.');
    if (profile.user_id === user.id) fail(400, 'Your owner profile cannot be removed.');
    await base44.asServiceRole.entities.Profile.delete(profile.id);
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
