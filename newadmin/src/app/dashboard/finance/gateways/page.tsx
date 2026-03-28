"use client";

import React, { useEffect, useState } from 'react';
import { financeService, PaymentMethod } from '../../../../services/finance.service';
import { Plus, Edit2, Trash2, Power, PowerOff, Save, X } from 'lucide-react';

export default function PaymentMethodsPage() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<PaymentMethod>>({
        name: '',
        type: 'DEPOSIT',
        minAmount: 0,
        maxAmount: 0,
        fee: 0,
        feeType: 'PERCENTAGE',
        isActive: true,
        details: {}
    });

    const fetchMethods = async () => {
        setLoading(true);
        try {
            const data = await financeService.getPaymentMethods();
            setMethods(data);
        } catch (error) {
            console.error("Failed to fetch methods", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMethods();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await financeService.updatePaymentMethod(editingId, formData);
            } else {
                await financeService.createPaymentMethod(formData);
            }
            setShowForm(false);
            setEditingId(null);
            fetchMethods();
        } catch (error) {
            console.error("Failed to save method", error);
            alert("Failed to save method");
        }
    };

    const handleEdit = (method: PaymentMethod) => {
        setFormData(method);
        setEditingId(method.id);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this method?")) return;
        try {
            await financeService.deletePaymentMethod(id);
            fetchMethods();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const toggleActive = async (method: PaymentMethod) => {
        try {
            await financeService.updatePaymentMethod(method.id, { isActive: !method.isActive });
            fetchMethods();
        } catch (error) {
            console.error("Failed to toggle status", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Payment Gateways</h1>
                    <p className="text-slate-400 mt-1">Configure deposit and withdrawal methods.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({
                            name: '',
                            type: 'DEPOSIT',
                            minAmount: 0,
                            maxAmount: 0,
                            fee: 0,
                            feeType: 'PERCENTAGE',
                            isActive: true,
                            details: {}
                        });
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    Add Method
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-white">{editingId ? 'Edit Method' : 'Add New Method'}</h3>
                        <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Method Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Type</label>
                            <select
                                value={formData.type}
                                // @ts-ignore
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                            >
                                <option value="DEPOSIT">Deposit</option>
                                <option value="WITHDRAWAL">Withdrawal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Min Amount</label>
                            <input
                                type="number"
                                value={formData.minAmount}
                                onChange={e => setFormData({ ...formData, minAmount: parseFloat(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Max Amount</label>
                            <input
                                type="number"
                                value={formData.maxAmount}
                                onChange={e => setFormData({ ...formData, maxAmount: parseFloat(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Fee</label>
                            <input
                                type="number"
                                value={formData.fee}
                                onChange={e => setFormData({ ...formData, fee: parseFloat(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Fee Type</label>
                            <select
                                value={formData.feeType}
                                // @ts-ignore
                                onChange={e => setFormData({ ...formData, feeType: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                            >
                                <option value="PERCENTAGE">Percentage</option>
                                <option value="FIXED">Fixed Amount</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-slate-400 mb-1">Details (JSON)</label>
                            <textarea
                                value={JSON.stringify(formData.details || {}, null, 2)}
                                onChange={e => {
                                    try {
                                        setFormData({ ...formData, details: JSON.parse(e.target.value) });
                                    } catch (err) {
                                        // ignore valid JSON errors while typing
                                    }
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono h-24"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center gap-2">
                                <Save size={18} /> Save Method
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {methods.map(method => (
                    <div key={method.id} className={`bg-slate-800 rounded-lg border ${method.isActive ? 'border-slate-700' : 'border-slate-700 opacity-75'} overflow-hidden relative group`}>
                        {!method.isActive && (
                            <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10 pointer-events-none">
                                <span className="bg-slate-900 text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-slate-700">INACTIVE</span>
                            </div>
                        )}

                        <div className="p-4 border-b border-slate-700 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-white text-lg">{method.name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${method.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                    {method.type}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => toggleActive(method)} className={`p-1.5 rounded transition-colors ${method.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-400 hover:text-white bg-slate-700'}`}>
                                    {method.isActive ? <Power size={16} /> : <PowerOff size={16} />}
                                </button>
                                <button onClick={() => handleEdit(method)} className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(method.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 space-y-2 text-sm text-slate-300">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Limits</span>
                                <span>{method.minAmount} - {method.maxAmount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Fee</span>
                                <span>{method.fee} {method.feeType === 'PERCENTAGE' ? '%' : 'Flat'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {methods.length === 0 && !loading && (
                <div className="text-center py-12 text-slate-500 bg-slate-800 rounded-lg border border-slate-700">
                    <p>No payment methods configured.</p>
                </div>
            )}
        </div>
    );
}
