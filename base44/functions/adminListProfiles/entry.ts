import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { requireUser, requireOwner, errorResponse, listAll } from '../../shared/security.ts';
import { publicProfile } from '../../shared/profiles.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44); await requireOwner(base44, user);
    const profiles = await listAll(base44.asServiceRole.entities.Profile);
    const users = await listAll(base44.asServiceRole.entities.User);
    const accounts = new Map(users.map((u: any) => [u.id, u]));
    return Response.json(profiles.map((p: any) => {
      const account: any = accounts.get(p.user_id);
      return { ...publicProfile(p, p.user_id === user.id ? 'admin' : p.site_role === 'tester' ? 'tester' : 'user'), user_id: p.user_id, email: account?.email || null, created_date: p.created_date };
    }));
  } catch (error) { return errorResponse(error); }
}
