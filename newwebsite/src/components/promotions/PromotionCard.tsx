"use client";

import React, { useState } from 'react';
import { Clock, Gift, Tag, ChevronDown, ChevronUp, Copy, Check, Info } from 'lucide-react';
import { Promotion } from '@/services/promotions';
import { useWallet } from '@/context/WalletContext';

interface PromotionCardProps {
    promo: Promotion;
}

const PromotionCard: React.FC<PromotionCardProps> = ({ promo }) => {
    const { activeSymbol } = useWallet();
    const [showTerms, setShowTerms] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        if (promo.promoCode) {
            navigator.clipboard.writeText(promo.promoCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isExpired = promo.expiryDate ? new Date(promo.expiryDate) < new Date() : false;
    const daysLeft = promo.expiryDate
        ? Math.max(0, Math.ceil((new Date(promo.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    const gradientStyle = promo.gradient
        ? { background: promo.gradient }
        : { background: 'linear-gradient(135deg, rgba(226, 140, 75, 0.25) 0%, rgba(30,30,30,0) 60%)' };

    return (
        <div className={`group relative overflow-hidden rounded-2xl bg-bg-elevated border transition-all duration-300 hover:shadow-2xl flex flex-col ${isExpired ? 'border-white/5 opacity-70' : 'border-white/10 hover:border-brand-gold/30'}`}>
            {/* Featured Badge */}
            {promo.isFeatured && (
                <div className="absolute top-3 right-3 z-20">
                    <span className="bg-brand-gold text-text-inverse text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                        ⭐ FEATURED
                    </span>
                </div>
            )}

            {/* Top Banner Area */}
            <div className="relative h-[180px] overflow-hidden flex-shrink-0">
                {promo.bgImage ? (
                    <img
                        src={promo.bgImage}
                        alt={promo.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0" style={gradientStyle} />
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-elevated via-bg-elevated/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

                {/* Badge overlay */}
                <div className="absolute top-3 left-3 flex gap-2 z-10">
                    {promo.badgeLabel && (
                        <span className="bg-white text-black text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                            {promo.badgeLabel}
                        </span>
                    )}
                </div>

                {promo.bonusPercentage && promo.bonusPercentage > 0 ? (
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                        <div className="text-4xl font-black text-white leading-none">
                            +{promo.bonusPercentage}%
                        </div>
                        <div className="text-sm text-white/70 font-medium">{promo.title}</div>
                    </div>
                ) : (
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                        <div className="text-2xl font-black text-white leading-tight">{promo.title}</div>
                        {promo.subtitle && <div className="text-sm text-white/70 mt-0.5">{promo.subtitle}</div>}
                    </div>
                )}

                {/* Character image */}
                {promo.charImage && (
                    <img
                        src={promo.charImage}
                        alt="Character"
                        className="absolute right-0 bottom-0 h-[160px] object-contain z-10 drop-shadow-2xl"
                    />
                )}
            </div>

            {/* Content Area */}
            <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Bonus Percentage title row (if shown above) */}
                {promo.bonusPercentage && promo.bonusPercentage > 0 ? (
                    <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">
                        {promo.description || promo.subtitle}
                    </p>
                ) : (
                    promo.description && (
                        <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">{promo.description}</p>
                    )
                )}

                {/* Stats Row */}
                <div className="flex flex-wrap gap-2">
                    {promo.minDeposit && promo.minDeposit > 0 ? (
                        <div className="flex items-center gap-1 bg-bg-base rounded-lg px-2 py-1 text-xs text-text-muted">
                            <Gift size={12} className="text-brand-gold" />
                            Min Deposit: {activeSymbol}{promo.minDeposit.toLocaleString()}
                        </div>
                    ) : null}
                    {daysLeft !== null && !isExpired && (
                        <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${daysLeft <= 3 ? 'bg-red-500/10 text-red-400' : 'bg-bg-base text-text-muted'}`}>
                            <Clock size={12} />
                            {daysLeft === 0 ? 'Expires today' : `${daysLeft}d left`}
                        </div>
                    )}
                    {isExpired && (
                        <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-2 py-1 text-xs text-red-400">
                            <Clock size={12} />
                            Expired
                        </div>
                    )}
                </div>

                {/* Promo Code */}
                {promo.promoCode && (
                    <div className="flex items-center gap-2 bg-bg-base border border-dashed border-brand-gold/40 rounded-lg p-2">
                        <Tag size={14} className="text-brand-gold flex-shrink-0" />
                        <span className="text-brand-gold font-mono font-bold text-sm tracking-widest flex-1">{promo.promoCode}</span>
                        <button
                            onClick={handleCopyCode}
                            className="text-text-muted hover:text-brand-gold transition-colors flex-shrink-0"
                            title="Copy code"
                        >
                            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                    </div>
                )}

                {/* CTA Button */}
                <a
                    href={!isExpired ? (promo.buttonLink || '#') : '#'}
                    className={`w-full flex items-center justify-center py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide transition-all duration-300 ${isExpired
                        ? 'bg-white/5 text-text-muted cursor-not-allowed'
                        : 'bg-brand-gold hover:bg-brand-gold-hover text-text-inverse shadow-glow-gold hover:scale-[1.02]'
                        }`}
                    onClick={isExpired ? (e) => e.preventDefault() : undefined}
                >
                    {isExpired ? 'Expired' : (promo.buttonText || 'CLAIM NOW')}
                </a>

                {/* Terms & Conditions Toggler */}
                {promo.termsAndConditions && (
                    <div className="border-t border-white/5 pt-2">
                        <button
                            onClick={() => setShowTerms(!showTerms)}
                            className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary text-xs w-full transition-colors"
                        >
                            <Info size={12} />
                            <span>Terms & Conditions</span>
                            {showTerms ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
                        </button>
                        {showTerms && (
                            <p className="mt-2 text-xs text-text-muted leading-relaxed bg-bg-base/50 rounded-lg p-2">
                                {promo.termsAndConditions}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionCard;
