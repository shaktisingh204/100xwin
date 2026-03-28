import mongoose, { Schema, Document } from 'mongoose';

export interface IBet extends Document {
    userId: number;
    eventId: string;
    eventName: string;
    marketId: string;
    marketName: string;
    selectionId: string;
    selectionName: string;
    odds: number;
    stake: number;
    potentialWin: number;
    status: string;
    betType: string;
    walletType?: string;
    betSource?: string;
    settledReason?: string;
    settledAt?: Date;
    cashoutValue?: number;
    partialCashoutValue?: number;
    partialCashoutCount?: number;
    snapshot: any;
    createdAt: Date;
    updatedAt: Date;
}

const BetSchema: Schema = new Schema({
    userId: { type: Number, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    eventName: { type: String },
    marketId: { type: String, required: true },
    marketName: { type: String },
    selectionId: { type: String, required: true },
    selectionName: { type: String },
    odds: { type: Number, required: true },
    stake: { type: Number, required: true },
    potentialWin: { type: Number, required: true },
    status: { type: String, default: 'PENDING', index: true },
    betType: { type: String, default: 'back' },
    walletType: { type: String, default: 'fiat' },
    betSource: { type: String, default: 'balance' },
    settledReason: { type: String },
    settledAt: { type: Date },
    cashoutValue: { type: Number },
    partialCashoutValue: { type: Number, default: 0 },
    partialCashoutCount: { type: Number, default: 0 },
    snapshot: { type: Schema.Types.Mixed },
}, { timestamps: true });

BetSchema.index({ userId: 1, status: 1 });

export const Bet = mongoose.models.Bet || mongoose.model<IBet>('Bet', BetSchema);

// --- Casino Game ---

export interface ICasinoGame extends Document {
    provider: string;
    domain: string;
    name: string;
    type: string;
    subType: string;
    category: string;
    rtp: string;
    gameCode: string;
    gameId: string;
    remarks: string;
    image: string;
    icon: string;
    isActive: boolean;
    playCount: number;
    priority: number;
    isPopular: boolean;
    isNewGame: boolean;
}

const CasinoGameSchema: Schema = new Schema({
    provider: { type: String, required: true, index: true },
    domain: { type: String },
    name: { type: String, required: true },
    type: { type: String },
    subType: { type: String },
    category: { type: String },
    rtp: { type: String },
    gameCode: { type: String, required: true, unique: true },
    gameId: { type: String },
    remarks: { type: String },
    image: { type: String },
    icon: { type: String },
    isActive: { type: Boolean, default: true },
    playCount: { type: Number, default: 0 },
    priority: { type: Number, default: 0 },
    isPopular: { type: Boolean, default: false },
    isNewGame: { type: Boolean, default: false },
}, { timestamps: true });

export const CasinoGame = mongoose.models.CasinoGame || mongoose.model<ICasinoGame>('CasinoGame', CasinoGameSchema);

// --- Promo Card ---

export interface IPromoCard extends Document {
    title: string;
    subtitle: string;
    description: string;
    termsAndConditions: string;
    category: string;
    tag: string;
    promoCode: string;
    minDeposit: number;
    bonusPercentage: number;
    expiryDate: Date;
    buttonText: string;
    buttonLink: string;
    bgImage: string;
    charImage: string;
    gradient: string;
    isActive: boolean;
    isFeatured: boolean;
    order: number;
}

const PromoCardSchema: Schema = new Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String },
    termsAndConditions: { type: String },
    category: { type: String, default: 'ALL', enum: ['ALL', 'CASINO', 'SPORTS', 'LIVE', 'VIP'] },
    tag: { type: String, default: 'CASINO' },
    promoCode: { type: String },
    minDeposit: { type: Number, default: 0 },
    bonusPercentage: { type: Number, default: 0 },
    expiryDate: { type: Date },
    buttonText: { type: String, default: 'CLAIM NOW' },
    buttonLink: { type: String },
    bgImage: { type: String },
    charImage: { type: String },
    gradient: { type: String },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
}, { timestamps: true });

export const PromoCard = mongoose.models.PromoCard || mongoose.model<IPromoCard>('PromoCard', PromoCardSchema);


// --- Promotion (Promotions Page) ---
// Separate from PromoCard (homepage sliders). These are the rich cards on /promotions.

