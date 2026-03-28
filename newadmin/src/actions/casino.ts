'use server'

import connectMongo from '@/lib/mongo';
import {
    CasinoCategory, CasinoProvider, CasinoGame,
    HomeCasinoGame, TopCasinoGame, CasinoSectionGame
} from '@/models/MongoModels';
import { revalidatePath } from 'next/cache';

// ─── Casino Categories ────────────────────────────────────────────────────────

export async function getCasinoCategories() {
    try {
        await connectMongo();
        const categories = await CasinoCategory.find().sort({ priority: -1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(categories)) };
    } catch { return { success: false, error: 'Failed to fetch categories' }; }
}

export async function createCasinoCategory(data: any) {
    try {
        await connectMongo();
        const category = await CasinoCategory.create(data);
        revalidatePath('/dashboard/casino/categories');
        return { success: true, data: JSON.parse(JSON.stringify(category)) };
    } catch { return { success: false, error: 'Failed to create category' }; }
}

export async function updateCasinoCategory(id: string, data: any) {
    try {
        await connectMongo();
        const category = await CasinoCategory.findByIdAndUpdate(id, data, { new: true }).lean();
        revalidatePath('/dashboard/casino/categories');
        return { success: true, data: JSON.parse(JSON.stringify(category)) };
    } catch { return { success: false, error: 'Failed to update category' }; }
}

export async function deleteCasinoCategory(id: string) {
    try {
        await connectMongo();
        await CasinoCategory.findByIdAndDelete(id);
        revalidatePath('/dashboard/casino/categories');
        return { success: true };
    } catch { return { success: false, error: 'Failed to delete category' }; }
}

// ─── Casino Providers ─────────────────────────────────────────────────────────

export async function getCasinoProviders() {
    try {
        await connectMongo();
        const providers = await CasinoProvider.find().sort({ priority: -1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(providers)) };
    } catch { return { success: false, error: 'Failed to fetch providers' }; }
}

export async function createCasinoProvider(data: any) {
    try {
        await connectMongo();
        const provider = await CasinoProvider.create(data);
        revalidatePath('/dashboard/casino/providers');
        return { success: true, data: JSON.parse(JSON.stringify(provider)) };
    } catch { return { success: false, error: 'Failed to create provider' }; }
}

export async function updateCasinoProvider(id: string, data: any) {
    try {
        await connectMongo();
        const provider = await CasinoProvider.findByIdAndUpdate(id, data, { new: true }).lean();
        revalidatePath('/dashboard/casino/providers');
        return { success: true, data: JSON.parse(JSON.stringify(provider)) };
    } catch { return { success: false, error: 'Failed to update provider' }; }
}

export async function deleteCasinoProvider(id: string) {
    try {
        await connectMongo();
        await CasinoProvider.findByIdAndDelete(id);
        revalidatePath('/dashboard/casino/providers');
        return { success: true };
    } catch { return { success: false, error: 'Failed to delete provider' }; }
}

// ─── Casino Games ─────────────────────────────────────────────────────────────

export async function getCasinoGames(page = 1, limit = 48, filters: {
    search?: string;
    provider?: string;
    category?: string;
    isActive?: string;
    isPopular?: string;
    isNewGame?: string;
    sortBy?: string;
} = {}) {
    try {
        await connectMongo();
        const query: any = {};
        if (filters.search) query.$or = [
            { name: { $regex: filters.search, $options: 'i' } },
            { provider: { $regex: filters.search, $options: 'i' } },
            { gameCode: { $regex: filters.search, $options: 'i' } },
        ];
        if (filters.provider && filters.provider !== 'ALL') query.provider = filters.provider;
        if (filters.category && filters.category !== 'ALL') query.category = filters.category;
        if (filters.isActive !== undefined && filters.isActive !== '') query.isActive = filters.isActive === 'true';
        if (filters.isPopular !== undefined && filters.isPopular !== '') query.isPopular = filters.isPopular === 'true';
        if (filters.isNewGame !== undefined && filters.isNewGame !== '') query.isNewGame = filters.isNewGame === 'true';

        let sortOption: any = { priority: -1, _id: -1 };
        if (filters.sortBy === 'newest') sortOption = { createdAt: -1 };
        if (filters.sortBy === 'name') sortOption = { name: 1 };
        if (filters.sortBy === 'plays') sortOption = { playCount: -1 };

        const [games, total] = await Promise.all([
            CasinoGame.find(query).sort(sortOption).skip((page - 1) * limit).limit(limit).lean(),
            CasinoGame.countDocuments(query),
        ]);
        return {
            success: true,
            data: JSON.parse(JSON.stringify(games)),
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        };
    } catch { return { success: false, error: 'Failed to fetch games' }; }
}

export async function getCasinoGameStats() {
    try {
        await connectMongo();
        const [total, active, popular, newGames] = await Promise.all([
            CasinoGame.countDocuments(),
            CasinoGame.countDocuments({ isActive: true }),
            CasinoGame.countDocuments({ isPopular: true }),
            CasinoGame.countDocuments({ isNewGame: true }),
        ]);
        // Count per section
        const sectionCounts = await CasinoSectionGame.aggregate([
            { $group: { _id: '$section', count: { $sum: 1 } } }
        ]);
        const bySection: Record<string, number> = {};
        sectionCounts.forEach((s: any) => { bySection[s._id] = s.count; });

        return {
            success: true, data: {
                total, active, popular, newGames,
                homeCount: bySection['home'] || 0,
                topCount: bySection['top'] || 0,
                sections: bySection,
            }
        };
    } catch { return { success: false, error: 'Failed to fetch stats' }; }
}

