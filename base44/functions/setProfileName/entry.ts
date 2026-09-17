import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, bodyOf, errorResponse, fail } from '../../shared/security.ts';
import { findProfileByUser, findProfileByName, normalizeName, validateName, roleForAccount, publicProfile } from '../../shared/profiles.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44), body = await bodyOf(req);
    const name = normalizeName(body.profile_name), invalid = validateName(name);
    if (invalid) fail(400, invalid);
    const mine = await findProfileByUser(base44, user.id), lower = name.toLowerCase();
    const taken = await findProfileByName(base44, lower);
    if (taken && taken.user_id !== user.id) fail(409, 'That name is already taken.');
    const role = await roleForAccount(base44, user, mine);
    const fields = { profile_name: name, profile_name_lower: lower, site_role: role };
    const profile = mine ? await base44.asServiceRole.entities.Profile.update(mine.id, fields) : await base44.asServiceRole.entities.Profile.create({ user_id: user.id, ...fields });
    return Response.json({ profile: publicProfile(profile, role) });
  } catch (error) { return errorResponse(error); }
}
