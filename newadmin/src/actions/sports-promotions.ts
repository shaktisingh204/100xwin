'use server'

import { revalidatePath } from 'next/cache';
import connectMongo from '@/lib/mongo';
import { MatchCashbackPromotion } from '@/models/MongoModels';

// ─── Benefit-type lookup (matches backend constants) ─────────────────────────

const BENEFIT_TYPE_MAP: Record<string, string> = {
    MATCH_LOSS_CASHBACK: 'REFUND',
    FIRST_OVER_SIX_CASHBACK: 'REFUND',
    LEAD_MARGIN_PAYOUT: 'PAYOUT_AS_WIN',
    LATE_LEAD_REFUND: 'REFUND',
    PERIOD_LEAD_PAYOUT: 'PAYOUT_AS_WIN',
};

function resolveBenefitType(promotionType: string): string {
    return BENEFIT_TYPE_MAP[promotionType] || 'REFUND';
}

// ─── Normalizer (ensures consistent shape for the client) ────────────────────

function normalize(doc: any) {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return {
        ...obj,
        _id: String(obj._id),
        id: String(obj._id),
        eventId: obj.matchId || '',
        matchId: obj.matchId || '',
    };
}

// ─── Payload builder (converts form data → DB document shape) ────────────────

function buildPayload(data: any) {
    const promotionType = data?.promotionType || 'MATCH_LOSS_CASHBACK';
    const matchId = String(data?.eventId || data?.matchId || '').trim();

    const oversWindow = Number(data?.triggerOversWindow ?? data?.triggerConfig?.oversWindow ?? 1);
    const leadThreshold = Number(data?.triggerLeadThreshold ?? data?.triggerConfig?.leadThreshold ?? 2);
    const minuteThreshold = Number(data?.triggerMinuteThreshold ?? data?.triggerConfig?.minuteThreshold ?? 80);
    const periodLabel = String(data?.triggerPeriodLabel ?? data?.triggerConfig?.periodLabel ?? 'HALF_TIME').trim();
    const qualifyingSelections = Array.isArray(data?.triggerQualifyingSelections)
        ? data.triggerQualifyingSelections.filter(Boolean)
        : Array.isArray(data?.triggerConfig?.qualifyingSelections)
            ? data.triggerConfig.qualifyingSelections.filter(Boolean)
            : [];

    const maxRefundAmount =
        data?.maxRefundAmount === '' ||
        data?.maxRefundAmount === null ||
        typeof data?.maxRefundAmount === 'undefined'
            ? undefined
            : Number(data.maxRefundAmount);

    const triggerConfig = promotionType === 'MATCH_LOSS_CASHBACK'
        ? null
        : {
            eventType: data?.triggerConfig?.eventType || undefined,
            oversWindow,
            leadThreshold,
            minuteThreshold,
            periodLabel,
            qualifyingSelections,
            scoreSnapshot: data?.triggerScoreSnapshot?.trim() || data?.triggerConfig?.scoreSnapshot || undefined,
            triggerNote: data?.triggerNote?.trim() || data?.triggerConfig?.triggerNote || undefined,
            isTriggered: data?.triggerIsTriggered === true || data?.triggerConfig?.isTriggered === true,
        };

    return {
        matchId,
        promotionType,
        benefitType: resolveBenefitType(promotionType),
        eventName: data?.eventName || undefined,
        matchDate: data?.matchDate || undefined,
        sportId: data?.sportId || undefined,
        teams: Array.isArray(data?.teams) ? data.teams.filter(Boolean) : [],
        refundPercentage: Number(data?.refundPercentage || 0),
        walletType: data?.walletType || data?.walletTarget || 'main_wallet',
        maxRefundAmount,
        isActive: data?.isActive !== false,
        showOnPromotionsPage: data?.showOnPromotionsPage !== false,
        cardTitle: data?.cardTitle?.trim() || undefined,
        cardDescription: data?.cardDescription?.trim() || undefined,
        cardGradient: data?.cardGradient?.trim() || undefined,
        cardBgImage: data?.cardBgImage?.trim() || undefined,
        cardBadge: data?.cardBadge?.trim() || undefined,
        order: Number(data?.order || 0),
        triggerConfig,
    };
}

const REVALIDATE_PATH = '/dashboard/sports/promo-teams';

