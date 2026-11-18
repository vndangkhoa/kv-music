# YouTube Music Web (`music.youtube.com`) — Visual, CSS & Interactive Specification

> Reverse-engineered from live `https://music.youtube.com/` using REA (`rea@6.7.0`) against `/usr/bin/google-chrome` (Google Chrome `158.0.8127.36`), capturing full rendered DOM trees, accessibility trees, PNG viewports (`1440×900` desktop & `390×844` mobile), and the `1,462,485`-byte production CSS stylesheet + `615,407`-byte document shell.

---

## 1. REA Evidence Ledger & Capture Observations

### 1.1 Commands & Evidence IDs

| Capture Target | Scenario / Command | Viewport | Evidence ID | Notes / Verified Coverage |
|---|---|---|---|---|
| Initial Home Probe (Headless) | `rea capture-browser-scenario /tmp/ytm_home_scenario.json --json` | `1440×900` | `ev_55654d1dc3564f03d522dda0852fb596e5c385c47c397736adfc883e5ec9e027` | `headless: true` triggered YTM's `"Sorry, YouTube Music is not optimized for your browser"` deprecation gate (`HeadlessChrome` UA). Switched to `headless: false` for all subsequent captures. |
| Desktop Home + Full Network Assets | `rea capture-browser-scenario /tmp/ytm_home_scenario.json --json` (`headless: false`, `service_workers: "allow"`, `locale: "en-US"`, `color_scheme: "dark"`, `max_network_body_bytes: 8388608`) | `1440×900` | `ev_852f86ed51ed2b0d4ae4056e70c297b34eb4382a9b2dd5f9259a8d715e808c5d` | Full `ytmusic-app` DOM (`1,276,117` bytes), `708` network events, `1,462,485`-byte `ytmusicweb` stylesheet, `561,312`-byte `www-player.css`, `223,391`-byte browse payload, and `ytm_web_home.png`. |
| Exported Web Scripts | `rea export-web-scripts /tmp/browser-capture-home.json /tmp/ytm_web_scripts --json` | — | `ev_24c8ced0eaa1f82a88812286bff880593ce47d7a7042acc98405b36d45b6786c` | Exported retained JS modules (`scheduler.js`, `lottie-light.js`, `webcomponents-sd.js`, `player_es6/.../base.js`, `serviceworker-music-appshell.js`, etc.). Note: `music_polymer_inlined_html.js` exceeded the `8 MiB` per-body cap (`unavailable`). |
| Collapsed Guide + Explore + Search | `rea capture-browser-scenario /tmp/ytm_multi_scenario.json --json` | `1440×900` | `ev_f4b5cb99a79204d6f05b25653d4132d5936d16dce0163496ce39fcd8db57e83c` | Click `Guide` toggle -> collapsed `72px` mini rail (`ytm_web_wait_guide_collapsed.png`), `/explore` (`ytm_web_explore.png`), `/search?q=Son+Tung+M-TP` (`ytm_web_wait_search.png`). |
| Charts, Library, Artist, Album, Playlist, Watch + Miniplayer | `rea capture-browser-scenario /tmp/ytm_details_scenario.json --json` | `1440×900` | `ev_3da1abcc821b24a57ab917cb169e43f9a43dff100baf6f8823311fa9bd0df392` | `/charts` (`ytm_web_charts.png`), `/library` (`ytm_web_library.png`), `/channel/UC3muIvzjhubNpJ4Pn_0kCQw` (`ytm_web_artist.png`), `/browse/MPREb_MmsjzG8e4Ps` (`ytm_web_album.png`), `/playlist?list=PLLPbq...` (`ytm_web_playlist.png`), `/watch?v=2Zvx2cn37HQ` (`ytm_web_watch.png`), Home with docked `ytmusic-miniplayer` (`ytm_web_home_with_player.png`). |
| Full Multi-Track Album & Music Playlist | `rea capture-browser-scenario /tmp/ytm_final_scenario.json --json` | `1440×900` | `ev_aa47d4a5410efdf7682322d0b3cba3c919db6d564f45f36b1816fdd89cfe93da` | Multi-track `m-tp M-TP` album (`ytm_web_full_album.png`), `Daily Top Music Videos - Vietnam` chart playlist (`ytm_web_music_playlist.png`). (`click_lyrics` timed out on `xypzMU5mMPY` because that video had `disabled` Lyrics tab). |
| Split Player Page Tabs (`UP NEXT`, `RELATED`, `LYRICS`) | `rea capture-browser-scenario /tmp/ytm_player_tabs_scenario.json --json` | `1440×900` | `ev_f37991bc2bc8986587fda6d280ae40e4dfc93448d2316f8236e37e1069506ceb` | `/watch?v=N_Ve7fRHnTc&list=RDAMVMN_Ve7fRHnTc`: `UP NEXT` (`ytm_web_track_init.png`), `RELATED` (`ytm_web_related.png`), `LYRICS` (`ytm_web_lyrics.png`). |
| Mobile Responsive (`390×844`) | `rea capture-browser-scenario /tmp/ytm_mobile_scenario.json --json` | `390×844` | `ev_d2cbfaf2ff19693fb85a7e6aed9bb91d3c808df62319eb72a5aa1daaa24c9c47` | Mobile Home (`ytm_web_mob_home.png`), Mobile Explore (`ytm_web_mob_explore.png`), Mobile Search (`ytm_web_mob_search.png`), Mobile Full Player (`ytm_web_mob_watch.png`). |

### 1.2 Saved Verification Screenshots

All captured PNGs are stored under `/home/khoavo/.gemini/antigravity/brain/4b0a97fd-5f4f-4598-ac8c-35d0ea250b50/scratch/`:
- Desktop (`1440×900`): `ytm_web_home.png`, `ytm_web_wait_guide_collapsed.png`, `ytm_web_explore.png`, `ytm_web_wait_search.png`, `ytm_web_charts.png`, `ytm_web_library.png`, `ytm_web_artist.png`, `ytm_web_album.png`, `ytm_web_full_album.png`, `ytm_web_playlist.png`, `ytm_web_music_playlist.png`, `ytm_web_watch.png`, `ytm_web_home_with_player.png`, `ytm_web_track_init.png`, `ytm_web_related.png`, `ytm_web_lyrics.png`
- Mobile (`390×844`): `ytm_web_mob_home.png`, `ytm_web_mob_explore.png`, `ytm_web_mob_search.png`, `ytm_web_mob_watch.png`

### 1.3 Transparent Capture Scope Notes
1. **Unauthenticated Guest Session**: Captures ran in a clean profile without Google login. Consequently, the left guide rendered `ytmusic-guide-signin-promo-renderer` below the divider instead of the authenticated `New playlist` pill (`#buttons.ytmusic-guide-section-renderer`) + saved playlist entries (`ytmusic-guide-entry-renderer:not([is-primary])`), and `/library` rendered the signed-out empty state. CSS geometry and typography for signed-in guide playlists, `New playlist` button, and Library grid (`ytmusic-grid-renderer[grid-type=library]`) were extracted directly from the live `ytmusicweb` stylesheet (`1,462,485` bytes).
2. **Pre-Roll Ads & Dual Player Bar Implementation**: Live unauthenticated `/watch` navigations triggered short pre-roll ads in `ytmusic-miniplayer` (`is-wiz-miniplayer-enabled` desktop variant) and `ytmusic-player-page`. Both the **classic 3-zone `ytmusic-player-bar`** CSS rules (left transport + timer, center metadata + thumbs/menu, right volume + repeat + shuffle + expand chevron) and the **2026 `ytmusic-miniplayer` Wiz variant** CSS rules (left `ytmusic-track-info`, center `ytmusic-wiz-player-controls`, right actions) were extracted verbatim and documented in §5.
3. **No CAPTCHA / Bot Gates Encountered**: No CAPTCHA or interactive consent gate blocked `headless: false` captures.

---

## 2. Design Tokens, Colors & Typography

### 2.1 Verified CSS Custom Properties (from `ytmusicweb` stylesheet on `html[dark="true"]`)

Live `<html lang="en" dir="ltr" dark="true" class="inactive-player no-focus-outline">` does **not** set `[music-web-color-migration]`; it resolves tokens from the primary `html` palette:

