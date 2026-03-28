"use client";

import React, { useEffect, useState } from 'react';
import { getCasinoCategories, updateCasinoCategory } from '@/actions/casino';
// import { casinoService, CasinoCategory } from '../../../../services/casino.service';
import { ToggleLeft, ToggleRight, Grid } from 'lucide-react';

export default function CategoriesEnginePage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await getCasinoCategories();
            if (res.success && res.data) {
                setCategories(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch categories", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (category: any) => {
        try {
            const updatedCategories = categories.map(c => c._id === category._id ? { ...c, isActive: !c.isActive } : c);
            setCategories(updatedCategories);
            await updateCasinoCategory(category._id, { isActive: !category.isActive });
        } catch (error) {
            console.error("Update failed", error);
            fetchCategories();
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading categories...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Category Engine</h1>
                    <p className="text-slate-400 mt-1">Manage game categorization logic. These affect game sorting and filtering.</p>
                </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-[640px] w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900/50 uppercase font-medium text-xs">
                            <tr>
                                <th className="px-4 py-4 sm:px-6">Category Name</th>
                                <th className="px-4 py-4 sm:px-6">Slug</th>
                                <th className="px-4 py-4 text-center sm:px-6">Priority</th>
                                <th className="px-4 py-4 text-right sm:px-6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {categories.map(category => (
                                <tr key={category._id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-4 text-white font-medium sm:px-6">
                                        <div className="flex items-center gap-3">
                                            <Grid size={18} className="text-slate-500" />
                                            {category.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-mono text-slate-500 sm:px-6">{category.slug}</td>
                                    <td className="px-4 py-4 text-center sm:px-6">{category.priority || 0}</td>
                                    <td className="px-4 py-4 text-right sm:px-6">
                                        <button
                                            onClick={() => handleToggleStatus(category)}
                                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${category.isActive
                                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                                }`}
                                        >
                                            {category.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                            {category.isActive ? 'Active' : 'Hidden'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