// ─── CRUD Operations ─────────────────────────────────────────────────────────

export async function getSportsPromotions() {
    try {
        await connectMongo();
        const docs = await MatchCashbackPromotion.find().sort({ order: 1, createdAt: -1 }).lean();
        return {
            success: true,
            data: docs.map((d: any) => ({
                ...JSON.parse(JSON.stringify(d)),
                _id: String(d._id),
                id: String(d._id),
                eventId: d.matchId || '',
                matchId: d.matchId || '',
            })),
        };
    } catch (error: any) {
        console.error('Failed to fetch sports promotions:', error);
        return { success: false, error: error.message || 'Failed to fetch sports promotions' };
    }
}

export async function createSportsPromotion(data: any) {
    try {
        await connectMongo();
        const doc = await MatchCashbackPromotion.create(buildPayload(data));
        revalidatePath(REVALIDATE_PATH);
        return { success: true, data: normalize(doc) };
    } catch (error: any) {
        console.error('Failed to create sports promotion:', error);
        return { success: false, error: error.message || 'Failed to create sports promotion' };
    }
}

export async function updateSportsPromotion(id: string, data: any) {
    try {
        await connectMongo();
        const doc = await MatchCashbackPromotion.findByIdAndUpdate(id, buildPayload(data), { new: true });
        if (!doc) throw new Error('Promotion not found');
        revalidatePath(REVALIDATE_PATH);
        return { success: true, data: normalize(doc) };
    } catch (error: any) {
        console.error('Failed to update sports promotion:', error);
        return { success: false, error: error.message || 'Failed to update sports promotion' };
    }
}

export async function deleteSportsPromotion(id: string) {
    try {
        await connectMongo();
        await MatchCashbackPromotion.findByIdAndDelete(id);
        revalidatePath(REVALIDATE_PATH);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete sports promotion:', error);
        return { success: false, error: error.message || 'Failed to delete sports promotion' };
    }
}

export async function toggleSportsPromotionStatus(id: string, isActive: boolean) {
    try {
        await connectMongo();
        const doc = await MatchCashbackPromotion.findByIdAndUpdate(id, { isActive }, { new: true });
        if (!doc) throw new Error('Promotion not found');
        revalidatePath(REVALIDATE_PATH);
        return { success: true, data: normalize(doc) };
    } catch (error: any) {
        console.error('Failed to toggle sports promotion status:', error);
        return { success: false, error: error.message || 'Failed to toggle status' };
    }
}

export async function setSportsPromotionTrigger(id: string, payload: {
    isTriggered: boolean;
    oversWindow?: number;
    leadThreshold?: number;
    minuteThreshold?: number;
    periodLabel?: string;
    qualifyingSelections?: string[];
    scoreSnapshot?: string;
    triggerNote?: string;
}) {
    try {
        await connectMongo();

        const existing = await MatchCashbackPromotion.findById(id);
        if (!existing) throw new Error('Promotion not found');

        const currentConfig = existing.triggerConfig || {};
        const updatedConfig = {
            ...currentConfig,
            isTriggered: payload.isTriggered,
            ...(typeof payload.oversWindow === 'number' ? { oversWindow: payload.oversWindow } : {}),
            ...(typeof payload.leadThreshold === 'number' ? { leadThreshold: payload.leadThreshold } : {}),
            ...(typeof payload.minuteThreshold === 'number' ? { minuteThreshold: payload.minuteThreshold } : {}),
            ...(payload.periodLabel ? { periodLabel: payload.periodLabel } : {}),
            ...(Array.isArray(payload.qualifyingSelections) ? { qualifyingSelections: payload.qualifyingSelections } : {}),
            ...(payload.scoreSnapshot ? { scoreSnapshot: payload.scoreSnapshot } : {}),
            ...(payload.triggerNote ? { triggerNote: payload.triggerNote } : {}),
            ...(payload.isTriggered ? { triggeredAt: new Date() } : {}),
        };

        const doc = await MatchCashbackPromotion.findByIdAndUpdate(
            id,
            { triggerConfig: updatedConfig },
            { new: true },
        );

        revalidatePath(REVALIDATE_PATH);
        return { success: true, data: normalize(doc) };
    } catch (error: any) {
        console.error('Failed to update trigger condition:', error);
        return { success: false, error: error.message || 'Failed to update trigger condition' };
    }
}