```css
:root {
  /* ── Surface & Canvas Palette ── */
  --ytmusic-color-black4: #030303;            /* Primary page canvas & nav-bar base */
  --ytmusic-color-black2: #181818;            /* Elevated surface cards / footer */
  --ytmusic-color-black1: #212121;            /* Player bar, menus, dialogs, dropdowns */
  --ytmusic-color-blackpure: #000000;
  --ytmusic-background: #030303;              /* var(--ytmusic-general-background-c) */
  --ytmusic-nav-bar: #030303;                 /* Solid #030303 on scroll / player-page-open */
  --ytmusic-player-bar-background: #212121;   /* Docked bottom player bar */
  --ytmusic-player-page-background: #030303;  /* Split player page background */
  --ytmusic-brand-background-solid: #212121;
  --ytmusic-menu-popup-background: #212121;
  --ytmusic-dialog-background-color: #212121;
  --ytmusic-dropdown-background: #212121;
  --ytmusic-detail-header: #030303;

  /* ── Brand & Accent Palette ── */
  --ytmusic-static-brand-red: #ff0033;        /* #f03 — progress bar, scrubber knob, live dot */
  --ytmusic-color-youtubered: #ff0000;        /* #f00 — YTM logo circle */
  --ytmusic-playback-progress-color: #ff0033; /* #f03 */
  --ytmusic-progress-gradient: linear-gradient(to right, #ff0033 80%, #ff2791 100%);
  --ytmusic-miniplayer-progress-gradient-end: #ff007f;
  --ytmusic-subscribe-button-color: #ff5577;  /* #f57 outline & text */
  --ytmusic-call-to-action: #3ea6ff;          /* Focus/active links & toggle active */
  --ytmusic-static-ad-yellow: #fbc02d;
  --ytmusic-themed-green: #2ba640;            /* Chart rank up ▲ */

  /* ── Text & Icon Hierarchy ── */
  --ytmusic-text-primary: #ffffff;            /* CSS var resolves #fff / #f1f1f1 */
  --ytmusic-text-primary-inverse: #030303;    /* Dark text on white pill CTAs (#0f0f0f on nav CTA) */
  --ytmusic-text-secondary: #aaaaaa;          /* Secondary metadata */
  --ytmusic-overlay-text-secondary: rgba(255, 255, 255, 0.7);
  --ytmusic-text-disabled: #717171;
  --ytmusic-overlay-text-disabled: rgba(255, 255, 255, 0.3);
  --ytmusic-icon-inactive: #909090;
  --ytmusic-icon-disabled: #606060;
  --ytmusic-inactive-tab: rgba(255, 255, 255, 0.5);

  /* ── Translucent Surfaces, Borders & Interactive States ── */
  --ytmusic-ten-percent-layer: rgba(255, 255, 255, 0.1);
  --ytmusic-divider: rgba(255, 255, 255, 0.1);
  --ytmusic-guide-divider: rgba(255, 255, 255, 0.15);
  --ytmusic-guide-hover: rgba(255, 255, 255, 0.2);      /* Active entry bg: rgba(255,255,255,0.1) */
  --ytmusic-search-bar-background-bauhaus: rgba(255, 255, 255, 0.15); /* Visual ~0.10–0.15 over #030303 */
  --ytmusic-search-bar-border-bauhaus: rgba(255, 255, 255, 0.15);
  --ytmusic-badge-chip-background: rgba(255, 255, 255, 0.1);
  --ytmusic-badge-chip-inactive-hover: rgba(255, 255, 255, 0.2);
  --ytmusic-explore-chip-background: rgba(255, 255, 255, 0.15);
  --ytmusic-immersive-carousel-button-border: rgba(255, 255, 255, 0.3); /* Carousel arrows use rgba(255,255,255,0.2) */
  --ytmusic-overlay-button-secondary: rgba(255, 255, 255, 0.1);
  --ytmusic-overlay-button-primary: rgba(255, 255, 255, 0.3);
  --ytmusic-row-hover: rgba(255, 255, 255, 0.05);
  --ytmusic-overlay-background-medium: rgba(0, 0, 0, 0.6);

  /* ── Chrome Dimensions (Desktop defaults) ── */
  --ytmusic-nav-bar-height: 64px;
  --ytmusic-player-bar-height: 72px;          /* 64px when max-width: 935px */
  --ytmusic-guide-width: 240px;               /* 72px collapsed / <=1149px; 0px <=615px */
  --ytmusic-base-page-padding-bottom: 112px;
  --ytmusic-scrollbar-width: 12px;            /* Linux Chrome measured 15px */
  --ytmusic-divider-height: 24px;             /* 16px on <=615px */

  /* ── Typography ── */
  --ytmusic-standard-text-font-family: 'Roboto', 'Noto Naskh Arabic UI', Arial, sans-serif;
  --ytmusic-display-text-font-family: 'YouTube Sans', 'YT Sans', var(--ytmusic-standard-text-font-family);
  --ytmusic-title-line-height: 1.2;
  --ytmusic-body-line-height: 1.4;
}
```

### 2.2 Font Loading & Type Scale

Live `<head>` loads:
- `https://fonts.googleapis.com/css?family=YouTube+Sans:500,700`
- `https://fonts.googleapis.com/css?family=YT+Sans:500,700`
- `https://fonts.googleapis.com/css?family=Roboto:300,400,500,700`
- `https://fonts.googleapis.com/css?family=Roboto+Mono:400,700`

*(Note: kv-music already extracted `YTSans-Bold.otf` and `YTSans-Medium.otf` into `android-app/app/src/main/res/font/`. For `frontend-vite`, load Google Fonts `Roboto` + `Roboto Mono` + `YouTube Sans` or map `--font-display` to `'YouTube Sans', 'YT Sans', 'Roboto', sans-serif` with Google Fonts / local `.otf` `@font-face` fallback.)*

| Token / Role | Font Family | Weight | `<=1149px` | `1150–1363px` | `1364–1577px` | `>=1578px` | Line Height | Color |
|---|---|---|---|---|---|---|---|---|
| `Display 1` (Section/Album/Page H1) | `YouTube Sans` | `700` | `24px` | `28px` | `34px` | `45px` | `1.2` | `#FFFFFF` |
| `Display 2` (Card Shelf / Modal / Explore Cards) | `YouTube Sans` | `700` | `20px` | `24px` | `24px` | `24px` | `1.2` | `#FFFFFF` |
| `Immersive Header Title` (Artist Hero) | `YouTube Sans` | `700` | `24px` (`<=599px`) / `28px` | `28px` | `28px` | `28px` | `38px` (`32px` mobile) | `#FFFFFF` |
| `Guide Primary Link` (`Home`, `Explore`, `Library`) | `Roboto` | `500` | `16px` (`tp-yt-paper-item`) / `10px` collapsed | `16px` | `16px` | `16px` | `24px` (`12px` collapsed) | `#FFFFFF` |
| `Section Eyebrow` (`TOP TUNES RIGHT NOW`) | `Roboto` | `400` | `14px` | `14px` | `16px` | `16px` | `1.2` | `#AAAAAA` (`uppercase`) |
| `Responsive Body / Card Title` | `Roboto` | `500` | `14px` | `14px` | `16px` | `16px` | `1.2` | `#FFFFFF` (`#F1F1F1`) |
| `Responsive Subtitle / Artist / Plays` | `Roboto` | `400` | `14px` | `14px` | `16px` (or `14px` in album rows) | `16px` (`14px` album rows) | `1.2` | `rgba(255,255,255,0.7)` |
| `Search Input` | `Roboto` | `400` | `16px` | `16px` | `16px` | `16px` | `22px` | `#FFFFFF` / placeholder `rgba(255,255,255,0.5)`–`#AAA` |
| `Chips / Pills / Action Buttons` | `Roboto` | `400`–`500` | `14px` | `14px` | `14px` | `14px` | `20px` | `#FFFFFF` (inactive) / `#030303` (active) |
| `Caption / Duration / Collapsed Guide` | `Roboto` | `400` | `12px` (`10px` rail) | `12px` | `12px` | `12px` | `18px` (`12px` rail) | `#AAAAAA` |

---

## 3. Global App Shell & Responsive Breakpoint System (`ytmusic-app-layout`)

### 3.1 Exact Responsive Breakpoint Matrix

Extracted directly from `ytmusicweb` CSS `@media` rules:

