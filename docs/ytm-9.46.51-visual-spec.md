# YouTube Music Android v9.46.51 — Visual & Component Specification

> Generated strictly from static inspection of `/mnt/data/Package Center/kv-music/ref/com.google.android.apps.youtube.music_9.46.51-94651230_6dpi_24lang_d9fbfe7d8936d05ae26d6ae6006e04be_apkmirror.com.apkm` (`base.apk`, `split_config.en.apk`, `split_config.xxhdpi.apk`) via REA (`rea@6.7.0` + `jadx-headless-mcp` v0.7.1) and JADX resource decoding.

## 0. Artifact Identity & Font Extraction Verification

| Artifact | Value |
|---|---|
| Package Name | `com.google.android.apps.youtube.music` |
| Version | `9.46.51` (`versionCode=94651230`) |
| SDK Targets | `minSdk=32`, `targetSdk=37` |
| `base.apk` SHA-256 | `a2c3a3245f5f89380e3f0d95d264267d32956b3d46c57d9a5c9a08b010f6cf4e` |
| Extracted Fonts | `assets/YTSans-Bold.otf` -> `android-app/app/src/main/res/font/yt_sans_bold.otf` (`37,204` bytes, OpenType CFF `YTSans-Bold` v001.500, SHA-256 `7dde44f0e1939a65e8f9de4f088c8480e82ef0b062564fe811e0cb96ce139bf2`) |
| Extracted Fonts (Medium) | `assets/YTSans-Medium.otf` -> `android-app/app/src/main/res/font/yt_sans_medium.otf` (`89,980` bytes, TrueType `YTSans-Medium` v001.50, SHA-256 `1bd359aa38dcfa66c1b46170ae56a5304d81b12566a8b6fa6646e93e57c17630`) |

--- 

## 1. REA Evidence

### 1.1 Engine & Artifact Inventory Evidence

- **Engine**: `jadx-headless-mcp` v`0.7.1` (JAR SHA-256: `6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75`, source revision: `5844800a486d2248fa949b74c9896285f5b54de2`, `worker_count=1`, `heap_limit_mib=4096`)
- **`inspect-artifact`**: `evidence_id=ev_0b9128d3673562362d47654a1a91f7bbdaa7db9a7c94a0af4383208cc249d9ff`, `inspection_id=ai_467347c63c75864b01772875169972712ed64dfd3a787a438b9f6aff3bffba73`, root SHA-256 `a2c3a3245f5f89380e3f0d95d264267d32956b3d46c57d9a5c9a08b010f6cf4e`
- **`project-android-application-graph`**: `evidence_id=ev_409348e15fd43a29a8746aff399543d0d29bc35dcb896cbba7b9ec36c46c054f`, `projection_id=adp_5df19a86a2baed9893609ad142a41e8ee7169efc291b1799ac0978335e11633a`, runtime families `['dalvik-art', 'native']`, JNI bridge candidates `156`
- **`inspect-android-package`**: `evidence_id=ev_15cc53a52ffa0e032c24f0f7af8df354a8d1e4f0db531dde8f3bfb8c6a7ce93a`, `class_count=36281`, `resource_count=2944`, permissions declared `36`, `signature_verification="not_performed"`, decoded `AndroidManifest.xml` length `50894` chars
- **Manifest Highlights**: Application class `com.google.android.apps.youtube.music.application.YouTubeMusicTikTokRoot_Application` (`android:theme="@style/Theme.YouTubeMusic"`); Launcher activity `com.google.android.apps.youtube.music.activities.MusicActivity` (`android:theme="@style/Theme.YouTubeMusic.Home"`).

### 1.2 JADX Class Search Results (`search-android-classes`)

| Query | `evidence_id` | `total_classes` | Coverage | Matches |
|---|---|---|---|---|
| `WatchWhileLayout` | `ev_c1cb855c854fe5ffcd81100469aac05e9383c83d60adec00b36df70949605a08` | 36281 | `complete` | `com.google.android.apps.youtube.music.watchpage.ui.WatchWhileLayout` |
| `PlayerBottomSheet` | `ev_1eb4593dd8ee490f6a791ecb5797be1ed4687f5311d8069f83dd1eb1d69bc465` | 36281 | `complete` | `com.google.android.apps.youtube.music.watchpage.ui.PlayerBottomSheet` |
| `MusicPlaybackControls` | `ev_b7622243a7aae27cc16c33d46dda47b8baa4c01b3ec90dcb3e5df726608ee8c5` | 36281 | `complete` | `com.google.android.apps.youtube.music.watchpage.MusicPlaybackControls`, `com.google.android.apps.youtube.music.watchpage.MusicPlaybackControlsTimeBar` |
| `PivotBar` | `ev_09059b911dff73d84a7d648d228dc0ee41320bc47b1379e2fff262c262f9f2e4` | 36281 | `complete` | _(none)_ |
| `TabbedView` | `ev_14328b76cb071881bc2fbe79852f6255a50e003040b332de70234dc022988a45` | 36281 | `complete` | `com.google.android.apps.youtube.music.ui.tabs.TabbedView` |
| `Pivot` | `ev_7d938c560bb904d64c1e4632134a1062136da97e46a613e3ae9376c82aa97f26` | 36281 | `complete` | _(none)_ |
| `""` (full inventory) | `ev_bd4d5fed35347b568048c1b4995c0400294f72d8732f0eef64e6288226701e38` | 36281 | `complete` | `36,281` total classes (`122` in `com.google.android.apps.youtube.music.*`) |

> **Observation on `PivotBar` search**: `PivotBar` returned `0` matches because `res/layout/pivot_bar.xml` inflates `com.google.android.material.tabs.TabLayout` directly (with `@+id/pivot_bar`) and controller logic is R8-obfuscated. Custom views referenced directly in XML (`WatchWhileLayout`, `PlayerBottomSheet`, `MusicPlaybackControls`, `MusicPlaybackControlsTimeBar`, `TabbedView`, `AudioVideoSwitcherToggleView`, `SearchToolbarView`, `PlayerPageBehavior`) retain un-obfuscated class names.

### 1.3 Class Inventories (`inspect-android-class`)

| Class | `evidence_id` | Fields | Methods | Key Lifecycle / Drawing Methods |
|---|---|---:|---:|---|
| `com.google.android.apps.youtube.music.player.audiovideoswitcher.ui.AudioVideoSwitcherToggleView` | `ev_5cfe9ea01d4f0360a8327bc32e5d1a8a6b2716e00dd316eb3223542f210ac636` | 39 | 15 | `<init>(android.content.Context, android.util.AttributeSet): void`, `onDraw(android.graphics.Canvas): void`, `onFinishInflate(): void`, `onLayout(boolean, int, int, int, int): void`, `onTouchEvent(android.view.MotionEvent): boolean` |
| `com.google.android.apps.youtube.music.watchpage.MusicPlaybackControls` | `ev_b8f75f7b7330f74a74626f9b814a9cb026cf19f18970cf0a7f98fc697ef0bec7` | 47 | 33 | `<init>(android.content.Context, android.util.AttributeSet): void`, `hasOverlappingRendering(): boolean`, `onClick(android.view.View): void`, `onFinishInflate(): void`, `onKeyDown(int, android.view.KeyEvent): boolean`, `onKeyUp(int, android.view.KeyEvent): boolean` |
| `com.google.android.apps.youtube.music.watchpage.MusicPlaybackControlsTimeBar` | `ev_9b10fe753947cbc9441a112c0cae10b792c684bb018d53725ad7915cafe8b5ea` | 29 | 18 | `<init>(android.content.Context, android.util.AttributeSet): void`, `draw(android.graphics.Canvas): void`, `mo55if(): void`, `onInitializeAccessibilityNodeInfo(android.view.accessibility.AccessibilityNodeInfo): void`, `onMeasure(int, int): void` |
| `com.google.android.apps.youtube.music.watchpage.ui.PlayerBottomSheet` | `ev_97619d9c6efdc570e7606dd42edb942025eeceeae580924590dcec4a90843f5f` | 12 | 12 | `<init>(android.content.Context, android.util.AttributeSet): void`, `onAttachedToWindow(): void`, `onConfigurationChanged(android.content.res.Configuration): void`, `onFinishInflate(): void` |
| `com.google.android.apps.youtube.music.watchpage.ui.PlayerPageBehavior` | `ev_45e375eebc131a63849061f5f4575afb53f7757bfd6d09dc4b28a0975df65de1` | 9 | 6 | `<init>(android.content.Context, android.util.AttributeSet): void`, `onInterceptTouchEvent(androidx.coordinatorlayout.widget.CoordinatorLayout, android.view.View, android.view.MotionEvent): boolean`, `onTouchEvent(androidx.coordinatorlayout.widget.CoordinatorLayout, android.view.View, android.view.MotionEvent): boolean` |
| `com.google.android.apps.youtube.music.search.ui.SearchToolbarView` | `ev_b6601884448e5be05db25ccd228bdfbf8ea8086881a2f63db551e772275f9a44` | 23 | 21 | `<init>(android.content.Context): void`, `<init>(android.content.Context, android.util.AttributeSet): void`, `<init>(android.content.Context, android.util.AttributeSet, int): void`, `<init>(android.content.Context, android.util.AttributeSet, int, int, axco): void` |
| `com.google.android.apps.youtube.music.ui.tabs.TabbedView` | `ev_5faae6f6110c88ecc13f6e1660ca07e882231ed42cda214ec27ae31f1750e7d9` | 16 | 36 | `<init>(android.content.Context): void`, `<init>(android.content.Context, android.util.AttributeSet): void`, `<init>(android.content.Context, android.util.AttributeSet, int): void`, `onConfigurationChanged(android.content.res.Configuration): void`, `onDetachedFromWindow(): void` |
| `com.google.android.apps.youtube.music.watchpage.ui.WatchWhileLayout` | `ev_aaee2b2bdb1feed67f673c6a4f7dbf4c01c9c6fe2ea838ce5f203d2678879dc6` | 156 | 74 | `<clinit>(): void`, `<init>(android.content.Context, android.util.AttributeSet): void`, `dispatchTouchEvent(android.view.MotionEvent): boolean`, `onAttachedToWindow(): void`, `onConfigurationChanged(android.content.res.Configuration): void`, `onFinishInflate(): void`, `onLayout(boolean, int, int, int, int): void`, `onMeasure(int, int): void` |

### 1.4 Decompiled View Structure & Behavior (`inspect-android-method`)

- **`com.google.android.apps.youtube.music.player.audiovideoswitcher.ui.AudioVideoSwitcherToggleView.<init>`** (overload `0`, `dex_descriptor=(Landroid/content/Context;Landroid/util/AttributeSet;)V`, `evidence_id=ev_a651de8ed788d19f4262ed1e35ce4a139ffdb6a1a521546f1a17f5dd0067c9f8`)
- **`com.google.android.apps.youtube.music.player.audiovideoswitcher.ui.AudioVideoSwitcherToggleView.onDraw`** (overload `0`, `dex_descriptor=(Landroid/graphics/Canvas;)V`, `evidence_id=ev_595651160219c4a508d0c0497d3d3ca3d6e008686243de75cd7901a0ff1b0d0d`)
- **`com.google.android.apps.youtube.music.watchpage.MusicPlaybackControlsTimeBar.<init>`** (overload `0`, `dex_descriptor=(Landroid/content/Context;Landroid/util/AttributeSet;)V`, `evidence_id=ev_c4ffe1741ea31a852ca148b0ba22b531f218d0d850d290aee50f6ef29a588dcc`)
- **`com.google.android.apps.youtube.music.watchpage.MusicPlaybackControlsTimeBar.draw`** (overload `0`, `dex_descriptor=(Landroid/graphics/Canvas;)V`, `evidence_id=ev_0e3cab7716e4cdb9810b77c55103e06a5146a89b7500daea34494a3e055337f5`)
- **`com.google.android.apps.youtube.music.watchpage.MusicPlaybackControlsTimeBar.onMeasure`** (overload `0`, `dex_descriptor=(II)V`, `evidence_id=ev_98ae426dc6b3db4efee3e4bfcd742531a9b3b8c5aaff0913055a1b98eab166c5`)
- **`com.google.android.apps.youtube.music.watchpage.MusicPlaybackControls.onFinishInflate`** (overload `0`, `dex_descriptor=()V`, `evidence_id=ev_5bde3b40d86c4939eca67901f70bc04f4ab4a58f89df6ef8fa366fbc45baddff`)
- **`com.google.android.apps.youtube.music.watchpage.ui.PlayerBottomSheet.onFinishInflate`** (overload `0`, `dex_descriptor=()V`, `evidence_id=ev_2177b5a825da5c949d5acf6c5e80f2dd2a983b122552514f6f545f31e5c97681`)
- **`com.google.android.apps.youtube.music.ui.tabs.TabbedView.F`** (overload `0`, `dex_descriptor=(Landroid/content/Context;Landroid/util/AttributeSet;)V`, `evidence_id=ev_d9174d9d96330e5bce34ca1375392f92386afacc43e0b5cc48af5d9049c35c4f`)
- **`com.google.android.apps.youtube.music.ui.tabs.TabbedView.<init>`** (overload `2`, `dex_descriptor=(Landroid/content/Context;Landroid/util/AttributeSet;I)V`, `evidence_id=ev_88048dea66cbca5093d723472c750414ff8ae92f41cda46aac4e6fb388bc04f0`)
- **`com.google.android.apps.youtube.music.watchpage.ui.WatchWhileLayout.E`** (overload `0`, `dex_descriptor=()V`, `evidence_id=ev_406d0d3dcedb5e6911a0ab6775c0fedefc2cd245b8e930d7074a58b9fc26e244`)
- **`com.google.android.apps.youtube.music.watchpage.ui.WatchWhileLayout.<init>`** (overload `0`, `dex_descriptor=(Landroid/content/Context;Landroid/util/AttributeSet;)V`, `evidence_id=ev_872e306eefe82f3d31bfa7fbf5c297157fd84cea5e7f8fa93009d1c9b0b8bfd0`)
- **`com.google.android.apps.youtube.music.watchpage.ui.WatchWhileLayout.onFinishInflate`** (overload `0`, `dex_descriptor=()V`, `evidence_id=ev_999118004eebd9287a182c8fc58812000dcde6b47c418bd472668ece9704a4fe`)
- **`com.google.android.apps.youtube.music.watchpage.ui.WatchWhileLayout.onLayout`** (overload `0`, `dex_descriptor=(ZIIII)V`, `evidence_id=ev_ecf6e4493349aaab3bc45ad59fbb2a0ad92cf282a2fbeb3482bd17fdade4d14f`)
- **`com.google.android.apps.youtube.music.watchpage.ui.WatchWhileLayout.onMeasure`** (overload `0`, `dex_descriptor=(II)V`, `evidence_id=ev_b73be9e80a3455a6a039f172c3e3fb6fb79d242bd0608f60f570f01ba71e336e`)

Key behavioral facts observed directly from the decompiled Java sources:

1. **`WatchWhileLayout.E()` & `onMeasure()`**:
   - Binds all player/mini-player/bottom-sheet/engagement-panel IDs from `WatchWhileLayout.<init>` attributes (`jsu.b` typed array).
   - Configures `translationY` `ObjectAnimator` (`300ms`, `AccelerateDecelerateInterpolator`) and transition `ValueAnimator` (`300ms`).
   - Inflates `mini_player_scrim_stub` with a 5-stop vertical `GradientDrawable(TOP_BOTTOM)`: `[0x00000000, ytOverlayBackgroundMediumLight (#4d000000), ytOverlayBackgroundMedium (#99000000), ytOverlayBackgroundHeavy (#cc000000), ytOverlayBackgroundSolid (#ff000000)]`.
   - Initializes `player_page` `PlayerPageBehavior` to `STATE_HIDDEN (5)` and `player_bottom_sheet` `PlayerPageBehavior` to `STATE_COLLAPSED (4)` with `halfExpandedRatio = 0.42f` (when `Y()` is true) or `0.999f`.
   - In `onMeasure()`: measures `fragment_container` height as `size2 - visiblePivotBarHeight`, sets `player_page` peek height to `w() + pivotBarHeight`, and sets `player_bottom_sheet` peek height to `(floatingMiniPlayerHeight + floatingMiniPlayerBottomMargin) + miniPlayerOffset` (or `playerTopSection.getMeasuredHeight() + iMax`).
2. **`PlayerBottomSheet.onFinishInflate()`**:
   - Binds `bottom_sheet_drag_handle` (`c`) and `bottom_sheet_tabbed_view` (`TabbedView` `d`).
   - Sets `TabLayout` horizontal margins to `tab_strip_margin_small` (`12dp`), `tab_strip_margin_extra_small` (`4dp`), or `tab_strip_margin` (`16dp`).
   - Dynamically inflates `R.layout.player_tab_divider` right after `TabLayout` with `MATCH_PARENT` width and `@dimen/tab_divider_height` (`1dp`) height.
3. **`TabbedView.F()`**:
   - Vertical `LinearLayout` creating a fixed `TabLayout` (or inflating `R.layout.scrollable_tab_layout`), adding `R.layout.toolbar_divider` (`1dp` `#1affffff`), and adding its `ViewPager` (`MATCH_PARENT`, `MATCH_PARENT`).
4. **`MusicPlaybackControls.onFinishInflate()`**:
   - Binds `time_bar` (`MusicPlaybackControlsTimeBar`), sets `time_bar_empty_color` (`#999999`), binds `live_label`, `controls_container`, Play/Pause/Replay (`TouchImageView`), Previous, Next, Rewind (`10s`), Fast Forward (`30s`), `playback_rate_button`, `playback_rate_text_button`, `playback_queue_shuffle_button_view`, `playback_queue_loop_button_view`, and `sleep_timer_button`.
   - Optionally applies `player_page_padding_horizontal_medium` (`20dp`) to `time_bar`/`live_label`, `playback_control_button_size` (`56dp`) to secondary control buttons, `playback_control_button_indicator_margin_top_large` (`40dp`) to shuffle/repeat indicator dots, and `R.drawable.ripple_large` (`28dp` radius).
   - Uses Lottie raw animations when flag `45861333L` is active: `R.raw.player_seek_backward_10s_icon`, `R.raw.player_seek_forward_30s_icon`, `R.raw.player_sleep_timer_close_icon`.
5. **`MusicPlaybackControlsTimeBar.<init>()`, `onMeasure()`, `draw()`**:
   - Total measured view height defaults to `42dp` (`this.k`, attr index 5); `this.z` defaults to `13dp` (attr index 3); gap between track/knob and timestamps `this.B` is `12dp` (`density * 12.0f + 0.5`).
   - Standard track height in `onMeasure()` is `2dp` (`(int)(density + density)`); squiggly/pill mode (`this.h == true`) uses `jrbVar.d` track height and renders rounded-end track via `canvas.drawRoundRect(..., fHeight, fHeight, paint)`.
   - Standard mode draws flat rect track + circular scrubber thumb (`drawCircle`). Chapter/ad markers use `0xB3000000` (`-1291845888`) `4px` ticks.
   - Timestamps render below the bar at `y = trackBottom + 12dp + textBounds.height()` aligned to `o.left` (elapsed) and `o.right` (duration / remaining).
6. **`AudioVideoSwitcherToggleView.<init>()` & `onDraw()`**:
   - Draws `R.drawable.audio_video_switcher_toggle_selector` (`#282828` pill, `100dp` corner radius) as sliding indicator in `onDraw()`.
   - Supports `R.id.song_text`/`R.id.video_text` (`"Song"`/`"Video"`) and `R.id.song_icon`/`R.id.video_icon` (`yt_fill_experimental_headset_vd_theme_24` / `yt_outline_experimental_video_vd_theme_24`). Uses `ytOverlayBackgroundMediumLight`, `ytOverlayButtonPrimary`, `ytOverlayTextPrimary`, `ytOverlayTextSecondary` when `l()` is active.

---

## 2. Decoded XML Layouts

All 26 requested layouts from `base.apk` (`res/layout/*.xml`), plus supporting included layouts and `split_config.xxhdpi.apk` drawable ID resolutions.

> **Split-APK Drawable IDs Resolved (`split_config.xxhdpi.apk`)**:
> - `0x7f0809be` -> `yt_outline_arrow_left_white_24`
> - `0x7f0809d8` -> `yt_outline_bars_2_white_24`
> - `0x7f080b5b` -> `yt_outline_overflow_vertical_white_24`
> - `0x7f080b81` -> `yt_outline_search_white_24`

### 2.1 `watch_while_layout.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.apps.youtube.music.watchpage.ui.WatchWhileLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/watch_while_layout"
    android:saveEnabled="false"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:actionRowId="@+id/action_row"
    app:atvWatchFragmentPadding="@dimen/player_page_padding_horizontal"
    app:audioVideoSwitchPillContainerId="@+id/audio_video_switch_pill_container"
    app:bottomSheetPeekHeight="@dimen/bottom_sheet_peek_height"
    app:companionBannerId="@+id/companion_banner"
    app:contentViewId="@+id/fragment_container"
    app:contextualMenuId="@+id/contextual_menu"
    app:floatingMiniPlayerBottomMargin="@dimen/item_small_spacing"
    app:floatingMiniPlayerEndPadding="@dimen/item_extra_small_spacing"
    app:floatingMiniPlayerHeight="@dimen/floating_mini_player_height"
    app:floatingMiniPlayerHorizontalMargin="@dimen/item_small_spacing"
    app:floatingMiniPlayerStartPadding="@dimen/item_small_spacing"
    app:floatingMiniPlayerVerticalPadding="@dimen/item_small_spacing"
    app:mdxChipCloudChipId="@+id/mdx_chip_cloud_chip"
    app:miniPlayerDockedViewMargin="@dimen/item_large_spacing"
    app:miniPlayerHeight="@dimen/mini_player_height"
    app:miniPlayerId="@+id/mini_player"
    app:miniPlayerMediaRouteButtonId="@+id/mini_player_media_route_button"
    app:miniPlayerMetadataId="@+id/mini_player_metadata"
    app:miniPlayerPlayPauseReplayButtonId="@+id/mini_player_play_pause_replay_button"
    app:miniPlayerSubtitleId="@+id/mini_player_subtitle"
    app:miniPlayerTitleId="@+id/mini_player_title"
    app:miniPlayerViewPagerContainerId="@+id/mini_player_view_pager_container"
    app:miniPlayerViewPagerFadeEdgeId="@+id/mini_player_view_pager_fade_edge"
    app:miniPlayerViewPagerId="@+id/mini_player_view_pager"
    app:miniPlayerViewPagerItemContainerId="@+id/mini_player_view_pager_item"
    app:miniPlayerWatchFragmentLength="@dimen/mini_player_watch_fragment_length"
    app:miniPlayerWatchFragmentSpacerId="@+id/mini_player_watch_fragment_spacer"
    app:minimizeButtonId="@+id/player_collapse_button"
    app:playbackControlsBottomSheetSpacing="@dimen/item_small_spacing"
    app:playbackControlsId="@+id/music_playback_controls"
    app:playbackControlsPaddingBottom="@dimen/playback_controls_padding_bottom"
    app:playbackControlsPaddingBottomSmall="@dimen/playback_controls_padding_bottom_small"
    app:playbackControlsPaddingTop="@dimen/playback_controls_padding_top"
    app:playerBottomSheetId="@+id/player_bottom_sheet"
    app:playerPageBackgroundId="@+id/player_page_background"
    app:playerPageBottomLayerId="@+id/player_page_bottom_layer"
    app:playerPageDraggableAreaId="@+id/player_page_draggable_area"
    app:playerPageId="@+id/player_page"
    app:playerPagePaddingHorizontal="@dimen/player_page_padding_horizontal"
    app:playerPagePaddingHorizontalMedium="@dimen/player_page_padding_horizontal_medium"
    app:playerPageScrimBottomId="@+id/player_page_scrim_bottom"
    app:playerPageScrimContainerId="@+id/player_page_scrim_container"
    app:playerPageScrimOffset="@dimen/player_page_scrim_offset"
    app:playerPageScrimOffsetLarge="@dimen/player_page_scrim_offset_large"
    app:playerPageScrimTopId="@+id/player_page_scrim_top"
    app:playerTopControlsId="@+id/player_top_controls"
    app:playerTopSectionId="@+id/player_top_section"
    app:playerViewPagerContainerId="@+id/player_view_pager_container"
    app:playerViewPagerId="@+id/player_view_pager"
    app:songMetadataContainerId="@+id/current_song_view"
    app:songMetadataPaddingBottom="@dimen/song_metadata_padding_bottom"
    app:songMetadataPaddingBottomMedium="@dimen/song_metadata_padding_bottom_medium"
    app:videoActionBarId="@+id/video_action_bar"
    app:watchEngagementPanelId="@+id/watch_engagement_panel"
    app:watchEngagementPanelScrimId="@+id/watch_engagement_panel_scrim"
    app:watchEngagementPanelWrapperId="@+id/watch_engagement_panel_wrapper"
    app:watchFragmentBottomPadding="@dimen/watch_fragment_bottom_padding"
    app:watchFragmentContainerId="@+id/watch_fragment_container"
    app:watchFragmentCornerRadiusMaximizedLarge="@dimen/watch_fragment_corner_radius_maximized_large"
    app:watchFragmentCornerRadiusMaximizedMedium="@dimen/watch_fragment_corner_radius_maximized_medium"
    app:watchFragmentCornerRadiusMinimized="@dimen/watch_fragment_corner_radius_minimized"
    app:watchFragmentCornerRadiusMinimizedRefreshed="@dimen/item_extra_small_spacing"
    app:watchFragmentId="@+id/watch_fragment"
    app:watchFragmentPaddingBottom="@dimen/watch_fragment_padding_bottom"
    app:watchFragmentPaddingBottomMedium="@dimen/watch_fragment_padding_bottom_medium"
    app:watchFragmentPaddingTop="@dimen/watch_fragment_padding_top"
    app:watchFragmentPaddingTopSmall="@dimen/watch_fragment_padding_top_small">
    <FrameLayout
        android:id="@+id/fragment_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>
    <ViewStub
        android:layout_gravity="bottom"
        android:id="@+id/mini_player_scrim_stub"
        android:layout="@layout/mini_player_scrim"
        android:inflatedId="@+id/mini_player_scrim"
        android:layout_width="match_parent"
        android:layout_height="@dimen/mini_player_scrim_height"/>
    <androidx.coordinatorlayout.widget.CoordinatorLayout
        android:layout_gravity="center_horizontal"
        android:id="@+id/player_page"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:behavior_hideable="true"
        app:layout_behavior="com.google.android.apps.youtube.music.watchpage.ui.PlayerPageBehavior">
        <FrameLayout
            android:id="@+id/player_page_background"
            android:visibility="invisible"
            android:layout_width="match_parent"
            android:layout_height="match_parent"/>
        <View
            android:id="@+id/player_page_scrim_top"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:alpha="0"
            android:importantForAccessibility="no"/>
        <LinearLayout
            android:orientation="vertical"
            android:id="@+id/player_page_scrim_container"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:alpha="0"
            android:importantForAccessibility="noHideDescendants">
            <Space
                android:layout_width="match_parent"
                android:layout_height="0dp"
                android:layout_weight="1"/>
            <View
                android:id="@+id/player_page_scrim_bottom"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"/>
        </LinearLayout>
        <FrameLayout
            android:id="@+id/player_page_bottom_layer"
            android:layout_width="0dp"
            android:layout_height="0dp">
            <FrameLayout
                android:id="@+id/companion_banner"
                android:visibility="gone"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"/>
            <FrameLayout
                android:id="@+id/player_top_section"
                android:layout_width="match_parent"
                android:layout_height="wrap_content">
                <LinearLayout
                    android:gravity="top"
                    android:orientation="vertical"
                    android:id="@+id/player_top_controls"
                    android:visibility="invisible"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:paddingStart="@dimen/item_extra_small_spacing"
                    android:paddingEnd="@dimen/item_extra_small_spacing">
                    <LinearLayout
                        android:gravity="center"
                        android:orientation="horizontal"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:paddingStart="@dimen/item_extra_small_spacing"
                        android:paddingEnd="@dimen/item_extra_small_spacing">
                        <com.google.android.libraries.youtube.common.ui.TouchImageView
                            android:id="@+id/player_collapse_button"
                            android:layout_width="@dimen/remix_generic_button_size"
                            android:layout_height="@dimen/remix_generic_button_size"
                            android:src="@drawable/yt_outline_experimental_chevron_down_vd_theme_24"
                            android:scaleType="center"
                            android:tint="@color/ytm_color_white"
                            android:contentDescription="@string/accessibility_collapse"
                            style="@style/MusicPlayerButton"/>
                        <Space
                            android:layout_width="@dimen/remix_generic_button_size"
                            android:layout_height="@dimen/remix_generic_button_size"/>
                        <Space
                            android:id="@+id/top_bar_extra_space"
                            android:visibility="gone"
                            android:layout_width="@dimen/remix_generic_button_size"
                            android:layout_height="@dimen/remix_generic_button_size"/>
                        <FrameLayout
                            android:id="@+id/audio_video_switch_pill_container"
                            android:layout_width="0dp"
                            android:layout_height="wrap_content"
                            android:layout_weight="1"/>
                        <FrameLayout
                            android:id="@+id/cast_button_container"
                            android:layout_width="@dimen/remix_generic_button_size"
                            android:layout_height="@dimen/remix_generic_button_size"/>
                        <com.google.android.libraries.youtube.common.ui.TouchImageView
                            android:id="@+id/ask_music_global_entry_button"
                            android:visibility="gone"
                            android:layout_width="@dimen/remix_generic_button_size"
                            android:layout_height="@dimen/remix_generic_button_size"
                            android:scaleType="center"
                            style="@style/MusicPlayerButton"/>
                        <com.google.android.libraries.youtube.common.ui.TouchImageView
                            android:id="@+id/contextual_menu"
                            android:layout_width="@dimen/remix_generic_button_size"
                            android:layout_height="@dimen/remix_generic_button_size"
                            android:src="@drawable/yt_outline_experimental_overflow_vertical_vd_theme_24"
                            android:scaleType="center"
                            android:contentDescription="@string/accessibility_context_menu"
                            style="@style/MusicPlayerButton"/>
                    </LinearLayout>
                    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                        android:textSize="@dimen/player_container_text_size"
                        android:textColor="@color/ytm_text_color_secondary_translucent"
                        android:textColorLink="@color/ytm_text_color_secondary_translucent"
                        android:gravity="center"
                        android:id="@+id/container_text"
                        android:paddingTop="@dimen/item_extra_small_spacing"
                        android:paddingBottom="@dimen/item_small_spacing"
                        android:focusable="true"
                        android:visibility="gone"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:singleLine="true"
                        android:marqueeRepeatLimit="marquee_forever"
                        android:textAlignment="center"
                        android:paddingStart="@dimen/player_page_padding_horizontal"
                        android:paddingEnd="@dimen/player_page_padding_horizontal"
                        app:hyperlinksClickable="true"/>
                </LinearLayout>
                <LinearLayout
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:id="@+id/mini_player"
                    android:focusable="true"
                    android:visibility="invisible"
                    android:layout_width="match_parent"
                    android:layout_height="@dimen/mini_player_height">
                    <LinearLayout
                        android:gravity="center"
                        android:orientation="horizontal"
                        android:id="@+id/mini_player_metadata"
                        android:layout_width="0dp"
                        android:layout_height="match_parent"
                        android:layout_weight="1">
                        <View
                            android:id="@+id/mini_player_watch_fragment_spacer"
                            android:layout_width="@dimen/mini_player_watch_fragment_length"
                            android:layout_height="@dimen/mini_player_watch_fragment_length"
                            android:layout_marginStart="@dimen/item_large_spacing"
                            android:layout_marginEnd="@dimen/item_large_spacing"/>
                        <LinearLayout
                            android:orientation="vertical"
                            android:layout_width="match_parent"
                            android:layout_height="wrap_content">
                            <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                                android:textColor="@color/ytm_color_white"
                                android:id="@+id/mini_player_title"
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:scrollHorizontally="true"
                                android:singleLine="true"
                                android:marqueeRepeatLimit="marquee_forever"
                                style="@style/YtmTitle02"/>
                            <LinearLayout
                                android:gravity="center_vertical"
                                android:orientation="horizontal"
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content">
                                <LinearLayout
                                    android:orientation="horizontal"
                                    android:id="@+id/mini_player_subtitle_badges_container"
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:divider="@drawable/badge_container_space_divider"
                                    android:showDividers="end|middle"/>
                                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                                    android:textColor="@color/ytm_text_color_secondary_translucent"
                                    android:id="@+id/mini_player_subtitle"
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:maxLines="1"
                                    style="@style/YtmSubtitle01"/>
                            </LinearLayout>
                        </LinearLayout>
                    </LinearLayout>
                    <FrameLayout
                        android:id="@+id/mini_player_media_route_container"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content">
                        <com.google.android.libraries.youtube.mdx.mediaroute.MdxMediaRouteButton
                            android:id="@+id/mini_player_media_route_button"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            style="@style/Widget.MediaRouter.MediaRouteButton"/>
                    </FrameLayout>
                    <com.google.android.libraries.youtube.common.ui.TouchImageView
                        android:id="@+id/mini_player_ask_music_global_entry_button"
                        android:visibility="gone"
                        android:layout_width="@dimen/remix_generic_button_size"
                        android:layout_height="@dimen/remix_generic_button_size"
                        android:scaleType="center"
                        style="@style/MusicPlayerButton"/>
                    <com.google.android.libraries.youtube.common.ui.TouchImageView
                        android:id="@+id/mini_player_play_pause_replay_button"
                        android:padding="@dimen/item_medium_spacing"
                        android:layout_width="@dimen/remix_generic_button_size"
                        android:layout_height="@dimen/remix_generic_button_size"
                        android:scaleType="fitCenter"
                        android:contentDescription="@string/accessibility_play"
                        style="@style/MusicPlayerButton"/>
                </LinearLayout>
                <FrameLayout
                    android:id="@+id/mini_player_view_pager_container"
                    android:layout_width="match_parent"
                    android:layout_height="match_parent">
                    <FrameLayout
                        android:id="@+id/mini_player_view_pager_item"
                        android:fadingEdge="horizontal"
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:requiresFadingEdge="horizontal"/>
                    <View
                        android:layout_gravity="end"
                        android:id="@+id/mini_player_view_pager_fade_edge"
                        android:layout_width="@dimen/item_small_spacing"
                        android:layout_height="match_parent"/>
                </FrameLayout>
            </FrameLayout>
            <LinearLayout
                android:orientation="vertical"
                android:id="@+id/current_song_view"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:baselineAligned="false"
                android:paddingStart="@dimen/player_page_padding_horizontal"
                android:paddingEnd="@dimen/player_page_padding_horizontal">
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:textAppearance="@style/TextAppearance.YouTubeMusic.Display1Modern"
                    android:textColor="@color/ytm_color_white"
                    android:id="@+id/title"
                    android:focusable="true"
                    android:focusableInTouchMode="true"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:scrollHorizontally="true"
                    android:singleLine="true"
                    android:marqueeRepeatLimit="marquee_forever"
                    android:accessibilityHeading="true"/>
                <LinearLayout
                    android:gravity="center_vertical"
                    android:orientation="horizontal"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content">
                    <LinearLayout
                        android:orientation="horizontal"
                        android:id="@+id/subtitle_badges_container"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:divider="@drawable/badge_container_space_divider"
                        android:showDividers="end|middle"/>
                    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                        android:textSize="@dimen/now_playing_byline_font_size"
                        android:textColor="@color/ytm_text_color_secondary_translucent"
                        android:textColorLink="@drawable/player_page_artist_link_background"
                        android:ellipsize="end"
                        android:id="@+id/artist"
                        android:focusable="true"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:maxLines="1"
                        android:singleLine="true"
                        app:hyperlinksClickable="true"
                        app:robotoFont="regular"/>
                </LinearLayout>
            </LinearLayout>
            <FrameLayout
                android:id="@+id/video_action_bar"
                android:visibility="visible"
                android:layout_width="match_parent"
                android:layout_height="@dimen/remix_generic_button_size"/>
            <com.google.android.apps.youtube.music.watchpage.MusicPlaybackControls
                android:id="@+id/music_playback_controls"
                android:clipChildren="false"
                android:clipToPadding="false"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"/>
            <com.google.android.apps.youtube.music.ui.components.chipcloud.ChipCloudChipView
                android:id="@+id/mdx_chip_cloud_chip"
                android:visibility="gone"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"/>
        </FrameLayout>
        <include layout="@layout/player_bottom_sheet"/>
        <androidx.cardview.widget.CardView
            android:id="@+id/watch_fragment_container"
            android:layout_width="0dp"
            android:layout_height="0dp"
            app:cardBackgroundColor="@android:color/transparent"
            app:cardElevation="0dp">
            <fragment
                android:name="com.google.android.apps.youtube.music.watch.WatchFragment"
                android:id="@+id/watch_fragment"
                android:layout_width="match_parent"
                android:layout_height="match_parent"/>
        </androidx.cardview.widget.CardView>
        <FrameLayout
            android:id="@+id/player_view_pager_container"
            android:layout_width="match_parent"
            android:layout_height="match_parent"/>
        <include layout="@layout/watch_engagement_panel_layout"/>
        <FrameLayout
            android:id="@+id/player_page_draggable_area"
            android:focusable="false"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:importantForAccessibility="no"/>
    </androidx.coordinatorlayout.widget.CoordinatorLayout>
