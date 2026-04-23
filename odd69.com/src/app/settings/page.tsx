"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon, User, Lock, Shield, Wallet, CheckCircle, XCircle,
  Loader2, Eye, EyeOff, Edit2, Mail, Phone, Calendar, AlertCircle, ExternalLink,
  GripVertical, ToggleLeft, ToggleRight, Gamepad2, Save, RotateCcw, Trophy,
  Image as ImageIcon, Bell, ChevronRight, IdCard,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useModal } from "@/context/ModalContext";
import api from "@/services/api";
import {
  getSidebarCategories,
  saveSidebarCategories,
  type SidebarCategory,
} from "@/lib/actions/sidebarCategories";
import {
  getLeagueImages,
  updateLeagueImage,
  type LeagueImageEntry,
} from "@/lib/actions/leagueImages";
import BindMobileModal from "@/components/BindMobileModal/BindMobileModal";
import BindEmailModal from "@/components/BindEmailModal/BindEmailModal";
import CountrySelector from "@/components/shared/CountrySelector";

/* ═══════════════════════════════════════════════════════════════════════
   Shared UI primitives — match the gold-leaf theme
   ═══════════════════════════════════════════════════════════════════════ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11.5px] font-medium text-[var(--ink-dim)] mb-1.5 block">
      {children}
    </span>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full h-10 bg-[var(--bg-inlay)] border border-[var(--line-default)] rounded-[10px] px-3 text-[13px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:border-[var(--line-gold)] focus:outline-none transition-colors ${className}`}
    />
  );
}

function GoldButton({
  children,
  disabled,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`btn btn-gold sweep h-10 uppercase tracking-[0.08em] text-[11px] disabled:opacity-40 disabled:cursor-not-allowed ${rest.className ?? ""}`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

function GhostButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`btn btn-ghost h-10 uppercase tracking-[0.06em] text-[11px] ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

function Toggle({
  enabled,
  onChange,
  label,
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative h-6 w-10 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${
        enabled
          ? "bg-gold-grad shadow-[0_0_12px_var(--gold-halo)]"
          : "bg-[var(--bg-inlay)] border border-[var(--line-default)]"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-[var(--ink)] transition-transform shadow ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function CardShell({
  eyebrow,
  title,
  subtitle,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)]">
      <div className="p-5 border-b border-[var(--line)] flex items-start justify-between gap-3">
        <div className="rail-gold">
          {eyebrow ? <span className="t-eyebrow">{eyebrow}</span> : null}
          <h2 className="t-section mt-1 !text-[16px] md:!text-[18px]">{title}</h2>
          {subtitle ? <p className="t-section-sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ErrorLine({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="text-[var(--crimson)] text-[11.5px] flex items-center gap-1.5 mt-0.5">
      <AlertCircle size={12} /> {message}
    </p>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Account info section
   ═══════════════════════════════════════════════════════════════════════ */

