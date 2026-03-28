'use server'

import connectMongo from '@/lib/mongo';
import { Bet } from '@/models/MongoModels';
import { prisma } from '@/lib/db';
import mongoose from 'mongoose';

// ─── Get pending bets ──────────────────────────────────────────────────────────
export async function getPendingBets(page = 1, limit = 100) {
    try {
        await connectMongo();
        const skip = (page - 1) * limit;
        const [bets, total] = await Promise.all([
            Bet.find({ status: 'PENDING' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Bet.countDocuments({ status: 'PENDING' }),
        ]);
        return {
            success: true,
            data: JSON.parse(JSON.stringify(bets)),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    } catch (err: any) {
        console.error('getPendingBets error:', err);
        return { success: false, data: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
}

// ─── Manual settle a single bet ────────────────────────────────────────────────
export async function manualSettleBet(
    betId: string,
    outcome: 'WON' | 'LOST' | 'VOID',
    adminNote = 'Manual admin settlement',
): Promise<{ success: boolean; message: string }> {
    try {
        await connectMongo();

        const bet = await Bet.findById(betId);
        if (!bet) return { success: false, message: `Bet ${betId} not found` };
        if (bet.status !== 'PENDING') {
            return { success: false, message: `Bet is already ${bet.status}, cannot re-settle` };
        }

        // ── Prisma transaction: update balance + create tx record ──────────────
        const updateData: any = {
            exposure: { decrement: bet.stake }, // always release exposure
        };

        if (outcome === 'WON') {
            updateData.balance = { increment: bet.potentialWin };
        } else if (outcome === 'VOID') {
            updateData.balance = { increment: bet.stake }; // refund stake
        }

        const txType = outcome === 'WON' ? 'BET_WIN' : outcome === 'VOID' ? 'BET_REFUND' : 'BET_LOSS';
        const txAmount = outcome === 'WON' ? bet.potentialWin : bet.stake;

        await prisma.$transaction([
            prisma.user.update({
                where: { id: bet.userId },
                data: updateData,
            }),
            prisma.transaction.create({
                data: {
                    userId: bet.userId,
                    amount: txAmount,
                    type: txType,
                    status: 'COMPLETED',
                    remarks: `${adminNote} — ${outcome}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            }),
        ]);

        // ── Update the bet document in MongoDB ────────────────────────────────
        bet.status = outcome;
        bet.settledReason = adminNote;
        bet.settledAt = new Date();
        await bet.save();

        return { success: true, message: `Bet settled as ${outcome}` };
    } catch (err: any) {
        console.error('manualSettleBet error:', err);
        return { success: false, message: err.message || 'Settlement failed' };
    }
}

// ─── Simple stats for display ──────────────────────────────────────────────────
export async function getSettlementStats() {
    try {
        await connectMongo();
        const [pending, wonToday, lostToday] = await Promise.all([
            Bet.countDocuments({ status: 'PENDING' }),
            Bet.countDocuments({
                status: 'WON',
                settledAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            }),
            Bet.countDocuments({
                status: 'LOST',
                settledAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            }),
        ]);
        return { success: true, data: { pending, wonToday, lostToday } };
    } catch (err) {
        return { success: false, data: { pending: 0, wonToday: 0, lostToday: 0 } };
    }
}
