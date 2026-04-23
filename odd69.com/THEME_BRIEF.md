# odd69 — Gold-Leaf Casino Floor Theme

This is the single source of truth for any UI work in `odd69.com/`. Read this before touching any component or route.

## The aesthetic

**Gold-leaf casino floor on warm obsidian.** Dark, confident, refined. Gold is the hero — sparingly deployed, never flat, always warmed by emerald wins, crimson live alerts, violet for originals, ice for info. Think Aston Martin × Monaco × crypto dashboard.

## Typography

Configured in `src/app/layout.tsx` via `next/font/google`, exposed as CSS variables:

- `var(--font-bricolage)` — **Bricolage Grotesque** (display: headlines, big numbers)
- `var(--font-dm)`        — **DM Sans** (body — default on `<body>`)
- `var(--font-mono)`      — **JetBrains Mono** (numeric — balances, odds, scores, timers)

Use the utility classes `.font-display`, `.font-body`, `.font-mono` to switch. The `.num` class sets the mono font with tabular-nums and is the only correct choice for currency / odds / percentages / countdowns.

**NEVER** use Inter, Roboto, Arial, system-ui, Space Grotesk, or anything else.

## Color tokens (CSS variables — all in `globals.css`)

### Surfaces (warm obsidian, darker → lighter)
- `--bg-base`     `#0a0b0f`   — page background
- `--bg-surface`  `#12141c`   — cards
- `--bg-elevated` `#1a1d27`   — hover / modal
- `--bg-raised`   `#22252f`   — popovers
- `--bg-inlay`    `#2b2f3b`   — inputs inside cards

### Brand — Gold
- `--gold`        `#f5b70a`   — primary
- `--gold-bright` `#ffcc33`   — highlights, hover
- `--gold-deep`   `#b37d00`   — depth, gradient bottom
- `--gold-soft`   tinted fill for gold chips / backgrounds
- `--gold-line`   gold 1px border for important edges
- `--gold-halo`   glow / shadow for gold elements

### Semantic
- `--emerald`  `#00d87b` — wins, positive, balance-up
- `--crimson`  `#ff2e4c` — live, urgent, stop-loss
- `--violet`   `#8b5cff` — originals, crash, provably-fair
- `--ice`      `#64d3ff` — info, new, informational
- `--rose`     `#ff7ab6` — highlights, hot, special

Each has a matching `-soft` for tinted fills.

### Ink (warm whites on warm blacks)
- `--ink`         — primary text
- `--ink-strong`  — 92% headlines
- `--ink-dim`     — 64% body
- `--ink-faint`   — 40% labels
- `--ink-whisper` — 22% whispers
- `--ink-ghost`   — 10% almost invisible

### Hairlines
- `--line`          — subtle divider
- `--line-default`  — standard border
- `--line-strong`   — emphasized border
- `--line-gold`     — gold-tinted border

## Utility classes (provided by `globals.css`)

Use these rather than inventing new ones:

| Class | Purpose |
|---|---|
| `.page-x` | Standard responsive horizontal padding — apply to every top-level section wrapper |
| `.no-scrollbar` | Hides scrollbar |
| `.glass` | Translucent blurred surface — use on sticky chrome and overlays |
| `.card` | Standard card background + border + radius |
| `.card-hover:hover` | Lift + glow on hover |
| `.hairline` | 1px divider with fade to edges |
| `.text-gold-grad` | Gold gradient on text |
| `.bg-gold-grad` | Gold gradient background |
| `.bg-gold-soft` | Soft gold radial background |
| `.btn`, `.btn-gold`, `.btn-ghost` | Button primitives |
| `.chip`, `.chip-gold`, `.chip-emerald`, `.chip-crimson`, `.chip-violet`, `.chip-ice` | Pill badges — mono-cased uppercase tiny |
| `.rail-gold` | Section header accent: left 3px gold rail |
| `.t-eyebrow` | Mono, uppercase, tiny — kickers above titles |
| `.t-section` | Display sans, bold, section title |
| `.t-section-sub` | Subdued subtitle below a section title |
| `.t-display` | Oversized display text |
| `.num` | Tabular mono numerics |
| `.dotgrid` | Dotted-grid pattern (overlay on heroes) |
| `.grain` | Grain noise layer via `::after` (mix-blend-overlay) |
| `.sweep` | Gold-shimmer gleam on hover |
| `.stagger > *` | Cascaded entrance — set on parent, children fade-up in order |
| `.skeleton` | Loading shimmer |
| `.animate-fade-up`, `.animate-fade-in`, `.animate-pulse-gold`, `.animate-live-dot`, `.animate-rise`, `.animate-scroll-x` | Named animations |

