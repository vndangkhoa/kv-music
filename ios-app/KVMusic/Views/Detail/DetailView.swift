import SwiftUI

public enum DetailType {
    case artist(ArtistHit)
    case album(AlbumHit)
    case playlist(PlaylistHit)
}

public struct DetailView: View {
    public let type: DetailType

    @ObservedObject var player = PlayerManager.shared
    @ObservedObject var db = MusicDatabase.shared
    @Environment(\.dismiss) private var dismiss

    @State private var tracks: [Track] = []
    @State private var isLoading: Bool = true

    public init(type: DetailType) {
        self.type = type
    }

    public var body: some View {
        ZStack {
            Theme.backgroundDark
                .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    // Header with back button
                    HStack {
                        Button {
                            dismiss()
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(Theme.textPrimary)
                                .frame(width: 40, height: 40)
                                .background(Theme.surfaceDark.opacity(0.8))
                                .clipShape(Circle())
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)

                    // Hero section
                    heroSection

                    // Action buttons (Play All / Shuffle)
                    actionButtons

                    // Track List
                    if isLoading {
                        ProgressView().tint(Theme.soundCloudOrange)
                            .padding(.top, 30)
                    } else {
                        VStack(spacing: 8) {
                            ForEach(Array(tracks.enumerated()), id: \.element.id) { idx, track in
                                trackItemRow(index: idx + 1, track: track)
                            }
                        }
                        .padding(.horizontal, 16)
                    }

                    Spacer(minLength: 80)
                }
            }
        }
        .navigationBarHidden(true)
        .task {
            await loadDetailTracks()
        }
    }

    @ViewBuilder
    private var heroSection: some View {
        switch type {
        case .artist(let artist):
            VStack(spacing: 12) {
                AsyncImage(url: URL(string: artist.avatarUrl ?? "")) { phase in
                    if case .success(let img) = phase {
                        img.resizable().scaledToFill()
                    } else {
                        Circle().fill(Theme.surfaceDark)
                            .overlay(Image(systemName: "person.fill").foregroundColor(Theme.soundCloudOrange))
                    }
                }
                .frame(width: 120, height: 120)
                .clipShape(Circle())
                .overlay(Circle().stroke(Theme.soundCloudOrange, lineWidth: 2))
                .shadow(color: Theme.soundCloudOrange.opacity(0.3), radius: 12)

                Text(artist.name)
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundColor(Theme.textPrimary)

                Text("Verified Artist")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Theme.soundCloudOrange)

                Button {
                    db.toggleFollow(artistName: artist.name)
                } label: {
                    Text(db.isFollowed(artistName: artist.name) ? "Following" : "Follow")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(db.isFollowed(artistName: artist.name) ? Theme.textPrimary : .black)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 8)
                        .background(
                            db.isFollowed(artistName: artist.name)
                                ? AnyShapeStyle(Theme.surfaceDark)
                                : AnyShapeStyle(Theme.accentGradient)
                        )
                        .clipShape(Capsule())
                }
            }

        case .album(let album):
            VStack(spacing: 12) {
                AsyncImage(url: URL(string: album.artworkUrl ?? "")) { phase in
                    if case .success(let img) = phase {
                        img.resizable().scaledToFill()
                    } else {
                        Rectangle().fill(Theme.surfaceDark)
                    }
                }
                .frame(width: 160, height: 160)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.1), lineWidth: 1))
                .shadow(color: Color.black.opacity(0.5), radius: 12)

                Text(album.title)
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundColor(Theme.textPrimary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)

                Text(album.artist)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(Theme.soundCloudOrange)

                if let year = album.year {
                    Text(year)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textTertiary)
                }
            }

        case .playlist(let playlist):
            VStack(spacing: 12) {
                AsyncImage(url: URL(string: playlist.artworkUrl ?? "")) { phase in
                    if case .success(let img) = phase {
                        img.resizable().scaledToFill()
                    } else {
                        Rectangle().fill(Theme.surfaceDark)
                    }
                }
                .frame(width: 160, height: 160)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.1), lineWidth: 1))
                .shadow(color: Color.black.opacity(0.5), radius: 12)

                Text(playlist.title)
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundColor(Theme.textPrimary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)

                Text("Curated by \(playlist.author)")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.textSecondary)
            }
        }
    }

    private var actionButtons: some View {
        HStack(spacing: 16) {
            Button {
                if let first = tracks.first {
                    player.play(track: first, newQueue: tracks)
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "play.fill")
                        .font(.system(size: 14, weight: .bold))
                    Text("Play All")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(Theme.accentGradient)
                .clipShape(Capsule())
            }

            Button {
                if !tracks.isEmpty {
                    let shuffled = tracks.shuffled()
                    player.play(track: shuffled[0], newQueue: shuffled)
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "shuffle")
                        .font(.system(size: 14, weight: .bold))
                    Text("Shuffle")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(Theme.textPrimary)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(Theme.surfaceDark)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Theme.borderSubtle, lineWidth: 1))
            }
        }
        .padding(.horizontal, 32)
    }

    private func trackItemRow(index: Int, track: Track) -> some View {
        Button {
            player.play(track: track, newQueue: tracks)
        } label: {
            HStack(spacing: 12) {
                Text("\(index)")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Theme.textTertiary)
                    .frame(width: 24)

                AsyncImage(url: URL(string: track.artworkUrl)) { phase in
                    if case .success(let img) = phase {
                        img.resizable().scaledToFill()
                    } else {
                        Rectangle().fill(Theme.surfaceDark)
                    }
                }
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 6))

                VStack(alignment: .leading, spacing: 3) {
                    Text(track.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(player.currentTrack?.id == track.id ? Theme.soundCloudOrange : Theme.textPrimary)
                        .lineLimit(1)

                    Text(track.artist)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(1)
                }

                Spacer()

                Text(formatDuration(track.duration))
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(Theme.textTertiary)

                Button {
                    db.toggleLike(track: track)
                } label: {
                    Image(systemName: db.isLiked(trackId: track.id) ? "heart.fill" : "heart")
                        .font(.system(size: 16))
                        .foregroundColor(db.isLiked(trackId: track.id) ? Theme.soundCloudOrange : Theme.textTertiary)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 12)
            .background(Theme.surfaceDark.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    private func loadDetailTracks() async {
        isLoading = true
        let query: String
        switch type {
        case .artist(let artist): query = artist.name
        case .album(let album): query = album.title
        case .playlist(let playlist): query = playlist.title
        }

        let res = await KVMusicApi.shared.search(query: query, region: "US")
        await MainActor.run {
            self.tracks = res
            self.isLoading = false
        }
    }
}
