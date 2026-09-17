import { fail } from './security.ts';
export const SAVE_VERSION = 1;
const object = (v: any) => v != null && typeof v === 'object' && !Array.isArray(v);
const finite = (v: any) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 10_000_000;
const sides = (v: any) => Array.isArray(v) && v.length === 4 && v.every((n: any) => n === -1 || n === 0 || n === 1);
export function validateIsland(data: any) {
  if (!object(data) || data.schemaVersion !== SAVE_VERSION || !object(data.grid)) fail(400, 'Unsupported island save.');
  const cells = Object.entries(data.grid);
  if (!cells.length || cells.length > 20000) fail(400, 'Invalid island size.');
  for (const [key, value] of cells) {
    const cell: any = value;
    if (!/^-?\d{1,5},-?\d{1,5}$/.test(key) || !object(cell) || !sides(cell.sides) || !Number.isInteger(cell.elevation) || cell.elevation < 0 || cell.elevation > 100) fail(400, 'Invalid island cell.');
  }
  for (const [key, max] of [['loosePieces', 1000], ['clouds', 5000]] as const) {
    if (!Array.isArray(data[key]) || data[key].length > max) fail(400, 'Invalid island pieces.');
    for (const p of data[key]) if (!object(p) || !finite(p.x) || !finite(p.y) || !sides(p.sides)) fail(400, 'Invalid island piece.');
  }
  return data;
}
export async function loadIsland(client: any, userId: string) {
  const entity = client.asServiceRole.entities.IslandSave;
  let rows = await entity.filter({ user_id: userId }, 'created_date', 100);
  if (!rows.length) { await entity.create({ user_id: userId, data: {}, has_save: false, revision: 0 }); rows = await entity.filter({ user_id: userId }, 'created_date', 100); }
  rows.sort((a: any, b: any) => a.created_date.localeCompare(b.created_date) || a.id.localeCompare(b.id));
  if (!rows[0]) fail(503, 'Save is not ready. Please retry.');
  return rows[0];
}
export async function writeIsland(client: any, userId: string, body: any, data: any) {
  if (!Number.isInteger(body.revision) || body.revision < 0 || typeof body.save_id !== 'string') fail(400, 'Save revision required.');
  const row = await loadIsland(client, userId);
  if (row.id !== body.save_id || row.revision !== body.revision) fail(409, 'This island changed in another tab. Reload before saving.');
  const result = await client.asServiceRole.entities.IslandSave.updateMany({ id: row.id, user_id: userId, revision: body.revision }, { $set: { data: data ?? {}, has_save: data !== null, revision: body.revision + 1 } });
  if (result.updated !== 1) fail(409, 'This island changed in another tab. Reload before saving.');
  return { save_id: row.id, revision: body.revision + 1 };
}
