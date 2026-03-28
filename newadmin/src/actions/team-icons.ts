'use server'

import connectMongo from '@/lib/mongo';
import { TeamIcon } from '@/models/MongoModels';
import { uploadToCloudflare } from '@/actions/upload';
import { revalidatePath } from 'next/cache';

// ─── Get all team icons ──────────────────────────────────────────────────────

export async function getTeamIcons() {
    try {
        await connectMongo();
        const icons = await TeamIcon.find().sort({ display_name: 1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(icons)) };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to fetch team icons' };
    }
}

// ─── Upload team icon to Cloudflare & save/update in DB ──────────────────────

export async function uploadTeamIcon(formData: FormData) {
    try {
        const teamName = (formData.get('teamName') as string)?.trim();
        const sportId  = (formData.get('sportId')  as string)?.trim() || '';
        const file     = formData.get('file') as File | null;

        if (!teamName) return { success: false, error: 'Team name is required' };
        if (!file)     return { success: false, error: 'No file provided' };

        // Upload to Cloudflare Images under "team-icons" folder
        const cfForm = new FormData();
        cfForm.append('file', file);
        cfForm.append('folder', 'team-icons');

        const uploadResult = await uploadToCloudflare(cfForm);
        if (!uploadResult.success || !uploadResult.url) {
            return { success: false, error: uploadResult.error || 'Cloudflare upload failed' };
        }

        // Upsert into MongoDB
        await connectMongo();
        const normalised = teamName.toLowerCase();
        await TeamIcon.findOneAndUpdate(
            { team_name: normalised },
            {
                team_name: normalised,
                display_name: teamName,
                icon_url: uploadResult.url,
                sport_id: sportId,
            },
            { upsert: true, new: true },
        );

        revalidatePath('/dashboard/sports/team-icons');
        return { success: true, url: uploadResult.url };
    } catch (error: any) {
        return { success: false, error: error.message || 'Upload failed' };
    }
}

// ─── Delete a team icon ──────────────────────────────────────────────────────

export async function deleteTeamIcon(id: string) {
    try {
        await connectMongo();
        await TeamIcon.findByIdAndDelete(id);
        revalidatePath('/dashboard/sports/team-icons');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Delete failed' };
    }
}

// ─── Get unique team names from live/upcoming events in Redis ─────────────────

import Redis from 'ioredis';

const SPORT_IDS = [4, 1, 2, 66, 10, 40, 8, 15, 6, 18, 22];

let _redis: Redis | null = null;
function getRedis() {
    if (!_redis) {
        _redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            enableOfflineQueue: false,
            connectTimeout: 3000,
            lazyConnect: true,
        });
        _redis.on('error', () => {});
    }
    return _redis;
}

export async function getUniqueTeamNames() {
    try {
        const client = getRedis();
        await client.connect().catch(() => {});

        const teamSet = new Set<string>();

        await Promise.all(SPORT_IDS.map(async (eid) => {
            try {
                const raw = await client.get(`allevents:${eid}`);
                if (!raw) return;
                const events: any[] = JSON.parse(raw);
                for (const e of events) {
                    // Redis events store the event name as "Team A v Team B"
                    const eventName = String(e?.ename ?? e?.event_name ?? '').trim();
                    if (!eventName) continue;

                    const parts = eventName.split(' v ');
                    if (parts.length >= 2) {
                        const home = parts[0].trim();
                        const away = parts[1].trim();
                        if (home) teamSet.add(home);
                        if (away) teamSet.add(away);
                    } else {
                        // Single-team event name (e.g. horse racing)
                        teamSet.add(eventName);
                    }
                }
            } catch { /* skip sport */ }
        }));

        return { success: true, data: Array.from(teamSet).sort() };
    } catch (error: any) {
        return { success: false, error: error.message, data: [] };
    }
}
