'use server';

import path from 'path';
import fs   from 'fs';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'pinned-matches.json');
const ADMIN_ROLES = ['ADMIN', 'admin', 'SUPER_ADMIN'];

export interface PinnedMatchesConfig {
  adminPinnedIds: string[];
  updatedAt: string;
}

function readConfig(): PinnedMatchesConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw    = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.adminPinnedIds)) return parsed;
    }
  } catch { /* fallthrough */ }
  return { adminPinnedIds: [], updatedAt: new Date().toISOString() };
}

function writeConfig(data: PinnedMatchesConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function decodeJwtRole(token: string): string | null {
  try {
    const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!b64) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export async function getAdminPinnedMatchIds(): Promise<string[]> {
  return [...new Set(readConfig().adminPinnedIds)];
}

export async function setAdminPinnedMatchIds(
  token: string,
  ids: string[],
): Promise<{ ok: boolean; error?: string }> {
  const role = decodeJwtRole(token);
  if (!role || !ADMIN_ROLES.includes(role)) {
    return { ok: false, error: 'Forbidden: admin role required.' };
  }
  if (!Array.isArray(ids)) {
    return { ok: false, error: 'Invalid payload.' };
  }
  writeConfig({ adminPinnedIds: [...new Set(ids)], updatedAt: new Date().toISOString() });
  return { ok: true };
}

export async function toggleAdminPinnedMatch(
  token: string,
  matchId: string,
): Promise<{ ok: boolean; pinned: boolean; error?: string }> {
  const role = decodeJwtRole(token);
  if (!role || !ADMIN_ROLES.includes(role)) {
    return { ok: false, pinned: false, error: 'Forbidden: admin role required.' };
  }
  const cfg = readConfig();
  const set  = new Set(cfg.adminPinnedIds);
  const pinned = !set.has(matchId);
  if (pinned) set.add(matchId); else set.delete(matchId);
  const updated: PinnedMatchesConfig = { adminPinnedIds: [...set], updatedAt: new Date().toISOString() };
  writeConfig(updated);
  return { ok: true, pinned };
}
