import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, errorResponse } from '../../shared/security.ts';
import { findProfileByUser, roleForAccount, publicProfile } from '../../shared/profiles.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);
    const profile = await findProfileByUser(base44, user.id);
    const role = await roleForAccount(base44, user, profile);
    return Response.json({ account: { id: user.id, email: user.email, full_name: user.full_name }, profile: publicProfile(profile, role) });
  } catch (error) { return errorResponse(error); }
}