| Breakpoint Width | Guide Rail (`--ytmusic-guide-width`) | Content Width (`--ytmusic-content-width`) | Player Bar Height | Carousel Cards / Row | Library Columns | Search Width |
|---|---|---|---|---|---|---|
| `<= 439px` (Small Mobile) | `0px` (hidden; hamburger opens drawer / mobile bottom nav) | `calc(100vw - 32px)` (`16px` side padding) | `64px` | `160px` card, `16px` gap | `2` | `100%` |
| `440px – 615px` (Mobile) | `0px` | `calc(100vw - 32px)` | `64px` | `160px` card, `16px` gap | `3` | `100%` |
| `616px – 759px` (Small Tablet) | `72px` (forced collapsed mini rail) | `calc(100vw - 112px - 72px)` | `64px` | `180px` card, `16px` gap | `4` | `560px` |
| `760px – 935px` (Tablet) | `72px` (mini rail) | `calc(100vw - 112px - 72px)` | `64px` | `180px` card, `16px` gap | `5` | `560px` |
| `936px – 1149px` (Compact Desktop) | `72px` (auto-collapsed mini rail; toggleable overlay) | `calc(100vw - 112px - 72px)` | `72px` | `180px` card, `16px` gap | `5` | `720px` |
| `1150px – 1363px` (Standard Desktop) | `240px` expanded / `72px` collapsed | `1050px` (`calc(100vw - 200px - guide)` max) | `72px` | `5` square cards / row (`24px` gap) | `6` | `860px` |
| `1364px – 1577px` (**`1440px` Target Desktop**) | `240px` expanded / `72px` collapsed | **`1264px`** (or `min(100vw - 200px - guide, 1478px)`) | `72px` | **`6` square cards / row** (`24px` gap), `3` list cols | `7` | `860px` (or `480px` idle bar) |
| `1578px – 1799px` (Wide Desktop) | `240px` expanded / `72px` collapsed | `1478px` (max cap) | `72px` | `6` square cards / row (`24px` gap) | `8` | `860px` |
| `>= 1800px` (Ultrawide) | `240px` expanded / `72px` collapsed | `1478px` | `72px` | `6` square cards / row (`24px` gap) | `9` | `860px` |

### 3.2 Shell Layering & Z-Index Stack

```
+---------------------------------------------------------------------------------+
| ytmusic-nav-bar (fixed top:0, left:0, right:0, height:64px, z-index:50/5)       |
|  [≡ 40×40] [▶ Music]        [ 🔍 Search songs, albums...      ]   [Cast][⋮][CTA] |
+------------+--------------------------------------------------------------------+
| ytmusic-   | Main Scroll Canvas (#content)                                      |
| guide-     | - margin-left: var(--ytmusic-guide-width) (240px / 72px / 0px)     |
| renderer   | - padding-top: 64px                                                |
| (fixed     | - padding-bottom: 112px (+ 72px when player bar visible)           |
|  left:0,   | - content centered in max-width: var(--ytmusic-content-width)      |
|  top:64px, |                                                                    |
|  w:240/72) |  [ytmusic-player-page overlay slides up from bottom over content:  |
|            |   fixed top:64px, left:guide-width, bottom:72px, z-index:20]       |
+------------+--------------------------------------------------------------------+
| ytmusic-player-bar (fixed bottom:0, left:0, right:0, height:72px, bg:#212121)   |
| ======[3px #FF0033->#FF2791 top-edge scrubber + 12px hover knob]=============== |
|  [|<][ ▶ ][>|]  1:24 / 4:18   |  [40×40] Title / Artist [👎][👍][⋮] |  [🔊][🔁][🔀][▲] |
+---------------------------------------------------------------------------------+
```

- **Scroll-reactive Nav & Guide Divider**: At `scrollTop === 0` (`!content-scrolled`), `#nav-bar-background` and `#mini-guide-background` are `opacity: 0` (letting artist/album/explore blurred ambient headers bleed seamlessly behind the top `64px` bar!). Once scrolled (or when `player-page-open`), `#nav-bar-background` transitions `opacity: 1` (`0.2s`), revealing `#030303` background + `1px solid rgba(255,255,255,0.15)` bottom border and guide right border (`1px solid rgba(255,255,255,0.1)`).

---

## 4. Chrome Component Specifications

### 4.1 Top Navigation Bar (`ytmusic-nav-bar`)
**Height**: `64px` (`--ytmusic-nav-bar-height`). **Padding**: `0 16px` (or `left-content` `padding-left: 16px`, `width: var(--ytmusic-guide-width)` when expanded).

1. **Left Group (`.left-content`)**:
   - **Hamburger Guide Button** (`button[aria-label="Guide"]`): `40px × 40px`, `padding: 8px`, `margin-right: 12px`, `border-radius: 50%`, `color: #f1f1f1`, hover `bg-white/10`. Icon `24px × 24px` 3-bar menu.
   - **Brand Logo (`ytmusic-logo`)**: `height: 24px`. Red circular emblem (`#FF0000`, white play ring + triangle) + `"Music"` bold wordmark (`#FFFFFF`, ~`20px` tight tracking). Clicking navigates to `/`.
2. **Center Search Box (`ytmusic-search-box`)**:
   - **Desktop (`>= 616px`)**: `width: 100%; max-width: 480px; height: 40px;` (`margin-left` aligned cleanly to content start or `100px` from left-content, centered on `>= 1578px` or `is-search-page` up to `860px`).
   - **Container styling**: `border-radius: 8px`, `background: rgba(255, 255, 255, 0.1)` (stylesheet token `rgba(255,255,255,0.15)`), `border: 1px solid rgba(255, 255, 255, 0.15)`.
   - **Focus / Opened state**: `background: #030303`, `box-shadow: 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.4)`. If dropdown suggestions open: top container `border-radius: 8px 8px 0 0`, suggestion list (`#suggestion-list`) attaches at `top: 40px` with `border-radius: 0 0 8px 8px`, `padding: 8px 0`, `border: 1px solid rgba(255,255,255,0.15)`, `background: #030303`.
   - **Inner controls**:
     - Left magnifying glass button: `32px × 32px`, `margin: 4px 10px`, icon `18px × 18px`, color `#AAAAAA` (hover `#FFFFFF`).
     - `<input>`: `font-size: 16px`, `line-height: 22px`, `font-weight: 400`, `color: #FFFFFF`, placeholder `"Search songs, albums, artists, podcasts"` in `rgba(255,255,255,0.5)` / `#AAAAAA`.
     - Clear (`×`) button (`#clear-button`): visible only when query non-empty (`32px × 32px`, right-aligned).
   - **Mobile (`<= 615px`)**: Collapses into a bare `40px` magnifying-glass icon button in `.right-content` (`background: transparent; border: none`). Clicking/tapping opens full-width overlay search bar (`left: 16px; right: 16px`, `background: #030303`) with `←` back button + input + `×` clear button.
3. **Right Actions (`.right-content`)**:
   - `padding-right` `100px` on wide desktop? *(Note: in `ytm_web_home.png`, right-content sits near right edge with ~`16px–24px` right margin; `.right-content` has `z-index: 1; display: flex; align-items: center; gap: 8px`)*.
   - **Items** (self-hosted mapping): Cast / Output device button (`40px` circle icon, optional in self-hosted), Settings / Overflow `⋮` (`40px × 40px`, `hover:bg-white/10`, `rounded-full`), and User/Sign-in pill (`height: 32px`, `px-4`, `rounded-[16px]`, `bg-[#f1f1f1] text-[#0f0f0f] text-[14px] font-medium` when logged out, or `26px` circular user avatar when signed in).

### 4.2 Left Navigation Guide (`ytmusic-guide-renderer`)
Fixed left column below `ytmusic-nav-bar` (`top: 64px`, `height: calc(100vh - 64px)`, `padding-top: 8px`, `padding-bottom: calc(8px + var(--ytmusic-player-bar-height))`, `border-right: 1px solid rgba(255,255,255,0.1)` when scrolled or always subtly delimited).

1. **Expanded State (`240px` wide, `>= 1150px` when open)**:
   - **Primary Section** (`padding: 0 8px`):
     - Entries: `Home` (`/`), `Explore` (`/explore` or `/feed`), `Library` (`/library`) — plus optional `Charts` (`/charts`) if exposed in self-hosted nav.
     - Item box (`tp-yt-paper-item`): `min-height: 48px`, `padding: 0 16px`, `border-radius: 8px`, `display: flex; align-items: center`.
     - Icon: `24px × 24px`, `margin-right: 20px` (filled variant when `active`, outline variant when inactive).
     - Label: `16px` (`font-weight: 500`, `line-height: 24px`, `#FFFFFF`).
     - States: Default `transparent`, Hover `rgba(255, 255, 255, 0.1)`, Active (`[active]`) `rgba(255, 255, 255, 0.1)`.
   - **Divider (`#divider`)**: `width: 192px`, `margin: 24px auto`, `border-top: 1px solid rgba(255, 255, 255, 0.15)`.
   - **Secondary Section (`padding: 0 4px`)**:
     - **Signed-in `+ New playlist` Pill** (`#buttons`): `width: 192px` (`100%` within `padding: 0 16px`), `height: 36px`, `border-radius: 18px` (`9999px`), `background: rgba(255,255,255,0.1)`, hover `rgba(255,255,255,0.2)`, `+` icon (`20px`) + `"New playlist"` (`14px`, `font-weight: 500`), `margin-bottom: 16px`.
     - **Playlist Items (`ytmusic-guide-entry-renderer:not([is-primary])`)**: `max-height: 56px`, `padding: 4px 16px`, `border-radius: 8px`, title `14px` (`font-weight: 500`, `line-height: 18px`, `#FFFFFF`), subtitle `12px` (`line-height: 16px`, `rgba(255,255,255,0.7)` — e.g. `"Auto playlist"` or creator name). On hover/focus: `padding-right: 50px` and a `24px × 24px` white circular Play button appears at `right: 16px` (`#FFFFFF` fill, `#030303` play icon).
     - *(Signed-out fallback seen in `ytm_web_home.png`)*: `Sign in` pill (`height: 36px`, `bg-white/10 rounded-full`) + `12px` muted caption (`#AAAAAA`) below (`padding: 0 24px`).
