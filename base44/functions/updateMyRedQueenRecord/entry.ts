import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, bodyOf, errorResponse, fail } from '../../shared/security.ts';
import { findProfileByUser } from '../../shared/profiles.ts';
import { validateRecord, improveRecord } from '../../shared/records.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44), body = await bodyOf(req);
    const value = validateRecord('red_queen_record', body.score);
    const profile = await findProfileByUser(base44, user.id);
    if (!profile) fail(404, 'Create a profile first.');
    return Response.json(await improveRecord(base44, profile, 'red_queen_record', value));
  } catch (error) { return errorResponse(error); }
}
