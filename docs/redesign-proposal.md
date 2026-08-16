# kv-music Interface Redesign — "Liquid Glass" Proposal

**Status:** Draft for review · **Applies to:** `frontend-vite` (React 18 + TypeScript + Vite 5 + Tailwind CSS 3.4 + framer-motion + zustand + react-router-dom 6)

---

## Sources

**Wireframe mockups (design source of truth — all values below are copied verbatim from these files):**

| File | Screen |
|---|---|
| `mockups/01-home.html` | Home ("Listen Now") — hero card, carousels, floating tab bar, mini-player |
| `mockups/02-search.html` | Search — field, chips, browse grid |
| `mockups/03-library.html` | Library — grouped glass list, 2-col playlist grid |
| `mockups/04-playlist.html` | Playlist — nav row, horizontal hero, track list, EQ indicator |
| `mockups/05-now-playing.html` | Now Playing — waveform scrubber, transport, Up Next |
| `mockups/06-settings.html` | Settings — grouped sections, iOS switches |

**Current implementation (files this proposal touches):** `src/index.css`, `tailwind.config.js`, `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/layout/PlayerBar.tsx`, `src/components/Header.tsx`, `src/components/BottomNav.tsx`, `src/components/player/MobileMiniBar.tsx`, `src/components/player/MobileFullPlayer.tsx`, `src/components/player/MiniPlayer.tsx`, `src/components/player/PlayerControls.tsx`, `src/components/player/ProgressBar.tsx`, `src/components/SettingsModal.tsx`, `src/components/TrackRow.tsx`, `src/components/SoundCloudTrackCard.tsx`, `src/components/SoundCloudSidebar.tsx`, `src/components/Waveform.tsx`, and all pages in `src/pages/` (`Discovery`, `Search`, `Library`, `Playlist`, `Album`, `Artist`, `Track`, `Feed`, `Profile`, `Collection`, `ChartsSection`, `Section`, `ArtistsPage`).

---

## 1. Executive Summary

### 1.1 Goal

Redesign kv-music's interface from its current flat, hard-edged dark theme (`#121212` surfaces, 8px radii, full-width docked chrome) to the **"Liquid Glass"** language of the wireframe mockups: an iOS 26–inspired dark glassmorphism adapted to a desktop **and** mobile streaming web app. The redesign is visual only — it must preserve every existing feature, store, API contract, and route.

### 1.2 Design direction

The mockups define a coherent material system, not just a skin:

1. **Material over flat surfaces.** All panels, bars, and buttons are translucent glass (`backdrop-filter: blur(26px) saturate(180%)` over a vertical `rgba(64,66,72,0.85) → rgba(26,27,30,0.6)` gradient) with a hairline `rgba(255,255,255,0.12)` ring and a specular sheen line along the top edge.
2. **Depth via glass + glow.** A fixed orange radial-gradient wash behind the content gives the glass something to refract; orange glow (`rgba(255,85,0,0.45)`) radiates from the play button — the single accent.
3. **Inverted play buttons.** Play is near-white (`#f6f6f7`) circle with a dark icon, inverted from the current orange-filled buttons.
4. **Floating chrome.** Tab bar, mini-player, and (desktop) player bar float with `16px` insets instead of docking to screen edges.
5. **Waveform as brand signature.** The waveform moves from a background detail into the hero of the UI: a 9px strip along the mini-player's top edge, a 44px scrubber with a 2px playhead in Now Playing, and animated 3-bar EQ indicators on the playing track row.
6. **Orange `#ff5500` as the only accent.** All legacy red (`#FF0000`) and green accents are migrated to the accent family.

### 1.3 Key principles

- **Restraint:** one accent, one material, three artwork placeholder gradients.
- **Glass is for chrome:** blur is applied to few fixed surfaces and interactive panels (performance), never to scrolling content containers.
- **Mono for data:** durations, ranks, counts, eyebrow labels, and timestamps always use `tabular-nums` mono.
- **Progressive enhancement:** the design degrades gracefully when `backdrop-filter` is unavailable (opaque fallback background).

---

## 2. Design Tokens

### 2.1 CSS variables — `frontend-vite/src/index.css`

Add to the existing `:root` block in `src/index.css` (replacing the unused `--sc-*`/`--spotify-*`/`--nct-*` families in Phase 5 — see §10). Values are verbatim from the mockups:

```css
:root {
    /* ── Base ── */
    --bg: #111214;
    --fg: #f2f2f3;
    --fg-2: #c9c9cd;
    --muted: #9a9aa1;
    --faint: #78797e;

    /* ── Glass materials ── */
    --glass-hi: rgba(64, 66, 72, 0.85);
    --glass-lo: rgba(26, 27, 30, 0.6);
    --glass: rgba(30, 31, 34, 0.7);
    --glass-strong: rgba(46, 48, 53, 0.92);

    /* ── Lines & shades ── */
    --glass-border: rgba(255, 255, 255, 0.12);
    --hair: rgba(255, 255, 255, 0.09);
    --inner-shade: rgba(0, 0, 0, 0.4);
    --shadow: rgba(0, 0, 0, 0.5);
    --lift: rgba(0, 0, 0, 0.45);
    --art-border: rgba(255, 255, 255, 0.08);
    --glyph-bg: rgba(255, 255, 255, 0.08);
    --tag-bg: rgba(16, 17, 19, 0.6);

    /* ── Accent ── */
    --accent: #ff5500;
    --accent-2: #ff7a00;              /* existing hover color, kept */
    --accent-soft: rgba(255, 85, 0, 0.16);
    --accent-glow: rgba(255, 85, 0, 0.45);
    --on-accent: #f6f6f7;             /* foreground on accent/play surfaces */

    /* ── Background wash (gives glass something to refract) ── */
    --wash-a: rgba(255, 85, 0, 0.16);
    --wash-b: rgba(255, 120, 40, 0.08);
    --wash-c: rgba(255, 85, 0, 0.10);

    /* ── Artwork placeholder gradients ── */
    --art-a: #3c3e42;
    --art-b: #35373b;
    --art-c: #2d2f33;
    --art-t1a: #4d3a2c;               /* tan */
    --art-t1b: #372720;
    --art-t2a: #3b3e4a;               /* blue */
    --art-t2b: #2c2e38;

    /* ── Specular sheen (top-edge highlight on glass) ── */
    --sheen: linear-gradient(90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.55) 22%,
        rgba(255, 255, 255, 0.18) 60%,
        rgba(255, 255, 255, 0) 100%);

    /* ── Type ── */
    --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", system-ui, sans-serif;
    --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
```

### 2.2 Typography scale (exact from mockups)

