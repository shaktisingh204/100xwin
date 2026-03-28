import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OriginalsConfig, OriginalsConfigDocument } from './schemas/originals-config.schema';
import { Public } from '../auth/public.decorator';

const GAME_DISPLAY: Record<string, { name: string; description: string; emoji: string }> = {
  mines:  { name: 'Zeero Mines',  description: 'Dodge the mines, collect the gems.',             emoji: '💣' },
  crash:  { name: 'Zeero Crash',  description: 'Watch the multiplier climb. Cash out in time.',  emoji: '🚀' },
  dice:   { name: 'Zeero Dice',   description: 'Roll the dice, beat the house.',                 emoji: '🎲' },
  limbo:  { name: 'Zeero Limbo',  description: 'Pick your multiplier and beat the bust point.',  emoji: '✈️' },
};

const ALL_GAME_KEYS = Object.keys(GAME_DISPLAY);

const DEFAULT_FIELDS: Record<string, any> = {
  mines:  { isActive: true,  displayRtpPercent: 95.0, minBet: 10, maxBet: 100000, fakePlayerMin: 200, fakePlayerMax: 300 },
  crash:  { isActive: true,  displayRtpPercent: 96.0, minBet: 10, maxBet: 50000,  fakePlayerMin: 180, fakePlayerMax: 280 },
  dice:   { isActive: true,  displayRtpPercent: 97.0, minBet: 10, maxBet: 50000,  fakePlayerMin: 120, fakePlayerMax: 220 },
  limbo:  { isActive: true,  displayRtpPercent: 96.0, minBet: 10, maxBet: 50000,  fakePlayerMin: 140, fakePlayerMax: 240 },
};

@Public()
@Controller('originals')
export class OriginalsPublicController {
  constructor(
    @InjectModel(OriginalsConfig.name)
    private readonly configModel: Model<OriginalsConfigDocument>,
  ) {}

  private toGameResponse(key: string, row: OriginalsConfigDocument | null) {
    const display = GAME_DISPLAY[key];
    const d = DEFAULT_FIELDS[key];
    return {
      gameKey:           key,
      gameName:          row?.gameName          ?? display.name,
      gameDescription:   row?.gameDescription   ?? display.description,
      emoji:             display.emoji,
      isActive:          row?.isActive          ?? d.isActive,
      displayRtpPercent: row?.displayRtpPercent ?? d.displayRtpPercent,
      minBet:            row?.minBet            ?? d.minBet,
      maxBet:            row?.maxBet            ?? d.maxBet,
      thumbnailUrl:      row?.thumbnailUrl       ?? null,
      fakePlayerMin:     row?.fakePlayerMin      ?? d.fakePlayerMin,
      fakePlayerMax:     row?.fakePlayerMax      ?? d.fakePlayerMax,
    };
  }

  /**
   * GET /originals/games
   * Returns display config for all Zeero Originals games (no auth required).
   * Used by home page ZeeroOriginalsSection.
   */
  @Get('games')
  async getAllGames() {
    const rows = await this.configModel
      .find({ gameKey: { $in: ALL_GAME_KEYS } })
      .lean();

    return ALL_GAME_KEYS.map((key) => {
      const row = rows.find((r) => r.gameKey === key) as any;
      return this.toGameResponse(key, row);
    });
  }

  /**
   * GET /originals/games/:key
   * Returns display config for one game.
   */
  @Get('games/:key')
  async getGame(@Param('key') key: string) {
    if (!ALL_GAME_KEYS.includes(key)) {
      throw new NotFoundException(`Game '${key}' not found`);
    }
    const row = await this.configModel.findOne({ gameKey: key });
    return this.toGameResponse(key, row);
  }
}