## Section grammar (use everywhere)

Every major section follows this pattern:

```tsx
<section className="page-x">
  <div className="mb-4 rail-gold">
    <span className="t-eyebrow">Live offer</span>
    <h2 className="t-section mt-1">Section title here</h2>
    <p className="t-section-sub">One-line description.</p>
  </div>

  {/* body */}
</section>
```

Or, inline header with actions on right:

```tsx
<div className="flex items-end justify-between mb-4">
  <div className="rail-gold">
    <span className="t-eyebrow">Eyebrow</span>
    <h2 className="t-section mt-1">Title</h2>
  </div>
  <Link href="..." className="chip chip-gold !py-1.5 !px-3">All →</Link>
</div>
```

## Cards & layout patterns

- Standard card: `className="rounded-[16px] border border-[var(--line-default)] bg-[var(--bg-surface)] p-4 hover:border-[var(--line-gold)] transition-all"`
- Interactive card with lift: add `hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]`
- Hero / feature card: apply `grain` and optionally `dotgrid` overlays
- Outer container: `max-w-[1680px] mx-auto`
- Vertical rhythm between sections: `space-y-10 md:space-y-12`

## Buttons — canonical

```tsx
<button className="btn btn-gold sweep h-9 uppercase tracking-[0.06em] text-[11px]">Deposit</button>
<button className="btn btn-ghost h-9">Cancel</button>
```

## Chips — canonical

```tsx
<span className="chip chip-emerald">+12.4%</span>
<span className="chip chip-crimson"><Circle size={6} fill="currentColor" className="animate-live-dot" /> Live</span>
<span className="chip chip-gold">Hot</span>
```

## Numbers

Always wrap money, odds, percentages, counts, times with `className="num"` for tabular mono rendering:

```tsx
<span className="num text-[var(--gold-bright)]">₹12,482.00</span>
<span className="num text-[var(--emerald)]">+2.45x</span>
```

## What NOT to do

- Do not load fonts or re-declare them. They're already set in `layout.tsx`.
- Do not hardcode `#f59e0b` / `#10b981` / `#ffffff` / `rgba(255,255,255,*)` — use the CSS variables.
- Do not use `text-white/15`, `text-white/20` etc. — use `text-[var(--ink-faint)]`, `text-[var(--ink-whisper)]` etc.
- Do not invent new fonts, colors, or utility classes. Extend `globals.css` only if truly necessary.
- Do not break existing import paths or context hook usage (`useAuth`, `useModal`, `useWallet`, `useBet`, `casinoService`, `api`, etc.).
- Do not add `'use client'` unless the route actually uses hooks or event handlers.
- No emojis in the UI unless already present in data.
- Keep all client data-fetching intact — re-wire the same `useEffect`s to the new JSX.

## File contract

When rewriting a route at path `src/app/<route>/page.tsx`:

1. Read the matching file in `../../newwebsite/src/app/<route>/page.tsx` for **content richness** (sections, copy, feature sets, data flows to keep).
2. Read the **current** `odd69.com/src/app/<route>/page.tsx` for **API wiring** (imports, service calls, context hooks).
3. Write a new file that keeps the odd69 imports/data, adopts newwebsite's information architecture, and renders entirely in the gold-leaf theme above.
4. Do NOT touch anything outside your assigned files.