| Token / class | Size | Weight | Tracking | Line-height | Usage |
|---|---|---|---|---|---|
| `large-title` | 34px | 800 | -0.02em | 1.05 | Screen titles (Listen Now, Search, Library, Settings) |
| Playlist hero title (`pl-title`) | 24px | 800 | -0.02em | 1.1 | Playlist/Album page titles |
| Now Playing title | 22px | 700 | -0.015em | normal | Full player track title |
| Section header `h2` | 20px | 700 | -0.01em | normal | Carousel/section headers |
| Nav title | 17px | 600 | -0.01em | normal | Detail-page nav rows |
| Body row label (`ll`) | 16px | 500 (400 in Settings) | -0.01em | normal | Grouped list rows |
| Track title (`tt`) | 15px | 500 (700 when playing) | -0.01em | normal | Track rows |
| Mini-player title | 14px | 600 | -0.01em | normal | Mini-player, hero chip title |
| Chip label | 14px | 500 (600 active) | normal | normal | Filter chips |
| Card title (`ct`) | 12px | 600 | -0.005em | normal | Carousel cards |
| Card subtitle (`ca`) | 11px | 400 | normal | normal | Carousel cards |
| Playlist eyebrow (`pl-eyebrow`) | 11px | 600 | 0.08em | normal | Uppercase eyebrows on detail heroes |
| Now Playing label | 11px | 600 | 0.14em | normal | Uppercase "NOW PLAYING" |
| Settings group header (`ghead`) | 11px | 600 | 0.09em | normal | Uppercase mono group headers |
| Tab label | 10px | 500 | 0.01em | normal | Tab bar |
| Micro-eyebrow (chip) | 9px | 600 | 0.1em | normal | Hero chip eyebrow, mono tags |

### 2.3 Radii scale

| Token | Value | Usage |
|---|---|---|
| `--r-hero` | 24px | Hero card, Now Playing artwork |
| `--r-sheet` | 28px (top) | Bottom sheets (existing `BottomSheet`) |
| `--r-card` | 16–20px | Cards, grouped lists (20), carousel art (16), playlist art (20) |
| `--r-tile` | 8–18px | Track/playlist tiles, artwork 12px (mini), 18px (cards) |
| `--r-pill` | 999px | Chips, play buttons, tab bar (34px is a large pill) |
| `--r-mini` | 22px | Mini-player, desktop floating player bar |
| `--r-tabbar` | 34px | Floating tab bar |

### 2.4 Spacing scale

`4 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 32 / 44 / 52 / 64 / 90` px. Canonical uses: screen padding `18px 16px 0`; rails/grids `12px` gaps; internal row gaps `10–14px`; floating chrome inset `16px`; tab bar bottom `14px`; mini-player bottom `90px` (64px tab bar + 14px + 12px breathing room).

### 2.5 Tailwind extension — `frontend-vite/tailwind.config.js`

Extend `theme.extend` (keep the existing `fold: '660px'` breakpoint):

```js
theme: {
    extend: {
        screens: { fold: '660px' },
        colors: {
            bg: '#111214',
            fg: '#f2f2f3',
            'fg-2': '#c9c9cd',
            muted: '#9a9aa1',
            faint: '#78797e',
            accent: '#ff5500',
            'accent-2': '#ff7a00',
            'accent-soft': 'rgba(255,85,0,0.16)',
            'accent-glow': 'rgba(255,85,0,0.45)',
            'on-accent': '#f6f6f7',
            'glass-hi': 'rgba(64,66,72,0.85)',
            'glass-lo': 'rgba(26,27,30,0.6)',
            glass: 'rgba(30,31,34,0.7)',
            'glass-strong': 'rgba(46,48,53,0.92)',
        },
        borderRadius: {
            hero: '24px', sheet: '28px', card: '20px', tile: '18px',
            mini: '22px', tabbar: '34px', pill: '999px',
        },
        fontFamily: {
            sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', '"Segoe UI"', 'system-ui', 'sans-serif'],
            mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
        },
        boxShadow: {
            glass: '0 0 0 0.5px rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.4), 0 12px 28px -10px rgba(0,0,0,0.5)',
            'glow-accent': '0 8px 18px -6px rgba(255,85,0,0.45)',
            'glow-accent-lg': '0 10px 22px -8px rgba(255,85,0,0.45)',
        },
    },
},
```

Usage rule: components use the Tailwind classes (`bg-glass`, `text-muted`, `rounded-card`, `shadow-glow-accent`) or the CSS utility classes in §3; arbitrary hex values (`bg-[#121212]`, `border-white/5`) are removed phase-by-phase.

---

## 3. Core Materials & Effects

### 3.1 `.glass` — the single material (`src/index.css`)

```css
.glass {
    position: relative;
    background: linear-gradient(180deg, var(--glass-hi), var(--glass-lo));
    -webkit-backdrop-filter: blur(26px) saturate(180%);
    backdrop-filter: blur(26px) saturate(180%);
    box-shadow:
        0 0 0 0.5px var(--glass-border),   /* hairline ring */
        inset 0 -1px 0 var(--inner-shade), /* inner bottom shade */
        0 12px 28px -10px var(--shadow);   /* drop shadow */
}
.glass::after { /* specular sheen along the top edge */
    content: "";
    position: absolute; top: 0; left: 8px; right: 8px; height: 1.5px;
    background: var(--sheen);
    border-radius: 999px;
    pointer-events: none;
}
```

