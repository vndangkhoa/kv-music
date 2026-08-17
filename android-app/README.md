# KV Music - Native Android Phone Application

A native Android streaming player application for **KV Music**, inspired by **SoundCloud**. Built with Kotlin, Jetpack Compose, Material 3, AndroidX Media3 (ExoPlayer), and Retrofit.

---

## 🌟 Key Features Inspired by SoundCloud

- **SoundCloud Visual Aesthetic**: Deep dark charcoal design theme with signature **SoundCloud Orange** (`#FF5500`) accents and translucent cards.
- **SoundCloud Waveform Scrubber**: Custom Compose Canvas visual audio waveform showing track peaks and live playback progress with scrub-to-seek support.
- **Background Media Playback**: Android `MediaSessionService` powering background playback when screen is off, lock-screen controls, and system notification controls.
- **Real-Time Synced Lyrics**: Slide-up bottom sheet drawer with time-aligned scrolling lyrics.
- **Discover Feed**: Hero top trending banner, Trending Charts (Top 20 VN / Top 100 / Global), New Releases, and Top Artists horizontal carousels.
- **Universal Search**: Fast search across Tracks, Albums, Playlists, and Artists.
- **User Library**: Liked Songs, Saved Playlists, Followed Artists, and Listening History.
- **Self-Hosted Server Support**: Configurable host URL in Settings to connect to any local NAS, Docker container, or remote KV Music server.

---

## 🛠 Tech Stack & Dependencies

- **Language**: Kotlin 2.0+
- **UI Framework**: Jetpack Compose + Material 3
- **Audio Engine**: AndroidX Media3 ExoPlayer (`1.3.1`) + `MediaSessionService`
- **Networking**: Retrofit 2 (`2.11.0`) + OkHttp 4 (`4.12.0`) + Gson
- **Image Loading**: Coil Compose (`2.7.0`)
- **Navigation**: Jetpack Compose Navigation (`2.7.7`)

---

## 📱 How to Build & Run in Android Studio

1. Open **Android Studio** (Jellyfish / Koala / Ladybug or newer).
2. Select **Open** and select the `/android-app` directory.
3. Gradle will automatically sync dependencies.
4. Select your connected Android device or Android Emulator (API 26+).
5. Click **Run 'app'** (`Shift + F10`).

### Connecting to KV Music Backend
- By default, the app targets `http://10.0.2.2:8080` (Android Emulator localhost bridge) or your self-hosted server IP.
- Open the **Settings** tab inside the app to enter your custom backend URL (e.g. `http://192.168.1.50:8080` or `http://your-domain.com:3110`) and click **Save & Connect**.