export interface IPromotion extends Document {
    title: string;
    subtitle: string;
    description: string;
    termsAndConditions: string;
    category: string;       // ALL | CASINO | SPORTS | LIVE | VIP
    promoCode: string;
    minDeposit: number;
    bonusPercentage: number;
    expiryDate: Date;
    buttonText: string;
    buttonLink: string;
    bgImage: string;
    charImage: string;
    gradient: string;
    badgeLabel: string;     // e.g. "HOT", "NEW", "EXCLUSIVE"
    isActive: boolean;
    isFeatured: boolean;
    order: number;
}

const PromotionSchema: Schema = new Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String },
    termsAndConditions: { type: String },
    category: { type: String, default: 'ALL', enum: ['ALL', 'CASINO', 'SPORTS', 'LIVE', 'VIP'] },
    promoCode: { type: String },
    minDeposit: { type: Number, default: 0 },
    bonusPercentage: { type: Number, default: 0 },
    expiryDate: { type: Date },
    buttonText: { type: String, default: 'CLAIM NOW' },
    buttonLink: { type: String, default: '/register' },
    bgImage: { type: String },
    charImage: { type: String },
    gradient: { type: String, default: 'linear-gradient(135deg, #E37D32, #AE5910)' },
    badgeLabel: { type: String },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
}, { timestamps: true });

export const Promotion = mongoose.models.Promotion || mongoose.model<IPromotion>('Promotion', PromotionSchema);


// --- Sport ---

export interface ISport extends Document {
    sport_id: string;
    sport_name: string;
    market_count: number;
    isVisible: boolean;
    minBet: number;
    maxBet: number;
}

const SportSchema: Schema = new Schema({
    sport_id: { type: String, required: true, unique: true },
    sport_name: { type: String, required: true },
    market_count: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    minBet: { type: Number, default: 100 },
    maxBet: { type: Number, default: 100000 },
}, { timestamps: true });

export const Sport = mongoose.models.Sport || mongoose.model<ISport>('Sport', SportSchema);

// --- Event ---

export interface IEvent extends Document {
    event_id: string;
    event_name: string;
    competition_id: string;
    open_date: string;
    timezone: string;
    match_status: string;
    home_team: string;
    away_team: string;
    score1: string;
    score2: string;
    match_info: string;
    isVisible: boolean;
}

const EventSchema: Schema = new Schema({
    event_id: { type: String, required: true, unique: true },
    event_name: { type: String, required: true },
    competition_id: { type: String, required: true, index: true },
    open_date: { type: String, required: true },
    timezone: { type: String },
    match_status: { type: String },
    home_team: { type: String },
    away_team: { type: String },
    score1: { type: String },
    score2: { type: String },
    match_info: { type: String },
    isVisible: { type: Boolean, default: true },
}, { timestamps: true });
EventSchema.index({ open_date: 1 });

export const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

// --- Competition ---

export interface ICompetition extends Document {
    competition_id: string;
    competition_name: string;
    sport_id: string;
    country_code: string;
    market_count: number;
    isVisible: boolean;
}

const CompetitionSchema: Schema = new Schema({
    competition_id: { type: String, required: true, unique: true },
    competition_name: { type: String, required: true },
    sport_id: { type: String, required: true, index: true },
    country_code: { type: String },
    market_count: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
}, { timestamps: true });

export const Competition = mongoose.models.Competition || mongoose.model<ICompetition>('Competition', CompetitionSchema);

// --- Casino Category ---

export interface ICasinoCategory extends Document {
    name: string;
    slug: string;
    priority: number;
    isActive: boolean;
    image: string;
}

const CasinoCategorySchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    image: { type: String },
}, { timestamps: true });
CasinoCategorySchema.index({ priority: -1 });

export const CasinoCategory = mongoose.models.CasinoCategory || mongoose.model<ICasinoCategory>('CasinoCategory', CasinoCategorySchema);

// --- Casino Provider ---

export interface ICasinoProvider extends Document {
    name: string;
    code: string;
    priority: number;
    isActive: boolean;
    image: string;
}

const CasinoProviderSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    image: { type: String },
}, { timestamps: true });
CasinoProviderSchema.index({ priority: -1 });

export const CasinoProvider = mongoose.models.CasinoProvider || mongoose.model<ICasinoProvider>('CasinoProvider', CasinoProviderSchema);

// --- Bonus ---

