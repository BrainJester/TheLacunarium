export const OWNER_EMAIL = 'brandonkimball5000@gmail.com';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function fail(status: number, message: string): never { throw new HttpError(status, message); }
export async function requireUser(client: any) {
  try { const user = await client.auth.me(); if (!user?.id) fail(401, 'Please sign in.'); return user; }
  catch (error) { if (error instanceof HttpError) throw error; const status = error.status || error.response?.status; if (status === 401 || status === 403) fail(401, 'Please sign in.'); throw error; }
}
export async function isOwner(client: any, user: any): Promise<boolean> {
  if (!user?.id || user.is_verified !== true) return false;
  const owners = await client.asServiceRole.entities.OwnerAccount.filter({ key: 'owner' }, 'created_date', 10);
  if (owners.length) return owners.every((row: any) => row.user_id === user.id);
  if (String(user.email || '').trim().toLowerCase() !== OWNER_EMAIL) return false;
  await client.asServiceRole.entities.OwnerAccount.create({ key: 'owner', user_id: user.id });
  return true;
}
export async function requireOwner(client: any, user: any) { if (!await isOwner(client, user)) fail(403, 'Owner access required.'); }
export async function bodyOf(req: Request) {
  const text = await req.text(); if (text.length > 4_000_000) fail(413, 'Save is too large.');
  try { const value = JSON.parse(text || '{}'); if (!value || Array.isArray(value) || typeof value !== 'object') fail(400, 'Invalid request.'); return value; }
  catch (error) { if (error instanceof HttpError) throw error; fail(400, 'Invalid request.'); }
}
export function errorResponse(error: any) { const status = error instanceof HttpError ? error.status : 500; if (status === 500) console.error('Backend request failed', error); return Response.json({ error: status === 500 ? 'Request failed. Please try again.' : error.message }, { status }); }
export async function listAll(entity: any, query?: any) {
  const result: any[] = [];
  for (let skip = 0; ; skip += 500) { const rows = query ? await entity.filter(query, 'created_date', 500, skip) : await entity.list('created_date', 500, skip); result.push(...rows); if (rows.length < 500) return result; }
}
