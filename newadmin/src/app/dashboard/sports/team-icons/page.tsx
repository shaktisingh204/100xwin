'use client';

import { useState, useEffect, useRef } from 'react';
import { getTeamIcons, uploadTeamIcon, deleteTeamIcon, getUniqueTeamNames } from '@/actions/team-icons';
import { Upload, Trash2, Search, ImageIcon, Loader2, Trophy, CheckCircle, X } from 'lucide-react';

interface TeamIconEntry {
    _id: string;
    team_name: string;
    display_name: string;
    icon_url: string;
    sport_id: string;
}

const SPORTS = [
    { id: '', label: 'All Sports' },
    { id: '4', label: 'Cricket' },
    { id: '1', label: 'Football' },
    { id: '2', label: 'Tennis' },
    { id: '15', label: 'Basketball' },
    { id: '66', label: 'Kabaddi' },
    { id: '10', label: 'Horse Racing' },
];

export default function TeamIconsPage() {
    const [icons, setIcons] = useState<TeamIconEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
    const [sportId, setSportId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [teamNames, setTeamNames] = useState<string[]>([]);
    const [teamFilter, setTeamFilter] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const flash = (type: 'ok' | 'err', text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 3000);
    };

    const iconMap = new Map(icons.map(i => [i.team_name, i]));

    const fetchIcons = async () => {
        setLoading(true);
        const res = await getTeamIcons();
        if (res.success) setIcons(res.data || []);
        else flash('err', res.error || 'Failed to load');
        setLoading(false);
    };

    const fetchTeamNames = async () => {
        const res = await getUniqueTeamNames();
        if (res.success && res.data) setTeamNames(res.data);
    };

    useEffect(() => {
        fetchIcons();
        fetchTeamNames();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        setFile(f);
        if (f) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedTeam) return flash('err', 'Select a team first');
        if (!file) return flash('err', 'Select an icon file');

        setUploading(true);
        const form = new FormData();
        form.append('file', file);
        form.append('teamName', selectedTeam);
        form.append('sportId', sportId);

        const res = await uploadTeamIcon(form);
        if (res.success) {
            flash('ok', `Icon uploaded for "${selectedTeam}"`);
            setSelectedTeam(null);
            setSportId('');
            setFile(null);
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchIcons();
        } else {
            flash('err', res.error || 'Upload failed');
        }
        setUploading(false);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete icon for "${name}"?`)) return;
        const res = await deleteTeamIcon(id);
        if (res.success) {
            flash('ok', 'Deleted');
            setIcons(prev => prev.filter(i => i._id !== id));
        } else {
            flash('err', res.error || 'Delete failed');
        }
    };

    const filteredTeams = teamNames.filter(t =>
        t.toLowerCase().includes(teamFilter.toLowerCase())
    );

    const teamsWithoutIcon = filteredTeams.filter(t => !iconMap.has(t.toLowerCase()));
    const teamsWithIcon = filteredTeams.filter(t => iconMap.has(t.toLowerCase()));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Trophy size={24} className="text-violet-400" />
                        Team Icons
                    </h1>
                    <p className="text-sm text-white/40 mt-1">
                        Select a team → choose icon → upload
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400/60 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                        {icons.length} uploaded
                    </span>
                    <span className="text-xs font-bold text-white/30 bg-white/5 px-2.5 py-1 rounded-lg">
                        {teamNames.length} teams
                    </span>
                </div>
            </div>

            {/* Flash message */}
            {msg && (
                <div className={`rounded-xl px-4 py-2.5 text-sm font-medium ${msg.type === 'ok' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
                    {msg.text}
                </div>
            )}

            {/* Selected team upload bar */}
            {selectedTeam && (
                <div className="bg-violet-600/10 border border-violet-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-bold text-violet-300">Uploading icon for:</span>
                        <span className="bg-violet-600/30 text-white font-bold text-sm px-3 py-1 rounded-lg">
                            {selectedTeam}
                        </span>
                        <button onClick={() => { setSelectedTeam(null); setFile(null); setPreview(null); }}
                            className="ml-auto text-white/30 hover:text-white/60">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex items-end gap-3">
                        {/* Sport */}
                        <div className="w-40">
                            <label className="text-xs text-white/40 font-medium block mb-1">Sport (optional)</label>
                            <select
                                value={sportId}
                                onChange={e => setSportId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                            >
                                {SPORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>

                        {/* File */}
                        <div className="flex-1">
                            <label className="text-xs text-white/40 font-medium block mb-1">Icon File *</label>
                            <div className="flex items-center gap-2">
                                {preview && (
                                    <img src={preview} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                                )}
                                <label className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 border-dashed rounded-xl px-3 py-2 cursor-pointer hover:border-violet-500/40 transition-colors">
                                    <ImageIcon size={14} className="text-white/30" />
                                    <span className="text-sm text-white/40 truncate">{file ? file.name : 'Choose file…'}</span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Upload */}
                        <button
                            onClick={handleUpload}
                            disabled={uploading || !file}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/40 disabled:cursor-not-allowed text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {uploading ? 'Uploading…' : 'Upload'}
                        </button>
                    </div>
                </div>
            )}

            {/* Team list from Redis */}
            <div className="bg-[#13151a] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">
                        Teams from Live Events
                    </h2>
                    <div className="relative w-64">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                        <input
                            type="text"
                            value={teamFilter}
                            onChange={e => setTeamFilter(e.target.value)}
                            placeholder="Filter teams…"
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
                        />
                    </div>
                </div>

                {teamNames.length === 0 ? (
                    <div className="text-center py-8 text-white/20 text-sm">Loading teams from events…</div>
                ) : (
                    <>
                        {/* Teams needing icons */}
                        {teamsWithoutIcon.length > 0 && (
                            <div className="mb-4">
                                <p className="text-[10px] text-amber-400/60 font-bold uppercase tracking-wider mb-2">
                                    ⚠ No Icon ({teamsWithoutIcon.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                    {teamsWithoutIcon.map(name => (
                                        <button
                                            key={name}
                                            onClick={() => setSelectedTeam(name)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                selectedTeam === name
                                                    ? 'bg-violet-500/25 text-violet-300 border border-violet-500/40 ring-1 ring-violet-500/20'
                                                    : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:border-amber-500/30 hover:text-white/70'
                                            }`}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Teams with icons */}
                        {teamsWithIcon.length > 0 && (
                            <div>
                                <p className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-wider mb-2">
                                    ✓ Has Icon ({teamsWithIcon.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                    {teamsWithIcon.map(name => {
                                        const entry = iconMap.get(name.toLowerCase());
                                        return (
                                            <button
                                                key={name}
                                                onClick={() => setSelectedTeam(name)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    selectedTeam === name
                                                        ? 'bg-violet-500/25 text-violet-300 border border-violet-500/40'
                                                        : 'bg-emerald-500/5 text-emerald-400/70 border border-emerald-500/15 hover:border-emerald-500/30'
                                                }`}
                                            >
                                                {entry?.icon_url && (
                                                    <img src={entry.icon_url} alt="" className="w-4 h-4 rounded object-contain" />
                                                )}
                                                <CheckCircle size={10} className="text-emerald-400/50" />
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Uploaded Icons Grid */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">All Uploaded Icons</h2>
                    <div className="relative w-56">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search icons…"
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 animate-pulse">
                                <div className="w-16 h-16 mx-auto rounded-xl bg-white/5 mb-3" />
                                <div className="h-3 w-20 bg-white/5 rounded mx-auto" />
                            </div>
                        ))}
                    </div>
                ) : icons.filter(i => i.display_name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                    <div className="text-center py-12 text-white/20">
                        <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No icons uploaded yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {icons.filter(i => i.display_name.toLowerCase().includes(search.toLowerCase())).map(icon => (
                            <div
                                key={icon._id}
                                className="group relative bg-[#13151a] border border-white/[0.06] rounded-xl p-4 hover:border-violet-500/20 transition-all"
                            >
                                <button
                                    onClick={() => handleDelete(icon._id, icon.display_name)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500/20 hover:bg-red-500/40 text-red-400 p-1.5 rounded-lg transition-all"
                                >
                                    <Trash2 size={12} />
                                </button>
                                <div className="w-16 h-16 mx-auto rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden mb-3">
                                    <img
                                        src={icon.icon_url}
                                        alt={icon.display_name}
                                        className="w-full h-full object-contain p-1"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                                <p className="text-xs text-white/70 font-semibold text-center truncate">{icon.display_name}</p>
                                {icon.sport_id && (
                                    <p className="text-[10px] text-white/25 text-center mt-0.5">
                                        {SPORTS.find(s => s.id === icon.sport_id)?.label || `Sport ${icon.sport_id}`}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
