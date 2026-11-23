import { STATS } from '@/config/stats';
import type { StorageAdapter } from '@/core/storage';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * This device's id for player stats: a random UUID made once and kept in
 * storage. It is not personal data (nothing ties it to a person); it only
 * lets the server count a device's run once a day. Clearing site data makes
 * a new one.
 */
export function deviceId(
  storage: StorageAdapter,
  random: () => string = () => crypto.randomUUID(),
): string {
  const saved = storage.get(STATS.deviceKey);
  if (typeof saved === 'string' && UUID.test(saved)) return saved;
  const id = random();
  storage.set(STATS.deviceKey, id);
  return id;
}
