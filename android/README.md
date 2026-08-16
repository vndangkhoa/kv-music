# KV Music (Android)

A native Android client for a self-hosted music streaming server (WebM/M4A stream endpoints). Written in Kotlin with Jetpack Compose (Material 3), Media3/ExoPlayer, Room, DataStore, Retrofit and Coil. Dark theme with brand orange accent (`#ff5500`) on `#121212`.

## How it works

- The app talks to your own music server via a REST API: `/api/search`, `/api/playlist/{id}`, `/api/stream/{id}`, `/api/download/{id}?fmt=...`, `/api/auth/...`, etc.
- On first launch, open **Settings → "MÁY CHỦ"** and enter your server host (e.g. `http://192.168.1.10:5000`). The host is persisted in DataStore and can be changed at any time.
- Streaming uses WebM by default; a `fmt=m4a` fallback is available for players/devices that do not support WebM.
- Optional pairing: generate a pair code in Settings and confirm it on the server to authenticate the device.

## Build requirements

- JDK 17 (`/home/x1/tools/jdk17` in this workspace, or any JDK 17+)
- Android SDK with `platforms;android-35` and `build-tools;35.0.0` — `local.properties` already points to `/home/x1/Android/Sdk`
- Gradle 8.9 (system install or the checked-in wrapper)

## Build

```bash
cd android
export JAVA_HOME=/home/x1/tools/jdk17
export ANDROID_HOME=/home/x1/Android/Sdk
./gradlew :app:assembleDebug        # wrapper
# or
/home/x1/tools/gradle/bin/gradle :app:assembleDebug
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`. The first build downloads dependencies (~500 MB, can take 10–20 minutes).

## Release build

```bash
./gradlew :app:assembleRelease
```

The release APK is signed with the debug key by default so it stays installable. To sign with a real key, create a `keystore.properties` file next to the project's build files (`android/`) with `keyAlias`, `keyPassword`, `storeFile` and `storePassword`, and point `storeFile` at your keystore. Keep `local.properties` and `keystore.properties` out of version control.

## Install

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

or open the project in Android Studio and press Run.

## Architecture

```
com.kvmusic.app
├── data/
│   ├── model/      JSON DTOs and domain models (Track, Artist, Playlist, …)
│   ├── remote/     Retrofit ApiService + ApiClient (base URL, stream/download URL helpers), LRC parser
│   ├── local/      Room database (LibraryDb), DataStore (ServerConfigStore), seed data
│   └── repository/ MusicRepository, AuthRepository, LibraryRepository (single access points for the UI)
├── player/         PlayerController (ExoPlayer + StateFlow<PlayerUiState>) and PlaybackService (foreground playback)
├── ui/
│   ├── theme/      Color / Type / Theme (dark theme, KvOrange accent)
│   ├── components/ CoverImage, ArtistAvatar, TrackRow, Skeleton, SectionHeader, KvBottomSheet, KvToastHost, Waveform, LyricsView
│   ├── navigation/ AppNavHost + Routes (playlist/album/artist/section/track deep routes)
│   ├── screens/    13 screens (Home, Feed, Search, Library, Charts, Artists, Profile, Collection, Album, Playlist, Artist, Section, Track)
│   ├── player/     MobileMiniBar, FullPlayerSheet, QueueSheet, LyricsSheet
│   ├── auth/       LoginSheet (login/register/pair-code)
│   ├── settings/   SettingsSheet (server host, quality, country, cache, logout)
│   ├── library/    AddToPlaylistSheet, CreatePlaylistSheet
│   ├── video/      VideoPlayerScreen (video mode)
│   ├── AppRoot.kt  Theme + navigation + overlays (toasts, sheets)
│   └── AppUi.kt    Global UI state (which sheet is open, Toaster)
└── util/           Formatters, Downloader, Share
```

- UI state flows: repositories expose `Flow`s / `StateFlow`s; screens collect them with `collectAsStateWithLifecycle`.
- Playback: `PlayerController` wraps an ExoPlayer instance and exposes `state: StateFlow<PlayerUiState>` plus `progress`; the mini bar and full-player sheet observe the same controller.
- Room stores liked tracks, saved albums, followed artists, playlists and playback history locally so the library works fast; server writes are mirrored to the API.

## API notes

- Streams default to WebM (`/api/stream/{id}`). If playback fails on a device, request `?fmt=m4a` — see `ApiClient.streamUrl(id, fmt)`.
- Downloads go through `/api/download/{id}?fmt=m4a` and are written to the app's external files directory (see `util/Downloader.kt`).

## Troubleshooting

- **Cannot connect to server** — the app allows cleartext HTTP (`android:usesCleartextTraffic="true"`); make sure the phone and server are on the same network and the URL in Settings → "MÁY CHỦ" is reachable from the device.
- **Emulator** — the host machine is `10.0.2.2` (e.g. `http://10.0.2.2:5000`), not `localhost`.
- **No playback notifications** — the app requests `POST_NOTIFICATIONS` at runtime on Android 13+; grant it in app settings.
- **WebM audio doesn't play on some devices** — switch the stream format to m4a (quality/format option in Settings, or the server-side `fmt` param).
- **First build is slow** — Gradle is downloading dependencies; subsequent builds are incremental.
- **App data is not backed up to Google** — `android:allowBackup="false"` means the Room database and DataStore (including your server host and auth token) are never uploaded to the cloud; uninstalling or wiping app data clears them.
- **Changing the server host logs you out of the previous server** — the auth token is tied to the server it was issued by, so switch back to the previous host to reuse that session.