Fallback for browsers without `backdrop-filter` (all mockups share this risk):

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .glass { background: linear-gradient(180deg, #3a3c41, #1a1b1e); }
}
```

### 3.2 Background wash — `.wash` (fixed layer behind all content)

The App shell renders one fixed `<div className="wash" aria-hidden="true" />` behind the router outlet. Standard variant (all screens except Now Playing):

```css
.wash {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
        radial-gradient(520px 380px at 12% -6%,   var(--wash-a), transparent 62%),
        radial-gradient(460px 340px at 108% 18%,  var(--wash-b), transparent 60%),
        radial-gradient(620px 420px at 50% 114%,  var(--wash-c), transparent 65%);
}
```

Now Playing variant (from `05-now-playing.html`, centered for the full player):

```css
.wash-np {
    background:
        radial-gradient(560px 400px at 50% -10%, var(--wash-a), transparent 60%),
        radial-gradient(460px 360px at 6% 60%,   var(--wash-b), transparent 60%),
        radial-gradient(620px 460px at 96% 96%,  var(--wash-c), transparent 65%);
}
```

The wash is cheap (painted once, no blur) and is what makes the floating glass bars read as glass instead of gray blocks.

### 3.3 Artwork placeholder gradients (used by `CoverImage.tsx` fallback + skeletons)

```css
.art-ph { border: 1px solid var(--art-border); border-radius: 18px;
          background: linear-gradient(155deg, var(--art-a), var(--art-c)); }
.art-ph.t1 { background: linear-gradient(155deg, var(--art-t1a), var(--art-t1b)); }
.art-ph.t2 { background: linear-gradient(155deg, var(--art-t2a), var(--art-t2b)); }
```

Mono "ART 1:1" tag for placeholders:

```css
.wf-tag { font-family: var(--mono); font-size: 9px; letter-spacing: 0.09em;
          text-transform: uppercase; color: var(--muted);
          padding: 3px 7px; border-radius: 6px; background: var(--tag-bg); }
```

### 3.4 Accent utilities

```css
.glow { box-shadow: 0 8px 18px -6px var(--accent-glow); }
.glow-lg { box-shadow: 0 10px 22px -8px var(--accent-glow); }
.text-glow { color: var(--accent); }
```

### 3.5 Focus-visible & transitions (replace current `button:focus-visible` rule)

```css
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
button, a { transition: color 0.15s ease, background-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease; }
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

### 3.6 Performance guidance

- `backdrop-filter` is expensive; apply `.glass` only to: the tab bar, mini-player, desktop player bar, header (desktop), back/avatar buttons, hero chip, search field, chips container (if glassed), grouped lists, sheets, and the Now Playing screen (all fixed or small surfaces).
- Never put `backdrop-filter` on long scrolling lists, cards inside rails, or large page containers.
- The `.wash` layer must be `pointer-events: none` and painted once (it is a single fixed element).
- Where the current app already blurs (e.g., `MobileFullPlayer`'s `blur-3xl` cover backdrop), keep blur but drop it under `@media (prefers-reduced-motion: reduce)` and on `@media (max-width: 640px)` consider halving saturation.

---

## 4. Global Chrome (App Shell)

### 4.1 `src/components/layout/AppLayout.tsx` — shell changes

Current: `h-[100dvh] w-screen flex flex-col bg-[#121212] text-white` + sticky `Header` + `<main className="... pb-[140px] md:pb-[80px] bg-[#121212]">` + `MobileMiniBar` + `BottomNav` + `PlayerBar` + `MiniPlayer` + `MobileFullPlayer` + `SettingsModal` + `Toast`.

Proposed:

- Root: `h-[100dvh] w-screen flex flex-col bg-bg text-fg relative select-none overflow-hidden`.
- Render `<div className="wash" aria-hidden="true" />` as the first child (behind header/main).
- `<main className="flex-1 overflow-y-auto no-scrollbar relative z-[1] scroll-smooth">` — remove `pb-[140px]`; replace with `pb-[168px] md:pb-[100px]` (mobile: 90px mini-player + 64px tab bar + 14px bottom = 168px; desktop: 60px floating player + 14px + 16px inset + 10px slack ≈ 100px). Content gets `z-[1]` so glass chrome layers above it.
- Keep `MiniPlayer` (invisible audio engine) and `Toast` untouched.

### 4.2 Mobile tab bar — replace `src/components/BottomNav.tsx` with `FloatingTabBar`

Delete the full-width `fixed bottom-0 h-14 bg-[#121212] border-t` dock; new component `src/components/FloatingTabBar.tsx` implements the mockup exactly:

```
position: fixed; left: 16px; right: 16px; bottom: 14px; height: 64px;
border-radius: 34px; z-index: 30;  (glass)
display: flex; align-items: center; justify-content: space-around; padding: 0 10px;
```

Each tab: `width: 84px; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 0 4px; border-radius: 14px; font-size: 10px; font-weight: 500; color: var(--muted); letter-spacing: 0.01em;` with an inner pill `.tbg { width: 50px; height: 30px; border-radius: 15px; }` holding a `24px` icon. Active: `color: var(--accent)` + `.tbg { background: var(--accent-soft) }`.

Mapping of the current 5 destinations (keep the IA, restyle only):
- Home → Home tab; Stream (/feed) → keeps the `Rss` icon; center play → a 52px inverted play button (`bg-[#f6f6f7] text-[#111214] shadow-glow-accent`, `w-13`/`h-13` — use `w-[52px] h-[52px]`) that pops up instead of the 40px orange one; Library → Library tab; Profile → Profile tab. The tab bar has `pb-[env(safe-area-inset-bottom)]` padding baked into the 64px height via the mockup's geometry (bottom 14px) plus safe-area margin `bottom: calc(14px + env(safe-area-inset-bottom))` on the wrapper.

Keep `haptic(6)` nav taps, `handleCenterPlayClick`, and `isBuffering` spinner (swap spinner color to `#111214` on the white button).

### 4.3 Mobile mini-player — `src/components/player/MobileMiniBar.tsx`

Current: `fixed bottom-[calc(56px+env(safe-area-inset-bottom)+8px)] left-2 right-2 ... bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl`.

Proposed (mockup `.mini`):

```
position: fixed; left: 16px; right: 16px; bottom: 90px; height: 60px;
border-radius: 22px; z-index: 25; display: flex; align-items: center;
gap: 10px; padding: 0 10px;  (glass)
```

- Artwork `42px` with `border-radius: 12px` (was `w-10 h-10 rounded`).
- Title `14px/600`, artist `12px muted`, both truncated.
- **Signature:** the 9px waveform strip along the top edge: `position: absolute; top: 0; left: 12px; right: 12px; height: 9px; gap: 1.5px; z-index: 1` with bars `border-radius: 1px`, played bars `var(--accent)` opacity 1, unplayed `var(--faint)` opacity 0.5. Reuse the existing `Waveform` component (`src/components/Waveform.tsx`) rendered absolutely at `top-0 h-[9px]` inside the bar instead of inside the meta column.
- Right-side controls: two `44px` circular icon buttons — pause/play (inverted: `bg-[#f6f6f7] text-[#111214]`) and a `ChevronUp` expand button replacing the current small expand chevron.
- Keep swipe gestures (`useSwipe`: left/right = next/prev, up = full player) and tap-to-open behavior.

### 4.4 Desktop header — `src/components/Header.tsx`

Current: `sticky top-0 z-[60] bg-[#121212] border-b border-white/10`; nav links `uppercase tracking-wider font-bold` with `border-b-2` active state; search field `bg-[#242424] rounded border border-white/10`.

Proposed:
- Container: `sticky top-0 z-[60] bg-[#111214]/70 backdrop-blur-2xl border-b border-white/10` (translucent glass; hairline from `--hair`).
- Keep logo, desktop nav links (Home/Feed/Library) but restyle active to `text-accent` + pill `bg-accent-soft rounded-full` instead of the underline.
- Desktop search field → mockup search field treatment: `h-[46px] rounded-[23px] px-4 glass` with `18px` muted search icon and `16px` input (mockup §2-search); the autocomplete dropdown becomes a glass panel: `bg-glass rounded-card shadow-glass border-white/10 backdrop-blur-2xl`.
- Avatar: 38px circular glass (mockup `.avatar`: `background: linear-gradient(180deg, var(--glass-hi), var(--glass-lo)); box-shadow: 0 0 0 0.5px var(--glass-border);`), keep the gradient initial fill as a background layer beneath.
- Mobile search toggle row: same restyled pill.

### 4.5 Desktop player bar — `src/components/layout/PlayerBar.tsx`

Current: `hidden md:flex fixed bottom-0 left-0 right-0 z-[55] h-14 bg-[#121212] border-t border-white/10 px-4`.

Proposed — floating glass bar (layout change from docked to floating):
```
hidden md:flex fixed left-4 right-4 bottom-[14px] z-[55] h-[60px] rounded-[22px] px-4 glass items-center gap-4
```
- Keep all controls: prev/play/next, shuffle/repeat (now `text-accent` when active instead of neutral), track title/artist, **interactive waveform** (keep `height={32}` and `onSeek`), mono timestamps (`font-mono tabular-nums text-[10px] text-muted w-8`), like/share/download, queue/lyrics/related drawer button, hover volume slider (`accent-[#ff5500]`).
- Track artwork in bar: `w-9 h-9 rounded` → `rounded-[10px]` (tile radius).
- **Drawer:** change from full-height slide-over `top-12 right-0 bottom-14 w-80 bg-[#181818] border-l` to a glass panel floating inset: `fixed right-4 bottom-[88px] top-auto w-96 max-h-[60vh] glass rounded-card border-white/10 flex flex-col overflow-hidden` — same tabs (Next Up/Lyrics/Related) and `Lyrics variant="panel"`.
- On `lg` screens where the SoundCloudSidebar exists, the bar's left controls should offset so content doesn't collide (see §9.2).

### 4.6 Now Playing — `src/components/player/MobileFullPlayer.tsx` (mobile) + desktop fullscreen

Apply the `05-now-playing.html` structure while preserving current features (like, add-to-playlist, share, download, lyrics, queue, swipe on artwork):

| Mockup block | Mockup spec | Implementation notes |
|---|---|---|
| Collapse row | `collapse` 36px circular glass button with 18px down chevron; center label `np-label` 11px/600/0.14em uppercase muted; right 36px menu button | Keep `ChevronDown` collapse; label text changes from "SoundCloud Playing" to "Now Playing"; right menu opens the existing `BottomSheet` |
| Artwork | 256px, `border-radius: 24px`, `border: 1px solid var(--art-border)` | Replace `max-w-[320px] rounded-2xl` with `w-[256px] h-[256px] rounded-hero` (max-w-[320px] wrapper kept, inner sized 256px); keep blurred cover backdrop (`blur-3xl opacity-25` + `bg-black/60`) |
| Title block | centered; h1 22px/700/-0.015em; sub 15px muted ("Artist — Album") | Use `text-[22px] font-bold` + `text-[15px] text-muted` |
| Scrubber | waveform `height: 44px; gap: 2px`; playhead `position: absolute; top: -6px; bottom: -6px; left: 38%; width: 2px; border-radius: 2px; background: var(--on-accent); opacity: 0.9` | Extend `Waveform` to accept `playhead` prop, or overlay a 2px div computed from `progress/duration`; times `11px mono muted` below |
| Transport | 64px play (`play-big`, `box-shadow: 0 10px 22px -8px var(--accent-glow)`, 28px icon) flanked by 44px icon buttons (shuffle/prev/next/repeat; shuffle & repeat `muted` unless active → accent) | Keep current gap-7 row; swap button classes |
| Volume row | 28px muted icons + 5px track (`fill` 62%, `var(--fg-2)`) | Replace with styled `input[type=range]` (see §3.6/§5.8) or keep native range with accent color |
| Up Next | header 15px/700; rows 42px tall, 32px art (`border-radius: 8px`), 13px/500 + 11px muted, mono duration | Replace the accordion with a fixed list (keep accordion collapse as optional); same store data |

Desktop: when `md+` and `isFullScreenOpen`, render the same layout in a centered column (`max-w-[480px] mx-auto`) inside the existing full-screen overlay, or route it as the `/player` view — keep the drag-down-to-collapse gesture on mobile.

---

## 5. Component System

Each spec: **Current** (file + classes) → **Proposed** (exact tokens/classes). New components live in `src/components/`.

### 5.1 Play button (`PlayButton.tsx` — new shared component)

| Size | Mockup class | Spec |
|---|---|---|
| Small | `.pbtn.small` | 40px circle, 16px icon |
| Default | `.pbtn` | 52px circle, 20px icon, `box-shadow: 0 8px 18px -6px var(--accent-glow)` |
| Big | `.play-big` | 64px circle, 28px icon, `box-shadow: 0 10px 22px -8px var(--accent-glow)` |

All: `background: var(--on-accent); color: var(--bg)` — **inverted** (white circle, dark icon). Tailwind: `w-[52px] h-[52px] rounded-full bg-on-accent text-bg shadow-glow-accent grid place-items-center` with `active:scale-95`.

Files touched: `BottomNav.tsx` center button (currently `bg-[#ff5500]` orange), `MobileMiniBar.tsx` play, `PlayerBar.tsx` play (keep small — 40px variant), `MobileFullPlayer.tsx` play (64px), `Playlist.tsx` hero play, `Discovery.tsx` hero chip play, `Album.tsx`/`Collection.tsx`/`PlayerControls.tsx` plays.

### 5.2 Glass card (`GlassCard.tsx` — new)

`<div className="glass rounded-card overflow-hidden">`. Use for: grouped lists, track lists, hero chip, drawer panels, settings groups. Optional `interactive` prop adds `hover:brightness-110 active:scale-[0.98]` and a sheen brighten on hover (`.glass:hover::after { opacity: 1 }`, base `opacity: 0.85`).

### 5.3 Carousel rail + card (used on Home, Discovery, Playlist "More like this")

- Rail: `display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px;` (both scrollbar-hidden utilities already exist as `.no-scrollbar`).
- Card: `flex: none; width: 112px;` art `height: 100px; border-radius: 16px; border: 1px solid var(--art-border);` title `12px/600/-0.005em` `margin-top: 8px`; subtitle `11px muted` `margin-top: 2px`; both single-line ellipsis.
- Current replacements: `Discovery.tsx` cards, `Playlist.tsx`/`Album.tsx` "More like this" rails, `Recommendations.tsx`.

### 5.4 Section header row with "See all" (`SectionHeader.tsx` — new)

```html
<div class="h2row"><h2 class="text-[20px] font-bold tracking-[-0.01em]">Recently Played</h2>
<span class="more text-[13px] text-muted">See all</span></div>
```
`h2row` margin: `0 0 10px` (carousels) / `26px 0 12px` (search) / `12px 0 6px` (library). "See all" hover → `text-fg`.

### 5.5 Search field (`SearchField.tsx` — new; used by Header desktop search + Search page)

Mockup `.field`: `display: flex; align-items: center; gap: 8px; height: 46px; border-radius: 23px; padding: 0 16px; margin-bottom: 14px;` + `.glass`. Icon `18px var(--muted)`; input `16px var(--fg)`, placeholder `var(--muted)`.

### 5.6 Chips (`Chips.tsx` — new; Search filters, Library tabs)

- Container: `display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px;`
- Chip: `flex: none; padding: 9px 16px; border-radius: 999px; font-size: 14px; font-weight: 500; color: var(--fg-2);`
- Active: `background: var(--glass-strong); color: var(--fg); font-weight: 600;`
- Library's existing count chips (`px-3.5 py-1.5 rounded-full bg-[#ff5500] text-white`) → active chip style, counts in mono (`lc mono`).

### 5.7 Browse tile grid (Search page / Discovery)

Mockup `.browse`: `display: grid; grid-template-columns: 1fr 1fr; gap: 12px;` — tile `.bcard`: `position: relative; height: 92px; border-radius: 20px; display: flex; align-items: flex-end; padding: 12px;` with art gradient background; label `.bl`: `14px/700/-0.01em` + `text-shadow: 0 1px 0 rgba(0,0,0,0.45)`; mono tag top-right `top: 8px; right: 10px; padding: 2px 6px; border-radius: 6px; background: var(--tag-bg)`.

Desktop: `md:grid-cols-3 xl:grid-cols-4` (see §9.3).

### 5.8 Grouped glass list rows (`GroupList.tsx` + `GroupRow` — new; Library, Settings, Playlist track list)

- Container `.group`: `border-radius: 20px; overflow: hidden; padding: 4px 0;` + `.glass`.
- Row `.lrow`: `display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 14px; border-bottom: 0.5px solid var(--hair);` last child `border-bottom: 0`.
- Glyph variant: 34px square, `border-radius: 10px`, `background: var(--glyph-bg)`, `color: var(--fg-2)`, 19px icon; label `16px/500`; right value `13px muted` (mono variant `lc mono` for counts); chevron 16px `var(--faint)`.
- Settings variant: label `16px/400`, value `14px muted` (mono for storage/version).
- Rows are `<button>` or `<Link>` full-width; `active:bg-white/5`.

### 5.9 iOS switch (`Switch.tsx` — new, for Settings)

Mockup `.switch`: `width: 51px; height: 31px; border-radius: 999px; background: var(--faint); position: relative; transition: background 0.18s ease;` `.on { background: var(--accent) }`; knob `.knob { position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: var(--on-accent); box-shadow: 0 1px 3px rgba(28,28,30,0.3); transition: left 0.18s ease; }` `.on .knob { left: 22px; }`. Accessible: `role="switch"` + `aria-checked` + keyboard toggle.

### 5.10 Track row with EQ indicator (`TrackRow.tsx` + playlist rows)

| Element | Mockup spec | Current → Proposed |
|---|---|---|
| Row | `height: 50px; padding: 0 14px; gap: 12px; border-bottom: 0.5px solid var(--hair)` | `TrackRow.tsx` rows `px-3 py-2` → match mockup in `Playlist.tsx`; keep swipe actions |
| Rank | `width: 22px; text-align: right; font-size: 13px; color: var(--muted);` mono | `TrackRow.tsx` `w-6 ... text-xs` → `w-[22px] mono text-[13px]`; playing: `color: var(--fg); font-weight: 700` |
| EQ (playing) | `.eq` 16×16 accent; bars 3px wide, heights 8/14/10px, opacity 0.5/1/0.7, radius 2px | Replace `text-orange-500` play/pause icon with the 3-bar EQ; animate heights (`@keyframes` exist: `soundwave-1..4`) but respect reduced motion |
| Title | `15px/500`; playing `700` | `text-sm font-semibold` → `text-[15px] font-medium`, playing `font-bold` |
| Artist | `12px muted` | unchanged size, recolor to `text-muted` |
| Duration | `13px muted` tabular | `text-[13px] text-muted font-mono tabular-nums` |

### 5.11 Playlist card with stacked tiles (`PlaylistCard.tsx` — new; Library grid)

Mockup `.pcard`: artstack `position: relative; height: 76px; border-radius: 16px; overflow: hidden;` with two 46px tiles at `left:10px; top:10px` and `left:30px; top:30px` (colors alternate `.tile`/`.tile.t2`), 1px `var(--art-border)`; title `13px/600` `margin-top: 4px`; count `11px muted mono`.

### 5.12 Hero card with glass chip (Home / Discovery)

Mockup `.hero-card`: `height: 128px; border-radius: 24px;` + art gradient + top-left mono tag. Chip `.hero-chip`: glass, `position: absolute; left: 10px; bottom: 10px; display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 14px; border-radius: 18px;` containing eyebrow (9px/600/0.1em uppercase muted), title (14px/700), and a 40px play button.

### 5.13 Back nav row (detail pages)

Mockup `.navrow`: `display: flex; align-items: center; gap: 10px; margin-bottom: 14px;` — `.back` 36px circle glass (`box-shadow: 0 0 0 0.5px var(--glass-border)`) with 18px chevron; `.navtitle` `17px/600/-0.01em`. Replaces `ArrowLeft` usages in `Playlist.tsx`, `Album.tsx`, `Artist.tsx`, `Track.tsx`.

### 5.14 Badges, mono tags, avatar, empty states, skeleton

- Badge/mono tag: `.wf-tag` recipe (§3.3) — used for placeholder art, "Always Fresh" badge in `Library.tsx` (restyle from `bg-[#ff5500]/10 border-[#ff5500]/30` to `bg-accent-soft text-accent` + mono).
- Avatar: mockup `.avatar` 38px glass circle (§4.4) — `Header.tsx` and `ArtistAvatar.tsx` get the glass ring behind their gradient fill.
- Empty states: centered muted copy (`text-muted text-sm`) + optional ghost tile; apply to queue empty, search no-results, library empty tabs.
- Skeleton: replace `Skeleton.tsx`'s `bg-white/5` blocks with the art-gradient placeholders for artwork and `bg-white/5 rounded` for text lines; add `animate-pulse` (exists).

### 5.15 Waveform (`Waveform.tsx`)

Add props: `playhead?: boolean` (renders the 2px playhead overlay) and `variant?: 'strip' | 'scrub' | 'card'` mapping to heights 9 / 44 / 14px and bar gaps 1.5 / 2 / 1px. Keep `interactive` + `onSeek` for PlayerBar, MobileFullPlayer, PlayerControls.

---

## 6. Screen-by-Screen Redesign

Legend: ✔ keep · ✎ restyle · ➕ new. All `bg-[#121212]` page containers become `bg-transparent` (the shell owns the wash + `--bg`).

### 6.1 Home — `src/pages/Discovery.tsx`

| Block | Current | Proposed (mockup 01) |
|---|---|---|
| Hero | Auto-rotating slide deck with cover + overlay text | ➕ Replace with static/gradient hero card: `h-[128px] rounded-hero` art gradient + `wf-tag` top-left + glass chip bottom-left (eyebrow 9px + title 14px/700 + 40px play). Keep the 6-slide rotation if desired by crossfading chips (framer-motion), keep `heroSlides`/`currentSlideIndex` state |
| Carousels | Card grids (`SoundCloudTrackCard`, 8px radii) | ✎ Two rails: "Recently Played" (`playHistory`) + "For You" (browse data), 112px cards per §5.3; `SectionHeader` with "See all" |
| Browse tiles | 6-tile `browseTiles` list | ✎ Render as the 2-col `bcard` grid per §5.7 (link to `/search?q=…`) |
| Popular tracks | `SoundCloudTrackCard` list | ✔ keep as track rows or cards; recolor accents |
| Sidebar | `SoundCloudSidebar` (desktop) | ✎ glass panel per §9.2 |
| Page container | `min-h-full text-white bg-[#121212] max-w-[1240px] mx-auto px-3 md:px-6` | ✎ `bg-transparent`; content wrapper `px-4 md:px-6 pt-[18px]` (mockup `18px 16px 0`) |

### 6.2 Search — `src/pages/Search.tsx` (mockup 02)

- Large title "Search" (34px/800) at top.
- ➕ `SearchField` (`h-[46px] rounded-[23px] glass`, 18px icon, 16px input) — currently the query input is inside the Header; on mobile keep Header's toggle but route focus to this field; the page keeps `useSearchParams`/`performSearch`.
- ➕ Chips row: `Moods / Genres / Top 100 / Charts / Indie / Focus` → map to the existing search tabs (`everything/tracks/people/albums/playlists`) or filter categories; active chip per §5.6.
- Browse grid per §5.7 when query empty (uses `browseData`).
- Results: keep infinite scroll (`useInfiniteScroll` + `lastElementRef`); render track rows (mockup 04 style §5.10) instead of only `SoundCloudTrackCard`s; album/playlist/artist hits as 112px cards.
- Recent searches (existing store `recentSearches`) as a chip row or small list above Browse.

### 6.3 Library — `src/pages/Library.tsx` (mockup 03)

| Element | Current | Proposed |
|---|---|---|
| Header | `h1 text-2xl md:text-3xl font-extrabold` + "Always Fresh" badge + filter pills | ✎ Large title 34px/800 with `Edit` (16px/500 `text-fg-2`) + 38px glass gear (opens Settings) in a `.title-row`; "Always Fresh" → mono accent badge |
| Filters | 6 count pills (`bg-[#ff5500]` active) | ✎ Chips per §5.6 (active `bg-glass-strong`); counts move into mono values on the grouped list |
| Grouped list | N/A (sections) | ➕ `GroupList` with 5 rows: Playlists / Artists / Albums / Songs / Downloaded — glyphs (Music, Users, Disc3, list, download icons), mono counts from store (`userPlaylists.length`, `followedArtists.length`, `savedAlbums.length`, `likedTracksData.length`, `dbService` downloads), chevrons |
| Playlist grid | `SoundCloudTrackCard` grid | ➕ `PlaylistCard` stacked-tile grid, 2 cols (`md:grid-cols-3 lg:grid-cols-4`), mono song counts |
| Sections | Likes/Albums/Following/History section blocks | ✔ keep as additional sections below the grid (they carry real data); restyle headers with `SectionHeader` |

### 6.4 Playlist — `src/pages/Playlist.tsx` (mockup 04)

- ➕ Nav row: 36px glass back + "Playlist" 17px/600.
- ➕ Horizontal hero (`pl-head`): 128px art (`rounded-[20px]`, art gradient fallback) + eyebrow (11px uppercase 0.08em) + title 24px/800/-0.02em + subtitle `13px muted` ("by Artist · N songs") + action row: 52px inverted play + "Shuffle" glass pill (`h-[44px] px-[18px] rounded-pill text-[15px] font-semibold text-fg-2`) — replaces current `Play`/`Shuffle`/`Heart`/`PlusCircle` row.
- ➕ Track list in a `.group glass` container: 50px rows per §5.10 with mono ranks, EQ indicator on the current row, durations; keep per-row actions via the existing `BottomSheet` (like/add-to-playlist/share/download).
- Keep: "More like this" rail (`Recommendations.tsx`) as carousel cards; user-playlist delete (restyle `Trash2` to `text-faint hover:text-accent`).

### 6.5 Now Playing — see §4.6 (mockup 05)

### 6.6 Settings — `src/components/SettingsModal.tsx` (mockup 06)

Recommendation: **promote the modal to a dedicated screen** at `/settings` (Library gear + Header gear + Profile menu navigate there), keeping the same store-backed controls. If the modal must stay (PWA feel), restyle it as a full-screen glass sheet (`rounded-t-[28px] glass`).

Structure per mockup 06:
- Title row: "Settings" (34px/800) + "Done" (`16px/500 text-fg-2`) → closes/back.
- Groups with mono uppercase headers (`ghead`: 11px, 0.09em, muted, `margin: 16px 8px 6px`):
  - **Playback:** Audio Quality (value row → chips/bottom sheet), Gapless Playback (switch), Crossfade (switch/value).
  - **Downloads:** Download Quality, Downloads on Wi-Fi only (switch), Storage (mono value).
  - **General:** Notifications, Theme, About (mono `v1.x.x`).
  - Keep existing power features in their own "Advanced" group: Pair code (copy button + mono code), Update yt-dlp, Fetch cookies, Clear cache — restyled as rows with mono value text and chevrons.
- Version footer: `text-[11px] text-muted mono text-center mt-[18px]`.

### 6.7 Secondary pages

| Page (`src/pages/`) | Keep | Changes |
|---|---|---|
| `Feed.tsx` | Feed cards, comments, `SoundCloudTrackCard` | Page bg transparent; cards → `rounded-card` with glass hover lift; accent recolor |
| `Profile.tsx` | Avatar, stats, track lists, likes | Avatar glass ring; large title; tabs → chips |
| `Album.tsx` | Album tracks, shuffle | **Legacy red cleanup:** `#FF0000` shuffle (line 155) → `text-accent border-accent`; green liked heart (line 205) → `text-accent`; hero → mockup 04 layout with 128px art |
| `Artist.tsx` | Artist header, tracks, related | Back nav row §5.13; hero art card |
| `Track.tsx` | Track detail, comments, video | Video player glass panel; EQ on current row; green badges → accent |
| `Collection.tsx` | `/collection/tracks` list | **Legacy red cleanup:** play button, EQ bars, titles `#FF0000` → accent/`on-accent` inversion |
| `ChartsSection.tsx` | Charts data | Rows per §5.10 in a `.group` |
| `Section.tsx` | Section pages | Carousel cards per §5.3 |
| `ArtistsPage.tsx` | Artist grid | 112px cards or 92px browse tiles |

---

## 7. Spacing & Typography System

### 7.1 Spacing rules

- **Screen padding:** `18px 16px 0` (mockup `.screen`); desktop widens to `24px` sides inside the content column (`max-w-[1240px]`).
- **Gaps:** rails/grids `12px`; row-internal `10–14px`; hero action rows `10px`; icon+label groups `8px` (chips, search field).
- **Floating chrome:** all fixed elements inset `16px` from edges; tab bar `bottom: 14px`; mini-player `bottom: 90px`; desktop player bar `bottom: 14px`; drawer `bottom: 88px`; safe-area: `bottom: calc(14px + env(safe-area-inset-bottom))` on the tab bar wrapper.
- **Content clearance:** main scroll area `pb-[168px]` mobile / `pb-[100px]` desktop (§4.1).
- Use the scale `4/8/10/12/14/16/18/20/24/32/44/52/64/90`; do not introduce off-scale sizes.

### 7.2 Type ramp (summary)

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Large title | 34px | 800 | -0.02em |
| Page hero title | 24px | 800 | -0.02em |
| Full-player title | 22px | 700 | -0.015em |
| Section header | 20px | 700 | -0.01em |
| Nav title | 17px | 600 | -0.01em |
| Row label / body | 16px | 500 | -0.01em |
| Track title | 15px | 500/700 | -0.01em |
| Chip / button | 14px | 500/600 | — |
| Card title | 12px | 600 | -0.005em |
| Meta | 11–13px | 400/500 | — |
| Eyebrow | 9–11px | 600 | 0.08–0.14em, uppercase |

### 7.3 Mono usage

`ui-monospace, "SF Mono", Menlo, Consolas, monospace` + `font-variant-numeric: tabular-nums` for: ranks, durations, timestamps, counts, storage/version values, eyebrow group headers, placeholder tags (`ART 1:1`). Never mono for titles or body copy.

### 7.4 Line length

Content columns cap at `1240px` (existing) with measure-friendly rails; single-line ellipsis (`truncate`) on all card/row titles — no wrapped titles inside cards.

---

## 8. Motion & Interaction

### 8.1 Press & hover states

- Buttons: `active:scale-95` (0.95); icon buttons `active:scale-90`; play buttons `active:scale-[0.96]`.
- Glass interactive surfaces (cards, chips, rows): `hover:brightness-110` (or `hover:bg-white/5` inside `.group`), sheen `::after` opacity 0.85 → 1 on hover.
- Duration: 150ms transitions (color/bg/shadow), 100ms transform — faster than the current `transition-all 0.2s`.

### 8.2 Active tab

Icon pill fades: `background-color 0.15s ease` + icon color crossfade; optional framer-motion layout-id on the `.tbg` pill for a sliding highlight between tabs (`motion.div layoutId="tab-pill"`).

### 8.3 Page transitions

Keep existing framer-motion patterns; add a subtle crossfade + `translateY(10px)` on route change (the `fadeIn` keyframes already exist in `index.css`; gate behind reduced-motion).

### 8.4 Waveform animations

- Playhead: `transition: left 0.1s linear` while scrubbing; smooth on seek (transform-based, not layout).
- EQ indicator: animate the 3 bars 8/14/10px heights with staggered loops (reuse `soundwave-1..4` keyframes in `index.css`); freeze at 50% height when paused; disable under `prefers-reduced-motion`.
- Mini-player strip: static colors (played=accent), no animation — it's a status bar, not a toy.

### 8.5 Mini-player ↔ full player morph

Keep the current spring slide-up (`y: '100%' → 0`, `type: 'spring', damping: 30, stiffness: 300`) and drag-down-to-collapse; restyle so both ends of the morph share the same glass + artwork radius (22px bar art 12px → full art 24px) so the transition reads as one surface expanding. The artwork crossfade on track change (`AnimatePresence mode="popLayout"` with x-slide) stays.

### 8.6 Reduced motion

Global kill-switch per §3.5; additionally: disable autoplay of hero slide rotation, EQ bar animation, and playhead glide.

---

## 9. Responsive & Desktop Adaptations

The mockups are phone-first; the app must not look like a phone frame on desktop.

### 9.1 Breakpoint strategy

Keep `md` (768px) as the mobile/desktop split and `fold` (660px) for narrow phones. The floating chrome adapts:
- `<md`: tab bar + mini-player (bottom 90px) + full-screen player.
- `md–lg`: tab bar hidden; floating mini-player stays (bar-style, 60px) or collapses into the desktop player bar; simplest: keep mini-player visible until `lg`.
- `≥lg`: desktop header + SoundCloudSidebar + floating player bar; mini-player and tab bar hidden.

### 9.2 Sidebar (`SoundCloudSidebar.tsx`) as glass panel

Convert the flat `bg-[#181818]` sidebar to a glass panel: `glass rounded-card p-3 w-60 sticky top-[72px] self-start` inside the `flex gap-8` layout, with nav items as 44px `lrow`-style rows (glyph 34px + label 16px/500, active row `bg-accent-soft text-accent`). The desktop player bar must not overlap it — add `lg:pl-[272px]` offset on the player bar or constrain the bar's inner `max-w` with `left-4 right-4 lg:left-[276px]`.

### 9.3 Grid density

- Carousels: rails stay rails at all sizes (that's the pattern).
- Browse tiles: `grid-cols-2 md:grid-cols-3 xl:grid-cols-4` (92px tiles grow to `h-[110px]` on xl).
- Library playlist grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` with 12px gaps.
- Home "popular" rows: two-column split at `xl` (rows + sidebar layout already exists).

### 9.4 Avoiding the phone-frame look

- On desktop, the hero becomes a wide 128px-tall band spanning the content column; chips and the browse grid spread naturally.
- The Now Playing screen on desktop is a centered column with the glass drawer beside it on `xl` (queue/lyrics as the right-side drawer, per §4.5).
- Fixed chrome keeps `16px` insets at every size; nothing docks to edges except the header.

### 9.5 Accessibility

| Requirement | Implementation |
|---|---|
| Focus visibility | `:focus-visible` 2px accent ring, offset 2px (§3.5) — applies to all rows, buttons, chips |
| Contrast | `--muted #9a9aa1` on `#111214` ≈ 6.4:1 (passes AA); `--faint #78797e` ≈ 4.6:1 on `#111214` (AA body text); never use `--faint` for text smaller than 13px; glass surfaces must keep the same effective contrast (blur behind text is fine — text sits on `--bg`-derived gradient) |
| Tap targets | ≥44px: all icon buttons (44px), rows (44–50px), tabs (64px bar), play buttons (40px min — bump small play to 44px hit area via padding) |
| Reduced motion | §8.6 |
| Safe areas | `env(safe-area-inset-bottom)` on tab bar wrapper + `pb-safe` utility where content scrolls |
| Semantics | `role="switch"` + `aria-checked` on switches; `role="slider"` + `aria-valuenow/min/max` on waveform scrubber (mockup 05 includes these attributes); `aria-label` on all icon-only buttons; `aria-current="page"` on active tabs |

---

## 10. Implementation Roadmap

Each phase is independently shippable and leaves the app functional.

### Phase 1 — Tokens (`src/index.css`, `tailwind.config.js`)

1. Add the `:root` block from §2.1; add the utility classes from §3 (`.glass`, `.wash`, `.wash-np`, `.art-ph`, `.wf-tag`, `.glow`, `:focus-visible`, reduced-motion).
2. Add Tailwind extension from §2.5.
3. No component changes; verify no regressions (existing arbitrary hex classes still work).

**Done when:** app renders unchanged; `npm run build` passes; `.glass` class visually verifiable on a test element.

### Phase 2 — Chrome (`AppLayout.tsx`, `Header.tsx`, `BottomNav.tsx`, `MobileMiniBar.tsx`, `PlayerBar.tsx`, `MobileFullPlayer.tsx`)

1. `AppLayout.tsx`: add `.wash`, swap `bg-[#121212]` → `bg-bg`, adjust main padding (§4.1).
2. New `FloatingTabBar.tsx` (§4.2); delete `BottomNav.tsx` or re-export the new component from the same file path to keep imports stable.
3. `MobileMiniBar.tsx` → floating glass 60px bar with top-edge waveform strip (§4.3).
4. `Header.tsx` → glass treatment, 46px pill search (§4.4).
5. `PlayerBar.tsx` → floating glass bar + glass drawer (§4.5).
6. `MobileFullPlayer.tsx` → mockup 05 structure (§4.6), keeping all actions.

**Done when:** all screens show glass chrome; mini-player strip reflects playback; drawer tabs work; no console errors; mobile `pb` clears the chrome.

### Phase 3 — Shared components (`GlassCard`, `PlayButton`, `CarouselCard`, `SectionHeader`, `SearchField`, `Chips`, `GroupList`, `GroupRow`, `Switch`, `TrackRow` rework, `PlaylistCard`, `HeroCard`, `BackNav`, `EmptyState`)

Build per §5; wire into existing call sites where the component contract matches (e.g., `TrackRow`, `SectionHeader` in Discovery/Search/Library). Extend `Waveform.tsx` with `playhead`/`variant` props (§5.15).

**Done when:** each component has at least one consumer; TypeScript strict passes (`npx tsc --noEmit`); visual QA on the 6 mockup screens.

### Phase 4 — Pages (`Discovery`, `Search`, `Library`, `Playlist`, `MobileFullPlayer` done in Phase 2, `SettingsModal`, then secondary)

1. `Discovery.tsx` (§6.1), `Search.tsx` (§6.2), `Library.tsx` (§6.3), `Playlist.tsx` (§6.4).
2. Settings: promote to `/settings` screen or restyle modal (§6.6) — keep every store call (`qualityPreference`, pair code, yt-dlp, cookies, cache clear).
3. Secondary pages per §6.7.

**Done when:** every route matches its mockup structure with real data; pull-to-refresh, infinite scroll, and keyboard shortcuts still function; PWA install still works.

### Phase 5 — Cleanup

1. Legacy accents: `Album.tsx` (`#FF0000` shuffle/heart), `Collection.tsx` (`#FF0000` play + EQ + titles), `PlayerControls.tsx` (green shuffle/repeat), `ProgressBar.tsx` (green hover fill), `CreatePlaylistModal.tsx` (`#FF0000` focus ring + button), `VideoPlayer.tsx` (`#FF0000` spinner), `TrackRow.tsx`/`MobileFullPlayer.tsx` green checks, `Library.tsx` red delete → all to `--accent`/`--accent-2` or `--faint` for destructive styling.
2. Delete unused variable families `--sc-*`, `--spotify-*`, `--nct-*` and the legacy `.sc-*` utilities after grepping for remaining consumers; keep the soundwave keyframes.
3. Remove dead `bg-[#121212]`/`bg-[#181818]`/`bg-[#222222]`/`border-white/5` occurrences; replace with tokens.

**Done when:** `rg "#FF0000|#ff0000|green-|bg-\[#121212\]|bg-\[#181818\]" src/` returns only intentional error/success states (login errors, download success), and `index.css` has a single token source of truth.

---

## 11. Risks & Trade-offs

| Risk | Mitigation |
|---|---|
| **`backdrop-filter` performance** on low-end Android/iOS | Blur only fixed chrome + small panels (§3.6); `@supports` fallback to opaque gradient; test on a mid-range Android with DevTools CPU throttle 6× |
| **Contrast of `--muted`/`--faint` on glass** | `#9a9aa1` on `#111214` is ≈6.4:1, `#78797e` ≈4.6:1; keep faint for decorative/disabled only; verify with axe |
| **Waveform interactivity** | Preserve `Waveform.tsx` API (`interactive`, `onSeek`, `played`) — the redesign only adds props; the scrubber playhead is an overlay, not a replacement |
| **Feature regression** | Redesign is class-level only; stores/services/APIs untouched; each phase has a "done" gate incl. tsc + build + manual QA of the preserved feature list (playlists, likes/reposts, downloads, lyrics karaoke, queue, comments, video, settings pair-code/quality/yt-dlp, infinite scroll, pull-to-refresh, haptics, keyboard shortcuts, safe areas, PWA) |
| **Browser support** | `backdrop-filter` needs `-webkit-` prefix (included); Firefox supports unprefixed since 103; add `@supports` fallback (§3.1) |
| **Floating desktop player bar changes layout expectations** | Docked → floating alters click paths and the drawer's bottom offset; update `bottom` coordinates of any overlays that previously assumed `bottom-14` (e.g., the drawer, modals) |
| **Inverted play buttons reduce accent visibility** | The glow (`shadow-glow-accent`) preserves brand color; active/shuffle/repeat states stay accent-colored |
| **Settings modal → screen migration** | If a full route is risky (auth-gated stores), ship the restyled modal first (Phase 4 step 2) and promote later — both are contained in `SettingsModal.tsx` |

### Testing checklist

- [ ] Mobile (375–430px): tab bar, mini-player strip, full player drag-down, safe-area insets on notched devices
- [ ] Desktop (1280–1920px): floating player bar, glass drawer, sidebar offset, grid density 2→3→4
- [ ] PWA: installable, offline cache of chrome styles
- [ ] Keyboard: space play/pause, arrows seek, escape closes drawer/modals, focus ring visible
- [ ] Reduced motion: all animations frozen, EQ static
- [ ] Contrast audit (axe) on grouped lists, chips, empty states
- [ ] `npx tsc --noEmit` + `npm run build` + smoke test of all 14 routes

---

*End of proposal. All hex/rgba/px values above were extracted directly from `mockups/01-home.html` … `mockups/06-settings.html`; current-state references were verified against `frontend-vite/src` at the time of writing.*
