import SwiftUI

public struct MiniPlayerBar: View {
    @ObservedObject var player = PlayerManager.shared
    @ObservedObject var db = MusicDatabase.shared

    public init() {}

    public var body: some View {
        if let track = player.currentTrack {
            Button {
                player.isFullPlayerPresented = true
            } label: {
                VStack(spacing: 0) {
                    // Mini progress indicator along the top edge
                    GeometryReader { geo in
                        let progress = player.durationSeconds > 0 ? player.currentPositionSeconds / player.durationSeconds : 0.0
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.white.opacity(0.1))
                            Rectangle()
                                .fill(Theme.accentGradient)
                                .frame(width: max(0, min(geo.size.width, geo.size.width * CGFloat(progress))))
                        }
                    }
                    .frame(height: 2)

                    HStack(spacing: 12) {
                        // Artwork
                        AsyncImage(url: URL(string: track.artworkUrl)) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFill()
                            default:
                                ZStack {
                                    Theme.cardSurface
                                    Image(systemName: "music.note")
                                        .foregroundColor(Theme.soundCloudOrange)
                                }
                            }
                        }
                        .frame(width: 44, height: 44)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.white.opacity(0.1), lineWidth: 0.5)
                        )

                        // Title & Artist
                        VStack(alignment: .leading, spacing: 3) {
                            Text(track.title)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(Theme.textPrimary)
                                .lineLimit(1)

                            Text(track.artist)
                                .font(.system(size: 12, weight: .regular))
                                .foregroundColor(Theme.textSecondary)
                                .lineLimit(1)
                        }

                        Spacer()

                        // Like toggle
                        Button {
                            db.toggleLike(track: track)
                        } label: {
                            Image(systemName: db.isLiked(trackId: track.id) ? "heart.fill" : "heart")
                                .font(.system(size: 18))
                                .foregroundColor(db.isLiked(trackId: track.id) ? Theme.soundCloudOrange : Theme.textSecondary)
                                .frame(width: 36, height: 36)
                        }
                        .buttonStyle(.plain)

                        // Play/Pause button
                        Button {
                            player.togglePlayPause()
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(Theme.accentGradient)
                                    .frame(width: 36, height: 36)
                                Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                                    .offset(x: player.isPlaying ? 0 : 1)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 12)
                    .frame(height: 56)
                }
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Theme.surfaceDark.opacity(0.96))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Theme.borderSubtle, lineWidth: 1)
                        )
                        .shadow(color: Color.black.opacity(0.4), radius: 8, x: 0, y: 4)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 10)
            .padding(.bottom, 2)
        }
    }
}
