"use client";

import React, { useState } from 'react';
import { financeService } from '../../../../services/finance.service';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function ReconciliationPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        try {
            const res = await financeService.reconcile(file);
            setResult(res);
        } catch (error) {
            console.error("Reconciliation failed", error);
            alert("Failed to process file.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Reconciliation</h1>
                <p className="text-slate-400 mt-1">Compare internal records with payment gateway CSV reports.</p>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload size={32} className="text-indigo-400" />
                </div>

                <h3 className="text-xl font-semibold text-white mb-2">Upload Gateway Report</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                    Upload a CSV file containing transaction IDs and statuses. The system will match them against internal records.
                </p>

                <div className="flex justify-center mb-6">
                    <label className="relative cursor-pointer bg-slate-900 border border-slate-600 hover:border-indigo-500 rounded-lg px-6 py-4 flex items-center gap-3 transition-colors group">
                        <FileText className="text-slate-400 group-hover:text-white" />
                        <span className="text-slate-300 group-hover:text-white font-medium">
                            {file ? file.name : "Select CSV File"}
                        </span>
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    Start Reconciliation
                </button>
            </div>

            {result && (
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-amber-400" size={20} />
                        Analysis Result
                    </h3>
                    <div className="bg-slate-900 p-4 rounded text-slate-300 font-mono text-sm whitespace-pre-wrap">
                        {JSON.stringify(result, null, 2)}
                    </div>
                </div>
            )}
        </div>
    );
}
