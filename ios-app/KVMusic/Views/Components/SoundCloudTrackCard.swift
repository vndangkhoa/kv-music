import SwiftUI

public struct SoundCloudTrackCard: View {
    public let track: Track
    public let cardWidth: CGFloat?
    public let onPlay: () -> Void

    @ObservedObject private var playerManager = PlayerManager.shared
    @ObservedObject private var database = MusicDatabase.shared

    public init(track: Track, cardWidth: CGFloat? = nil, onPlay: @escaping () -> Void) {
        self.track = track
        self.cardWidth = cardWidth
        self.onPlay = onPlay
    }

    private var isPlayingThis: Bool {
        playerManager.currentTrack?.id == track.id && playerManager.isPlaying
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                // Square Artwork with centered Play Button
                ZStack {
                    AsyncImage(url: URL(string: track.coverUrl)) { phase in
                        if let img = phase.image {
                            img.resizable().aspectRatio(1, contentMode: .fill)
                        } else {
                            Rectangle().fill(KVMusicTheme.glassCardDark).aspectRatio(1, contentMode: .fit)
                        }
                    }
                    .frame(width: 100, height: 100)
                    .cornerRadius(8)
                    .clipped()

                    // Play Button Overlay
                    Button(action: onPlay) {
                        Circle()
                            .fill(KVMusicTheme.soundCloudNeonOrange)
                            .frame(width: 40, height: 40)
                            .overlay(
                                Image(systemName: isPlayingThis ? "pause.fill" : "play.fill")
                                    .foregroundColor(.white)
                                    .font(.system(size: 16))
                            )
                            .shadow(color: .black.opacity(0.4), radius: 6, x: 0, y: 3)
                    }
                    .buttonStyle(.plain)
                }

                // Track Info & Embedded Waveform
                VStack(alignment: .leading, spacing: 4) {
                    Text(track.artist.uppercased())
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(KVMusicTheme.textLightGray)
                        .lineLimit(1)

                    Text(track.title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(KVMusicTheme.textElectricWhite)
                        .lineLimit(2)

                    HStack(spacing: 6) {
                        Text("#Music")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(KVMusicTheme.textLightGray)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(white: 0.15))
                            .cornerRadius(4)

                        Text("•")
                            .foregroundColor(KVMusicTheme.textDarkMuted)
                        Text(track.formattedDuration)
                            .font(.system(size: 11))
                            .foregroundColor(KVMusicTheme.textLightGray)
                    }
                    .padding(.top, 2)

                    // Non-interactive waveform preview
                    SoundCloudWaveformView(
                        bars: playerManager.waveformBars.isEmpty ? (0..<40).map { _ in Float.random(in: 0.2...0.9) } : playerManager.waveformBars,
                        progressFraction: isPlayingThis ? (playerManager.currentPositionSeconds / max(1.0, playerManager.durationSeconds)) : 0.0,
                        isInteractive: false
                    )
                    .frame(height: 24)
                    .padding(.top, 2)
                }
            }

            // Bottom Actions Row: Like, Share, Synthetic Play Count
            HStack(spacing: 16) {
                Button {
                    database.toggleLike(track: track)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: database.isLiked(trackId: track.id) ? "heart.fill" : "heart")
                            .foregroundColor(database.isLiked(trackId: track.id) ? KVMusicTheme.soundCloudNeonOrange : KVMusicTheme.textLightGray)
                            .font(.system(size: 12))
                        Text(database.isLiked(trackId: track.id) ? "Liked" : "Like")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(KVMusicTheme.textLightGray)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(white: 0.12))
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)

                HStack(spacing: 4) {
                    Image(systemName: "play.fill")
                        .foregroundColor(KVMusicTheme.textDarkMuted)
                        .font(.system(size: 9))
                    Text("\(track.syntheticPlayCount) plays")
                        .font(.system(size: 11))
                        .foregroundColor(KVMusicTheme.textDarkMuted)
                }

                Spacer()

                Button {
                    database.toggleDownload(track: track)
                } label: {
                    Image(systemName: database.isDownloaded(trackId: track.id) ? "arrow.down.circle.fill" : "arrow.down.circle")
                        .foregroundColor(database.isDownloaded(trackId: track.id) ? KVMusicTheme.downloadGreen : KVMusicTheme.textLightGray)
                        .font(.system(size: 14))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .background(KVMusicTheme.glassCardDark)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(KVMusicTheme.glassCardBorder, lineWidth: 1)
        )
        .cornerRadius(12)
        .frame(width: cardWidth)
        .padding(.horizontal, cardWidth == nil ? 16 : 0)
        .padding(.vertical, 4)
    }
}
