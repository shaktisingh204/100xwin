'use server'

import connectMongo from '@/lib/mongo';
import { Bonus } from '@/models/MongoModels';
import { revalidatePath } from 'next/cache';
import {
    getBonusStats as _getBonusStats,
    getBonusRedemptions as _getBonusRedemptions,
    adminForfeitBonus as _adminForfeitBonus,
    adminCompleteBonus as _adminCompleteBonus,
} from '@/actions/settings';

// Wrapper async functions — required because "use server" files only allow async function exports
export async function getBonusStats() { return _getBonusStats(); }
export async function getBonusRedemptions(filters: { page?: number; limit?: number; status?: string; search?: string; }) { return _getBonusRedemptions(filters); }
export async function adminForfeitBonus(userBonusId: number, adminId?: number) { return _adminForfeitBonus(userBonusId, adminId); }
export async function adminCompleteBonus(userBonusId: number, adminId?: number) { return _adminCompleteBonus(userBonusId, adminId); }

export async function adminGiveBonus(payload: {
    userId: number;
    bonusCode?: string;
    customAmount?: number;
    bonusType?: 'FIAT_BONUS' | 'CASINO_BONUS' | 'SPORTS_BONUS' | 'CRYPTO_BONUS';
    amount?: number;
    title?: string;
    wageringRequirement?: number;
}): Promise<{ success: boolean; bonusAmount?: number; walletLabel?: string; error?: string }> {
    try {
        const adminToken = process.env.ADMIN_SECRET_TOKEN || '';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${apiUrl}/admin/bonus/give`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data?.message || 'Failed to give bonus' };
        return { success: true, bonusAmount: data?.bonusAmount, walletLabel: data?.walletLabel };
    } catch (error) {
        return { success: false, error: 'Network error' };
    }
}

export async function getBonuses() {
    try {
        await connectMongo();
        const bonuses = await Bonus.find().sort({ createdAt: -1 }).lean();
        return { success: true, data: JSON.parse(JSON.stringify(bonuses)) };
    } catch (error) {
        return { success: false, error: 'Failed to fetch bonuses' };
    }
}

export async function createBonus(data: any) {
    try {
        await connectMongo();
        const bonus = await Bonus.create({ ...data, code: data.code?.toUpperCase?.() ?? data.code });
        revalidatePath('/dashboard/marketing/bonuses');
        return { success: true, data: JSON.parse(JSON.stringify(bonus)) };
    } catch (error: any) {
        console.error('[createBonus] error:', error?.message);
        return { success: false, error: error?.message || 'Failed to create bonus' };
    }
}

export async function updateBonus(id: string, data: any) {
    try {
        await connectMongo();
        const bonus = await Bonus.findByIdAndUpdate(id, data, { new: true }).lean();
        revalidatePath('/dashboard/marketing/bonuses');
        return { success: true, data: JSON.parse(JSON.stringify(bonus)) };
    } catch (error) {
        return { success: false, error: 'Failed to update bonus' };
    }
}

export async function deleteBonus(id: string) {
    try {
        await connectMongo();
        await Bonus.findByIdAndDelete(id);
        revalidatePath('/dashboard/marketing/bonuses');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete bonus' };
    }
}

export async function toggleBonus(id: string) {
    try {
        await connectMongo();
        const bonus = await Bonus.findById(id);
        if (bonus) {
            bonus.isActive = !bonus.isActive;
            await bonus.save();
            revalidatePath('/dashboard/marketing/bonuses');
            return { success: true };
        }
        return { success: false, error: 'Bonus not found' };
    } catch (error) {
        return { success: false, error: 'Failed to toggle bonus' };
    }
}