2. **Collapsed Mini Guide State (`72px` wide, toggled via Hamburger or auto at `616px–1149px`)**:
   - **Primary Items (`[is-collapsed]`)**: `padding: 12px 0`, `border-radius: 8px`, `margin: 0 4px` (or `padding: 0 8px` section), vertical stack centered: `24px` icon (`margin: 0 0 5px`) + `10px` label (`line-height: 12px`, `font-weight: 400`, `#FFFFFF`). Active item gets `rgba(255,255,255,0.1)` `8px`-rounded pill box.
   - Secondary playlist section + divider + `New playlist` button are **hidden** (`display: none`).
3. **Mobile Breakpoint (`<= 615px`)**:
   - Guide rail hides (`width: 0`). Clicking hamburger opens a slide-over drawer (`240px` wide) OR mobile uses bottom navigation (`BottomNav` on kv-music PWA). Note: Live YTM web keeps `Home / Explore / Library` inside the slide-out drawer on mobile (`ytm_web_mob_home.png`), while kv-music PWA additionally supports `BottomNav` (`56px` height) — keep `BottomNav` YTM-styled (`#030303`/`#212121`, active `#FFFFFF` filled icons, inactive `#909090` outline icons, `10px` labels, NO SoundCloud orange).

---

## 5. Bottom Player Bar (`ytmusic-player-bar`) & Miniplayer

### 5.1 Bar Geometry & Top-Edge Scrubber (Shared Across Both Variants)
- **Container**: Fixed `bottom: 0; left: 0; right: 0; z-index: 50;`
- **Height**: `72px` on desktop (`>= 936px`), `64px` on tablet/mobile (`<= 935px`).
- **Background**: `#212121` (`--ytmusic-player-bar-background`), `color: #AAAAAA`.
- **Full-Width Top-Edge Red Progress Scrubber (`#progress-bar`)**:
  - Positioned along the **top border** of the `72px` bar (`position: absolute; top: 0; left: 0; right: 0; transform: translateY(-50%); cursor: pointer; z-index: 10`).
  - **Hit area**: invisible `14px–16px` vertical hit target centered on `top: 0` so pointer hover/scrubbing is effortless.
  - **Visual track**:
    - Default height: `2px`–`3px`.
    - Hover / Focus height: expands smoothly (`150ms ease-out`) to `4px`–`5px`.
    - Unplayed background track: `rgba(255, 255, 255, 0.1)`.
    - Buffered track: `rgba(255, 255, 255, 0.25)`–`rgba(255, 255, 255, 0.3)`.
    - Active played fill: `linear-gradient(to right, #FF0033 80%, #FF2791 100%)` (classic `#f03 -> #ff2791`; Wiz miniplayer `#f03 -> #ff007f`).
  - **Scrubber Knob (Hover Dot)**:
    - `12px × 12px` circle (`border-radius: 50%`), `#FF0033` (`#f03`), `box-shadow: 0 0 2px rgba(0,0,0,0.25)`.
    - `opacity: 0` by default; `opacity: 1` when hovering the bar/scrubber or focused/dragging!
  - **Hover Time Tooltip (`#hover-time-info`)**:
    - Appears `8px` above cursor (`top: -8px; transform: translate(-50%, -100%)`), `padding: 4px 8px`, `border-radius: 2px`, `background: #212121` (or `#000`), `color: #FFFFFF`, `font-size: 12px`, `line-height: 18px`, `tabular-nums`.

### 5.2 Classic 3-Zone Desktop Layout (`ytmusic-player-bar`)
CSS Grid: `grid-template-columns: auto 1fr auto` (`0fr 1fr 0fr` / `minmax(0,1fr) auto minmax(0,1fr)`), `grid-template-areas: "start middle end"`, `align-items: center`.

1. **Left Zone (`.left-controls`)**:
   - Transport buttons (`color: #F1F1F1`, `36px × 36px` hit targets, `24px` icons, `hover:bg-white/20 rounded-full`):
     - **Previous** (`SkipBack` filled)
     - **Play / Pause** (`40px` or `52px` clickable hit target, `32px–40px` white filled Play/Pause icon — or white circle / large icon; no orange!)
     - **Next** (`SkipForward` filled)
   - **Time Info (`.time-info`)**: `12px` (`14px` in Wiz), `font-weight: 400`, `color: #AAAAAA`, `margin: 0 16px 0 8px`, `white-space: nowrap`, `tabular-nums` (`1:24 / 4:18`). Hidden below `935px` / `1200px` container width.
2. **Center Zone (`.middle-controls`)**:
   - **Thumbnail (`.image`)**: `40px × 40px` (`48px` in Wiz), `border-radius: 2px`, `object-fit: cover` (or `16:9` aspect when playing a music video). Clicking artwork/empty space toggles `ytmusic-player-page`.
   - **Track Metadata (`.content-info-wrapper`)**: `margin: 0 8px 0 16px`, vertical stack (`min-width: 0`, `overflow: hidden`):
     - Line 1 (`.title`): `14px` (`16px` at `>=1364px`), `font-weight: 500`, `color: #FFFFFF`, `truncate`.
     - Line 2 (`.byline`): `14px`, `font-weight: 400`, `color: rgba(255, 255, 255, 0.7)`, `truncate`, separated with ` • ` (`Artist • Album • Year`). Clickable artist/album links underline on hover.
   - **Feedback & Overflow (`.middle-controls-buttons`)**:
     - **Thumbs Down** (`ThumbsDown`, `36px` circle, `#AAAAAA` -> `#FFFFFF` if disliked)
     - **Thumbs Up** (`ThumbsUp`, `36px` circle, `#AAAAAA` -> `#FFFFFF` filled if liked)
     - **More Menu (`⋮`)** (`36px` circle, `#AAAAAA`, opens track action menu: Start radio, Play next, Add to queue, Save to playlist, Go to album/artist, Download).
3. **Right Zone (`.right-controls`)**:
   - **Volume Control**:
     - Classic: Horizontal `100px` slider (`opacity: 0` -> `opacity: 1` when hovering the volume area; active `#FFFFFF`, track `#909090`, white circular thumb) + Mute/Volume icon (`36px` circle). *(Wiz 2026 variant alternatively shows a vertical `48px × 136px` rounded-full `#212121` popup pill above the volume icon on hover/click).*
   - **Repeat** (`Repeat` / `Repeat1` icon, `36px` circle; active `#FFFFFF`, disabled/off `rgba(255,255,255,0.3)` / `#717171`).
   - **Shuffle** (`Shuffle` icon, `36px` circle; active `#FFFFFF`, inactive `#AAAAAA`).
   - **Expand / Collapse Player Page Toggle (`.toggle-player-page-button`)**:
     - `36px × 36px` (or `56px` hit area), up-pointing filled triangle/chevron (`▲` when closed -> rotates `180deg` smoothly `0.3s ease-in-out` to `▼` when `ytmusic-player-page` is open!).
   - *(Note on 2026 Live Desktop Wiz Miniplayer variant captured in `ytm_web_watch.png` / `ytm_web_home_with_player.png`)*: Live 2026 desktop can also place `ytmusic-track-info` (`48×48` thumb + title + artist) in Left Zone, centered `Shuffle | Prev | Play/Pause | Next | Repeat` (`gap: 16px`, `48×48` control buttons) in Middle Zone, and `Thumbs | CC | Volume | ⋮ | Expand ▲` in Right Zone (`column-gap: 50px`). For kv-music, **implement the classic 3-zone `ytmusic-player-bar` specified above** (Left Transport + Timer | Center Art + Metadata + Thumbs/Menu | Right Volume + Repeat + Shuffle + Expand Chevron) so it matches the target layout contract cleanly without SoundCloud waveform clutter.

