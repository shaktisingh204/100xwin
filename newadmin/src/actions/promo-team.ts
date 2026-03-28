'use server'

import { revalidatePath } from 'next/cache';

function resolveAdminApiBaseUrl() {
    const candidates = [
        process.env.NEXT_PUBLIC_API_URL,
        process.env.NEXT_PUBLIC_API_PROXY_URL,
        process.env.NEXT_PUBLIC_BACKEND_URL,
    ].filter(Boolean) as string[];

    const absoluteCandidate = candidates.find((candidate) => /^https?:\/\//i.test(candidate));
    return (absoluteCandidate || 'https://zeero.bet/api').replace(/\/$/, '');
}

const ADMIN_API_BASE_URL = resolveAdminApiBaseUrl();

const ADMIN_API_TOKEN =
    process.env.ADMIN_API_TOKEN ||
    process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ||
    '';

function getErrorMessage(payload: any) {
    if (Array.isArray(payload?.message)) {
        return payload.message.join(', ');
    }

    if (typeof payload?.message === 'string') {
        return payload.message;
    }

    if (typeof payload?.error === 'string') {
        return payload.error;
    }

    if (typeof payload === 'string') {
        return payload;
    }

    return 'Request failed';
}

async function adminRequest(path: string, init?: RequestInit) {
    const response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            ...(ADMIN_API_TOKEN ? { 'x-admin-token': ADMIN_API_TOKEN } : {}),
            ...(init?.headers || {}),
        },
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        throw new Error(getErrorMessage(payload));
    }

    return payload;
}

function normalizePromotion(promotion: any) {
    return {
        _id: promotion?._id || promotion?.id,
        id: promotion?.id || promotion?._id,
        eventId: promotion?.eventId || promotion?.matchId || '',
        matchId: promotion?.matchId || promotion?.eventId || '',
        eventName: promotion?.eventName || '',
        matchDate: promotion?.matchDate || '',
        sportId: promotion?.sportId || '',
        teams: Array.isArray(promotion?.teams) ? promotion.teams : [],
        promotionType: promotion?.promotionType || 'MATCH_LOSS_CASHBACK',
        benefitType: promotion?.benefitType || 'REFUND',
        refundPercentage: Number(promotion?.refundPercentage || 0),
        walletType: promotion?.walletType || promotion?.walletTarget || 'main_wallet',
        walletTarget: promotion?.walletType || promotion?.walletTarget || 'main_wallet',
        maxRefundAmount: promotion?.maxRefundAmount ?? null,
        isActive: promotion?.isActive !== false,
        showOnPromotionsPage: promotion?.showOnPromotionsPage !== false,
        cardTitle: promotion?.cardTitle || '',
        cardDescription: promotion?.cardDescription || '',
        cardGradient: promotion?.cardGradient || '',
        cardBgImage: promotion?.cardBgImage || '',
        cardBadge: promotion?.cardBadge || '',
        order: Number(promotion?.order || 0),
        triggerConfig: promotion?.triggerConfig
            ? {
                eventType: promotion.triggerConfig.eventType || 'ANY_TEAM_HIT_SIX',
                triggerMode: promotion.triggerConfig.triggerMode || null,
                oversWindow: Number(promotion.triggerConfig.oversWindow || 1),
                leadThreshold: promotion.triggerConfig.leadThreshold ? Number(promotion.triggerConfig.leadThreshold) : null,
                minuteThreshold: promotion.triggerConfig.minuteThreshold ? Number(promotion.triggerConfig.minuteThreshold) : null,
                periodLabel: promotion.triggerConfig.periodLabel || '',
                qualifyingSelections: Array.isArray(promotion.triggerConfig.qualifyingSelections)
                    ? promotion.triggerConfig.qualifyingSelections
                    : [],
                scoreSnapshot: promotion.triggerConfig.scoreSnapshot || '',
                triggerNote: promotion.triggerConfig.triggerNote || '',
                isTriggered: promotion.triggerConfig.isTriggered === true,
                triggeredAt: promotion.triggerConfig.triggeredAt || null,
            }
            : null,
        conditionSummary: promotion?.conditionSummary || '',
        refundedBetCount: Number(promotion?.refundedBetCount || 0),
        totalRefundAmount: Number(promotion?.totalRefundAmount || 0),
        createdAt: promotion?.createdAt || null,
        updatedAt: promotion?.updatedAt || null,
        lastSettledAt: promotion?.lastSettledAt || null,
    };
}