export interface IBonus extends Document {
    code: string;
    type: string;
    title: string;
    description: string;
    imageUrl: string;
    amount: number;
    percentage: number;
    minDeposit: number;
    maxBonus: number;
    wageringRequirement: number;
    isActive: boolean;
    validFrom: Date;
    validUntil: Date;
    usageLimit: number;
    usageCount: number;
    showOnSignup: boolean;
    forFirstDepositOnly: boolean;
    // Wagering split fields
    applicableTo: string;       // 'CASINO' | 'SPORTS' | 'BOTH'
    expiryDays: number;         // Days user has after activation to complete wagering
    currency: string;           // 'INR' | 'CRYPTO' | 'BOTH'
    depositWagerMultiplier: number; // Deposit wagering multiplier (1x default)
    displayCategory: string;    // UI grouping category
}

const BonusSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: ['CASINO', 'SPORTS'] },
    title: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    amount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    minDeposit: { type: Number, default: 0 },
    maxBonus: { type: Number, default: 0 },
    wageringRequirement: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    validFrom: { type: Date },
    validUntil: { type: Date },
    usageLimit: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
    showOnSignup: { type: Boolean, default: false },
    forFirstDepositOnly: { type: Boolean, default: true },
    // Wagering split fields — MUST be declared or Mongoose silently strips them
    applicableTo: { type: String, default: 'BOTH', enum: ['CASINO', 'SPORTS', 'BOTH'] },
    expiryDays: { type: Number, default: 30 },
    currency: { type: String, default: 'INR', enum: ['INR', 'CRYPTO', 'BOTH'] },
    depositWagerMultiplier: { type: Number, default: 1 },
    displayCategory: { type: String, default: 'ALL' },
}, { timestamps: true });

export const Bonus = mongoose.models.Bonus || mongoose.model<IBonus>('Bonus', BonusSchema);

// --- TopEvent (Popular events shown on the Popular tab) ---

export interface ITopEvent extends Document {
    event_id: string;
    event_name: string;
    added_at: Date;
}

const TopEventSchema: Schema = new Schema({
    event_id: { type: String, required: true, unique: true },
    event_name: { type: String },
    added_at: { type: Date, default: Date.now },
});

export const TopEvent = mongoose.models.TopEvent || mongoose.model<ITopEvent>('TopEvent', TopEventSchema);

// --- HomeEvent (Events pinned to appear in the Home Page sports section) ---

export interface IHomeEvent extends Document {
    event_id: string;
    event_name: string;
    added_at: Date;
}

const HomeEventSchema: Schema = new Schema({
    event_id: { type: String, required: true, unique: true },
    event_name: { type: String },
    added_at: { type: Date, default: Date.now },
});

export const HomeEvent = mongoose.models.HomeEvent || mongoose.model<IHomeEvent>('HomeEvent', HomeEventSchema);

// --- HomeCasinoGame (Casino games pinned to appear in the Home Page casino section) ---

export interface IHomeCasinoGame extends Document {
    gameCode: string;
    name: string;
    provider: string;
    image: string;
    order: number;
    added_at: Date;
}

const HomeCasinoGameSchema: Schema = new Schema({
    gameCode: { type: String, required: true, unique: true },
    name: { type: String },
    provider: { type: String },
    image: { type: String },
    order: { type: Number, default: 0 },
    added_at: { type: Date, default: Date.now },
});

export const HomeCasinoGame = mongoose.models.HomeCasinoGame || mongoose.model<IHomeCasinoGame>('HomeCasinoGame', HomeCasinoGameSchema);

// --- TopCasinoGame (Casino games pinned as "Top Games" on the casino page) ---

export interface ITopCasinoGame extends Document {
    gameCode: string;
    name: string;
    provider: string;
    image: string;
    order: number;
    added_at: Date;
}

const TopCasinoGameSchema: Schema = new Schema({
    gameCode: { type: String, required: true, unique: true },
    name: { type: String },
    provider: { type: String },
    image: { type: String },
    order: { type: Number, default: 0 },
    added_at: { type: Date, default: Date.now },
});

export const TopCasinoGame = mongoose.models.TopCasinoGame || mongoose.model<ITopCasinoGame>('TopCasinoGame', TopCasinoGameSchema);

// ─── CasinoSectionGame — unified model for all curated casino tabs ─────────────
// section values: 'popular'|'new'|'slots'|'live'|'table'|'crash'|'home'|'top'

export interface ICasinoSectionGame extends Document {
    section: string;
    gameCode: string;
    name: string;
    provider: string;
    image: string;
    order: number;
    added_at: Date;
}