### 5.3 Mobile Mini Bar (`<= 615px` / `<= 935px` `[is-mweb-player-bar-modernization-enabled]`)
- `height: 64px`, `background: #212121` (or `#030303` / `#181818` above `BottomNav` if `BottomNav` is retained).
- `1px` top progress line (`#FFFFFF` or `#FF0033` active on `rgba(255,255,255,0.2)` track, no thumb).
- **Left**: `48px × 48px` rounded-`4px` artwork (`margin-left: 16px`), stacked Title (`14px` medium `#FFFFFF`, `margin-bottom: 4px`) + Artist (`14px` `rgba(255,255,255,0.7)`).
- **Right**: `Cast` (optional) + `Play / Pause` (`48px`–`56px` hit area, `24px` white icon) + `Next` (`48px` hit area, `24px` white icon). Tapping anywhere else on the mini bar opens the full-screen Mobile Player Page.

---

## 6. Split Player Page (`ytmusic-player-page`)

### 6.1 Desktop Split View (`>= 936px`)
Slides up (`transform: translate3d(0, 100vh, 0)` -> `translateZ(0)`, `0.3s cubic-bezier(0.2, 0, 0.6, 1)`) filling `top: 64px; bottom: 72px; left: var(--ytmusic-guide-width); right: 0; background: #030303`.

- **Outer Content Padding & Gap**:
  - `936–1149px`: `padding: 24px 48px 0`, `gap: 48px`, `.side-panel` width `40%`.
  - `1150–1363px`: `padding: 32px 56px 0`, `gap: 56px`, `.side-panel` width `36%`.
  - `1364–1577px` (`1440px`): `padding: 40px 56px 0`, `gap: 56px`, `.side-panel` width `36%` (`max-width: 800px`).
  - `>= 1578px`: `padding: 48px 64px 0`, `gap: 64px`, `.side-panel` width `36%`.
  - `>= 1800px`: `padding: 64px 96px 0`, `gap: 96px`, `.side-panel` width `36%`.

- **Left Panel (`#main-panel`, `flex: 1`)**:
  - **Song / Video Switcher (`ytmusic-av-toggle`)**: Centered above artwork (`padding-bottom: 24px–40px`).
    - Container `.av-toggle`: `display: inline-flex; background: rgba(255,255,255,0.1); border-radius: 100px; padding: 2px` (or `border-radius: 100px`).
    - Buttons (`Song` / `Video`): `padding: 9px 13px` (or `0 16px`, `height: 32px`), `border-radius: 100px`, `14px` medium (`Roboto`), active state `background: rgba(255,255,255,0.1)` / `#282828`, `color: #FFFFFF`; inactive `color: rgba(255,255,255,0.5)`, hover `rgba(255,255,255,0.1)`. Disabled state `color: rgba(255,255,255,0.25)`.
  - **Artwork / Video Canvas (`#player`)**:
    - `max-width: 800px`, centered vertically and horizontally.
    - **Song mode**: Large `1:1` square album cover (`object-fit: cover`, clean flat or `4px`/`8px` radius).
    - **Video mode**: `16:9` embedded HTML5/YouTube video frame with top-right share icon & bottom-right skip/controls overlay.

- **Right Panel (`.side-panel`, `36%` width on `>= 1150px`, `display: flex; flex-direction: column`)**:
  1. **Tab Strip (`tp-yt-paper-tabs`)**:
     - `3` tabs (`UP NEXT` | `LYRICS` | `RELATED`, plus optional `COMMENTS` if enabled), `border-bottom: 1px solid rgba(255,255,255,0.1)`.
     - Tab text: `14px` uppercase (`letter-spacing: 0.04em`, `font-weight: 500`), equal flex columns (`flex: 1; height: 48px`).
     - Active tab: `color: #FFFFFF`, `2px` solid `#FFFFFF` bottom selection bar. Inactive: `color: rgba(255,255,255,0.7)` (`opacity: 0.8`), disabled: `rgba(255,255,255,0.3)`.
  2. **`UP NEXT` Tab Content (`ytmusic-player-queue`)** — verified in `ytm_web_track_init.png`:
     - **Queue Header**: Left `"Playing from"` (`12px` `#AAAAAA`) + bold source title (`14px` `#FFFFFF`, e.g., `"Song Mix"`); Right white pill **`+ Save`** button (`height: 32px`, `px-3`, `rounded-full`, `bg-[#FFFFFF] text-[#030303] text-[14px] font-medium`).
     - **Autoplay Row (`.autoplay-with-toggle`)**: Left `"Autoplay"` (`14px` medium `#FFFFFF`) + `"Add similar content to the end of the queue"` (`12px` `#AAAAAA`); Right toggle switch (`#FFFFFF` / `#3ea6ff` when checked).
     - **Steering Filter Chips (`#steering-chips`)**: Horizontal scrollable row (`gap: 8px`, `padding: 12px 0`) — `All` (active `#FFFFFF` fill, `#030303` text), `Popular`, `Discover`, `Deep cuts`, `Romantic`, etc. (`rgba(255,255,255,0.1)` fill, `#FFFFFF` text, `border-radius: 8px`, `height: 32px`, `px-3`).
     - **Queue Rows (`ytmusic-player-queue-item`)**:
       - `height: 56px`, `padding: 0 8px`, `display: flex; align-items: center`, `border-bottom: 1px solid rgba(255,255,255,0.1)` (or borderless in UI-fixes mode).
       - Active row: `background: rgba(255,255,255,0.1)`, thumbnail shows dark scrim + white Play/Equalizer icon centered.
       - Hover row: `background: rgba(255,255,255,0.05)`, left drag handle (`24×24`, optional), duration hides and `⋮` menu icon appears on right!
       - Thumbnail: `32px × 32px` (or `40px × 40px` in live capture), `border-radius: 2px`, `margin-right: 16px`.
       - Title (`14px` medium `#FFFFFF`) + Artist (`14px` `#AAAAAA`, `margin-top: 4px`), right-aligned duration (`14px` `#AAAAAA`, `tabular-nums`).
  3. **`LYRICS` Tab Content (`ytmusic-description-shelf-renderer`)** — verified in `ytm_web_lyrics.png`:
     - Scrollable vertical lyric stanzas (`font-family: Roboto`, `14px`–`16px`, `line-height: 1.5`, `color: #FFFFFF` / `#F1F1F1`, blank-line stanza spacing, source attribution footer `14px` `#AAAAAA`, `margin: 16px 0`).
  4. **`RELATED` Tab Content** — verified in `ytm_web_related.png`:
     - `"You might also like"` (`20px`/`24px` `YouTube Sans` bold) + `<` `>` circular arrows + horizontal multi-row dense track list (`ytmusic-responsive-list-item-renderer`).
     - `"Recommended playlists"` + `<` `>` circular arrows + horizontal 2-up/3-up square `ytmusic-two-row-item-renderer` playlist cards (`2×2` grid cover art supported).
     - `"Similar artists"` / `"About the artist"` collapsible bio card.

### 6.2 Mobile Full-Screen Player (`<= 935px`, `ytm_web_mob_watch.png`)
- Full viewport (`100vw × 100dvh`, `z-index: 60`), **blurred album art ambient background** (`filter: blur(80px)`, `height: 49vh`, overlaid by `linear-gradient(to bottom, rgba(0,0,0,0.6), #030303)`).
- **Top Bar**: Left `v` Collapse chevron (`48×48`), center optional `Song | Video` pill, right `⋮` overflow button (`48×48`).
- **Artwork / Video**: Centered `max-height: min(100vw - 64px, 100dvh - 408px)`, `8px` radius (square for audio, `16:9` edge-to-edge for video).
- **Metadata + Controls (`padding: 0 32px`)**:
  - Track Title (`YouTube Sans` `24px` bold `#FFFFFF`) + Artist (`16px` `rgba(255,255,255,0.7)`) + optional Like/Share row.
  - Full-width scrubber bar (white `#FFFFFF` active track + white `12px` circular knob) with `0:00` left and `4:18` right (`12px` `rgba(255,255,255,0.7)` `margin-top: 8px`).
  - 5-button transport row (`justify-content: space-between`): `Shuffle` (`24px`), `Prev` (`36px`), **`Play/Pause` (`72px × 72px` white circle `#F1F1F1`, `#000` `40px` icon)**, `Next` (`36px`), `Repeat` (`24px`).
- **Bottom Persistent Tab Drawer**: Rounded top sheet (`border-radius: 10px 10px 0 0`, `height: 68px` collapsed header) showing `UP NEXT | LYRICS | RELATED` tabs; tapping any tab slides the queue/lyrics/related sheet up (`#000000` bg) while shrinking the mini-player header to `64px` at top!

