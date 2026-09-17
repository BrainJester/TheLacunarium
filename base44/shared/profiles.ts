import { isOwner } from './security.ts';
export function normalizeName(raw: unknown) { return typeof raw === 'string' ? raw.trim() : ''; }
export function validateName(name: string) { if (name.length < 3 || name.length > 20) return 'Profile name must be 3–20 characters.'; if (!/^[A-Za-z0-9_]+$/.test(name)) return 'Use only letters, numbers and underscores.'; return null; }
export async function findProfileByUser(client: any, userId: string) { const rows = await client.asServiceRole.entities.Profile.filter({ user_id: userId }, 'created_date', 100); rows.sort((a: any, b: any) => a.created_date.localeCompare(b.created_date) || a.id.localeCompare(b.id)); return rows[0] || null; }
export async function findProfileByName(client: any, name: string) { const rows = await client.asServiceRole.entities.Profile.filter({ profile_name_lower: name }, 'created_date', 100); return rows[0] || null; }
export async function roleForAccount(client: any, user: any, profile: any) { return await isOwner(client, user) ? 'admin' : profile?.site_role === 'tester' ? 'tester' : 'user'; }
export function publicProfile(profile: any, role = 'user') { return profile ? { id: profile.id, profile_name: profile.profile_name, site_role: role, mass_record: profile.mass_record || 0, red_queen_record: profile.red_queen_record || 0 } : null; }