const CasinoSectionGameSchema: Schema = new Schema({
    section: { type: String, required: true, index: true },
    gameCode: { type: String, required: true },
    name: { type: String },
    provider: { type: String },
    image: { type: String },
    order: { type: Number, default: 0 },
    added_at: { type: Date, default: Date.now },
});
CasinoSectionGameSchema.index({ section: 1, gameCode: 1 }, { unique: true });

export const CasinoSectionGame = mongoose.models.CasinoSectionGame || mongoose.model<ICasinoSectionGame>('CasinoSectionGame', CasinoSectionGameSchema);

// ─── Announcement ─────────────────────────────────────────────────────────────

export interface IAnnouncement extends Document {
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'PROMO';
    isActive: boolean;
    isPinned: boolean;
    startAt?: Date;
    endAt?: Date;
    order: number;
}

const AnnouncementSchema: Schema = new Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'INFO', enum: ['INFO', 'WARNING', 'SUCCESS', 'PROMO'] },
    isActive: { type: Boolean, default: true },
    isPinned: { type: Boolean, default: false },
    startAt: { type: Date },
    endAt: { type: Date },
    order: { type: Number, default: 0 },
}, { timestamps: true });

AnnouncementSchema.index({ isActive: 1, isPinned: -1, order: 1 });

export const Announcement = mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

// ─── Zeero Originals ─────────────────────────────────────────────────────────
// These must match the exact collection names used by the backend (NestJS + Mongoose)

// --- OriginalsConfig ---
export interface IOriginalsConfig extends Document {
    gameKey: string;
    accessMode: 'ALL' | 'ALLOW_LIST';
    allowedUserIds: number[];
    isActive: boolean;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    minBet: number;
    maxBet: number;
    maxWin: number;
    houseEdgePercent: number;
    maxMultiplier: number;
    targetGgrPercent: number;
    ggrWindowHours: number;
    ggrBiasStrength: number;
    perUserGgrOverrides: Record<string, number>;
    engagementMode: string;
    nearMissEnabled: boolean;
    bigWinThreshold: number;
    streakWindow: number;
    displayRtpPercent: number;
    thumbnailUrl: string;
    gameName: string;
    gameDescription: string;
    fakePlayerMin: number;
    fakePlayerMax: number;
    updatedBy: number;
}

const OriginalsConfigSchema: Schema = new Schema({
    gameKey:             { type: String, required: true, unique: true },
    accessMode:          { type: String, default: 'ALLOW_LIST' },
    allowedUserIds:      { type: [Number], default: [] },
    isActive:            { type: Boolean, default: true },
    maintenanceMode:     { type: Boolean, default: false },
    maintenanceMessage:  { type: String },
    minBet:              { type: Number, default: 10 },
    maxBet:              { type: Number, default: 100000 },
    maxWin:              { type: Number, default: 1000000 },
    houseEdgePercent:    { type: Number, default: 1.0 },
    maxMultiplier:       { type: Number, default: 500 },
    targetGgrPercent:    { type: Number, default: 5.0 },
    ggrWindowHours:      { type: Number, default: 24 },
    ggrBiasStrength:     { type: Number, default: 0.20 },
    perUserGgrOverrides: { type: Schema.Types.Mixed, default: {} },
    engagementMode:      { type: String, default: 'SOFT' },
    nearMissEnabled:     { type: Boolean, default: true },
    bigWinThreshold:     { type: Number, default: 10 },
    streakWindow:        { type: Number, default: 5 },
    displayRtpPercent:   { type: Number, default: 95.0 },
    thumbnailUrl:        { type: String },
    gameName:            { type: String },
    gameDescription:     { type: String },
    fakePlayerMin:       { type: Number, default: 200 },
    fakePlayerMax:       { type: Number, default: 300 },
    updatedBy:           { type: Number },
}, { timestamps: true, collection: 'originals_configs' });

export const OriginalsConfig = mongoose.models.OriginalsConfig ||
    mongoose.model<IOriginalsConfig>('OriginalsConfig', OriginalsConfigSchema);

// --- MinesGame ---
export interface IMinesGame extends Document {
    userId: number;
    betAmount: number;
    mineCount: number;
    minePositions: number[];
    revealedTiles: number[];
    status: string;
    payout: number;
    multiplier: number;
    serverSeed: string;
    clientSeed: string;
    serverSeedHash: string;
    walletType: string;
    usedBonus: boolean;
    bonusAmount: number;
    currency: string;
    biasWeight: number;
    createdAt: Date;
}