---

## 7. Page-by-Page Visual Anatomy & `frontend-vite` Mapping

### 7.1 Home Page (`Discovery.tsx` <-> `https://music.youtube.com/`)
Verified in `ytm_web_home.png`, `ytm_web_wait_guide_collapsed.png`, `ytm_web_mob_home.png`.

1. **Mood & Activity Filter Chip Bar (`ytmusic-chip-cloud-renderer`)**:
   - Sticky/top row (`padding: 40px 0 8px` on `>= 936px`; `32px 0 16px` smaller; `gap: 12px` / `margin: 6px`).
   - Chips: `Energize`, `Workout`, `Relax`, `Feel good`, `Commute`, `Sad`, `Romance`, `Party`, `Sleep`, `Focus` (single horizontal scrollable row, `no-scrollbar`).
   - Styling (`ytmusic-chip-cloud-chip-renderer`): `height: 36px`, `padding: 0 12px`, `border-radius: 8px`, `font-size: 14px`, `font-weight: 400`, `white-space: nowrap`.
     - Inactive: `background: rgba(255, 255, 255, 0.1)`, `color: #FFFFFF`, hover `rgba(255, 255, 255, 0.2)`.
     - Selected: `background: #FFFFFF`, `color: #030303`, `font-weight: 500`.
2. **Carousel Shelf Header (`ytmusic-carousel-shelf-basic-header-renderer`)**:
   - Optional eyebrow strapline above title (`14px`–`16px` uppercase `#AAAAAA`, e.g., `TOP TUNES RIGHT NOW` or `56px` circular/square avatar left of title for `"Listen again"` / `"From your library"`).
   - Title (`YouTube Sans` bold, `24px`–`45px` responsive, `line-height: 1.2`, `#FFFFFF`).
   - Right action group (`gap: 16px` desktop, `8px` mobile):
     - Optional outline pill button (`Play all` or `More`): `height: 36px`, `px-4`, `border-radius: 18px`, `border: 1px solid rgba(255,255,255,0.2)`, `background: transparent`, `hover:bg-white/10`, `14px` medium `#FFFFFF`.
     - `<` and `>` circular pagination arrows: `36px × 36px` (`24px` on `<= 480px`), `border-radius: 50%`, `border: 1px solid rgba(255,255,255,0.2)`, `color: #FFFFFF`, `hover:bg-white/10`, `disabled:opacity-40`.
3. **Dense Multi-Column Track Shelf (`Quick picks` / `Song mixes`)**:
   - CSS Grid horizontal carousel (`grid-auto-flow: column`, `grid-template-rows: repeat(4, 1fr)`, `gap: 16px 24px`).
   - Column width: `calc((contentWidth - 4 * 24px) / 3)` on `>= 1364px` (**3 visible columns × 4 rows = 12 tracks/page**); `min(contentWidth - 12px, 420px)` single column on mobile (`<= 615px`).
   - Row item (`ytmusic-responsive-list-item-renderer`): `height: 48px` (`height-style=MUSIC_RESPONSIVE_LIST_ITEM_HEIGHT_MEDIUM_COMPACT`), `48px × 48px` square artwork (`border-radius: 4px`, `margin-right: 16px`), hover dark overlay + centered white Play triangle (`24px`), Title (`14px`–`16px` medium `#FFFFFF`, 1-line truncate), Subtitle (`14px` `#AAAAAA`: `Artist • 51M plays • Album`, 1-line truncate), right hover `ThumbsUp/Down` + `⋮` icons.
4. **Square Media Card Carousels (`Today's Hits`, `Trending community playlists`, `Featured playlists for you`)**:
   - Horizontal grid (`6` cards across on `>= 1364px`, `5` on `1150–1363px`, `180px` on `616–1149px`, `160px` on `<= 615px`), `gap: 24px` (`16px` tablet/mobile).
   - Card (`ytmusic-two-row-item-renderer`):
     - `1:1` square image container (`border-radius: 8px`, `overflow: hidden`). Supports `2×2` collage thumbnails for community playlists (`ytm_web_home.png`).
     - Hover overlay: subtle dark scrim + bottom-right **dark circular Play button** (`40px`, `bg-black/75 hover:bg-black hover:scale-105`, white Play icon) + top-right `⋮` overflow menu button!
     - Metadata (`margin-top: 8px`): Title (`14px`–`16px` medium `#FFFFFF`, 2-line clamp), Subtitle (`14px`–`16px` `#AAAAAA`, 2-line clamp, `margin-top: 3px`, e.g., `IVE, ILLIT, aespa, BABYMONSTER`).
   - **Circular Artist Cards** (when `has-circle-cropped-thumbnail`): `border-radius: 50%` artwork, centered text (`text-align: center`), no `⋮` menu.

### 7.2 Explore Page (`Feed.tsx` <-> `https://music.youtube.com/explore`)
Verified in `ytm_web_explore.png` & `ytm_web_mob_explore.png`.
*(Note: In `App.tsx`, currently `/explore` redirects to `/`, and `/feed` renders `Feed.tsx`. Wire `/explore` directly to the YTM Explore view and update sidebar/nav links from `Feed` -> `Explore`!)*

1. **Top 3 Quick-Navigation Cards (`ytmusic-grid-renderer[grid-type=explore_buttons]`)**:
   - Grid: `3` columns (`gap: 24px` `>=1150px`, `16px` `936–1149px`), `2` columns on mobile (`<= 935px`).
   - Cards: **`New releases`** (tag/starburst icon), **`Charts`** (trending line-arrow icon -> `/charts`), **`Moods & genres`** (smiley circle icon).
   - Styling (`STYLE_ICON`): `min-height: 56px` (desktop ~`100px–112px` stacked icon + title card), `padding: 16px`, `border-radius: 8px`, `background: rgba(255,255,255,0.1)` (`--ytmusic-explore-chip-background`), `hover:bg-white/20`, `24px` outline icon top-left + `24px` (`18px` compact) `YouTube Sans` bold `#FFFFFF` title bottom-left.
2. **New Albums & Singles Carousel**: Standard `ytmusic-two-row-item-renderer` square cards (`Title`, `Album • Artist`, with optional explicit `E` badge).
3. **Moods & Genres Colored-Stripe Grid Carousel (`STYLE_SOLID`)**:
   - Horizontal 4-row grid carousel (`6` visible columns on `1440px`, `2` on mobile), `gap: 16px` row / `16px` col.
   - Each tile (`height: 48px`, `border-radius: 8px`, `background: rgba(255,255,255,0.1)`, `hover:bg-white/20`, `padding: 0 12px`, `font-size: 14px`, `font-weight: 500`, `#FFFFFF`, `border-left: 6px solid <stripeColor>`):
     - Verified live YTM stripe colors:
       - `Chill`: `#A4C5FF` | `Commute`: `#FFC200` | `Energize`: `#FFE780` | `Feel good`: `#A4FFA4` | `Focus`: `#CCCCCC` | `Gaming`: `#606060`
       - `Party`: `#B47BFF` | `Romance`: `#CC0000` | `Sad`: `#8C8C8C` | `Sleep`: `#7B3EDB` | `Workout`: `#FF8D40` | `Hip-hop`: `#E24B00`
       - `Pop`: `#FF78FF` | `R&B & soul`: `#7B3EDB` | `Rock`: `#CC0000` | `Dance & electronic`: `#0092BF` | `Indie & alternative`: `#CCCCCC` | `K-Pop`: `#B47BFF` | `J-Pop`: `#FF78FF` | `Jazz`: `#A4C5FF` | `Folk & acoustic`: `#00A513`
4. **Trending Numbered Grid (`Trending`)**:
   - 3-column × 4-row horizontal carousel (`1`..`12`+) with `16:9` or square `48px` thumbnail, rank index (`1..12`) + optional rank trend glyph (`•` / `▲` `#2ba640` / `▼` `#ff4e45`), title, and `Artist • 19M views`.
5. **New Music Videos Carousel**: `16:9` cards (`padding-top: 56.25%`, `width: calc(baseWidth * 16 / 9)`, `border-radius: 8px`).

### 7.3 Charts Page (`ChartsSection.tsx` <-> `https://music.youtube.com/charts`)
Verified in `ytm_web_charts.png`.

1. **Page Header**:
   - `YouTube Sans` bold `"Charts"` (`28px`–`45px`, `margin: 16px 0`).
   - **Country / Region Filter Pill (`ytmusic-sort-filter-button-renderer`)**: `height: 36px`, `padding: 8px 12px 8px 16px`, `border-radius: 20px`, `background: rgba(255,255,255,0.1)`, `border: 1px solid rgba(255,255,255,0.1)`, `14px` medium `#FFFFFF`, trailing `18px` chevron-down (`Vietnam v` / `Global` / `United States`).