</com.google.android.apps.youtube.music.watchpage.ui.WatchWhileLayout>
```

### 2.2 `watch_while_layout_player.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_gravity="center_horizontal"
    android:id="@+id/player_page"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:behavior_hideable="true"
    app:layout_behavior="com.google.android.apps.youtube.music.watchpage.ui.PlayerPageBehavior">
    <FrameLayout
        android:id="@+id/player_page_background"
        android:visibility="invisible"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>
    <View
        android:id="@+id/player_page_scrim_top"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:alpha="0"
        android:importantForAccessibility="no"/>
    <LinearLayout
        android:orientation="vertical"
        android:id="@+id/player_page_scrim_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:alpha="0"
        android:importantForAccessibility="noHideDescendants">
        <Space
            android:layout_width="match_parent"
            android:layout_height="0dp"
            android:layout_weight="1"/>
        <View
            android:id="@+id/player_page_scrim_bottom"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>
    </LinearLayout>
    <FrameLayout
        android:id="@+id/player_page_bottom_layer"
        android:layout_width="0dp"
        android:layout_height="0dp">
        <FrameLayout
            android:id="@+id/companion_banner"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>
        <FrameLayout
            android:id="@+id/player_top_section"
            android:layout_width="match_parent"
            android:layout_height="wrap_content">
            <LinearLayout
                android:gravity="top"
                android:orientation="vertical"
                android:id="@+id/player_top_controls"
                android:visibility="invisible"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:paddingStart="@dimen/item_extra_small_spacing"
                android:paddingEnd="@dimen/item_extra_small_spacing">
                <LinearLayout
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:paddingStart="@dimen/item_extra_small_spacing"
                    android:paddingEnd="@dimen/item_extra_small_spacing">
                    <com.google.android.libraries.youtube.common.ui.TouchImageView
                        android:id="@+id/player_collapse_button"
                        android:layout_width="@dimen/remix_generic_button_size"
                        android:layout_height="@dimen/remix_generic_button_size"
                        android:src="@drawable/yt_outline_experimental_chevron_down_vd_theme_24"
                        android:scaleType="center"
                        android:tint="@color/ytm_color_white"
                        android:contentDescription="@string/accessibility_collapse"
                        style="@style/MusicPlayerButton"/>
                    <Space
                        android:layout_width="@dimen/remix_generic_button_size"
                        android:layout_height="@dimen/remix_generic_button_size"/>
                    <Space
                        android:id="@+id/top_bar_extra_space"
                        android:visibility="gone"
                        android:layout_width="@dimen/remix_generic_button_size"
                        android:layout_height="@dimen/remix_generic_button_size"/>
                    <FrameLayout
                        android:id="@+id/audio_video_switch_pill_container"
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"/>
                    <FrameLayout
                        android:id="@+id/cast_button_container"
                        android:layout_width="@dimen/remix_generic_button_size"
                        android:layout_height="@dimen/remix_generic_button_size"/>
                    <com.google.android.libraries.youtube.common.ui.TouchImageView
                        android:id="@+id/ask_music_global_entry_button"
                        android:visibility="gone"
                        android:layout_width="@dimen/remix_generic_button_size"
                        android:layout_height="@dimen/remix_generic_button_size"
                        android:scaleType="center"
                        style="@style/MusicPlayerButton"/>
                    <com.google.android.libraries.youtube.common.ui.TouchImageView
                        android:id="@+id/contextual_menu"
                        android:layout_width="@dimen/remix_generic_button_size"
                        android:layout_height="@dimen/remix_generic_button_size"
                        android:src="@drawable/yt_outline_experimental_overflow_vertical_vd_theme_24"
                        android:scaleType="center"
                        android:contentDescription="@string/accessibility_context_menu"
                        style="@style/MusicPlayerButton"/>
                </LinearLayout>
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:textSize="@dimen/player_container_text_size"
                    android:textColor="@color/ytm_text_color_secondary_translucent"
                    android:textColorLink="@color/ytm_text_color_secondary_translucent"
                    android:gravity="center"
                    android:id="@+id/container_text"
                    android:paddingTop="@dimen/item_extra_small_spacing"
                    android:paddingBottom="@dimen/item_small_spacing"
                    android:focusable="true"
                    android:visibility="gone"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:singleLine="true"
                    android:marqueeRepeatLimit="marquee_forever"
                    android:textAlignment="center"
                    android:paddingStart="@dimen/player_page_padding_horizontal"
                    android:paddingEnd="@dimen/player_page_padding_horizontal"
                    app:hyperlinksClickable="true"/>
            </LinearLayout>
            <LinearLayout
                android:gravity="center"
                android:orientation="horizontal"
                android:id="@+id/mini_player"
                android:focusable="true"
                android:visibility="invisible"
                android:layout_width="match_parent"
                android:layout_height="@dimen/mini_player_height">
                <LinearLayout
                    android:gravity="center"
                    android:orientation="horizontal"
                    android:id="@+id/mini_player_metadata"
                    android:layout_width="0dp"
                    android:layout_height="match_parent"
                    android:layout_weight="1">
                    <View
                        android:id="@+id/mini_player_watch_fragment_spacer"
                        android:layout_width="@dimen/mini_player_watch_fragment_length"
                        android:layout_height="@dimen/mini_player_watch_fragment_length"
                        android:layout_marginStart="@dimen/item_large_spacing"
                        android:layout_marginEnd="@dimen/item_large_spacing"/>
                    <LinearLayout
                        android:orientation="vertical"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content">
                        <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                            android:textColor="@color/ytm_color_white"
                            android:id="@+id/mini_player_title"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:scrollHorizontally="true"
                            android:singleLine="true"
                            android:marqueeRepeatLimit="marquee_forever"
                            style="@style/YtmTitle02"/>
                        <LinearLayout
                            android:gravity="center_vertical"
                            android:orientation="horizontal"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content">
                            <LinearLayout
                                android:orientation="horizontal"
                                android:id="@+id/mini_player_subtitle_badges_container"
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:divider="@drawable/badge_container_space_divider"
                                android:showDividers="end|middle"/>
                            <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                                android:textColor="@color/ytm_text_color_secondary_translucent"
                                android:id="@+id/mini_player_subtitle"
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:maxLines="1"
                                style="@style/YtmSubtitle01"/>
                        </LinearLayout>
                    </LinearLayout>
                </LinearLayout>
                <FrameLayout
                    android:id="@+id/mini_player_media_route_container"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content">
                    <com.google.android.libraries.youtube.mdx.mediaroute.MdxMediaRouteButton
                        android:id="@+id/mini_player_media_route_button"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        style="@style/Widget.MediaRouter.MediaRouteButton"/>
                </FrameLayout>
                <com.google.android.libraries.youtube.common.ui.TouchImageView
                    android:id="@+id/mini_player_ask_music_global_entry_button"
                    android:visibility="gone"
                    android:layout_width="@dimen/remix_generic_button_size"
                    android:layout_height="@dimen/remix_generic_button_size"
                    android:scaleType="center"
                    style="@style/MusicPlayerButton"/>
                <com.google.android.libraries.youtube.common.ui.TouchImageView
                    android:id="@+id/mini_player_play_pause_replay_button"
                    android:padding="@dimen/item_medium_spacing"
                    android:layout_width="@dimen/remix_generic_button_size"
                    android:layout_height="@dimen/remix_generic_button_size"
                    android:scaleType="fitCenter"
                    android:contentDescription="@string/accessibility_play"
                    style="@style/MusicPlayerButton"/>
            </LinearLayout>
            <FrameLayout
                android:id="@+id/mini_player_view_pager_container"
                android:layout_width="match_parent"
                android:layout_height="match_parent">
                <FrameLayout
                    android:id="@+id/mini_player_view_pager_item"
                    android:fadingEdge="horizontal"
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:requiresFadingEdge="horizontal"/>
                <View
                    android:layout_gravity="end"
                    android:id="@+id/mini_player_view_pager_fade_edge"
                    android:layout_width="@dimen/item_small_spacing"
                    android:layout_height="match_parent"/>
            </FrameLayout>
        </FrameLayout>
        <LinearLayout
            android:orientation="vertical"
            android:id="@+id/current_song_view"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:baselineAligned="false"
            android:paddingStart="@dimen/player_page_padding_horizontal"
            android:paddingEnd="@dimen/player_page_padding_horizontal">
            <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                android:textAppearance="@style/TextAppearance.YouTubeMusic.Display1Modern"
                android:textColor="@color/ytm_color_white"
                android:id="@+id/title"
                android:focusable="true"
                android:focusableInTouchMode="true"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:scrollHorizontally="true"
                android:singleLine="true"
                android:marqueeRepeatLimit="marquee_forever"
                android:accessibilityHeading="true"/>
            <LinearLayout
                android:gravity="center_vertical"
                android:orientation="horizontal"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content">
                <LinearLayout
                    android:orientation="horizontal"
                    android:id="@+id/subtitle_badges_container"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:divider="@drawable/badge_container_space_divider"
                    android:showDividers="end|middle"/>
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:textSize="@dimen/now_playing_byline_font_size"
                    android:textColor="@color/ytm_text_color_secondary_translucent"
                    android:textColorLink="@drawable/player_page_artist_link_background"
                    android:ellipsize="end"
                    android:id="@+id/artist"
                    android:focusable="true"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:maxLines="1"
                    android:singleLine="true"
                    app:hyperlinksClickable="true"
                    app:robotoFont="regular"/>
            </LinearLayout>
        </LinearLayout>
        <FrameLayout
            android:id="@+id/video_action_bar"
            android:visibility="visible"
            android:layout_width="match_parent"
            android:layout_height="@dimen/remix_generic_button_size"/>
        <com.google.android.apps.youtube.music.watchpage.MusicPlaybackControls
            android:id="@+id/music_playback_controls"
            android:clipChildren="false"
            android:clipToPadding="false"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>
        <com.google.android.apps.youtube.music.ui.components.chipcloud.ChipCloudChipView
            android:id="@+id/mdx_chip_cloud_chip"
            android:visibility="gone"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"/>
    </FrameLayout>
    <include layout="@layout/player_bottom_sheet"/>
    <androidx.cardview.widget.CardView
        android:id="@+id/watch_fragment_container"
        android:layout_width="0dp"
        android:layout_height="0dp"
        app:cardBackgroundColor="@android:color/transparent"
        app:cardElevation="0dp">
        <fragment
            android:name="com.google.android.apps.youtube.music.watch.WatchFragment"
            android:id="@+id/watch_fragment"
            android:layout_width="match_parent"
            android:layout_height="match_parent"/>
    </androidx.cardview.widget.CardView>
    <FrameLayout
        android:id="@+id/player_view_pager_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>
    <include layout="@layout/watch_engagement_panel_layout"/>
    <FrameLayout
        android:id="@+id/player_page_draggable_area"
        android:focusable="false"
        android:visibility="gone"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:importantForAccessibility="no"/>
</androidx.coordinatorlayout.widget.CoordinatorLayout>
```

### 2.3 `pivot_bar.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.tabs.TabLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:layout_gravity="bottom"
    android:id="@+id/pivot_bar"
    android:background="@color/ytm_color_grey_12"
    android:visibility="invisible"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    yt:tabGravity="fill"
    yt:tabIndicatorHeight="0dp"
    yt:tabMaxWidth="0dp"
    yt:tabUnboundedRipple="true"/>
```

### 2.4 `image_with_text_tab.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:orientation="vertical"
    android:paddingTop="6dp"
    android:layout_width="0dp"
    android:layout_height="wrap_content"
    android:minWidth="48dp"
    android:layout_weight="1">
    <ImageView
        android:layout_gravity="center"
        android:id="@+id/icon"
        android:layout_width="24dp"
        android:layout_height="24dp"
        android:scaleType="centerInside"
        android:contentDescription="@null"/>
    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
        android:textSize="@dimen/extra_extra_small_font_size"
        android:textColor="@color/ytm_text_color_primary"
        android:ellipsize="end"
        android:gravity="center"
        android:layout_gravity="center"
        android:id="@+id/text1"
        android:paddingTop="2dp"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:maxLines="1"
        android:includeFontPadding="false"
        yt:robotoFont="regular"/>
</LinearLayout>
```

### 2.5 `swipeable_mini_player_item_container.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    <androidx.cardview.widget.CardView
        android:id="@+id/card_view_container"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:cardBackgroundColor="@android:color/transparent"
        app:cardElevation="0dp">
        <LinearLayout
            android:gravity="center"
            android:orientation="horizontal"
            android:layout_width="match_parent"
            android:layout_height="match_parent">
            <androidx.cardview.widget.CardView
                android:id="@+id/swipeable_mini_player_thumbnail_container"
                android:focusable="false"
                android:clickable="false"
                android:layout_width="@dimen/mini_player_watch_fragment_length"
                android:layout_height="@dimen/mini_player_watch_fragment_length"
                android:layout_marginStart="@dimen/item_large_spacing"
                android:layout_marginEnd="@dimen/item_large_spacing"
                app:cardBackgroundColor="@android:color/transparent"
                app:cardCornerRadius="0dp"
                app:cardElevation="0dp"
                app:cardPreventCornerOverlap="false"
                app:cardUseCompatPadding="false">
                <ImageView
                    android:id="@+id/swipeable_mini_player_thumbnail"
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:importantForAccessibility="no"/>
            </androidx.cardview.widget.CardView>
            <LinearLayout
                android:orientation="vertical"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1">
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:textColor="@color/ytm_color_white"
                    android:id="@+id/swipeable_mini_player_title"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:scrollHorizontally="true"
                    android:singleLine="true"
                    android:marqueeRepeatLimit="marquee_forever"
                    android:textAlignment="viewStart"
                    app:typographyAppearanceToken="?attr/yt_sys_typography_typestack_body_m_heavy"
                    style="@style/YtmTitle02"/>
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:textColor="@color/ytm_text_color_secondary_translucent"
                    android:id="@+id/swipeable_mini_player_subtitle"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:maxLines="1"
                    android:textAlignment="viewStart"
                    app:typographyAppearanceToken="?attr/yt_sys_typography_typestack_body_m_default"
                    style="@style/YtmSubtitle01"/>
            </LinearLayout>
        </LinearLayout>
    </androidx.cardview.widget.CardView>
</FrameLayout>
```

### 2.6 `player_bottom_sheet.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.apps.youtube.music.watchpage.ui.PlayerBottomSheet xmlns:android="http://schemas.android.com/apk/res/android" xmlns:app="http://schemas.android.com/apk/res-auto"
    android:orientation="vertical"
    android:id="@+id/player_bottom_sheet"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:behavior_hideable="false"
    app:dragHandleId="@+id/bottom_sheet_drag_handle"
    app:layout_behavior="com.google.android.apps.youtube.music.watchpage.ui.PlayerPageBehavior"
    app:queueHeaderId="@+id/queue_page_header"
    app:tabbedViewId="@+id/bottom_sheet_tabbed_view">
    <ImageView
        android:layout_gravity="center"
        android:id="@+id/bottom_sheet_drag_handle"
        android:paddingTop="@dimen/item_small_spacing"
        android:paddingBottom="@dimen/item_extra_small_spacing"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:src="@drawable/single_bar_drag_handle"
        android:tint="@color/ytm_color_white"
        android:contentDescription="@string/drag_handle_content_description"
        android:alpha="@dimen/tab_drag_handle_alpha"/>
    <com.google.android.apps.youtube.music.ui.tabs.TabbedView
        android:id="@+id/bottom_sheet_tabbed_view"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        app:scrollable="false"/>
</com.google.android.apps.youtube.music.watchpage.ui.PlayerBottomSheet>
```

### 2.7 `player_page_tab_title.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.libraries.youtube.common.ui.YouTubeTextView xmlns:android="http://schemas.android.com/apk/res/android" xmlns:app="http://schemas.android.com/apk/res-auto"
    android:textColor="?attr/ytTextPrimary"
    android:ellipsize="marquee"
    android:gravity="center"
    android:id="@+id/player_page_tab_title"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:scrollHorizontally="true"
    android:singleLine="true"
    android:marqueeRepeatLimit="marquee_forever"
    app:typographyAppearanceToken="?attr/yt_sys_typography_typestack_action_m_default"
    style="@style/YtmTitle02"/>
```

### 2.8 `playback_controls.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:clipChildren="false"
    android:layout_width="match_parent"
    android:layout_height="wrap_content">
    <com.google.android.apps.youtube.music.watchpage.MusicPlaybackControlsTimeBar
        android:id="@+id/time_bar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginBottom="@dimen/time_bar_margin_bottom"
        android:importantForAccessibility="yes"
        android:paddingStart="@dimen/time_bar_padding_horizontal"
        android:paddingEnd="@dimen/time_bar_padding_horizontal"
        yt:textMargin="@dimen/item_extra_small_spacing"
        yt:timeBarHeight="@dimen/time_bar_height"
        yt:timeTextColor="@color/ytm_text_color_secondary_translucent"/>
    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
        android:gravity="start|center_vertical"
        android:id="@+id/live_label"
        android:visibility="gone"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="@dimen/live_indicator_top_margin"
        android:layout_alignTop="@+id/time_bar"
        android:contentDescription="@string/live_label"
        android:textAlignment="viewStart"
        android:paddingStart="@dimen/time_bar_padding_horizontal"
        yt:typographyAppearanceToken="?attr/yt_sys_typography_typestack_body_m_heavy"
        style="@style/PlayerLiveBadge"/>
    <LinearLayout
        android:gravity="center"
        android:layout_gravity="center"
        android:orientation="horizontal"
        android:id="@+id/controls_container"
        android:clipChildren="false"
        android:clipToPadding="false"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginBottom="@dimen/controls_container_margin_bottom"
        android:layout_below="@+id/time_bar"
        android:layout_centerHorizontal="true"
        android:layoutDirection="ltr"
        android:paddingStart="@dimen/playback_controls_padding_horizontal"
        android:paddingEnd="@dimen/playback_controls_padding_horizontal">
        <include
            android:layout_gravity="center_vertical"
            android:id="@+id/playback_queue_shuffle_button_view"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:contentDescription="@string/accessibility_music_shuffle"
            layout="@layout/music_playback_control_button_view"/>
        <android.support.v7.widget.AppCompatImageView
            android:layout_gravity="center_vertical"
            android:id="@+id/playback_rate_button"
            android:background="@drawable/ripple"
            android:visibility="gone"
            android:layout_width="@dimen/remix_overlay_player_control_button_size"
            android:layout_height="@dimen/remix_overlay_player_control_button_size"
            android:scaleType="center"
            android:contentDescription="@string/accessibility_playback_rate"
            android:alpha="@dimen/active_icon_alpha"
            yt:tint="@color/quantum_white_100"
            style="@style/MusicPlayerButton"/>
        <com.google.android.libraries.youtube.common.ui.YouTubeButton
            android:textAppearance="?attr/ytTextAppearanceBody2b"
            android:textSize="@dimen/playback_rate_text_button_text_size"
            android:textColor="@color/quantum_white_100"
            android:gravity="center"
            android:layout_gravity="center_vertical"
            android:id="@+id/playback_rate_text_button"
            android:background="@drawable/ripple"
            android:visibility="gone"
            android:layout_width="@dimen/remix_overlay_player_control_button_size"
            android:layout_height="@dimen/remix_overlay_player_control_button_size"
            android:text="@string/default_playback_rate_button_text"
            android:contentDescription="@string/accessibility_playback_rate"
            android:alpha="@dimen/disabled_icon_alpha"
            style="@style/MusicPlayerButton"/>
        <View
            android:layout_width="0dp"
            android:layout_height="0dp"
            android:layout_weight="1"/>
        <com.google.android.libraries.youtube.common.ui.TouchImageView
            android:layout_gravity="center_vertical"
            android:id="@+id/player_control_rewind_button"
            android:background="@drawable/ripple"
            android:visibility="gone"
            android:layout_width="@dimen/remix_overlay_player_control_button_size"
            android:layout_height="@dimen/remix_overlay_player_control_button_size"
            android:src="@drawable/yt_outline_experimental_skip10_back_vd_theme_36"
            android:scaleType="center"
            android:tint="@color/quantum_white_100"
            android:contentDescription="@string/accessibility_rewind"
            style="@style/MusicPlayerButton"/>
        <com.google.android.libraries.youtube.common.ui.TouchImageView
            android:layout_gravity="center_vertical"
            android:id="@+id/player_control_previous_button"
            android:background="@drawable/ripple"
            android:layout_width="@dimen/remix_overlay_player_control_button_size"
            android:layout_height="@dimen/remix_overlay_player_control_button_size"
            android:src="@drawable/yt_fill_experimental_skip_previous_vd_theme_36"
            android:scaleType="center"
            android:contentDescription="@string/accessibility_previous_track_enabled"
            style="@style/MusicPlayerButton"/>
        <View
            android:layout_width="0dp"
            android:layout_height="0dp"
            android:layout_weight="1"/>
        <com.google.android.libraries.youtube.common.ui.TouchImageView
            android:layout_gravity="center_vertical"
            android:id="@+id/player_control_play_pause_replay_button"
            android:background="@drawable/ripple"
            android:layout_width="@dimen/remix_overlay_play_button_size_large"
            android:layout_height="@dimen/remix_overlay_play_button_size_large"
            android:contentDescription="@string/accessibility_play"
            android:layout_marginStart="@dimen/playback_controls_space_medium"
            android:layout_marginEnd="@dimen/playback_controls_space_medium"/>
        <View
            android:layout_width="0dp"
            android:layout_height="0dp"
            android:layout_weight="1"/>
        <com.google.android.libraries.youtube.common.ui.TouchImageView
            android:layout_gravity="center_vertical"
            android:id="@+id/player_control_next_button"
            android:background="@drawable/ripple"
            android:layout_width="@dimen/remix_overlay_player_control_button_size"
            android:layout_height="@dimen/remix_overlay_player_control_button_size"
            android:src="@drawable/yt_fill_experimental_skip_next_vd_theme_36"
            android:scaleType="center"
            android:contentDescription="@string/accessibility_next_track_enabled"
            style="@style/MusicPlayerButton"/>
        <com.google.android.libraries.youtube.common.ui.TouchImageView
            android:layout_gravity="center_vertical"
            android:id="@+id/player_control_fast_forward_button"
            android:background="@drawable/ripple"
            android:visibility="gone"
            android:layout_width="@dimen/remix_overlay_player_control_button_size"
            android:layout_height="@dimen/remix_overlay_player_control_button_size"
            android:src="@drawable/yt_outline_experimental_skip30_forward_vd_theme_36"
            android:scaleType="center"
            android:tint="@color/quantum_white_100"
            android:contentDescription="@string/accessibility_fast_forward_30_seconds"
            style="@style/MusicPlayerButton"/>
        <View
            android:layout_width="0dp"
            android:layout_height="0dp"
            android:layout_weight="1"/>
        <include
            android:layout_gravity="center_vertical"
            android:id="@+id/playback_queue_loop_button_view"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:contentDescription="@string/accessibility_music_repeat"
            layout="@layout/music_playback_control_button_view"/>
        <android.support.v7.widget.AppCompatImageView
            android:layout_gravity="center_vertical"
            android:id="@+id/sleep_timer_button"
            android:background="@drawable/ripple"
            android:visibility="gone"
            android:layout_width="@dimen/remix_overlay_player_control_button_size"
            android:layout_height="@dimen/remix_overlay_player_control_button_size"
            android:scaleType="center"
            android:alpha="@dimen/active_icon_alpha"
            yt:srcCompat="@drawable/yt_outline_experimental_sleep_timer_vd_theme_24"
            yt:tint="@color/quantum_white_100"
            style="@style/MusicPlayerButton"/>
    </LinearLayout>
</RelativeLayout>
```

### 2.9 `music_two_column_item.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.libraries.youtube.common.ui.swipelayout.SwipeLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:id="@+id/swipe_layout"
    android:layout_width="match_parent"
    android:layout_height="wrap_content">
    <RelativeLayout
        android:id="@+id/two_column_item_content_parent"
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        <RelativeLayout
            android:id="@+id/two_column_item_content"
            android:layout_width="match_parent"
            android:layout_height="wrap_content">
            <FrameLayout
                android:id="@+id/two_column_item_highlight"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_alignBottom="@+id/thumbnail_index_container"
                android:layout_alignParentTop="true"
                android:layout_marginStart="@dimen/two_column_item_horizontal_padding"
                android:layout_alignParentStart="true"/>
            <LinearLayout
                android:orientation="horizontal"
                android:id="@+id/thumbnail_index_container"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_centerVertical="true"
                android:layout_marginStart="@dimen/two_column_item_horizontal_padding"
                android:layout_marginEnd="@dimen/two_column_item_horizontal_padding"
                android:layout_alignParentStart="true">
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:textSize="@dimen/small_font_size"
                    android:textColor="@color/ytm_text_color_primary"
                    android:gravity="center"
                    android:layout_gravity="center_vertical"
                    android:id="@+id/list_index"
                    android:visibility="gone"
                    android:layout_width="@dimen/two_column_item_list_index_width"
                    android:layout_height="@dimen/two_column_item_image_size"
                    android:layout_marginTop="@dimen/two_column_item_vertical_padding"
                    android:layout_marginBottom="@dimen/two_column_item_vertical_padding"
                    yt:robotoFont="medium"/>
                <FrameLayout
                    android:id="@+id/thumbnail_parent"
                    android:layout_width="@dimen/two_column_item_image_size"
                    android:layout_height="@dimen/two_column_item_image_size"
                    android:layout_marginTop="@dimen/two_column_item_vertical_padding"
                    android:layout_marginBottom="@dimen/two_column_item_vertical_padding"/>
                <LinearLayout
                    android:layout_gravity="center_vertical"
                    android:orientation="horizontal"
                    android:id="@+id/custom_index_column_container"
                    android:visibility="gone"
                    android:layout_width="@dimen/music_custom_index_column_container_width"
                    android:layout_height="@dimen/two_column_item_image_size"
                    android:layout_marginStart="@dimen/item_extra_small_spacing"
                    android:layout_marginEnd="@dimen/item_extra_small_spacing"/>
            </LinearLayout>
            <FrameLayout
                android:id="@+id/contextual_menu_container"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:minWidth="@dimen/two_column_item_horizontal_padding"
                android:layout_centerVertical="true"
                android:layout_alignParentEnd="true">
                <android.support.v7.widget.RecyclerView
                    android:id="@+id/top_level_menu_buttons_anchor"
                    android:visibility="gone"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:paddingStart="@dimen/music_overflow_button_horizontal_left_padding"
                    android:paddingEnd="@dimen/music_overflow_button_horizontal_right_padding"/>
                <ImageView
                    android:id="@+id/contextual_menu_anchor"
                    android:background="@drawable/ripple"
                    android:paddingTop="@dimen/music_overflow_button_vertical_padding"
                    android:paddingBottom="@dimen/music_overflow_button_vertical_padding"
                    android:visibility="gone"
                    android:layout_width="@dimen/music_overflow_button_plus_horizontal_padding_size"
                    android:layout_height="@dimen/music_overflow_button_plus_vertical_padding_size"
                    android:src="0x7f080b5b"
                    android:tint="@color/ytm_icon_color_active"
                    android:contentDescription="@string/accessibility_context_menu"
                    android:alpha="@dimen/active_icon_alpha"
                    android:paddingStart="@dimen/music_overflow_button_horizontal_padding"
                    android:paddingEnd="@dimen/music_overflow_button_horizontal_padding"/>
                <android.support.v7.widget.AppCompatImageView
                    android:id="@+id/drag_handle_indicator"
                    android:padding="@dimen/two_column_item_horizontal_padding"
                    android:visibility="gone"
                    android:layout_width="wrap_content"
                    android:layout_height="match_parent"
                    android:contentDescription="@string/accessibility_drag_handler"
                    yt:srcCompat="0x7f0809d8"
                    yt:tint="@color/ytm_icon_color_active"/>
            </FrameLayout>
            <LinearLayout
                android:orientation="vertical"
                android:id="@+id/details_container"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_centerVertical="true"
                android:layout_toStartOf="@+id/contributor_avatars_container"
                android:layout_toEndOf="@+id/thumbnail_index_container">
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:textColor="@color/ytm_color_white"
                    android:ellipsize="end"
                    android:id="@+id/title"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:maxLines="2"
                    android:textAlignment="viewStart"/>
                <LinearLayout
                    android:orientation="horizontal"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content">
                    <LinearLayout
                        android:orientation="horizontal"
                        android:id="@+id/subtitle_badges_container"
                        android:paddingTop="@dimen/two_column_item_badge_container_padding_top"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:divider="@drawable/badge_container_space_divider"
                        android:showDividers="end|middle"/>
                    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                        android:textAppearance="@style/TextAppearance.YouTubeMusic.Subtitle1.Translucent"
                        android:ellipsize="end"
                        android:id="@+id/subtitle"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:maxLines="1"
                        android:textAlignment="viewStart"/>
                </LinearLayout>
                <FrameLayout
                    android:id="@+id/engagement_bar_container"
                    android:visibility="gone"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="4dp"
                    android:layout_marginStart="0dp"/>
            </LinearLayout>
            <FrameLayout
                android:layout_gravity="center_vertical"
                android:orientation="horizontal"
                android:id="@+id/contributor_avatars_container"
                android:visibility="visible"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_toLeftOf="@+id/contextual_menu_container"
                android:layout_centerVertical="true"/>
        </RelativeLayout>
        <FrameLayout
            android:id="@+id/thumbnail_overlay_parent"
            android:layout_width="@dimen/two_column_item_image_size"
            android:layout_height="@dimen/two_column_item_image_size"
            android:layout_centerVertical="true"
            android:layout_marginStart="@dimen/two_column_item_horizontal_padding"
            android:layout_alignParentStart="true"/>
    </RelativeLayout>
