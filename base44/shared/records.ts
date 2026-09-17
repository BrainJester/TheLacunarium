import { fail } from './security.ts';
export const RECORD_FIELDS = ['mass_record', 'red_queen_record'] as const;
export const MAX_RECORDS: Record<string, number> = { mass_record: 20000, red_queen_record: 416 };
export function isValidRecordField(field: string) { return (RECORD_FIELDS as readonly string[]).includes(field); }
export function validateRecord(field: string, value: unknown): number { if (!isValidRecordField(field) || typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > MAX_RECORDS[field]) fail(400, 'Invalid record value.'); return value as number; }
export async function improveRecord(client: any, profile: any, field: string, value: number) {
  validateRecord(field, value);
  // $max is a database operation: simultaneous lower submissions cannot undo a best.
  await client.asServiceRole.entities.Profile.updateMany({ id: profile.id, user_id: profile.user_id }, { $max: { [field]: value } });
  const updated = await client.asServiceRole.entities.Profile.get(profile.id);
  return { [field]: updated[field], updated: updated[field] > (profile[field] || 0) };
}