2. **Chart Shelves**:
   - **`Video charts` / `Top songs` Playlist Cards**: Square `ytmusic-two-row-item-renderer` cards (`Trending 20`, `Daily Top Music Videos`, `Top 100 Music Videos`) with subtitle `Chart • YouTube Charts`.
   - **`Top music videos`**: 3-column × 4-row ranked list (`ytmusic-responsive-list-item-renderer` with `48px` thumbnail, trend indicator `▲`/`▼`/`•`, bold rank number, title, `Artist • views`).
   - **`Top artists`**: 3-column × 4-row ranked list with **circular `48px` artist avatars** (`rounded-full`), trend triangle (`#2ba640` green up, `#ff4e45` red down, `#909090` dot), bold rank index, artist name (`14px`–`16px` medium `#FFFFFF`), and subscriber count (`6.87K subscribers`, `#AAAAAA`).

### 7.4 Search Results Page (`Search.tsx` <-> `https://music.youtube.com/search?q=...`)
Verified in `ytm_web_wait_search.png` & `ytm_web_mob_search.png`.

1. **Filter Chips (`ytmusic-chip-cloud-renderer`)**:
   - Row at top of results: `Artists`, `Albums`, `Episodes`, `Songs`, `Videos`, `Community playlists`, `Profiles`, `Podcasts` (selected chip turns `#FFFFFF` bg / `#030303` text; tapping active chip clears filter back to `All`).
2. **`Top result` Hero Card (`ytmusic-card-shelf-renderer`)**:
   - Container: `width: var(--ytmusic-content-width)`, `border-radius: 8px`, `overflow: hidden`, subtle blurred ambient color backdrop (`filter: blur(60px)`, `opacity: 0.7`, overlaid by `linear-gradient(180deg, rgba(0,0,0,0.05), #000 86.67%)` + `rgba(255,255,255,0.1)` left tint).
   - **Desktop (`>= 1150px`)**: 2-column `1fr 1fr` CSS grid (`card-content-container` | `undercards`):
     - **Left Primary Entity**: `100px × 100px` circular artist avatar (`rounded-full` for artists, `2px`–`4px` square for songs/albums), `margin-right: 16px`, `YouTube Sans` bold title (`24px`), subtitle (`Artist • 8.51M monthly audience`, `14px`–`16px` `rgba(255,255,255,0.7)`), top-right `>` navigation chevron, and dual action pills (`gap: 16px`):
       - **`Shuffle`** (or `Play`): white solid pill (`height: 36px`, `rounded-full`, `bg-[#FFFFFF] text-[#030303] font-medium px-4`, icon + text).
       - **`Mix`** (or `Save`): dark translucent pill (`height: 36px`, `rounded-full`, `border: 1px solid rgba(255,255,255,0.3)`, `bg-transparent hover:bg-white/10 text-[#FFFFFF] font-medium px-4`).
     - **Right `undercards` Stack (`bg-white/5`, `padding: 16px`, `gap: 16px`)**: 3 `ytmusic-responsive-list-item-renderer` rows (`height: 56px`, `48px` cover, title + `Song • 4:18 • 1.7M plays`), separated by subtle `1px solid rgba(255,255,255,0.1)` dividers.
   - **Mobile / Tablet (`<= 1149px`)**: Stacks vertically (`grid-template-columns: 1fr`), `56px` circular avatar beside title + subtitle, full-width 50/50 `Shuffle` & `Mix` pills underneath, then the 3 top songs stacked below.
3. **Categorized Result Shelves (`Songs`, `Videos`, `Albums`, `Artists`, `Community playlists`)**:
   - Section title (`YouTube Sans` `24px` bold) + dense `ytmusic-responsive-list-item-renderer` rows (`height: 64px`–`80px`, `56px` thumbnail, `1px solid rgba(255,255,255,0.1)` divider between rows, `Type • Artist • Plays/Year`) + bottom outline pill `"Show all"` button (`rounded-full border border-white/20 px-4 h-9 text-[14px]`).

### 7.5 Library Page (`Library.tsx` <-> `https://music.youtube.com/library`)
Verified in `ytm_web_library.png` + `ytmusicweb` CSS (`ytmusic-grid-renderer[grid-type=library]`).

1. **Filter Chips & Sort Toolbar**:
   - Filter chips: `Playlists`, `Podcasts`, `Songs`, `Albums`, `Artists` (`STYLE_DEFAULT`, `8px` radius, `32px` height).
   - Right/below: Sort dropdown pill (`Recently added v`, `A–Z`, `Z–A`) + `+ New playlist` outline/filled pill.
2. **Library Grid (`grid-type="library"`)**:
   - Responsive column count via `--ytmusic-library-column-count`: `2` (`<=439px`), `3` (`440–615px`), `4` (`616–759px`), `5` (`760–1149px`), `6` (`1150–1363px`), `7` (`1364–1577px`), `8` (`1578–1799px`), `9` (`>=1800px`).
   - Card width: `160px` desktop (`>= 936px`), `gap: 40px 24px` (`>=1364px`) or `40px 16px` (`<=1363px`).
   - Special pinned tile: **`Liked music`** auto-playlist card (purple/red thumb icon tile + `"Auto playlist • X songs"`), plus user playlists (`2×2` collage), saved albums (`4px`–`8px` square), and followed artists (`50%` circular avatar, centered title + subtitle).
   - When `Songs` chip is selected (or in Liked Songs): dense `ytmusic-responsive-list-item-renderer` table (`48px` art, title, artist, album, duration, hover Play overlay & `⋮`).
3. **Empty State**: Centered heading `"Explore your favorites"` (`20px` bold `#FFFFFF`), caption `"Sign in to access tracks that you liked or saved"` (`14px` `#AAAAAA`), outline pill button (`border-white/20 rounded-full px-5 h-9`).

### 7.6 Artist Page (`Artist.tsx` <-> `/artist/:id`)
Verified in `ytm_web_artist.png`.

1. **Full-Bleed Immersive Hero (`ytmusic-immersive-header-renderer`)**:
   - Background full-bleed artist photo (`object-fit: cover; object-position: top`) positioned behind the top nav bar (`padding-top: 288px` at `1440px`, `368px` at `>=1578px`, `228px` at `1150–1363px`, `128px` tablet, `72px` mobile).
   - Dual scrim: uniform `rgba(0,0,0,0.4)` overlay + bottom vertical gradient (`linear-gradient(1turn, #030303 8.98%, rgba(0,0,0,0) 100%)`).
   - Content (`max-width: var(--ytmusic-content-width)`):
     - Title: `YouTube Sans` bold `28px`–`45px` (`#FFFFFF`), `margin-bottom: 16px` (or subtitle right beneath).
     - Monthly listeners (`8.51M monthly audience`): `14px` `rgba(255,255,255,0.7)`.
     - Bio description (`max-width: 640px`, `14px`, `line-height: 20px`, 2-line clamp) + uppercase **`MORE`** toggle button (`14px` medium `rgba(255,255,255,0.7)`). Hidden below `935px`.
     - Action Row (`gap: 8px`, `margin-top: 18px`):
       - **`Shuffle`** pill: white solid (`#F1F1F1` bg, `#030303` text, `height: 36px`, `min-width: 136px`, `rounded-full`).
       - **`Mix`** pill: white solid (`#F1F1F1` bg, `#030303` text, `height: 36px`, `min-width: 136px`, `rounded-full`).
       - **`Subscribe <count>`** toggle pill: dark bg, `1px solid #FF5577` (`#f57`) border + `#FF5577` text (`height: 36px`, `px-5`, `rounded-full`); when subscribed: `border: 1px solid rgba(255,255,255,0.2)`, `color: rgba(255,255,255,0.7)`.
       - **`⋮` Overflow button**: `36px × 36px` circle (`hover:bg-white/10`).
2. **Artist Sections**:
   - **`Top songs`**: Dense 4-column table rows (`40px–48px` square art + bold title | artist | `486M plays` | album name, `border-bottom: 1px solid rgba(255,255,255,0.1)`, `height: 56px`), plus `"Show all"` outline pill button (`border: 1px solid rgba(255,255,255,0.2)`, `rounded-full`).
   - **`Albums`**, **`Singles & EPs`**, **`Videos`** (`16:9`), **`Featured on`**, and **`Fans might also like`** (`rounded-full` circular artist cards) carousels.