</com.google.android.libraries.youtube.common.ui.swipelayout.SwipeLayout>
```

### 2.10 `music_two_row_item.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/two_row_item"
    android:focusable="true"
    android:layout_width="wrap_content"
    android:layout_height="match_parent">
    <FrameLayout
        android:id="@+id/thumbnail_outer_container"
        android:focusable="false"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content">
        <FrameLayout
            android:id="@+id/thumbnail_container"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"/>
        <FrameLayout
            android:id="@+id/thumbnail_corner_overlay_container"
            android:layout_width="match_parent"
            android:layout_height="match_parent"/>
    </FrameLayout>
    <RelativeLayout
        android:id="@+id/title_layout"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_below="@+id/thumbnail_outer_container"
        android:layout_alignStart="@+id/thumbnail_outer_container"
        android:layout_alignEnd="@+id/thumbnail_outer_container">
        <LinearLayout
            android:orientation="horizontal"
            android:id="@+id/title_badges_container"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:divider="@drawable/badge_container_space_divider"
            android:showDividers="end|middle"/>
        <com.google.android.libraries.youtube.common.ui.YouTubeTextView
            android:textAppearance="@style/TextAppearance.YouTubeMusic.Title2"
            android:textColor="@color/ytm_color_white"
            android:ellipsize="end"
            android:id="@+id/title"
            android:paddingTop="@dimen/item_extra_small_spacing"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:maxLines="2"/>
    </RelativeLayout>
    <RelativeLayout
        android:id="@+id/subtitle_layout"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="@dimen/two_row_item_subtitle_container_margin_top"
        android:layout_below="@+id/title_layout"
        android:layout_alignStart="@+id/thumbnail_outer_container"
        android:layout_alignEnd="@+id/thumbnail_outer_container">
        <LinearLayout
            android:orientation="horizontal"
            android:id="@+id/subtitle_badges_container"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:divider="@drawable/badge_container_space_divider"
            android:showDividers="end|middle"/>
        <com.google.android.libraries.youtube.common.ui.YouTubeTextView
            android:textAppearance="@style/TextAppearance.YouTubeMusic.Subtitle1.Translucent"
            android:ellipsize="end"
            android:id="@+id/subtitle"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:minLines="2"
            android:lineSpacingExtra="@dimen/two_row_item_text_spacing"/>
    </RelativeLayout>
    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
        android:textAppearance="@style/TextAppearance.YouTubeMusic.Reason2.Translucent"
        android:ellipsize="end"
        android:id="@+id/third_title"
        android:paddingTop="@dimen/two_row_item_text_spacing"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:maxLines="2"
        android:layout_below="@+id/subtitle_layout"
        android:layout_alignStart="@+id/thumbnail_outer_container"
        android:layout_alignEnd="@+id/thumbnail_outer_container"/>
    <com.google.android.libraries.youtube.common.ui.YouTubeButton
        android:textSize="@dimen/small_font_size"
        android:gravity="center_horizontal"
        android:id="@+id/reminder_button"
        android:paddingTop="@dimen/item_medium_spacing"
        android:paddingBottom="@dimen/item_medium_spacing"
        android:visibility="gone"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="@dimen/two_row_item_text_spacing"
        android:minWidth="@dimen/two_row_item_footer_button_min_width"
        android:layout_below="@+id/third_title"
        android:textAllCaps="false"
        android:layout_alignStart="@+id/thumbnail_outer_container"/>
</RelativeLayout>
```

### 2.11 `music_shelf_header.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:app="http://schemas.android.com/apk/res-auto"
    android:orientation="vertical"
    android:id="@+id/music_shelf_header"
    android:layout_width="match_parent"
    android:layout_height="wrap_content">
    <LinearLayout
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:baselineAligned="false"
        android:minHeight="@dimen/header_min_height">
        <LinearLayout
            android:orientation="vertical"
            android:id="@+id/title_container"
            android:paddingTop="@dimen/header_vertical_padding"
            android:paddingBottom="@dimen/header_vertical_padding"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:paddingStart="@dimen/header_horizontal_padding"
            android:paddingEnd="@dimen/header_horizontal_padding">
            <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                android:textAppearance="@style/TextAppearance.YouTubeMusic.Subtitle1"
                android:ellipsize="end"
                android:gravity="center_vertical"
                android:id="@+id/shelf_strapline"
                android:paddingBottom="@dimen/header_text_spacing"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:maxLines="1"
                android:includeFontPadding="false"
                android:drawablePadding="@dimen/header_image_spacing"
                app:typographyAppearanceToken="?attr/yt_sys_typography_typestack_body_m_default"/>
            <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                android:textAppearance="@style/TextAppearance.YouTubeMusic.Display1"
                android:ellipsize="end"
                android:gravity="start|center_vertical"
                android:id="@+id/title"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:maxLines="2"
                android:includeFontPadding="false"
                android:drawablePadding="@dimen/header_image_spacing"
                android:textAlignment="viewStart"/>
            <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                android:textAppearance="@style/TextAppearance.YouTubeMusic.Subtitle1"
                android:ellipsize="end"
                android:gravity="center_vertical"
                android:id="@+id/shelf_subtitle"
                android:paddingTop="@dimen/header_text_spacing"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:maxLines="2"
                android:includeFontPadding="false"
                android:drawablePadding="@dimen/header_image_spacing"
                app:typographyAppearanceToken="?attr/yt_sys_typography_typestack_body_m_default"/>
        </LinearLayout>
        <LinearLayout
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:id="@+id/icon_links"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:paddingEnd="@dimen/header_horizontal_padding"/>
        <include
            android:id="@+id/contextual_menu_anchor"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            layout="@layout/contextual_menu_anchor"/>
    </LinearLayout>
    <include
        android:id="@+id/divider"
        android:visibility="gone"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        layout="@layout/toolbar_divider"/>
</LinearLayout>
```

### 2.12 `music_carousel_shelf.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:orientation="vertical"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:importantForAccessibility="no">
    <FrameLayout
        android:id="@+id/header_container"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"/>
    <android.support.v7.widget.RecyclerView
        android:layout_gravity="bottom"
        android:id="@+id/carousel_content"
        android:paddingTop="@dimen/carousel_top_padding"
        android:paddingBottom="@dimen/carousel_bottom_padding_small"
        android:scrollbars="none"
        android:clipToPadding="false"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:paddingStart="@dimen/item_small_spacing"
        android:paddingEnd="@dimen/item_small_spacing"/>
    <com.google.android.apps.youtube.music.ui.presenter.MusicSnappyRecyclerView
        android:layout_gravity="bottom"
        android:id="@+id/carousel_content_snappy"
        android:paddingTop="@dimen/carousel_top_padding"
        android:paddingBottom="@dimen/carousel_bottom_padding_small"
        android:visibility="gone"
        android:scrollbars="none"
        android:clipToPadding="false"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:paddingStart="@dimen/item_small_spacing"
        android:paddingEnd="@dimen/item_small_spacing"/>
</LinearLayout>
```

### 2.13 `music_immersive_carousel_shelf.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    <ImageView
        android:id="@+id/background_image"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:scaleType="matrix"
        android:adjustViewBounds="true"
        android:importantForAccessibility="no"/>
    <View
        android:id="@+id/background_uniform_overlay"
        android:background="@color/ytm_color_grey_12_at_55pct"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>
    <View
        android:id="@+id/background_overlay_gradient"
        android:background="@drawable/immersive_shelf_background_overlay_gradient"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>
    <LinearLayout
        android:orientation="vertical"
        android:id="@+id/foreground_container"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="@dimen/immersive_shelf_strapline_margin_top">
        <FrameLayout
            android:id="@+id/header_container"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>
        <android.support.v7.widget.RecyclerView
            android:layout_gravity="bottom"
            android:id="@+id/carousel_content"
            android:paddingTop="@dimen/carousel_top_padding"
            android:paddingBottom="@dimen/immersive_shelf_bottom_padding"
            android:scrollbars="none"
            android:clipToPadding="false"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:paddingStart="@dimen/item_small_spacing"
            android:paddingEnd="@dimen/item_small_spacing"/>
    </LinearLayout>
</FrameLayout>
```

### 2.14 `music_navigation_button.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:app="http://schemas.android.com/apk/res-auto"
    android:gravity="center"
    android:layout_width="match_parent"
    android:layout_height="wrap_content">
    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
        android:textAppearance="@style/TextAppearance.YouTubeMusic.Title2"
        android:textColor="@color/ytm_color_white"
        android:ellipsize="end"
        android:gravity="start|center_vertical"
        android:id="@+id/music_navigation_button"
        android:layout_width="match_parent"
        android:layout_height="@dimen/navigation_button_height"
        android:lines="2"
        android:paddingStart="@dimen/navigation_button_left_padding"
        android:paddingEnd="@dimen/navigation_button_right_padding"
        app:typographyAppearanceToken="?attr/yt_sys_typography_typestack_action_m_default"/>
</FrameLayout>
```

### 2.15 `detail_page_header.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:id="@+id/detail_header_container"
    android:layout_width="match_parent"
    android:layout_height="wrap_content">
    <LinearLayout
        android:orientation="vertical"
        android:background="@color/ytm_color_black"
        android:paddingBottom="@dimen/item_small_spacing"
        android:focusable="true"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:accessibilityTraversalAfter="@+id/detail_page_toolbar">
        <RelativeLayout
            android:id="@+id/header_info_container"
            android:background="@color/header_color"
            android:paddingTop="?attr/actionBarSize"
            android:layout_width="match_parent"
            android:layout_height="wrap_content">
            <LinearLayout
                android:gravity="center_vertical"
                android:orientation="horizontal"
                android:id="@+id/header_info"
                android:paddingTop="@dimen/item_large_spacing"
                android:paddingBottom="@dimen/music_entity_header_bottom_margin"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:baselineAligned="false"
                android:paddingStart="@dimen/item_large_spacing"
                android:paddingEnd="@dimen/item_large_spacing">
                <com.google.android.libraries.youtube.common.ui.FixedAspectRatioRelativeLayout
                    android:id="@+id/entity_thumbnail_container"
                    android:layout_width="@dimen/music_entity_thumbnail_size"
                    android:layout_height="wrap_content"
                    android:layout_weight="@integer/music_entity_thumbnail_weight">
                    <com.makeramen.RoundedImageView
                        android:id="@+id/entity_thumbnail"
                        android:layout_width="match_parent"
                        android:layout_height="match_parent"
                        android:scaleType="centerCrop"
                        android:contentDescription="@null"
                        yt:corner_radius="@dimen/music_entity_header_thumbnail_corner_radius"/>
                </com.google.android.libraries.youtube.common.ui.FixedAspectRatioRelativeLayout>
                <RelativeLayout
                    android:id="@+id/entity_info_container"
                    android:layout_width="@dimen/music_entity_title_view_size"
                    android:layout_height="wrap_content">
                    <com.google.android.apps.youtube.music.ui.text.MusicAutoResizeTextView
                        android:textAppearance="@style/TextAppearance.YouTubeMusic.Display1"
                        android:ellipsize="end"
                        android:id="@+id/entity_header_title"
                        android:focusable="true"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:maxLines="3"
                        android:textAlignment="viewStart"
                        android:layout_marginStart="@dimen/item_medium_spacing"
                        yt:hyperlinksClickable="true"
                        yt:smallTextSize="@dimen/music_entity_header_title_size_small"/>
                    <com.google.android.apps.youtube.music.ui.text.NoScrollTextView
                        android:textAppearance="@style/TextAppearance.YouTubeMusic.Subtitle1"
                        android:textColorLink="@color/ytm_color_white"
                        android:ellipsize="end"
                        android:id="@+id/entity_header_second_title"
                        android:focusable="true"
                        android:visibility="gone"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:maxLines="2"
                        android:layout_below="@+id/entity_header_title"
                        android:textAlignment="viewStart"
                        android:layout_alignStart="@+id/entity_header_title"
                        yt:hyperlinksClickable="true"
                        yt:robotoFont="regular"/>
                    <LinearLayout
                        android:orientation="horizontal"
                        android:id="@+id/entity_header_subtitle_container"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:layout_below="@+id/entity_header_second_title"
                        android:layout_alignStart="@+id/entity_header_title">
                        <LinearLayout
                            android:gravity="center"
                            android:orientation="horizontal"
                            android:id="@+id/subtitle_badges_container"
                            android:paddingTop="@dimen/entity_header_subtitle_badge_container_padding_top"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:divider="@drawable/badge_container_space_divider"
                            android:showDividers="end|middle"/>
                        <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                            android:textAppearance="@style/TextAppearance.YouTubeMusic.Subtitle1"
                            android:ellipsize="end"
                            android:id="@+id/entity_header_subtitle"
                            android:focusable="true"
                            android:layout_width="match_parent"
                            android:layout_height="wrap_content"
                            android:maxLines="2"
                            android:textAlignment="viewStart"
                            yt:robotoFont="regular"
                            yt:typographyAppearanceToken="?attr/yt_sys_typography_typestack_body_m_default"/>
                    </LinearLayout>
                    <android.support.v7.widget.RecyclerView
                        android:id="@+id/top_level_menu_buttons_anchor"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:layout_below="@+id/entity_header_subtitle_container"/>
                    <include
                        android:id="@+id/contextual_menu_anchor"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:layout_below="@+id/entity_header_subtitle_container"
                        android:layout_toEndOf="@+id/top_level_menu_buttons_anchor"
                        layout="@layout/contextual_menu_anchor"/>
                </RelativeLayout>
            </LinearLayout>
            <View
                android:id="@+id/entity_header_scrim"
                android:background="@color/header_color"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_alignTop="@+id/header_info"
                android:layout_alignBottom="@+id/header_info"
                android:alpha="0"/>
        </RelativeLayout>
        <LinearLayout
            android:layout_gravity="bottom"
            android:orientation="vertical"
            android:id="@+id/header_additional_info_container"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="16dp"
            android:divider="?android:attr/dividerHorizontal"
            android:showDividers="beginning"/>
        <LinearLayout
            android:layout_gravity="bottom"
            android:orientation="vertical"
            android:id="@+id/alert_container"
            android:background="@color/ytm_color_black"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="16dp"
            android:paddingStart="16dp"
            android:paddingEnd="16dp"/>
    </LinearLayout>
</FrameLayout>
```

### 2.16 `detail_header_buttons_byline.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:gravity="center_vertical"
    android:orientation="vertical"
    android:background="@color/theme_main_window_background"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    <LinearLayout
        android:orientation="horizontal"
        android:id="@+id/specialty_buttons_container"
        android:visibility="gone"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:baselineAligned="false"
        android:layout_marginStart="@dimen/item_medium_spacing"
        android:layout_marginEnd="@dimen/item_medium_spacing">
        <FrameLayout
            android:id="@+id/left_button_container"
            android:visibility="gone"
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:minWidth="@dimen/detail_page_specialty_button_min_width"
            android:layout_weight="1"
            android:layout_marginEnd="@dimen/item_small_spacing">
            <com.google.android.libraries.youtube.common.ui.YouTubeButton
                android:layout_gravity="center"
                android:id="@+id/left_button"
                android:layout_width="wrap_content"
                android:layout_height="match_parent"
                android:singleLine="true"/>
        </FrameLayout>
        <FrameLayout
            android:id="@+id/right_button_container"
            android:visibility="gone"
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:minWidth="@dimen/detail_page_specialty_button_min_width"
            android:layout_weight="1">
            <com.google.android.libraries.youtube.common.ui.YouTubeButton
                android:layout_gravity="center"
                android:id="@+id/right_button"
                android:layout_width="wrap_content"
                android:layout_height="match_parent"
                android:singleLine="true"/>
        </FrameLayout>
    </LinearLayout>
    <LinearLayout
        android:gravity="center_vertical"
        android:orientation="vertical"
        android:id="@+id/badge_byline_container"
        android:focusable="true"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="@dimen/item_large_spacing"
        android:layout_marginStart="@dimen/item_large_spacing"/>
    <FrameLayout
        android:id="@+id/byline_description_container"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="@dimen/item_medium_spacing"
        android:layout_marginStart="@dimen/item_large_spacing"
        android:layout_marginEnd="@dimen/item_large_spacing">
        <com.google.android.apps.youtube.music.ui.text.NoScrollTextView
            android:textColor="@color/ytm_color_white_70_percent"
            android:ellipsize="end"
            android:id="@+id/byline_description"
            android:focusable="true"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:textAlignment="viewStart"
            style="@style/TextAppearance.YouTubeMusic.Body3"/>
    </FrameLayout>
    <Button
        android:textAppearance="@style/TextAppearance.YouTubeMusic.Button1"
        android:layout_gravity="center_horizontal"
        android:id="@+id/description_collapse_button"
        android:visibility="gone"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:checked="false"
        style="@style/Widget.TransparentButton"/>
</LinearLayout>
```

### 2.17 `immersive_header.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:gravity="center_vertical"
    android:orientation="vertical"
    android:id="@+id/immersive_header_container"
    android:focusable="true"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:baselineAligned="false"
    android:accessibilityTraversalAfter="@+id/detail_page_toolbar">
    <FrameLayout
        android:id="@+id/header_info_container"
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        <ImageView
            android:id="@+id/wide_thumbnail"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:scaleType="centerCrop"
            android:contentDescription="@null"/>
        <com.google.android.libraries.youtube.common.ui.FixedAspectRatioRelativeLayout
            android:layout_gravity="center"
            android:id="@+id/circle_thumbnail_container"
            android:padding="@dimen/item_medium_spacing"
            android:layout_width="wrap_content"
            android:layout_height="match_parent"
            yt:aspectRatio="@fraction/aspect_ratio_square">
            <com.makeramen.RoundedImageView
                android:id="@+id/circle_thumbnail"
                android:visibility="gone"
                android:layout_width="match_parent"
                android:layout_height="match_parent"
                android:scaleType="centerCrop"
                android:cropToPadding="true"
                android:contentDescription="@null"
                yt:oval="true"/>
        </com.google.android.libraries.youtube.common.ui.FixedAspectRatioRelativeLayout>
        <View
            android:id="@+id/entity_header_shadow"
            android:background="@drawable/immersive_header_gradient"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="match_parent"/>
        <View
            android:id="@+id/entity_header_scrim"
            android:background="@color/header_color"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:alpha="0"/>
    </FrameLayout>
    <LinearLayout
        android:gravity="center_vertical"
        android:orientation="vertical"
        android:id="@+id/header_additional_info_container"
        android:background="@color/theme_main_window_background"
        android:paddingTop="@dimen/item_large_spacing"
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        <Space
            android:id="@+id/toolbar_spacer_view"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>
        <RelativeLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginStart="@dimen/item_large_spacing"
            android:layout_marginEnd="@dimen/item_large_spacing">
            <com.google.android.apps.youtube.music.ui.text.MusicAutoResizeTextView
                android:textAppearance="@style/TextAppearance.YouTubeMusic.Display1"
                android:ellipsize="end"
                android:id="@+id/entity_header_title"
                android:focusable="true"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:maxLines="3"
                android:layout_alignWithParentIfMissing="true"
                android:textAlignment="viewStart"
                android:layout_toStartOf="@+id/top_level_menu_buttons_anchor"
                android:layout_alignParentStart="true"
                yt:smallTextSize="@dimen/music_entity_header_title_size_small"/>
            <LinearLayout
                android:orientation="horizontal"
                android:id="@+id/subscription_info_container"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="@dimen/item_extra_extra_small_spacing"
                android:layout_below="@+id/entity_header_title"
                android:layout_alignParentStart="true">
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:textAppearance="@style/TextAppearance.YouTubeMusic.Button1"
                    android:gravity="center"
                    android:layout_gravity="center_vertical"
                    android:id="@+id/subscribe_button"
                    android:background="?android:attr/selectableItemBackground"
                    android:paddingTop="@dimen/item_extra_extra_small_spacing"
                    android:paddingBottom="@dimen/item_extra_extra_small_spacing"
                    android:focusable="true"
                    android:visibility="gone"
                    android:clickable="true"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:includeFontPadding="false"
                    android:drawablePadding="@dimen/item_extra_small_spacing"
                    android:layout_marginStart="0dp"
                    android:layout_marginEnd="@dimen/item_small_spacing"
                    yt:typographyAppearanceToken="?attr/yt_sys_typography_typestack_action_m_default"/>
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:textAppearance="@style/TextAppearance.YouTubeMusic.Subtitle1"
                    android:gravity="center"
                    android:layout_gravity="center_vertical"
                    android:id="@+id/subscriber_count"
                    android:focusable="true"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:includeFontPadding="false"
                    yt:typographyAppearanceToken="?attr/yt_sys_typography_typestack_body_m_default"/>
            </LinearLayout>
            <android.support.v7.widget.RecyclerView
                android:id="@+id/top_level_menu_buttons_anchor"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_centerVertical="true"
                android:layout_alignWithParentIfMissing="true"
                android:layout_toStartOf="@+id/contextual_menu_anchor"/>
            <include
                android:id="@+id/contextual_menu_anchor"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_alignParentEnd="true"
                layout="@layout/contextual_menu_anchor"/>
        </RelativeLayout>
        <LinearLayout
            android:orientation="horizontal"
            android:id="@+id/specialty_buttons_container"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="@dimen/item_medium_spacing"
            android:layout_marginBottom="@dimen/item_medium_spacing"
            android:baselineAligned="false"
            android:layout_marginStart="@dimen/item_medium_spacing"
            android:layout_marginEnd="@dimen/item_medium_spacing">
            <FrameLayout
                android:id="@+id/play_specialty_button_container"
                android:visibility="gone"
                android:layout_width="0dp"
                android:layout_height="match_parent"
                android:minWidth="@dimen/detail_page_specialty_button_min_width"
                android:layout_weight="1"
                android:layout_marginEnd="@dimen/item_small_spacing"
                style="@style/Widget.WhiteButton">
                <com.google.android.libraries.youtube.common.ui.YouTubeButton
                    android:textAppearance="@style/TextAppearance.YouTubeMusic.Button1"
                    android:gravity="center"
                    android:layout_gravity="center"
                    android:id="@+id/play_specialty_button"
                    android:background="@null"
                    android:layout_width="wrap_content"
                    android:layout_height="match_parent"
                    android:singleLine="true"
                    android:drawablePadding="@dimen/item_small_spacing"
                    android:paddingStart="@dimen/item_small_spacing"
                    android:paddingEnd="@dimen/item_small_spacing"/>
            </FrameLayout>
            <FrameLayout
                android:id="@+id/radio_specialty_button_container"
                android:visibility="gone"
                android:layout_width="0dp"
                android:layout_height="match_parent"
                android:minWidth="@dimen/detail_page_specialty_button_min_width"
                android:layout_weight="1"
                style="@style/Widget.GreyBorderTransparentButton">
                <com.google.android.libraries.youtube.common.ui.YouTubeButton
                    android:textAppearance="@style/TextAppearance.YouTubeMusic.Button1"
                    android:gravity="center"
                    android:layout_gravity="center"
                    android:id="@+id/radio_specialty_button"
                    android:background="@null"
                    android:layout_width="wrap_content"
                    android:layout_height="match_parent"
                    android:singleLine="true"
                    android:drawablePadding="@dimen/item_small_spacing"
                    android:paddingStart="@dimen/item_small_spacing"
                    android:paddingEnd="@dimen/item_small_spacing"/>
            </FrameLayout>
        </LinearLayout>
        <com.google.android.apps.youtube.music.ui.text.NoScrollTextView
            android:ellipsize="end"
            android:id="@+id/entity_header_description"
            android:focusable="true"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginBottom="@dimen/item_small_spacing"
            android:layout_marginStart="@dimen/item_large_spacing"
            android:layout_marginEnd="@dimen/item_large_spacing"
            style="@style/TextAppearance.YouTubeMusic.Body3"/>
        <Button
            android:textAppearance="@style/TextAppearance.YouTubeMusic.Button1"
            android:layout_gravity="center_horizontal"
            android:id="@+id/description_collapse_button"
            android:visibility="gone"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:checked="false"
            style="@style/Widget.TransparentButton"/>
    </LinearLayout>
</LinearLayout>
```

### 2.18 `visual_header.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:orientation="vertical"
    android:focusable="true"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:accessibilityTraversalAfter="@+id/detail_page_toolbar">
    <FrameLayout
        android:id="@+id/header_info_container"
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        <ImageView
            android:id="@+id/background_image"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:scaleType="centerCrop"
            android:contentDescription="@null"/>
        <RelativeLayout
            android:orientation="vertical"
            android:background="@drawable/visual_header_gradient_top"
            android:layout_width="match_parent"
            android:layout_height="match_parent">
            <Space
                android:id="@+id/toolbar_spacer_view"
                android:visibility="gone"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_alignParentTop="true"/>
            <FrameLayout
                android:id="@+id/foreground_image_container"
                android:visibility="gone"
                android:layout_width="@dimen/visual_header_foreground_image_size"
                android:layout_height="@dimen/visual_header_foreground_image_size"
                android:layout_marginBottom="@dimen/visual_header_foreground_image_bottom_margin"
                android:layout_above="@+id/entity_header_title"
                android:layout_centerHorizontal="true"/>
            <com.google.android.apps.youtube.music.ui.text.ThreeLevelAutoResizeTextView
                android:textAppearance="@style/TextAppearance.YouTubeMusic.VisualHeader.Title"
                android:ellipsize="end"
                android:gravity="center_horizontal"
                android:id="@+id/entity_header_title"
                android:focusable="true"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginLeft="@dimen/visual_header_spacing_side"
                android:layout_marginRight="@dimen/visual_header_spacing_side"
                android:maxLines="3"
                android:layout_above="@+id/pronouns"
                android:lineSpacingMultiplier="0.8"
                android:importantForAccessibility="yes"
                android:letterSpacing="-0.02"
                android:breakStrategy="balanced"
                android:lastBaselineToBottomHeight="@dimen/visual_header_spacing_large"
                yt:mediumSizeTriggerLineCount="2"
                yt:mediumTextSize="@dimen/visual_header_title_medium"
                yt:smallTextSize="@dimen/visual_header_title_small"/>
            <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                android:textSize="@dimen/small_font_size"
                android:textColor="@color/ytm_text_color_secondary_translucent"
                android:ellipsize="end"
                android:gravity="center_horizontal"
                android:id="@+id/pronouns"
                android:focusable="true"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:maxLines="1"
                android:includeFontPadding="false"
                android:layout_above="@+id/subscription_info_container"
                android:importantForAccessibility="yes"
                android:breakStrategy="balanced"
                android:lastBaselineToBottomHeight="@dimen/visual_header_spacing_small"/>
            <LinearLayout
                android:orientation="horizontal"
                android:id="@+id/subscription_info_container"
                android:background="?attr/selectableItemBackground"
                android:padding="@dimen/item_extra_small_spacing"
                android:focusable="true"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginBottom="6dp"
                android:layout_alignParentBottom="true"
                android:layout_centerHorizontal="true"
                android:importantForAccessibility="yes">
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:id="@+id/subscribe_button"
                    android:visibility="gone"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:includeFontPadding="false"
                    android:drawablePadding="@dimen/item_extra_small_spacing"
                    android:layout_marginEnd="@dimen/item_small_spacing"/>
                <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                    android:gravity="center"
                    android:layout_gravity="center_vertical"
                    android:id="@+id/subscriber_count"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:includeFontPadding="false"/>
            </LinearLayout>
        </RelativeLayout>
        <View
            android:id="@+id/entity_header_scrim"
            android:background="@color/header_color"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:alpha="0"/>
    </FrameLayout>
    <LinearLayout
        android:orientation="vertical"
        android:id="@+id/header_additional_info_container"
        android:background="@color/yt_black_pure"
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        <LinearLayout
            android:orientation="horizontal"
            android:id="@+id/specialty_buttons_container"
            android:paddingBottom="@dimen/visual_header_spacing_large"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:baselineAligned="false">
            <FrameLayout
                android:id="@+id/primary_button_container"
                android:focusable="true"
                android:visibility="gone"
                android:layout_width="0dp"
                android:layout_height="match_parent"
                android:minWidth="@dimen/visual_header_specialty_button_min_width"
                android:layout_weight="1"
                android:importantForAccessibility="yes"
                android:layout_marginStart="@dimen/visual_header_spacing_large"
                android:layout_marginEnd="@dimen/visual_header_spacing_small">
                <com.google.android.libraries.youtube.common.ui.YouTubeButton
                    android:layout_gravity="center"
                    android:id="@+id/primary_button"
                    android:layout_width="wrap_content"
                    android:layout_height="match_parent"/>
            </FrameLayout>
            <FrameLayout
                android:id="@+id/secondary_button_container"
                android:focusable="true"
                android:visibility="gone"
                android:layout_width="0dp"
                android:layout_height="match_parent"
                android:minWidth="@dimen/visual_header_specialty_button_min_width"
                android:layout_weight="1"
                android:importantForAccessibility="yes"
                android:layout_marginEnd="@dimen/visual_header_spacing_large">
                <com.google.android.libraries.youtube.common.ui.YouTubeButton
                    android:layout_gravity="center"
                    android:id="@+id/secondary_button"
                    android:layout_width="wrap_content"
                    android:layout_height="match_parent"/>
            </FrameLayout>
        </LinearLayout>
    </LinearLayout>
</LinearLayout>
```

### 2.19 `search_toolbar_view_v2.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:gravity="center_vertical"
    android:orientation="horizontal"
    android:id="@+id/search_toolbar_layout"
    android:focusableInTouchMode="true"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    <com.google.android.apps.youtube.music.ui.text.PlainTextEditText
        android:textAppearance="@style/TextAppearance.YouTubeMusic.SearchInput"
        android:ellipsize="end"
        android:gravity="start|center_vertical"
        android:id="@+id/search_edit_text"
        android:background="@drawable/search_query_background"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:hint="@string/search_hint_songs_artists_podcasts"
        android:maxLines="1"
        android:layout_alignParentLeft="true"
        android:layout_alignWithParentIfMissing="true"
        android:inputType="textFilter"
        android:imeOptions="flagNoFullscreen|actionSearch"
        android:textCursorDrawable="@drawable/search_edit_text_cursor"
        android:paddingStart="@dimen/search_header_start_side_button_width"
        android:paddingEnd="@dimen/search_header_text_padding_end"
        android:layout_marginStart="16dp"
        android:layout_toStartOf="@+id/voice_search_container"
        android:layout_alignParentStart="true"/>
    <FrameLayout
        android:layout_gravity="center_vertical"
        android:id="@+id/navigation_or_logo_container"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:minWidth="@dimen/search_bar_height"
        android:minHeight="@dimen/search_bar_height"
        android:paddingStart="16dp"
        android:layout_alignParentStart="true">
        <android.support.v7.widget.AppCompatImageView
            android:layout_gravity="end|center_vertical"
            android:id="@+id/toolbar_back_navigation"
            android:focusable="true"
            android:visibility="gone"
            android:layout_width="@dimen/search_header_start_side_button_width"
            android:layout_height="wrap_content"
            android:scaleType="center"
            android:minHeight="@dimen/search_bar_height"
            android:contentDescription="@string/search_back_button"
            yt:srcCompat="0x7f0809be"
            style="@style/Widget.AppCompat.ActionButton"/>
        <android.support.v7.widget.AppCompatImageView
            android:layout_gravity="end|center_vertical"
            android:id="@+id/toolbar_search_logo"
            android:visibility="gone"
            android:layout_width="@dimen/search_header_start_side_button_width"
            android:layout_height="wrap_content"
            android:scaleType="center"
            yt:srcCompat="0x7f080b81"
            yt:tint="@color/ytm_color_black"
            style="@style/Widget.AppCompat.ActionButton"/>
    </FrameLayout>
    <android.support.v7.widget.AppCompatImageView
        android:layout_gravity="center_vertical"
        android:id="@+id/search_clear"
        android:padding="@dimen/action_bar_icon_padding"
        android:focusable="true"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:scaleType="center"
        android:minWidth="@dimen/yt_sys_measurement_size_legend"
        android:minHeight="@dimen/search_bar_height"
        android:contentDescription="@string/accessibility_search_clear"
        android:layout_toStartOf="@+id/voice_search"
        yt:srcCompat="@drawable/yt_outline_x_mark_vd_theme_24"
        yt:tint="@color/ytm_icon_color_active"/>
    <android.support.v7.widget.AppCompatImageView
        android:id="@+id/voice_search"
        android:padding="@dimen/action_bar_icon_padding"
        android:focusable="true"
        android:visibility="gone"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:scaleType="center"
        android:minWidth="@dimen/search_bar_height"
        android:minHeight="@dimen/search_bar_height"
        android:contentDescription="@string/accessibility_voice_search"
        android:layout_marginStart="@dimen/search_header_voice_button_start_margin"
        android:layout_toStartOf="@+id/voice_search_container"
        yt:srcCompat="@drawable/mic_state_selector"
        yt:tint="@color/ytm_icon_color_active"/>
    <LinearLayout
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:id="@+id/ask_music"
        android:background="@drawable/ask_music_button_background"
        android:focusable="true"
        android:visibility="gone"
        android:clickable="true"
        android:layout_width="wrap_content"
        android:layout_height="match_parent"
        android:layout_alignWithParentIfMissing="true"
        android:contentDescription="@string/accessibility_ask_music"
        android:paddingStart="@dimen/search_ask_button_padding_start"
        android:paddingEnd="@dimen/search_ask_button_padding_end"
        android:layout_marginEnd="@dimen/search_ask_button_end_margin"
        android:layout_toStartOf="@+id/voice_search_container">
        <android.support.v7.widget.AppCompatImageView
            android:id="@+id/ask_music_icon"
            android:layout_width="@dimen/search_ask_button_icon_size"
            android:layout_height="@dimen/search_ask_button_icon_size"
            android:scaleType="centerInside"
            android:importantForAccessibility="no"
            yt:srcCompat="@drawable/yt_fill_spark_vd_theme_24"
            yt:tint="@color/ytm_icon_color_active"/>
        <com.google.android.libraries.youtube.common.ui.YouTubeTextView
            android:textAppearance="@style/TextAppearance.YouTubeMusic.Caption"
            android:textColor="@color/ytm_icon_color_active"
            android:id="@+id/ask_music_label"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="@string/search_ask_button_label"
            android:maxLines="1"
            android:singleLine="true"
            android:includeFontPadding="false"
            android:importantForAccessibility="no"
            android:layout_marginStart="@dimen/search_ask_button_icon_label_spacing"/>
    </LinearLayout>
    <LinearLayout
        android:layout_gravity="center_vertical"
        android:orientation="horizontal"
        android:id="@+id/voice_search_container"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:minWidth="@dimen/search_bar_height"
        android:layout_alignParentEnd="true">
        <android.support.v7.widget.AppCompatImageView
            android:id="@+id/sound_search"
            android:background="@drawable/action_button_background"
            android:padding="@dimen/action_bar_icon_padding"
            android:focusable="true"
            android:visibility="gone"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:scaleType="center"
            android:minWidth="@dimen/search_bar_height"
            android:minHeight="@dimen/search_bar_height"
            android:contentDescription="@string/accessibility_sound_search"
            yt:srcCompat="@drawable/yt_fill_waveform_music_vd_theme_18"
            yt:tint="@color/ytm_icon_color_active"/>
    </LinearLayout>