export async function toggleCasinoGame(id: string, isActive: boolean) {
    try {
        await connectMongo();
        await CasinoGame.findByIdAndUpdate(id, { isActive });
        revalidatePath('/dashboard/casino/games');
        return { success: true };
    } catch { return { success: false, error: 'Failed to toggle game' }; }
}

export async function toggleCasinoGamePopular(gameCode: string, isPopular: boolean) {
    try {
        await connectMongo();
        await CasinoGame.findOneAndUpdate({ gameCode }, { isPopular });
        revalidatePath('/dashboard/casino/games');
        return { success: true };
    } catch { return { success: false, error: 'Failed to toggle popular' }; }
}

export async function toggleCasinoGameNew(gameCode: string, isNewGame: boolean) {
    try {
        await connectMongo();
        await CasinoGame.findOneAndUpdate({ gameCode }, { isNewGame });
        revalidatePath('/dashboard/casino/games');
        return { success: true };
    } catch { return { success: false, error: 'Failed to toggle new status' }; }
}

export async function updateCasinoGame(id: string, data: any) {
    try {
        await connectMongo();
        await CasinoGame.findByIdAndUpdate(id, data);
        revalidatePath('/dashboard/casino/games');
        return { success: true };
    } catch { return { success: false, error: 'Failed to update game' }; }
}

// ─── Casino Section Games ─────────────────────────────────────────────────────
// Sections: 'popular' | 'new' | 'slots' | 'live' | 'table' | 'crash' | 'home' | 'top'

/**
 * Get all game codes pinned to a given section (fast lookup map).
 */
export async function getSectionGameCodes(section: string): Promise<string[]> {
    try {
        await connectMongo();
        const docs = await CasinoSectionGame.find({ section }, { gameCode: 1 }).lean();
        return docs.map((d: any) => d.gameCode);
    } catch { return []; }
}

/**
 * Get full pinned game list for a section (with metadata).
 */
export async function getSectionGames(section: string) {
    try {
        await connectMongo();
        const games = await CasinoSectionGame.find({ section }).sort({ order: 1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(games)) };
    } catch { return { success: false, error: 'Failed to fetch section games' }; }
}

/**
 * Get all pinned game codes across ALL sections in one DB call.
 * Returns { section: Set<gameCode> }
 */
export async function getAllSectionGameCodes(): Promise<Record<string, string[]>> {
    try {
        await connectMongo();
        const docs = await CasinoSectionGame.find({}, { section: 1, gameCode: 1 }).lean();
        const result: Record<string, string[]> = {};
        docs.forEach((d: any) => {
            if (!result[d.section]) result[d.section] = [];
            result[d.section].push(d.gameCode);
        });
        return result;
    } catch { return {}; }
}

/**
 * Toggle a game in a section: add it if not present, remove if present.
 */
export async function toggleSectionGame(
    section: string,
    gameCode: string,
    pin: boolean,
    meta?: { name?: string; provider?: string; image?: string }
) {
    try {
        await connectMongo();
        if (pin) {
            const count = await CasinoSectionGame.countDocuments({ section });
            await CasinoSectionGame.findOneAndUpdate(
                { section, gameCode },
                { section, gameCode, ...meta, order: count },
                { upsert: true, new: true }
            );
        } else {
            await CasinoSectionGame.findOneAndDelete({ section, gameCode });
        }
        revalidatePath('/dashboard/casino/games');
        return { success: true };
    } catch { return { success: false, error: 'Failed to toggle section game' }; }
}

/**
 * Remove all games from a section.
 */
export async function clearSection(section: string) {
    try {
        await connectMongo();
        await CasinoSectionGame.deleteMany({ section });
        revalidatePath('/dashboard/casino/games');
        return { success: true };
    } catch { return { success: false, error: 'Failed to clear section' }; }
}

/**
 * Re-order section games.
 */
export async function reorderSectionGames(section: string, gameCodes: string[]) {
    try {
        await connectMongo();
        const updates = gameCodes.map((code, index) =>
            CasinoSectionGame.findOneAndUpdate({ section, gameCode: code }, { order: index })
        );
        await Promise.all(updates);
        return { success: true };
    } catch { return { success: false, error: 'Failed to reorder' }; }
}

// Legacy helpers (kept for backward compat with home/top models)
export async function toggleHomeCasinoGame(gameCode: string, isHome: boolean, meta?: any) {
    return toggleSectionGame('home', gameCode, isHome, meta);
}
export async function toggleTopCasinoGame(gameCode: string, isTop: boolean, meta?: any) {
    return toggleSectionGame('top', gameCode, isTop, meta);
}
export async function getHomeCasinoGames() { return getSectionGames('home'); }
export async function getTopCasinoGames() { return getSectionGames('top'); }

export async function syncGames() { return { success: true }; }
