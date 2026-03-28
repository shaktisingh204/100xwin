"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { getSystemConfig, updateSystemConfig } from '@/actions/settings';
import {
    Save, Wallet, ArrowDownRight, ArrowUpRight, CheckCircle,
    ChevronDown, ChevronUp, Search, RefreshCw, Loader2, Shield,
} from 'lucide-react';

// ─── Inline countries list (ISO codes + flags + currency) ─────────────────────
const ALL_COUNTRIES = [
    { name: 'Afghanistan', code: 'AF', flag: '🇦🇫', currency: 'AFN' },
    { name: 'Albania', code: 'AL', flag: '🇦🇱', currency: 'ALL' },
    { name: 'Algeria', code: 'DZ', flag: '🇩🇿', currency: 'DZD' },
    { name: 'Andorra', code: 'AD', flag: '🇦🇩', currency: 'EUR' },
    { name: 'Angola', code: 'AO', flag: '🇦🇴', currency: 'AOA' },
    { name: 'Antigua and Barbuda', code: 'AG', flag: '🇦🇬', currency: 'XCD' },
    { name: 'Argentina', code: 'AR', flag: '🇦🇷', currency: 'ARS' },
    { name: 'Armenia', code: 'AM', flag: '🇦🇲', currency: 'AMD' },
    { name: 'Australia', code: 'AU', flag: '🇦🇺', currency: 'AUD' },
    { name: 'Austria', code: 'AT', flag: '🇦🇹', currency: 'EUR' },
    { name: 'Azerbaijan', code: 'AZ', flag: '🇦🇿', currency: 'AZN' },
    { name: 'Bahamas', code: 'BS', flag: '🇧🇸', currency: 'BSD' },
    { name: 'Bahrain', code: 'BH', flag: '🇧🇭', currency: 'BHD' },
    { name: 'Bangladesh', code: 'BD', flag: '🇧🇩', currency: 'BDT' },
    { name: 'Barbados', code: 'BB', flag: '🇧🇧', currency: 'BBD' },
    { name: 'Belarus', code: 'BY', flag: '🇧🇾', currency: 'BYN' },
    { name: 'Belgium', code: 'BE', flag: '🇧🇪', currency: 'EUR' },
    { name: 'Belize', code: 'BZ', flag: '🇧🇿', currency: 'BZD' },
    { name: 'Benin', code: 'BJ', flag: '🇧🇯', currency: 'XOF' },
    { name: 'Bhutan', code: 'BT', flag: '🇧🇹', currency: 'BTN' },
    { name: 'Bolivia', code: 'BO', flag: '🇧🇴', currency: 'BOB' },
    { name: 'Bosnia and Herzegovina', code: 'BA', flag: '🇧🇦', currency: 'BAM' },
    { name: 'Botswana', code: 'BW', flag: '🇧🇼', currency: 'BWP' },
    { name: 'Brazil', code: 'BR', flag: '🇧🇷', currency: 'BRL' },
    { name: 'Brunei', code: 'BN', flag: '🇧🇳', currency: 'BND' },
    { name: 'Bulgaria', code: 'BG', flag: '🇧🇬', currency: 'BGN' },
    { name: 'Burkina Faso', code: 'BF', flag: '🇧🇫', currency: 'XOF' },
    { name: 'Burundi', code: 'BI', flag: '🇧🇮', currency: 'BIF' },
    { name: 'Cabo Verde', code: 'CV', flag: '🇨🇻', currency: 'CVE' },
    { name: 'Cambodia', code: 'KH', flag: '🇰🇭', currency: 'KHR' },
    { name: 'Cameroon', code: 'CM', flag: '🇨🇲', currency: 'XAF' },
    { name: 'Canada', code: 'CA', flag: '🇨🇦', currency: 'CAD' },
    { name: 'Central African Republic', code: 'CF', flag: '🇨🇫', currency: 'XAF' },
    { name: 'Chad', code: 'TD', flag: '🇹🇩', currency: 'XAF' },
    { name: 'Chile', code: 'CL', flag: '🇨🇱', currency: 'CLP' },
    { name: 'China', code: 'CN', flag: '🇨🇳', currency: 'CNY' },
    { name: 'Colombia', code: 'CO', flag: '🇨🇴', currency: 'COP' },
    { name: 'Comoros', code: 'KM', flag: '🇰🇲', currency: 'KMF' },
    { name: 'Costa Rica', code: 'CR', flag: '🇨🇷', currency: 'CRC' },
    { name: 'Croatia', code: 'HR', flag: '🇭🇷', currency: 'EUR' },
    { name: 'Cuba', code: 'CU', flag: '🇨🇺', currency: 'CUP' },
    { name: 'Cyprus', code: 'CY', flag: '🇨🇾', currency: 'EUR' },
    { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿', currency: 'CZK' },
    { name: 'Denmark', code: 'DK', flag: '🇩🇰', currency: 'DKK' },
    { name: 'Djibouti', code: 'DJ', flag: '🇩🇯', currency: 'DJF' },
    { name: 'Dominican Republic', code: 'DO', flag: '🇩🇴', currency: 'DOP' },
    { name: 'Ecuador', code: 'EC', flag: '🇪🇨', currency: 'USD' },
    { name: 'Egypt', code: 'EG', flag: '🇪🇬', currency: 'EGP' },
    { name: 'El Salvador', code: 'SV', flag: '🇸🇻', currency: 'USD' },
    { name: 'Estonia', code: 'EE', flag: '🇪🇪', currency: 'EUR' },
    { name: 'Ethiopia', code: 'ET', flag: '🇪🇹', currency: 'ETB' },
    { name: 'Fiji', code: 'FJ', flag: '🇫🇯', currency: 'FJD' },
    { name: 'Finland', code: 'FI', flag: '🇫🇮', currency: 'EUR' },
    { name: 'France', code: 'FR', flag: '🇫🇷', currency: 'EUR' },
    { name: 'Gabon', code: 'GA', flag: '🇬🇦', currency: 'XAF' },
    { name: 'Gambia', code: 'GM', flag: '🇬🇲', currency: 'GMD' },
    { name: 'Georgia', code: 'GE', flag: '🇬🇪', currency: 'GEL' },
    { name: 'Germany', code: 'DE', flag: '🇩🇪', currency: 'EUR' },
    { name: 'Ghana', code: 'GH', flag: '🇬🇭', currency: 'GHS' },
    { name: 'Greece', code: 'GR', flag: '🇬🇷', currency: 'EUR' },
    { name: 'Guatemala', code: 'GT', flag: '🇬🇹', currency: 'GTQ' },
    { name: 'Haiti', code: 'HT', flag: '🇭🇹', currency: 'HTG' },
    { name: 'Honduras', code: 'HN', flag: '🇭🇳', currency: 'HNL' },
    { name: 'Hungary', code: 'HU', flag: '🇭🇺', currency: 'HUF' },
    { name: 'Iceland', code: 'IS', flag: '🇮🇸', currency: 'ISK' },
    { name: 'India', code: 'IN', flag: '🇮🇳', currency: 'INR' },
    { name: 'Indonesia', code: 'ID', flag: '🇮🇩', currency: 'IDR' },
    { name: 'Iran', code: 'IR', flag: '🇮🇷', currency: 'IRR' },
    { name: 'Iraq', code: 'IQ', flag: '🇮🇶', currency: 'IQD' },
    { name: 'Ireland', code: 'IE', flag: '🇮🇪', currency: 'EUR' },
    { name: 'Israel', code: 'IL', flag: '🇮🇱', currency: 'ILS' },
    { name: 'Italy', code: 'IT', flag: '🇮🇹', currency: 'EUR' },
    { name: 'Jamaica', code: 'JM', flag: '🇯🇲', currency: 'JMD' },
    { name: 'Japan', code: 'JP', flag: '🇯🇵', currency: 'JPY' },
    { name: 'Jordan', code: 'JO', flag: '🇯🇴', currency: 'JOD' },
    { name: 'Kazakhstan', code: 'KZ', flag: '🇰🇿', currency: 'KZT' },
    { name: 'Kenya', code: 'KE', flag: '🇰🇪', currency: 'KES' },
    { name: 'Kuwait', code: 'KW', flag: '🇰🇼', currency: 'KWD' },
    { name: 'Kyrgyzstan', code: 'KG', flag: '🇰🇬', currency: 'KGS' },
    { name: 'Laos', code: 'LA', flag: '🇱🇦', currency: 'LAK' },
    { name: 'Latvia', code: 'LV', flag: '🇱🇻', currency: 'EUR' },
    { name: 'Lebanon', code: 'LB', flag: '🇱🇧', currency: 'LBP' },
    { name: 'Libya', code: 'LY', flag: '🇱🇾', currency: 'LYD' },
    { name: 'Lithuania', code: 'LT', flag: '🇱🇹', currency: 'EUR' },
    { name: 'Luxembourg', code: 'LU', flag: '🇱🇺', currency: 'EUR' },
    { name: 'Madagascar', code: 'MG', flag: '🇲🇬', currency: 'MGA' },
    { name: 'Malawi', code: 'MW', flag: '🇲🇼', currency: 'MWK' },
    { name: 'Malaysia', code: 'MY', flag: '🇲🇾', currency: 'MYR' },
    { name: 'Maldives', code: 'MV', flag: '🇲🇻', currency: 'MVR' },
    { name: 'Mali', code: 'ML', flag: '🇲🇱', currency: 'XOF' },
    { name: 'Malta', code: 'MT', flag: '🇲🇹', currency: 'EUR' },
    { name: 'Mauritania', code: 'MR', flag: '🇲🇷', currency: 'MRU' },
    { name: 'Mauritius', code: 'MU', flag: '🇲🇺', currency: 'MUR' },
    { name: 'Mexico', code: 'MX', flag: '🇲🇽', currency: 'MXN' },
    { name: 'Moldova', code: 'MD', flag: '🇲🇩', currency: 'MDL' },
    { name: 'Mongolia', code: 'MN', flag: '🇲🇳', currency: 'MNT' },
    { name: 'Montenegro', code: 'ME', flag: '🇲🇪', currency: 'EUR' },
    { name: 'Morocco', code: 'MA', flag: '🇲🇦', currency: 'MAD' },
    { name: 'Mozambique', code: 'MZ', flag: '🇲🇿', currency: 'MZN' },
    { name: 'Myanmar', code: 'MM', flag: '🇲🇲', currency: 'MMK' },
    { name: 'Namibia', code: 'NA', flag: '🇳🇦', currency: 'NAD' },
    { name: 'Nepal', code: 'NP', flag: '🇳🇵', currency: 'NPR' },
    { name: 'Netherlands', code: 'NL', flag: '🇳🇱', currency: 'EUR' },
    { name: 'New Zealand', code: 'NZ', flag: '🇳🇿', currency: 'NZD' },
    { name: 'Nicaragua', code: 'NI', flag: '🇳🇮', currency: 'NIO' },
    { name: 'Nigeria', code: 'NG', flag: '🇳🇬', currency: 'NGN' },
    { name: 'Norway', code: 'NO', flag: '🇳🇴', currency: 'NOK' },
    { name: 'Oman', code: 'OM', flag: '🇴🇲', currency: 'OMR' },
    { name: 'Pakistan', code: 'PK', flag: '🇵🇰', currency: 'PKR' },
    { name: 'Panama', code: 'PA', flag: '🇵🇦', currency: 'PAB' },
    { name: 'Paraguay', code: 'PY', flag: '🇵🇾', currency: 'PYG' },
    { name: 'Peru', code: 'PE', flag: '🇵🇪', currency: 'PEN' },
    { name: 'Philippines', code: 'PH', flag: '🇵🇭', currency: 'PHP' },
    { name: 'Poland', code: 'PL', flag: '🇵🇱', currency: 'PLN' },
    { name: 'Portugal', code: 'PT', flag: '🇵🇹', currency: 'EUR' },
    { name: 'Qatar', code: 'QA', flag: '🇶🇦', currency: 'QAR' },
    { name: 'Romania', code: 'RO', flag: '🇷🇴', currency: 'RON' },
    { name: 'Russia', code: 'RU', flag: '🇷🇺', currency: 'RUB' },
    { name: 'Rwanda', code: 'RW', flag: '🇷🇼', currency: 'RWF' },
    { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦', currency: 'SAR' },
    { name: 'Senegal', code: 'SN', flag: '🇸🇳', currency: 'XOF' },
    { name: 'Serbia', code: 'RS', flag: '🇷🇸', currency: 'RSD' },
    { name: 'Singapore', code: 'SG', flag: '🇸🇬', currency: 'SGD' },
    { name: 'Slovakia', code: 'SK', flag: '🇸🇰', currency: 'EUR' },
    { name: 'Slovenia', code: 'SI', flag: '🇸🇮', currency: 'EUR' },
    { name: 'Somalia', code: 'SO', flag: '🇸🇴', currency: 'SOS' },
    { name: 'South Africa', code: 'ZA', flag: '🇿🇦', currency: 'ZAR' },
    { name: 'South Korea', code: 'KR', flag: '🇰🇷', currency: 'KRW' },
    { name: 'Spain', code: 'ES', flag: '🇪🇸', currency: 'EUR' },
    { name: 'Sri Lanka', code: 'LK', flag: '🇱🇰', currency: 'LKR' },
    { name: 'Sudan', code: 'SD', flag: '🇸🇩', currency: 'SDG' },
    { name: 'Sweden', code: 'SE', flag: '🇸🇪', currency: 'SEK' },
    { name: 'Switzerland', code: 'CH', flag: '🇨🇭', currency: 'CHF' },
    { name: 'Syria', code: 'SY', flag: '🇸🇾', currency: 'SYP' },
    { name: 'Taiwan', code: 'TW', flag: '🇹🇼', currency: 'TWD' },
    { name: 'Tajikistan', code: 'TJ', flag: '🇹🇯', currency: 'TJS' },
    { name: 'Tanzania', code: 'TZ', flag: '🇹🇿', currency: 'TZS' },
    { name: 'Thailand', code: 'TH', flag: '🇹🇭', currency: 'THB' },
    { name: 'Togo', code: 'TG', flag: '🇹🇬', currency: 'XOF' },
    { name: 'Trinidad and Tobago', code: 'TT', flag: '🇹🇹', currency: 'TTD' },
    { name: 'Tunisia', code: 'TN', flag: '🇹🇳', currency: 'TND' },
    { name: 'Turkey', code: 'TR', flag: '🇹🇷', currency: 'TRY' },
    { name: 'Uganda', code: 'UG', flag: '🇺🇬', currency: 'UGX' },
    { name: 'Ukraine', code: 'UA', flag: '🇺🇦', currency: 'UAH' },
    { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', currency: 'AED' },
    { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', currency: 'GBP' },
    { name: 'United States', code: 'US', flag: '🇺🇸', currency: 'USD' },
    { name: 'Uruguay', code: 'UY', flag: '🇺🇾', currency: 'UYU' },
    { name: 'Uzbekistan', code: 'UZ', flag: '🇺🇿', currency: 'UZS' },
    { name: 'Venezuela', code: 'VE', flag: '🇻🇪', currency: 'VES' },
    { name: 'Vietnam', code: 'VN', flag: '🇻🇳', currency: 'VND' },
    { name: 'Yemen', code: 'YE', flag: '🇾🇪', currency: 'YER' },
    { name: 'Zambia', code: 'ZM', flag: '🇿🇲', currency: 'ZMW' },
    { name: 'Zimbabwe', code: 'ZW', flag: '🇿🇼', currency: 'USD' },
    { name: 'International (USD)', code: 'INT', flag: '🌐', currency: 'USD' },
];

// ─── Country Dropdown Component ───────────────────────────────────────────────
function CountryDropdown({
    value,
    onChange,
}: {
    value: string;
    onChange: (code: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selected = ALL_COUNTRIES.find(c => c.code === value) ?? ALL_COUNTRIES.find(c => c.code === 'IN')!;

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return q
            ? ALL_COUNTRIES.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                c.currency.toLowerCase().includes(q)
            )
            : ALL_COUNTRIES;
    }, [search]);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 bg-slate-900 border border-slate-700 hover:border-indigo-500 rounded-xl px-4 py-3 text-left transition-colors group"
            >
                <span className="text-2xl leading-none shrink-0">{selected.flag}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{selected.name}</p>
                    <p className="text-slate-500 text-xs">{selected.currency} · {selected.code}</p>
                </div>
                <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 top-full mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-slate-800">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search country, code, or currency…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                            />
                        </div>
                    </div>
                    {/* List */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
                        {filtered.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-sm">No countries found</div>
                        ) : (
                            filtered.map(c => (
                                <button
                                    key={c.code + c.name}
                                    type="button"
                                    onClick={() => { onChange(c.code); setOpen(false); setSearch(''); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left ${c.code === value ? 'bg-indigo-500/10' : ''}`}
                                >
                                    <span className="text-xl leading-none shrink-0">{c.flag}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white text-sm">{c.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-slate-500 font-mono">{c.currency}</span>
                                        <span className="text-xs text-slate-600 font-mono">{c.code}</span>
                                        {c.code === value && <CheckCircle size={12} className="text-indigo-400" />}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepositSettingsPage() {
    const [config, setConfig] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        getSystemConfig()
            .then(res => { if (res.success && res.data) setConfig(res.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const set = (key: string, value: string) =>
        setConfig((p: any) => ({ ...p, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateSystemConfig({
                UPI_GATEWAY_ORDER: config.UPI_GATEWAY_ORDER || 'UPI1,UPI2',
                UPI1_ENABLED: config.UPI1_ENABLED ?? 'true',
                UPI2_ENABLED: config.UPI2_ENABLED ?? 'true',
                // Gateway display names & taglines
                UPI1_NAME: config.UPI1_NAME || 'UPI Gateway 1',
                UPI1_TAGLINE: config.UPI1_TAGLINE || 'NekPay · Instant',
                UPI2_NAME: config.UPI2_NAME || 'UPI Gateway 2',
                UPI2_TAGLINE: config.UPI2_TAGLINE || 'UPI / Bank · Fast',
                MIN_DEPOSIT: config.MIN_DEPOSIT || '100',
                MIN_DEPOSIT_UPI2: config.MIN_DEPOSIT_UPI2 || '200',
                MIN_DEPOSIT_CRYPTO: config.MIN_DEPOSIT_CRYPTO || '10',
                MAX_DEPOSIT: config.MAX_DEPOSIT || '',
                MIN_WITHDRAWAL: config.MIN_WITHDRAWAL || '500',
                MIN_WITHDRAWAL_CRYPTO: config.MIN_WITHDRAWAL_CRYPTO || '10',
                MAX_WITHDRAWAL: config.MAX_WITHDRAWAL || '',
                AUTO_WITHDRAW_FIAT_LIMIT: config.AUTO_WITHDRAW_FIAT_LIMIT || '1000',
            });
            if (res.success) showToast('Settings saved successfully!', 'success');
            else showToast('Failed to save settings', 'error');
        } catch {
            showToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-indigo-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/40 text-emerald-300' : 'bg-red-900/80 border-red-500/40 text-red-300'}`}>
                    <CheckCircle size={16} />
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Wallet size={20} className="text-indigo-400" />
                        </span>
                        Deposit & Withdrawal Settings
                    </h1>
                    <p className="text-slate-400 mt-1 ml-[52px]">
                        Configure payment gateways and transaction limits.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save All Settings</>}
                </button>
            </div>

            {/* ── SECTION 1: Payment Gateways ── */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                    <RefreshCw size={18} className="text-emerald-400" />
                    <div>
                        <h2 className="text-white font-bold">Payment Gateways</h2>
                        <p className="text-slate-500 text-xs mt-0.5">
                            UPI gateways for 🇮🇳 India users · Crypto available globally
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Gateway info banner */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-400 font-medium">
                        <CheckCircle size={13} />
                        Enable/disable UPI gateways, set names, taglines, and drag to reorder how they appear to users.
                    </div>

                    {/* Ordered gateway cards */}
                    {(() => {
                        const GW_META: Record<string, { key: string; nameKey: string; tagKey: string; defaultName: string; defaultTag: string; accentEnabled: string; accentBadge: string }> = {
                            UPI1: { key: 'UPI1_ENABLED', nameKey: 'UPI1_NAME', tagKey: 'UPI1_TAGLINE', defaultName: 'UPI Gateway 1', defaultTag: 'NekPay · Instant', accentEnabled: 'border-emerald-500/40 bg-emerald-500/5', accentBadge: 'bg-emerald-500/15 text-emerald-400' },
                            UPI2: { key: 'UPI2_ENABLED', nameKey: 'UPI2_NAME', tagKey: 'UPI2_TAGLINE', defaultName: 'UPI Gateway 2', defaultTag: 'UPI / Bank · Fast', accentEnabled: 'border-blue-500/40 bg-blue-500/5', accentBadge: 'bg-blue-500/15 text-blue-400' },
                        };
                        const orderStr: string = config.UPI_GATEWAY_ORDER || 'UPI1,UPI2';
                        const order: string[] = orderStr.split(',').map((s: string) => s.trim()).filter((s: string) => s in GW_META);
                        // Ensure both IDs present (in case config is partial)
                        ['UPI1', 'UPI2'].forEach(id => { if (!order.includes(id)) order.push(id); });

                        const moveUp = (idx: number) => {
                            if (idx === 0) return;
                            const next = [...order];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            set('UPI_GATEWAY_ORDER', next.join(','));
                        };
                        const moveDown = (idx: number) => {
                            if (idx === order.length - 1) return;
                            const next = [...order];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            set('UPI_GATEWAY_ORDER', next.join(','));
                        };

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {order.map((id, idx) => {
                                    const { key, nameKey, tagKey, defaultName, defaultTag, accentEnabled, accentBadge } = GW_META[id];
                                    const enabled = config[key] !== 'false';
                                    return (
                                        <div key={id} className={`rounded-xl border p-4 space-y-3 transition-all ${enabled ? accentEnabled : 'border-slate-700 opacity-60'}`}>
                                            {/* Order controls + position badge */}
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mr-auto">#{idx + 1} shown</span>
                                                <button
                                                    type="button"
                                                    onClick={() => moveUp(idx)}
                                                    disabled={idx === 0}
                                                    className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                                    title="Move up"
                                                >
                                                    <ChevronUp size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveDown(idx)}
                                                    disabled={idx === order.length - 1}
                                                    className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                                    title="Move down"
                                                >
                                                    <ChevronDown size={13} />
                                                </button>
                                            </div>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0 mr-3">
                                                    {/* Editable Name */}
                                                    <input
                                                        type="text"
                                                        value={config[nameKey] || ''}
                                                        onChange={e => set(nameKey, e.target.value)}
                                                        placeholder={defaultName}
                                                        className="w-full bg-transparent border-b border-slate-600 focus:border-indigo-400 outline-none text-sm font-bold text-white pb-0.5 placeholder:text-slate-500 transition-colors"
                                                    />
                                                    {/* Editable Tagline */}
                                                    <input
                                                        type="text"
                                                        value={config[tagKey] || ''}
                                                        onChange={e => set(tagKey, e.target.value)}
                                                        placeholder={defaultTag}
                                                        className="w-full bg-transparent border-b border-slate-700 focus:border-indigo-400/60 outline-none text-[11px] text-slate-500 mt-1 pb-0.5 placeholder:text-slate-600 transition-colors"
                                                    />
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={enabled}
                                                        onChange={e => set(key, e.target.checked ? 'true' : 'false')}
                                                    />
                                                    <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${enabled ? accentBadge : 'bg-slate-700 text-slate-500'}`}>
                                                    {enabled ? '● ACTIVE' : '○ DISABLED'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Crypto — always on */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-white">Crypto Gateway</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">NowPayments · Always available for all users worldwide</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/15 text-amber-400">● ALWAYS ON</span>
                    </div>

                </div>
            </div>


            {/* ── SECTION 3: Deposit Limits ── */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                    <ArrowDownRight size={18} className="text-emerald-400" />
                    <div>
                        <h2 className="text-white font-bold">Deposit Limits</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Minimum and maximum deposit amounts per gateway</p>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { key: 'MIN_DEPOSIT', label: 'Min Deposit', sub: 'UPI Gateway 1 (INR)', placeholder: '100', color: 'emerald' },
                            { key: 'MIN_DEPOSIT_UPI2', label: 'Min Deposit', sub: 'UPI Gateway 2 (INR)', placeholder: '200', color: 'blue' },
                            { key: 'MIN_DEPOSIT_CRYPTO', label: 'Min Deposit', sub: 'Crypto (USD)', placeholder: '10', color: 'amber' },
                        ].map(({ key, label, sub, placeholder, color }) => (
                            <div key={key} className={`bg-slate-900 border border-slate-700 rounded-xl p-4 hover:border-${color}-500/40 transition-colors`}>
                                <label className="block text-xs font-bold text-slate-400 mb-0.5">{label}</label>
                                <p className={`text-[10px] text-${color}-400/70 mb-2`}>{sub}</p>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold pointer-events-none">
                                        {key.includes('CRYPTO') ? '$' : '₹'}
                                    </span>
                                    <input
                                        type="number"
                                        value={config[key] || ''}
                                        onChange={e => set(key, e.target.value)}
                                        placeholder={placeholder}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-white text-sm font-mono focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                            <label className="block text-xs font-bold text-slate-400 mb-0.5">Max Deposit</label>
                            <p className="text-[10px] text-slate-500 mb-2">All gateways — 0 or blank = unlimited</p>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold pointer-events-none">₹</span>
                                <input
                                    type="number"
                                    value={config.MAX_DEPOSIT || ''}
                                    onChange={e => set('MAX_DEPOSIT', e.target.value)}
                                    placeholder="0 = Unlimited"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-white text-sm font-mono focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SECTION 4: Withdrawal Limits ── */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
                    <ArrowUpRight size={18} className="text-red-400" />
                    <div>
                        <h2 className="text-white font-bold">Withdrawal Limits</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Global withdrawal constraints and auto-dispatch thresholds</p>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { key: 'MIN_WITHDRAWAL', label: 'Min Withdrawal', sub: 'Fiat / INR', placeholder: '500', prefix: '₹' },
                            { key: 'MIN_WITHDRAWAL_CRYPTO', label: 'Min Withdrawal', sub: 'Crypto (USD)', placeholder: '10', prefix: '$' },
                            { key: 'MAX_WITHDRAWAL', label: 'Max Withdrawal', sub: 'INR — 0 = Unlimited', placeholder: '0', prefix: '₹' },
                            { key: 'AUTO_WITHDRAW_FIAT_LIMIT', label: 'Auto-Dispatch Limit', sub: 'INR — above this → admin review', placeholder: '1000', prefix: '₹' },
                        ].map(({ key, label, sub, placeholder, prefix }) => (
                            <div key={key} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                                <label className="block text-xs font-bold text-slate-400 mb-0.5">{label}</label>
                                <p className="text-[10px] text-slate-500 mb-2">{sub}</p>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold pointer-events-none">{prefix}</span>
                                    <input
                                        type="number"
                                        value={config[key] || ''}
                                        onChange={e => set(key, e.target.value)}
                                        placeholder={placeholder}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-white text-sm font-mono focus:border-indigo-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Info banner */}
            <div className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-400">
                <Shield size={16} className="shrink-0 text-indigo-400" />
                <p>Changes are applied live. The Deposit and Withdraw modals on the website will reflect the new defaults within 60 seconds (or immediately on a fresh modal open).</p>
            </div>

            {/* Bottom save */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20 text-sm"
                >
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save All Settings</>}
                </button>
            </div>
        </div>
    );
}