const MinesGameSchema: Schema = new Schema({
    userId:         { type: Number, required: true, index: true },
    betAmount:      { type: Number, required: true },
    mineCount:      { type: Number, required: true },
    minePositions:  { type: [Number], required: true },
    revealedTiles:  { type: [Number], default: [] },
    status:         { type: String, default: 'ACTIVE', index: true },
    payout:         { type: Number, default: 0 },
    multiplier:     { type: Number, default: 1 },
    serverSeed:     { type: String },
    clientSeed:     { type: String },
    serverSeedHash: { type: String },
    walletType:     { type: String, default: 'fiat' },
    usedBonus:      { type: Boolean, default: false },
    bonusAmount:    { type: Number, default: 0 },
    currency:       { type: String, default: 'INR' },
    biasWeight:     { type: Number, default: 0 },
}, { timestamps: true, collection: 'mines_games' });

MinesGameSchema.index({ userId: 1, status: 1 });

export const MinesGame = mongoose.models.MinesGame ||
    mongoose.model<IMinesGame>('MinesGame', MinesGameSchema);

// --- OriginalsGGRSnapshot ---
export interface IOriginalsGGRSnapshot extends Document {
    gameKey: string;
    windowStart: Date;
    windowEnd: Date;
    totalWagered: number;
    totalPaidOut: number;
    totalGames: number;
    totalWins: number;
    totalLosses: number;
    ggrPercent: number;
    snapshotAt: Date;
}

const OriginalsGGRSnapshotSchema: Schema = new Schema({
    gameKey:      { type: String, required: true, index: true },
    windowStart:  { type: Date },
    windowEnd:    { type: Date },
    totalWagered: { type: Number, default: 0 },
    totalPaidOut: { type: Number, default: 0 },
    totalGames:   { type: Number, default: 0 },
    totalWins:    { type: Number, default: 0 },
    totalLosses:  { type: Number, default: 0 },
    ggrPercent:   { type: Number, default: 0 },
    snapshotAt:   { type: Date, default: Date.now, index: true },
}, { collection: 'originals_ggr_snapshots' });

export const OriginalsGGRSnapshot = mongoose.models.OriginalsGGRSnapshot ||
    mongoose.model<IOriginalsGGRSnapshot>('OriginalsGGRSnapshot', OriginalsGGRSnapshotSchema);

// --- OriginalsSession ---
export interface IOriginalsSession extends Document {
    userId: number;
    gameKey: string;
    socketId: string;
    isActive: boolean;
    connectedAt: Date;
    disconnectedAt: Date;
}

const OriginalsSessionSchema: Schema = new Schema({
    userId:         { type: Number, required: true, index: true },
    gameKey:        { type: String, required: true },
    socketId:       { type: String },
    isActive:       { type: Boolean, default: true },
    connectedAt:    { type: Date, default: Date.now },
    disconnectedAt: { type: Date },
}, { timestamps: true, collection: 'originals_sessions' });

export const OriginalsSession = mongoose.models.OriginalsSession ||
    mongoose.model<IOriginalsSession>('OriginalsSession', OriginalsSessionSchema);

// --- OriginalsEngagementEvent ---
export interface IOriginalsEngagementEvent extends Document {
    userId: number;
    gameKey: string;
    gameId: string;
    eventType: string;
    metadata: any;
    createdAt: Date;
}