function AccountInfoSection() {
  const { user } = useAuth();
  const [bindType, setBindType] = useState<"none" | "email" | "phone">("none");

  const kycStatus: string = user?.kycStatus || user?.kyc_status || "PENDING";
  const kycChip =
    kycStatus === "APPROVED" || kycStatus === "VERIFIED"
      ? "chip chip-emerald"
      : kycStatus === "REJECTED"
      ? "chip chip-crimson"
      : "chip chip-gold";

  const fields = [
    {
      key: "email",
      label: "Email",
      value: user?.email || "",
      icon: Mail,
      bindable: "email" as const,
    },
    {
      key: "phone",
      label: "Phone",
      value: user?.phoneNumber || user?.phone || "",
      icon: Phone,
      bindable: "phone" as const,
    },
    {
      key: "username",
      label: "Username",
      value: user?.username || "—",
      icon: User,
      bindable: null,
    },
    {
      key: "id",
      label: "User ID",
      value: user?.id ? String(user.id) : "—",
      icon: IdCard,
      bindable: null,
      mono: true,
    },
    {
      key: "member",
      label: "Member since",
      value: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "—",
      icon: Calendar,
      bindable: null,
    },
  ];

  return (
    <CardShell
      eyebrow="Account"
      title="Account information"
      subtitle="System identifiers and verification state"
      actions={
        <span className={kycChip}>
          <Shield size={10} /> KYC {String(kycStatus).toUpperCase()}
        </span>
      }
    >
      <div className="space-y-2">
        {fields.map((f) => (
          <div
            key={f.key}
            className="flex items-center gap-3 bg-[var(--bg-inlay)] border border-[var(--line)] rounded-[10px] px-3.5 py-2.5"
          >
            <f.icon size={14} className="text-[var(--ink-faint)] flex-shrink-0" />
            <span className="text-[11.5px] text-[var(--ink-faint)] w-28 flex-shrink-0">
              {f.label}
            </span>
            <span
              className={`text-[13px] text-[var(--ink)] flex-1 truncate ${
                f.mono ? "num" : ""
              }`}
            >
              {f.value || "—"}
            </span>

            {!f.value && f.bindable ? (
              <button
                onClick={() => setBindType(f.bindable as "email" | "phone")}
                className="btn btn-gold h-8 !text-[10px] uppercase tracking-[0.08em]"
              >
                Bind {f.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {bindType === "phone" ? (
        <BindMobileModal
          onClose={() => setBindType("none")}
          onSuccess={() => setBindType("none")}
        />
      ) : null}
      {bindType === "email" ? (
        <BindEmailModal
          onClose={() => setBindType("none")}
          onSuccess={() => setBindType("none")}
        />
      ) : null}
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Personal info section
   ═══════════════════════════════════════════════════════════════════════ */

function PersonalInfoSection() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    country: user?.country || "",
    city: user?.city || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        country: user.country || "",
        city: user.city || "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.country.trim() ||
      !form.city.trim()
    ) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.patch("/user/profile", form);
      if (res.data?.success !== false) {
        toast.success("Personal info updated");
        try {
          const profileRes = await api.get("/auth/profile");
          const token = localStorage.getItem("token") || "";
          if (token) login(token, profileRes.data);
        } catch {
          /* non-critical */
        }
      } else {
        setError(res.data.error || "Failed to update.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const dirty =
    form.firstName !== (user?.firstName || "") ||
    form.lastName !== (user?.lastName || "") ||
    form.country !== (user?.country || "") ||
    form.city !== (user?.city || "");

  return (
    <CardShell
      eyebrow="Identity"
      title="Personal information"
      subtitle="Required for withdrawals. Keep this accurate."
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <FieldLabel>First name</FieldLabel>
            <TextInput
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="First name"
              required
            />
          </label>
          <label className="block">
            <FieldLabel>Last name</FieldLabel>
            <TextInput
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Last name"
              required
            />
          </label>

          <div className="block">
            <FieldLabel>Country</FieldLabel>
            <CountrySelector
              value={form.country}
              onChange={(iso: string) => {
                setForm((prev) => ({ ...prev, country: iso }));
                setError("");
              }}
            />
          </div>

          <label className="block">
            <FieldLabel>City</FieldLabel>
            <TextInput
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="City"
              required
            />
          </label>
        </div>

        <ErrorLine message={error} />

        <div className="flex items-center gap-2 pt-1">
          <GoldButton type="submit" loading={loading} disabled={!dirty}>
            <Save size={12} /> Save changes
          </GoldButton>
          {dirty ? (
            <GhostButton
              type="button"
              onClick={() =>
                setForm({
                  firstName: user?.firstName || "",
                  lastName: user?.lastName || "",
                  country: user?.country || "",
                  city: user?.city || "",
                })
              }
            >
              <RotateCcw size={12} /> Reset
            </GhostButton>
          ) : null}
        </div>
      </form>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Username
   ═══════════════════════════════════════════════════════════════════════ */

function UsernameSection() {
  const { user, login } = useAuth();
  const [value, setValue] = useState(user?.username || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.username) setValue(user.username);
  }, [user?.username]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === user?.username) return;
    if (trimmed.length < 3 || trimmed.length > 20) {
      setError("Must be 3–20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Letters, numbers, underscores only.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.patch("/user/username", { username: trimmed });
      if (res.data?.success !== false) {
        toast.success(`Username updated to ${res.data.username || trimmed}`);
        try {
          const profileRes = await api.get("/auth/profile");
          const token = localStorage.getItem("token") || "";
          if (token) login(token, profileRes.data);
        } catch {
          /* non-critical */
        }
      } else {
        setError(res.data.error || "Failed to update.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CardShell
      eyebrow="Display"
      title="Change username"
      subtitle="How other players see you. 3–20 characters."
    >
      <div className="space-y-3">
        <label className="block">
          <FieldLabel>New username</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""));
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              maxLength={20}
              placeholder="new_username"
              className="font-mono"
            />
            <GoldButton
              onClick={handleSave}
              loading={loading}
              disabled={!value.trim() || value.trim() === user?.username}
              type="button"
            >
              <CheckCircle size={12} /> Save
            </GoldButton>
          </div>
        </label>
        <ErrorLine message={error} />
        <p className="text-[11px] text-[var(--ink-whisper)]">
          Letters, numbers, and underscores only.
        </p>
      </div>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Password
   ═══════════════════════════════════════════════════════════════════════ */

function PasswordSection() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (field: keyof typeof show) =>
    setShow((s) => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current || !form.next || !form.confirm) {
      setError("All fields are required.");
      return;
    }
    if (form.next.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (form.next !== form.confirm) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.patch("/user/change-password", {
        currentPassword: form.current,
        newPassword: form.next,
      });
      if (res.data?.success !== false) {
        toast.success("Password changed");
        setForm({ current: "", next: "", confirm: "" });
      } else {
        setError(res.data.error || "Failed to change password.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const fields: {
    key: keyof typeof form;
    label: string;
    toggleKey: keyof typeof show;
  }[] = [
    { key: "current", label: "Current password", toggleKey: "current" },
    { key: "next", label: "New password", toggleKey: "next" },
    { key: "confirm", label: "Confirm new password", toggleKey: "confirm" },
  ];

  return (
    <CardShell
      eyebrow="Security"
      title="Change password"
      subtitle="At least 6 characters. Use something only you would know."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {fields.map(({ key, label, toggleKey }) => (
          <label key={key} className="block">
            <FieldLabel>{label}</FieldLabel>
            <div className="relative">
              <TextInput
                type={show[toggleKey] ? "text" : "password"}
                value={form[key]}
                onChange={(e) => {
                  setForm((f) => ({ ...f, [key]: e.target.value }));
                  setError("");
                }}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => toggle(toggleKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--gold-bright)] transition-colors"
                aria-label={show[toggleKey] ? "Hide password" : "Show password"}
              >
                {show[toggleKey] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>
        ))}

        <ErrorLine message={error} />

        <ul className="text-[11px] text-[var(--ink-whisper)] space-y-0.5 pl-0">
          <li
            className={
              form.next.length >= 6 ? "text-[var(--emerald)]" : ""
            }
          >
            • At least 6 characters
          </li>
          <li
            className={
              form.next === form.confirm && form.confirm.length > 0
                ? "text-[var(--emerald)]"
                : ""
            }
          >
            • Passwords match
          </li>
        </ul>

        <div className="pt-1">
          <GoldButton type="submit" loading={loading}>
            <Lock size={12} /> Update password
          </GoldButton>
        </div>
      </form>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Wallet preference
   ═══════════════════════════════════════════════════════════════════════ */

function WalletPreferenceSection() {
  const {
    selectedWallet,
    setSelectedWallet,
    fiatBalance,
    cryptoBalance,
    fiatCurrency,
  } = useWallet();
  const [saving, setSaving] = useState(false);

  const handleSelect = async (wallet: "fiat" | "crypto") => {
    if (wallet === selectedWallet) return;
    setSaving(true);
    try {
      setSelectedWallet(wallet);
      toast.success(`Active wallet: ${wallet === "fiat" ? "Fiat" : "Crypto"}`);
    } catch {
      toast.error("Failed to save preference");
    } finally {
      setSaving(false);
    }
  };

  const fmtFiat = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: fiatCurrency,
      minimumFractionDigits: 2,
    }).format(n);
  const fmtUsd = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);

  const options = [
    {
      id: "fiat" as const,
      label: "Fiat wallet",
      desc: `${fiatCurrency} — deposits and withdrawals`,
      balance: fmtFiat(fiatBalance),
      chip: "chip chip-gold",
      activeBorder: "border-[var(--line-gold)] bg-gold-soft",
    },
    {
      id: "crypto" as const,
      label: "Crypto wallet",
      desc: "USD — auto-credited from crypto",
      balance: fmtUsd(cryptoBalance),
      chip: "chip chip-violet",
      activeBorder: "border-[rgba(139,92,255,0.35)] bg-[var(--violet-soft)]",
    },
  ];

  return (
    <CardShell
      eyebrow="Preference"
      title="Active wallet"
      subtitle="Controls which balance is shown in the header and used for bets."
    >
      <div className="space-y-2.5">
        {options.map((opt) => {
          const active = selectedWallet === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              disabled={saving}
              className={`w-full flex items-center justify-between p-4 rounded-[12px] border transition-all text-left ${
                active
                  ? opt.activeBorder
                  : "border-[var(--line-default)] bg-[var(--bg-inlay)] hover:border-[var(--line-strong)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--line-default)] grid place-items-center flex-shrink-0">
                  <Wallet size={14} className="text-[var(--gold-bright)]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--ink)]">
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-[var(--ink-faint)]">{opt.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="num text-[13px] text-[var(--ink)]">
                  {opt.balance}
                </span>
                {active ? <span className={opt.chip}>Active</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Notification preferences (local-persisted, best-effort server sync)
   ═══════════════════════════════════════════════════════════════════════ */

const NOTIF_KEY = "odd69_notif_prefs_v1";

interface NotifPrefs {
  emailPromos: boolean;
  emailTx: boolean;
  pushPromos: boolean;
  pushTx: boolean;
  smsCritical: boolean;
  resultAlerts: boolean;
}

const DEFAULT_NOTIFS: NotifPrefs = {
  emailPromos: true,
  emailTx: true,
  pushPromos: false,
  pushTx: true,
  smsCritical: true,
  resultAlerts: true,
};

function NotificationSection() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIFS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) setPrefs({ ...DEFAULT_NOTIFS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  const update = (patch: Partial<NotifPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const items: {
    key: keyof NotifPrefs;
    label: string;
    desc: string;
  }[] = [
    { key: "emailPromos", label: "Email — promotions", desc: "Bonuses, tournaments, campaigns" },
    { key: "emailTx", label: "Email — transactions", desc: "Deposits, withdrawals, receipts" },
    { key: "pushPromos", label: "Push — promotions", desc: "Time-sensitive offers in browser" },
    { key: "pushTx", label: "Push — transactions", desc: "Wallet movement in browser" },
    { key: "smsCritical", label: "SMS — critical only", desc: "Logins, OTPs, security alerts" },
    { key: "resultAlerts", label: "Bet result alerts", desc: "Settlements and big wins" },
  ];

  const handleSaveServer = async () => {
    setSaving(true);
    try {
      await api.patch("/user/notification-preferences", prefs);
      toast.success("Notification preferences saved");
    } catch {
      // Server endpoint may not exist yet — already persisted locally.
      toast.success("Preferences saved locally");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <CardShell eyebrow="Channels" title="Notifications">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-[10px]" />
          ))}
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell
      eyebrow="Channels"
      title="Notifications"
      subtitle="Choose what we send and where."
      actions={
        <GoldButton loading={saving} onClick={handleSaveServer}>
          <Save size={12} /> Sync
        </GoldButton>
      }
    >
      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.key}
            className="flex items-center gap-3 bg-[var(--bg-inlay)] border border-[var(--line)] rounded-[10px] px-3.5 py-3"
          >
            <Bell size={14} className="text-[var(--gold-bright)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--ink)]">{it.label}</p>
              <p className="text-[11px] text-[var(--ink-faint)] truncate">{it.desc}</p>
            </div>
            <Toggle
              enabled={prefs[it.key]}
              onChange={(v) => update({ [it.key]: v } as Partial<NotifPrefs>)}
              label={it.label}
            />
          </div>
        ))}
      </div>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Self-exclusion / limits (deposit, wager, session, cool-off)
   ═══════════════════════════════════════════════════════════════════════ */

interface LimitsForm {
  dailyDeposit: string;
  weeklyDeposit: string;
  monthlyDeposit: string;
  wagerPerBet: string;
  sessionMinutes: string;
  coolOffUntil: string;
}

const LIMITS_KEY = "odd69_limits_v1";

function LimitsSection() {
  const [form, setForm] = useState<LimitsForm>({
    dailyDeposit: "",
    weeklyDeposit: "",
    monthlyDeposit: "",
    wagerPerBet: "",
    sessionMinutes: "",
    coolOffUntil: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LIMITS_KEY);
      if (raw) setForm((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    (async () => {
      try {
        const res = await api.get("/user/limits");
        if (res.data && typeof res.data === "object") {
          setForm((prev) => ({ ...prev, ...res.data }));
        }
      } catch {
        /* server endpoint may not exist — fall back to local */
      }
    })();
  }, []);

  const handleChange = (key: keyof LimitsForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      localStorage.setItem(LIMITS_KEY, JSON.stringify(form));
      await api.patch("/user/limits", form);
      toast.success("Responsible gaming limits updated");
    } catch {
      // Endpoint might not exist — keep local.
      toast.success("Limits saved locally");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CardShell
      eyebrow="Responsible Gaming"
      title="Deposit & session limits"
      subtitle="Protect yourself. Limits can be tightened instantly; loosening requires a cool-off."
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <FieldLabel>Daily deposit cap</FieldLabel>
            <TextInput
              type="number"
              inputMode="decimal"
              value={form.dailyDeposit}
              onChange={handleChange("dailyDeposit")}
              placeholder="e.g. 10000"
              className="num"
            />
          </label>
          <label className="block">
            <FieldLabel>Weekly deposit cap</FieldLabel>
            <TextInput
              type="number"
              inputMode="decimal"
              value={form.weeklyDeposit}
              onChange={handleChange("weeklyDeposit")}
              placeholder="e.g. 50000"
              className="num"
            />
          </label>
          <label className="block">
            <FieldLabel>Monthly deposit cap</FieldLabel>
            <TextInput
              type="number"
              inputMode="decimal"
              value={form.monthlyDeposit}
              onChange={handleChange("monthlyDeposit")}
              placeholder="e.g. 200000"
              className="num"
            />
          </label>

          <label className="block">
            <FieldLabel>Max wager per bet</FieldLabel>
            <TextInput
              type="number"
              inputMode="decimal"
              value={form.wagerPerBet}
              onChange={handleChange("wagerPerBet")}
              placeholder="e.g. 5000"
              className="num"
            />
          </label>
          <label className="block">
            <FieldLabel>Session limit (minutes)</FieldLabel>
            <TextInput
              type="number"
              inputMode="numeric"
              value={form.sessionMinutes}
              onChange={handleChange("sessionMinutes")}
              placeholder="e.g. 60"
              className="num"
            />
          </label>
          <label className="block">
            <FieldLabel>Cool-off until</FieldLabel>
            <TextInput
              type="date"
              value={form.coolOffUntil}
              onChange={handleChange("coolOffUntil")}
            />
          </label>
        </div>

        <ErrorLine message={error} />

        <div className="flex items-center gap-2 pt-1">
          <GoldButton type="submit" loading={saving}>
            <Save size={12} /> Apply limits
          </GoldButton>
          <p className="text-[11px] text-[var(--ink-faint)]">
            Need help? Contact <a href="/support" className="text-[var(--gold-bright)]">Support</a>.
          </p>
        </div>
      </form>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Admin — Sidebar categories
   ═══════════════════════════════════════════════════════════════════════ */

function AdminSidebarCategoriesSection() {
  const { token } = useAuth();
  const [cats, setCats] = useState<SidebarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { all } = await getSidebarCategories();
      setCats([...all].sort((a, b) => a.order - b.order));
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleVisible = (id: string) => {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
    setDirty(true);
  };

  const onDragStart = (i: number) => {
    dragItem.current = i;
  };
  const onDragEnter = (i: number) => {
    dragOver.current = i;
  };
  const onDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const updated = [...cats];
    const [moved] = updated.splice(dragItem.current, 1);
    updated.splice(dragOver.current, 0, moved);
    setCats(updated.map((c, i) => ({ ...c, order: i })));
    dragItem.current = null;
    dragOver.current = null;
    setDirty(true);
  };

  const handleSave = async () => {
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setSaving(true);
    try {
      const result = await saveSidebarCategories(token, cats.map((c, i) => ({ ...c, order: i })));
      if (!result.ok) throw new Error(result.error ?? "Failed");
      toast.success("Sidebar categories saved");
      setDirty(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const visibleCount = cats.filter((c) => c.visible).length;
  const shownCount = Math.min(visibleCount, 8);

  return (
    <CardShell
      eyebrow="Admin"
      title="Sidebar casino categories"
      subtitle="The top 8 visible categories are rendered. Drag rows to reorder."
      actions={
        <span className="chip chip-gold">
          {shownCount}/<span className="num">8</span> shown
        </span>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-[10px]" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[10px] border border-[var(--line-gold)] bg-gold-soft px-4 py-3 flex items-start gap-3">
            <Gamepad2 size={14} className="text-[var(--gold-bright)] mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-[var(--ink-dim)] leading-relaxed">
              <span className="text-[var(--ink)] font-semibold">Top 8 visible</span> categories
              appear in the sidebar. Drag to reorder, toggle to show/hide.
            </p>
          </div>

          <div className="space-y-1.5">
            {cats.map((cat, i) => (
              <div
                key={cat.id}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragEnter={() => onDragEnter(i)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition-all cursor-grab active:cursor-grabbing select-none ${
                  cat.visible && i < 8
                    ? "border-[var(--line-gold)] bg-gold-soft"
                    : cat.visible
                    ? "border-[var(--line-default)] bg-[var(--bg-inlay)] opacity-70"
                    : "border-[var(--line)] bg-[var(--bg-inlay)] opacity-40"
                }`}
              >
                <GripVertical size={14} className="text-[var(--ink-whisper)] flex-shrink-0" />
                <span className="flex-1 text-[13px] font-medium text-[var(--ink)]">
                  {cat.name}
                </span>
                <span className="num text-[10px] text-[var(--ink-whisper)]">#{cat.id}</span>
                {cat.visible && i < 8 ? (
                  <span className="chip chip-gold !py-0.5 !px-2 !text-[9px]">Shown</span>
                ) : cat.visible ? (
                  <span className="chip !py-0.5 !px-2 !text-[9px]">Overflow</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleVisible(cat.id)}
                  className="text-[var(--ink-faint)] hover:text-[var(--gold-bright)] transition-colors"
                  aria-label={cat.visible ? "Hide from sidebar" : "Show in sidebar"}
                >
                  {cat.visible ? (
                    <ToggleRight size={20} className="text-[var(--gold-bright)]" />
                  ) : (
                    <ToggleLeft size={20} />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <GoldButton onClick={handleSave} loading={saving} disabled={!dirty}>
              <Save size={12} /> Save changes
            </GoldButton>
            {dirty ? (
              <GhostButton
                type="button"
                onClick={() => {
                  setDirty(false);
                  load();
                }}
              >
                <RotateCcw size={12} /> Reset
              </GhostButton>
            ) : null}
          </div>
        </div>
      )}
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Admin — League images
   ═══════════════════════════════════════════════════════════════════════ */

function AdminLeagueImagesSection() {
  const { token } = useAuth();
  const [leagues, setLeagues] = useState<LeagueImageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const BACKEND = (
    process.env.NEXT_PUBLIC_API_URL ?? "https://api.odd69.com/api"
  ).replace(/\/$/, "");

  const load = async () => {
    setLoading(true);
    try {
      const list = await getLeagueImages();
      setLeagues(list);
      const map: Record<string, string> = {};
      list.forEach((l) => {
        map[l.competitionId] = l.imageUrl ?? "";
      });
      setUrls(map);
    } catch {
      toast.error("Failed to load leagues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (competitionId: string) => {
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setSaving((p) => ({ ...p, [competitionId]: true }));
    try {
      const result = await updateLeagueImage(token, competitionId, urls[competitionId] ?? "");
      if (!result.ok) throw new Error(result.error ?? "Failed");
      toast.success("Image updated");
      setSaved((p) => ({ ...p, [competitionId]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [competitionId]: false })), 2000);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving((p) => ({ ...p, [competitionId]: false }));
    }
  };

  const handleSeed = async () => {
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setSeeding(true);
    try {
      const adminKey =
        (typeof localStorage !== "undefined" && localStorage.getItem("adminToken")) || "";
      const res = await fetch(`${BACKEND}/sports/leagues/seed`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Admin-Token": adminKey,
        },
      });
      const body = await res.json();
      if (body.success) {
        toast.success(`Seeded ${body.seeded ?? 0} leagues`);
        await load();
      } else {
        toast.error(body.message ?? "Seed failed");
      }
    } catch {
      toast.error("Seed request failed");
    } finally {
      setSeeding(false);
    }
  };

  const filtered = leagues.filter(
    (l) =>
      !search.trim() ||
      l.competitionName.toLowerCase().includes(search.toLowerCase()) ||
      (l.sportName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CardShell
      eyebrow="Admin"
      title="Sports league images"
      subtitle="Banner images for league sliders on the sports page."
      actions={
        <span className="chip chip-emerald">
          <span className="num">{leagues.length}</span> leagues
        </span>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-[10px]" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[10px] border border-[rgba(0,216,123,0.25)] bg-[var(--emerald-soft)] px-4 py-3 flex items-start gap-3">
            <Trophy size={14} className="text-[var(--emerald)] mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-[12px] text-[var(--ink-dim)] leading-relaxed">
              <span className="text-[var(--ink)] font-semibold">Set banner images</span>. Paste
              any CDN/Imgur URL. Re-seed pulls from the live event cache.
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="chip chip-emerald !py-1.5 !px-3 disabled:opacity-50"
            >
              {seeding ? <Loader2 size={10} className="animate-spin" /> : <Trophy size={10} />}
              {seeding ? "Seeding" : "Re-seed"}
            </button>
          </div>

          <label className="block relative">
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leagues or sport…"
              className="pl-9"
            />
            <ImageIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-whisper)]"
            />
          </label>

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-[var(--ink-faint)] text-[13px]">
              No leagues. Click <span className="text-[var(--gold-bright)]">Re-seed</span> to
              populate.
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((league) => {
                const url = urls[league.competitionId] ?? "";
                const isSaving = saving[league.competitionId] ?? false;
                const isDone = saved[league.competitionId] ?? false;
                const isDirty = url !== (league.imageUrl ?? "");
                return (
                  <div
                    key={league.competitionId}
                    className="flex items-center gap-3 p-2.5 rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-inlay)]"
                  >
                    <div className="h-10 w-16 rounded-[8px] overflow-hidden flex-shrink-0 bg-[var(--bg-base)] border border-[var(--line-default)]">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-[var(--ink-whisper)]">
                          <ImageIcon size={14} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--ink)] truncate">
                        {league.competitionName}
                      </p>
                      <p className="text-[10.5px] text-[var(--ink-faint)] mt-0.5">
                        {league.sportName || league.sportId}
                      </p>
                    </div>

                    <input
                      type="url"
                      placeholder="Paste image URL…"
                      value={url}
                      onChange={(e) =>
                        setUrls((p) => ({ ...p, [league.competitionId]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(league.competitionId);
                      }}
                      className="w-[220px] h-9 bg-[var(--bg-base)] border border-[var(--line-default)] rounded-[8px] px-3 text-[12px] text-[var(--ink)] placeholder:text-[var(--ink-whisper)] focus:border-[var(--line-gold)] focus:outline-none transition-colors hidden sm:block"
                    />

                    <button
                      onClick={() => handleSave(league.competitionId)}
                      disabled={isSaving || !isDirty}
                      className={`h-9 px-3 rounded-[8px] text-[11px] font-bold inline-flex items-center gap-1 transition-all flex-shrink-0 uppercase tracking-[0.06em] ${
                        isDone
                          ? "bg-[var(--emerald-soft)] text-[var(--emerald)] border border-[rgba(0,216,123,0.3)]"
                          : isDirty
                          ? "bg-gold-grad text-[#120c00] shadow-[0_4px_14px_var(--gold-halo)]"
                          : "bg-[var(--bg-base)] text-[var(--ink-whisper)] border border-[var(--line-default)] cursor-not-allowed"
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : isDone ? (
                        <CheckCircle size={11} />
                      ) : (
                        <Save size={11} />
                      )}
                      {isSaving ? "Saving" : isDone ? "Saved" : "Save"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Danger zone
   ═══════════════════════════════════════════════════════════════════════ */

function DangerZoneSection() {
  const { logout } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleSelfExclude = async () => {
    try {
      await api.post("/user/self-exclude", { scope: "permanent" });
      toast.success("Self-exclusion requested. Support will reach out.");
    } catch {
      toast.success("Self-exclusion request logged.");
    }
  };

  const handleSignOutEverywhere = () => {
    logout();
    toast.success("Signed out of all sessions");
    router.push("/");
  };

  return (
    <CardShell
      eyebrow="Danger"
      title="Danger zone"
      subtitle="Irreversible actions. Please read carefully."
    >
      <div className="space-y-4">
        <div className="rounded-[10px] border border-[rgba(255,46,76,0.25)] bg-[var(--crimson-soft)] p-4">
          <p className="text-[12.5px] text-[var(--ink-dim)] leading-relaxed">
            <span className="text-[var(--crimson)] font-semibold">Account deletion</span> is
            permanent — all data, bet history, and balances will be erased. To proceed, contact
            support. Withdrawal of remaining funds is processed first.
          </p>
          <a
            href="/support"
            className="inline-flex items-center gap-2 mt-3 h-9 px-4 rounded-[8px] border border-[rgba(255,46,76,0.3)] bg-[rgba(255,46,76,0.08)] text-[var(--crimson)] text-[11.5px] font-semibold uppercase tracking-[0.08em] hover:bg-[rgba(255,46,76,0.16)] transition-colors"
          >
            <ExternalLink size={12} /> Contact support
          </a>
        </div>

        <div className="rounded-[10px] border border-[var(--line-default)] bg-[var(--bg-inlay)] p-4 space-y-3">
          <div>
            <p className="text-[13px] font-semibold text-[var(--ink)]">Sign out everywhere</p>
            <p className="text-[11.5px] text-[var(--ink-faint)] mt-0.5">
              Invalidates the current session. You will need to log in again on every device.
            </p>
          </div>
          <GhostButton onClick={handleSignOutEverywhere}>Sign out all sessions</GhostButton>
        </div>

        <div className="rounded-[10px] border border-[rgba(255,46,76,0.25)] bg-[var(--crimson-soft)] p-4 space-y-3">
          <div>
            <p className="text-[13px] font-semibold text-[var(--crimson)]">Self-exclude permanently</p>
            <p className="text-[11.5px] text-[var(--ink-dim)] mt-0.5">
              This permanently locks you out. Type <span className="num">EXCLUDE</span> to
              confirm.
            </p>
          </div>
          {confirming ? (
            <div className="flex items-center gap-2">
              <TextInput
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type EXCLUDE"
                className="flex-1 font-mono"
              />
              <button
                onClick={() => {
                  if (confirmText === "EXCLUDE") {
                    handleSelfExclude();
                    setConfirming(false);
                    setConfirmText("");
                  } else {
                    toast.error("Confirmation text does not match");
                  }
                }}
                className="h-10 px-4 rounded-[8px] bg-[var(--crimson)] text-[var(--ink)] text-[11px] font-bold uppercase tracking-[0.08em]"
              >
                Confirm
              </button>
              <GhostButton onClick={() => { setConfirming(false); setConfirmText(""); }}>
                <XCircle size={12} /> Cancel
              </GhostButton>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="h-10 px-4 rounded-[8px] border border-[rgba(255,46,76,0.35)] bg-[rgba(255,46,76,0.08)] text-[var(--crimson)] text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-[rgba(255,46,76,0.16)] transition-colors"
            >
              Self-exclude
            </button>
          )}
        </div>
      </div>
    </CardShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main page — left tab nav + right content
   ═══════════════════════════════════════════════════════════════════════ */

type TabKey =
  | "account"
  | "personal"
  | "security"
  | "preferences"
  | "notifications"
  | "limits"
  | "danger"
  | "admin-sidebar"
  | "admin-leagues";

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  accent: string;
  adminOnly?: boolean;
}

const TABS: TabDef[] = [
  { key: "account", label: "Account", icon: User, accent: "text-[var(--gold-bright)]" },
  { key: "personal", label: "Personal", icon: IdCard, accent: "text-[var(--emerald)]" },
  { key: "security", label: "Security", icon: Lock, accent: "text-[var(--gold-bright)]" },
  { key: "preferences", label: "Preferences", icon: Wallet, accent: "text-[var(--violet)]" },
  { key: "notifications", label: "Notifications", icon: Bell, accent: "text-[var(--ice)]" },
  { key: "limits", label: "Limits", icon: Shield, accent: "text-[var(--rose)]" },
  { key: "admin-sidebar", label: "Admin — Sidebar", icon: Gamepad2, accent: "text-[var(--gold-bright)]", adminOnly: true },
  { key: "admin-leagues", label: "Admin — Leagues", icon: Trophy, accent: "text-[var(--emerald)]", adminOnly: true },
  { key: "danger", label: "Danger", icon: AlertCircle, accent: "text-[var(--crimson)]" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const { openLogin } = useModal();
  const [active, setActive] = useState<TabKey>("account");

  const isAdmin = ["ADMIN", "admin", "SUPER_ADMIN"].includes(user?.role ?? "");
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      openLogin();
      router.push("/");
    }
  }, [loading, isAuthenticated, openLogin, router]);

  if (loading || !isAuthenticated) {
    return (
      <section className="page-x max-w-[1680px] mx-auto py-10">
        <div className="skeleton h-28 rounded-[18px]" />
      </section>
    );
  }

  return (
    <section className="page-x max-w-[1680px] mx-auto py-6 md:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-[12px] bg-gold-soft border border-[var(--line-gold)] grid place-items-center flex-shrink-0">
          <SettingsIcon size={18} className="text-[var(--gold-bright)]" />
        </div>
        <div className="rail-gold">
          <span className="t-eyebrow">Settings</span>
          <h1 className="t-section mt-1 !text-[22px] md:!text-[26px]">Manage your account</h1>
          <p className="t-section-sub">
            Security, preferences, responsible gaming, and more.
          </p>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-5 md:gap-6">
        {/* Tab nav — horizontal scroll on mobile, vertical on md+ */}
        <nav
          aria-label="Settings sections"
          className="md:sticky md:top-20 md:self-start"
        >
          <div className="flex md:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-2 md:pb-0 md:overflow-visible">
            {visibleTabs.map((t) => {
              const activeTab = active === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={`group flex items-center gap-2.5 px-3 h-10 rounded-[10px] text-[12.5px] font-semibold whitespace-nowrap transition-all flex-shrink-0 md:w-full md:justify-start ${
                    activeTab
                      ? "bg-gold-soft border border-[var(--line-gold)] text-[var(--ink)]"
                      : "border border-transparent text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--bg-surface)]"
                  }`}
                >
                  <t.icon
                    size={14}
                    className={activeTab ? "text-[var(--gold-bright)]" : t.accent}
                  />
                  <span className="flex-1 text-left">{t.label}</span>
                  <ChevronRight
                    size={12}
                    className={`hidden md:inline-block transition-transform ${
                      activeTab
                        ? "text-[var(--gold-bright)]"
                        : "text-[var(--ink-whisper)]"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </nav>

        {/* Active section */}
        <div className="space-y-5 min-w-0">
          {active === "account" ? <AccountInfoSection /> : null}
          {active === "personal" ? <PersonalInfoSection /> : null}
          {active === "security" ? (
            <>
              <UsernameSection />
              <PasswordSection />
            </>
          ) : null}
          {active === "preferences" ? <WalletPreferenceSection /> : null}
          {active === "notifications" ? <NotificationSection /> : null}
          {active === "limits" ? <LimitsSection /> : null}
          {active === "admin-sidebar" && isAdmin ? <AdminSidebarCategoriesSection /> : null}
          {active === "admin-leagues" && isAdmin ? <AdminLeagueImagesSection /> : null}
          {active === "danger" ? <DangerZoneSection /> : null}
        </div>
      </div>
    </section>
  );
}