</RelativeLayout>
```

### 2.20 `library_browse_fragment.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:id="@+id/coordinator_layout"
    android:background="@color/theme_main_window_background"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    <com.google.android.material.appbar.AppBarLayout
        android:id="@+id/app_bar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        <android.support.v7.widget.Toolbar
            android:id="@+id/toolbar"
            android:layout_width="match_parent"
            android:layout_height="?attr/actionBarSize"
            yt:layout_scrollFlags="snap|enterAlways|scroll"/>
        <RelativeLayout
            android:id="@+id/header_container"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            yt:layout_scrollFlags="snap|enterAlways|scroll"/>
        <include
            android:id="@+id/toolbar_divider"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            layout="@layout/toolbar_divider"/>
    </com.google.android.material.appbar.AppBarLayout>
    <com.google.android.apps.youtube.music.ui.components.loading.LoadingFrameLayout
        android:id="@+id/browse_content"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        yt:layout_behavior="@string/appbar_scrolling_view_behavior">
        <LinearLayout
            android:orientation="vertical"
            android:id="@+id/tabbed_view_container"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="match_parent">
            <com.google.android.apps.youtube.music.ui.tabs.TabbedView
                android:id="@+id/tabbed_view"
                android:background="@null"
                android:layout_width="match_parent"
                android:layout_height="0dp"
                android:layout_weight="1"
                yt:deselectedIconAlpha="0.6"
                yt:tabHeaderBackground="?attr/tabHeaderColor"/>
        </LinearLayout>
    </com.google.android.apps.youtube.music.ui.components.loading.LoadingFrameLayout>
    <com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
        android:theme="@style/Theme.MaterialComponents.DayNight"
        android:layout_gravity="end|bottom"
        android:id="@+id/floating_action_button"
        android:visibility="gone"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_margin="@dimen/item_extra_extra_large_spacing"
        android:layout_alignParentBottom="true"
        android:layout_alignParentEnd="true"
        android:backgroundTint="@color/ytm_color_white"/>
</androidx.coordinatorlayout.widget.CoordinatorLayout>
```

### 2.21 `music_menu_bottom_sheet_dialog_fragment.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:orientation="vertical"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    yt:layout_behavior="com.google.android.material.bottomsheet.BottomSheetBehavior">
    <android.support.v7.widget.RecyclerView
        android:id="@+id/bottom_sheet_list"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>
</LinearLayout>
```

### 2.22 `music_menu_title.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:orientation="vertical"
    android:id="@+id/header"
    android:background="?android:attr/selectableItemBackground"
    android:layout_width="match_parent"
    android:layout_height="wrap_content">
    <LinearLayout
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:baselineAligned="false">
        <FrameLayout
            android:id="@+id/thumbnail_frame"
            android:layout_width="@dimen/music_bottom_sheet_menu_title_icon_width"
            android:layout_height="@dimen/music_bottom_sheet_menu_title_icon_width"
            android:layout_margin="@dimen/item_large_spacing"
            android:layout_marginStart="@dimen/item_large_spacing"
            android:layout_marginEnd="@dimen/item_medium_spacing"/>
        <LinearLayout
            android:orientation="vertical"
            android:id="@+id/text_container"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1">
            <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                android:textAppearance="@style/TextAppearance.YouTubeMusic.ListItemTitle"
                android:ellipsize="end"
                android:id="@+id/title"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:maxLines="2"/>
            <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                android:textAppearance="@style/TextAppearance.YouTubeMusic.Subtitle1.Translucent"
                android:ellipsize="marquee"
                android:id="@+id/subtitle"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:scrollHorizontally="true"
                android:singleLine="true"
                android:marqueeRepeatLimit="marquee_forever"/>
        </LinearLayout>
        <LinearLayout
            android:orientation="horizontal"
            android:id="@+id/end_buttons_container"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_margin="@dimen/item_small_spacing"
            android:layout_marginStart="0dp"
            android:layout_marginEnd="@dimen/item_extra_small_spacing"/>
    </LinearLayout>
    <View
        android:id="@+id/divider"
        android:background="@color/music_shelf_separator_light"
        android:layout_width="match_parent"
        android:layout_height="@dimen/music_bottom_sheet_menu_divider_height"/>
</LinearLayout>
```

### 2.23 `music_menu_item.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:gravity="center_vertical"
    android:orientation="horizontal"
    android:background="?android:attr/selectableItemBackground"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:minHeight="@dimen/menu_item_min_height"
    android:paddingHorizontal="@dimen/menu_item_padding_horizontal"
    android:paddingVertical="@dimen/menu_item_padding_vertical"
    style="@style/MusicBottomSheetSelectableItemBackground">
    <FrameLayout
        android:id="@+id/icon_container"
        android:layout_width="@dimen/bottom_sheet_list_icon_size"
        android:layout_height="@dimen/bottom_sheet_list_icon_size"
        android:layout_marginEnd="@dimen/menu_item_leading_accessory_end_margin">
        <ProgressBar
            android:id="@+id/loading_spinner"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            style="?android:attr/progressBarStyle"/>
        <ImageView
            android:id="@+id/icon"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:tint="@color/ytm_icon_color_active"
            android:contentDescription="@null"/>
    </FrameLayout>
    <com.google.android.libraries.youtube.rendering.ui.spec.typography.YouTubeAppCompatTextView
        android:textColor="?attr/ytTextPrimary"
        android:ellipsize="end"
        android:id="@+id/text"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:maxLines="2"
        android:textAlignment="viewStart"/>
</LinearLayout>
```

### 2.24 `top_level_browse_fragment.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:id="@+id/coordinator_layout"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    <RelativeLayout
        android:id="@+id/background_image_container"
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        <FrameLayout
            android:id="@+id/background_elements"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>
        <ImageView
            android:id="@+id/background_image"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:scaleType="centerCrop"
            android:adjustViewBounds="true"
            android:importantForAccessibility="no"/>
        <View
            android:id="@+id/background_overlay_gradient"
            android:background="@drawable/browse_page_background_image_gradient"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_alignBottom="@+id/background_image"/>
        <View
            android:id="@+id/background_scrim"
            android:background="@color/theme_main_window_background"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_alignBottom="@+id/background_image"
            android:alpha="0"/>
    </RelativeLayout>
    <com.google.android.material.appbar.AppBarLayout
        android:id="@+id/app_bar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content">
        <android.support.v7.widget.Toolbar
            android:id="@+id/toolbar"
            android:layout_width="match_parent"
            android:layout_height="?attr/actionBarSize"
            yt:layout_scrollFlags="enterAlways|scroll"/>
        <RelativeLayout
            android:id="@+id/header_container"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"/>
        <com.google.android.material.tabs.TabLayout
            android:layout_gravity="bottom"
            android:id="@+id/tabs"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            yt:tabGravity="fill"
            yt:tabIndicatorColor="@color/ytm_color_control_active"
            yt:tabIndicatorHeight="@dimen/tabs_highlight_height"
            yt:tabMaxWidth="0dp"
            yt:tabMode="fixed"
            yt:tabSelectedTextColor="#e1e1e1"
            yt:tabTextColor="#99e1e1e1"/>
        <include
            android:id="@+id/toolbar_divider"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            layout="@layout/toolbar_divider"/>
    </com.google.android.material.appbar.AppBarLayout>
    <com.google.android.apps.youtube.music.ui.components.loading.LoadingFrameLayout
        android:id="@+id/browse_content"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        yt:layout_behavior="@string/appbar_scrolling_view_behavior">
        <com.google.android.apps.youtube.music.ui.tabs.TabbedView
            android:id="@+id/tabbed_view"
            android:background="@null"
            android:visibility="gone"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            yt:deselectedIconAlpha="0.6"
            yt:tabHeaderBackground="?attr/tabHeaderColor"/>
    </com.google.android.apps.youtube.music.ui.components.loading.LoadingFrameLayout>
</androidx.coordinatorlayout.widget.CoordinatorLayout>
```

### 2.25 `queue_page.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.coordinatorlayout.widget.CoordinatorLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    <ViewStub
        android:id="@+id/queue_page_header_stub"
        android:layout="@layout/queue_page_header"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"/>
    <android.support.v7.widget.RecyclerView
        android:id="@+id/queue_list"
        android:clipToPadding="false"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:transitionName="bottom"
        yt:layout_behavior="@string/appbar_scrolling_view_behavior"/>
</androidx.coordinatorlayout.widget.CoordinatorLayout>
```

### 2.26 `queue_page_header.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.appbar.AppBarLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:id="@+id/queue_page_header"
    android:background="@null"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    yt:elevation="0dp">
    <com.google.android.material.appbar.CollapsingToolbarLayout
        android:id="@+id/queue_collapsing_toolbar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        yt:layout_scrollFlags="snap|enterAlways|scroll"
        yt:scrimAnimationDuration="200">
        <LinearLayout
            android:orientation="vertical"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            yt:layout_collapseMode="pin">
            <RelativeLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content">
                <RelativeLayout
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginTop="@dimen/item_medium_spacing"
                    android:layout_marginBottom="@dimen/item_medium_spacing"
                    android:layout_marginStart="@dimen/item_large_spacing"
                    android:layout_marginEnd="@dimen/item_large_spacing"
                    android:layout_toStartOf="@+id/header_action">
                    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                        android:textSize="@dimen/small_font_size"
                        android:textColor="@color/ytm_text_color_secondary_translucent"
                        android:textColorLink="@color/ytm_text_color_secondary_translucent"
                        android:ellipsize="end"
                        android:id="@+id/header_title"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:layout_marginBottom="@dimen/item_extra_small_spacing"
                        android:textAlignment="viewStart"
                        yt:hyperlinksClickable="true"
                        yt:robotoFont="regular"/>
                    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
                        android:textSize="@dimen/small_font_size"
                        android:textStyle="bold"
                        android:textColor="@color/yt_white1"
                        android:textColorLink="@color/yt_white1"
                        android:ellipsize="end"
                        android:id="@+id/header_subtitle"
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:maxLines="1"
                        android:singleLine="true"
                        android:layout_below="@+id/header_title"
                        android:textAlignment="viewStart"
                        yt:hyperlinksClickable="true"
                        yt:robotoFont="regular"/>
                </RelativeLayout>
                <FrameLayout
                    android:id="@+id/header_action"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:layout_centerVertical="true"
                    android:layout_marginEnd="@dimen/item_large_spacing"
                    android:layout_alignParentEnd="true"/>
            </RelativeLayout>
            <LinearLayout
                android:orientation="vertical"
                android:id="@+id/sub_header_layout"
                android:layout_width="match_parent"
                android:layout_height="wrap_content">
                <View
                    android:id="@+id/separator"
                    android:background="@color/ytm_color_white_at_10pct"
                    android:layout_width="match_parent"
                    android:layout_height="@dimen/yt_sys_measurement_size_hairline"
                    android:layout_marginStart="@dimen/item_large_spacing"
                    android:layout_marginEnd="@dimen/item_large_spacing"/>
                <FrameLayout
                    android:id="@+id/sub_header_chips"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"/>
            </LinearLayout>
            <View
                android:background="@drawable/queue_header_background"
                android:layout_width="wrap_content"
                android:layout_height="@dimen/queue_header_shadow_height"/>
        </LinearLayout>
    </com.google.android.material.appbar.CollapsingToolbarLayout>
</com.google.android.material.appbar.AppBarLayout>
```

### 2.27 Supporting Included Layouts

#### `audio_video_switch_toggle.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.apps.youtube.music.player.audiovideoswitcher.ui.AudioVideoSwitcherToggleView xmlns:android="http://schemas.android.com/apk/res/android" xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_gravity="center"
    android:id="@+id/audio_video_switch_toggle"
    android:background="@drawable/audio_video_switcher_toggle_background"
    android:focusable="true"
    android:visibility="visible"
    android:clickable="true"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content">
    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
        android:gravity="center"
        android:id="@+id/song_text"
        android:paddingTop="@dimen/item_medium_spacing"
        android:paddingBottom="@dimen/item_medium_spacing"
        android:focusable="false"
        android:visibility="visible"
        android:clickable="false"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:minWidth="@dimen/audio_video_switch_button_min_width"
        android:minHeight="@dimen/audio_video_switch_button_min_height"
        android:text="@string/audio_video_switcher_toggle_song_text"
        android:singleLine="true"
        android:layout_centerVertical="true"
        android:textAlignment="center"
        android:paddingStart="@dimen/item_medium_spacing"
        android:paddingEnd="@dimen/item_medium_spacing"
        app:typographyAppearanceToken="?attr/yt_sys_typography_typestack_action_m_default"
        style="@style/AvSwitcherSpecMpp"/>
    <com.google.android.libraries.youtube.common.ui.YouTubeTextView
        android:gravity="center"
        android:id="@+id/video_text"
        android:paddingTop="@dimen/item_medium_spacing"
        android:paddingBottom="@dimen/item_medium_spacing"
        android:focusable="false"
        android:visibility="visible"
        android:clickable="false"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:minWidth="@dimen/audio_video_switch_button_min_width"
        android:minHeight="@dimen/audio_video_switch_button_min_height"
        android:text="@string/audio_video_switcher_toggle_video_text"
        android:singleLine="true"
        android:layout_centerVertical="true"
        android:textAlignment="center"
        android:paddingStart="@dimen/item_medium_spacing"
        android:paddingEnd="@dimen/item_medium_spacing"
        android:layout_toEndOf="@+id/song_text"
        app:typographyAppearanceToken="?attr/yt_sys_typography_typestack_action_m_default"
        style="@style/AvSwitcherSpecMpp"/>
    <ImageView
        android:gravity="center"
        android:layout_gravity="center"
        android:id="@+id/song_icon"
        android:padding="@dimen/audio_video_switch_icon_padding"
        android:visibility="gone"
        android:layout_width="@dimen/audio_video_switch_button_width"
        android:layout_height="@dimen/audio_video_switch_button_height"
        android:src="@drawable/yt_fill_experimental_headset_vd_theme_24"
        android:scaleType="fitCenter"
        android:layout_centerVertical="true"
        android:importantForAccessibility="no"/>
    <ImageView
        android:gravity="center"
        android:layout_gravity="center"
        android:id="@+id/video_icon"
        android:padding="@dimen/audio_video_switch_icon_padding"
        android:visibility="gone"
        android:layout_width="@dimen/audio_video_switch_button_width"
        android:layout_height="@dimen/audio_video_switch_button_height"
        android:src="@drawable/yt_outline_experimental_video_vd_theme_24"
        android:scaleType="fitCenter"
        android:layout_centerVertical="true"
        android:importantForAccessibility="no"
        android:layout_toEndOf="@+id/song_icon"/>
</com.google.android.apps.youtube.music.player.audiovideoswitcher.ui.AudioVideoSwitcherToggleView>
```

#### `music_playback_control_button_view.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:layout_gravity="center_vertical"
    android:background="@drawable/ripple"
    android:layout_width="@dimen/remix_overlay_player_control_button_size"
    android:layout_height="@dimen/remix_overlay_player_control_button_size"
    style="@style/MusicPlayerButton">
    <ImageView
        android:layout_gravity="center_horizontal"
        android:id="@+id/playback_control_indicator"
        android:visibility="gone"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="@dimen/playback_control_button_indicator_margin_top"
        android:src="@drawable/playback_control_button_indicator"
        android:scaleType="center"
        android:alpha="@dimen/active_icon_alpha"
        android:importantForAccessibility="no"/>
    <android.support.v7.widget.AppCompatImageView
        android:layout_gravity="center_vertical"
        android:id="@+id/playback_control_icon"
        android:layout_width="@dimen/remix_overlay_player_control_button_size"
        android:layout_height="@dimen/remix_overlay_player_control_button_size"
        android:scaleType="center"
        android:alpha="@dimen/active_icon_alpha"
        android:importantForAccessibility="no"
        yt:tint="@color/ytm_color_white"/>
</FrameLayout>
```

#### `mini_player_scrim.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<View xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/mini_player_scrim"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:alpha="0"
    android:importantForAccessibility="no"
    android:forceHasOverlappingRendering="false"/>
```

#### `contextual_menu_anchor.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<ImageView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/contextual_menu_anchor"
    android:background="@drawable/ripple_small"
    android:padding="@dimen/item_extra_small_spacing"
    android:visibility="gone"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:src="0x7f080b5b"
    android:contentDescription="@string/accessibility_context_menu"/>
```

#### `toolbar_divider.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<merge xmlns:android="http://schemas.android.com/apk/res/android">
    <View
        android:id="@+id/toolbar_divider"
        android:background="@color/ytm_color_white_at_10pct"
        android:visibility="gone"
        android:layout_width="match_parent"
        android:layout_height="@dimen/yt_sys_measurement_size_hairline"/>
</merge>
```

#### `watch_fragment.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.apps.youtube.music.player.PlayerPanel xmlns:android="http://schemas.android.com/apk/res/android" xmlns:yt="http://schemas.android.com/apk/res-auto"
    android:id="@+id/player_panel"
    android:background="@color/yt_black_pure"
    android:layout_width="0dp"
    android:layout_height="0dp"
    android:contentDescription="@string/accessibility_video_player">
    <com.google.android.apps.youtube.music.player.MusicPlayerView
        android:id="@+id/watch_player"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>
    <com.google.android.apps.youtube.music.ui.components.chipcloud.ChipCloudChipView
        android:layout_gravity="bottom"
        android:id="@+id/player_overlay_chip"
        android:visibility="gone"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginLeft="@dimen/mdx_chip_cloud_chip_audio_side_margin"
        android:layout_marginRight="@dimen/mdx_chip_cloud_chip_audio_side_margin"
        android:layout_marginBottom="@dimen/mdx_chip_cloud_chip_bottom_margin"
        android:layout_centerHorizontal="true"/>
    <RelativeLayout
        android:id="@+id/player_error_icon_layout"
        android:background="@color/darker_transparent"
        android:visibility="gone"
        android:layout_width="match_parent"
        android:layout_height="match_parent">
        <ImageView
            android:id="@+id/player_error_icon"
            android:layout_width="@dimen/watch_while_mini_player_error_icon_size"
            android:layout_height="@dimen/watch_while_mini_player_error_icon_size"
            android:layout_margin="@dimen/item_extra_small_spacing"
            android:tint="@color/ytm_color_grey_06"
            android:layout_centerInParent="true"
            android:contentDescription="@null"
            yt:srcCompat="@drawable/yt_outline_experimental_alert_circle_vd_theme_24"/>
    </RelativeLayout>
</com.google.android.apps.youtube.music.player.PlayerPanel>
```

#### `player_tab_divider.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="0dp"
    android:layout_height="0dp"
    android:alpha="0">
    <View
        android:background="@color/ytm_color_white"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_marginStart="@dimen/tab_strip_margin"
        android:layout_marginEnd="@dimen/tab_strip_margin"/>
</FrameLayout>
```

#### `scrollable_tab_layout.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.tabs.TabLayout xmlns:android="http://schemas.android.com/apk/res/android" xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:tabGravity="start"
    app:tabIndicatorFullWidth="false"
    app:tabMinWidth="@dimen/remix_generic_button_size"
    app:tabMode="scrollable"
    app:tabPaddingEnd="@dimen/tab_padding_horizontal"
    app:tabPaddingStart="@dimen/tab_padding_horizontal"
    app:tabTextAppearance="@style/SentenceCaseTab"/>
```

---

## 3. EML Component Structures (`assets/music_filegroup/_srs_resources_eml_bundle/`)

### 3.1 SRS Bundle Architecture & Observed Elements Protobuf Extensions

- All `215` files under `assets/music_filegroup/_srs_resources_eml_bundle/` are Elements SRS payloads wrapped in outer extension field `169768054`, containing typed SSA registers (`f1` slots) and element-builder expressions (`f2` nodes, where `n2` builds the root `Element`).
- JS-backed components (`*.eml-js`) pair compiled template trees with JS controller bundles (`*_controller_<hash>`) and shared Closure/UPB runtime modules (`root_32db2561dbd0697e` + `sy*_32db2561dbd0697e`), registered via `42_js_module_config.dat` and `embedded_filegroups_embedded_datapush_proto.dat`.
- Observed Elements extension field IDs inside decoded `.eml` ASTs:

| Extension ID | Structural Role Observed in EML AST |
|---|---|
| `168777401` | Template/Component Element Wrapper (`f3`=Type, `f5`=Model, `f6`=Properties) |
| `172035250` | `ComponentType` (references `<name>.eml|<hash>` or `<name>.eml-js|<hash>`) |
| `160982084` | Root / Scrollable Container Type (`CollectionType` / `ScrollableContainerType`) |
| `158796327` | `ContainerType` |
| `158796345` | `ImageType` |
| `158796380` | `TextType` (carries `AttributedString` + font family + font size + style runs) |
| `168772996` | `LayoutProperties` (Yoga dimensions, flexGrow/flexShrink, padding, margin, alignment) |
| `168774549` | `StyleProperties` (background color, opacity, corner radius, border) |
| `168774763` | `CommandProperties` (`onTap`, gestures, visibility/logging triggers) |
| `154604025` | `LinearGradient` image/background shader (stops, ARGB colors, angle) |
| `169494678` | `CollectionType` / `CellProperties` |
| `170382688` | `IdentifierProperties` |
| `221831838` | `AccessibilityProperties` (carries `id.*` element keys) |
| `253612307`, `258815951` | Text truncation / marquee / line-height helpers |
| `386334485`, `386334486` | Reactive entity/slot command bindings |
| `402418170` | Opacity / state transition property (`1.0` / `0.4`) |
| `521510198` | Image corner-radius / clip property |

### 3.2 Detailed Specs for the 15 Requested EML Components

#### `music_list_item.eml` (`music_list_item.eml_c6cfed2729ee3fbe`, `108,958` bytes)
- **Structure & Behavior**: Horizontal list row (track/album/playlist/artist row) with leading thumbnail/ranking slot, optional overlay/download badge, primary/secondary `badged_text`, inline `playback_progress`, trailing `play_button` / `toggle_button` / `music_circle_icon_button`, and `music_list_item_extra_details`. Root `RootOrScrollContainer` wraps `ContainerType` + `OpacityTransition(1.0 -> 0.4)` + dismiss transitions. Thumbnail sizes observed in slot table: `48`, `56`, `64`, `72`, `96` dp; `#ff000000` background override.
- **Sub-templates / Controllers**: `music_circle_icon_button.eml|7ea79d1f66742536`, `music_ranking_badge.eml|4227b8874c3a6ab9`, `music_thumbnail.eml|3ecaa7f34930e1ae`, `music_overlay.eml|2a7ca468abf17629`, `badged_text.eml|aa4c98f3170d5f44`, `playback_progress.eml|3c89429c8e390171`, `badge.eml|6b6b7ccb49c4e8cf`, `play_button.eml|12afd67b2449ef72`, `toggle_button.eml|2703e5b811f434c1`, `music_list_item_extra_details.eml|9b5286f943fcf5a`, `music_content_overlay.eml|7ab6c85192e3357c`
- **IDs / Entity Keys**: `music_list_item_thumbnail`, `music_list_item_music_overlay_with_download_badge_key_$0`, `music_list_item_music_overlay_without_download_badge_key_$0`, `music_list_item_primary_text_container_key_$0`, `toggled_extra_action_button_$0`, `toggled_extra_action_button_view_model_$0`, `list_item_dismiss_transitions_key_$0`
- **Embedded ARGB Varints**: `#ff000000`

#### `music_grid_item.eml` (`music_grid_item.eml_924a1c76c95dc266`, `96,777` bytes)
- **Structure & Behavior**: Vertical square/portrait shelf card used inside carousels and grids. Composes `music_thumbnail.eml`, `music_overlay.eml`, `thumbnail_badge.eml`, `event_thumbnail.eml`, `music_ranking_badge.eml`, `badged_text.eml` metadata lines (`music_grid_item_metadata`), `music_circle_icon_button.eml`, `toggle_button.eml`, and `music_content_overlay.eml`. Concrete observed metrics: `4dp` corner radius (`192475008=4.0`), `155dp` / `0.66` ratios, `-8.0` negative overlap offset, `#a5000000` overlay scrim, opacity `1.0`/`0.4`.
- **Sub-templates / Controllers**: `music_thumbnail.eml|3ecaa7f34930e1ae`, `music_overlay.eml|2a7ca468abf17629`, `thumbnail_badge.eml|2624aa72c2e81a45`, `event_thumbnail.eml|d0dd5a2b8bd75def`, `music_ranking_badge.eml|4227b8874c3a6ab9`, `badged_text.eml|aa4c98f3170d5f44`, `music_circle_icon_button.eml|7ea79d1f66742536`, `toggle_button.eml|2703e5b811f434c1`, `music_content_overlay.eml|7ab6c85192e3357c`
- **IDs / Entity Keys**: `current_client_time_key`, `music_grid_item_metadata`, `grid_item_dismiss_transitions_key_$0`
- **Embedded ARGB Varints**: `#a5000000`

#### `music_shelf_header.eml` (`music_shelf_header.eml_991ba4150b188c02`, `48,532` bytes)
- **Structure & Behavior**: EML shelf header (`identifier=music_shelf_header`) composing optional leading `music_thumbnail.eml`, stacked `badged_text.eml` strapline/title/subtitle (`flexGrow=1.0`), and trailing action `button.eml` (`More` / `Play all`) with `AccessibilityProps`.
- **Sub-templates / Controllers**: `music_thumbnail.eml|3ecaa7f34930e1ae`, `badged_text.eml|aa4c98f3170d5f44`, `button.eml|270ddb639979b875`
- **IDs / Entity Keys**: `music_shelf_header`

#### `music_page_header.eml-js` (`music_page_header.eml-js_8e8e90733db997a9`, `293,556` bytes)
- **Structure & Behavior**: Hero/browse page header (`293,556` B, `80` SSA nodes). Composes `avatar.eml`, `avatar_stack.eml`, `list_item.eml-js` (`music_page_header.list_item.$0`), `playback_progress.eml`, `countdown_timer.eml-js` + `countdown_timer_controller`, `button.eml`, `subscribe_button.eml-js`, `music_download_button.eml`, `elevate_shuffle_button.eml`, `toggle_button.eml`, `play_button.eml`, `badged_text.eml`. Features a 10-stop `180°` `LinearGradient` (`154604025`) scrim (`#bd000000`, `#ad000000`, `#9c000000`, `#8a000000`, `#96000000`, `#ac000000`, `#c2000000`, `#d8000000`, `#ec000000`, `#ff000000` across stops `0.12..0.88`), hero heights `360`, `248`, `224`, `174`, `146` dp, breakpoints `600`/`840`/`1024`, style corner radii `4dp`/`8dp`.
- **Sub-templates / Controllers**: `avatar.eml|beef4d6098b8373c`, `list_item.eml-js|ab3bb60616937744`, `playback_progress.eml|3c89429c8e390171`, `countdown_timer.eml-js|7a11c5c728345931`, `countdown_timer_controller|a7f76dd7f3de89cb`, `button.eml|270ddb639979b875`, `subscribe_button.eml-js|1843973ef2d994a6`, `music_download_button.eml|71e4e7510ffaf161`, `elevate_shuffle_button.eml|d00e9b1dc748b090`, `toggle_button.eml|2703e5b811f434c1`, `play_button.eml|12afd67b2449ef72`, `avatar_stack.eml|c24842c2661d0c47`, `badged_text.eml|aa4c98f3170d5f44`
- **IDs / Entity Keys**: `music_hero_teaser_card`, `music_page_header.list_item.$0`, `elevate_shuffle_toggle_button`
- **Embedded ARGB Varints**: `#bd000000`, `#ad000000`, `#9c000000`, `#8a000000`, `#96000000`, `#ac000000`, `#c2000000`, `#d8000000`, `#ec000000`, `#ff000000`

#### `music_blurred_background_header.eml-js` (`music_blurred_background_header.eml-js_1f7d804b927ad15e`, `42,916` bytes)
- **Structure & Behavior**: Playlist/album blurred artwork header (`42,916` B, `57` SSA nodes). Layers `music_blurred_background_image.eml` (blur/gradient params `60`/`90`/`180`, `0.45`/`0.5` weights) + `music_blurred_background_layered_image.eml` (artwork card `108`–`300` dp across responsive widths `480`/`600`/`1024`, `4dp`/`8dp` spacing) + `badged_text.eml` (`music_blurred_background_header.title`) + `avatar_stack.eml` + `music_expandable_text.eml` + `playback_progress.eml` + `countdown_timer.eml-js` + action bar (`play_button.eml`, `music_download_button.eml`, `music_circle_icon_button.eml`, `toggle_button.eml`, `button.eml`).
- **Sub-templates / Controllers**: `music_blurred_background_image.eml|3890c173e9ede969`, `music_blurred_background_layered_image.eml|fb2317f93ec98566`, `badged_text.eml|aa4c98f3170d5f44`, `playback_progress.eml|3c89429c8e390171`, `avatar_stack.eml|c24842c2661d0c47`, `music_expandable_text.eml|937cb9a71f01b106`, `countdown_timer.eml-js|7a11c5c728345931`, `countdown_timer_controller|a7f76dd7f3de89cb`, `music_circle_icon_button.eml|7ea79d1f66742536`, `toggle_button.eml|2703e5b811f434c1`, `music_download_button.eml|71e4e7510ffaf161`, `play_button.eml|12afd67b2449ef72`, `button.eml|270ddb639979b875`
- **IDs / Entity Keys**: `music_blurred_background_header.title`

#### `timed_lyrics.eml-js` (`timed_lyrics.eml-js_b9076484b83f2695`, `60,707` bytes)
- **Structure & Behavior**: Interactive time-synced lyrics viewer (`60,707` B, `69` SSA nodes). Root `RootOrScrollContainer` with `ImageType` (`LinearGradient` top/bottom fade masks `25dp` & `80dp`, `StyleProperties` alpha `0.25`/`0.3`/`0.4`), scrollable `lyric_line.eml` list (`lyric_line_cell_$0`), `music_compact_banner.eml`, `spinner.eml`, and bottom floating controls (`id.elements.timed_lyrics.share_button`, `lyric_share_button`, `lyric_translate_button`, `button.eml`, `toggle_button.eml`). Typography uses `Roboto` at `16`, `24`, `28` sp; paddings `12`/`16`/`24`/`32` dp. Bound to `timed_lyrics_controller|9d9eef75acf6ec7f` with 10 hooks (`TimedLyricsController_onVisibleCommand`, `onHiddenCommand`, `onActiveLineVisible`, `onActiveLineHidden`, `disableLyricScroll`, `enableLyricScroll`, `seekTo`, `handleShareButtonTap`, `handleTranslateButtonTap`, `handleLyricLongPress`).
- **Sub-templates / Controllers**: `lyric_line.eml|236826106fc6253f`, `music_compact_banner.eml|e40ce97710b83142`, `button.eml|270ddb639979b875`, `toggle_button.eml|2703e5b811f434c1`, `spinner.eml|1faaaad8687dcd39`, `timed_lyrics_controller|9d9eef75acf6ec7f`
- **IDs / Entity Keys**: `timed_lyrics_blurred`, `timed_lyrics`, `id.elements.timed_lyrics.share_button`, `lyric_share_button`, `lyric_translate_button`, `collection_key`, `lyric_line_cell_$0`

#### `lyric_line.eml` (`lyric_line.eml_236826106fc6253f`, `2,806` bytes)
- **Structure & Behavior**: Single lyric row (`2,806` B, `16` SSA nodes). Root `RootOrScrollContainer` (`160982084`) with tap `CommandProperties` (`168774763`) + active/inactive opacity (`1.0f` active vs `0.4f` inactive) -> `ContainerType` (`158796327`) with `8.0dp` vertical padding/spacing (`168774549`) -> `TextType` (`158796380`) using `Roboto` at `24sp` (active/prominent) or `16sp` (standard/compact).

#### `chip.eml` (`chip.eml_c21d9c230b13ad47`, `49,741` bytes)
- **Structure & Behavior**: Pill filter/action chip (`49,741` B, `74` SSA nodes). Tap containers `id.elements.components.chip.primary_tap_container` and `secondary_tap_container`, `32dp` chip height inside `48dp` touch target, `8dp` corner radius, `18dp` icon slot, `6dp`/`8dp`/`12dp`/`24dp` spacing.
- **IDs / Entity Keys**: `id.elements.components.chip.primary_tap_container`, `button`, `chip`, `chip_bar`, `overflow_button`, `radio_button`, `switch_button`, `toggle_button`, `video_metadata`, `video_lockup`, `video_with_context`, `id.elements.components.chip.secondary_tap_container`
- **Embedded ARGB Varints**: `#ff00ffa2`

#### `chip_bar.eml-js` (`chip_bar.eml-js_20867802a6ede068`, `4,282` bytes)
- **Structure & Behavior**: Horizontal chip bar wrapper (`4,282` B). Delegates to `chip_bar_collection_with_controller.eml-js|4e0bfcac5af60b0a` / `chip_bar_collection.eml-js|d2c0c0ee60387547` (which renders `chip.eml`, `more_drawer_button.eml`, `button.eml`, `bottom_sheet.eml-js`, `48dp` container height, `12dp` gap) and binds `chip_bar_collection_controller|a13a17d84ec81385` (`create/destroy/notifyModelUpdateChipBarCollectionController|f58933bdef79e384`, state key `chip_bar_collection_key`).
- **Sub-templates / Controllers**: `chip_bar_collection_with_controller.eml-js|4e0bfcac5af60b0a`, `chip_bar_collection_controller|a13a17d84ec81385`, `chip_bar_collection.eml-js|d2c0c0ee60387547`
- **IDs / Entity Keys**: `chip_bar_collection_key`

