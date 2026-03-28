import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { BetRepository } from '../repositories/bet.repository';
import { MatchRepository } from '../repositories/match.repository';
import { MatchCashbackTransactionRepository } from '../repositories/transaction.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { MatchCashbackRefundService } from './match-cashback-refund.service';
import { SettleMatchDto } from '../dto/settle-match.dto';

@Injectable()
export class MatchSettlementService {
    private readonly logger = new Logger(MatchSettlementService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly matchRepository: MatchRepository,
        private readonly betRepository: BetRepository,
        private readonly walletRepository: WalletRepository,
        private readonly transactionRepository: MatchCashbackTransactionRepository,
        private readonly refundService: MatchCashbackRefundService,
    ) { }

    async settleMatch(dto: SettleMatchDto) {
        const match = await this.matchRepository.ensureMatch({ matchId: dto.matchId });
        if (!match) {
            throw new NotFoundException('Match not found.');
        }

        let totalBets = 0;
        let wonBets = 0;
        let lostBets = 0;

        const cursor: any = this.betRepository.streamPendingByMatchId(dto.matchId);

        for await (const bet of cursor) {
            totalBets++;

            const userWins = this.didUserWinBet(bet, dto.winningTeam);
            const settledReason = this.buildSettlementReason(bet, dto.winningTeam, userWins, dto.note);
            const payoutWalletField = this.resolvePayoutWalletField(bet);

            await this.prisma.$transaction(async (prismaTx) => {
                const updateData: any = {
                    exposure: { decrement: bet.stake },
                };

                if (userWins) {
                    updateData[payoutWalletField] = { increment: bet.potentialWin };
                }

                await this.walletRepository.updateWithinTransaction(prismaTx, bet.userId, updateData);

                await this.transactionRepository.createWithinTransaction(prismaTx, {
                    userId: bet.userId,
                    amount: userWins ? bet.potentialWin : bet.stake,
                    type: userWins ? 'BET_WIN' : 'BET_LOSS',
                    status: 'COMPLETED',
                    paymentMethod: userWins ? this.mapWalletFieldToPaymentMethod(payoutWalletField) : null,
                    paymentDetails: {
                        source: 'MATCH_SETTLEMENT',
                        matchId: dto.matchId,
                        betId: String(bet._id),
                        winningTeam: dto.winningTeam,
                    },
                    remarks: settledReason,
                });
            });

            await this.betRepository.markSettled(
                String(bet._id),
                userWins ? 'WON' : 'LOST',
                settledReason,
            );

            if (userWins) {
                wonBets++;
            } else {
                lostBets++;
            }
        }

        await this.matchRepository.markFinished(dto.matchId, dto.winningTeam);
        const refundSummary = await this.refundService.processLossCashbackForMatch(dto.matchId);

        this.logger.log(`Settled match ${dto.matchId}. Bets: ${totalBets}, refunds: ${refundSummary.refundedBetCount}`);

        return {
            matchId: dto.matchId,
            winningTeam: dto.winningTeam,
            totalBets,
            wonBets,
            lostBets,
            refundSummary,
        };
    }

    private didUserWinBet(bet: any, winningTeam: string): boolean {
        const isBackBet = String(bet.betType || 'back').toLowerCase() !== 'lay';
        const selectedTeam = this.normalizeValue(
            bet.selectedTeam || bet.selectionName || bet.selectionId || '',
        );
        const normalizedWinner = this.normalizeValue(winningTeam);
        const isSelectionWinner = selectedTeam === normalizedWinner;

        return isBackBet ? isSelectionWinner : !isSelectionWinner;
    }

    private resolvePayoutWalletField(bet: any): 'balance' | 'sportsBonus' | 'cryptoBalance' {
        const betSource = String(bet.betSource || '');
        if (betSource.includes('sportsBonus')) {
            return 'sportsBonus';
        }

        return bet.walletType === 'crypto' ? 'cryptoBalance' : 'balance';
    }

    private mapWalletFieldToPaymentMethod(walletField: 'balance' | 'sportsBonus' | 'cryptoBalance') {
        if (walletField === 'sportsBonus') {
            return 'BONUS_WALLET';
        }

        if (walletField === 'cryptoBalance') {
            return 'CRYPTO_WALLET';
        }

        return 'MAIN_WALLET';
    }

    private buildSettlementReason(bet: any, winningTeam: string, userWins: boolean, note?: string) {
        const selectedTeam = bet.selectedTeam || bet.selectionName || bet.selectionId;
        const baseReason = `Match settled. Winner: ${winningTeam}. Selection: ${selectedTeam}. Result: ${userWins ? 'WON' : 'LOST'}.`;

        if (!note) {
            return baseReason;
        }

        return `${baseReason} Note: ${note}`;
    }

    private normalizeValue(value: string) {
        return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }
}
