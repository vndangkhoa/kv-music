import SwiftUI

public struct FullPlayerView: View {
    @ObservedObject var player = PlayerManager.shared
    @ObservedObject var db = MusicDatabase.shared
    @Environment(\.dismiss) private var dismiss

    @State private var isLyricsPresented: Bool = false
    @State private var isQueuePresented: Bool = false
    @State private var isScrubbing: Bool = false
    @State private var scrubProgress: Double = 0.0

    public init() {}

    public var body: some View {
        ZStack {
            Theme.backgroundDark
                .ignoresSafeArea()

            // Blurred background artwork with dark scrim
            if let track = player.currentTrack {
                GeometryReader { geo in
                    AsyncImage(url: URL(string: track.artworkUrl)) { phase in
                        if case .success(let image) = phase {
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(width: geo.size.width, height: geo.size.height)
                                .clipped()
                                .blur(radius: 50)
                                .overlay(Color.black.opacity(0.75))
                        }
                    }
                }
                .ignoresSafeArea()
            }

            VStack(spacing: 0) {
                // Top header bar
                HStack {
                    Button {
                        player.isFullPlayerPresented = false
                    } label: {
                        Image(systemName: "chevron.down")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(Theme.textPrimary)
                            .frame(width: 44, height: 44)
                    }

                    Spacer()

                    VStack(spacing: 2) {
                        Text("PLAYING FROM CLOUD")
                            .font(.system(size: 11, weight: .bold))
                            .tracking(1.2)
                            .foregroundColor(Theme.soundCloudOrange)
                        Text(player.currentTrack?.title ?? "KV-Music")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    Menu {
                        if let track = player.currentTrack {
                            Button {
                                db.toggleLike(track: track)
                            } label: {
                                Label(db.isLiked(trackId: track.id) ? "Unlike" : "Like", systemImage: "heart")
                            }
                            Button {
                                db.toggleDownload(track: track)
                            } label: {
                                Label("Download Track", systemImage: "arrow.down.circle")
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(Theme.textPrimary)
                            .frame(width: 44, height: 44)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)

                Spacer()

                // Center Album Artwork
                if let track = player.currentTrack {
                    AsyncImage(url: URL(string: track.artworkUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFit()
                        default:
                            ZStack {
                                Theme.cardSurface
                                Image(systemName: "music.note")
                                    .font(.system(size: 60))
                                    .foregroundColor(Theme.soundCloudOrange)
                            }
                        }
                    }
                    .frame(maxWidth: 320, maxHeight: 320)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.6), radius: 24, x: 0, y: 12)
                    .padding(.horizontal, 32)
                }

                Spacer()

                // Track Info & Like button
                if let track = player.currentTrack {
                    HStack(alignment: .center) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(track.title)
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(Theme.textPrimary)
                                .lineLimit(1)

                            Text(track.artist)
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(Theme.textSecondary)
                                .lineLimit(1)
                        }

                        Spacer()

                        Button {
                            db.toggleLike(track: track)
                        } label: {
                            Image(systemName: db.isLiked(trackId: track.id) ? "heart.fill" : "heart")
                                .font(.system(size: 24))
                                .foregroundColor(db.isLiked(trackId: track.id) ? Theme.soundCloudOrange : Theme.textSecondary)
                                .frame(width: 44, height: 44)
                        }
                    }
                    .padding(.horizontal, 28)
                }

                // Waveform Scrubber
                VStack(spacing: 8) {
                    SoundCloudWaveformView(
                        bars: player.waveformBars,
                        progress: isScrubbing ? scrubProgress : (player.durationSeconds > 0 ? player.currentPositionSeconds / player.durationSeconds : 0.0),
                        height: 52,
                        barWidth: 3,
                        barGap: 2,
                        onSeek: { newProgress in
                            let targetSec = newProgress * player.durationSeconds
                            player.seek(toSeconds: targetSec)
                        }
                    )
                    .padding(.horizontal, 28)

                    // Time labels
                    HStack {
                        let curTime = isScrubbing ? scrubProgress * player.durationSeconds : player.currentPositionSeconds
                        Text(formatDuration(Int(curTime)))
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                            .foregroundColor(Theme.textSecondary)

                        Spacer()

                        let remTime = max(0, player.durationSeconds - curTime)
                        Text("-\(formatDuration(Int(remTime)))")
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                            .foregroundColor(Theme.textSecondary)
                    }
                    .padding(.horizontal, 28)
                }
                .padding(.top, 16)

                // Playback controls
                HStack(spacing: 32) {
                    // Shuffle
                    Button {
                        player.isShuffle.toggle()
                    } label: {
                        Image(systemName: "shuffle")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(player.isShuffle ? Theme.soundCloudOrange : Theme.textSecondary)
                    }

                    // Previous
                    Button {
                        player.previous()
                    } label: {
                        Image(systemName: "backward.fill")
                            .font(.system(size: 26))
                            .foregroundColor(Theme.textPrimary)
                    }

                    // Play/Pause circular button
                    Button {
                        player.togglePlayPause()
                    } label: {
                        ZStack {
                            Circle()
                                .fill(Theme.accentGradient)
                                .frame(width: 68, height: 68)
                                .shadow(color: Theme.soundCloudOrange.opacity(0.4), radius: 12, x: 0, y: 6)

                            Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundColor(.white)
                                .offset(x: player.isPlaying ? 0 : 2)
                        }
                    }

                    // Next
                    Button {
                        player.next()
                    } label: {
                        Image(systemName: "forward.fill")
                            .font(.system(size: 26))
                            .foregroundColor(Theme.textPrimary)
                    }

                    // Repeat
                    Button {
                        player.isRepeat.toggle()
                    } label: {
                        Image(systemName: "repeat")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(player.isRepeat ? Theme.soundCloudOrange : Theme.textSecondary)
                    }
                }
                .padding(.top, 24)
                .padding(.bottom, 16)

                // Bottom utilities
                HStack(spacing: 40) {
                    Button {
                        isLyricsPresented = true
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "quote.bubble.fill")
                                .font(.system(size: 15))
                            Text("Lyrics")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundColor(Theme.textSecondary)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 14)
                        .background(Theme.surfaceDark.opacity(0.6))
                        .clipShape(Capsule())
                    }

                    Button {
                        if let track = player.currentTrack {
                            db.toggleDownload(track: track)
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: (player.currentTrack != nil && db.isDownloaded(trackId: player.currentTrack!.id)) ? "arrow.down.circle.fill" : "arrow.down.circle")
                                .font(.system(size: 15))
                                .foregroundColor((player.currentTrack != nil && db.isDownloaded(trackId: player.currentTrack!.id)) ? Theme.soundCloudOrange : Theme.textSecondary)
                            Text("Download")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(Theme.textSecondary)
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 14)
                        .background(Theme.surfaceDark.opacity(0.6))
                        .clipShape(Capsule())
                    }
                }
                .padding(.bottom, 24)
            }
        }
        .sheet(isPresented: $isLyricsPresented) {
            LyricsSheetView()
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
    }
}
