"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { promotionApi, Promotion } from '@/services/promotions';
import {
  ArrowLeft, Gift, Clock, Percent, Wallet, Shield, Calendar,
  Users, Copy, CheckCircle, Tag, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

function InfoRow({ icon: Icon, label, value, numeric = false }: {
  icon: React.ElementType;
  label: string;
  value: string | number | undefined;
  numeric?: boolean;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--line)] last:border-0">
      <div className="flex items-center gap-2.5 text-[var(--ink-faint)]">
        <Icon size={14} />
        <span className="text-[13px]">{label}</span>
      </div>
      <span className={`text-[13px] font-bold text-[var(--ink-strong)] ${numeric ? 'num' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function PromotionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const promoId = params.id as string;

  const [promo, setPromo] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tcOpen, setTcOpen] = useState(false);

  useEffect(() => {
    promotionApi.getAll().then((all) => {
      const found = all.find(p => p._id === promoId);
      setPromo(found || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [promoId]);

  const copyCode = () => {
    if (!promo?.promoCode) return;
    navigator.clipboard.writeText(promo.promoCode);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const daysLeft = promo?.expiryDate
    ? Math.max(0, Math.ceil((new Date(promo.expiryDate).getTime() - Date.now()) / 86400000))
    : null;

  const claimProgress = promo?.claimLimit
    ? Math.min(100, Math.round(((promo.claimCount || 0) / promo.claimLimit) * 100))
    : null;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[var(--bg-base)]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--line)] border-t-[var(--gold)]" />
      </div>
    );
  }

  if (!promo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 bg-[var(--bg-base)] px-4 text-center">
        <p className="text-[var(--ink-dim)] text-[15px]">Promotion not found</p>
        <button
          onClick={() => router.push('/promotions')}
          className="btn btn-gold sweep h-10 uppercase tracking-[0.06em] text-[11px] px-5"
        >
          Back to Promotions
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="max-w-[800px] mx-auto px-4 md:px-6 pt-4 md:pt-6 pb-32 md:pb-12 space-y-5 md:space-y-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-[var(--ink-faint)] hover:text-[var(--ink)] text-[13px] transition-colors"
        >
          <ArrowLeft size={16} /> Back to Promotions
        </button>

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-[18px] md:rounded-[22px] border border-[var(--line-gold)] aspect-[16/9] md:aspect-[21/9] grain">
          {promo.bgImage ? (
            <img src={promo.bgImage} alt={promo.title} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: promo.gradient || 'linear-gradient(135deg, var(--gold-soft), transparent), var(--bg-elevated)' }}
            />
          )}
          {/* Scrim */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(10,11,15,0.05) 0%, rgba(10,11,15,0.45) 50%, rgba(10,11,15,0.92) 100%)',
            }}
          />

          {/* Character image */}
          {promo.charImage && (
            <img
              src={promo.charImage}
              alt=""
              className="absolute bottom-0 right-3 md:right-4 h-[78%] md:h-[82%] object-contain pointer-events-none"
            />
          )}

          {/* Top chips */}
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2 flex-wrap">
            {promo.category && (
              <span className="chip chip-gold">{promo.category}</span>
            )}
            {promo.badgeLabel && (
              <span className="chip">{promo.badgeLabel}</span>
            )}
          </div>

          {/* Bonus percentage */}
          {promo.bonusPercentage && promo.bonusPercentage > 0 ? (
            <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4">
              <span className="num font-display font-extrabold text-[44px] md:text-[64px] leading-none tracking-[-0.04em] text-gold-grad drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                +{promo.bonusPercentage}%
              </span>
            </div>
          ) : null}
        </div>

        {/* Title + description */}
        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-[22px] md:text-[28px] leading-tight tracking-[-0.02em] text-[var(--ink-strong)]">
            {promo.title}
          </h1>
          {promo.subtitle && (
            <p className="text-[var(--gold-bright)] font-semibold text-[13px]">{promo.subtitle}</p>
          )}
          {promo.description && (
            <p className="text-[var(--ink-dim)] text-[13.5px] leading-relaxed">{promo.description}</p>
          )}
        </div>

        {/* Promo code */}
        {promo.promoCode && (
          <div className="flex items-center gap-3 p-4 rounded-[14px] bg-[var(--gold-soft)] border border-[var(--line-gold)]">
            <Tag size={16} className="text-[var(--gold)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="t-eyebrow !text-[9px] !text-[var(--gold)]">Promo Code</p>
              <p className="num text-[18px] font-bold text-[var(--gold-bright)] tracking-widest truncate">
                {promo.promoCode}
              </p>
            </div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 chip chip-gold !py-2 !px-3"
              aria-label="Copy promo code"
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {/* Details card */}
        <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--line)]">
            <h3 className="font-display font-bold text-[13px] text-[var(--ink-strong)]">Offer Details</h3>
          </div>
          <div className="px-4">
            <InfoRow icon={Percent} label="Bonus Percentage" value={promo.bonusPercentage ? `${promo.bonusPercentage}%` : undefined} numeric />
            <InfoRow icon={Gift} label="Max Bonus" value={promo.maxBonus ? `₹${promo.maxBonus.toLocaleString()}` : undefined} numeric />
            <InfoRow icon={Wallet} label="Min Deposit" value={promo.minDeposit ? `₹${promo.minDeposit.toLocaleString()}` : undefined} numeric />
            <InfoRow icon={Shield} label="Wagering Requirement" value={promo.wageringMultiplier ? `${promo.wageringMultiplier}×` : undefined} numeric />
            <InfoRow icon={Calendar} label="Validity" value={promo.validityDays ? `${promo.validityDays} days` : undefined} numeric />
            <InfoRow icon={Users} label="Target Audience" value={promo.targetAudience} />
            <InfoRow icon={Clock} label="Expires" value={daysLeft !== null ? (daysLeft === 0 ? 'Today' : `${daysLeft} days left`) : undefined} numeric={daysLeft !== null && daysLeft > 0} />
          </div>
        </div>

        {/* Claim progress */}
        {claimProgress !== null && promo.claimLimit && (
          <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[var(--ink-faint)]">Claims Used</span>
              <span className="num font-bold text-[var(--ink-strong)]">
                {promo.claimCount || 0} / {promo.claimLimit}
              </span>
            </div>
            <div className="h-2 bg-[var(--ink-ghost)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gold-grad transition-all"
                style={{ width: `${claimProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* T&C accordion (default closed) */}
        {promo.termsAndConditions && (
          <div className="rounded-[14px] border border-[var(--line-default)] bg-[var(--bg-surface)] overflow-hidden">
            <button
              type="button"
              onClick={() => setTcOpen(!tcOpen)}
              aria-expanded={tcOpen}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[var(--ink-faint)]" />
                <span className="text-[13px] font-bold text-[var(--ink-strong)]">Terms &amp; Conditions</span>
              </div>
              {tcOpen
                ? <ChevronUp size={14} className="text-[var(--ink-faint)]" />
                : <ChevronDown size={14} className="text-[var(--ink-faint)]" />}
            </button>
            {tcOpen && (
              <div className="px-4 pb-4 border-t border-[var(--line)]">
                <p className="text-[12px] text-[var(--ink-dim)] leading-relaxed whitespace-pre-line pt-3">
                  {promo.termsAndConditions}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Inline CTA (md+) */}
        {promo.buttonLink && (
          <div className="hidden md:block">
            <a
              href={promo.buttonLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gold sweep w-full h-12 uppercase tracking-[0.08em] text-[12px]"
            >
              <Gift size={16} />
              {promo.buttonText || 'Claim Now'}
            </a>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA — mobile only, with safe-area */}
      {promo.buttonLink && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-40 glass border-t border-[var(--line-default)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="px-4 pt-3 pb-3">
            <a
              href={promo.buttonLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gold sweep w-full h-12 uppercase tracking-[0.08em] text-[12px]"
            >
              <Gift size={15} />
              {promo.buttonText || 'Claim Now'}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