function buildPromotionPayload(data: any) {
    const promotionType = data?.promotionType || 'MATCH_LOSS_CASHBACK';
    const matchId = String(data?.eventId || data?.matchId || '').trim();
    const oversWindow = Number(
        data?.triggerOversWindow ??
        data?.triggerConfig?.oversWindow ??
        1,
    );
    const leadThreshold = Number(
        data?.triggerLeadThreshold ??
        data?.triggerConfig?.leadThreshold ??
        2,
    );
    const minuteThreshold = Number(
        data?.triggerMinuteThreshold ??
        data?.triggerConfig?.minuteThreshold ??
        80,
    );
    const periodLabel = String(
        data?.triggerPeriodLabel ??
        data?.triggerConfig?.periodLabel ??
        'HALF_TIME',
    ).trim();
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

    return {
        matchId,
        eventName: data?.eventName || undefined,
        matchDate: data?.matchDate || undefined,
        sportId: data?.sportId || undefined,
        teams: Array.isArray(data?.teams) ? data.teams.filter(Boolean) : [],
        promotionType,
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
        triggerConfig: promotionType === 'MATCH_LOSS_CASHBACK'
            ? undefined
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
            },
    };
}

export async function getPromoTeams() {
    try {
        const promotions = await adminRequest('/admin/promotions');
        return {
            success: true,
            data: Array.isArray(promotions) ? promotions.map(normalizePromotion) : [],
        };
    } catch (error: any) {
        console.error('Failed to fetch cashback promotions:', error);
        return { success: false, error: error.message || 'Failed to fetch cashback promotions' };
    }
}

export async function createPromoTeam(data: any) {
    try {
        const promotion = await adminRequest('/admin/promotions', {
            method: 'POST',
            body: JSON.stringify(buildPromotionPayload(data)),
        });

        revalidatePath('/dashboard/sports/promo-teams');
        return { success: true, data: normalizePromotion(promotion) };
    } catch (error: any) {
        console.error('Failed to create cashback promotion:', error);
        return { success: false, error: error.message || 'Failed to create cashback promotion' };
    }
}

export async function updatePromoTeam(id: string, data: any) {
    try {
        const promotion = await adminRequest(`/admin/promotions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(buildPromotionPayload(data)),
        });

        revalidatePath('/dashboard/sports/promo-teams');
        return { success: true, data: normalizePromotion(promotion) };
    } catch (error: any) {
        console.error('Failed to update cashback promotion:', error);
        return { success: false, error: error.message || 'Failed to update cashback promotion' };
    }
}

export async function deletePromoTeam(id: string) {
    try {
        await adminRequest(`/admin/promotions/${id}`, {
            method: 'DELETE',
        });

        revalidatePath('/dashboard/sports/promo-teams');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to delete cashback promotion:', error);
        return { success: false, error: error.message || 'Failed to delete cashback promotion' };
    }
}

export async function togglePromoTeamStatus(id: string, isActive: boolean) {
    try {
        const promotion = await adminRequest(`/admin/promotions/${id}/toggle`, {
            method: 'POST',
            body: JSON.stringify({ isActive }),
        });

        revalidatePath('/dashboard/sports/promo-teams');
        return { success: true, data: normalizePromotion(promotion) };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to toggle status' };
    }
}

export async function setPromoTeamTrigger(id: string, payload: {
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
        const promotion = await adminRequest(`/admin/promotions/${id}/trigger-condition`, {
            method: 'POST',
            body: JSON.stringify({
                isTriggered: payload.isTriggered,
                ...(typeof payload.oversWindow === 'number' ? { oversWindow: Number(payload.oversWindow) } : {}),
                ...(typeof payload.leadThreshold === 'number' ? { leadThreshold: Number(payload.leadThreshold) } : {}),
                ...(typeof payload.minuteThreshold === 'number' ? { minuteThreshold: Number(payload.minuteThreshold) } : {}),
                ...(payload.periodLabel ? { periodLabel: payload.periodLabel } : {}),
                ...(Array.isArray(payload.qualifyingSelections) ? { qualifyingSelections: payload.qualifyingSelections } : {}),
                ...(payload.scoreSnapshot ? { scoreSnapshot: payload.scoreSnapshot } : {}),
                ...(payload.triggerNote ? { triggerNote: payload.triggerNote } : {}),
            }),
        });

        revalidatePath('/dashboard/sports/promo-teams');
        return { success: true, data: normalizePromotion(promotion) };
    } catch (error: any) {
        console.error('Failed to update trigger condition:', error);
        return { success: false, error: error.message || 'Failed to update trigger condition' };
    }
}
