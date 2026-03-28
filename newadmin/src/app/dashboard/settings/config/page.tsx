"use client";

import React, { useEffect, useState } from 'react';
import { getSystemConfig, updateSystemConfig } from '@/actions/settings';
import { Save, Settings, AlertTriangle, BarChart2, Code, Mail, Send, Eye, EyeOff } from 'lucide-react';

export default function SystemConfigPage() {
    const [config, setConfig] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [testEmailTo, setTestEmailTo] = useState('');
    const [testingEmail, setTestingEmail] = useState(false);
    const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
    const [smtpConfig, setSmtpConfig] = useState({
        host: '', port: '587', user: '', password: '', fromName: '', fromEmail: '', secure: 'false',
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await getSystemConfig();
            if (res.success && res.data) {
                setConfig(res.data);
                // Load SMTP from SMTP_SETTINGS key if present
                if (res.data.SMTP_SETTINGS) {
                    try {
                        const parsed = JSON.parse(res.data.SMTP_SETTINGS);
                        setSmtpConfig(prev => ({ ...prev, ...parsed }));
                    } catch { }
                }
            }
        } catch (error) {
            console.error("Failed to fetch config", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateSystemConfig(config);
            if (res.success) {
                alert("Configuration saved successfully");
            } else {
                alert("Failed to save configuration");
            }
        } catch (error) {
            console.error("Failed to save config", error);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSmtpChange = (key: string, value: string) => {
        setSmtpConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveSmtp = async () => {
        setSaving(true);
        try {
            const res = await updateSystemConfig({ SMTP_SETTINGS: JSON.stringify(smtpConfig) });
            if (res.success) {
                alert('SMTP settings saved successfully!');
            } else {
                alert('Failed to save SMTP settings.');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmailTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailTo)) {
            setTestEmailResult({ success: false, message: 'Enter a valid email address.' });
            return;
        }
        setTestingEmail(true);
        setTestEmailResult(null);
        try {
            const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/auth/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: testEmailTo }),
            });
            const data = await res.json();
            setTestEmailResult({ success: data.success, message: data.message });
        } catch {
            setTestEmailResult({ success: false, message: 'Request failed. Check console.' });
        } finally {
            setTestingEmail(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading configuration...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">System Configuration</h1>
                    <p className="text-slate-400 mt-1">Manage global system settings and feature flags.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : <><Save size={20} /> Save Changes</>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Settings */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings size={20} className="text-indigo-400" />
                        General Settings
                    </h2>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Platform Name</label>
                        <input
                            type="text"
                            value={config.PLATFORM_NAME || ''}
                            onChange={e => handleChange('PLATFORM_NAME', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                            placeholder="100xWins"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Support Email</label>
                        <input
                            type="email"
                            value={config.SUPPORT_EMAIL || ''}
                            onChange={e => handleChange('SUPPORT_EMAIL', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Maintenance Mode</label>
                        <select
                            value={config.MAINTENANCE_MODE || 'false'}
                            onChange={e => handleChange('MAINTENANCE_MODE', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                        >
                            <option value="false">Disabled (Site Live)</option>
                            <option value="true">Enabled (Site Offline)</option>
                        </select>
                    </div>
                </div>

                {/* Financial Settings */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle size={20} className="text-yellow-400" />
                        Financial Limits
                    </h2>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Min Deposit <span className="text-slate-600 text-xs">(UPI Gateway 1)</span></label>
                        <input
                            type="number"
                            value={config.MIN_DEPOSIT || ''}
                            onChange={e => handleChange('MIN_DEPOSIT', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                            placeholder="e.g. 100"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Min Deposit <span className="text-slate-600 text-xs">(UPI Gateway 2)</span></label>
                        <input
                            type="number"
                            value={config.MIN_DEPOSIT_UPI2 || ''}
                            onChange={e => handleChange('MIN_DEPOSIT_UPI2', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                            placeholder="e.g. 200"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Min Deposit <span className="text-slate-600 text-xs">(Crypto, USD)</span></label>
                        <input
                            type="number"
                            value={config.MIN_DEPOSIT_CRYPTO || ''}
                            onChange={e => handleChange('MIN_DEPOSIT_CRYPTO', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                            placeholder="e.g. 10"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Min Withdrawal</label>
                        <input
                            type="number"
                            value={config.MIN_WITHDRAWAL || ''}
                            onChange={e => handleChange('MIN_WITHDRAWAL', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                            placeholder="e.g. 500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Auto-Withdrawal Limit <span className="text-slate-600 text-xs">(Fiat, INR — above this needs admin dispatch)</span>
                        </label>
                        <input
                            type="number"
                            value={config.AUTO_WITHDRAW_FIAT_LIMIT || ''}
                            onChange={e => handleChange('AUTO_WITHDRAW_FIAT_LIMIT', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                            placeholder="e.g. 1000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Max Withdrawal</label>
                        <input
                            type="number"
                            value={config.MAX_WITHDRAWAL || ''}
                            onChange={e => handleChange('MAX_WITHDRAWAL', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Default Currency</label>
                        <input
                            type="text"
                            value={config.DEFAULT_CURRENCY || 'INR'}
                            onChange={e => handleChange('DEFAULT_CURRENCY', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-indigo-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* ── UPI Gateway Control ─────────────────────────────────────── */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings size={20} className="text-emerald-400" />
                    UPI Gateway Control
                    <span className="ml-auto text-[11px] font-normal text-slate-500">Changes live-apply to deposit modal</span>
                </h2>

                {/* Gateway cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* UPI 1 */}
                    <div className={`rounded-xl border p-4 space-y-3 transition-all ${config.UPI1_ENABLED === 'false' ? 'border-slate-700 opacity-60' : 'border-emerald-500/30 bg-emerald-500/4'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-white">UPI Gateway 1</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">NekPay — api.nekpayment.com</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.UPI1_ENABLED !== 'false'}
                                    onChange={e => handleChange('UPI1_ENABLED', e.target.checked ? 'true' : 'false')}
                                />
                                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${config.UPI1_ENABLED !== 'false' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                {config.UPI1_ENABLED !== 'false' ? '● ACTIVE' : '○ DISABLED'}
                            </span>
                            {config.DEFAULT_UPI_GATEWAY === 'UPI1' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-500/15 text-orange-400">★ DEFAULT</span>
                            )}
                        </div>
                    </div>

                    {/* UPI 2 */}
                    <div className={`rounded-xl border p-4 space-y-3 transition-all ${config.UPI2_ENABLED === 'false' ? 'border-slate-700 opacity-60' : 'border-emerald-500/30 bg-emerald-500/4'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-white">UPI Gateway 2</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">apiwht.wiki — /api/payIn</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.UPI2_ENABLED !== 'false'}
                                    onChange={e => handleChange('UPI2_ENABLED', e.target.checked ? 'true' : 'false')}
                                />
                                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${config.UPI2_ENABLED !== 'false' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                {config.UPI2_ENABLED !== 'false' ? '● ACTIVE' : '○ DISABLED'}
                            </span>
                            {config.DEFAULT_UPI_GATEWAY === 'UPI2' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-500/15 text-orange-400">★ DEFAULT</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Default gateway selector */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">
                        Default Gateway <span className="text-slate-600 text-xs">(pre-selected in Deposit Modal)</span>
                    </label>
                    <div className="flex gap-3">
                        {(['UPI1', 'UPI2'] as const).map(gw => (
                            <button
                                key={gw}
                                onClick={() => handleChange('DEFAULT_UPI_GATEWAY', gw)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${config.DEFAULT_UPI_GATEWAY === gw
                                    ? 'border-orange-500/60 bg-orange-500/10 text-orange-400'
                                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white'
                                    }`}
                            >
                                {gw === 'UPI1' ? '★ UPI Gateway 1' : '★ UPI Gateway 2'}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                        If both gateways are enabled the default will be pre-selected. Users can still switch manually.
                    </p>
                </div>
            </div>

            {/* ── Manual Payment Gateway ──────────────────────────────────── */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-xl">💳</span>
                            Manual Payment Gateway
                        </h2>
                        <p className="text-[12px] text-slate-500 mt-1">
                            Fallback option shown to users when the UPI gateway fails. Users can pay via UPI scan and submit their UTR for admin approval.
                        </p>
                    </div>
                    {/* Enable/disable toggle */}
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.MANUAL_PAYMENT_ENABLED !== 'false'}
                            onChange={e => handleChange('MANUAL_PAYMENT_ENABLED', e.target.checked ? 'true' : 'false')}
                        />
                        <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500" />
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left: fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                UPI ID / VPA
                                <span className="ml-1.5 text-slate-600 text-xs font-normal">e.g. payments@yourbank</span>
                            </label>
                            <input
                                type="text"
                                value={config.MANUAL_UPI_ID || ''}
                                onChange={e => handleChange('MANUAL_UPI_ID', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white font-mono text-sm focus:border-orange-500 outline-none placeholder-slate-600"
                                placeholder="yourname@upi"
                            />
                            <p className="text-[10px] text-slate-600 mt-1">
                                This UPI ID is shown as a scannable QR code in the deposit modal.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                QR Image URL
                                <span className="ml-1.5 text-slate-600 text-xs font-normal">optional override</span>
                            </label>
                            <input
                                type="url"
                                value={config.MANUAL_QR_URL || ''}
                                onChange={e => handleChange('MANUAL_QR_URL', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white text-sm focus:border-orange-500 outline-none placeholder-slate-600"
                                placeholder="https://example.com/qr.png"
                            />
                            <p className="text-[10px] text-slate-600 mt-1">
                                If provided, this image is shown instead of the auto-generated QR. Leave blank to auto-generate from UPI ID.
                            </p>
                        </div>

                        <div className={`rounded-lg p-3 border text-xs ${config.MANUAL_PAYMENT_ENABLED !== 'false' ? 'bg-orange-500/8 border-orange-500/25 text-orange-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                            {config.MANUAL_PAYMENT_ENABLED !== 'false' ? (
                                <>✅ <strong>Active</strong> — shown to users as a fallback after a failed deposit.</>
                            ) : (
                                <>⭕ <strong>Disabled</strong> — manual payment fallback is hidden from users.</>
                            )}
                        </div>
                    </div>

                    {/* Right: live QR preview */}
                    <div className="flex flex-col items-center justify-center gap-3 bg-slate-900 rounded-xl border border-slate-700 p-5">
                        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest">QR Preview</p>
                        {config.MANUAL_QR_URL ? (
                            <img
                                src={config.MANUAL_QR_URL}
                                alt="QR Preview"
                                className="w-36 h-36 object-contain rounded-lg bg-white p-1"
                                onError={(e: any) => { e.target.style.display = 'none'; }}
                            />
                        ) : config.MANUAL_UPI_ID ? (
                            <div className="p-3 bg-white rounded-xl">
                                {/* Static preview — actual QR is rendered on the user-facing deposit modal */}
                                <div className="w-32 h-32 bg-slate-100 rounded flex items-center justify-center text-center text-xs text-slate-500 leading-relaxed px-2">
                                    QR will be<br />auto-generated<br />from UPI ID<br /><strong className="text-slate-700 font-mono text-[10px] break-all">{config.MANUAL_UPI_ID}</strong>
                                </div>
                            </div>
                        ) : (
                            <div className="w-36 h-36 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-center text-xs text-slate-600 px-3 leading-relaxed">
                                Set a UPI ID to see QR preview
                            </div>
                        )}
                        <p className="text-[10px] text-slate-600 text-center">
                            Support contacts (WhatsApp / Telegram) are pulled from the Contact Settings page.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Tracking & Analytics ─────────────────────────────────── */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                        <BarChart2 size={20} className="text-pink-400" />
                        Tracking &amp; Analytics
                    </h2>
                    <p className="text-[12px] text-slate-500">Paste measurement IDs or raw script tags. Code is injected into the website <code className="text-pink-400 bg-slate-900 px-1 rounded">&lt;head&gt;</code> on every page load.</p>
                </div>

                {/* Pixel ID helpers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Google Analytics 4 ID
                            <span className="ml-1.5 text-slate-600 text-xs font-normal">e.g. G-XXXXXXXXXX</span>
                        </label>
                        <input
                            type="text"
                            value={config.GA4_MEASUREMENT_ID || ''}
                            onChange={e => handleChange('GA4_MEASUREMENT_ID', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white font-mono text-sm focus:border-pink-500 outline-none placeholder-slate-600"
                            placeholder="G-XXXXXXXXXX"
                        />
                        <p className="text-[10px] text-slate-600 mt-1">Auto-injects the gtag.js snippet.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            Meta (Facebook) Pixel ID
                            <span className="ml-1.5 text-slate-600 text-xs font-normal">numeric ID</span>
                        </label>
                        <input
                            type="text"
                            value={config.META_PIXEL_ID || ''}
                            onChange={e => handleChange('META_PIXEL_ID', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white font-mono text-sm focus:border-pink-500 outline-none placeholder-slate-600"
                            placeholder="123456789012345"
                        />
                        <p className="text-[10px] text-slate-600 mt-1">Auto-injects the fbq base code.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            TikTok Pixel ID
                            <span className="ml-1.5 text-slate-600 text-xs font-normal">alphanumeric</span>
                        </label>
                        <input
                            type="text"
                            value={config.TIKTOK_PIXEL_ID || ''}
                            onChange={e => handleChange('TIKTOK_PIXEL_ID', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white font-mono text-sm focus:border-pink-500 outline-none placeholder-slate-600"
                            placeholder="C6XXXXXXXXXXXXXXXX"
                        />
                        <p className="text-[10px] text-slate-600 mt-1">Auto-injects TikTok base pixel.</p>
                    </div>
                </div>

                {/* Raw script blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                            <Code size={13} className="text-slate-500" />
                            Custom &lt;head&gt; Scripts
                        </label>
                        <textarea
                            rows={6}
                            value={config.CUSTOM_HEAD_SCRIPTS || ''}
                            onChange={e => handleChange('CUSTOM_HEAD_SCRIPTS', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white font-mono text-xs focus:border-pink-500 outline-none resize-y placeholder-slate-600"
                            placeholder={'<!-- Paste any <script>, <link>, or <meta> tags here -->\n<script>...</script>'}
                            spellCheck={false}
                        />
                        <p className="text-[10px] text-slate-600 mt-1">Injected verbatim inside <code>&lt;head&gt;</code>. Supports any HTML.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                            <Code size={13} className="text-slate-500" />
                            Custom &lt;body&gt; Scripts
                        </label>
                        <textarea
                            rows={6}
                            value={config.CUSTOM_BODY_SCRIPTS || ''}
                            onChange={e => handleChange('CUSTOM_BODY_SCRIPTS', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white font-mono text-xs focus:border-pink-500 outline-none resize-y placeholder-slate-600"
                            placeholder={'<!-- Paste <noscript> tags or body-end scripts here -->\n<noscript>...</noscript>'}
                            spellCheck={false}
                        />
                        <p className="text-[10px] text-slate-600 mt-1">Injected at start of <code>&lt;body&gt;</code>. Ideal for noscript fallback tags.</p>
                    </div>
                </div>
            </div>

            {/* ── SMTP Email Settings ─────────────────────────────────────────── */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                        <Mail size={20} className="text-blue-400" />
                        SMTP Email Settings
                        <span className="ml-auto text-[11px] font-normal text-slate-500">Used for forgot password &amp; notifications</span>
                    </h2>
                    <p className="text-[12px] text-slate-500">Configure your outgoing mail server. Gmail, SendGrid, Mailgun, Zoho — any SMTP provider works.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            SMTP Host
                            <span className="ml-1.5 text-slate-600 text-xs font-normal">e.g. smtp.gmail.com</span>
                        </label>
                        <input
                            type="text"
                            value={smtpConfig.host}
                            onChange={e => handleSmtpChange('host', e.target.value)}
                            placeholder="smtp.gmail.com"
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-blue-500 outline-none placeholder-slate-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">
                            SMTP Port
                            <span className="ml-1.5 text-slate-600 text-xs font-normal">587 (TLS) or 465 (SSL)</span>
                        </label>
                        <input
                            type="number"
                            value={smtpConfig.port}
                            onChange={e => handleSmtpChange('port', e.target.value)}
                            placeholder="587"
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">SMTP Username / Email</label>
                        <input
                            type="email"
                            value={smtpConfig.user}
                            onChange={e => handleSmtpChange('user', e.target.value)}
                            placeholder="noreply@yourdomain.com"
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-blue-500 outline-none placeholder-slate-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">SMTP Password / App Password</label>
                        <div className="relative">
                            <input
                                type={showSmtpPassword ? 'text' : 'password'}
                                value={smtpConfig.password}
                                onChange={e => handleSmtpChange('password', e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 pr-10 text-white focus:border-blue-500 outline-none placeholder-slate-600"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                            >
                                {showSmtpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">From Name</label>
                        <input
                            type="text"
                            value={smtpConfig.fromName}
                            onChange={e => handleSmtpChange('fromName', e.target.value)}
                            placeholder="ZeeroWin Support"
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-blue-500 outline-none placeholder-slate-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">From Email</label>
                        <input
                            type="email"
                            value={smtpConfig.fromEmail}
                            onChange={e => handleSmtpChange('fromEmail', e.target.value)}
                            placeholder="noreply@zeerowin.com"
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:border-blue-500 outline-none placeholder-slate-600"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-400">Use SSL (port 465)</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={smtpConfig.secure === 'true'}
                            onChange={e => handleSmtpChange('secure', e.target.checked ? 'true' : 'false')}
                        />
                        <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500" />
                    </label>
                    <span className="text-[11px] text-slate-500">{smtpConfig.secure === 'true' ? 'SSL enabled (port 465)' : 'STARTTLS (port 587)'}</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-700">
                    <button
                        onClick={handleSaveSmtp}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                    >
                        <Save size={16} />{saving ? 'Saving...' : 'Save SMTP Settings'}
                    </button>

                    <div className="flex gap-2 flex-1">
                        <input
                            type="email"
                            value={testEmailTo}
                            onChange={e => setTestEmailTo(e.target.value)}
                            placeholder="test@example.com"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none placeholder-slate-600"
                        />
                        <button
                            onClick={handleTestEmail}
                            disabled={testingEmail}
                            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                        >
                            <Send size={14} />{testingEmail ? 'Sending...' : 'Test Email'}
                        </button>
                    </div>
                </div>

                {testEmailResult && (
                    <div className={`text-sm px-4 py-3 rounded-lg border ${testEmailResult.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {testEmailResult.success ? '✅' : '❌'} {testEmailResult.message}
                    </div>
                )}
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg text-sm text-slate-400 flex items-center gap-3">
                <AlertTriangle size={18} />
                <p>Changes to system configuration may take up to 60 seconds to propagate across all services.</p>
            </div>
        </div>
    );
}