const OriginalsEngagementEventSchema: Schema = new Schema({
    userId:    { type: Number, required: true, index: true },
    gameKey:   { type: String, required: true },
    gameId:    { type: String },
    eventType: { type: String, required: true },
    metadata:  { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'originals_engagement_events' });

export const OriginalsEngagementEvent = mongoose.models.OriginalsEngagementEvent ||
    mongoose.model<IOriginalsEngagementEvent>('OriginalsEngagementEvent', OriginalsEngagementEventSchema);

// --- AviatorRound ---
export interface IAviatorRound extends Document {
    roundId: number;
    serverSeed: string;
    serverSeedHash: string;
    crashPoint: number;
    status: string;
    startedAt: Date;
    crashedAt: Date;
    totalWagered: number;
    totalPaidOut: number;
}

const AviatorRoundSchema: Schema = new Schema({
    roundId:        { type: Number, required: true, unique: true },
    serverSeed:     { type: String },
    serverSeedHash: { type: String },
    crashPoint:     { type: Number },
    status:         { type: String, default: 'BETTING', index: true },
    startedAt:      { type: Date },
    crashedAt:      { type: Date },
    totalWagered:   { type: Number, default: 0 },
    totalPaidOut:   { type: Number, default: 0 },
}, { timestamps: true, collection: 'aviator_rounds' });

export const AviatorRound = mongoose.models.AviatorRound ||
    mongoose.model<IAviatorRound>('AviatorRound', AviatorRoundSchema);

// --- AviatorBet ---
export interface IAviatorBet extends Document {
    roundId: number;
    userId: number;
    betAmount: number;
    status: string;
    cashedOutMultiplier: number;
    payout: number;
    autoCashoutAt: number;
    walletType: string;
    currency: string;
    createdAt: Date;
}

const AviatorBetSchema: Schema = new Schema({
    roundId:             { type: Number, required: true, index: true },
    userId:              { type: Number, required: true, index: true },
    betAmount:           { type: Number, required: true },
    status:              { type: String, default: 'ACTIVE' },
    cashedOutMultiplier: { type: Number, default: 0 },
    payout:              { type: Number, default: 0 },
    autoCashoutAt:       { type: Number, default: 0 },
    walletType:          { type: String, default: 'fiat' },
    currency:            { type: String, default: 'INR' },
}, { timestamps: true, collection: 'aviator_bets' });

export const AviatorBet = mongoose.models.AviatorBet ||
    mongoose.model<IAviatorBet>('AviatorBet', AviatorBetSchema);

// ─── Notification (in-app notifications) ──────────────────────────────────────

export interface INotification extends Document {
    userId: number;
    title: string;
    body: string;
    deepLink?: string;
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    userId:   { type: Number, required: true, index: true },
    title:    { type: String, required: true },
    body:     { type: String, required: true },
    deepLink: { type: String },
    isRead:   { type: Boolean, default: false },
}, { timestamps: true, collection: 'notifications' });

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.models.Notification ||
    mongoose.model<INotification>('Notification', NotificationSchema);

// ─── PushNotification (admin audit log) ───────────────────────────────────────

export interface IPushNotification extends Document {
    title: string;
    body: string;
    imageUrl?: string;
    deepLink?: string;
    segment?: string;
    targetUserIds: number[];
    sentBy: number;
    sentCount: number;
    onesignalId?: string;
    createdAt: Date;
}

const PushNotificationSchema: Schema = new Schema({
    title:         { type: String, required: true },
    body:          { type: String, required: true },
    imageUrl:      { type: String },
    deepLink:      { type: String },
    segment:       { type: String },
    targetUserIds: { type: [Number], default: [] },
    sentBy:        { type: Number, default: 0 },
    sentCount:     { type: Number, default: 0 },
    onesignalId:   { type: String },
}, { timestamps: true, collection: 'push_notifications' });

PushNotificationSchema.index({ createdAt: -1 });

export const PushNotification = mongoose.models.PushNotification ||
    mongoose.model<IPushNotification>('PushNotification', PushNotificationSchema);

// ─── WhatsApp Campaign Log ─────────────────────────────────────────────────────

export interface IWhatsAppCampaignLog extends Document {
    campaignName: string;
    type: 'BULK' | 'AUTO_WELCOME' | 'AUTO_DEPOSIT' | 'AUTO_WITHDRAWAL';
    templateName: string;
    segment: string;
    // Advanced targeting
    minBalance?: number;
    maxBalance?: number;
    startDate?: Date;
    endDate?: Date;
    customPhones?: string[];
    // Variable mapping
    variables: { bodyParams: string[]; headerParam?: string };
    // Progress tracking
    targetUserIds: number[];
    totalUsers: number;
    sentCount: number;
    failedCount: number;
    failedPhones: string[];     // for retry
    speedLimit: number;         // msg/min
    wabaId: string;
    sentBy: number;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
    errorMessage?: string;
    createdAt: Date;
}

