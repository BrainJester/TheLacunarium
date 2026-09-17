import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { errorResponse, listAll } from '../../shared/security.ts';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const profiles = await listAll(base44.asServiceRole.entities.Profile);
    const rows = profiles.filter((p: any) => p.red_queen_record > 0).sort((a: any, b: any) => b.red_queen_record - a.red_queen_record || a.created_date.localeCompare(b.created_date) || a.id.localeCompare(b.id));
    const top = rows.slice(0, 10).map((p: any, i: number) => ({ rank: i + 1, red_queen_score: p.red_queen_record, profile_name: p.profile_name }));
    return Response.json(top[0] || { red_queen_score: 0, profile_name: null });
  } catch (error) { return errorResponse(error); }
}