#### `music_audio_video_button.eml` (`music_audio_video_button.eml_415e6808bac09176`, `2,201` bytes)
- **Structure & Behavior**: EML wrapper (`2,201` B, `19` SSA nodes) delegating directly to `toggle_button.eml|2703e5b811f434c1` with entity/state slots (`525000072`, `525000106`, `479644279`, `461054335`) for Song/Video mode switching.
- **Sub-templates / Controllers**: `toggle_button.eml|2703e5b811f434c1`

#### `play_button.eml` (`play_button.eml_12afd67b2449ef72`, `9,273` bytes)
- **Structure & Behavior**: Playback trigger component (`9,273` B, `23` SSA nodes) switching between `button.eml|270ddb639979b875` and `music_circle_icon_button.eml|7ea79d1f66742536`, tagged with `id.play_button` / `music-play-button`.
- **Sub-templates / Controllers**: `button.eml|270ddb639979b875`, `music_circle_icon_button.eml|7ea79d1f66742536`
- **IDs / Entity Keys**: `music-play-button`, `id.play_button`

#### `playback_progress.eml` (`playback_progress.eml_3c89429c8e390171`, `36,050` bytes)
- **Structure & Behavior**: Playback progress / listen-progress indicator (`36,050` B, `21` SSA nodes). Uses `ContainerType` (`40.0` dp height/min-width, `6.0` dp spacing) wrapping `brand_linear_gradient_container.eml|e40dae5d0b1bbe2`, `progress_bar.eml|34f0625e382704eb` (`2.0dp` track height, `2.0dp` corner radius, percentage-width fill), and `Roboto` / `YouTubeSans` status text.
- **Sub-templates / Controllers**: `brand_linear_gradient_container.eml|e40dae5d0b1bbe2`, `progress_bar.eml|34f0625e382704eb`

#### `segmented_like_dislike_button.eml-js` (`segmented_like_dislike_button.eml-js_a7375614829f6592`, `6,148` bytes)
- **Structure & Behavior**: Now-playing segmented Like|Dislike pill (`6,148` B, `23` SSA nodes). Wraps `animated_button_border.eml-js|5f153b0a807ea1d2` (driven by `animated_button_border_controller|fbf5c9de67e47674`: `create/destroy/notifyModelUpdate/asyncSetupAnimatedButtonBorderController`, `92.0` animation parameter) around `segmented_like_dislike_button_inner.eml|3554d36077c2d876` (which composes two `video_action_button_pill.eml` halves + `animated_like_icon_v2.eml`, `like-button-$0`, `dislike-button`, `segmented-like-button-animation-key`). Subscribes to `unset_player_time_entity_key`, `unset_player_layout_state_entity_key`, `unset_player_state_entity_key`, `scuba_animation_player_time_key`, `unset_like_count_entity_key`.
- **Sub-templates / Controllers**: `animated_button_border.eml-js|5f153b0a807ea1d2`, `animated_button_border_controller|fbf5c9de67e47674`, `segmented_like_dislike_button_inner.eml|3554d36077c2d876`
- **IDs / Entity Keys**: `segmented_like_dislike_button_animated_border_key`, `unset_player_time_entity_key`, `unset_player_layout_state_entity_key`, `unset_player_state_entity_key`, `scuba_animation_player_time_key`, `segmented-like-button-animation-key`, `unset_like_count_entity_key`

#### `video_action_bar.eml-js` (`video_action_bar.eml-js_b0b6dc9b88404297`, `30,513` bytes)
- **Structure & Behavior**: Horizontal scrollable action pill bar in Now Playing (`30,513` B, `71` SSA nodes, `48dp` height). Composes `video_action_button_with_vm_input.eml-js`, `comments_entry_point_button.eml-js`, `video_action_button.eml-js`, `video_action_toggle_button.eml-js`, `like_button.eml-js`, `dislike_button.eml-js`, and `download_button.eml-js`. Identifiers include `id.video.non_scrollable_action_bar`, `id.video.scrollable_action_bar`, `id.ui.add_to.offline.button`, `like-button-animation-key`.
- **Sub-templates / Controllers**: `video_action_button_with_vm_input.eml-js|24c9694160dd683a`, `comments_entry_point_button.eml-js|30a562849c003cf4`, `video_action_button.eml-js|87af8128c30fd95`, `video_action_toggle_button.eml-js|c3e6042bfe2388e4`, `like_button.eml-js|9cb573cfce9d9ef8`, `dislike_button.eml-js|cb7005ad768ad609`, `download_button.eml-js|8d78562ff26b13b2`
- **IDs / Entity Keys**: `video_action_bar_cell`, `video_action_bar_collapsed`, `id.video.non_scrollable_action_bar`, `comments_entry_point_button_key_$0`, `video_action_bar_video_action_button_default_key`, `video_action_button_key_$0`, `like-button-animation-key`, `id.ui.add_to.offline.button`, `id.video.scrollable_action_bar`

#### `video_action_button_pill.eml` (`video_action_button_pill.eml_4f3d663cd08a116d`, `36,938` bytes)
- **Structure & Behavior**: Pill container (`36,938` B, `39` SSA nodes, `video_action_button_pill_container_node_key`) backing player action bar buttons and segmented like/dislike halves. Observed typography/spacing constants: `18dp` corner radius (`36dp` height / 2), `6dp`/`10dp`/`15dp` internal spacing, `YouTubeSans` / `Roboto` label fonts.
- **IDs / Entity Keys**: `video_action_button_pill_container_node_key`

---

## 4. Color Tokens, Theme Attributes, Typography & Dimension Tokens

### 4.1 Core `ytm_*` & Layout Color Tokens (Resolved)

| Token | Raw Value | Resolved Hex |
|---|---|---|
| `black_20_opacity` | `#1a000000` | `#1a000000` |
| `darker_transparent` | `@color/yt_black_pure_opacity80` | `@color/yt_black_pure_opacity80 -> @color/yt_ref_color_constants_baseline_transparent_black_pure_alpha80 -> #cc000000` |
| `header_color` | `@color/ytm_theme_main_color_primary` | `@color/ytm_theme_main_color_primary -> @color/ytm_color_grey_12 -> #1d1d1d` |
| `immersive_header_gradient_top` | `#66000000` | `#66000000` |
| `immersive_shelf_gradient_transparent_color` | `#011d1d1d` | `#011d1d1d` |
| `music_100_percent_transparent` | `#ff000000` | `#ff000000` |
| `music_5_percent_transparent` | `#0d000000` | `#0d000000` |
| `music_shelf_separator_light` | `#15ffffff` | `#15ffffff` |
| `quantum_white_100` | `#ffffff` | `#ffffff` |
| `shelf_default_background_color` | `@color/ytm_color_black` | `@color/ytm_color_black -> @color/yt_black_pure -> @color/yt_ref_color_constants_black -> #ff000000` |
| `theme_main_window_background` | `@color/ytm_color_black` | `@color/ytm_color_black -> @color/yt_black_pure -> @color/yt_ref_color_constants_black -> #ff000000` |
| `time_bar_empty_color` | `#999999` | `#999999` |
| `yt_black1` | `@color/yt_ref_color_constants_default_grey20` | `@color/yt_ref_color_constants_default_grey20 -> #ff212121` |
| `yt_black1_opacity95` | `@color/yt_ref_color_constants_baseline_transparent_black1_alpha95` | `@color/yt_ref_color_constants_baseline_transparent_black1_alpha95 -> #f2212121` |
| `yt_black1_opacity98` | `@color/yt_ref_color_constants_baseline_transparent_black1_alpha98` | `@color/yt_ref_color_constants_baseline_transparent_black1_alpha98 -> #fa212121` |
| `yt_black2` | `@color/yt_ref_color_constants_default_grey10` | `@color/yt_ref_color_constants_default_grey10 -> #ff181818` |
| `yt_black3` | `@color/yt_ref_color_constants_default_grey5` | `@color/yt_ref_color_constants_default_grey5 -> #ff0f0f0f` |
| `yt_black4` | `@color/yt_ref_color_constants_default_grey1` | `@color/yt_ref_color_constants_default_grey1 -> #ff030303` |
| `yt_black_pure` | `@color/yt_ref_color_constants_black` | `@color/yt_ref_color_constants_black -> #ff000000` |
| `yt_grey3` | `@color/yt_ref_color_constants_default_grey60` | `@color/yt_ref_color_constants_default_grey60 -> #ff909090` |
| `yt_grey5` | `@color/yt_ref_color_constants_default_grey40` | `@color/yt_ref_color_constants_default_grey40 -> #ff606060` |
| `yt_light_blue` | `@color/yt_ref_color_constants_baseline_blue_light_blue` | `@color/yt_ref_color_constants_baseline_blue_light_blue -> #ff3ea6ff` |
| `yt_light_red` | `#ff4e45` | `#ff4e45` |
| `yt_white1` | `@color/yt_ref_color_constants_white` | `@color/yt_ref_color_constants_white -> #ffffffff` |
| `yt_white1_opacity10` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha10` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha10 -> #1affffff` |
| `yt_white1_opacity20` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha20` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha20 -> #33ffffff` |
| `yt_white1_opacity30` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha30` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha30 -> #4dffffff` |
| `yt_white1_opacity70` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha70` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha70 -> #b3ffffff` |
| `yt_white2` | `@color/yt_ref_color_constants_default_grey99` | `@color/yt_ref_color_constants_default_grey99 -> #fff9f9f9` |
| `ytm_color_black` | `@color/yt_black_pure` | `@color/yt_black_pure -> @color/yt_ref_color_constants_black -> #ff000000` |
| `ytm_color_black_at_0pct` | `#00000000` | `#00000000` |
| `ytm_color_black_at_10pct` | `#19000000` | `#19000000` |
| `ytm_color_black_at_40pct` | `#63000000` | `#63000000` |
| `ytm_color_black_at_50pct` | `#80000000` | `#80000000` |
| `ytm_color_black_at_60pct` | `#99000000` | `#99000000` |
| `ytm_color_black_at_80pct` | `#cc000000` | `#cc000000` |
| `ytm_color_blue_01` | `#0b83e5` | `#0b83e5` |
| `ytm_color_blue_02` | `#3ea6ff` | `#3ea6ff` |
| `ytm_color_control_active` | `@color/ytm_color_white` | `@color/ytm_color_white -> #fffffe` |
| `ytm_color_control_active_inverse` | `@color/ytm_color_black` | `@color/ytm_color_black -> @color/yt_black_pure -> @color/yt_ref_color_constants_black -> #ff000000` |
| `ytm_color_control_normal` | `@color/ytm_color_grey_05` | `@color/ytm_color_grey_05 -> #aaaaaa` |
| `ytm_color_divider` | `@color/ytm_color_white_at_8pct` | `@color/ytm_color_white_at_8pct -> #14ffffff` |
| `ytm_color_green_01` | `#3a923f` | `#3a923f` |
| `ytm_color_grey_02` | `#ebebeb` | `#ebebeb` |
| `ytm_color_grey_04` | `#cccccc` | `#cccccc` |
| `ytm_color_grey_05` | `#aaaaaa` | `#aaaaaa` |
| `ytm_color_grey_06` | `#909090` | `#909090` |
| `ytm_color_grey_08` | `#717171` | `#717171` |
| `ytm_color_grey_09` | `#606060` | `#606060` |
| `ytm_color_grey_10` | `#282828` | `#282828` |
| `ytm_color_grey_10_at_90pct` | `#e5282828` | `#e5282828` |
| `ytm_color_grey_11` | `#232323` | `#232323` |
| `ytm_color_grey_12` | `#1d1d1d` | `#1d1d1d` |
| `ytm_color_grey_12_at_55pct` | `#8c1d1d1d` | `#8c1d1d1d` |
| `ytm_color_grey_13` | `#131313` | `#131313` |
| `ytm_color_grey_14` | `#4d4d4d` | `#4d4d4d` |
| `ytm_color_icon_active` | `@color/ytm_color_white` | `@color/ytm_color_white -> #fffffe` |
| `ytm_color_icon_inactive` | `@color/ytm_color_grey_06` | `@color/ytm_color_grey_06 -> #909090` |
| `ytm_color_light_red` | `#ff4e45` | `#ff4e45` |
| `ytm_color_overlay_bg_4` | `#cc000000` | `#cc000000` |
| `ytm_color_red_02` | `#d90a17` | `#d90a17` |
| `ytm_color_text_01` | `@color/ytm_color_white` | `@color/ytm_color_white -> #fffffe` |
| `ytm_color_text_02` | `@color/ytm_color_grey_05` | `@color/ytm_color_grey_05 -> #aaaaaa` |
| `ytm_color_white` | `#fffffe` | `#fffffe` |
| `ytm_color_white_70_percent` | `#b3fffffe` | `#b3fffffe` |
| `ytm_color_white_at_10pct` | `#1affffff` | `#1affffff` |
| `ytm_color_white_at_20pct` | `#33ffffff` | `#33ffffff` |
| `ytm_color_white_at_56pct` | `#90ffffff` | `#90ffffff` |
| `ytm_color_white_at_67pct` | `#aaffffff` | `#aaffffff` |
| `ytm_color_white_at_8pct` | `#14ffffff` | `#14ffffff` |
| `ytm_icon_color_active` | `@color/ytm_color_control_active` | `@color/ytm_color_control_active -> @color/ytm_color_white -> #fffffe` |
| `ytm_icon_color_active_inverse` | `@color/ytm_color_control_active_inverse` | `@color/ytm_color_control_active_inverse -> @color/ytm_color_black -> @color/yt_black_pure -> @color/yt_ref_color_constants_black -> #ff000000` |
| `ytm_icon_color_idle` | `@color/ytm_color_grey_08` | `@color/ytm_color_grey_08 -> #717171` |
| `ytm_icon_color_normal` | `@color/ytm_color_control_normal` | `@color/ytm_color_control_normal -> @color/ytm_color_grey_05 -> #aaaaaa` |
| `ytm_text_color_active` | `@color/ytm_color_blue_02` | `@color/ytm_color_blue_02 -> #3ea6ff` |
| `ytm_text_color_active_inverse` | `@color/ytm_color_blue_02` | `@color/ytm_color_blue_02 -> #3ea6ff` |
| `ytm_text_color_idle` | `@color/ytm_color_grey_08` | `@color/ytm_color_grey_08 -> #717171` |
| `ytm_text_color_primary` | `@color/ytm_color_white` | `@color/ytm_color_white -> #fffffe` |
| `ytm_text_color_primary_inverse` | `@color/ytm_color_grey_13` | `@color/ytm_color_grey_13 -> #131313` |
| `ytm_text_color_secondary` | `@color/ytm_color_grey_05` | `@color/ytm_color_grey_05 -> #aaaaaa` |
| `ytm_text_color_secondary_inverse` | `@color/ytm_color_grey_09` | `@color/ytm_color_grey_09 -> #606060` |
| `ytm_text_color_secondary_translucent` | `@color/ytm_color_white_at_67pct` | `@color/ytm_color_white_at_67pct -> #aaffffff` |
| `ytm_text_color_tertiary` | `@color/ytm_color_grey_06` | `@color/ytm_color_grey_06 -> #909090` |
| `ytm_text_color_tertiary_inverse` | `@color/ytm_color_grey_06` | `@color/ytm_color_grey_06 -> #909090` |
| `ytm_text_color_tertiary_translucent` | `@color/ytm_color_white_at_56pct` | `@color/ytm_color_white_at_56pct -> #90ffffff` |
| `ytm_theme_main_color_dark` | `@color/ytm_color_black` | `@color/ytm_color_black -> @color/yt_black_pure -> @color/yt_ref_color_constants_black -> #ff000000` |
| `ytm_theme_main_color_primary` | `@color/ytm_color_grey_12` | `@color/ytm_color_grey_12 -> #1d1d1d` |
| `ytm_theme_main_color_secondary` | `@color/ytm_color_grey_11` | `@color/ytm_color_grey_11 -> #232323` |
| `ytm_theme_main_color_secondary_inverse` | `@color/ytm_color_grey_02` | `@color/ytm_color_grey_02 -> #ebebeb` |
| `ytm_widget_background_shaboozey` | `#66352c` | `#66352c` |
| `ytm_widget_body_text_shaboozey` | `#d6b5b0` | `#d6b5b0` |
| `ytm_widget_primary_text_shaboozey` | `#f7e5e3` | `#f7e5e3` |

### 4.2 Baseline Dark Theme Attributes (`Themed.YouTube.Dark.AppCompat` -> `yt.sys.color.baseline.dark`)

| Theme Attribute | Target | Resolved Value |
|---|---|---|
| `yt_sys_color_baseline_base_background` | `@color/yt_ref_color_constants_default_grey5` | `#ff0f0f0f` |
| `yt_sys_color_baseline_raised_background` | `@color/yt_ref_color_constants_default_grey20` | `#ff212121` |
| `yt_sys_color_baseline_menu_background` | `@color/yt_ref_color_constants_default_grey25` | `#ff282828` |
| `yt_sys_color_baseline_inverted_background` | `@color/yt_ref_color_constants_default_grey95` | `#fff1f1f1` |
| `yt_sys_color_baseline_additive_background` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha10` | `#1affffff` |
| `yt_sys_color_baseline_text_primary` | `@color/yt_ref_color_constants_default_grey95` | `#fff1f1f1` |
| `yt_sys_color_baseline_text_secondary` | `@color/yt_ref_color_constants_default_grey70` | `#ffaaaaaa` |
| `yt_sys_color_baseline_text_disabled` | `@color/yt_ref_color_constants_default_grey50` | `#ff717171` |
| `yt_sys_color_baseline_text_primary_inverse` | `@color/yt_ref_color_constants_default_grey5` | `#ff0f0f0f` |
| `yt_sys_color_baseline_overlay_background_solid` | `@color/yt_ref_color_constants_black` | `#ff000000` |
| `yt_sys_color_baseline_overlay_background_heavy` | `@color/yt_ref_color_constants_baseline_transparent_black_pure_alpha80` | `#cc000000` |
| `yt_sys_color_baseline_overlay_background_medium` | `@color/yt_ref_color_constants_baseline_transparent_black_pure_alpha60` | `#99000000` |
| `yt_sys_color_baseline_overlay_background_medium_light` | `@color/yt_ref_color_constants_baseline_transparent_black_pure_alpha30` | `#4d000000` |
| `yt_sys_color_baseline_overlay_background_light` | `@color/yt_ref_color_constants_baseline_transparent_black_pure_alpha10` | `#1a000000` |
| `yt_sys_color_baseline_overlay_button_primary` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha30` | `#4dffffff` |
| `yt_sys_color_baseline_overlay_button_secondary` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha10` | `#1affffff` |
| `yt_sys_color_baseline_overlay_text_primary` | `@color/yt_ref_color_constants_white` | `#ffffffff` |
| `yt_sys_color_baseline_overlay_text_secondary` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha70` | `#b3ffffff` |
| `yt_sys_color_baseline_static_brand_red` | `@color/yt_ref_color_constants_baseline_red_youtube_red` | `@color/yt_ref_color_constants_expressive_red_red40 -> #ffff0033` |
| `yt_sys_color_baseline_red_indicator` | `@color/yt_ref_color_constants_baseline_red_medium_red` | `#ffe1002d` |
| `yt_sys_color_baseline_call_to_action` | `@color/yt_ref_color_constants_baseline_blue_light_blue` | `#ff3ea6ff` |
| `yt_sys_color_baseline_outline` | `@color/yt_ref_color_constants_baseline_transparent_white1_alpha20` | `#33ffffff` |

`Theme.YouTubeMusic.NoActionBar` & `Base.Theme.YouTubeMusic` key bindings:

| Theme Item | Value / Resolution |
|---|---|
| `android:colorBackground` | `@color/ytm_theme_main_color_primary -> @color/ytm_color_grey_12 -> #1d1d1d` |
| `colorPrimary` | `@color/header_color -> @color/ytm_theme_main_color_primary -> @color/ytm_color_grey_12 -> #1d1d1d` |
| `colorPrimaryDark` | `@color/ytm_theme_main_color_primary -> @color/ytm_color_grey_12 -> #1d1d1d` |
| `colorAccent` | `@color/ytm_color_white -> #fffffe` |
| `tabHeaderColor` | `@color/header_color -> @color/ytm_theme_main_color_primary -> @color/ytm_color_grey_12 -> #1d1d1d` |
| `musicBackgroundColor` | `@color/theme_main_window_background -> @color/ytm_color_black -> @color/yt_black_pure -> @color/yt_ref_color_constants_black -> #ff000000` |
| `playerPageDefaultBackgroundColor` | `@color/ytm_color_grey_12 -> #1d1d1d` |
| `generalBackgroundColor` | `@color/general_background_black4 -> @color/yt_black4 -> @color/yt_ref_color_constants_default_grey1 -> #ff030303` |
| `actionBarSize` | `@dimen/action_bar_height -> @dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` |
| `bottomSheetDialogTheme` | `@style/Theme.YouTubeMusic.RemixBottomSheetDialog` |
| `ytBrandBackgroundSolid` | `@color/yt_black1 -> @color/yt_ref_color_constants_default_grey20 -> #ff212121` |
| `ytGeneralBackgroundA` | `@color/yt_black2 -> @color/yt_ref_color_constants_default_grey10 -> #ff181818` |
| `ytGeneralBackgroundB` | `@color/yt_black3 -> @color/yt_ref_color_constants_default_grey5 -> #ff0f0f0f` |
| `ytGeneralBackgroundC` | `@color/yt_black4 -> @color/yt_ref_color_constants_default_grey1 -> #ff030303` |

### 4.3 Drawable Shapes, Gradients, Selectors & Ripples

<details>
<summary>All 19 layout-referenced shape, gradient, ripple, and selector XML definitions</summary>

```xml
=== drawable/action_button_background.xml ===
<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:insetLeft="@dimen/item_extra_small_spacing"
    android:insetRight="@dimen/item_extra_small_spacing"
    android:insetTop="@dimen/item_extra_small_spacing"
    android:insetBottom="@dimen/item_extra_small_spacing">
    <shape android:shape="oval">
        <size
            android:height="@dimen/ytm_display_01_size"
            android:width="@dimen/ytm_display_01_size"/>
        <solid android:color="@color/ytm_color_white_at_10pct"/>
    </shape>
</inset>

=== drawable/ask_music_button_background.xml ===
<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:insetTop="@dimen/search_ask_button_vertical_margin"
    android:insetBottom="@dimen/search_ask_button_vertical_margin">
    <shape android:shape="rectangle">
        <corners android:radius="?attr/actionBarSize"/>
        <solid android:color="@color/ytm_color_white_at_10pct"/>
    </shape>
</inset>

=== drawable/audio_video_switcher_toggle_background.xml ===
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:top="@dimen/item_small_spacing"
        android:bottom="@dimen/item_small_spacing">
        <shape android:shape="rectangle">
            <solid android:color="#1a1a1a"/>
            <corners android:radius="100dp"/>
        </shape>
    </item>
</layer-list>

=== drawable/audio_video_switcher_toggle_selector.xml ===
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:shape="rectangle">
    <solid android:color="#282828"/>
    <corners android:radius="100dp"/>
</shape>

=== drawable/badge_container_space_divider.xml ===
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <size
        android:height="0dp"
        android:width="2dp"/>
</shape>

=== drawable/browse_page_background_image_gradient.xml ===
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:startColor="@color/black_20_opacity"
        android:endColor="@color/shelf_default_background_color"
        android:angle="270"
        android:type="linear"/>
</shape>

=== drawable/immersive_header_gradient.xml ===
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <gradient
        android:startColor="@color/music_full_transparent"
        android:endColor="@color/immersive_header_gradient_top"
        android:angle="90"/>
</shape>

=== drawable/immersive_shelf_background_overlay_gradient.xml ===
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:startColor="@color/immersive_shelf_gradient_transparent_color"
        android:endColor="@color/shelf_default_background_color"
        android:angle="270"
        android:type="linear"
        android:centerColor="@color/shelf_default_background_color"/>
</shape>

=== drawable/mic_state_selector.xml ===
<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:state_enabled="true"
        android:drawable="@drawable/yt_outline_mic_vd_theme_24"/>
    <item
        android:state_enabled="false"
        android:drawable="@drawable/yt_outline_mic_off_vd_theme_24"/>
</selector>

=== drawable/playback_control_button_indicator.xml ===
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="@color/ytm_color_white"/>
    <size
        android:height="@dimen/playback_control_button_indicator_size"
        android:width="@dimen/playback_control_button_indicator_size"/>
</shape>

=== drawable/player_page_artist_link_background.xml ===
<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:state_pressed="true"
        android:color="#b1fffffe"/>
    <item android:color="@color/ytm_text_color_secondary_translucent"/>
</selector>

=== drawable/queue_header_background.xml ===
<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape>
            <gradient
                android:startColor="@color/music_5_percent_transparent"
                android:endColor="@android:color/transparent"
                android:angle="90"
                android:type="linear"/>
        </shape>
    </item>
</selector>

=== drawable/ripple.xml ===
<?xml version="1.0" encoding="utf-8"?>
<ripple xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:color="?android:attr/colorControlHighlight"
    android:radius="24dp"/>

=== drawable/ripple_large.xml ===
<?xml version="1.0" encoding="utf-8"?>
<ripple xmlns:android="http://schemas.android.com/apk/res/android"
    android:color="?android:attr/colorControlHighlight"
    android:radius="28dp"/>

=== drawable/ripple_small.xml ===
<?xml version="1.0" encoding="utf-8"?>
<ripple xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:color="?android:attr/colorControlHighlight"
    android:radius="16dp"/>

=== drawable/search_edit_text_cursor.xml ===
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <size android:width="2dp"/>
    <solid android:color="?attr/ytTextPrimary"/>
</shape>

=== drawable/search_query_background.xml ===
<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:insetTop="@dimen/item_extra_small_spacing"
    android:insetBottom="@dimen/item_extra_small_spacing">
    <shape android:shape="rectangle">
        <corners android:radius="?attr/actionBarSize"/>
        <padding
            android:left="@dimen/action_bar_icon_padding"
            android:top="@dimen/abc_button_padding_vertical_material"
            android:right="@dimen/remix_generic_button_size"
            android:bottom="@dimen/abc_button_padding_vertical_material"/>
        <solid android:color="@color/ytm_color_white_at_10pct"/>
    </shape>
</inset>

=== drawable/single_bar_drag_handle.xml ===
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <corners android:radius="3dp"/>
    <size
        android:height="@dimen/yt_sys_measurement_size_min"
        android:width="@dimen/yt_sys_measurement_size_hero"/>
</shape>

=== drawable/visual_header_gradient_top.xml ===
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <gradient
        android:startColor="@color/music_100_percent_transparent"
        android:endColor="@color/music_5_percent_transparent"
        android:angle="90"/>
</shape>
```

</details>

Also verified from `rounded_corner_button_shape.xml` (`Widget.WhiteButton` / `Widget.GreyBorderTransparentButton`): `1dp` stroke, `2dp` corner radius (`@dimen/rounded_button_corner_radius`), `#fffffe` fill (`WhiteButton`) or transparent fill + `#aaaaaa` border (`GreyBorderTransparentButton`).

### 4.4 Typography System & Font Styles

- **Font Assets (`assets/` -> `res/font/`)**: `YTSans-Bold.otf` (OpenType CFF, `YTSans-Bold`) and `YTSans-Medium.otf` (TrueType, `YTSans-Medium`); also `assets/youtube_sans_bold_font.ttf` (`155,884` B). `youtube_sans_font_letter_spacing = -0.04`; `roboto_font_letter_spacing = 0`.
- **Mobile Reference Font Families (`strings.xml`)**:
  - `yt_ref_typography_values_mobile_google_default_marquee_font_family` = `YouTubeMarquee`
  - `yt_ref_typography_values_mobile_google_font_family_regular` = `sans-serif`
  - `yt_ref_typography_values_mobile_google_font_family_medium` = `sans-serif-medium`
  - `yt_ref_typography_values_mobile_google_font_family_bold` = `sans-serif` (with `textStyle=bold`)
  - `yt_ref_typography_values_mobile_google_font_family_black` = `sans-serif-black`

| Style | `textSize` (resolved) | Font / Weight | Other Properties |
|---|---|---|---|
| `TextAppearance.YouTubeMusic.MassiveTitle` | `48sp` | `YouTubeSans Bold` | letterSpacing=-0.04 |
| `TextAppearance.YouTubeMusic.MassiveTitleModern` | `32sp` | `Roboto Medium (bold)` | letterSpacing=0 |
| `TextAppearance.YouTubeMusic.VisualHeader.Title` | `60sp` | `YouTubeSans Bold` | letterSpacing=-0.04 (medium=42sp, small=30sp) |
| `TextAppearance.YouTubeMusic.Display1` | `28sp` | `YouTubeSans Bold` | letterSpacing=-0.04 |
| `TextAppearance.YouTubeMusic.Display1Modern` | `24sp` | `Roboto Medium (bold)` | letterSpacing=0 |
| `TextAppearance.YouTubeMusic.Display2` | `22sp` | `YouTubeSans Bold` | letterSpacing=-0.04 |
| `TextAppearance.YouTubeMusic.Display2Modern` | `20sp` | `Roboto Medium (bold)` | letterSpacing=0 |
| `TextAppearance.YouTubeMusic.Title1` | `20sp` | `Roboto Medium` | textColor=?textColorPrimary |
| `TextAppearance.YouTubeMusic.SearchInput` | `18sp` | `Roboto Medium` | parent=Title1 |
| `TextAppearance.YouTubeMusic.Title2` | `14sp` | `Roboto Medium` | textColor=?textColorPrimary |
| `TextAppearance.YouTubeMusic.ListItemTitle` | `14sp` | `Roboto Medium` | parent=Title2 |
| `TextAppearance.YouTubeMusic.Title3` | `18sp` | `Roboto Medium` | textColor=?textColorPrimary |
| `TextAppearance.YouTubeMusic.Subtitle1` | `14sp` | `Roboto Regular` | textColor=?textColorSecondary |
| `TextAppearance.YouTubeMusic.Subtitle1.Translucent` | `14sp` | `Roboto Regular` | textColor=#aaffffff |
| `TextAppearance.YouTubeMusic.Body2` | `14sp` | `Roboto Regular` | lineSpacingMultiplier=1.1 |
| `TextAppearance.YouTubeMusic.Body3` | `14sp` | `Roboto Regular` | textColor=?textColorSecondary, lineSpacingMultiplier=1.1 |
| `TextAppearance.YouTubeMusic.Button1` | `14sp` | `Roboto Medium` | textAllCaps=true |
| `TextAppearance.YouTubeMusic.Reason2.Translucent` | `14sp` | `Roboto Regular` | textColor=#aaffffff |
| `TextAppearance.YouTubeMusic.Caption` | `12sp` | `Roboto Regular` | sw600dp=14sp |
| `YtmDisplay01` | `28sp` | `YouTubeSans Bold` | color=#fffffe, letterSpacing=-0.04 |
| `YtmTitle02` | `14sp` | `Roboto Medium` | color=#fffffe |
| `YtmSubtitle01` | `14sp` | `Roboto Regular` | color=#aaaaaa |
| `AvSwitcherSpecMpp` | `14sp` | `Roboto Medium` | color=#fffffe |
| `SentenceCaseTab` | `14sp` | `AppCompat.Button` | textAllCaps=false |
| `TextAppearance.Yt.Sys.Typography.Typestack.ActionM.Default` | `14sp` | `sans-serif-medium` | lineHeight=18sp, allCaps=false |
| `TextAppearance.Yt.Sys.Typography.Typestack.BodyM.Default` | `14sp` | `sans-serif` | lineHeight=18sp, allCaps=false |
| `TextAppearance.Yt.Sys.Typography.Typestack.BodyM.Heavy` | `14sp` | `sans-serif-medium` | lineHeight=18sp, allCaps=false |

### 4.5 Dimension Tokens (`dimens.xml`, `values-sw600dp`, `values-land`)