### 7.7 Album & Playlist Detail Pages (`Album.tsx`, `Playlist.tsx`)
Verified in `ytm_web_full_album.png`, `ytm_web_album.png`, `ytm_web_music_playlist.png`, `ytm_web_playlist.png`.

1. **Atmospheric Blurred Header Background**:
   - Full-bleed blurred copy of the cover art (`position: absolute; inset: 0 0 auto 0; height: 49vh; filter: blur(80px)`), masked by `linear-gradient(to bottom, rgba(0,0,0,0.6), #030303)` (`height: 100vh`).
2. **Two-Column Split Layout (`ytmusic-two-column-browse-results-renderer`)**:
   - **`>= 1150px` Desktop**: Side-by-side (`flex-direction: row`, centered within content max width, `gap: 24px`, top margin `56px`–`64px`).
     - **Left Sticky Column (`#primary`, `position: sticky; top: 64px`)**: `~340px–420px` wide, centered alignment (`text-align: center`, `display: flex; flex-direction: column; align-items: center`):
       1. Creator / Artist strapline (`16px` circular avatar + `#FFFFFF` `14px`–`16px` name, `gap: 8px`).
       2. Cover art: `264px × 264px` (`>=1364px`), `240px × 240px` (`936–1363px`), `border-radius: 8px`–`12px`, clickable to open zoomed cover lightbox (`scale(1.05)` hover).
       3. Title: `YouTube Sans` bold `28px`, 2-line clamp, `margin-top: 16px`.
       4. Subtitle: `Album • 2017` or `Playlist • 2026`, `14px`–`16px` `rgba(255,255,255,0.7)`.
       5. Second subtitle: `18 songs • 1 hour, 13 minutes`, `14px`–`16px` `rgba(255,255,255,0.7)`.
       6. Description snippet: 1–2 line clamp, `14px` `rgba(255,255,255,0.7)`.
       7. **Centered Action Button Triad (`margin-top: 16px`, `gap: 32px` or `16px`)**:
          - Left: **Save / Bookmark** (`36px`–`40px` circle, `bg-white/10 hover:bg-white/20`, white bookmark icon).
          - Center: **Play** (`64px × 64px` white circle `#F1F1F1`, `#030303` `32px` Play/Pause icon, `hover:scale-105 transition`).
          - Right: **Overflow (`⋮`)** (`36px`–`40px` circle, `bg-white/10 hover:bg-white/20`, opens Add to queue / Shuffle / Share / Download).
     - **Right Scrollable Column (`#secondary`, `flex: 1`)**:
       - Optional `Sort` pill (`ytmusic-sort-filter-button-renderer`) or filter chips at top (`Playlist.tsx`).
       - **Track Rows (`height: 68px`, `border-radius: 8px`, `padding: 0 16px`, `margin-bottom: 8px`)**:
         - Hover `bg-white/5`, Playing/Selected `bg-white/10`.
         - **Album rows**: Index number (`1`, `2`, `3`, `#AAAAAA` `32px` wide, swaps to white Play icon on hover or equalizer when playing) — **NO redundant album thumbnail** on album detail tracks! Stacked Title (`14px`–`16px` medium `#FFFFFF`) + Play count (`9.6M plays`, `14px` `rgba(255,255,255,0.7)`), right-aligned duration (`54px` wide, `14px` `rgba(255,255,255,0.7)`, `tabular-nums`; swaps on hover to Like/Bookmark + `⋮` actions).
         - **Playlist rows**: Index (with optional rank trend `▲`/`▼`/`•`), `48px × 48px` square thumbnail (`border-radius: 4px`, hover Play overlay), stacked Title + Artist (`• Album`), right duration + hover actions.
       - Bottom carousel (`margin-top: 56px`): `"Releases for you"` / `"You might also like"` (`4` or `5` cards per row).
   - **`<= 1149px` Tablet & Mobile**: Collapses to single-column vertical flow (`flex-direction: column`), centered header (`200px` cover art, `28px` title) at top followed by full-width tracklist below.

---

## 8. Implementation Checklist for `frontend-vite` (Web-2A & Web-2B)

| Existing File in `frontend-vite/src/` | Required YouTube Music Alignment |
|---|---|
| `index.css` & `tailwind.config.*` | Replace SoundCloud `#111111` / `#ff5500` tokens with YTM tokens (`#030303` canvas, `#212121` elevated/player-bar, `#181818` cards, `#FF0033` scrubber/red accent, `#FFFFFF`/`rgba(255,255,255,0.7)` text, `rgba(255,255,255,0.1)` borders/chips). Import `Roboto`, `Roboto Mono`, `YouTube Sans` / `YT Sans`. |
| `components/layout/AppLayout.tsx` | Desktop shell with fixed `64px` top `Header`, collapsible `240px`/`72px` left `GuideSidebar` (auto-collapsing at `<1150px`, hidden at `<616px`), scrollable main canvas (`max-w-[1478px]` / `1264px` at `1440px`), fixed `72px`/`64px` bottom `PlayerBar`, and sliding split `PlayerPage` overlay (`top: 64px; bottom: 72px; left: guideWidth`). |
| `components/Header.tsx` | Left `40×40` hamburger + YTM red play-circle logo + `"Music"` wordmark; `480px` `rounded-[8px]` search input (`bg-white/10 border-white/15`, `focus-within:bg-[#030303]`) with dropdown suggestions (`rounded-b-[8px]`); right settings/overflow + user avatar / `"Sign in"` white pill. Mobile: icon-only search button expanding full-width overlay. |
| `components/SoundCloudSidebar.tsx` -> Guide Rail | Refactor from right-hand SoundCloud `"Who to follow"` sidebar into YTM's **left** `Guide` rail (`240px` expanded / `72px` collapsed mini rail) with `Home`, `Explore`, `Library`, `Charts`, divider, `+ New playlist` pill, and saved user playlists with hover `24px` play button. Remove SoundCloud right sidebar from `Discovery`, `Feed`, `Charts`, `Library`, `Artist`, `Playlist`. |
| `components/layout/PlayerBar.tsx` | Remove SoundCloud orange `<Waveform />` from bar. Implement `72px` `#212121` bar with full-width top-edge `3px->5px` `#FF0033->#FF2791` scrubber + `12px` `#FF0033` hover knob + hover time tooltip; Left Prev/Play/Next + timer; Center `40×40` cover + Title/Byline + Thumbs Down/Up + `⋮`; Right hover-reveal `100px` Volume slider + Repeat + Shuffle + rotating Expand chevron (`▲/▼`) to toggle `PlayerPage`. |
| `PlayerPage` (Desktop Split & `MobileFullPlayer.tsx`) | Desktop `>=936px`: Split view with left `Song | Video` pill toggle + `max-w-[800px]` square art / 16:9 video, and right `36%` panel with `UP NEXT | LYRICS | RELATED` tabs, `"Playing from"` + `Save` pill, `Autoplay` switch, steering filter chips, `56px` queue rows, lyric stanzas, and related shelves. Mobile `<936px`: blurred `49vh` backdrop, `v` + `⋮` top bar, art, white scrubber, `72px` white Play circle, bottom `UP NEXT | LYRICS | RELATED` sheet. |
| `pages/Discovery.tsx` (`/`), `pages/Feed.tsx` (`/explore`), `pages/ChartsSection.tsx` (`/charts`) | **Home**: Mood chip bar + `Quick picks` 3-col×4-row dense list + `6`-card square carousels with `Play all`/`More` pills & `<` `>` circular arrows. **Explore** (route `/explore` & `/feed`): 3 top icon cards (`New releases`, `Charts`, `Moods & genres`), `6`-col Moods & genres tiles with `6px` colored left borders, `Trending` numbered 3-col grid. **Charts**: Country dropdown pill + `Video charts` cards + ranked `Top songs` / `Top artists` with `▲`/`▼`/`•` rank deltas. |
| `pages/Search.tsx`, `pages/Library.tsx`, `pages/Artist.tsx`, `pages/Album.tsx`, `pages/Playlist.tsx` | **Search**: Filter chips + 2-col `Top result` blurred hero card (`Shuffle`/`Mix` pills + 3 top songs) + categorized `ytmusic-responsive-list-item` shelves. **Library**: Filter chips + sort pill + 2–9 col responsive `160px` card grid + dense table for Songs. **Artist**: Full-bleed gradient hero + `Shuffle`/`Mix`/`Subscribe` (`#f57` outline) + 4-col `Top songs` + carousels. **Album / Playlist**: Blurred `49vh` backdrop + 2-col split (`sticky` left `264px` art + `[Bookmark][64px Play][⋮]` triad; right `68px` rounded track rows + bottom recommendations). |