const WhatsAppCampaignLogSchema: Schema = new Schema({
    campaignName:  { type: String, required: true },
    type:          { type: String, required: true, enum: ['BULK', 'AUTO_WELCOME', 'AUTO_DEPOSIT', 'AUTO_WITHDRAWAL'] },
    templateName:  { type: String, required: true },
    segment:       { type: String, default: 'ALL' },
    minBalance:    { type: Number },
    maxBalance:    { type: Number },
    startDate:     { type: Date },
    endDate:       { type: Date },
    customPhones:  { type: [String], default: [] },
    variables:     { type: Object, default: { bodyParams: [], headerParam: '' } },
    targetUserIds: { type: [Number], default: [] },
    totalUsers:    { type: Number, default: 0 },
    sentCount:     { type: Number, default: 0 },
    failedCount:   { type: Number, default: 0 },
    failedPhones:  { type: [String], default: [] },
    speedLimit:    { type: Number, default: 60 },
    wabaId:        { type: String },
    sentBy:        { type: Number, default: 0 },
    status:        { type: String, default: 'PENDING', enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'] },
    errorMessage:  { type: String },
}, { timestamps: true, collection: 'whatsapp_campaign_logs' });

WhatsAppCampaignLogSchema.index({ createdAt: -1 });
WhatsAppCampaignLogSchema.index({ type: 1, status: 1 });

export const WhatsAppCampaignLog = mongoose.models.WhatsAppCampaignLog ||
    mongoose.model<IWhatsAppCampaignLog>('WhatsAppCampaignLog', WhatsAppCampaignLogSchema);

// ─── WhatsApp Config (credentials + auto-message templates) ───────────────────

export interface IWhatsAppConfig extends Document {
    key: string;   // always 'WHATSAPP_CONFIG'
    accessToken: string;
    appId: string;
    wabaId: string;
    phoneNumberId: string;
    isActive: boolean;
    // Auto-message templates
    welcomeTemplate: string;
    welcomeEnabled: boolean;
    depositTemplate: string;
    depositEnabled: boolean;
    withdrawalTemplate: string;
    withdrawalEnabled: boolean;
    updatedAt: Date;
}

const WhatsAppConfigSchema: Schema = new Schema({
    key:                { type: String, required: true, unique: true },
    accessToken:        { type: String, default: '' },
    appId:              { type: String, default: '' },
    wabaId:             { type: String, default: '' },
    phoneNumberId:      { type: String, default: '' },
    isActive:           { type: Boolean, default: false },
    welcomeTemplate:    { type: String, default: 'welcome_message' },
    welcomeEnabled:     { type: Boolean, default: false },
    depositTemplate:    { type: String, default: 'deposit_success' },
    depositEnabled:     { type: Boolean, default: false },
    withdrawalTemplate: { type: String, default: 'withdrawal_success' },
    withdrawalEnabled:  { type: Boolean, default: false },
}, { timestamps: true, collection: 'whatsapp_configs' });

export const WhatsAppConfig = mongoose.models.WhatsAppConfig ||
    mongoose.model<IWhatsAppConfig>('WhatsAppConfig', WhatsAppConfigSchema);

// ─── Promo Team (Sports Refunding) ──────────────────────────────────────────

export interface IPromoTeam extends Document {
    eventId: string;
    eventName: string;
    matchDate: Date;
    sportId: string;
    teams: string[];
    teamName?: string; // optional — promo is now match-based, not team-based
    refundPercentage: number;
    walletTarget: string;
    cardTitle: string;
    cardDescription: string;
    cardGradient: string;
    cardBgImage: string;
    cardBadge: string;
    showOnPromotionsPage: boolean;
    promoCardId?: string;
    isActive: boolean;
    refundIssued: boolean;
    refundIssuedAt?: Date;
    refundedBetCount: number;
    totalRefundedAmount: number;
    order: number;
}

const PromoTeamSchema: Schema = new Schema({
    eventId: { type: String, required: true },
    eventName: String,
    matchDate: Date,
    sportId: String,
    teams: [String],
    teamName: { type: String, required: false }, // optional — match-based promo
    refundPercentage: { type: Number, required: true, min: 0, max: 100 },
    walletTarget: { type: String, default: 'fiat', enum: ['fiat', 'crypto'] },
    cardTitle: String,
    cardDescription: String,
    cardGradient: { type: String, default: 'linear-gradient(135deg, rgba(16,185,129,0.7), rgba(6,78,59,0.3))' },
    cardBgImage: String,
    cardBadge: String,
    showOnPromotionsPage: { type: Boolean, default: true },
    promoCardId: String,
    isActive: { type: Boolean, default: true },
    refundIssued: { type: Boolean, default: false },
    refundIssuedAt: Date,
    refundedBetCount: { type: Number, default: 0 },
    totalRefundedAmount: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
}, { timestamps: true, collection: 'promo_teams' });

export const PromoTeam = mongoose.models.PromoTeam ||
    mongoose.model<IPromoTeam>('PromoTeam', PromoTeamSchema);

// --- TeamIcon (team logo/icon uploaded to Cloudflare) ---

export interface ITeamIcon extends Document {
    team_name: string;       // normalised team name (lowercase)
    display_name: string;    // original casing for UI
    icon_url: string;        // Cloudflare delivery URL
    sport_id: string;        // optional sport association
}

const TeamIconSchema: Schema = new Schema({
    team_name:    { type: String, required: true, unique: true, index: true },
    display_name: { type: String, required: true },
    icon_url:     { type: String, required: true },
    sport_id:     { type: String, default: '' },
}, { timestamps: true, collection: 'team_icons' });

export const TeamIcon = mongoose.models.TeamIcon ||
    mongoose.model<ITeamIcon>('TeamIcon', TeamIconSchema);

// ─── MatchCashbackPromotion (Sports Promotions — direct admin access) ─────────

export interface IMatchCashbackPromotion extends Document {
    matchId: string;
    promotionType: string;
    eventName?: string;
    matchDate?: Date;
    sportId?: string;
    teams: string[];
    refundPercentage: number;
    benefitType: string;
    walletType: string;
    maxRefundAmount?: number;
    isActive: boolean;
    showOnPromotionsPage: boolean;
    cardTitle?: string;
    cardDescription?: string;
    cardGradient?: string;
    cardBgImage?: string;
    cardBadge?: string;
    order: number;
    triggerConfig?: {
        eventType?: string;
        triggerMode?: string;
        oversWindow?: number;
        leadThreshold?: number;
        minuteThreshold?: number;
        periodLabel?: string;
        qualifyingSelections?: string[];
        scoreSnapshot?: string;
        triggerNote?: string;
        isTriggered?: boolean;
        triggeredAt?: Date;
    } | null;
    refundedBetCount: number;
    totalRefundAmount: number;
    lastSettledAt?: Date;
    conditionSummary?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SPORTS_PROMOTION_TYPES = [
    'MATCH_LOSS_CASHBACK',
    'FIRST_OVER_SIX_CASHBACK',
    'LEAD_MARGIN_PAYOUT',
    'LATE_LEAD_REFUND',
    'PERIOD_LEAD_PAYOUT',
];

const SPORTS_PROMOTION_BENEFIT_TYPES = ['REFUND', 'PAYOUT_AS_WIN'];
const CASHBACK_WALLET_TYPES = ['main_wallet', 'bonus_wallet'];

const MatchCashbackPromotionSchema: Schema = new Schema({
    matchId:              { type: String, required: true, index: true },
    promotionType:        { type: String, required: true, enum: SPORTS_PROMOTION_TYPES, default: 'MATCH_LOSS_CASHBACK' },
    eventName:            { type: String },
    matchDate:            { type: Date },
    sportId:              { type: String },
    teams:                { type: [String], default: [] },
    refundPercentage:     { type: Number, required: true, min: 0, max: 100 },
    benefitType:          { type: String, required: true, enum: SPORTS_PROMOTION_BENEFIT_TYPES, default: 'REFUND' },
    walletType:           { type: String, required: true, enum: CASHBACK_WALLET_TYPES, default: 'main_wallet' },
    maxRefundAmount:      { type: Number, min: 0 },
    isActive:             { type: Boolean, default: true, index: true },
    showOnPromotionsPage: { type: Boolean, default: true },
    cardTitle:            { type: String },
    cardDescription:      { type: String },
    cardGradient:         { type: String, default: 'linear-gradient(135deg, rgba(16,185,129,0.7), rgba(6,78,59,0.3))' },
    cardBgImage:          { type: String },
    cardBadge:            { type: String, default: 'SPORTS PROMO' },
    order:                { type: Number, default: 0 },
    triggerConfig:        { type: Schema.Types.Mixed, default: null },
    refundedBetCount:     { type: Number, default: 0 },
    totalRefundAmount:    { type: Number, default: 0 },
    lastSettledAt:        { type: Date },
    conditionSummary:     { type: String },
}, { timestamps: true, collection: 'match_cashback_promotions' });

MatchCashbackPromotionSchema.index({ matchId: 1, promotionType: 1, isActive: 1 });
MatchCashbackPromotionSchema.index({ showOnPromotionsPage: 1, isActive: 1, matchDate: 1, order: 1 });

export const MatchCashbackPromotion = mongoose.models.MatchCashbackPromotion ||
    mongoose.model<IMatchCashbackPromotion>('MatchCashbackPromotion', MatchCashbackPromotionSchema);