| Dimension Token | Raw Value | Resolved Value | Tablet / Landscape Override |
|---|---|---|---|
| `action_bar_height` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `action_bar_icon_padding` | `12dp` | `12dp` | - |
| `active_icon_alpha` | `1` | `1` | - |
| `audio_video_switch_button_height` | `@dimen/yt_sys_measurement_size_prominent` | `@dimen/yt_sys_measurement_size_prominent -> @dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `audio_video_switch_button_min_height` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `audio_video_switch_button_min_width` | `72dp` | `72dp` | - |
| `audio_video_switch_button_width` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `audio_video_switch_icon_padding` | `9dp` | `9dp` | - |
| `bottom_sheet_default_max_width` | `400dp` | `400dp` | - |
| `bottom_sheet_dialog_icon_size` | `48dp` | `48dp` | - |
| `bottom_sheet_dialog_margin` | `24dp` | `24dp` | - |
| `bottom_sheet_dialog_message_bottom_padding` | `18dp` | `18dp` | - |
| `bottom_sheet_dialog_message_line_extra` | `6dp` | `6dp` | - |
| `bottom_sheet_dialog_message_text_size` | `14sp` | `14sp` | - |
| `bottom_sheet_dialog_title_bottom_padding` | `10dp` | `10dp` | - |
| `bottom_sheet_dialog_title_line_extra` | `6dp` | `6dp` | - |
| `bottom_sheet_dialog_title_text` | `16sp` | `16sp` | - |
| `bottom_sheet_grid_column_width` | `80dp` | `80dp` | - |
| `bottom_sheet_grid_padding_start_end` | `24dp` | `24dp` | - |
| `bottom_sheet_grid_padding_top_bottom` | `16dp` | `16dp` | - |
| `bottom_sheet_grid_vertical_spacing` | `16dp` | `16dp` | - |
| `bottom_sheet_handle_margin` | `8dp` | `8dp` | - |
| `bottom_sheet_list_icon_size` | `24dp` | `24dp` | - |
| `bottom_sheet_list_item_height` | `48dp` | `48dp` | - |
| `bottom_sheet_list_item_text_margin` | `12dp` | `12dp` | - |
| `bottom_sheet_list_text_padding` | `32dp` | `32dp` | - |
| `bottom_sheet_margins` | `8dp` | `8dp` | - |
| `bottom_sheet_padding` | `8dp` | `8dp` | - |
| `bottom_sheet_padding_bottom` | `8dp` | `8dp` | - |
| `bottom_sheet_peek_height` | `20dp` | `20dp` | - |
| `bottom_sheet_rounded_corners` | `@dimen/yt_sys_measurement_radius_cozy` | `@dimen/yt_sys_measurement_radius_cozy -> @dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `bottom_sheet_separator_height` | `16dp` | `16dp` | - |
| `bottom_sheet_title_height` | `56dp` | `56dp` | - |
| `bottom_sheet_top_margin` | `24dp` | `24dp` | - |
| `button_1_text_size` | `14sp` | `14sp` | - |
| `button_border_width` | `@dimen/yt_sys_measurement_stroke_comfortable` | `@dimen/yt_sys_measurement_stroke_comfortable -> @dimen/yt_ref_dimension_size1 -> 1dp` | - |
| `button_corner_radius` | `@dimen/yt_sys_measurement_radius_min` | `@dimen/yt_sys_measurement_radius_min -> @dimen/yt_ref_dimension_size2 -> 2dp` | - |
| `button_gradient_border_width` | `@dimen/yt_sys_measurement_stroke_expanded` | `@dimen/yt_sys_measurement_stroke_expanded -> @dimen/yt_ref_dimension_size2 -> 2dp` | - |
| `button_horizontal_padding_extra_large` | `32dp` | `32dp` | - |
| `button_horizontal_padding_extra_small` | `8dp` | `8dp` | - |
| `button_horizontal_padding_large` | `24dp` | `24dp` | - |
| `button_horizontal_padding_medium` | `16dp` | `16dp` | - |
| `button_horizontal_padding_small` | `12dp` | `12dp` | - |
| `button_icon_height_extra_small` | `@dimen/yt_sys_measurement_icon_size_condensed` | `@dimen/yt_sys_measurement_icon_size_condensed -> @dimen/yt_ref_dimension_size16 -> 16dp` | - |
| `button_icon_padding_extra_large` | `12dp` | `12dp` | - |
| `button_icon_padding_extra_small` | `2dp` | `2dp` | - |
| `button_icon_padding_large` | `8dp` | `8dp` | - |
| `button_icon_padding_medium` | `6dp` | `6dp` | - |
| `button_icon_padding_small` | `4dp` | `4dp` | - |
| `button_min_height_extra_large` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `button_min_height_extra_small` | `@dimen/yt_sys_measurement_size_comfortable` | `@dimen/yt_sys_measurement_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `button_min_height_large` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `button_min_height_medium` | `@dimen/yt_sys_measurement_size_prominent` | `@dimen/yt_sys_measurement_size_prominent -> @dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `button_min_height_small` | `@dimen/yt_sys_measurement_size_expanded` | `@dimen/yt_sys_measurement_size_expanded -> @dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `button_min_width` | `96dp` | `96dp` | - |
| `button_outline_width` | `@dimen/yt_sys_measurement_stroke_comfortable` | `@dimen/yt_sys_measurement_stroke_comfortable -> @dimen/yt_ref_dimension_size1 -> 1dp` | - |
| `button_size_large_height` | `@dimen/yt_sys_measurement_action_height_prominent` | `@dimen/yt_sys_measurement_action_height_prominent -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `button_size_medium_height` | `@dimen/yt_sys_measurement_size_prominent` | `@dimen/yt_sys_measurement_size_prominent -> @dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `button_size_small_height` | `@dimen/yt_sys_measurement_action_height_compact` | `@dimen/yt_sys_measurement_action_height_compact -> @dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `button_text_size_extra_large` | `24sp` | `24sp` | - |
| `button_text_size_extra_small` | `12sp` | `12sp` | - |
| `button_text_size_large` | `18sp` | `18sp` | - |
| `button_text_size_medium` | `14sp` | `14sp` | - |
| `button_text_size_small` | `12sp` | `12sp` | - |
| `carousel_bottom_padding_small` | `8dp` | `8dp` | - |
| `carousel_header_end_title_icons_padding_bottom` | `7dp` | `7dp` | - |
| `carousel_header_end_title_icons_padding_start` | `12dp` | `12dp` | - |
| `carousel_header_image_size` | `@dimen/yt_sys_measurement_size_hero` | `@dimen/yt_sys_measurement_size_hero -> @dimen/yt_ref_dimension_size40 -> 40dp` | - |
| `carousel_header_padding_bottom` | `12dp` | `12dp` | - |
| `carousel_header_padding_horizontal` | `16dp` | `16dp` | - |
| `carousel_header_padding_top` | `12dp` | `12dp` | - |
| `carousel_header_start_image_margin_end` | `16dp` | `16dp` | - |
| `carousel_header_text_padding_end` | `16dp` | `16dp` | - |
| `carousel_item_margin` | `8dp` | `8dp` | - |
| `carousel_large_item_peek_width` | `96dp` | `96dp` | - |
| `carousel_peek_width` | `@dimen/yt_sys_measurement_size_comfortable` | `@dimen/yt_sys_measurement_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `carousel_shelf_strapline_margin_top` | `4dp` | `4dp` | - |
| `carousel_small_item_peek_width` | `@dimen/yt_sys_measurement_size_comfortable` | `@dimen/yt_sys_measurement_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `carousel_top_padding` | `8dp` | `8dp` | - |
| `carousel_two_column_item_extra_start_margin` | `4dp` | `4dp` | - |
| `carousel_two_column_item_horizontal_margin` | `4dp` | `4dp` | - |
| `carousel_two_column_item_peek_width` | `14dp` | `14dp` | - |
| `carousel_two_column_item_vertical_margin` | `0dp` | `0dp` | - |
| `detail_page_specialty_button_min_width` | `136dp` | `136dp` | - |
| `detail_page_split_screen_header_width_ratio` | `0.4` | `0.4` | - |
| `disabled_icon_alpha` | `0.3` | `0.3` | - |
| `display_1_modern_text_size` | `24sp` | `24sp` | - |
| `display_1_text_size` | `28sp` | `28sp` | - |
| `display_2_modern_text_size` | `20sp` | `20sp` | - |
| `display_2_text_size` | `22sp` | `22sp` | - |
| `entity_header_subtitle_badge_container_padding_top` | `1dp` | `1dp` | - |
| `extra_extra_small_font_size` | `10sp` | `10sp` | sw600dp=12sp |
| `extra_large_font_size` | `20sp` | `20sp` | sw600dp=24sp |
| `extra_small_font_size` | `12sp` | `12sp` | sw600dp=14sp |
| `floating_mini_player_height` | `64dp` | `64dp` | - |
| `header_horizontal_padding` | `16dp` | `16dp` | - |
| `header_horizontal_padding_for_textless_button` | `10dp` | `10dp` | - |
| `header_image_spacing` | `16dp` | `16dp` | - |
| `header_min_height` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `header_scrim_anim_start_delay` | `67dp` | `67dp` | - |
| `header_text_spacing` | `2dp` | `2dp` | - |
| `header_timestamp_marginEnd` | `4dp` | `4dp` | - |
| `header_title_marginEnd` | `4dp` | `4dp` | - |
| `header_vertical_padding` | `12dp` | `12dp` | - |
| `immersive_shelf_bottom_padding` | `32dp` | `32dp` | - |
| `immersive_shelf_chip_cloud_margin_top` | `44dp` | `44dp` | - |
| `immersive_shelf_max_height` | `400dp` | `400dp` | - |
| `immersive_shelf_strapline_margin_top` | `76dp` | `76dp` | - |
| `item_extra_extra_extra_large_spacing` | `32dp` | `32dp` | - |
| `item_extra_extra_large_spacing` | `24dp` | `24dp` | - |
| `item_extra_extra_small_spacing` | `2dp` | `2dp` | - |
| `item_extra_large_spacing` | `20dp` | `20dp` | - |
| `item_extra_small_spacing` | `4dp` | `4dp` | - |
| `item_large_spacing` | `16dp` | `16dp` | - |
| `item_medium_spacing` | `12dp` | `12dp` | - |
| `item_overlay_extra_extra_small_inset` | `0.4dp` | `0.4dp` | - |
| `item_small_medium_spacing` | `10dp` | `10dp` | - |
| `item_small_spacing` | `8dp` | `8dp` | - |
| `item_touch_helper_max_drag_scroll_per_frame` | `20dp` | `20dp` | - |
| `item_touch_helper_swipe_escape_max_velocity` | `800dp` | `800dp` | - |
| `item_touch_helper_swipe_escape_velocity` | `120dp` | `120dp` | - |
| `list_item_title_text_size` | `14sp` | `14sp` | - |
| `live_indicator_top_margin` | `22dp` | `22dp` | - |
| `massive_font_size` | `48sp` | `48sp` | - |
| `massive_font_size_modern` | `32sp` | `32sp` | - |
| `mdx_chip_cloud_chip_audio_side_margin` | `8dp` | `8dp` | - |
| `mdx_chip_cloud_chip_bottom_margin` | `16dp` | `16dp` | - |
| `mdx_chip_cloud_chip_button_max_width` | `180dp` | `180dp` | - |
| `mdx_chip_cloud_chip_video_left_margin` | `49dp` | `49dp` | - |
| `mdx_chip_cloud_chip_video_right_margin` | `48dp` | `48dp` | - |
| `medium_font_size` | `16sp` | `16sp` | sw600dp=18sp |
| `menu_item_leading_accessory_end_margin` | `24dp` | `24dp` | - |
| `menu_item_leading_accessory_size` | `@dimen/yt_sys_measurement_size_comfortable` | `@dimen/yt_sys_measurement_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `menu_item_min_height` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `menu_item_padding_horizontal` | `16dp` | `16dp` | - |
| `menu_item_padding_vertical` | `8dp` | `8dp` | - |
| `menu_item_trailing_accessory_end_margin` | `4dp` | `4dp` | - |
| `mini_player_height` | `68dp` | `68dp` | - |
| `mini_player_scrim_height` | `72dp` | `72dp` | - |
| `mini_player_watch_fragment_length` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `music_active_account_header_manage_account_margin_start` | `68dp` | `68dp` | - |
| `music_active_account_header_margin_start` | `16dp` | `16dp` | - |
| `music_app_devicepicker_metadata_icon_layout_height` | `@dimen/yt_sys_measurement_icon_size_hero` | `@dimen/yt_sys_measurement_icon_size_hero -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `music_app_devicepicker_metadata_icon_layout_width` | `@dimen/yt_sys_measurement_icon_size_hero` | `@dimen/yt_sys_measurement_icon_size_hero -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `music_bottom_sheet_menu_divider_height` | `@dimen/yt_sys_measurement_size_hairline` | `@dimen/yt_sys_measurement_size_hairline -> @dimen/yt_ref_dimension_size1 -> 1dp` | - |
| `music_bottom_sheet_menu_title_icon_width` | `@dimen/yt_sys_measurement_icon_size_prominent` | `@dimen/yt_sys_measurement_icon_size_prominent -> @dimen/yt_ref_dimension_size40 -> 40dp` | - |
| `music_card_shelf_button_min_width` | `146dp` | `146dp` | - |
| `music_card_shelf_button_section_padding` | `2dp` | `2dp` | - |
| `music_card_shelf_button_spacing_large` | `12dp` | `12dp` | - |
| `music_card_shelf_button_spacing_small` | `8dp` | `8dp` | - |
| `music_card_shelf_corner_radius` | `@dimen/yt_sys_measurement_radius_condensed` | `@dimen/yt_sys_measurement_radius_condensed -> @dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `music_card_shelf_thumbnail_to_the_side_button_min_width` | `146dp` | `146dp` | - |
| `music_card_shelf_thumbnail_to_the_side_button_section_padding` | `10dp` | `10dp` | - |
| `music_card_shelf_thumbnail_to_the_side_button_spacing_between` | `16dp` | `16dp` | - |
| `music_card_shelf_thumbnail_to_the_side_thumbnail_size` | `142dp` | `142dp` | - |
| `music_card_shelf_thumnbnail_above_button_min_width` | `146dp` | `146dp` | - |
| `music_card_shelf_thumnbnail_above_button_section_padding` | `6dp` | `6dp` | - |
| `music_card_shelf_thumnbnail_above_button_spacing_large` | `12dp` | `12dp` | - |
| `music_card_shelf_thumnbnail_above_button_spacing_small` | `8dp` | `8dp` | - |
| `music_card_shelf_thumnbnail_above_thumbnail_max_size` | `128dp` | `128dp` | - |
| `music_card_shelf_thumnbnail_above_thumbnail_min_size` | `64dp` | `64dp` | - |
| `music_card_shelf_undercard_vertical_padding` | `6dp` | `6dp` | - |
| `music_custom_index_column_container_width` | `46dp` | `46dp` | - |
| `music_detail_header_overlay_size` | `@dimen/yt_sys_measurement_size_prominent` | `@dimen/yt_sys_measurement_size_prominent -> @dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `music_entity_header_bottom_margin` | `28dp` | `28dp` | land=@dimen/item_large_spacing |
| `music_entity_header_thumbnail_corner_radius` | `@dimen/yt_sys_measurement_radius_condensed` | `@dimen/yt_sys_measurement_radius_condensed -> @dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `music_entity_header_title_size` | `24sp` | `24sp` | - |
| `music_entity_header_title_size_small` | `20sp` | `20sp` | - |
| `music_entity_thumbnail_size` | `0dp` | `0dp` | land=131dp |
| `music_entity_title_view_size` | `192dp` | `192dp` | sw600dp=@dimen/layout_match_parent, land=@dimen/layout_match_parent |
| `music_expandable_header_image_height` | `160dp` | `160dp` | - |
| `music_expandable_large_spacing` | `16dp` | `16dp` | - |
| `music_extra_small_icon_size` | `@dimen/yt_sys_measurement_icon_size_condensed` | `@dimen/yt_sys_measurement_icon_size_condensed -> @dimen/yt_ref_dimension_size16 -> 16dp` | - |
| `music_generic_button_size` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `music_icon_size` | `@dimen/yt_sys_measurement_icon_size_comfortable` | `@dimen/yt_sys_measurement_icon_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `music_immersive_browse_bottom_gradient_height` | `220dp` | `220dp` | - |
| `music_immersive_browse_top_gradient_height` | `120dp` | `120dp` | - |
| `music_immersive_like_animation_size` | `240dp` | `240dp` | - |
| `music_immersive_play_pause_icon_size` | `96dp` | `96dp` | - |
| `music_inline_badge_padding_end` | `2dp` | `2dp` | - |
| `music_item_thumbnail_overlay_default_size` | `@dimen/yt_sys_measurement_size_compact` | `@dimen/yt_sys_measurement_size_compact -> @dimen/yt_ref_dimension_size16 -> 16dp` | - |
| `music_key_promo_padding_top` | `40dp` | `40dp` | - |
| `music_list_item_thumbnail_corner_radius` | `@dimen/yt_sys_measurement_radius_min` | `@dimen/yt_sys_measurement_radius_min -> @dimen/yt_ref_dimension_size2 -> 2dp` | - |
| `music_medium_inline_title_badge_padding_top` | `4dp` | `4dp` | - |
| `music_overflow_button_horizontal_left_padding` | `28dp` | `28dp` | - |
| `music_overflow_button_horizontal_padding` | `16dp` | `16dp` | - |
| `music_overflow_button_horizontal_right_padding` | `4dp` | `4dp` | - |
| `music_overflow_button_plus_horizontal_padding_size` | `50dp` | `50dp` | - |
| `music_overflow_button_plus_vertical_padding_size` | `40dp` | `40dp` | - |
| `music_overflow_button_vertical_padding` | `11dp` | `11dp` | - |
| `music_play_button_icon_size` | `56dp` | `56dp` | - |
| `music_shelf_bottom_command_width` | `118dp` | `118dp` | - |
| `music_small_icon_size` | `@dimen/yt_sys_measurement_icon_size_compact` | `@dimen/yt_sys_measurement_icon_size_compact -> @dimen/yt_ref_dimension_size18 -> 18dp` | - |
| `music_small_inline_title_badge_padding_top` | `4dp` | `4dp` | - |
| `music_snackbar_action_margin_horizontal` | `8dp` | `8dp` | - |
| `music_snackbar_corner_radius` | `@dimen/yt_sys_measurement_radius_condensed` | `@dimen/yt_sys_measurement_radius_condensed -> @dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `music_snackbar_message_margin_horizontal` | `16dp` | `16dp` | - |
| `music_sort_filter_button_height` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `music_sort_filter_button_icon_flat_style_padding` | `3dp` | `3dp` | - |
| `music_sort_filter_button_icon_flat_style_vertical_padding_offset` | `1dp` | `1dp` | - |
| `music_sort_filter_button_icon_small_width` | `@dimen/yt_sys_measurement_icon_size_cozy` | `@dimen/yt_sys_measurement_icon_size_cozy -> @dimen/yt_ref_dimension_size20 -> 20dp` | - |
| `music_sort_filter_button_icon_width` | `@dimen/yt_sys_measurement_icon_size_comfortable` | `@dimen/yt_sys_measurement_icon_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `music_sort_filter_button_inner_margin` | `8dp` | `8dp` | - |
| `music_sort_filter_button_min_width` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `music_sort_filter_button_right_padding` | `8dp` | `8dp` | - |
| `music_sort_filter_button_text_field_max_width` | `272dp` | `272dp` | - |
| `music_spotlight_item_overlay_size` | `30dp` | `30dp` | - |
| `music_spotlight_item_play_button_size` | `@dimen/yt_sys_measurement_size_prominent` | `@dimen/yt_sys_measurement_size_prominent -> @dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `music_spotlight_item_thumbnail_width` | `72dp` | `72dp` | - |
| `music_tastebuilder_shelf_button_margin_bottom` | `22dp` | `22dp` | - |
| `music_tastebuilder_shelf_button_margin_top` | `19dp` | `19dp` | - |
| `music_tastebuilder_shelf_primary_text_height` | `@dimen/yt_sys_measurement_size_expanded` | `@dimen/yt_sys_measurement_size_expanded -> @dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `music_tastebuilder_shelf_primary_text_size` | `20sp` | `20sp` | - |
| `music_tastebuilder_shelf_secondary_text_height` | `20dp` | `20dp` | - |
| `music_tastebuilder_shelf_secondary_text_size` | `14sp` | `14sp` | - |
| `music_tastebuilder_shelf_text_side_margin` | `6dp` | `6dp` | - |
| `music_tastebuilder_shelf_thumbnail_height` | `76dp` | `76dp` | - |
| `music_tastebuilder_shelf_thumbnail_margin_horizontal` | `56dp` | `56dp` | - |
| `music_tastebuilder_shelf_thumbnail_margin_top` | `36dp` | `36dp` | - |
| `music_tastebuilder_shelf_thumbnail_width` | `248dp` | `248dp` | - |
| `music_thumbnail_default_corner_radius` | `@dimen/yt_sys_measurement_radius_min` | `@dimen/yt_sys_measurement_radius_min -> @dimen/yt_ref_dimension_size2 -> 2dp` | - |
| `music_thumbnail_default_height` | `@dimen/yt_sys_measurement_size_hero` | `@dimen/yt_sys_measurement_size_hero -> @dimen/yt_ref_dimension_size40 -> 40dp` | - |
| `music_thumbnail_default_width` | `@dimen/yt_sys_measurement_size_hero` | `@dimen/yt_sys_measurement_size_hero -> @dimen/yt_ref_dimension_size40 -> 40dp` | - |
| `music_two_column_overlay_size` | `@dimen/yt_sys_measurement_size_comfortable` | `@dimen/yt_sys_measurement_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `music_two_row_overlay_now_playing_indicator_size` | `28dp` | `28dp` | - |
| `music_two_row_overlay_size` | `@dimen/yt_sys_measurement_size_prominent` | `@dimen/yt_sys_measurement_size_prominent -> @dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `music_two_row_overlay_size_extra_small` | `@dimen/yt_sys_measurement_size_expanded` | `@dimen/yt_sys_measurement_size_expanded -> @dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `music_two_row_overlay_size_small` | `@dimen/yt_sys_measurement_size_expanded` | `@dimen/yt_sys_measurement_size_expanded -> @dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `music_two_row_play_button_size` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `music_two_row_play_button_size_extra_small` | `@dimen/yt_sys_measurement_size_expanded` | `@dimen/yt_sys_measurement_size_expanded -> @dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `music_two_row_play_button_size_small` | `@dimen/yt_sys_measurement_size_hero` | `@dimen/yt_sys_measurement_size_hero -> @dimen/yt_ref_dimension_size40 -> 40dp` | - |
| `navigation_button_border_radius` | `@dimen/yt_sys_measurement_radius_condensed` | `@dimen/yt_sys_measurement_radius_condensed -> @dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `navigation_button_border_thickness` | `@dimen/yt_sys_measurement_stroke_comfortable` | `@dimen/yt_sys_measurement_stroke_comfortable -> @dimen/yt_ref_dimension_size1 -> 1dp` | - |
| `navigation_button_cap_width` | `@dimen/yt_sys_measurement_size_tiny` | `@dimen/yt_sys_measurement_size_tiny -> @dimen/yt_ref_dimension_size6 -> 6dp` | - |
| `navigation_button_height` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `navigation_button_large_height` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `navigation_button_left_padding` | `18dp` | `18dp` | - |
| `navigation_button_right_padding` | `16dp` | `16dp` | - |
| `now_playing_byline_font_size` | `16sp` | `16sp` | - |
| `playback_control_button_indicator_margin_top` | `36dp` | `36dp` | - |
| `playback_control_button_indicator_margin_top_large` | `40dp` | `40dp` | - |
| `playback_control_button_indicator_size` | `@dimen/yt_sys_measurement_size_min` | `@dimen/yt_sys_measurement_size_min -> @dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `playback_control_button_size` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `playback_controls_padding_bottom` | `32dp` | `32dp` | - |
| `playback_controls_padding_bottom_small` | `16dp` | `16dp` | - |
| `playback_controls_padding_horizontal` | `20dp` | `20dp` | - |
| `playback_controls_padding_top` | `16dp` | `16dp` | - |
| `playback_controls_space_medium` | `12dp` | `12dp` | - |
| `playback_controls_spacing` | `16dp` | `16dp` | - |
| `playback_rate_text_button_text_size` | `16sp` | `16sp` | - |
| `player_bottom_sheet_corner_radius` | `@dimen/yt_sys_measurement_radius_cozy` | `@dimen/yt_sys_measurement_radius_cozy -> @dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `player_container_text_size` | `12sp` | `12sp` | sw600dp=14sp |
| `player_overlay_like_animation_size` | `240dp` | `240dp` | - |
| `player_page_padding_horizontal` | `32dp` | `32dp` | - |
| `player_page_padding_horizontal_medium` | `20dp` | `20dp` | - |
| `player_page_scrim_offset` | `120dp` | `120dp` | - |
| `player_page_scrim_offset_large` | `240dp` | `240dp` | - |
| `player_page_tab_shelf_item_length` | `151dp` | `151dp` | - |
| `queue_header_action_margin_end` | `10dp` | `10dp` | - |
| `queue_header_shadow_height` | `@dimen/yt_sys_measurement_size_min` | `@dimen/yt_sys_measurement_size_min -> @dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `queue_shuffle_button_indicator_padding_end` | `23dp` | `23dp` | - |
| `queue_shuffle_button_indicator_padding_start` | `21dp` | `21dp` | - |
| `reason_1_text_size` | `14sp` | `14sp` | - |
| `reason_2_text_size` | `14sp` | `14sp` | - |
| `remix_artist_page_landscape_header_image_height` | `150dp` | `150dp` | - |
| `remix_artist_page_tablet_landscape_header_image_height` | `300dp` | `300dp` | - |
| `remix_generic_button_size` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `remix_overlay_play_button_size` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `remix_overlay_play_button_size_large` | `72dp` | `72dp` | - |
| `remix_overlay_player_control_button_padding` | `12dp` | `12dp` | - |
| `remix_overlay_player_control_button_size` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `roboto_font_letter_spacing` | `0` | `0` | - |
| `search_ask_button_end_margin` | `@dimen/yt_sys_measurement_size_condensed` | `@dimen/yt_sys_measurement_size_condensed -> @dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `search_ask_button_icon_label_spacing` | `@dimen/yt_sys_measurement_size_min` | `@dimen/yt_sys_measurement_size_min -> @dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `search_ask_button_icon_size` | `@dimen/yt_sys_measurement_icon_size_condensed` | `@dimen/yt_sys_measurement_icon_size_condensed -> @dimen/yt_ref_dimension_size16 -> 16dp` | - |
| `search_ask_button_padding_end` | `@dimen/yt_sys_measurement_size_condensed` | `@dimen/yt_sys_measurement_size_condensed -> @dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `search_ask_button_padding_start` | `@dimen/yt_sys_measurement_size_condensed` | `@dimen/yt_sys_measurement_size_condensed -> @dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `search_ask_button_vertical_margin` | `@dimen/yt_sys_measurement_size_condensed` | `@dimen/yt_sys_measurement_size_condensed -> @dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `search_bar_height` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `search_bar_text_size` | `18sp` | `18sp` | - |
| `search_card_chevron_length` | `@dimen/yt_sys_measurement_size_comfortable` | `@dimen/yt_sys_measurement_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `search_card_end_icon_end_padding` | `12dp` | `12dp` | - |
| `search_entry_height` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `search_header_start_side_button_width` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `search_header_text_padding_end` | `54dp` | `54dp` | - |
| `search_header_text_padding_start` | `20dp` | `20dp` | - |
| `search_header_voice_button_start_margin` | `4dp` | `4dp` | - |
| `search_icon_horizontal_margin` | `4dp` | `4dp` | - |
| `search_icon_start_margin` | `16dp` | `16dp` | - |
| `search_icon_width` | `@dimen/yt_sys_measurement_icon_size_hero` | `@dimen/yt_sys_measurement_icon_size_hero -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `search_text_offset` | `16dp` | `16dp` | - |
| `small_font_non_scalable` | `14dp` | `14dp` | sw600dp=16dp |
| `small_font_size` | `14sp` | `14sp` | sw600dp=16sp |
| `subtitle_1_text_size` | `14sp` | `14sp` | - |
| `subtitle_window_padding` | `5dp` | `5dp` | - |
| `tab_divider_alpha` | `0.1` | `0.1` | - |
| `tab_divider_height` | `@dimen/yt_sys_measurement_size_hairline` | `@dimen/yt_sys_measurement_size_hairline -> @dimen/yt_ref_dimension_size1 -> 1dp` | - |
| `tab_drag_handle_alpha` | `0.3` | `0.3` | - |
| `tab_header_height` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `tab_new_content_indicator_bottom_padding` | `6dp` | `6dp` | sw600dp=8dp |
| `tab_padding_horizontal` | `12dp` | `12dp` | - |
| `tab_space_width_between_icon_and_title` | `6dp` | `6dp` | - |
| `tab_strip_margin` | `16dp` | `16dp` | - |
| `tab_strip_margin_extra_small` | `4dp` | `4dp` | - |
| `tab_strip_margin_small` | `12dp` | `12dp` | - |
| `tabs_bar_brand_indicator_offset` | `8dp` | `8dp` | - |
| `tabs_bar_brand_indicator_width` | `@dimen/yt_sys_measurement_size_comfortable` | `@dimen/yt_sys_measurement_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `tabs_highlight_height` | `2dp` | `2dp` | - |
| `time_bar_height` | `@dimen/yt_sys_measurement_size_comfortable` | `@dimen/yt_sys_measurement_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `time_bar_margin_bottom` | `16dp` | `16dp` | - |
| `time_bar_margin_landscape` | `16dp` | `16dp` | - |
| `time_bar_padding_horizontal` | `32dp` | `32dp` | - |
| `title_1_text_size` | `20sp` | `20sp` | - |
| `title_2_text_size` | `14sp` | `14sp` | - |
| `two_column_item_badge_container_padding_top` | `1dp` | `1dp` | - |
| `two_column_item_highlight_card_corner_radius` | `@dimen/yt_sys_measurement_radius_condensed` | `@dimen/yt_sys_measurement_radius_condensed -> @dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `two_column_item_highlight_card_horizontal_padding` | `12dp` | `12dp` | - |
| `two_column_item_highlight_card_image_size` | `64dp` | `64dp` | - |
| `two_column_item_highlight_card_vertical_padding` | `12dp` | `12dp` | - |
| `two_column_item_horizontal_padding` | `16dp` | `16dp` | - |
| `two_column_item_image_size` | `@dimen/yt_sys_measurement_size_legend` | `@dimen/yt_sys_measurement_size_legend -> @dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `two_column_item_list_index_width` | `@dimen/yt_sys_measurement_size_comfortable` | `@dimen/yt_sys_measurement_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `two_column_item_size_extra_large` | `64dp` | `64dp` | - |
| `two_column_item_size_large` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `two_column_item_vertical_padding` | `8dp` | `8dp` | - |
| `two_row_item_corner_avatar_height` | `@dimen/yt_sys_measurement_avatar_size_condensed` | `@dimen/yt_sys_measurement_avatar_size_condensed -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `two_row_item_corner_avatar_width` | `@dimen/yt_sys_measurement_avatar_size_condensed` | `@dimen/yt_sys_measurement_avatar_size_condensed -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `two_row_item_footer_button_min_width` | `108dp` | `108dp` | - |
| `two_row_item_subtitle_container_margin_top` | `2dp` | `2dp` | - |
| `two_row_item_text_spacing` | `2dp` | `2dp` | - |
| `two_row_item_thumbnail_corner_radius` | `@dimen/yt_sys_measurement_radius_condensed` | `@dimen/yt_sys_measurement_radius_condensed -> @dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `two_row_item_thumbnail_height` | `155dp` | `155dp` | - |
| `visual_header_foreground_image_bottom_margin` | `12dp` | `12dp` | - |
| `visual_header_foreground_image_size` | `140dp` | `140dp` | - |
| `visual_header_landscape_image_height` | `370dp` | `370dp` | - |
| `visual_header_spacing_large` | `16dp` | `16dp` | - |
| `visual_header_spacing_side` | `32dp` | `32dp` | - |
| `visual_header_spacing_small` | `8dp` | `8dp` | - |
| `visual_header_specialty_button_min_width` | `136dp` | `136dp` | - |
| `visual_header_tablet_image_height` | `360dp` | `360dp` | - |
| `visual_header_title_large` | `60sp` | `60sp` | - |
| `visual_header_title_medium` | `42sp` | `42sp` | - |
| `visual_header_title_small` | `30sp` | `30sp` | - |
| `watch_fragment_bottom_padding` | `22dp` | `22dp` | - |
| `watch_fragment_corner_radius_maximized_large` | `@dimen/yt_sys_measurement_radius_cozy` | `@dimen/yt_sys_measurement_radius_cozy -> @dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `watch_fragment_corner_radius_maximized_medium` | `6dp` | `6dp` | - |
| `watch_fragment_corner_radius_minimized` | `@dimen/yt_sys_measurement_radius_min` | `@dimen/yt_sys_measurement_radius_min -> @dimen/yt_ref_dimension_size2 -> 2dp` | - |
| `watch_fragment_padding_bottom` | `32dp` | `32dp` | - |
| `watch_fragment_padding_bottom_medium` | `24dp` | `24dp` | - |
| `watch_fragment_padding_top` | `32dp` | `32dp` | - |
| `watch_fragment_padding_top_small` | `16dp` | `16dp` | - |
| `watch_while_mini_player_error_icon_size` | `@dimen/yt_sys_measurement_icon_size_comfortable` | `@dimen/yt_sys_measurement_icon_size_comfortable -> @dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `watch_while_mini_player_height_short_stack` | `@dimen/yt_sys_measurement_size_huge` | `@dimen/yt_sys_measurement_size_huge -> @dimen/yt_ref_dimension_size56 -> 56dp` | sw600dp=72dp |
| `youtube_sans_font_letter_spacing` | `-0.04` | `-0.04` | - |
| `yt_ref_dimension_size0` | `0dp` | `0dp` | - |
| `yt_ref_dimension_size0_5` | `0.5dp` | `0.5dp` | - |
| `yt_ref_dimension_size1` | `1dp` | `1dp` | - |
| `yt_ref_dimension_size1024` | `1024dp` | `1024dp` | - |
| `yt_ref_dimension_size12` | `12dp` | `12dp` | - |
| `yt_ref_dimension_size120` | `120dp` | `120dp` | - |
| `yt_ref_dimension_size144` | `144dp` | `144dp` | - |
| `yt_ref_dimension_size16` | `16dp` | `16dp` | - |
| `yt_ref_dimension_size160` | `160dp` | `160dp` | - |
| `yt_ref_dimension_size18` | `18dp` | `18dp` | - |
| `yt_ref_dimension_size2` | `2dp` | `2dp` | - |
| `yt_ref_dimension_size20` | `20dp` | `20dp` | - |
| `yt_ref_dimension_size24` | `24dp` | `24dp` | - |
| `yt_ref_dimension_size32` | `32dp` | `32dp` | - |
| `yt_ref_dimension_size36` | `36dp` | `36dp` | - |
| `yt_ref_dimension_size4` | `4dp` | `4dp` | - |
| `yt_ref_dimension_size40` | `40dp` | `40dp` | - |
| `yt_ref_dimension_size48` | `48dp` | `48dp` | - |
| `yt_ref_dimension_size56` | `56dp` | `56dp` | - |
| `yt_ref_dimension_size6` | `6dp` | `6dp` | - |
| `yt_ref_dimension_size600` | `600dp` | `600dp` | - |
| `yt_ref_dimension_size64` | `64dp` | `64dp` | - |
| `yt_ref_dimension_size72` | `72dp` | `72dp` | - |
| `yt_ref_dimension_size8` | `8dp` | `8dp` | - |
| `yt_ref_dimension_size840` | `840dp` | `840dp` | - |
| `yt_sys_measurement_action_height_compact` | `@dimen/yt_ref_dimension_size32` | `@dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `yt_sys_measurement_action_height_prominent` | `@dimen/yt_ref_dimension_size48` | `@dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `yt_sys_measurement_action_height_tiny` | `@dimen/yt_ref_dimension_size24` | `@dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `yt_sys_measurement_avatar_size_comfortable` | `@dimen/yt_ref_dimension_size40` | `@dimen/yt_ref_dimension_size40 -> 40dp` | - |
| `yt_sys_measurement_avatar_size_compact` | `@dimen/yt_ref_dimension_size32` | `@dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `yt_sys_measurement_avatar_size_condensed` | `@dimen/yt_ref_dimension_size24` | `@dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `yt_sys_measurement_avatar_size_cozy` | `@dimen/yt_ref_dimension_size36` | `@dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `yt_sys_measurement_avatar_size_expanded` | `@dimen/yt_ref_dimension_size48` | `@dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `yt_sys_measurement_avatar_size_hero` | `@dimen/yt_ref_dimension_size72` | `@dimen/yt_ref_dimension_size72 -> 72dp` | - |
| `yt_sys_measurement_default_action_height_standard` | `@dimen/yt_ref_dimension_size36` | `@dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `yt_sys_measurement_icon_size_comfortable` | `@dimen/yt_ref_dimension_size24` | `@dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `yt_sys_measurement_icon_size_compact` | `@dimen/yt_ref_dimension_size18` | `@dimen/yt_ref_dimension_size18 -> 18dp` | - |
| `yt_sys_measurement_icon_size_condensed` | `@dimen/yt_ref_dimension_size16` | `@dimen/yt_ref_dimension_size16 -> 16dp` | - |
| `yt_sys_measurement_icon_size_cozy` | `@dimen/yt_ref_dimension_size20` | `@dimen/yt_ref_dimension_size20 -> 20dp` | - |
| `yt_sys_measurement_icon_size_expanded` | `@dimen/yt_ref_dimension_size36` | `@dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `yt_sys_measurement_icon_size_hero` | `@dimen/yt_ref_dimension_size48` | `@dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `yt_sys_measurement_icon_size_mini` | `@dimen/yt_ref_dimension_size12` | `@dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `yt_sys_measurement_icon_size_prominent` | `@dimen/yt_ref_dimension_size40` | `@dimen/yt_ref_dimension_size40 -> 40dp` | - |
| `yt_sys_measurement_radius_comfortable` | `@dimen/yt_ref_dimension_size16` | `@dimen/yt_ref_dimension_size16 -> 16dp` | - |
| `yt_sys_measurement_radius_compact` | `@dimen/yt_ref_dimension_size8` | `@dimen/yt_ref_dimension_size8 -> 8dp` | - |
| `yt_sys_measurement_radius_condensed` | `@dimen/yt_ref_dimension_size4` | `@dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `yt_sys_measurement_radius_cozy` | `@dimen/yt_ref_dimension_size12` | `@dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `yt_sys_measurement_radius_expanded` | `@dimen/yt_ref_dimension_size18` | `@dimen/yt_ref_dimension_size18 -> 18dp` | - |
| `yt_sys_measurement_radius_hero` | `@dimen/yt_ref_dimension_size24` | `@dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `yt_sys_measurement_radius_huge` | `@dimen/yt_ref_dimension_size32` | `@dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `yt_sys_measurement_radius_min` | `@dimen/yt_ref_dimension_size2` | `@dimen/yt_ref_dimension_size2 -> 2dp` | - |
| `yt_sys_measurement_radius_prominent` | `@dimen/yt_ref_dimension_size20` | `@dimen/yt_ref_dimension_size20 -> 20dp` | - |
| `yt_sys_measurement_size_comfortable` | `@dimen/yt_ref_dimension_size24` | `@dimen/yt_ref_dimension_size24 -> 24dp` | - |
| `yt_sys_measurement_size_compact` | `@dimen/yt_ref_dimension_size16` | `@dimen/yt_ref_dimension_size16 -> 16dp` | - |
| `yt_sys_measurement_size_condensed` | `@dimen/yt_ref_dimension_size12` | `@dimen/yt_ref_dimension_size12 -> 12dp` | - |
| `yt_sys_measurement_size_cozy` | `@dimen/yt_ref_dimension_size18` | `@dimen/yt_ref_dimension_size18 -> 18dp` | - |
| `yt_sys_measurement_size_expanded` | `@dimen/yt_ref_dimension_size32` | `@dimen/yt_ref_dimension_size32 -> 32dp` | - |
| `yt_sys_measurement_size_hairline` | `@dimen/yt_ref_dimension_size1` | `@dimen/yt_ref_dimension_size1 -> 1dp` | - |
| `yt_sys_measurement_size_hero` | `@dimen/yt_ref_dimension_size40` | `@dimen/yt_ref_dimension_size40 -> 40dp` | - |
| `yt_sys_measurement_size_huge` | `@dimen/yt_ref_dimension_size56` | `@dimen/yt_ref_dimension_size56 -> 56dp` | - |
| `yt_sys_measurement_size_legend` | `@dimen/yt_ref_dimension_size48` | `@dimen/yt_ref_dimension_size48 -> 48dp` | - |
| `yt_sys_measurement_size_min` | `@dimen/yt_ref_dimension_size4` | `@dimen/yt_ref_dimension_size4 -> 4dp` | - |
| `yt_sys_measurement_size_mini` | `@dimen/yt_ref_dimension_size8` | `@dimen/yt_ref_dimension_size8 -> 8dp` | - |
| `yt_sys_measurement_size_prominent` | `@dimen/yt_ref_dimension_size36` | `@dimen/yt_ref_dimension_size36 -> 36dp` | - |
| `yt_sys_measurement_size_tiny` | `@dimen/yt_ref_dimension_size6` | `@dimen/yt_ref_dimension_size6 -> 6dp` | - |
| `yt_sys_measurement_stroke_comfortable` | `@dimen/yt_ref_dimension_size1` | `@dimen/yt_ref_dimension_size1 -> 1dp` | - |
| `yt_sys_measurement_stroke_expanded` | `@dimen/yt_ref_dimension_size2` | `@dimen/yt_ref_dimension_size2 -> 2dp` | - |
| `ytm_body_01_size` | `14sp` | `14sp` | - |
| `ytm_body_03_size` | `14sp` | `14sp` | - |
| `ytm_body_04_size` | `14sp` | `14sp` | - |
| `ytm_button_01_size` | `14sp` | `14sp` | - |
| `ytm_caption_02_size` | `12sp` | `12sp` | - |
| `ytm_caption_03_size` | `10sp` | `10sp` | - |
| `ytm_display_01_size` | `28sp` | `28sp` | - |
| `ytm_subtitle_01_size` | `14sp` | `14sp` | - |
| `ytm_text_label_02_size` | `10sp` | `10sp` | - |
| `ytm_title_02_size` | `14sp` | `14sp` | - |
| `ytm_title_03_size` | `18sp` | `18sp` | - |

### 4.6 Key UI Strings & `split_config.en.apk` Notes

- `base.apk` provides the default English string table (`res/values/strings.xml`, `125,381` B); `split_config.en.apk` adds regional English overrides (`values-en-rGB`: `1,388` strings, `values-en-rIN`: `701`, `values-en-rAU`: `84`, `values-en-rCA`: `81`, plus `rXA`/`rXC` pseudolocales).
- Key UI strings observed in `base.apk`: `audio_video_switcher_toggle_song_text="Song"`, `audio_video_switcher_toggle_video_text="Video"`, `search_hint_songs_artists_podcasts="Search songs, artists, podcasts"`, `search_ask_button_label="Ask"`, `default_playback_rate_button_text="1x"`, `live_label="LIVE"`, `live_badge_text="Live"`, `accessibility_collapse="Minimize"` (`en-rGB`: `"Minimise"`), `accessibility_context_menu="Menu"`, `accessibility_music_shuffle="Shuffle"`, `accessibility_music_repeat="Repeat"`, `accessibility_previous_track_enabled="Previous track"`, `accessibility_next_track_enabled="Next track"`, `accessibility_rewind="Rewind 10 seconds"`, `accessibility_fast_forward_30_seconds="Fast forward 30 seconds"`, `accessibility_playback_rate="Set Playback Speed"`, `drag_handle_content_description="Drag to move"`.

---

## 5. Exact Vector Drawable Paths (`res/drawable*/`)

Extracted **94** vector drawables from `base.apk` with exact `width`/`height`, `viewportWidth`/`viewportHeight`, `fillColor`/`fillType`/`tint`, and verbatim `pathData`.

### 5.1 Navigation & Brand Icons

| Drawable | Size (`w x h`) | Viewport (`vw x vh`) | Path Attributes | `pathData` |
|---|---|---|---|---|
| `yt_fill_compass_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M11.23,13.08c-0.29,-0.21 -0.48,-0.51 -0.54,-0.86c-0.06,-0.35 0.02,-0.71 0.23,-0.99c0.21,-0.29 0.51,-0.48 0.86,-0.54c0.35,-0.06 0.7,0.02 0.99,0.23c0.29,0.21 0.48,0.51 0.54,0.86c0.06,0.35 -0.02,0.71 -0.23,0.99c-0.21,0.29 -0.51,0.48 -0.86,0.54c-0.07,0.01 -0.15,0.02 -0.22,0.02C11.72,13.33 11.45,13.25 11.23,13.08zM22,12c0,5.52 -4.48,10 -10,10S2,17.52 2,12C2,6.48 6.48,2 12,2S22,6.48 22,12zM18.03,5.97L9.8,9.8l-3.83,8.23l8.23,-3.83L18.03,5.97z` |
| `yt_fill_experimental_compass_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1C5.925,1 1,5.925 1,12s4.925,11 11,11 11,-4.925 11,-11S18.075,1 12,1ZM16.962,6.997a1,1 0,0 1,0.261 0.967l-1.812,6.762a1,1 0,0 1,-0.703 0.706L8.007,17.26a1,1 0,0 1,-1.23 -1.224l1.812,-6.762a1,1 0,0 1,0.703 -0.706l6.701,-1.828a1,1 0,0 1,0.969 0.257ZM10.551,11.611a1.5,1.5 0,0 0,2.199 1.69,1.503 1.503,0 0,0 0.7,-0.911 1.501,1.501 0,1 0,-2.899 -0.779Z` |
| `yt_fill_experimental_home_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `m11.485,2.143 l-8,4.8 -2,1.2a1,1 0,0 0,1.03 1.714L3,9.567V20a2,2 0,0 0,2 2h5v-8h4v8h5a2,2 0,0 0,2 -2V9.567l0.485,0.29a1,1 0,0 0,1.03 -1.714l-2,-1.2 -8,-4.8a1,1 0,0 0,-1.03 0Z` |
| `yt_fill_experimental_play_circle_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1C5.925,1 1,5.925 1,12s4.925,11 11,11 11,-4.925 11,-11S18.075,1 12,1ZM9,16.8V7.2l8,4.8 -8,4.8Z` |
| `yt_fill_experimental_samples_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M9.756,5.463a1,1 0,0 0,0.308 1.381L19.737,13l-9.674,6.156a1,1 0,0 0,1.074 1.688l11,-7L23.463,13l-1.327,-0.844 -11,-7a1,1 0,0 0,-1.38 0.307ZM2,6.198v13.603a1.2,1.2 0,0 0,1.849 1.01L16,13.001 3.849,5.187A1.2,1.2 0,0 0,2 6.198Z` |
| `yt_fill_experimental_youtube_music_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1C5.925,1 1,5.925 1,12s4.925,11 11,11 11,-4.925 11,-11S18.075,1 12,1ZM12,4.5a7.5,7.5 0,1 1,0 15,7.5 7.5,0 0,1 0,-15ZM12,6a6,6 0,1 0,0 12,6 6,0 0,0 0,-12ZM10,15L10,9l5,3 -5,3Z` |
| `yt_fill_home_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M4,21V10.08l8,-6.96l8,6.96V21h-6v-6h-4v6H4z` |
| `yt_fill_library_music_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M18,21H3V6h1v14h14V21zM21,3v15H6V3H21zM16,6h-3v5.28C12.7,11.11 12.37,11 12,11c-1.1,0 -2,0.9 -2,2s0.9,2 2,2s2,-0.9 2,-2V8h2V6z` |
| `yt_fill_samples_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M3,21V3l14.45,9L3,21zM10,4.25v1.18L20.55,12L10,18.57v1.18L22.45,12L10,4.25z` |
| `yt_fill_youtube_music_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,2A10,10 0,1 0,22 12,10 10,0 0,0 12,2ZM12,18a6,6 0,1 1,6 -6A6,6 0,0 1,12 18ZM12,7a5,5 0,1 0,5 5A5,5 0,0 0,12 7ZM10,14.65L10,9.35L15,12Z` |
| `yt_outline_compass_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M9.8,9.8l-3.83,8.23l8.23,-3.83l3.83,-8.23L9.8,9.8zM13.08,12.77c-0.21,0.29 -0.51,0.48 -0.86,0.54c-0.07,0.01 -0.15,0.02 -0.22,0.02c-0.28,0 -0.54,-0.08 -0.77,-0.25c-0.29,-0.21 -0.48,-0.51 -0.54,-0.86c-0.06,-0.35 0.02,-0.71 0.23,-0.99c0.21,-0.29 0.51,-0.48 0.86,-0.54c0.35,-0.06 0.7,0.02 0.99,0.23c0.29,0.21 0.48,0.51 0.54,0.86C13.37,12.13 13.29,12.48 13.08,12.77zM12,3c4.96,0 9,4.04 9,9s-4.04,9 -9,9s-9,-4.04 -9,-9S7.04,3 12,3M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10s10,-4.48 10,-10S17.52,2 12,2L12,2z` |
| `yt_outline_experimental_compass_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1C5.925,1 1,5.925 1,12s4.925,11 11,11 11,-4.925 11,-11S18.075,1 12,1ZM12,3a9,9 0,1 1,0 18.001A9,9 0,0 1,12 3ZM15.73,5.775L9.028,7.604a2,2 0,0 0,-1.405 1.412l-1.811,6.76a2,2 0,0 0,2.458 2.448l6.701,-1.828a2,2 0,0 0,1.406 -1.412l1.812,-6.761a2.001,2.001 0,0 0,-2.459 -2.448ZM9.555,9.533l6.702,-1.828 -1.812,6.762 -6.702,1.826 1.812,-6.76ZM10.793,11.676a1.25,1.25 0,1 0,2.415 0.647,1.25 1.25,0 0,0 -2.415,-0.647Z` |
| `yt_outline_experimental_home_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `m11.485,2.143 l-8,4.8 -2,1.2a1,1 0,0 0,1.03 1.714L3,9.567V20a2,2 0,0 0,2 2h6v-7h2v7h6a2,2 0,0 0,2 -2V9.567l0.485,0.29a1,1 0,0 0,1.03 -1.714l-2,-1.2 -8,-4.8a1,1 0,0 0,-1.03 0ZM5,8.366l7,-4.2 7,4.2V20h-4v-5.5a1.5,1.5 0,0 0,-1.5 -1.5h-3A1.5,1.5 0,0 0,9 14.5V20H5V8.366Z` |
| `yt_outline_experimental_play_circle_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1a11,11 0,0 0,-7.778 18.778A11.002,11.002 0,0 0,22.163 7.79,11 11,0 0,0 12,1ZM12,3a9,9 0,0 1,6.364 2.636A9,9 0,0 1,5.636 18.364,9.001 9.001,0 0,1 12,3ZM17,12L9,7.2v9.6l8,-4.8Z` |
| `yt_outline_experimental_samples_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M9.756,5.463a1,1 0,0 0,0.308 1.381L19.737,13l-9.674,6.156a1,1 0,0 0,1.074 1.688l11,-7L23.463,13l-1.327,-0.844 -11,-7a1,1 0,0 0,-1.38 0.307ZM2,6.198v13.603a1.2,1.2 0,0 0,1.85 1.01l10.3,-6.623L16,13l-1.85,-1.188L3.849,5.188A1.2,1.2 0,0 0,2 6.198ZM4,18.338L4,7.662L12.302,13 4,18.338Z` |
| `yt_outline_experimental_youtube_music_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1C5.925,1 1,5.925 1,12s4.925,11 11,11 11,-4.925 11,-11S18.075,1 12,1ZM12,3a9,9 0,1 1,0 18.001A9,9 0,0 1,12 3ZM12,5.5a6.5,6.5 0,1 0,0 13,6.5 6.5,0 0,0 0,-13ZM12,7a5,5 0,1 1,0 10,5 5,0 0,1 0,-10ZM15,12 L10,9v6l5,-3Z` |
| `yt_outline_home_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,4.44l7,6.09V20h-4v-5v-1h-1h-4H9v1v5H5v-9.47L12,4.44M12,3.12l-8,6.96V21h6v-6h4v6h6V10.08L12,3.12L12,3.12z` |
| `yt_outline_library_music_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M16,6v2h-2v5c0,1.1 -0.9,2 -2,2s-2,-0.9 -2,-2s0.9,-2 2,-2c0.37,0 0.7,0.11 1,0.28V6H16zM18,20H4V6H3v15h15V20zM21,3H6v15h15V3zM7,4h13v13H7V4z` |
| `yt_outline_samples_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M3,21V3l14.45,9L3,21zM4,4.8V19.2L15.55,12L4,4.8zM10,4.25v1.18L20.55,12L10,18.57v1.18L22.45,12L10,4.25z` |
| `yt_outline_youtube_music_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M10,9.35L15,12l-5,2.65zM12,7a5,5 0,1 0,5 5,5 5,0 0,0 -5,-5m0,-1a6,6 0,1 1,-6 6,6 6,0 0,1 6,-6zM12,3a9,9 0,1 0,9 9,9 9,0 0,0 -9,-9m0,-1A10,10 0,1 1,2 12,10 10,0 0,1 12,2z` |

### 5.2 Search, Top Chrome & Chevrons

| Drawable | Size (`w x h`) | Viewport (`vw x vh`) | Path Attributes | `pathData` |
|---|---|---|---|---|
| `yt_fill_experimental_chromecast_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21,3a2,2 0,0 1,2 2v14a2,2 0,0 1,-2 2h-7a13.265,13.265 0,0 0,-0.153 -2L21,19L21,5L3,5v3.153A13,13 0,0 0,1 8L1,5a2,2 0,0 1,2 -2h18ZM19,17L19,7L5,7v1.627A13.031,13.031 0,0 1,13.373 17L19,17ZM1,10v2a9,9 0,0 1,9 9h2A11,11 0,0 0,1 10ZM1,14v2a5,5 0,0 1,5 5h2a7,7 0,0 0,-7 -7ZM1,18v3h3a3.003,3.003 0,0 0,-3 -3Z` |
| `yt_fill_experimental_search_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M11,2a9,9 0,0 1,9 9,8.96 8.96,0 0,1 -1.99,5.64 1,1 0,0 1,0.197 0.153l3.5,3.5a1,1 0,1 1,-1.414 1.414l-3.5,-3.5a1,1 0,0 1,-0.152 -0.197A8.96,8.96 0,0 1,11 20a9,9 0,1 1,0 -18ZM11,4a7,7 0,1 0,0 14,7 7,0 0,0 0,-14ZM11,6a5,5 0,1 1,0 10,5 5,0 0,1 0,-10Z` |
| `yt_fill_experimental_spark_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,2c0.39,0 0.71,0.303 0.763,0.69a10.001,10.001 0,0 0,8.547 8.533c0.386,0.052 0.69,0.372 0.69,0.762s-0.304,0.71 -0.69,0.763a10,10 0,0 0,-8.551 8.565A0.78,0.78 0,0 1,12 22a0.78,0.78 0,0 1,-0.759 -0.688,10.002 10.002,0 0,0 -8.552,-8.565 0.784,0.784 0,0 1,-0.689 -0.763c0,-0.39 0.303,-0.709 0.69,-0.761a10.002,10.002 0,0 0,8.547 -8.534A0.784,0.784 0,0 1,12 2Z` |
| `yt_fill_spark_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,22C12,20.617 11.733,19.317 11.2,18.1C10.683,16.883 9.975,15.825 9.075,14.925C8.175,14.025 7.117,13.317 5.9,12.8C4.683,12.267 3.383,12 2,12C3.383,12 4.683,11.742 5.9,11.225C7.117,10.692 8.175,9.975 9.075,9.075C9.975,8.175 10.683,7.117 11.2,5.9C11.733,4.683 12,3.383 12,2C12,3.383 12.258,4.683 12.775,5.9C13.308,7.117 14.025,8.175 14.925,9.075C15.825,9.975 16.883,10.692 18.1,11.225C19.317,11.742 20.617,12 22,12C20.617,12 19.317,12.267 18.1,12.8C16.883,13.317 15.825,14.025 14.925,14.925C14.025,15.825 13.308,16.883 12.775,18.1C12.258,19.317 12,20.617 12,22Z` |
| `yt_fill_waveform_music_vd_theme_18` | `18dp x 18dp` | `18 x 18` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M10,3a1,1 0,1 1,2 0v12a1,1 0,1 1,-2 0L10,3ZM7,5.002a1,1 0,0 0,-1 1v6a1,1 0,1 0,2 0v-6a1,1 0,0 0,-1 -1ZM3,7a1,1 0,0 0,-1 1v2a1,1 0,1 0,2 0L4,8a1,1 0,0 0,-1 -1ZM15,5.998a1,1 0,0 0,-1 1v4a1,1 0,0 0,2 0v-4a1,1 0,0 0,-1 -1Z` |
| `yt_outline_arrow_left_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21,11v1H5.64l6.72,6.72l-0.71,0.71L3.72,11.5l7.92,-7.92l0.71,0.71L5.64,11H21z` |
| `yt_outline_bars_2_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21,10H3V9H21V10ZM21,14H3V15H21V14Z` |
| `yt_outline_chromecast_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M22,20h-8v-1h7V5H3v3H2V4h20V20zM2,17.32V20h2.73C4.73,18.52 3.51,17.32 2,17.32zM2,13.75v1.79c2.51,0 4.55,2 4.55,4.46h1.82C8.36,16.55 5.52,13.75 2,13.75zM2,10.18v1.79c4.52,0 8.18,3.6 8.18,8.03H12C12,14.57 7.52,10.18 2,10.18z` |
| `yt_outline_experimental_arrow_left_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M10.293,4.293 L2.586,12l7.707,7.706a1,1 0,1 0,1.414 -1.413L6.414,13H20a1,1 0,0 0,0 -2H6.414l5.293,-5.292a1,1 0,0 0,-1.414 -1.415Z` |
| `yt_outline_experimental_bell_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M16,19a4,4 0,1 1,-8 0L4.765,19C3.21,19 2.25,17.304 3.05,15.97l1.806,-3.01A1,1 0,0 0,5 12.446L5,8a7,7 0,0 1,14 0v4.446c0,0.181 0.05,0.36 0.142,0.515l1.807,3.01c0.8,1.333 -0.161,3.029 -1.716,3.029L16,19ZM12,3a5,5 0,0 0,-5 5v4.446a3,3 0,0 1,-0.428 1.543L4.765,17h14.468l-1.805,-3.01A3,3 0,0 1,17 12.445L17,8a5,5 0,0 0,-5 -5ZM10,19a2,2 0,1 0,4 0h-4Z` |
| `yt_outline_experimental_chevron_down_vd_theme_18` | `18dp x 18dp` | `18 x 18` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M14.03,6.595a0.75,0.75 0,0 0,-1.004 -0.052l-0.056,0.052L9,10.565l-3.97,-3.97a0.75,0.75 0,1 0,-1.06 1.06L9,12.685l5.03,-5.03 0.052,-0.056a0.75,0.75 0,0 0,-0.052 -1.004Z` |
| `yt_outline_experimental_chevron_down_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M18.707,8.793a1,1 0,0 0,-1.414 0L12,14.086 6.707,8.793a1,1 0,1 0,-1.414 1.414L12,16.914l6.707,-6.707a1,1 0,0 0,0 -1.414Z` |
| `yt_outline_experimental_chevron_right_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M8.793,5.293a1,1 0,0 0,0 1.414L14.086,12l-5.293,5.293a1,1 0,1 0,1.414 1.414L16.914,12l-6.707,-6.707a1,1 0,0 0,-1.414 0Z` |
| `yt_outline_experimental_chevron_up_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M5.293,15.207a1,1 0,0 0,1.414 0L12,9.914l5.293,5.293a1,1 0,1 0,1.414 -1.414L12,7.086l-6.707,6.707a1,1 0,0 0,0 1.414Z` |
| `yt_outline_experimental_chromecast_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21,3L3,3a2,2 0,0 0,-2 2v3c0.67,0 1.337,0.051 2,0.153L3,5h18v14h-7.153c0.1,0.653 0.152,1.32 0.153,2h7a2,2 0,0 0,2 -2L23,5a2,2 0,0 0,-2 -2ZM1,10v2a9,9 0,0 1,9 9h2A11,11 0,0 0,1 10ZM1,14v2a5,5 0,0 1,5 5h2a7,7 0,0 0,-7 -7ZM1,18v3h3a3.003,3.003 0,0 0,-3 -3Z` |
| `yt_outline_experimental_gear_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12.844,1h-1.687a2,2 0,0 0,-1.962 1.616,3 3,0 0,1 -3.92,2.263 2,2 0,0 0,-2.38 0.891l-0.842,1.46a2,2 0,0 0,0.417 2.507,3 3,0 0,1 0,4.525 2,2 0,0 0,-0.417 2.507l0.843,1.46a2,2 0,0 0,2.38 0.892,3.001 3.001,0 0,1 3.918,2.263A2,2 0,0 0,11.157 23h1.686a2,2 0,0 0,1.963 -1.615,3.002 3.002,0 0,1 3.92,-2.263 2,2 0,0 0,2.38 -0.892l0.842,-1.46a2,2 0,0 0,-0.418 -2.507,3 3,0 0,1 0,-4.526 2,2 0,0 0,0.418 -2.508l-0.843,-1.46a2,2 0,0 0,-2.38 -0.891,3 3,0 0,1 -3.919,-2.263A2,2 0,0 0,12.844 1ZM11.077,3.347a6,6 0,0 0,0.08 -0.347h1.687a4.98,4.98 0,0 0,2.407 3.37,4.98 4.98,0 0,0 4.122,0.4l0.843,1.46A4.98,4.98 0,0 0,18.5 12a4.98,4.98 0,0 0,1.716 3.77l-0.843,1.46a4.98,4.98 0,0 0,-4.123 0.4A4.979,4.979 0,0 0,12.843 21h-1.686a4.98,4.98 0,0 0,-2.408 -3.371,4.999 4.999,0 0,0 -4.12,-0.399l-0.844,-1.46A4.979,4.979 0,0 0,5.5 12a4.98,4.98 0,0 0,-1.715 -3.77l0.842,-1.459a4.98,4.98 0,0 0,4.123 -0.399,4.981 4.981,0 0,0 2.327,-3.025ZM16,12a4,4 0,1 1,-7.999 0,4 4,0 0,1 8,0ZM12,14a2,2 0,1 0,0 -4,2 2,0 0,0 0,4Z` |
| `yt_outline_experimental_mic_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M18.063,14.5a1,1 0,1 1,1.73 1A8.998,8.998 0,0 1,13 19.942V22a1,1 0,1 1,-2 0v-2.058A8.999,8.999 0,0 1,4.206 15.5l0.866,-0.5 0.865,-0.5a7.002,7.002 0,0 0,12.125 0ZM12,1a5,5 0,0 1,5 5v5a5,5 0,0 1,-10 0V6a5,5 0,0 1,5 -5ZM4.572,14.134a1,1 0,0 1,1.365 0.366l-1.731,1a1,1 0,0 1,0.366 -1.366ZM12,3a3,3 0,0 0,-3 3v5a3,3 0,1 0,6 0V6a3,3 0,0 0,-3 -3Z` |
| `yt_outline_experimental_mix_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M18.364,4.222a1,1 0,0 1,1.414 0,11 11,0 0,1 0,15.556 1,1 0,0 1,-1.414 -1.414,9.001 9.001,0 0,0 0,-12.728 1,1 0,0 1,0 -1.414ZM4.222,4.219a1,1 0,0 1,1.414 1.414,9.001 9.001,0 0,0 0,12.728 1,1 0,0 1,-1.414 1.414,11.002 11.002,0 0,1 0,-15.556ZM15.535,7.054c0.39,-0.39 1.025,-0.39 1.415,0a7,7 0,0 1,0 9.9,1.001 1.001,0 0,1 -1.415,-1.415 5,5 0,0 0,0 -7.07,1.001 1.001,0 0,1 0,-1.415ZM7.05,7.05a1.001,1.001 0,0 1,1.415 1.415,5 5,0 0,0 0,7.07A1.001,1.001 0,0 1,7.05 16.95a7.002,7.002 0,0 1,0 -9.9ZM15,12l-5,3L10,9l5,3Z` |
| `yt_outline_experimental_overflow_vertical_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,4a2,2 0,1 0,0 4,2 2,0 0,0 0,-4ZM12,10a2,2 0,1 0,0 4,2 2,0 0,0 0,-4ZM12,16a2,2 0,1 0,0 4,2 2,0 0,0 0,-4Z` |
| `yt_outline_experimental_search_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M11,2a9,9 0,1 0,5.641 16.01,0.966 0.966,0 0,0 0.152,0.197l3.5,3.5a1,1 0,1 0,1.414 -1.414l-3.5,-3.5a1,1 0,0 0,-0.197 -0.153A8.96,8.96 0,0 0,20 11a9,9 0,0 0,-9 -9ZM11,4a7,7 0,1 1,0 14,7 7,0 0,1 0,-14Z` |
| `yt_outline_experimental_waveform_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M14,3a1,1 0,0 0,-1 1v16a1,1 0,0 0,2 0L15,4a1,1 0,0 0,-1 -1ZM8,7v10a1,1 0,1 0,2 0L10,7a1,1 0,0 0,-2 0ZM19,9a1,1 0,0 0,-1 1v4a1,1 0,0 0,2 0v-4a1,1 0,0 0,-1 -1ZM4,10a1,1 0,0 0,-1 1v2a1,1 0,1 0,2 0v-2a1,1 0,0 0,-1 -1Z` |
| `yt_outline_experimental_x_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M17.293,5.293 L12,10.586 6.707,5.293a1,1 0,1 0,-1.414 1.414L10.586,12l-5.293,5.293a1,1 0,0 0,1.414 1.414L12,13.414l5.293,5.293a1,1 0,0 0,1.414 -1.414L13.414,12l5.293,-5.293a1,1 0,1 0,-1.414 -1.414Z` |
| `yt_outline_mic_off_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M15,6.07C15,4.37 13.66,3 12,3c-1.47,0 -2.69,1.08 -2.95,2.52L15,11.46V6.07zM20.15,20.85L16.2,16.9c-0.89,0.77 -1.98,1.32 -3.2,1.51V21h-2v-2.59C7.89,17.93 5.5,15.24 5.5,12h1c0,3.03 2.47,5.5 5.5,5.5c1.34,0 2.55,-0.5 3.5,-1.29l-1.78,-1.78C13.23,14.78 12.65,15 12,15c-1.66,0 -3,-1.37 -3,-3.07V9.71L3.15,3.85l0.71,-0.71l17,17L20.15,20.85zM18.5,12h-1c0,0.59 -0.1,1.16 -0.27,1.69L18,14.46C18.31,13.7 18.5,12.87 18.5,12z` |
| `yt_outline_mic_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,3c-1.66,0 -3,1.37 -3,3.07v5.86c0,1.7 1.34,3.07 3,3.07s3,-1.37 3,-3.07V6.07C15,4.37 13.66,3 12,3L12,3zM18.5,12h-1c0,3.03 -2.47,5.5 -5.5,5.5S6.5,15.03 6.5,12h-1c0,3.24 2.39,5.93 5.5,6.41V21h2v-2.59C16.11,17.93 18.5,15.24 18.5,12z` |
| `yt_outline_overflow_vertical_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,16.5c0.83,0 1.5,0.67 1.5,1.5s-0.67,1.5 -1.5,1.5s-1.5,-0.67 -1.5,-1.5S11.17,16.5 12,16.5zM10.5,12c0,0.83 0.67,1.5 1.5,1.5s1.5,-0.67 1.5,-1.5s-0.67,-1.5 -1.5,-1.5S10.5,11.17 10.5,12zM10.5,6c0,0.83 0.67,1.5 1.5,1.5s1.5,-0.67 1.5,-1.5S12.83,4.5 12,4.5S10.5,5.17 10.5,6z` |
| `yt_outline_search_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white, fillType=evenOdd; tint=?attr/colorControlNormal` | `M16.296,16.996a8,8 0,1 1,0.707 -0.708l3.909,3.91l-0.707,0.707l-3.909,-3.909zM18,11a7,7 0,0 0,-14 0a7,7 0,1 0,14 0z` |
| `yt_outline_x_mark_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12.71,12l8.15,8.15l-0.71,0.71L12,12.71l-8.15,8.15l-0.71,-0.71L11.29,12L3.15,3.85l0.71,-0.71L12,11.29l8.15,-8.15l0.71,0.71L12.71,12z` |

### 5.3 Player & Playback Controls

| Drawable | Size (`w x h`) | Viewport (`vw x vh`) | Path Attributes | `pathData` |
|---|---|---|---|---|
| `yt_fill_experimental_headset_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,3a9,9 0,0 0,-9 9v7a2,2 0,0 0,2 2h2a2,2 0,0 0,2 -2v-4a2,2 0,0 0,-2 -2H5v-1a7,7 0,1 1,14 0v1h-2a2,2 0,0 0,-2 2v4a2,2 0,0 0,2 2h2a2,2 0,0 0,2 -2v-7a9,9 0,0 0,-9 -9Z` |
| `yt_fill_experimental_pause_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M6.5,3A1.5,1.5 0,0 0,5 4.5v15A1.5,1.5 0,0 0,6.5 21h2a1.5,1.5 0,0 0,1.5 -1.5v-15A1.5,1.5 0,0 0,8.5 3h-2ZM15.5,3A1.5,1.5 0,0 0,14 4.5v15a1.5,1.5 0,0 0,1.5 1.5h2a1.5,1.5 0,0 0,1.5 -1.5v-15A1.5,1.5 0,0 0,17.5 3h-2Z` |
| `yt_fill_experimental_pause_vd_theme_36` | `36dp x 36dp` | `36 x 36` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12.75,4.5h-3A2.25,2.25 0,0 0,7.5 6.75v22.5a2.25,2.25 0,0 0,2.25 2.25h3A2.25,2.25 0,0 0,15 29.25L15,6.75a2.25,2.25 0,0 0,-2.25 -2.25ZM26.25,4.5h-3A2.25,2.25 0,0 0,21 6.75v22.5a2.25,2.25 0,0 0,2.25 2.25h3a2.25,2.25 0,0 0,2.25 -2.25L28.5,6.75a2.25,2.25 0,0 0,-2.25 -2.25Z` |
| `yt_fill_experimental_play_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M5,4.623V19.38a1.5,1.5 0,0 0,2.26 1.29L22,12 7.26,3.33A1.5,1.5 0,0 0,5 4.623Z` |
| `yt_fill_experimental_play_vd_theme_36` | `36dp x 36dp` | `36 x 36` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M7.5,6.934v22.132c0,1.74 1.89,2.822 3.39,1.94L33,18 10.89,4.995c-1.5,-0.883 -3.39,0.198 -3.39,1.939Z` |
| `yt_fill_experimental_skip_next_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M20,20a1,1 0,0 0,1 -1L21,5a1,1 0,0 0,-2 0v14a1,1 0,0 0,1 1ZM5.045,19.774L18,12 5.045,4.228A1.35,1.35 0,0 0,3 5.386v13.23a1.35,1.35 0,0 0,2.045 1.158Z` |
| `yt_fill_experimental_skip_next_vd_theme_36` | `36dp x 36dp` | `36 x 36` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M7.566,29.661 L27,18.002 7.566,6.342c-1.35,-0.81 -3.066,0.162 -3.066,1.736v19.847c0,1.574 1.717,2.546 3.066,1.736ZM30,30a1.5,1.5 0,0 0,1.5 -1.5v-21a1.5,1.5 0,1 0,-3 0v21A1.5,1.5 0,0 0,30 30Z` |
| `yt_fill_experimental_skip_previous_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M4,4a1,1 0,0 0,-1 1v14a1,1 0,1 0,2 0L5,5a1,1 0,0 0,-1 -1ZM18.955,4.23L6,12.003l12.955,7.772A1.35,1.35 0,0 0,21 18.617L21,5.387a1.35,1.35 0,0 0,-2.045 -1.157Z` |
| `yt_fill_experimental_skip_previous_vd_theme_36` | `36dp x 36dp` | `36 x 36` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M28.434,6.345 L9,18.005l19.434,11.66c1.35,0.809 3.066,-0.163 3.066,-1.737V8.08c0,-1.574 -1.717,-2.545 -3.066,-1.735ZM6,6a1.5,1.5 0,0 0,-1.5 1.5v21a1.5,1.5 0,0 0,3 0v-21A1.5,1.5 0,0 0,6 6Z` |
| `yt_fill_experimental_video_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21,3H3a2,2 0,0 0,-2 2v14a2,2 0,0 0,2 2h18a2,2 0,0 0,2 -2V5a2,2 0,0 0,-2 -2ZM9.5,16V8l6.5,4 -6.5,4Z` |
| `yt_fill_pause_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M9,19H7V5H9ZM17,5H15V19h2Z` |
| `yt_outline_arrow_shuffle_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M18.15,13.65l3.85,3.85l-3.85,3.85l-0.71,-0.71L20.09,18H19c-2.84,0 -5.53,-1.23 -7.39,-3.38l0.76,-0.65C14.03,15.89 16.45,17 19,17h1.09l-2.65,-2.65L18.15,13.65zM19,7h1.09l-2.65,2.65l0.71,0.71l3.85,-3.85l-3.85,-3.85l-0.71,0.71L20.09,6H19c-3.58,0 -6.86,1.95 -8.57,5.09l-0.73,1.34C8.16,15.25 5.21,17 2,17v1c3.58,0 6.86,-1.95 8.57,-5.09l0.73,-1.34C12.84,8.75 15.79,7 19,7zM8.59,9.98l0.75,-0.66C7.49,7.21 4.81,6 2,6v1C4.52,7 6.92,8.09 8.59,9.98z` |
| `yt_outline_experimental_play_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M5,4.623v14.755a1.5,1.5 0,0 0,2.261 1.294l12.766,-7.51L22,12.002l-1.973,-1.162L7.26,3.33A1.5,1.5 0,0 0,5 4.623ZM7,18.503L7,5.497L18.056,12 7,18.503Z` |
| `yt_outline_experimental_repeat1_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M17.293,1.293a1,1 0,0 0,0 1.415L18.586,4L7,4a5,5 0,0 0,-5 5v4a1,1 0,1 0,2 0L4,9a3,3 0,0 1,3 -3h11.586l-1.293,1.293a1,1 0,0 0,1.414 1.415L22.414,5l-3.707,-3.707a1,1 0,0 0,-1.414 0ZM13,15L13,8h-2.5a1,1 0,0 0,0 2h0.5v5a1,1 0,0 0,2 0ZM21,10a1,1 0,0 0,-1 1v4a3,3 0,0 1,-3 3L5.414,18l1.293,-1.292a1.001,1.001 0,0 0,-1.414 -1.415L1.586,19l3.707,3.707a1,1 0,1 0,1.414 -1.413L5.414,20L17,20a5,5 0,0 0,5 -5v-4a1,1 0,0 0,-1 -1Z` |
| `yt_outline_experimental_repeat_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M17.293,1.293a1,1 0,0 0,0 1.415L18.586,4H7a5,5 0,0 0,-5 5v4a1,1 0,1 0,2 0V9a3,3 0,0 1,3 -3h11.586l-1.293,1.293a1,1 0,0 0,1.414 1.415L22.414,5l-3.707,-3.707a1,1 0,0 0,-1.414 0ZM21,10a1,1 0,0 0,-1 1v4a3,3 0,0 1,-3 3H5.414l1.293,-1.292a1.001,1.001 0,0 0,-1.414 -1.415L1.586,19l3.707,3.707a1,1 0,1 0,1.414 -1.413L5.414,20H17a5,5 0,0 0,5 -5v-4a1,1 0,0 0,-1 -1Z` |
| `yt_outline_experimental_replay_vd_theme_36` | `36dp x 36dp` | `36 x 36` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M11.294,2.925a16.5,16.5 0,1 1,-9.413 18.6l1.466,-0.32 1.465,-0.32A13.5,13.5 0,1 0,6.776 10.5H10.5a1.5,1.5 0,1 1,0 3h-9v-9l0.008,-0.153a1.5,1.5 0,0 1,2.984 0L4.5,4.5v4.015a16.5,16.5 0,0 1,6.794 -5.59ZM24,18l-9,-5.25v10.5L24,18ZM3.025,19.738a1.5,1.5 0,0 0,-1.144 1.787l2.931,-0.64a1.502,1.502 0,0 0,-1.787 -1.147Z` |
| `yt_outline_experimental_shuffle_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M16.293,1.293a1,1 0,0 0,-0.001 1.415L18.585,5L17.21,5a7,7 0,0 0,-5.823 3.118L6.95,14.774A5,5 0,0 1,2.79 17L2,17a1,1 0,0 0,0 2h0.79a7,7 0,0 0,5.822 -3.117l4.438,-6.656A5,5 0,0 1,17.21 7h1.376l-2.293,2.293a1,1 0,0 0,1.414 1.414L22.414,6l-4.707,-4.707a1,1 0,0 0,-1.414 0ZM2.789,5L2,5a1,1 0,0 0,0 2h0.79a5,5 0,0 1,4.159 2.227l0.647,0.97 1.202,-1.802 -0.185,-0.277A7,7 0,0 0,2.789 5ZM16.293,13.293a1,1 0,0 0,-0.001 1.414L18.585,17L17.21,17a5,5 0,0 1,-4.16 -2.226l-0.648,-0.972 -1.202,1.803 0.186,0.278A7,7 0,0 0,17.21 19h1.376l-2.293,2.294 -0.068,0.076a1,1 0,0 0,1.406 1.406l0.076,-0.07L22.414,18l-4.707,-4.707a1,1 0,0 0,-1.414 0Z` |
| `yt_outline_experimental_skip10_back_vd_theme_36` | `36dp x 36dp` | `36 x 36` | `p0: default; p1: fill=@android:color/white; tint=?attr/colorControlNormal` | `M0,0h36v36H0z` <br> `M6.44,0.44a1.5,1.5 0,1 1,2.12 2.12L6.622,4.5L19.5,4.5a15,15 0,1 1,0 30,1.5 1.5,0 1,1 0,-3 12,12 0,0 0,0 -24L6.62,7.5l1.94,1.94 0.104,0.114a1.5,1.5 0,0 1,-2.11 2.11l-0.115,-0.104L0.879,6 6.44,0.44ZM20.25,13.125a3.75,3.75 0,0 0,-3.75 3.75v5.25a3.75,3.75 0,0 0,7.5 0v-5.25a3.75,3.75 0,0 0,-3.75 -3.75ZM15,24.375L15,13.5h-3.375a1.125,1.125 0,1 0,0 2.25h1.125v8.625a1.125,1.125 0,1 0,2.25 0ZM20.25,15.375a1.5,1.5 0,0 1,1.5 1.5v5.25a1.5,1.5 0,1 1,-3 0v-5.25a1.5,1.5 0,0 1,1.5 -1.5Z` |
| `yt_outline_experimental_skip30_forward_vd_theme_36` | `36dp x 36dp` | `36 x 36` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M27.44,0.44a1.5,1.5 0,0 0,0 2.12l1.939,1.94L16.5,4.5a15,15 0,0 0,0 30,1.5 1.5,0 1,0 0,-3 12,12 0,0 1,0 -24h12.879l-1.94,1.94 -0.103,0.114a1.5,1.5 0,0 0,2.11 2.11l0.114,-0.104L35.122,6 29.561,0.44a1.5,1.5 0,0 0,-2.122 0m-4.19,12.685a3.75,3.75 0,0 0,-3.75 3.75v5.25a3.75,3.75 0,0 0,7.5 0v-5.25a3.75,3.75 0,0 0,-3.75 -3.75ZM14.438,13.125h-0.387a3.84,3.84 0,0 0,-3.433 2.122,1.124 1.124,0 1,0 2.012,1.006 1.59,1.59 0,0 1,1.42 -0.878h0.387a1.312,1.312 0,0 1,0.216 2.604l-0.12,0.02L13.5,17.999a1.125,1.125 0,1 0,0 2.25h1.048l0.129,0.02a1.687,1.687 0,0 1,-0.239 3.356h-0.2a1.89,1.89 0,0 1,-1.69 -1.044l-0.292,-0.584 -0.057,-0.1a1.126,1.126 0,0 0,-1.955 1.106l0.292,0.585a4.14,4.14 0,0 0,3.701 2.287h0.201a3.937,3.937 0,0 0,2.667 -6.832,3.556 3.556,0 0,0 -1.304,-5.647 3.56,3.56 0,0 0,-1.363 -0.271ZM23.249,15.375a1.5,1.5 0,0 1,1.5 1.5v5.25a1.5,1.5 0,1 1,-3 0v-5.25a1.5,1.5 0,0 1,1.5 -1.5Z` |
| `yt_outline_experimental_sleep_timer_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12.335,1.005A11.989,11.989 0,0 0,12 1C5.925,1 1,5.925 1,12s4.925,11 11,11a11,11 0,0 0,9.643 -5.704c0.422,-0.765 -0.429,-1.557 -1.29,-1.41a8,8 0,0 1,-7.458 -13.055c0.564,-0.666 0.313,-1.8 -0.56,-1.826ZM15.568,2.604a1,1 0,0 0,0.449 1.341,9 9,0 0,1 2.72,2.087 1,1 0,0 0,1.497 -1.326,11 11,0 0,0 -3.325,-2.55 1,1 0,0 0,-1.341 0.448ZM10.241,3.172A9.96,9.96 0,0 0,9 8c0,5.426 4.323,9.844 9.711,9.996a9,9 0,1 1,-8.47 -14.824ZM21.17,7.886a1,1 0,0 0,-0.632 1.264,9 9,0 0,1 0.446,3.4 1,1 0,1 0,1.997 0.122c0.085,-1.407 -0.1,-2.817 -0.546,-4.154a1,1 0,0 0,-1.265 -0.632Z` |
| `yt_outline_experimental_video_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21,3L3,3a2,2 0,0 0,-2 2v14a2,2 0,0 0,2 2h18a2,2 0,0 0,2 -2L23,5a2,2 0,0 0,-2 -2ZM3,19L3,5h18v14L3,19ZM16,12L9.5,8v8l6.5,-4Z` |

### 5.4 Action Bar, Queue, Lyrics & Menu Icons

| Drawable | Size (`w x h`) | Viewport (`vw x vh`) | Path Attributes | `pathData` |
|---|---|---|---|---|
| `yt_fill_downloaded_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,2C6.5,2 2,6.5 2,12c0,5.5 4.5,10 10,10s10,-4.5 10,-10C22,6.5 17.5,2 12,2zM9.8,16.9l-3.3,-3.3l1.4,-1.4l1.9,1.9l6.3,-6.3l1.4,1.4L9.8,16.9z` |
| `yt_fill_experimental_explicit_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M20,2H4a2,2 0,0 0,-2 2v16a2,2 0,0 0,2 2h16a2,2 0,0 0,2 -2V4a2,2 0,0 0,-2 -2ZM8,6h8a1,1 0,1 1,0 2H9v3h5a1,1 0,0 1,0 2H9v3h7a1,1 0,0 1,0 2H8a1,1 0,0 1,-1 -1V7a1,1 0,0 1,1 -1Z` |
| `yt_fill_experimental_pin_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21.007,6.298 L11.7,0.924a0.85,0.85 0,0 0,-0.85 1.47l0.736,0.425 -3.394,5.878 -1.718,0.46a1.5,1.5 0,0 0,-0.91 0.698l-1.012,1.753a0.75,0.75 0,0 0,0.274 1.024l9.479,5.473a0.75,0.75 0,0 0,1.024 -0.275l1.01,-1.752a1.5,1.5 0,0 0,0.15 -1.14l-0.46,-1.715 3.395,-5.88 0.734,0.425a0.85,0.85 0,0 0,0.849 -1.47ZM7.15,21.814l3.395,-5.88 -1.96,-1.13 -3.393,5.88 -0.152,2.524 2.11,-1.394Z` |
| `yt_fill_experimental_thumb_down_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M11.313,2.002c2.088,0 4.14,0.546 5.953,1.583l0.273,0.156a2,2 0,0 0,0.993 0.264H21a1,1 0,0 1,1 1V11a1,1 0,0 1,-1.002 1l-2.787,-0.005a1,1 0,0 0,-0.946 0.67l-3.02,8.628a0.815,0.815 0,0 1,-0.966 0.522,3.262 3.262,0 0,1 -2.35,-4.062l0.707,-2.477a1,1 0,0 0,-0.961 -1.274h-5.29a2.24,2.24 0,0 1,-2.004 -1.238l-0.18,-0.359a1.784,1.784 0,0 1,0.601 -2.278,0.446 0.446,0 0,0 0.198,-0.37v-0.07a0.578,0.578 0,0 0,-0.116 -0.347,2.374 2.374,0 0,1 0.412,-3.278l0.498,-0.399a0.379,0.379 0,0 0,0.123 -0.415l-0.07,-0.207a2.1,2.1 0,0 1,0.313 -1.923A2.798,2.798 0,0 1,7.4 2l3.913,0.002Z` |
| `yt_fill_experimental_thumb_up_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M10.72,2.18a3.263,3.263 0,0 1,2.352 4.063l-0.708,2.476a1,1 0,0 0,0.962 1.275h5.29c0.848,0 1.624,0.48 2.003,1.238l0.179,0.359a1.785,1.785 0,0 1,-0.6 2.279,0.446 0.446,0 0,0 -0.198,0.37v0.07c0,0.124 0.041,0.246 0.116,0.346a2.375,2.375 0,0 1,-0.41 3.278l-0.5,0.399a0.38,0.38 0,0 0,-0.123 0.416l0.07,0.206c0.217,0.653 0.1,1.372 -0.313,1.923a2.8,2.8 0,0 1,-2.24 1.12l-3.914,-0.002a12,12 0,0 1,-5.952 -1.584l-0.272,-0.155a2.002,2.002 0,0 0,-0.993 -0.265H3a1,1 0,0 1,-1 -1v-5.996a1,1 0,0 1,1.002 -1L5.789,12a1,1 0,0 0,0.945 -0.67l3.02,-8.628a0.816,0.816 0,0 1,0.967 -0.523Z` |
| `yt_fill_share_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M14,9V3l8,9l-8,9v-6c-5.56,0 -9.22,2.03 -12,6C3.11,15.33 6.22,10.13 14,9z` |
| `yt_outline_experimental_add_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,3a1,1 0,0 0,-1 1v7H4a1,1 0,0 0,0 2h7v7a1,1 0,0 0,2 0v-7h7a1,1 0,0 0,0 -2h-7V4a1,1 0,0 0,-1 -1Z` |
| `yt_outline_experimental_album_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1C5.925,1 1,5.925 1,12s4.925,11 11,11 11,-4.925 11,-11S18.075,1 12,1ZM12,3a9,9 0,1 1,0 18.001A9,9 0,0 1,12 3ZM16.242,7.051a0.5,0.5 0,0 0,0 0.707,6 6,0 0,1 1.553,2.69 0.5,0.5 0,0 0,0.967 -0.26,7 7,0 0,0 -1.813,-3.137 0.5,0.5 0,0 0,-0.707 0ZM14.828,8.465a0.5,0.5 0,0 0,0 0.707,4 4,0 0,1 1.035,1.793 0.5,0.5 0,1 0,0.966 -0.259,5 5,0 0,0 -1.294,-2.241 0.5,0.5 0,0 0,-0.707 0ZM12,9a3,3 0,1 0,0 6,3 3,0 0,0 0,-6ZM12,11a1,1 0,1 1,0 2,1 1,0 0,1 0,-2ZM7.523,12.682a0.5,0.5 0,0 0,-0.353 0.612,5 5,0 0,0 1.294,2.242 0.501,0.501 0,0 0,0.708 -0.708,4 4,0 0,1 -1.036,-1.793 0.5,0.5 0,0 0,-0.613 -0.353ZM5.592,13.2a0.496,0.496 0,0 0,-0.354 0.612A7,7 0,0 0,7.05 16.95a0.5,0.5 0,1 0,0.707 -0.707,6 6,0 0,1 -1.553,-2.69 0.5,0.5 0,0 0,-0.612 -0.353Z` |
| `yt_outline_experimental_alert_circle_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1C5.925,1 1,5.925 1,12s4.925,11 11,11 11,-4.925 11,-11S18.075,1 12,1ZM12,3a9,9 0,1 1,0 18.001A9,9 0,0 1,12 3ZM12,6a1,1 0,0 0,-1 1v5.5a1,1 0,0 0,2 0L13,7a1,1 0,0 0,-1 -1ZM12,14.75a1.25,1.25 0,1 0,0 2.5,1.25 1.25,0 0,0 0,-2.5Z` |
| `yt_outline_experimental_arrow_down_circle_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1C5.925,1 1,5.925 1,12s4.925,11 11,11 11,-4.925 11,-11S18.075,1 12,1ZM12,3a9,9 0,1 1,0 18.001A9,9 0,0 1,12 3ZM12,6a1,1 0,0 0,-1 1v7.586l-2.293,-2.293a1,1 0,1 0,-1.414 1.414L12,18.414l4.707,-4.707a1,1 0,1 0,-1.414 -1.414L13,14.586L13,7a1,1 0,0 0,-1 -1Z` |
| `yt_outline_experimental_bubble_stack_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M16,2L4,2a3,3 0,0 0,-3 3v8a3,3 0,0 0,3 3h1v2.14a0.8,0.8 0,0 0,1.188 0.7L11.3,16L16,16a3,3 0,0 0,3 -3L19,5a3,3 0,0 0,-3 -3ZM4,4h12a1,1 0,0 1,1 1v8a1,1 0,0 1,-1 1h-5.218l-0.452,0.252L7,16.1L7,14L4,14a1,1 0,0 1,-1 -1L3,5a1,1 0,0 1,1 -1ZM21,6.174A3,3 0,0 1,23 9v8a3,3 0,0 1,-2.846 2.996L20,20v2.14a0.8,0.8 0,0 1,-1.189 0.7L13.701,20L8.216,20l3.6,-2h2.402l0.453,0.252L18,20.101L18,18.05l1.95,-0.05 0.113,-0.003A1,1 0,0 0,21 17L21,6.174Z` |
| `yt_outline_experimental_check_circle_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,1C5.925,1 1,5.925 1,12s4.925,11 11,11 11,-4.925 11,-11S18.075,1 12,1ZM12,3a9,9 0,1 1,0 18.001A9,9 0,0 1,12 3ZM16.293,8.293L10,14.586l-2.293,-2.293a1,1 0,1 0,-1.414 1.414L10,17.414l7.707,-7.707a1,1 0,1 0,-1.414 -1.414Z` |
| `yt_outline_experimental_check_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M19.793,5.793 L8.5,17.086l-4.293,-4.293a1,1 0,1 0,-1.414 1.414L8.5,19.914 21.207,7.207a1,1 0,1 0,-1.414 -1.414Z` |
| `yt_outline_experimental_download_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,2a1,1 0,0 0,-1 1v11.586l-4.293,-4.293a1,1 0,1 0,-1.414 1.414L12,18.414l6.707,-6.707a1,1 0,1 0,-1.414 -1.414L13,14.586L13,3a1,1 0,0 0,-1 -1ZM19,20L5,20a1,1 0,0 0,0 2h14a1,1 0,0 0,0 -2Z` |
| `yt_outline_experimental_person_audio_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M12,2a5,5 0,1 0,0 10,5 5,0 0,0 0,-10ZM12,4a3,3 0,1 1,0 6,3 3,0 0,1 0,-6ZM19,12.888v4.286a3,3 0,1 0,1.996 2.98L21,20v-4.301l2.614,1.57A0.255,0.255 0,0 0,24 17.05v-1.743a0.5,0.5 0,0 0,-0.241 -0.428l-4,-2.42a0.5,0.5 0,0 0,-0.759 0.429ZM12,13a8,8 0,0 0,-8 8,1 1,0 1,0 2,0 6,6 0,0 1,9.121 -5.122l1.444,-1.444A8,8 0,0 0,12 13ZM18,19a1,1 0,1 1,0 2,1 1,0 0,1 0,-2Z` |
| `yt_outline_experimental_pin_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21.007,6.298 L11.7,0.924l-0.077,-0.04a0.85,0.85 0,0 0,-0.772 1.51l0.735,0.425 -3.394,5.878 -1.718,0.46a1.5,1.5 0,0 0,-0.91 0.698l-1.012,1.753a0.75,0.75 0,0 0,0.274 1.024l9.479,5.473a0.75,0.75 0,0 0,1.024 -0.275l1.01,-1.752a1.501,1.501 0,0 0,0.15 -1.14l-0.46,-1.715 3.395,-5.88 0.734,0.425a0.85,0.85 0,0 0,0.849 -1.47ZM9.924,9.698 L13.167,4.081 17.54,6.606 14.298,12.222a2,2 0,0 0,-0.2 1.518l0.407,1.517 -0.283,0.49 -7.313,-4.22 0.283,-0.49 1.518,-0.41a2,2 0,0 0,1.214 -0.93ZM7.15,21.814l3.395,-5.88 -1.96,-1.13 -3.393,5.879 -0.152,2.525 2.11,-1.394Z` |
| `yt_outline_experimental_playlist_add_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M19,15a1,1 0,0 1,1 1v2h2a1,1 0,1 1,0 2h-2v2a1,1 0,1 1,-2 0v-2h-2a1,1 0,1 1,0 -2h2v-2a1,1 0,0 1,1 -1ZM13,19L4,19a1,1 0,1 1,0 -2h9v2ZM20,11a1,1 0,1 1,0 2L4,13a1,1 0,1 1,0 -2h16ZM20,5a1,1 0,1 1,0 2L4,7a1,1 0,0 1,0 -2h16Z` |
| `yt_outline_experimental_queue_last_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21,6.998a1,1 0,1 0,0 -2L9,4.998a1,1 0,0 0,0 2h12ZM6,21.138a0.5,0.5 0,0 0,0.748 0.434L13,18l-6.252,-3.573A0.5,0.5 0,0 0,6 14.86L6,17L4,17L4,6a1,1 0,0 0,-2 0v12a1,1 0,0 0,1 1h3v2.138ZM21,12.998a1,1 0,0 0,0 -2L9,10.998a1,1 0,0 0,0 2h12ZM21,18.998a1,1 0,0 0,0 -2h-5a1,1 0,0 0,0 2h5Z` |
| `yt_outline_experimental_queue_next_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M6,2.86L6,5L3,5a1,1 0,0 0,-1 1v12a1,1 0,1 0,2 0L4,7h2v2.137a0.5,0.5 0,0 0,0.748 0.434L13,5.998 6.748,2.426A0.5,0.5 0,0 0,6 2.86ZM21,5h-5a1,1 0,1 0,0 2h5a1,1 0,1 0,0 -2ZM21,11L9,11a1,1 0,0 0,0 2h12a1,1 0,0 0,0 -2ZM21,17L9,17a1,1 0,0 0,0 2h12a1,1 0,0 0,0 -2Z` |
| `yt_outline_experimental_queue_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M2,2.864v6.277a0.5,0.5 0,0 0,0.748 0.434L9,6.002 2.748,2.43A0.5,0.5 0,0 0,2 2.864ZM21,5h-9a1,1 0,1 0,0 2h9a1,1 0,1 0,0 -2ZM21,11L9,11a1,1 0,0 0,0 2h12a1,1 0,0 0,0 -2ZM21,17L9,17a1,1 0,0 0,0 2h12a1,1 0,0 0,0 -2Z` |
| `yt_outline_experimental_share_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M10,3.158L10,7.51c-5.428,0.223 -8.27,3.75 -8.875,11.199 -0.04,0.487 -0.07,0.975 -0.09,1.464l-0.014,0.395c-0.014,0.473 0.578,0.684 0.88,0.32 0.302,-0.368 0.61,-0.73 0.925,-1.086l0.244,-0.273c1.79,-1.967 3,-2.677 4.93,-2.917a18.011,18.011 0,0 1,2 -0.112v4.346a1,1 0,0 0,1.646 0.763l9.805,-8.297 1.55,-1.31 -1.55,-1.31 -9.805,-8.297A1,1 0,0 0,10 3.158ZM12,9.428v0.002,-4.116l7.904,6.688L12,18.689v-4.212l-2.023,0.024c-1.935,0.022 -3.587,0.17 -5.197,1.024a9,9 0,0 0,-1.348 0.893c0.355,-1.947 0.916,-3.39 1.63,-4.425 1.062,-1.541 2.607,-2.385 5.02,-2.485L12,9.428Z` |
| `yt_outline_experimental_sort_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M21,5L3,5a1,1 0,0 0,0 2h18a1,1 0,1 0,0 -2ZM15,11L3,11a1,1 0,0 0,0 2h12a1,1 0,0 0,0 -2ZM9,17L3,17a1,1 0,0 0,0 2h6a1,1 0,0 0,0 -2Z` |
| `yt_outline_experimental_thumb_down_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `m11.31,2 l0.392,0.007c1.824,0.06 3.61,0.534 5.223,1.388l0.343,0.189 0.27,0.154c0.264,0.152 0.56,0.24 0.863,0.26l0.13,0.004H20.5a1.5,1.5 0,0 1,1.5 1.5V11.5a1.5,1.5 0,0 1,-1.5 1.5h-1.79l-0.158,0.013a1,1 0,0 0,-0.723 0.512l-0.064,0.145 -2.987,8.535a1,1 0,0 1,-1.109 0.656l-1.04,-0.174a4,4 0,0 1,-3.251 -4.783L10,15H5.938a3.664,3.664 0,0 1,-3.576 -2.868A3.682,3.682 0,0 1,3 9.15l-0.02,-0.088A3.816,3.816 0,0 1,4 5.5v-0.043l0.008,-0.227a2.86,2.86 0,0 1,0.136 -0.664l0.107,-0.28A3.754,3.754 0,0 1,7.705 2h3.605ZM7.705,4c-0.755,0 -1.425,0.483 -1.663,1.2l-0.032,0.126a0.818,0.818 0,0 0,-0.01 0.131v0.872l-0.587,0.586a1.816,1.816 0,0 0,-0.524 1.465l0.038,0.23 0.02,0.087 0.21,0.9 -0.55,0.744a1.686,1.686 0,0 0,-0.321 1.18l0.029,0.177c0.17,0.76 0.844,1.302 1.623,1.302H10a2.002,2.002 0,0 1,1.956 2.419l-0.623,2.904 -0.034,0.208a2.002,2.002 0,0 0,1.454 2.139l0.206,0.045 0.21,0.035 2.708,-7.741A3.001,3.001 0,0 1,18.71 11H20V6.002h-1.47c-0.696,0 -1.38,-0.183 -1.985,-0.528l-0.27,-0.155 -0.285,-0.157A10.002,10.002 0,0 0,11.31 4H7.705Z` |
| `yt_outline_experimental_thumb_up_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M9.221,1.795a1,1 0,0 1,1.109 -0.656l1.04,0.173a4,4 0,0 1,3.252 4.784L14,9h4.061a3.664,3.664 0,0 1,3.576 2.868A3.68,3.68 0,0 1,21 14.85l0.02,0.087A3.815,3.815 0,0 1,20 18.5v0.043l-0.01,0.227a2.82,2.82 0,0 1,-0.135 0.663l-0.106,0.282A3.754,3.754 0,0 1,16.295 22h-3.606l-0.392,-0.007a12.002,12.002 0,0 1,-5.223 -1.388l-0.343,-0.189 -0.27,-0.154a2.005,2.005 0,0 0,-0.863 -0.26l-0.13,-0.004L3.5,19.998a1.5,1.5 0,0 1,-1.5 -1.5L2,12.5A1.5,1.5 0,0 1,3.5 11h1.79l0.157,-0.013a1,1 0,0 0,0.724 -0.512l0.063,-0.145 2.987,-8.535ZM8.121,10.991A3,3 0,0 1,5.29 13L4,13v4.998h1.468a4,4 0,0 1,1.986 0.528l0.27,0.155 0.285,0.157A10,10 0,0 0,12.69 20h3.606c0.754,0 1.424,-0.483 1.663,-1.2l0.03,-0.126a0.819,0.819 0,0 0,0.012 -0.131v-0.872l0.587,-0.586c0.388,-0.388 0.577,-0.927 0.523,-1.465l-0.038,-0.23 -0.02,-0.087 -0.21,-0.9 0.55,-0.744A1.663,1.663 0,0 0,18.061 11L14,11a2.002,2.002 0,0 1,-1.956 -2.418l0.623,-2.904a2,2 0,0 0,-1.626 -2.392l-0.21,-0.035 -2.71,7.741Z` |
| `yt_outline_experimental_translate_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M10,2.5a1,1 0,0 0,-2 0L8,4L2,4a1,1 0,0 0,0 2h9.925c-0.204,1.334 -0.833,2.627 -1.975,4.15 -0.287,0.382 -0.603,0.777 -0.95,1.184 -0.328,-0.385 -0.645,-0.78 -0.95,-1.184C7.478,9.387 7.035,8.682 6.709,8h-2.17c0.415,1.125 1.06,2.216 1.911,3.35 0.361,0.48 0.763,0.977 1.206,1.49 -1.196,1.285 -2.645,2.735 -4.363,4.453a1,1 0,1 0,1.414 1.414l0.057,-0.057C6.38,17.036 7.795,15.619 9,14.33c0.748,0.8 1.577,1.65 2.485,2.565l0.846,-1.99a105.74,105.74 0,0 1,-1.987 -2.066c0.443,-0.512 0.845,-1.008 1.206,-1.489 1.342,-1.79 2.175,-3.474 2.393,-5.35L16,6a1,1 0,1 0,0 -2h-6L10,2.5ZM16.33,10.609 L12.08,20.609a1,1 0,1 0,1.84 0.782L14.937,19h5.126l1.017,2.391a1,1 0,1 0,1.84 -0.782l-4.25,-10a1,1 0,0 0,-0.92 -0.609h-0.5a1,1 0,0 0,-0.92 0.609ZM17.5,12.969L19.213,17h-3.426l1.713,-4.031Z` |
| `yt_outline_radar_live_vd_theme_24` | `24dp x 24dp` | `24 x 24` | `p0: fill=@android:color/white; tint=?attr/colorControlNormal` | `M14,12c0,1.1 -0.9,2 -2,2s-2,-0.9 -2,-2s0.9,-2 2,-2S14,10.9 14,12zM8.48,8.45L7.77,7.75C6.68,8.83 6,10.34 6,12s0.68,3.17 1.77,4.25l0.71,-0.71C7.57,14.64 7,13.39 7,12S7.57,9.36 8.48,8.45zM16.23,7.75l-0.71,0.71C16.43,9.36 17,10.61 17,12s-0.57,2.64 -1.48,3.55l0.71,0.71C17.32,15.17 18,13.66 18,12S17.32,8.83 16.23,7.75zM5.65,5.63L4.95,4.92C3.13,6.73 2,9.24 2,12s1.13,5.27 2.95,7.08l0.71,-0.71C4.02,16.74 3,14.49 3,12S4.02,7.26 5.65,5.63zM19.05,4.92l-0.71,0.71C19.98,7.26 21,9.51 21,12s-1.02,4.74 -2.65,6.37l0.71,0.71C20.87,17.27 22,14.76 22,12S20.87,6.73 19.05,4.92z` |
